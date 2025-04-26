import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import Handlebars from 'handlebars';
import path from 'node:path';
import fs from 'node:fs/promises';
import jwt from 'jsonwebtoken';

import {
  FIFTEEN_MINUTES,
  SMTP,
  THIRTY_DAY,
  TEMPLATES_DIR,
} from '../constants/index.js';

import createHttpError from 'http-errors';
import UserCollection from '../db/models/User.js';
import SessionsCollection from '../db/models/Session.js';
import { sendEmail } from '../utils/sendEmail.js';
import { getEnvVar } from '../utils/getEnvVar.js';

const verifyEmailPath = path.join(TEMPLATES_DIR, 'verify-email.html');

export const registerUser = async (payload) => {
  const { email, password } = payload;

  const user = await UserCollection.findOne({ email });

  if (user) {
    throw createHttpError(409, 'Email in use');
  }

  const hashPassword = await bcrypt.hash(password, 10);

  return await UserCollection.create({
    ...payload,
    password: hashPassword,
  });
};

export const loginUser = async (payload) => {
  const { email, password } = payload;

  const user = await UserCollection.findOne({ email });

  if (!user) {
    throw createHttpError(401, 'User not found');
  }

  const isEqual = await bcrypt.compare(password, user.password);

  if (!isEqual) {
    throw createHttpError(401, 'Unauthorized');
  }

  await SessionsCollection.deleteOne({ userId: user._id });
  const newSession = createSession();

  return await SessionsCollection.create({
    userId: user._id,
    ...newSession,
  });
};

export const logoutUser = async (sessionId) => {
  await SessionsCollection.deleteOne({ _id: sessionId });
};

const createSession = () => {
  const accessToken = randomBytes(30).toString('base64');
  const refreshToken = randomBytes(30).toString('base64');

  return {
    accessToken,
    refreshToken,
    accessTokenValidUntil: new Date(Date.now() + FIFTEEN_MINUTES),
    refreshTokenValidUntil: new Date(Date.now() + THIRTY_DAY),
  };
};

export const refreshUsersSession = async ({ sessionId, refreshToken }) => {
  const session = await SessionsCollection.findOne({
    _id: sessionId,
    refreshToken,
  });

  if (!session) {
    throw createHttpError(401, 'Session not found');
  }

  if (session.refreshTokenValidUntil < Date.now()) {
    await SessionsCollection.findOneAndDelete({ _id: session._id });
    throw createHttpError(401, 'Session token expired');
  }

  const newSession = createSession();

  await SessionsCollection.deleteOne({ _id: sessionId, refreshToken });

  return await SessionsCollection.create({
    userId: session.userId,
    ...newSession,
  });
};

export const requestResetToken = async (email) => {
  const user = await UserCollection.findOne({ email });
  if (!user) {
    throw createHttpError(404, 'User not found');
  }

  const resetToken = jwt.sign(
    {
      sub: user._id,
      email,
    },
    getEnvVar('JWT_SECRET'),
    {
      expiresIn: '15m',
    },
  );

  const templateSource = await fs.readFile(verifyEmailPath, 'utf-8');
  const template = Handlebars.compile(templateSource);
  const html = template({
    name: user.name,
    link: `${getEnvVar('APP_DOMAIN')}/reset-password?token=${resetToken}`,
  });

  await sendEmail({
    from: getEnvVar(SMTP.SMTP_FROM),
    to: email,
    subject: 'Reset your password',
    html,
  }).catch((error) => {
    console.log(error.message);
    throw createHttpError(
      500,
      'Failed to send the email, please try again later.',
    );
  });
};

export const resetPassword = async (payload) => {
  let entries;

  try {
    entries = jwt.verify(payload.token, getEnvVar('JWT_SECRET'));
  } catch (err) {
    if (err instanceof Error) {
      throw createHttpError(401, err.message);
    }
  }

  const user = await UserCollection.findOne({
    email: entries.email,
    _id: entries.sub,
  });

  if (!user) {
    throw createHttpError(404, 'User not found');
  }

  const encryptedPassword = await bcrypt.hash(payload.password, 10);

  await UserCollection.updateOne(
    { _id: user._id },
    { password: encryptedPassword },
  );
};

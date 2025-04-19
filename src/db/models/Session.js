import { Schema, model } from 'mongoose';
import { handleSaveError, setUpdateSettings } from './hooks.js';

const sessionsSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'users',
      required: true,
    },
    accessToken: {
      type: String,
      required: true,
    },
    refreshToken: {
      type: String,
      required: true,
    },
    accessTokenValidUntil: {
      type: Date,
      required: true,
    },
    refreshTokenValidUntil: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

sessionsSchema.post('save', handleSaveError);
sessionsSchema.pre('findOneAndUpdate', setUpdateSettings);
sessionsSchema.post('findOneAndUpdate', handleSaveError);

const SessionsCollection = model('session', sessionsSchema);

export default SessionsCollection;

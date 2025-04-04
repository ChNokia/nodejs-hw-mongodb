export const errorHandler = (err, req, res, next) => {
  const { status = 500, message: data = '' } = err;
  res.status(status).json({
    status,
    message: 'Something went wrong',
    data,
  });
};

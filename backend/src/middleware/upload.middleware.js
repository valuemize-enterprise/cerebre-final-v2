const multer = require('multer');
const config = require('../config');

const MAX_BYTES = config.upload.maxFileSizeMb * 1024 * 1024;

// Store in memory — we pipe buffer to S3 directly
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (config.upload.allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      Object.assign(
        new Error(`Unsupported file type: ${file.mimetype}. Allowed: PDF, PNG, JPG, WEBP`),
        { statusCode: 400 }
      ),
      false
    );
  }
};

const upload = multer({
  storage,
  limits: { fileSize: MAX_BYTES },
  fileFilter,
});

/** Handle multer errors gracefully */
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: `File too large. Maximum size is ${config.upload.maxFileSizeMb}MB`,
      });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err?.statusCode === 400) {
    return res.status(400).json({ error: err.message });
  }
  next(err);
};

module.exports = { upload, handleMulterError };

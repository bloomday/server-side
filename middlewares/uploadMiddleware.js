const multer = require('multer');
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
}).array('images', 10);

exports.uploadHandler = (req, res, next) => {
    upload(req, res, function (err) {
      if (err instanceof multer.MulterError) {
        console.log('MulterError:', err);
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'One or more files exceed 2MB size limit' });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({ error: 'Too many files uploaded (max 10 allowed)' });
        }
        return res.status(400).json({ error: err.message });
      } else if (err) {
        console.log('Unknown error:', err);
        return res.status(400).json({ error: err.message });
      }
      next();
    });
  };
  

// // middlewares/multer.js
// const multer = require('multer');
// const path = require('path');

// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, 'uploads');
//   },
//   filename: (req, file, cb) => {
//     const uniqueSuffix = Date.now() + '-' + file.originalname;
//     cb(null, uniqueSuffix);
//   },
// });

// module.exports = multer({ storage });

// middleware/upload.js
const multer = require('multer');
const { storage } = require('../utils/cloudinary');

const upload = multer({ storage });

module.exports = upload;


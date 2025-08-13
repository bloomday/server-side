const multer = require('multer');
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, 
}).array('images', 10); 


exports.uploadHandler = (req, res, next) => {
    upload(req, res, function (err) {
      if (err instanceof multer.MulterError) {
        console.log('MulterError:', err);
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'One or more files exceed 10MB size limit' });
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
  

//   const multer = require('multer');
// const sharp = require('sharp');
// const fs = require('fs');
// const path = require('path');

// // Use memory storage
// const storage = multer.memoryStorage();

// const upload = multer({
//   storage,
//   limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
// }).array('images', 10);

// // Folder to save compressed images
// const COMPRESSED_DIR = path.join(__dirname, '../uploads');
// if (!fs.existsSync(COMPRESSED_DIR)) fs.mkdirSync(COMPRESSED_DIR, { recursive: true });

// exports.uploadHandler = (req, res, next) => {
//   upload(req, res, async function (err) {
//     if (err instanceof multer.MulterError) {
//       if (err.code === 'LIMIT_FILE_SIZE') {
//         return res.status(400).json({ error: 'One or more files exceed 10MB size limit' });
//       }
//       if (err.code === 'LIMIT_UNEXPECTED_FILE') {
//         return res.status(400).json({ error: 'Too many files uploaded (max 10 allowed)' });
//       }
//       return res.status(400).json({ error: err.message });
//     } else if (err) {
//       return res.status(400).json({ error: err.message });
//     }

//     try {
//       const processedFiles = [];

//       for (const file of req.files) {
//         const filename = `compressed-${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`;
//         const filepath = path.join(COMPRESSED_DIR, filename);

//         await sharp(file.buffer)
//           .resize({ width: 800 }) // Optional: resize width to 800px
//           .jpeg({ quality: 70 })  // Compress to 70% quality
//           .toFile(filepath);

//         processedFiles.push({ filename, path: filepath });
//       }

//       // Attach processed file info to the request object if needed downstream
//       req.processedImages = processedFiles;

//       // Respond here or call `next()` if another handler needs it
//       res.status(200).json({
//         message: 'Images uploaded and compressed successfully',
//         files: processedFiles,
//       });
//     } catch (compressionErr) {
//       console.error(compressionErr);
//       return res.status(500).json({ error: 'Failed to compress image(s)' });
//     }
//   });
// };


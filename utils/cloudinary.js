const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
});

const uploadToCloudinary = (buffer, folder) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder },
      (error, result) => {
        if (result) resolve(result);
        else reject(error);
      }
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
};

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'bloomday/events',
    allowed_formats: ['jpg', 'jpeg', 'png'],
  },
});

module.exports = {
  cloudinary,
  storage,
  uploadToCloudinary, 
};

const express = require('express');
const router = express.Router();
const authenticateUser = require('../middlewares/authMiddleware');
const { uploadHandler } = require('../middlewares/uploadMiddleware');
const {
  uploadMultipleImages,
  getEventGallery,
} = require('../controllers/galleryController');

// Unified route for both users and guests
router.post('/:eventId/upload-multiple', uploadHandler, uploadMultipleImages);

router.get('/events/:eventId/gallery', getEventGallery);

module.exports = router;

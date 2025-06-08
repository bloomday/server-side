const Event = require('../models/eventModel');
//const EventImage = require('../models/eventImageModel');
const { uploadToCloudinary } = require('../utils/cloudinary'); 

exports.uploadMultipleImages = async (req, res) => {
  try {
    const { eventId } = req.params;
    const files = req.files;
    const { uploadedBy } = req.body;

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No images uploaded' });
    }

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const uploads = await Promise.all(
        files.map(async (file) => {
          const result = await uploadToCloudinary(file.buffer, 'event-gallery');
          const uploader = req.user ? req.user._id : uploadedBy || 'Guest';
      
          return {
            uploadedBy: typeof uploader === 'string' ? uploader : '',
            url: result.secure_url,
            uploadedAt: new Date(),
          };
        })
      );
      
      // Push to existing event's gallery and save
      event.gallery.push(...uploads);
      await event.save();
      
    res.status(200).json({
      message: 'Images uploaded successfully',
      uploaded: uploads,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Upload failed' });
  }
};

exports.getEventGallery = async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId).populate('gallery.uploadedBy', 'name');
    if (!event) return res.status(404).json({ error: 'Event not found' });
    res.status(200).json(event.gallery);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch gallery' });
  }
};

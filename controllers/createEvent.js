const tmp = require("tmp");
const fs = require("fs");
const QRCode = require("qrcode");
const { cloudinary } = require("../utils/cloudinary");
const slugify = require("slugify");
const { v4: uuidv4 } = require("uuid");
const Event = require("../models/eventModel");
const Invite = require("../models/inviteModel");
const sendEmail = require("../utils/sendEmail");

const generateUniqueSlug = async (baseSlug) => {
  let slug = baseSlug;
  let counter = 1;

  while (await Event.findOne({ slug })) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
};

// CREATE EVENT 
exports.createEvent = async (req, res) => {
  try {
    const { name, description, date, location, coHostId, allowCrowdfunding } =
      req.body;

    const userId = req.user._id;
    const hosts = [userId];
    if (coHostId) hosts.push(coHostId);

    let baseSlug = slugify(name, { lower: true, strict: true });
    const slug = await generateUniqueSlug(baseSlug);

    const eventUrl = `https://bloomday-dev.netlify.app/${slug}`;
    // Generate QR Code as a buffer
    const qrBuffer = await QRCode.toBuffer(eventUrl);
    

    // Save buffer to a temp file
    const tmpFile = tmp.fileSync({ postfix: ".png" });
    fs.writeFileSync(tmpFile.name, qrBuffer);

    // Upload to Cloudinary
    const qrUpload = await cloudinary.uploader.upload(tmpFile.name, {
      folder: "bloomday/qrcodes",
      public_id: `qr-${slug}`,
    });

       //Remove the temp file
      tmpFile.removeCallback();

    // Use the secure URL
    const qrCodeUrl = qrUpload.secure_url;

    const qrCode = qrCodeUrl; 

    let ivImagePath = null;
    if (req.file) {
      ivImagePath = req.file.path; 
    } else if (req.body.ivImage) {
      ivImagePath = req.body.ivImage; 
    }

    const event = await Event.create({
      name,
      slug,
      eventUrl,
      description,
      date,
      location,
      hosts,
      allowCrowdfunding: allowCrowdfunding || false,
      qrCode,
      ivImage: ivImagePath,
    });

    res.status(201).json({
      message: "Event created successfully.",
      event,
      eventLink: eventUrl,
      qrCode,
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: "Something went wrong while creating event." });
  }
};

exports.getEventDetails = async (req, res) => {
  const event = await Event.findById(req.params.eventId).populate(
    "contributions.user",
    "name"
  );
  const totalAmount = event.contributions.reduce((sum, c) => sum + c.amount, 0);

  res.json({ event, totalAmount });
};

//Downloadable QR code Image
exports.getEventQRCode = async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await Event.findById(eventId);
    if (!event || !event.qrCode) {
      return res.status(404).json({ error: "QR code not found" });
    }

    const base64Data = event.qrCode.replace(/^data:image\/png;base64,/, "");
    const imgBuffer = Buffer.from(base64Data, "base64");

    res.set({
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="${event.slug}_qr.png"`,
    });

    res.send(imgBuffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to download QR code" });
  }
};

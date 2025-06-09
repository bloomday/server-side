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
  const event = await Event.findById(req.params.eventId,
    { $inc: { views: 1 } },
    { new: true }
  ).populate(
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

exports.getTrendingEvents = async (req, res) => {
  try {
    //const events = await Event.find().populate... { createdAt: { $gte: thirtyDaysAgo } }
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const events = await Event.find().populate("contributions.user", "name").lean();

    const trending = events
      .map((event) => {
        const views = event.views || 0;
        const totalAmount = event.contributions?.reduce((sum, c) => sum + c.amount, 0) || 0;
        const contributors = event.contributions?.length || 0;

        //const ageInDays = (Date.now() - new Date(event.createdAt)) / (1000 * 60 * 60 * 24);

        const score =
          views * 0.5 +
          contributors * 2 +
          totalAmount * 0.01
          //ageInDays * 0.2;

        return {
          ...event,
          totalAmount,
          contributors,
          score: parseFloat(score.toFixed(2)),
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 10); // top 10

    res.json({ trending });
  } catch (err) {
    console.error("Trending events error:", err);
    res.status(500).json({ error: "Failed to fetch trending events" });
  }
};

exports.getEventsByUser = async (req, res) => {
  try {
    const userId = req.user._id;

    const events = await Event.find({ hosts: userId }).sort({ createdAt: -1 });

    res.json({ events });
  } catch (err) {
    console.error("Error fetching user's events:", err);
    res.status(500).json({ error: "Failed to fetch events by user" });
  }
};

exports.getEventsByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    const events = await Event.find({ hosts: userId }).sort({ createdAt: -1 });

    res.json({ events });
  } catch (err) {
    console.error("Error fetching events by user ID:", err);
    res.status(500).json({ error: "Failed to fetch events" });
  }
};

//GET /api/events/my-events?page=2&limit=5
//GET /api/events/my-events?status=upcoming
//GET /api/events/my-events?startDate=2025-06-01&endDate=2025-06-30
//GET /api/events/my-events?startDate=2025-06-01&endDate=2025-06-30
//GET /api/events/my-events?status=upcoming&page=1&limit=6



exports.getEventsByUsers = async (req, res) => {
  try {
    const userId = req.user._id;

    // Pagination query params
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    // Optional filters
    const { status, startDate, endDate } = req.query;

    const query = { hosts: userId };

    // Optional status filter (e.g., "upcoming", "past")
    const now = new Date();
    if (status === 'upcoming') {
      query.date = { $gte: now };
    } else if (status === 'past') {
      query.date = { $lt: now };
    }

    // Optional date range filter
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const events = await Event.find(query)
      .sort({ date: 1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Event.countDocuments(query);

    res.json({
      page,
      totalPages: Math.ceil(total / limit),
      totalEvents: total,
      events,
    });
  } catch (err) {
    console.error("Error fetching user's events:", err);
    res.status(500).json({ error: "Failed to fetch events by user" });
  }
};

exports.getUserUpcomingEvents = async (req, res) => {
  try {
    const now = new Date();
    const userId = req.user._id;

    const events = await Event.find({
      hosts: userId,
      date: { $gte: now },
    }).sort({ date: 1 });

    const eventsWithTotals = events.map((event) => {
      const totalAmount = event.contributions?.reduce((sum, c) => sum + c.amount, 0) || 0;
      return {
        ...event.toObject(),
        totalAmount,
      };
    });

    res.json({message: "Upcoming events fetched",
       events: eventsWithTotals });
  } catch (err) {
    console.error("Error fetching user's upcoming events:", err);
    res.status(500).json({ error: "Failed to fetch upcoming events" });
  }
};



exports.getUserPastEvents = async (req, res) => {
  try {
    const now = new Date();
    const userId = req.user._id;

    const events = await Event.find({
      hosts: userId,
      date: { $lt: now },
    }).sort({ date: -1 });

    const eventsWithTotals = events.map((event) => {
      const totalAmount = event.contributions?.reduce((sum, c) => sum + c.amount, 0) || 0;
      return {
        ...event.toObject(),
        totalAmount,
      };
    });

    res.json({message: "Past events fetched", 
      events: eventsWithTotals });
  } catch (err) {
    console.error("Error fetching user's past events:", err);
    res.status(500).json({ error: "Failed to fetch past events" });
  }
};







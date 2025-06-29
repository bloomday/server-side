const tmp = require("tmp");
const fs = require("fs");
const QRCode = require("qrcode");
const { cloudinary } = require("../utils/cloudinary");
const slugify = require("slugify");
const { v4: uuidv4 } = require("uuid");
const Event = require("../models/eventModel");
const Invite = require("../models/inviteModel");
const sendEmail = require("../utils/sendEmail");
const generatePDFBuffer = require('../utils/generatePDF');

const generateUniqueSlug = async (baseSlug) => {
  let slug = baseSlug;
  let counter = 1;

  while (await Event.findOne({ slug })) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
};


exports.createEvent = async (req, res) => {
  try {
    const { name, description, date, location, coHostId, allowCrowdfunding,visibility } =
      req.body;

    const userId = req.user._id;
    const hosts = [userId];
    if (coHostId) hosts.push(coHostId);
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ message: 'Event name is required and must be a string' });
    }
    
    const baseSlug = slugify(name, { lower: true, strict: true });
    
    //let baseSlug = slugify(name, { lower: true, strict: true });
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
      visibility,
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
  try {
    const { eventId } = req.params;
    const token = req.query.token; 

    const event = await Event.findById(eventId)
      .populate("hosts", "name email")
      .populate("contributions.user", "name");

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    let canView = false;

    if (event.visibility === 'public') {
      canView = true;
    } else {
      // const isHost = event.hosts.some(hostId =>
      //   hostId.toString() === req.user?._id?.toString()
      // );

      // const isHost = event.hosts.some(host => {
      //   const hostId = host._id || host; // supports both populated and raw ObjectIds
      //   return hostId.toString() === req.user._id.toString();
      // });
      
      const isHost = req.user && event.hosts.some(
        hostId => hostId.toString() === req.user._id.toString()
      );
      
      const isInvitedUser = req.user && await Invite.exists({
        event: event._id,
        email: req.user.email,
        revoked: false,
        expiresAt: { $gt: new Date() }
      });

      const isGuestViaToken = token && await Invite.exists({
        event: event._id,
        token,
        revoked: false,
        expiresAt: { $gt: new Date() }
      });

      if (isHost || isInvitedUser || isGuestViaToken) {
        canView = true;
      }
    }

    if (!canView) {
      return res.status(403).json({ message: "You don't have access to this private event." });
    }

    //Count view only if user can view
    event.views = (event.views || 0) + 1;
    await event.save();

    const totalAmount = event.contributions.reduce((sum, c) => sum + c.amount, 0);
    res.json({ event, totalAmount });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong while fetching event details.' });
  }
};


exports.getEventDetailss = async (req, res) => {
  try {
    const event = await Event.findByIdAndUpdate(
      req.params.eventId,
      { $inc: { views: 1 } },
      { new: true }
    ).populate("contributions.user", "name");

    if (!event) return res.status(404).json({ message: "Event not found" });

    const totalAmount = event.contributions.reduce((sum, c) => sum + c.amount, 0);
    res.json({ event, totalAmount });
  } catch (error) {
    console.error("Error fetching event details:", error);
    res.status(500).json({ error: "Server error" });
  }
};


//Downloadable QR code Image

exports.getEventQRCode = async (req, res) => { 
  try {
    const { eventId } = req.params;
    const token = req.query.token;

    const event = await Event.findById(eventId);
    if (!event || !event.qrCode) {
      return res.status(404).json({ error: "QR code not found" });
    }

    let canAccessQRCode = false;

    if (event.visibility === "public") {
      // Public event: allow anyone to access the QR code
      canAccessQRCode = true;
    } else {
      // Private event: restrict to host or invited guest
      // const isHost = event.hosts.some(
      //   hostId => hostId.toString() === req.user?._id?.toString()
      // );

      const isHost = req.user && event.hosts.some(
        hostId => hostId.toString() === req.user._id.toString()
      );

      const isInvitedUser = req.user && await Invite.exists({
        event: event._id,
        email: req.user.email,
        revoked: false,
        expiresAt: { $gt: new Date() },
      });

      const isGuestViaToken = token && await Invite.exists({
        event: event._id,
        token,
        revoked: false,
        expiresAt: { $gt: new Date() },
      });

      if (isHost || isInvitedUser || isGuestViaToken) {
        canAccessQRCode = true;
      }
    }

    if (!canAccessQRCode) {
      return res.status(403).json({ message: "You are not authorized to access this QR code." });
    }

    // Send the QR code as an image
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

exports.getEventQRCodes = async (req, res) => {
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
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const events = await Event.find({visibility: 'public', createdAt: { $gte: thirtyDaysAgo }}).populate("contributions.user", "name").lean();

    const trending = events
      .map((event) => {
        const views = event.views || 0;
        const totalAmount = event.contributions?.reduce((sum, c) => sum + c.amount, 0) || 0;
        const contributors = event.contributions?.length || 0;

        const ageInDays = (Date.now() - new Date(event.createdAt)) / (1000 * 60 * 60 * 24);

        const score =
          views * 0.5 +
          contributors * 2 +
          totalAmount * 0.01 -
          ageInDays * 0.2;

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


exports.sendEventSummaryManual = async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await Event.findById(eventId)
      .populate('hosts', 'name email')
      .populate('contributions.user', 'name email');

    if (!event) return res.status(404).json({ message: 'Event not found' });

    const invites = await Invite.find({ event: event._id });
    const accepted = invites.filter(i => i.status === 'accepted').map(i => i.email);
    const declined = invites.filter(i => i.status === 'declined').map(i => i.email);
    const pending = invites.filter(i => !i.status || i.status === 'pending').map(i => i.email);
    const totalAmount = event.contributions.reduce((sum, c) => sum + c.amount, 0);

    const contributionList = event.contributions.map(c => `
      <li>${c.user?.name || 'Anonymous'} (${c.user?.email || 'N/A'}): ₦${c.amount}</li>
    `).join('');

    const html = `
      <div style="font-family: Arial, sans-serif;">
        <h2>📊 Final Event Summary: ${event.name}</h2>
        <p><strong>Date:</strong> ${new Date(event.date).toLocaleString()}</p>
        <p><strong>Total Views:</strong> ${event.views}</p>
        <p><strong>📸 Gallery Uploads:</strong> ${event.gallery?.length || 0}</p>

        <h3>🎟️ RSVP Summary:</h3>
        <ul>
          <li>✅ Accepted: ${accepted.length}</li>
          <li>❌ Declined: ${declined.length}</li>
          <li>⏳ Pending: ${pending.length}</li>
        </ul>

        <h3>💸 Contributions:</h3>
        <p><strong>Total Raised:</strong> ₦${totalAmount}</p>
        <ul>${contributionList || '<li>No contributions yet.</li>'}</ul>

        <p>📧 Accepted: ${accepted.join(', ')}</p>
        <p>📧 Declined: ${declined.join(', ')}</p>
        <p>📧 Pending: ${pending.join(', ')}</p>

        <p style="font-size: 0.9em; color: gray;">Sent from Bloomday</p>
      </div>
    `;

    const pdfBuffer = await generatePDFBuffer(html);
    const hostEmails = event.hosts.map(h => h.email);

    for (const hostEmail of hostEmails) {
      await sendEmail({
        to: hostEmail,
        subject: `📊 Final Summary for ${event.name}`,
        html,
        attachments: [{
          filename: `${event.slug}-summary.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }]
      });
    }

    res.json({ message: 'Summary sent successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send event summary' });
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







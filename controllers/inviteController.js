const { v4: uuidv4 } = require('uuid');
const Invite = require('../models/inviteModel');
const {sendEmail} = require('../utils/sendEmail');
const Event = require ('../models/eventModel')



// SEND INVITES 
const path = require('path');
const axios = require('axios');
const fs = require('fs');
const tmp = require('tmp');

exports.sendInvites = async (req, res) => {
    try {
      const { eventId, inviteEmails } = req.body;
  
      const event = await Event.findById(eventId);
      if (!event) return res.status(404).json({ error: 'Event not found.' });
  
      const eventUrl = `https://bloomday-dev.netlify.app/${event.slug}`;
      const qrImageUrl = event.qrCode;
  
      const inviteDocs = [];
  
      let ivImageAttachment = null;
      let ivImageHtml = '';
  
      // If IV image exists, prepare it for attachment
      if (event.ivImage) {
        if (event.ivImage.startsWith('http')) {
          const response = await axios.get(event.ivImage, { responseType: 'arraybuffer' });
          const tmpFile = tmp.fileSync({ postfix: '.png' });
          fs.writeFileSync(tmpFile.name, response.data);
          ivImageAttachment = {
            filename: 'invitation-card.png',
            path: tmpFile.name,
            cid: 'ivcard'
          };
        } else {
          ivImageAttachment = {
            filename: 'invitation-card.png',
            path: path.resolve(event.ivImage),
            cid: 'ivcard'
          };
        }
  
        ivImageHtml = `
  <p>Here's your official invitation card:</p>
  <img src="${event.ivImage}" alt="Invitation Card" style="max-width:100%; border-radius: 8px;" />
`;

      }
  
      for (const email of inviteEmails) {
        const token = uuidv4();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      
        const invite = await Invite.create({
          event: event._id,
          email,
          token,
          expiresAt
        });
      
        const qrLink = `https://bloomday-dev.netlify.app/invite/view/${token}`; 
      
        const link = `http://localhost:3000/invite/accept/${token}`;
        const declineLink = `http://localhost:3000/invite/decline/${token}`;
      
        await sendEmail({
          to: email,
          subject: `You're Invited to ${event.name}!`,
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
              <h2 style="color: #5C67F2;">🎉 You're Invited to ${event.name}!</h2>
              <p><strong>Date:</strong> ${new Date(event.date).toLocaleString()}</p>
              <p><strong>Location:</strong> ${event.location}</p>
              <p>${event.description}</p>
      
              <div style="margin: 20px 0;">
                <a href="${link}" style="padding: 10px 15px; background: green; color: white; text-decoration: none; border-radius: 5px;">Accept Invitation</a>
                <a href="${declineLink}" style="padding: 10px 15px; background: crimson; color: white; text-decoration: none; border-radius: 5px; margin-left: 10px;">Decline</a>
              </div>
      
              <p>Or scan/view this invite:</p>
              <a href="${qrLink}">${qrLink}</a> 
      
              ${qrImageUrl ? `<img src="${qrImageUrl}" alt="QR Code" style="width: 150px; height: 150px;" />` : ''}
      
              ${ivImageHtml}
      
              <p style="font-size: 0.9em; color: gray;">This invite will expire on <strong>${expiresAt.toLocaleDateString()}</strong>.</p>
              <p style="font-size: 0.9em; color: gray;">Sent from Bloomday</p>
            </div>
          `,
        });
      
        inviteDocs.push(invite._id);
      }
      
      event.invitees = [...(event.invitees || []), ...inviteDocs];
      await event.save();
  
      res.status(200).json({ message: 'Invites sent successfully.',
        data: event
       });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Something went wrong while sending invites.' });
    }
  };
  


exports.resendInvite = async (req, res) => {
    try {
      const { inviteId } = req.body;
  
      const invite = await Invite.findById(inviteId).populate('event');
      if (!invite) {
        return res.status(404).json({ error: 'Invite not found.' });
      }
      if (invite.revoked) {
        return res.status(400).json({ error: 'Cannot resend revoked invite.' });
      }
      if (new Date() > invite.expiresAt) {
        return res.status(400).json({ error: 'Cannot resend expired invite.' });
      }
      
  
      const event = invite.event;
      const { name, date, description, location, slug, qrCode } = event;
      const token = invite.token;
  
      const link = `http://localhost:3000/invite/accept/${token}`;
      const declineLink = `http://localhost:3000/invite/decline/${token}`;
      const qrImageUrl = qrCode;
  
      await sendEmail({
        to: invite.email,
        subject: `⏰ Reminder: You're Invited to ${name}!`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2 style="color: #5C67F2;">🎉 You're Invited to ${name}!</h2>
            <p><strong>Date:</strong> ${new Date(date).toLocaleString()}</p>
            <p><strong>Location:</strong> ${location}</p>
            <p>${description}</p>
  
            <div style="margin: 20px 0;">
              <a href="${link}" style="padding: 10px 15px; background: green; color: white; text-decoration: none; border-radius: 5px;">Accept Invitation</a>
              <a href="${declineLink}" style="padding: 10px 15px; background: crimson; color: white; text-decoration: none; border-radius: 5px; margin-left: 10px;">Decline</a>
            </div>
  
            ${qrImageUrl ? `<p>Or scan to view the event:</p><img src="${qrImageUrl}" alt="QR Code" style="width: 150px; height: 150px;" />` : ''}
  
            <p style="font-size: 0.9em; color: gray;">Sent from Bloomday</p>
          </div>
        `,
      });
  
      res.status(200).json({ message: 'Invite resent successfully.' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to resend invite.' });
    }
  };
  


exports.acceptInvite = async (req, res) => {
  try {
    const { token } = req.params;
    const invite = await Invite.findOne({ token });

    if (!invite) return res.status(404).json({ error: 'Invite not found.' });

    if (invite.revoked) {
        return res.status(400).json({ error: 'This invite has been revoked.' });
      }
      
      if (new Date() > invite.expiresAt) {
        return res.status(400).json({ error: 'This invite has expired.' });
      }
      

    invite.status = 'accepted';
    invite.respondedAt = new Date();
    await invite.save();

    res.redirect(`http://localhost:8080/invite-success.html?status=accepted&event=${invite.event}`);
  } catch (err) {
    res.status(500).json({ error: 'Could not process invite.' });
  }
};

exports.declineInvite = async (req, res) => {
    try {
      const { token } = req.params;
      const invite = await Invite.findOne({ token });
  
      if (!invite) return res.status(404).json({ error: 'Invite not found.' });

      if (invite.revoked) {
        return res.status(400).json({ error: 'This invite has been revoked.' });
      }
      
      if (new Date() > invite.expiresAt) {
        return res.status(400).json({ error: 'This invite has expired.' });
      }
      
  
      invite.status = 'declined';
      invite.respondedAt = new Date();
      await invite.save();
  
      res.redirect(`http://localhost:8080/invite-success.html?status=declined&event=${invite.event}`);
    } catch (err) {
      res.status(500).json({ error: 'Could not process invite.' });
    }
  };

exports.revokeInvite = async (req, res) => {
    try {
      const { inviteId } = req.body;
  
      const invite = await Invite.findById(inviteId);
      if (!invite) {
        return res.status(404).json({ error: 'Invite not found.' });
      }
  
      invite.revoked = true;
      await invite.save();
  
      res.status(200).json({ message: 'Invite revoked successfully.' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to revoke invite.' });
    }
  };


exports.viewInvite = async (req, res) => {
  try {
    const { token } = req.params;
    const invite = await Invite.findOne({ token }).populate('event');
    if (!invite || invite.revoked) return res.status(404).json({ error: 'Invalid or revoked invite' });

    res.status(200).json({
      invite: {
        email: invite.email,
        status: invite.status,
        expiresAt: invite.expiresAt,
      },
      event: {
        name: invite.event.name,
        date: invite.event.date,
        location: invite.event.location,
        description: invite.event.description,
        ivImage: invite.event.ivImage,
        host: invite.event.host,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch invite info' });
  }
};

  
  
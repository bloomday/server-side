const sharp = require('sharp');
const axios = require('axios');
const tmp = require('tmp');
const fs = require('fs');
const path = require('path');
const { cloudinary } = require('./cloudinary');

module.exports = async function generatePersonalizedIVCard(baseImageUrl, guestName, slug) {
  // 1. Download base image (from Cloudinary or external)
  const response = await axios.get(baseImageUrl, { responseType: 'arraybuffer' });
  const inputBuffer = Buffer.from(response.data);

  // 2. Add name text overlay using Sharp
  const personalizedBuffer = await sharp(inputBuffer)
    .composite([
      {
        input: Buffer.from(
          `<svg width="800" height="200">
            <style>
              .name { fill: #fff; font-size: 48px; font-weight: bold; font-family: Arial, sans-serif; }
            </style>
            <text x="50%" y="50%" text-anchor="middle" class="name">${guestName}</text>
          </svg>`
        ),
        top: 500, // Adjust vertically
        left: 0,
      },
    ])
    .png()
    .toBuffer();

  // 3. Save to temporary file
  const tmpFile = tmp.fileSync({ postfix: '.png' });
  fs.writeFileSync(tmpFile.name, personalizedBuffer);

  // 4. Upload to Cloudinary
  const uploaded = await cloudinary.uploader.upload(tmpFile.name, {
    folder: 'bloomday/personalized',
    public_id: `iv-${slug}-${guestName.replace(/\s+/g, '-')}`,
    overwrite: true,
  });

  tmpFile.removeCallback(); // Clean up

  return uploaded.secure_url;
};

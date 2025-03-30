const express = require('express');
const dotenv = require('dotenv');
const { google } = require('googleapis');
const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "profile_pictures", // Folder in Cloudinary
    allowed_formats: ['jpg', 'png', 'jpeg'],
  },
});

const upload = multer({ storage });

const oAuth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
);




oAuth2Client.setCredentials({
  refresh_token: process.env.REFRESH_TOKEN
});

async function sendEmail(to, subject, text) {
  try {
    const accessToken = await oAuth2Client.getAccessToken();

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: process.env.EMAIL_USER,
        clientId: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        refreshToken: process.env.REFRESH_TOKEN,
        accessToken: accessToken.token
      }
    });

    const mailOptions = {
      from: `"EduBlog" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text
    };

    await transporter.sendMail(mailOptions);
    // console.log('Email sent successfully:', result);
  } catch (error) {
    console.error('Error sending email:', error);
  }
}

module.exports = function (db) {
  const router = express.Router();

  // Add new user
  router.post('/storeUser', async (req, res) => {
    try {
      const { userMail, authorName } = req.body;

      // Check if userMail is already in use
      const existingUser = await db.collection('users').findOne({ userMail });
      if (existingUser) {
        return res.status(400).json({ error: "User already exists" });
      }

      const imageUrl = "https://res.cloudinary.com/dbmiyxijh/image/upload/v1743317385/blog_images/utowgdzijmmjoagh9z0q.png";

      const user = { userMail, authorName, imageUrl };
      const result = await db.collection('users').insertOne(user);
      res.status(201).json({ _id: result.insertedId, ...user });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  // Fetch user details by userMail
  router.post('/fetchUser', async (req, res) => {
    try {
      const { userMail } = req.body;
      const user = await db.collection('users').findOne({ userMail });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json(user);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  const otpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 requests per windowMs
    message: 'Too many OTP requests from this IP, please try again later'
  });

  // Route to send OTP to email
  router.post('/sendOTP', otpLimiter, async (req, res) => {
    const { email, OTP } = req.body;
    try {
      // Send OTP via email
      await sendEmail(email, 'Your OTP Code', `Your OTP code is ${OTP}`);
      return res.status(200).json({ message: 'OTP sent successfully', OTP });
    } catch (err) {
      console.error('Error occurred while sending OTP:', err);
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  router.put('/updateAuthorName', async (req, res) => {
    try {
      const { userMail, authorName } = req.body;
  
      // Add explicit validation for input
      if (!userMail || !authorName) {
        return res.status(400).json({ error: "Missing required fields" });
      }
  
      // Check if the new author name already exists
      const existingAuthor = await db.collection('users').findOne({ authorName });
      if (existingAuthor && existingAuthor.userMail !== userMail) {
        return res.status(400).json({ error: "Author name already exists. Please choose another name." });
      }
  
      const updatedUser = await db.collection('users').findOneAndUpdate(
        { userMail },
        { $set: { authorName } }
      );
  
      if (!updatedUser) {
        return res.status(500).json({ error: "Update failed unexpectedly" });
      }
  
      res.json({ message: "Author name updated successfully" });
    } catch (error) {
      console.error("Update error:", error); // Detailed logging
      res.status(500).json({ error: error.message });
    }
  });
  
  

  router.put('/updateAuthorImage', upload.single('imgUrl'), async (req, res) => {
    try {
      const { userMail } = req.body;
      const imgUrl = req.file.path; 

      const updatedUser = await db.collection('users').findOneAndUpdate(
        { userMail },
        { $set: { imgUrl: imgUrl } },
      );

      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({ success: true,  message: "Profile photo updated successfully" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  return router;
};


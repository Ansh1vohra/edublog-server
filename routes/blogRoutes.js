require('dotenv').config();
const express = require('express');
const multer = require('multer');
const { ObjectId } = require('mongodb');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Set up Cloudinary Storage for Multer
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'blog_images', // Cloudinary folder for storing blog images
    allowed_formats: ['jpg', 'png', 'jpeg'],
  },
});

const upload = multer({ storage });


module.exports = function (db) {
  const router = express.Router();

  // Create a new blog post
  router.post('/', upload.single('blogImg'), async (req, res) => {
    try {
      const { title, content, userMail } = req.body;
      const blogImg = req.file ? req.file.path : null; // Get Cloudinary URL

      const blogPost = { title, content, userMail, blogImg };
      const result = await db.collection('blogs').insertOne(blogPost);

      res.status(201).json({ _id: result.insertedId, ...blogPost });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get all blog posts
  router.get('/', async (req, res) => {
    try {
      const blogs = await db.collection('blogs').find().sort({ _id: -1 }).toArray();
      res.json(blogs);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get a single blog by ID
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const blog = await db.collection('blogs').findOne({ _id: new ObjectId(id) });
      if (blog) {
        res.json(blog);
      } else {
        res.status(404).json({ error: 'Blog not found' });
      }
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  router.get('/blogsByUser/:userMail', async (req, res) => {
    try {
      const { userMail } = req.params;
      const blogs = await db.collection('blogs').find({ userMail }).toArray();
      res.json(blogs);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
};

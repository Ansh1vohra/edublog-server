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
    folder: 'blog_images',
    allowed_formats: ['jpg', 'png', 'jpeg'],
  },
});

const upload = multer({ storage });


module.exports = function (db) {
  const router = express.Router();

  // In your Node.js API route (using JavaScript):
  router.post('/', upload.single('blogImg'), async (req, res) => {
    try {
      const { title, content, userMail } = req.body;
      const defaultImage = "https://res.cloudinary.com/dbmiyxijh/image/upload/v1740252740/blog_images/t1fvjfhajumfcxqypzql.png";

      // Use the uploaded image or fallback to the default image
      const blogImg = req.file ? req.file.path : defaultImage;
      const createdAt = new Date();

      const blogPost = { title, content, userMail, blogImg, createdAt };
      const result = await db.collection('blogs').insertOne(blogPost);

      res.status(201).json({ _id: result.insertedId, ...blogPost });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });



  router.get('/', async (req, res) => {
    try {
      const blogs = await db.collection('blogs').find().sort({ _id: -1 }).toArray();

      // Fetch author names for all blogs
      const blogsWithAuthors = await Promise.all(
        blogs.map(async (blog) => {
          const user = await db.collection('users').findOne({ userMail: blog.userMail });
          return { ...blog, authorName: user ? user.authorName : 'Unknown Author' };
        })
      );

      res.status(200).json(blogsWithAuthors);
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
      9
      const { userMail } = req.params;
      const blogs = await db.collection('blogs').find({ userMail }).toArray();
      res.json(blogs);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
};

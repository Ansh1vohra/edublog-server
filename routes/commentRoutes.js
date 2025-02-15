require('dotenv').config();
const express = require('express');
const { ObjectId } = require('mongodb');

module.exports = function(db) {
    const router = express.Router();

    // Middleware to parse JSON request bodies
    router.use(express.json());

    // 1. Add a comment to a blog post
    router.post('/posts/:postId/comments', async (req, res) => {
        try {
            const postId = req.params.postId; // Extract the post ID from the URL
            const { text, author } = req.body; // Extract comment data from the request body

            if (!text || !author) {
                return res.status(400).json({ error: "Text and author are required." });
            }

            const newComment = {
                postId: new ObjectId(postId), // Associate the comment with the post
                text: text,
                author: author,
                createdAt: new Date(),
                replies: [] // Initialize an empty array for replies
            };

            const result = await db.collection('comments').insertOne(newComment);

            if (result.insertedId) {
                res.status(201).json({ message: "Comment created successfully", commentId: result.insertedId });
            } else {
                res.status(500).json({ error: "Failed to create comment" });
            }
        } catch (error) {
            console.error("Error creating comment:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    });

    // 2. Add a reply to an existing comment
    router.post('/comments/:commentId/replies', async (req, res) => {
        try {
            const commentId = req.params.commentId;
            const { text, author } = req.body;

            if (!text || !author) {
                return res.status(400).json({ error: "Text and author are required." });
            }

            const newReply = {
                text: text,
                author: author,
                createdAt: new Date()
            };

            const result = await db.collection('comments').updateOne(
                { _id: new ObjectId(commentId) },
                { $push: { replies: newReply } }
            );

            if (result.modifiedCount > 0) {
                res.status(201).json({ message: "Reply added successfully" });
            } else {
                res.status(404).json({ error: "Comment not found" });
            }
        } catch (error) {
            console.error("Error adding reply:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    });

    // 3. Get all comments for a specific post
    router.get('/posts/:postId/comments', async (req, res) => {
        try {
            const postId = req.params.postId;
            const comments = await db.collection('comments').find({ postId: new ObjectId(postId) }).toArray();
            res.status(200).json(comments);
        } catch (error) {
            console.error("Error fetching comments:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    });

    return router;
};

require('dotenv').config();
const express = require('express');
const { ObjectId } = require('mongodb');

module.exports = function(db) {
    const router = express.Router();

    // Middleware to parse JSON request bodies
    router.use(express.json());

    //  Add a comment to a blog post
    router.post('/posts/:postId/comments', async (req, res) => {
        try {
            const postId = req.params.postId; 
            const { text, author } = req.body;

            if (!text || !author) {
                return res.status(400).json({ error: "Text and author are required." });
            }

            const newComment = {
                postId: new ObjectId(postId), 
                text: text,
                author: author,
                createdAt: new Date(),
                replies: []
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

    // Add a reply to an existing comment
    router.post('/commentReply/:commentId/replies', async (req, res) => {
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

    // Get all comments for a specific post
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

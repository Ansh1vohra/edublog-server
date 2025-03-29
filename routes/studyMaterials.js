const express = require('express');
const { ObjectId } = require('mongodb');

const studyMaterialsRoutes = (db) => {
    const router = express.Router();
    const collection = db.collection("studyMaterials"); // Collection name in MongoDB

    // 📌 Get all study materials
    router.get('/', async (req, res) => {
        try {
            const materials = await collection.find().toArray();
            res.json(materials);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch study materials' });
        }
    });

    // 📌 Get study material by ID
    router.get('/:id', async (req, res) => {
        try {
            const material = await collection.findOne({ _id: new ObjectId(req.params.id) });
            if (!material) return res.status(404).json({ error: 'Material not found' });
            res.json(material);
        } catch (error) {
            res.status(500).json({ error: 'Error fetching material' });
        }
    });

    // 📌 Upload new study material
    router.post('/', async (req, res) => {
        try {
            const { subjectName, subjectCode, facultyName, type, fileUrl } = req.body;
            if (!subjectName || !subjectCode || !facultyName || !type || !fileUrl) {
                return res.status(400).json({ error: 'All fields are required' });
            }
            const result = await collection.insertOne({ subjectName, subjectCode, facultyName, type, fileUrl });
            res.status(201).json({ message: 'Study material added', id: result.insertedId });
        } catch (error) {
            res.status(500).json({ error: 'Failed to add study material' });
        }
    });

    // 📌 Delete study material
    router.delete('/:id', async (req, res) => {
        try {
            const result = await collection.deleteOne({ _id: new ObjectId(req.params.id) });
            if (result.deletedCount === 0) return res.status(404).json({ error: 'Material not found' });
            res.json({ message: 'Study material deleted' });
        } catch (error) {
            res.status(500).json({ error: 'Error deleting material' });
        }
    });

    return router;
};

module.exports = studyMaterialsRoutes;

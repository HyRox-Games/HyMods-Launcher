const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
require('dotenv').config();
const { connectDB, getAllContent, incrementDownloads } = require('./database');
const { initializeTracker } = require('./tracker');

const PORT = process.env.PORT || 3000;

// Connect to Database
connectDB();

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../../'))); // Serve static files from src/..

// Initialize Socket.IO
initializeTracker(server);

// Public endpoints
app.get('/api/mods', async (req, res) => {
    try {
        const mods = await getAllContent('mods');
        res.json(mods);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/maps', async (req, res) => {
    try {
        const maps = await getAllContent('maps');
        res.json(maps);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/prefabs', async (req, res) => {
    try {
        const prefabs = await getAllContent('prefabs');
        res.json(prefabs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/download/:type/:id', async (req, res) => {
    try {
        const { type, id } = req.params;
        await incrementDownloads(type, id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Root endpoint
app.get('/', (req, res) => {
    res.send('HyMods Server is Running');
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

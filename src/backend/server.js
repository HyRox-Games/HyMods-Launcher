const express = require('express');
const http = require('http');
const path = require('path');
const { getAllContent, incrementDownloads } = require('./database');


const PORT = 3000;

function startServer() {
    return new Promise((resolve) => {
        const app = express();
        const server = http.createServer(app);

        app.use(express.json());
        app.use(express.static(path.join(__dirname, '../')));

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

        // Admin endpoints removed


        server.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
            resolve(server);
        });
    });
}

module.exports = { startServer };

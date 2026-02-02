const fs = require('fs').promises;
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');
const MODS_FILE = path.join(DATA_DIR, 'mods.json');
const MAPS_FILE = path.join(DATA_DIR, 'maps.json');
const PREFABS_FILE = path.join(DATA_DIR, 'prefabs.json');

const FILE_MAP = {
    mods: MODS_FILE,
    maps: MAPS_FILE,
    prefabs: PREFABS_FILE
};

async function ensureDataFiles() {
    await fs.mkdir(DATA_DIR, { recursive: true });

    for (const [type, filePath] of Object.entries(FILE_MAP)) {
        try {
            await fs.access(filePath);
        } catch {
            // File doesn't exist, create with empty array
            await fs.writeFile(filePath, JSON.stringify([], null, 2));
        }
    }
}

async function getAllContent(type) {
    await ensureDataFiles();
    const filePath = FILE_MAP[type];
    if (!filePath) throw new Error('Invalid content type');

    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
}

async function addContent(type, contentData) {
    await ensureDataFiles();
    const filePath = FILE_MAP[type];
    if (!filePath) throw new Error('Invalid content type');

    const contents = await getAllContent(type);

    // Generate unique ID
    const newContent = {
        id: Date.now().toString(),
        ...contentData,
        uploadedAt: new Date().toISOString(),
        downloads: 0
    };

    contents.push(newContent);
    await fs.writeFile(filePath, JSON.stringify(contents, null, 2));

    return newContent;
}

async function updateContent(type, id, updates) {
    await ensureDataFiles();
    const filePath = FILE_MAP[type];
    if (!filePath) throw new Error('Invalid content type');

    const contents = await getAllContent(type);
    const index = contents.findIndex(item => item.id === id);

    if (index === -1) throw new Error('Content not found');

    contents[index] = { ...contents[index], ...updates };
    await fs.writeFile(filePath, JSON.stringify(contents, null, 2));

    return contents[index];
}

async function deleteContent(type, id) {
    await ensureDataFiles();
    const filePath = FILE_MAP[type];
    if (!filePath) throw new Error('Invalid content type');

    const contents = await getAllContent(type);
    const filtered = contents.filter(item => item.id !== id);

    await fs.writeFile(filePath, JSON.stringify(filtered, null, 2));

    return true;
}

async function incrementDownloads(type, id) {
    const contents = await getAllContent(type);
    const item = contents.find(c => c.id === id);

    if (item) {
        item.downloads = (item.downloads || 0) + 1;
        await updateContent(type, id, { downloads: item.downloads });
    }
}

module.exports = {
    getAllContent,
    addContent,
    updateContent,
    deleteContent,
    incrementDownloads,
    ensureDataFiles
};

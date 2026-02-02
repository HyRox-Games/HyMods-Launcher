const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

// Initialize Sequelize
// Use SQLite for local development (dev mode or no connection string)
// Use PostgreSQL for production (when DATABASE_URL is present)
const isProduction = process.env.NODE_ENV === 'production' || process.env.DATABASE_URL;

let sequelize;

if (isProduction && process.env.DATABASE_URL) {
    sequelize = new Sequelize(process.env.DATABASE_URL, {
        dialect: 'postgres',
        logging: false,
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        }
    });
} else {
    // Local development - SQLite
    const dbPath = path.join(__dirname, '../../database.sqlite');
    sequelize = new Sequelize({
        dialect: 'sqlite',
        storage: dbPath,
        logging: false
    });
}

// Models
const Mod = sequelize.define('Mod', {
    name: { type: DataTypes.STRING, allowNull: false },
    description: DataTypes.TEXT,
    author: DataTypes.STRING,
    version: DataTypes.STRING,
    imageUrl: DataTypes.STRING,
    downloadUrl: DataTypes.STRING,
    downloads: { type: DataTypes.INTEGER, defaultValue: 0 },
    uploadedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
});

const Map = sequelize.define('Map', {
    name: { type: DataTypes.STRING, allowNull: false },
    description: DataTypes.TEXT,
    author: DataTypes.STRING,
    version: DataTypes.STRING,
    imageUrl: DataTypes.STRING,
    downloadUrl: DataTypes.STRING,
    downloads: { type: DataTypes.INTEGER, defaultValue: 0 },
    uploadedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
});

const Prefab = sequelize.define('Prefab', {
    name: { type: DataTypes.STRING, allowNull: false },
    description: DataTypes.TEXT,
    author: DataTypes.STRING,
    version: DataTypes.STRING,
    imageUrl: DataTypes.STRING,
    downloadUrl: DataTypes.STRING,
    downloads: { type: DataTypes.INTEGER, defaultValue: 0 },
    uploadedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
});

const MODELS = {
    mods: Mod,
    maps: Map,
    prefabs: Prefab
};

// Database Connection & Sync
async function connectDB() {
    try {
        await sequelize.authenticate();
        console.log('Database Connected (' + (isProduction ? 'PostgreSQL' : 'SQLite') + ')');

        // Sync models (create tables if not exist)
        // In production, you might want to use migrations instead of alter: true
        await sequelize.sync({ alter: true });
        console.log('Database Synced');
    } catch (error) {
        console.error('Database connection error:', error);
    }
}

// Data Access Methods
async function getAllContent(type) {
    const Model = MODELS[type];
    if (!Model) throw new Error('Invalid content type');
    // Sequelize uses 'DESC' for sorting
    return await Model.findAll({ order: [['uploadedAt', 'DESC']] });
}

async function addContent(type, contentData) {
    const Model = MODELS[type];
    if (!Model) throw new Error('Invalid content type');

    return await Model.create(contentData);
}

async function updateContent(type, id, updates) {
    const Model = MODELS[type];
    if (!Model) throw new Error('Invalid content type');

    const item = await Model.findByPk(id);
    if (!item) throw new Error('Content not found');

    return await item.update(updates);
}

async function deleteContent(type, id) {
    const Model = MODELS[type];
    if (!Model) throw new Error('Invalid content type');

    const item = await Model.findByPk(id);
    if (item) {
        await item.destroy();
        return true;
    }
    return false;
}

async function incrementDownloads(type, id) {
    const Model = MODELS[type];
    if (!Model) throw new Error('Invalid content type');

    const item = await Model.findByPk(id);
    if (item) {
        await item.increment('downloads');
    }
}

module.exports = {
    connectDB,
    getAllContent,
    addContent,
    updateContent,
    deleteContent,
    incrementDownloads
};

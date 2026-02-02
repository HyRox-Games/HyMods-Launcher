const { ipcRenderer } = require('electron');
const io = require('socket.io-client');

// Initialize Socket.IO connection for online tracking
const socket = io('http://localhost:3000');

// State
let currentTab = 'mods';
let currentFilter = 'all';
let allMods = [];
let allMaps = [];
let allPrefabs = [];

// DOM Elements
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const filterButtons = document.querySelectorAll('.filter-btn');
const searchInput = document.getElementById('searchInput');
const onlineCountElement = document.getElementById('onlineCount');
const loadingOverlay = document.getElementById('loadingOverlay');

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    setupEventListeners();
    await loadAllContent();
    setupAdminShortcut();
    setupAdminTrigger();
});

// Socket.IO - Online Counter
socket.on('online-count', (count) => {
    onlineCountElement.textContent = count;
    const statsOnline = document.getElementById('statsOnline');
    if (statsOnline) {
        statsOnline.textContent = count;
    }
});

// Event Listeners
function setupEventListeners() {
    // Tab switching
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            switchTab(tab);
        });
    });

    // Filter buttons
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const filter = btn.dataset.filter;
            setFilter(filter);
        });
    });

    // Search
    searchInput.addEventListener('input', (e) => {
        handleSearch(e.target.value);
    });
}

// Tab Switching
function switchTab(tab) {
    currentTab = tab;

    // Update buttons
    tabButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    // Update content
    tabContents.forEach(content => {
        content.classList.toggle('active', content.id === `${tab}-tab`);
    });

    // Render content
    renderContent();
}

// Filter
function setFilter(filter) {
    currentFilter = filter;

    // Update all filter buttons in all tabs
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filter);
    });

    renderContent();
}

// Search
function handleSearch(query) {
    const lowerQuery = query.toLowerCase();

    let data = getCurrentData();

    if (query.trim() === '') {
        renderContent();
        return;
    }

    const filtered = data.filter(item =>
        item.name.toLowerCase().includes(lowerQuery) ||
        item.description.toLowerCase().includes(lowerQuery) ||
        item.author.toLowerCase().includes(lowerQuery)
    );

    renderFilteredContent(filtered);
}

// Load Content
async function loadAllContent() {
    showLoading(true);

    try {
        const [mods, maps, prefabs] = await Promise.all([
            fetch('http://localhost:3000/api/mods').then(r => r.json()),
            fetch('http://localhost:3000/api/maps').then(r => r.json()),
            fetch('http://localhost:3000/api/prefabs').then(r => r.json())
        ]);

        allMods = mods;
        allMaps = maps;
        allPrefabs = prefabs;

        renderContent();
    } catch (error) {
        console.error('Error loading content:', error);
        showError('فشل تحميل المحتوى');
    } finally {
        showLoading(false);
    }
}

// Get Current Data
function getCurrentData() {
    switch (currentTab) {
        case 'mods': return allMods;
        case 'maps': return allMaps;
        case 'prefabs': return allPrefabs;
        default: return [];
    }
}

// Apply Filter
function applyFilter(data) {
    switch (currentFilter) {
        case 'popular':
            return [...data].sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
        case 'recent':
            return [...data].sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
        default:
            return data;
    }
}

// Render Content
function renderContent() {
    const data = getCurrentData();
    const filtered = applyFilter(data);
    renderFilteredContent(filtered);
}

function renderFilteredContent(data) {
    const gridId = `${currentTab}-grid`;
    const grid = document.getElementById(gridId);

    if (!grid) return;

    if (data.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📦</div>
                <h3>لا يوجد محتوى</h3>
                <p>لم يتم العثور على أي ${getContentTypeLabel()} حتى الآن</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = data.map(item => createContentCard(item)).join('');

    // Add download event listeners
    grid.querySelectorAll('.download-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.id;
            handleDownload(id);
        });
    });
}

// Create Content Card
function createContentCard(item) {
    const imageUrl = item.imageUrl || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%236366f1" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="48" fill="white"%3E' + encodeURIComponent(item.name.charAt(0)) + '%3C/text%3E%3C/svg%3E';

    return `
        <div class="content-card">
            <img src="${imageUrl}" alt="${item.name}" class="card-image" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'400\\' height=\\'300\\'%3E%3Crect fill=\\'%236366f1\\' width=\\'400\\' height=\\'300\\'/%3E%3C/svg%3E'">
            <div class="card-body">
                <h3 class="card-title">${item.name}</h3>
                <p class="card-description">${item.description}</p>
                <div class="card-meta">
                    <span class="card-author">👤 ${item.author}</span>
                    <span class="card-version">v${item.version}</span>
                </div>
                <div class="card-stats">
                    <div class="stat-item">
                        <span>⬇️</span>
                        <span>${item.downloads || 0}</span>
                    </div>
                    <div class="stat-item">
                        <span>📅</span>
                        <span>${formatDate(item.uploadedAt)}</span>
                    </div>
                </div>
                <button class="download-btn" data-id="${item.id}">
                    تحميل الآن
                </button>
            </div>
        </div>
    `;
}

// Handle Download
async function handleDownload(id) {
    const item = getCurrentData().find(i => i.id === id);

    if (!item) return;

    try {
        // Increment download count
        await fetch(`http://localhost:3000/api/download/${currentTab}/${id}`, {
            method: 'POST'
        });

        // Open download URL
        if (item.downloadUrl) {
            require('electron').shell.openExternal(item.downloadUrl);
        }

        // Reload to update download count
        await loadAllContent();

        showNotification(`تم بدء تحميل ${item.name}`);
    } catch (error) {
        console.error('Download error:', error);
        showError('فشل التحميل');
    }
}

// Update Stats
function updateStats() {
    document.getElementById('totalMods').textContent = allMods.length;
    document.getElementById('totalMaps').textContent = allMaps.length;
    document.getElementById('totalPrefabs').textContent = allPrefabs.length;
}

// Utility Functions
function getContentTypeLabel() {
    switch (currentTab) {
        case 'mods': return 'مودات';
        case 'maps': return 'خرائط';
        case 'prefabs': return 'بريفابس';
        default: return 'محتوى';
    }
}

function formatDate(dateString) {
    if (!dateString) return 'غير معروف';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'اليوم';
    if (diffDays === 1) return 'أمس';
    if (diffDays < 7) return `منذ ${diffDays} أيام`;
    if (diffDays < 30) return `منذ ${Math.floor(diffDays / 7)} أسابيع`;
    return `منذ ${Math.floor(diffDays / 30)} شهر`;
}

function showLoading(show) {
    loadingOverlay.classList.toggle('active', show);
}

function showNotification(message) {
    // Simple notification - you can enhance this
    alert(message);
}

function showError(message) {
    alert('خطأ: ' + message);
}

// Export for admin panel
window.reloadContent = loadAllContent;

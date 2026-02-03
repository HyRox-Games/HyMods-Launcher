const { shell, ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

// Load local JSON data
let allMods = [];
let allMaps = [];
let allPrefabs = [];
let allModpacks = [];

let currentTab = 'mods';
let currentFilter = 'all';

// DOM Elements - will be initialized after DOM loads
let loadingOverlay;
let updateModal;
let updateTitle;
let updateMessage;
let restartBtn;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize DOM elements
    loadingOverlay = document.getElementById('loadingOverlay');
    updateModal = document.getElementById('updateModal');
    updateTitle = document.getElementById('updateTitle');
    updateMessage = document.getElementById('updateMessage');
    restartBtn = document.getElementById('restartBtn');

    // Setup Update Listeners
    ipcRenderer.on('update_available', () => {
        updateModal.classList.remove('hidden');
        updateMessage.textContent = 'جاري تحميل التحديث الجديد...';
        restartBtn.classList.add('hidden');
    });

    ipcRenderer.on('update_downloaded', () => {
        updateMessage.textContent = 'تم تحميل التحديث بنجاح. يجب إعادة التشغيل لتثبيت التحديث.';
        restartBtn.classList.remove('hidden');
    });

    restartBtn.addEventListener('click', () => {
        ipcRenderer.send('restart_app');
    });

    setupEventListeners();
    setupSocialMediaMenu();
    await loadAllContent();
    setupAdminShortcut();
    setupAdminTrigger();
});

// Setup Social Media Overlay
function setupSocialMediaMenu() {
    const socialBtn = document.getElementById('socialMenuBtn');
    const overlay = document.getElementById('socialOverlay');
    const closeBtn = document.getElementById('closeSocialBtn');

    if (socialBtn && overlay) {
        // Open overlay
        socialBtn.addEventListener('click', () => {
            overlay.classList.add('active');
        });

        // Close overlay
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                overlay.classList.remove('active');
            });
        }

        // Close on outside click (optional, but good for overlays)
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.classList.remove('active');
            }
        });

        // Handle links
        overlay.querySelectorAll('.social-card').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const url = link.dataset.url;
                if (url) {
                    shell.openExternal(url);
                    // blur overlay slightly or do nothing, keeping it open might be better or close it
                    // user preference: usually keeping it open or closing. Let's close it for now.
                    overlay.classList.remove('active');
                }
            });
        });
    }
}

// Setup Event Listeners
function setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentTab = btn.dataset.tab;
            switchTab(currentTab);
        });
    });

    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentFilter = btn.dataset.filter;
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderContent();
        });
    });

    // Search
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const data = getCurrentData();
            const filtered = data.filter(item =>
                item.name.toLowerCase().includes(query) ||
                item.description.toLowerCase().includes(query) ||
                item.author.toLowerCase().includes(query)
            );
            renderFilteredContent(applyFilter(filtered));
        });
    }
}

// Load Content from local JSON files
async function loadAllContent() {
    showLoading(true);

    try {
        // Try multiple paths to find the data directory
        let dataPath = null;
        const pathsToCheck = [
            path.join(process.resourcesPath, 'data'), // Top priority: Extra resources
            path.join(__dirname, '..', 'data'), // Relative to script: src/data
            path.join(process.cwd(), 'src', 'data'), // Relative to CWD
            path.join(process.resourcesPath, 'app', 'src', 'data'), // Packaged standard
            path.join(process.resourcesPath, 'src', 'data'), // Packaged alternative
            path.resolve(__dirname, '../../src/data') // Resolve from potential built structure
        ];

        const triedPaths = [];

        for (const p of pathsToCheck) {
            try {
                if (fs.existsSync(p)) {
                    console.log(`Found data directory at: ${p}`);
                    dataPath = p;
                    break;
                }
                triedPaths.push(p);
            } catch (e) {
                console.error(`Error checking path ${p}:`, e);
                triedPaths.push(`${p} (${e.message})`);
            }
        }

        if (!dataPath) {
            console.error('Data directory search failed. Checked:', triedPaths);
            console.log('Environment info:', {
                __dirname,
                cwd: process.cwd(),
                resourcesPath: process.resourcesPath
            });
            throw new Error(`Could not find data directory.\nChecked paths:\n${triedPaths.join('\n')}`);
        }

        // Read JSON files
        const modsData = fs.readFileSync(path.join(dataPath, 'mods.json'), 'utf8');
        const mapsData = fs.readFileSync(path.join(dataPath, 'maps.json'), 'utf8');
        const prefabsData = fs.readFileSync(path.join(dataPath, 'prefabs.json'), 'utf8');

        let modpacksData = '[]';
        if (fs.existsSync(path.join(dataPath, 'modpacks.json'))) {
            modpacksData = fs.readFileSync(path.join(dataPath, 'modpacks.json'), 'utf8');
        }

        allMods = JSON.parse(modsData);
        allMaps = JSON.parse(mapsData);
        allPrefabs = JSON.parse(prefabsData);
        allModpacks = JSON.parse(modpacksData);

        renderContent();
        updateStats();
    } catch (error) {
        console.error('Error loading content:', error);
        showError('فشل تحميل المحتوى: ' + error.message);
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
        case 'modpacks': return allModpacks;
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

// Switch Tab
function switchTab(tab) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `${tab}-tab`);
    });

    renderContent();
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
function handleDownload(id) {
    const item = getCurrentData().find(i => i.id === id);

    if (!item) return;

    try {
        // Open download URL in external browser
        if (item.downloadUrl) {
            shell.openExternal(item.downloadUrl);
            showNotification(`تم فتح رابط تحميل ${item.name}`);
        } else {
            showError('رابط التحميل غير متوفر');
        }
    } catch (error) {
        console.error('Download error:', error);
        showError('فشل فتح رابط التحميل');
    }
}

// Update Stats
function updateStats() {
    const totalModsEl = document.getElementById('totalMods');
    const totalMapsEl = document.getElementById('totalMaps');
    const totalPrefabsEl = document.getElementById('totalPrefabs');

    if (totalModsEl) totalModsEl.textContent = allMods.length;
    if (totalMapsEl) totalMapsEl.textContent = allMaps.length;
    if (totalPrefabsEl) totalPrefabsEl.textContent = allPrefabs.length;

    // Optional: Stats for modpacks if element exists
    const totalModpacksEl = document.getElementById('totalModpacks');
    if (totalModpacksEl) totalModpacksEl.textContent = allModpacks.length;
}

// Utility Functions
function getContentTypeLabel() {
    switch (currentTab) {
        case 'mods': return 'مودات';
        case 'maps': return 'خرائط';
        case 'prefabs': return 'بريفابس';
        case 'modpacks': return 'مودباك';
        default: return 'محتوى';
    }
}

function formatDate(dateString) {
    if (!dateString || dateString === '?') return 'غير معروف';
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
    if (loadingOverlay) {
        loadingOverlay.classList.toggle('active', show);
    }
}

function showNotification(message) {
    // Simple notification
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #10b981;
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function showError(message) {
    const notification = document.createElement('div');
    notification.className = 'notification error';
    notification.textContent = 'خطأ: ' + message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #ef4444;
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Admin Panel Functions (kept for compatibility)
function setupAdminShortcut() {
    // Removed admin functionality
}

function setupAdminTrigger() {
    // Removed admin functionality
}

// Export for potential future use
window.reloadContent = loadAllContent;

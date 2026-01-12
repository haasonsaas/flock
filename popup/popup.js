/**
 * Flock Popup Script
 * Dashboard for managing Twitter contacts
 */

// ================================
// STORAGE
// ================================
const DB_NAME = 'flock-crm';
const DB_VERSION = 1;

let db = null;

async function initDB() {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };
    request.onupgradeneeded = (event) => {
      const database = event.target.result;

      if (!database.objectStoreNames.contains('contacts')) {
        const contactsStore = database.createObjectStore('contacts', { keyPath: 'username' });
        contactsStore.createIndex('list', 'list', { unique: false });
        contactsStore.createIndex('pipelineStage', 'pipelineStage', { unique: false });
        contactsStore.createIndex('createdAt', 'createdAt', { unique: false });
        contactsStore.createIndex('lastInteraction', 'lastInteraction', { unique: false });
      }

      if (!database.objectStoreNames.contains('lists')) {
        database.createObjectStore('lists', { keyPath: 'id' });
      }

      if (!database.objectStoreNames.contains('tags')) {
        database.createObjectStore('tags', { keyPath: 'id' });
      }

      if (!database.objectStoreNames.contains('interactions')) {
        const interactionsStore = database.createObjectStore('interactions', { keyPath: 'id' });
        interactionsStore.createIndex('contactUsername', 'contactUsername', { unique: false });
      }

      if (!database.objectStoreNames.contains('settings')) {
        database.createObjectStore('settings', { keyPath: 'key' });
      }
    };
  });
}

async function getAllContacts() {
  await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('contacts', 'readonly');
    const store = tx.objectStore('contacts');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function searchContacts(query) {
  const all = await getAllContacts();
  const q = query.toLowerCase();
  return all.filter(c =>
    c.username?.toLowerCase().includes(q) ||
    c.displayName?.toLowerCase().includes(q) ||
    c.bio?.toLowerCase().includes(q) ||
    c.notes?.toLowerCase().includes(q) ||
    c.tags?.some(t => t.toLowerCase().includes(q))
  );
}

async function exportData() {
  const contacts = await getAllContacts();

  return {
    version: 1,
    exportedAt: Date.now(),
    contacts,
  };
}

// ================================
// UTILITIES
// ================================

function formatCount(num) {
  if (num === null || num === undefined) return '—';
  if (num >= 1000000000) return (num / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
  if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return num.toString();
}

function isThisWeek(timestamp) {
  const now = Date.now();
  const weekAgo = now - (7 * 24 * 60 * 60 * 1000);
  return timestamp >= weekAgo;
}

// ================================
// UI RENDERING
// ================================

function renderContactCard(contact) {
  return `
    <div class="flock-contact-card" data-username="${contact.username}">
      <img
        class="flock-contact-avatar"
        src="${contact.profileImageUrl || ''}"
        alt="${contact.displayName}"
        onerror="this.style.display='none'"
      >
      <div class="flock-contact-info">
        <div class="flock-contact-name">${contact.displayName || contact.username}</div>
        <div class="flock-contact-username">@${contact.username}</div>
        <div class="flock-contact-meta">
          <span class="flock-contact-stage stage-${contact.pipelineStage || 'new'}">
            ${contact.pipelineStage || 'new'}
          </span>
          <span class="flock-contact-followers">${formatCount(contact.followersCount)} followers</span>
        </div>
      </div>
      <div class="flock-contact-actions">
        <button class="flock-contact-action" title="Open on Twitter" data-action="open" data-username="${contact.username}">
          <svg viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>
        </button>
      </div>
    </div>
  `;
}

function renderContactList(contacts) {
  const container = document.getElementById('contactList');
  const emptyState = document.getElementById('emptyState');
  const loadingState = document.getElementById('loadingState');

  loadingState.style.display = 'none';

  if (contacts.length === 0) {
    container.style.display = 'none';
    emptyState.style.display = 'flex';
    return;
  }

  emptyState.style.display = 'none';
  container.style.display = 'flex';
  container.innerHTML = contacts.map(renderContactCard).join('');

  // Add click handlers
  container.querySelectorAll('.flock-contact-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.flock-contact-action')) return;
      const username = card.dataset.username;
      openTwitterProfile(username);
    });
  });

  container.querySelectorAll('.flock-contact-action[data-action="open"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const username = btn.dataset.username;
      openTwitterProfile(username);
    });
  });
}

function renderPipelineView(contacts) {
  const container = document.getElementById('pipelineView');
  const stages = ['new', 'contacted', 'engaged', 'qualified', 'won', 'lost'];

  const byStage = {};
  stages.forEach(stage => {
    byStage[stage] = contacts.filter(c => (c.pipelineStage || 'new') === stage);
  });

  container.innerHTML = stages.map(stage => `
    <div class="flock-pipeline-column">
      <div class="flock-pipeline-header">
        <span class="flock-pipeline-title">${stage}</span>
        <span class="flock-pipeline-count">${byStage[stage].length}</span>
      </div>
      <div class="flock-pipeline-items">
        ${byStage[stage].map(contact => `
          <div class="flock-pipeline-item" data-username="${contact.username}">
            <img
              class="flock-pipeline-avatar"
              src="${contact.profileImageUrl || ''}"
              alt="${contact.displayName}"
              onerror="this.style.display='none'"
            >
            <span class="flock-pipeline-name">${contact.displayName || contact.username}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');

  // Add click handlers
  container.querySelectorAll('.flock-pipeline-item').forEach(item => {
    item.addEventListener('click', () => {
      const username = item.dataset.username;
      openTwitterProfile(username);
    });
  });
}

function updateStats(contacts) {
  document.getElementById('totalContacts').textContent = contacts.length;

  const thisWeekCount = contacts.filter(c => isThisWeek(c.createdAt)).length;
  document.getElementById('thisWeek').textContent = thisWeekCount;

  // Count contacts that haven't been interacted with in over a week
  const needsFollowUp = contacts.filter(c => {
    if (!c.lastInteraction) return true;
    const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    return c.lastInteraction < weekAgo;
  }).length;
  document.getElementById('needsFollowUp').textContent = needsFollowUp;
}

function openTwitterProfile(username) {
  chrome.tabs.create({ url: `https://twitter.com/${username}` });
}

// ================================
// TAB HANDLING
// ================================

let currentTab = 'all';
let allContacts = [];

function switchTab(tab) {
  currentTab = tab;

  // Update tab UI
  document.querySelectorAll('.flock-tab').forEach(t => {
    t.classList.toggle('flock-active', t.dataset.tab === tab);
  });

  // Show/hide views
  const contactList = document.getElementById('contactList');
  const pipelineView = document.getElementById('pipelineView');
  const emptyState = document.getElementById('emptyState');

  if (allContacts.length === 0) {
    contactList.style.display = 'none';
    pipelineView.style.display = 'none';
    emptyState.style.display = 'flex';
    return;
  }

  emptyState.style.display = 'none';

  switch (tab) {
    case 'all':
      contactList.style.display = 'flex';
      pipelineView.style.display = 'none';
      renderContactList(allContacts);
      break;

    case 'pipeline':
      contactList.style.display = 'none';
      pipelineView.style.display = 'flex';
      renderPipelineView(allContacts);
      break;

    case 'recent':
      contactList.style.display = 'flex';
      pipelineView.style.display = 'none';
      const recentContacts = [...allContacts]
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 10);
      renderContactList(recentContacts);
      break;
  }
}

// ================================
// SEARCH
// ================================

let searchVisible = false;
let searchTimeout;

function toggleSearch() {
  searchVisible = !searchVisible;
  const searchBar = document.getElementById('searchBar');
  const searchInput = document.getElementById('searchInput');

  searchBar.classList.toggle('flock-visible', searchVisible);

  if (searchVisible) {
    searchInput.focus();
  } else {
    searchInput.value = '';
    renderContactList(allContacts);
  }
}

function handleSearch(query) {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(async () => {
    if (!query.trim()) {
      renderContactList(allContacts);
      return;
    }

    const results = await searchContacts(query);
    renderContactList(results);
  }, 200);
}

// ================================
// EXPORT
// ================================

async function handleExport() {
  try {
    const data = await exportData();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `flock-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('[Flock] Export error:', error);
    alert('Failed to export data. Please try again.');
  }
}

// ================================
// INITIALIZATION
// ================================

async function init() {
  try {
    await initDB();

    // Load contacts
    allContacts = await getAllContacts();

    // Update stats
    updateStats(allContacts);

    // Render initial view
    switchTab('all');

    // Tab click handlers
    document.querySelectorAll('.flock-tab').forEach(tab => {
      tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    // Search
    document.getElementById('searchBtn').addEventListener('click', toggleSearch);
    document.getElementById('searchInput').addEventListener('input', (e) => {
      handleSearch(e.target.value);
    });

    // Export
    document.getElementById('exportBtn').addEventListener('click', handleExport);

    // Settings (placeholder)
    document.getElementById('settingsBtn').addEventListener('click', () => {
      chrome.runtime.openOptionsPage?.() || alert('Settings coming soon!');
    });

  } catch (error) {
    console.error('[Flock] Initialization error:', error);
    document.getElementById('loadingState').innerHTML = `
      <p style="color: var(--flock-error);">Failed to load. Please try again.</p>
    `;
  }
}

// Start
init();

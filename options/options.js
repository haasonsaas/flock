/**
 * Flock Options Page Script
 */

const DB_NAME = 'flock-crm';
const DB_VERSION = 1;

let db = null;

// ================================
// DATABASE
// ================================

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

async function getAllInteractions() {
  await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('interactions', 'readonly');
    const store = tx.objectStore('interactions');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getAllLists() {
  await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('lists', 'readonly');
    const store = tx.objectStore('lists');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getAllTags() {
  await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('tags', 'readonly');
    const store = tx.objectStore('tags');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function clearAllData() {
  await initDB();

  const stores = ['contacts', 'lists', 'tags', 'interactions', 'settings'];

  for (const storeName of stores) {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

async function importData(data) {
  if (data.version !== 1) throw new Error('Unsupported export version');

  await initDB();

  for (const contact of data.contacts || []) {
    await new Promise((resolve, reject) => {
      const tx = db.transaction('contacts', 'readwrite');
      tx.objectStore('contacts').put(contact);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  }

  for (const list of data.lists || []) {
    await new Promise((resolve, reject) => {
      const tx = db.transaction('lists', 'readwrite');
      tx.objectStore('lists').put(list);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  }

  for (const tag of data.tags || []) {
    await new Promise((resolve, reject) => {
      const tx = db.transaction('tags', 'readwrite');
      tx.objectStore('tags').put(tag);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  }

  for (const interaction of data.interactions || []) {
    await new Promise((resolve, reject) => {
      const tx = db.transaction('interactions', 'readwrite');
      tx.objectStore('interactions').put(interaction);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  }
}

// ================================
// UI HELPERS
// ================================

function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `flock-toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 200);
  }, 3000);
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// ================================
// ACTIONS
// ================================

async function handleExport() {
  try {
    const contacts = await getAllContacts();
    const lists = await getAllLists();
    const tags = await getAllTags();
    const interactions = await getAllInteractions();

    const data = {
      version: 1,
      exportedAt: Date.now(),
      contacts,
      lists,
      tags,
      interactions,
    };

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

    showToast('Data exported successfully!', 'success');
  } catch (error) {
    console.error('[Flock] Export error:', error);
    showToast('Failed to export data', 'error');
  }
}

async function handleImport(file) {
  try {
    const text = await file.text();
    const data = JSON.parse(text);

    await importData(data);

    showToast(`Imported ${data.contacts?.length || 0} contacts`, 'success');

    // Refresh stats
    await updateStats();
  } catch (error) {
    console.error('[Flock] Import error:', error);
    showToast('Failed to import data', 'error');
  }
}

async function handleClear() {
  const confirmed = confirm(
    'Are you sure you want to delete ALL your Flock data?\n\n' +
    'This will permanently delete:\n' +
    '• All saved contacts\n' +
    '• All interaction history\n' +
    '• All tags and lists\n\n' +
    'This action cannot be undone!'
  );

  if (!confirmed) return;

  try {
    await clearAllData();
    showToast('All data cleared', 'success');
    await updateStats();
  } catch (error) {
    console.error('[Flock] Clear error:', error);
    showToast('Failed to clear data', 'error');
  }
}

async function updateStats() {
  try {
    const contacts = await getAllContacts();

    document.getElementById('contactCount').textContent = contacts.length;

    // Estimate storage size
    const data = {
      contacts,
      lists: await getAllLists(),
      tags: await getAllTags(),
      interactions: await getAllInteractions(),
    };
    const size = new Blob([JSON.stringify(data)]).size;
    document.getElementById('storageUsed').textContent = formatBytes(size);
  } catch (error) {
    console.error('[Flock] Stats error:', error);
  }
}

// ================================
// INITIALIZATION
// ================================

async function init() {
  try {
    await initDB();
    await updateStats();

    // Event listeners
    document.getElementById('exportBtn').addEventListener('click', handleExport);

    document.getElementById('importInput').addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) handleImport(file);
      e.target.value = '';
    });

    document.getElementById('clearBtn').addEventListener('click', handleClear);

  } catch (error) {
    console.error('[Flock] Options init error:', error);
  }
}

init();

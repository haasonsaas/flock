/**
 * Flock Options Page Script
 */

// ================================
// STORAGE (using chrome.storage.local for cross-context sharing)
// ================================

async function getAllContacts() {
  const result = await chrome.storage.local.get('contacts');
  const contactsObj = result.contacts || {};
  return Object.values(contactsObj);
}

async function getAllInteractions() {
  const result = await chrome.storage.local.get('interactions');
  const interactionsObj = result.interactions || {};
  return Object.values(interactionsObj);
}

async function getAllLists() {
  const result = await chrome.storage.local.get('lists');
  return result.lists || [];
}

async function getAllTags() {
  const result = await chrome.storage.local.get('tags');
  return result.tags || [];
}

async function clearAllData() {
  await chrome.storage.local.clear();
}

async function importData(data) {
  if (data.version !== 1) throw new Error('Unsupported export version');

  // Convert contacts array to object keyed by username
  const contactsObj = {};
  for (const contact of data.contacts || []) {
    contactsObj[contact.username] = contact;
  }

  // Convert interactions array to object keyed by id
  const interactionsObj = {};
  for (const interaction of data.interactions || []) {
    interactionsObj[interaction.id] = interaction;
  }

  await chrome.storage.local.set({
    contacts: contactsObj,
    interactions: interactionsObj,
    lists: data.lists || [],
    tags: data.tags || [],
  });
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
// API KEY MANAGEMENT
// ================================

async function loadApiKey() {
  const result = await chrome.storage.sync.get('anthropicApiKey');
  const apiKeyInput = document.getElementById('apiKeyInput');
  const apiStatus = document.getElementById('apiStatus');

  if (result.anthropicApiKey) {
    // Mask the key, show first 7 and last 4 chars
    const key = result.anthropicApiKey;
    apiKeyInput.value = key.substring(0, 7) + '...' + key.substring(key.length - 4);
    apiKeyInput.dataset.hasKey = 'true';
    apiStatus.innerHTML = '<span class="flock-status-ok">✓ API key configured</span>';
  } else {
    apiKeyInput.value = '';
    apiKeyInput.dataset.hasKey = 'false';
    apiStatus.innerHTML = '<span class="flock-status-none">No API key set</span>';
  }
}

async function saveApiKey() {
  const apiKeyInput = document.getElementById('apiKeyInput');
  const apiStatus = document.getElementById('apiStatus');
  const key = apiKeyInput.value.trim();

  // If the input shows a masked key and hasn't been changed, skip
  if (key.includes('...') && apiKeyInput.dataset.hasKey === 'true') {
    showToast('API key unchanged', 'info');
    return;
  }

  // Validate key format
  if (!key) {
    await chrome.storage.sync.remove('anthropicApiKey');
    apiStatus.innerHTML = '<span class="flock-status-none">API key removed</span>';
    showToast('API key removed', 'success');
    return;
  }

  if (!key.startsWith('sk-ant-')) {
    showToast('Invalid API key format (should start with sk-ant-)', 'error');
    return;
  }

  // Save the key
  await chrome.storage.sync.set({ anthropicApiKey: key });

  // Mask it in the UI
  apiKeyInput.value = key.substring(0, 7) + '...' + key.substring(key.length - 4);
  apiKeyInput.dataset.hasKey = 'true';
  apiStatus.innerHTML = '<span class="flock-status-ok">✓ API key saved</span>';

  showToast('API key saved!', 'success');
}

// ================================
// INITIALIZATION
// ================================

async function init() {
  try {
    await updateStats();
    await loadApiKey();

    // Event listeners
    document.getElementById('exportBtn').addEventListener('click', handleExport);

    document.getElementById('importInput').addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) handleImport(file);
      e.target.value = '';
    });

    document.getElementById('clearBtn').addEventListener('click', handleClear);

    // API key
    document.getElementById('saveApiKeyBtn').addEventListener('click', saveApiKey);
    document.getElementById('apiKeyInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') saveApiKey();
    });

    // Clear masked key on focus
    document.getElementById('apiKeyInput').addEventListener('focus', (e) => {
      if (e.target.dataset.hasKey === 'true' && e.target.value.includes('...')) {
        e.target.value = '';
        e.target.type = 'password';
      }
    });

  } catch (error) {
    console.error('[Flock] Options init error:', error);
  }
}

init();

/**
 * Flock Popup Script
 * Dashboard for managing Twitter contacts
 */

// ================================
// STORAGE (using chrome.storage.local for cross-context sharing)
// ================================

async function getAllContacts() {
  const result = await chrome.storage.local.get('contacts');
  const contactsObj = result.contacts || {};
  return Object.values(contactsObj);
}

async function getContact(username) {
  const result = await chrome.storage.local.get('contacts');
  const contactsObj = result.contacts || {};
  return contactsObj[username] || null;
}

async function updateContact(username, updates) {
  const result = await chrome.storage.local.get('contacts');
  const contactsObj = result.contacts || {};
  if (contactsObj[username]) {
    contactsObj[username] = { ...contactsObj[username], ...updates, updatedAt: Date.now() };
    await chrome.storage.local.set({ contacts: contactsObj });
    return contactsObj[username];
  }
  return null;
}

async function getAllInteractions() {
  const result = await chrome.storage.local.get('interactions');
  return result.interactions || {};
}

// Saved search filters
let savedFilters = [];

async function loadSavedFilters() {
  const result = await chrome.storage.local.get('savedFilters');
  savedFilters = result.savedFilters || [];
  return savedFilters;
}

async function saveFilter(name, query) {
  savedFilters.push({ id: Date.now().toString(), name, query, createdAt: Date.now() });
  await chrome.storage.local.set({ savedFilters });
  return savedFilters;
}

async function deleteFilter(id) {
  savedFilters = savedFilters.filter(f => f.id !== id);
  await chrome.storage.local.set({ savedFilters });
  return savedFilters;
}

// Advanced search with syntax support
// Supports: tag:name, stage:name, list:name, has:reminder, has:notes, @username
async function searchContacts(query) {
  const all = await getAllContacts();
  const lists = await getAllLists();

  // Parse special syntax
  const filters = {
    tags: [],
    stages: [],
    lists: [],
    hasReminder: false,
    hasNotes: false,
    text: []
  };

  const tokens = query.match(/(?:[^\s"]+|"[^"]*")+/g) || [];

  tokens.forEach(token => {
    const lower = token.toLowerCase();

    if (lower.startsWith('tag:')) {
      filters.tags.push(lower.slice(4).replace(/"/g, ''));
    } else if (lower.startsWith('stage:')) {
      filters.stages.push(lower.slice(6).replace(/"/g, ''));
    } else if (lower.startsWith('list:')) {
      const listName = lower.slice(5).replace(/"/g, '');
      const list = lists.find(l => l.name.toLowerCase() === listName || l.id === listName);
      if (list) filters.lists.push(list.id);
    } else if (lower === 'has:reminder') {
      filters.hasReminder = true;
    } else if (lower === 'has:notes') {
      filters.hasNotes = true;
    } else if (lower.startsWith('@')) {
      filters.text.push(lower.slice(1));
    } else {
      filters.text.push(lower.replace(/"/g, ''));
    }
  });

  return all.filter(contact => {
    // Check tag filters
    if (filters.tags.length > 0) {
      const contactTags = (contact.tags || []).map(t => t.toLowerCase());
      if (!filters.tags.some(t => contactTags.some(ct => ct.includes(t)))) {
        return false;
      }
    }

    // Check stage filters
    if (filters.stages.length > 0) {
      const contactStage = (contact.pipelineStage || 'new').toLowerCase();
      if (!filters.stages.some(s => contactStage.includes(s))) {
        return false;
      }
    }

    // Check list filters
    if (filters.lists.length > 0) {
      const contactLists = contact.listIds || [];
      if (!filters.lists.some(l => contactLists.includes(l))) {
        return false;
      }
    }

    // Check has:reminder
    if (filters.hasReminder && !contact.reminder?.date) {
      return false;
    }

    // Check has:notes
    if (filters.hasNotes && !contact.notes?.trim()) {
      return false;
    }

    // Check text search
    if (filters.text.length > 0) {
      const searchableText = [
        contact.username,
        contact.displayName,
        contact.bio,
        contact.notes,
        ...(contact.tags || [])
      ].filter(Boolean).join(' ').toLowerCase();

      if (!filters.text.every(t => searchableText.includes(t))) {
        return false;
      }
    }

    return true;
  });
}

async function exportData() {
  const contacts = await getAllContacts();
  const interactions = await getAllInteractions();
  const lists = await getAllLists();

  return {
    version: 1,
    exportedAt: Date.now(),
    contacts,
    interactions: Object.values(interactions),
    lists,
  };
}

// ================================
// LISTS STORAGE
// ================================

const DEFAULT_LISTS = [
  { id: 'investors', name: 'Investors', color: '#10B981', createdAt: Date.now() },
  { id: 'customers', name: 'Customers', color: '#3B82F6', createdAt: Date.now() },
  { id: 'partners', name: 'Partners', color: '#8B5CF6', createdAt: Date.now() },
];

async function getAllLists() {
  const result = await chrome.storage.local.get('lists');
  return result.lists || [];
}

async function saveLists(lists) {
  await chrome.storage.local.set({ lists });
}

async function createList(name, color = '#F59E0B') {
  const lists = await getAllLists();
  const newList = {
    id: `list_${Date.now()}`,
    name,
    color,
    createdAt: Date.now(),
  };
  lists.push(newList);
  await saveLists(lists);
  return newList;
}

async function deleteList(listId) {
  const lists = await getAllLists();
  const filtered = lists.filter(l => l.id !== listId);
  await saveLists(filtered);

  // Remove list from all contacts
  const result = await chrome.storage.local.get('contacts');
  const contacts = result.contacts || {};
  for (const username in contacts) {
    if (contacts[username].listIds?.includes(listId)) {
      contacts[username].listIds = contacts[username].listIds.filter(id => id !== listId);
    }
  }
  await chrome.storage.local.set({ contacts });
}

async function addContactToList(username, listId) {
  const result = await chrome.storage.local.get('contacts');
  const contacts = result.contacts || {};
  if (contacts[username]) {
    const listIds = contacts[username].listIds || [];
    if (!listIds.includes(listId)) {
      contacts[username].listIds = [...listIds, listId];
      await chrome.storage.local.set({ contacts });
    }
  }
}

async function removeContactFromList(username, listId) {
  const result = await chrome.storage.local.get('contacts');
  const contacts = result.contacts || {};
  if (contacts[username]?.listIds) {
    contacts[username].listIds = contacts[username].listIds.filter(id => id !== listId);
    await chrome.storage.local.set({ contacts });
  }
}

// ================================
// REMINDERS STORAGE
// ================================

async function setReminder(username, date, note = '') {
  await updateContact(username, {
    reminder: {
      date: new Date(date).getTime(),
      note,
      createdAt: Date.now(),
    }
  });
}

async function clearReminder(username) {
  await updateContact(username, { reminder: null });
}

async function getUpcomingReminders(days = 7) {
  const contacts = await getAllContacts();
  const now = Date.now();
  const cutoff = now + (days * 24 * 60 * 60 * 1000);

  return contacts
    .filter(c => c.reminder?.date && c.reminder.date <= cutoff)
    .sort((a, b) => a.reminder.date - b.reminder.date);
}

async function getOverdueReminders() {
  const contacts = await getAllContacts();
  const now = Date.now();

  return contacts
    .filter(c => c.reminder?.date && c.reminder.date < now)
    .sort((a, b) => a.reminder.date - b.reminder.date);
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
  if (!timestamp) return false;
  const now = Date.now();
  const weekAgo = now - (7 * 24 * 60 * 60 * 1000);
  return timestamp >= weekAgo;
}

function timeAgo(timestamp) {
  if (!timestamp) return 'Never';
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 604800)}w ago`;

  return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function getRelationshipStrength(contact, interactions) {
  // Calculate based on recency and frequency of interactions
  const contactInteractions = Object.values(interactions).filter(i => i.username === contact.username);
  const now = Date.now();
  const weekAgo = now - (7 * 24 * 60 * 60 * 1000);
  const monthAgo = now - (30 * 24 * 60 * 60 * 1000);

  // Count recent interactions
  const thisWeek = contactInteractions.filter(i => i.timestamp >= weekAgo).length;
  const thisMonth = contactInteractions.filter(i => i.timestamp >= monthAgo).length;

  // Score: 0-100
  let score = 0;
  score += Math.min(thisWeek * 15, 45); // Up to 45 points for this week
  score += Math.min(thisMonth * 5, 30);  // Up to 30 points for this month
  score += contactInteractions.length > 0 ? 15 : 0; // 15 points for any history
  score += contact.notes ? 10 : 0; // 10 points for having notes

  return Math.min(score, 100);
}

function getStaleContacts(contacts, interactions, limit = 3) {
  const now = Date.now();
  const weekAgo = now - (7 * 24 * 60 * 60 * 1000);

  return contacts
    .filter(c => {
      // Has been saved for at least 2 days
      if (c.createdAt > now - (2 * 24 * 60 * 60 * 1000)) return false;
      // No recent interaction
      const lastInteraction = c.lastInteraction || 0;
      return lastInteraction < weekAgo;
    })
    .sort((a, b) => (a.lastInteraction || 0) - (b.lastInteraction || 0))
    .slice(0, limit);
}

function showToast(message, type = 'success') {
  // Remove existing toast
  const existing = document.querySelector('.flock-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `flock-toast flock-toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('flock-toast-hide');
    setTimeout(() => toast.remove(), 200);
  }, 2000);
}

// ================================
// ICONS
// ================================

const Icons = {
  like: `<svg viewBox="0 0 24 24" class="flock-activity-icon flock-icon-like"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor"/></svg>`,
  retweet: `<svg viewBox="0 0 24 24" class="flock-activity-icon flock-icon-retweet"><path d="M17 1l4 4-4 4M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 01-4 4H3" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/></svg>`,
  reply: `<svg viewBox="0 0 24 24" class="flock-activity-icon flock-icon-reply"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" stroke="currentColor" stroke-width="2" fill="none"/></svg>`,
  dm: `<svg viewBox="0 0 24 24" class="flock-activity-icon flock-icon-dm"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" stroke-width="2" fill="none"/><path d="M22 6l-10 7L2 6" stroke="currentColor" stroke-width="2" fill="none"/></svg>`,
  follow: `<svg viewBox="0 0 24 24" class="flock-activity-icon flock-icon-follow"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M12 7a4 4 0 11-8 0 4 4 0 018 0zM19 8v6M22 11h-6" stroke="currentColor" stroke-width="2" fill="none"/></svg>`,
  view: `<svg viewBox="0 0 24 24" class="flock-activity-icon flock-icon-view"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2" fill="none"/></svg>`,
  note: `<svg viewBox="0 0 24 24" class="flock-activity-icon flock-icon-note"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" stroke-width="2" fill="none"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" stroke-width="2" fill="none"/></svg>`,
  quote: `<svg viewBox="0 0 24 24" class="flock-activity-icon flock-icon-quote"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21zM15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v4z" stroke="currentColor" stroke-width="2" fill="none"/></svg>`,
  external: `<svg viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`,
  back: `<svg viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`,
  bookmark: `<svg viewBox="0 0 24 24" class="flock-activity-icon flock-icon-bookmark"><path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" stroke="currentColor" stroke-width="2" fill="none"/></svg>`,
  list: `<svg viewBox="0 0 24 24"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`,
  calendar: `<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2" fill="none"/><path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/></svg>`,
  bell: `<svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`,
  tag: `<svg viewBox="0 0 24 24"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/><circle cx="7" cy="7" r="1" fill="currentColor"/></svg>`,
  sparkle: `<svg viewBox="0 0 24 24"><path d="M12 2L14 8L20 10L14 12L12 18L10 12L4 10L10 8L12 2Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round" fill="none"/></svg>`,
  plus: `<svg viewBox="0 0 24 24"><path d="M12 5v14m-7-7h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/></svg>`,
  check: `<svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`,
  close: `<svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/></svg>`,
};

// ================================
// UI RENDERING
// ================================

function renderContactCard(contact, interactions = {}) {
  const contactInteractions = Object.values(interactions).filter(i => i.username === contact.username);
  const lastInteraction = contactInteractions.length > 0
    ? Math.max(...contactInteractions.map(i => i.timestamp))
    : contact.lastInteraction;
  const strength = getRelationshipStrength(contact, interactions);
  const strengthClass = strength >= 60 ? 'strong' : strength >= 30 ? 'medium' : 'weak';

  return `
    <div class="flock-contact-card ${bulkSelectMode ? 'flock-bulk-mode' : ''} ${selectedContacts.has(contact.username) ? 'flock-selected' : ''}" data-username="${escapeHtml(contact.username)}">
      ${bulkSelectMode ? `
        <label class="flock-bulk-checkbox-wrap">
          <input type="checkbox" class="flock-bulk-checkbox" ${selectedContacts.has(contact.username) ? 'checked' : ''}>
          <span class="flock-checkbox-custom"></span>
        </label>
      ` : ''}
      <div class="flock-avatar-wrap">
        <img
          class="flock-contact-avatar"
          src="${escapeHtml(contact.profileImageUrl || '')}"
          alt="${escapeHtml(contact.displayName)}"
          onerror="this.style.display='none'"
        >
        <div class="flock-strength-ring flock-strength-${strengthClass}" title="Relationship: ${strength}%">
          <svg viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" stroke-opacity="0.2" stroke-width="3"/>
            <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" stroke-width="3"
              stroke-dasharray="${strength} 100" stroke-linecap="round" transform="rotate(-90 18 18)"/>
          </svg>
        </div>
      </div>
      <div class="flock-contact-info">
        <div class="flock-contact-name">${escapeHtml(contact.displayName || contact.username)}</div>
        <div class="flock-contact-username">@${escapeHtml(contact.username)}</div>
        <div class="flock-contact-meta">
          <div class="flock-stage-quick" data-username="${escapeHtml(contact.username)}">
            <span class="flock-contact-stage stage-${contact.pipelineStage || 'new'}">
              ${contact.pipelineStage || 'new'}
            </span>
            <svg class="flock-stage-chevron" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" fill="none"/></svg>
            <div class="flock-stage-dropdown">
              ${['new', 'contacted', 'engaged', 'qualified', 'won', 'lost'].map(stage => `
                <button class="flock-stage-option ${stage === (contact.pipelineStage || 'new') ? 'active' : ''}" data-stage="${stage}">${stage}</button>
              `).join('')}
            </div>
          </div>
          ${lastInteraction ? `<span class="flock-contact-time">${timeAgo(lastInteraction)}</span>` : ''}
        </div>
      </div>
      <div class="flock-contact-actions">
        <button class="flock-contact-action flock-action-twitter" title="Open on Twitter" data-action="twitter" data-username="${escapeHtml(contact.username)}">
          ${Icons.external}
        </button>
      </div>
    </div>
  `;
}

function renderSuggestions(contacts, interactions) {
  const container = document.getElementById('suggestionsBar');
  if (!container) return;

  const staleContacts = getStaleContacts(contacts, interactions, 3);

  if (staleContacts.length === 0) {
    container.style.display = 'none';
    return;
  }

  container.style.display = 'block';
  container.innerHTML = `
    <div class="flock-suggestions">
      <div class="flock-suggestions-header">
        <span class="flock-suggestions-icon">💭</span>
        <span>Reconnect with</span>
      </div>
      <div class="flock-suggestions-list">
        ${staleContacts.map(c => `
          <button class="flock-suggestion-chip" data-username="${escapeHtml(c.username)}">
            <img src="${escapeHtml(c.profileImageUrl || '')}" onerror="this.style.display='none'">
            <span>${escapeHtml(c.displayName || c.username)}</span>
          </button>
        `).join('')}
      </div>
    </div>
  `;

  // Add click handlers
  container.querySelectorAll('.flock-suggestion-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const username = chip.dataset.username;
      openTwitterProfile(username);
    });
  });
}

function renderContactList(contacts, interactions = {}) {
  const container = document.getElementById('contactList');
  const emptyState = document.getElementById('emptyState');
  const loadingState = document.getElementById('loadingState');
  const filterBar = document.getElementById('filterBar');

  loadingState.style.display = 'none';

  if (contacts.length === 0 && allContacts.length === 0) {
    container.style.display = 'none';
    filterBar.style.display = 'none';
    emptyState.style.display = 'flex';
    return;
  }

  if (contacts.length === 0) {
    container.innerHTML = `
      <div class="flock-no-results">
        <p>No contacts match your filters</p>
        <button class="flock-clear-filters" id="clearFilters">Clear filters</button>
      </div>
    `;
    container.style.display = 'flex';
    document.getElementById('clearFilters')?.addEventListener('click', () => {
      document.getElementById('stageFilter').value = '';
      document.getElementById('sortBy').value = 'recent';
      applyFiltersAndSort();
    });
    return;
  }

  emptyState.style.display = 'none';
  filterBar.style.display = 'flex';
  container.style.display = 'flex';
  container.innerHTML = contacts.map(c => renderContactCard(c, interactions)).join('');

  // Add click handlers for cards
  container.querySelectorAll('.flock-contact-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.flock-contact-action') || e.target.closest('.flock-stage-quick')) return;
      const username = card.dataset.username;
      showContactDetail(username);
    });
  });

  // Quick stage dropdown handlers
  container.querySelectorAll('.flock-stage-quick').forEach(quick => {
    quick.addEventListener('click', (e) => {
      e.stopPropagation();
      // Close other dropdowns
      container.querySelectorAll('.flock-stage-quick.open').forEach(other => {
        if (other !== quick) other.classList.remove('open');
      });
      quick.classList.toggle('open');
    });
  });

  // Stage option handlers
  container.querySelectorAll('.flock-stage-option').forEach(option => {
    option.addEventListener('click', async (e) => {
      e.stopPropagation();
      const stage = option.dataset.stage;
      const quick = option.closest('.flock-stage-quick');
      const username = quick.dataset.username;

      await updateContact(username, { pipelineStage: stage });
      quick.classList.remove('open');

      // Update the display
      const stageSpan = quick.querySelector('.flock-contact-stage');
      stageSpan.className = `flock-contact-stage stage-${stage}`;
      stageSpan.textContent = stage;

      // Update active state
      quick.querySelectorAll('.flock-stage-option').forEach(opt => {
        opt.classList.toggle('active', opt.dataset.stage === stage);
      });

      // Refresh data
      allContacts = await getAllContacts();
      updateStats(allContacts);
      showToast(`Moved to ${stage}`);
    });
  });

  // Twitter button handlers
  container.querySelectorAll('.flock-contact-action[data-action="twitter"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const username = btn.dataset.username;
      openTwitterProfile(username);
    });
  });

  // Close dropdowns when clicking elsewhere
  document.addEventListener('click', () => {
    container.querySelectorAll('.flock-stage-quick.open').forEach(quick => {
      quick.classList.remove('open');
    });
  }, { once: true });
}

async function showContactDetail(username) {
  const contact = await getContact(username);
  if (!contact) return;

  const interactions = await getAllInteractions();
  const contactInteractions = Object.values(interactions)
    .filter(i => i.username === username)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 10);

  const lists = await getAllLists();
  const contactLists = lists.filter(l => contact.listIds?.includes(l.id));

  const panel = document.getElementById('detailPanel');
  const contactList = document.getElementById('contactList');
  const filterBar = document.getElementById('filterBar');

  panel.innerHTML = `
    <div class="flock-detail-header">
      <button class="flock-back-btn" id="backBtn">${Icons.back} Back</button>
      <button class="flock-open-profile" data-username="${escapeHtml(username)}">${Icons.external}</button>
    </div>
    <div class="flock-detail-profile">
      <img
        class="flock-detail-avatar"
        src="${escapeHtml(contact.profileImageUrl || '')}"
        alt="${escapeHtml(contact.displayName)}"
        onerror="this.style.display='none'"
      >
      <div class="flock-detail-info">
        <h2 class="flock-detail-name">${escapeHtml(contact.displayName || contact.username)}</h2>
        <p class="flock-detail-username">@${escapeHtml(contact.username)}</p>
        <div class="flock-detail-stats">
          <span>${formatCount(contact.followersCount)} followers</span>
          <span>${formatCount(contact.followingCount)} following</span>
        </div>
      </div>
    </div>
    ${contact.bio ? `<p class="flock-detail-bio">${escapeHtml(contact.bio)}</p>` : ''}
    <div class="flock-detail-section">
      <h3>Pipeline Stage</h3>
      <div class="flock-stage-pills">
        ${['new', 'contacted', 'engaged', 'qualified', 'won', 'lost'].map(stage => `
          <button class="flock-stage-pill ${stage === (contact.pipelineStage || 'new') ? 'active' : ''}" data-stage="${stage}">
            ${stage}
          </button>
        `).join('')}
      </div>
    </div>
    <div class="flock-detail-section">
      <h3>Lists</h3>
      <div class="flock-detail-lists">
        ${contactLists.map(list => `
          <span class="flock-detail-list-badge" style="--list-color: ${escapeHtml(list.color)}" data-list-id="${escapeHtml(list.id)}">
            ${escapeHtml(list.name)}
            <button class="flock-detail-list-remove" data-list-id="${escapeHtml(list.id)}">&times;</button>
          </span>
        `).join('')}
        <button class="flock-detail-add-list" id="addToListBtn">${Icons.plus} Add to list</button>
      </div>
    </div>
    <div class="flock-detail-section">
      <h3>Reminder</h3>
      <div class="flock-detail-reminder">
        ${contact.reminder ? `
          <div class="flock-detail-reminder-info">
            <span class="flock-reminder-date-badge ${new Date(contact.reminder.date) < new Date() ? 'overdue' : ''}">
              ${Icons.bell}
              ${formatReminderDate(contact.reminder.date)}
            </span>
            <span class="flock-detail-reminder-note">${escapeHtml(contact.reminder.note || 'Follow up')}</span>
            <button class="flock-detail-reminder-clear" id="clearReminderBtn">&times;</button>
          </div>
        ` : `
          <button class="flock-detail-set-reminder" id="setReminderBtn">
            ${Icons.calendar} Set reminder
          </button>
        `}
      </div>
    </div>
    <div class="flock-detail-section">
      <h3>Tags</h3>
      <div class="flock-detail-tags">
        <div class="flock-tag-list">
          ${(contact.tags || []).map(tag => `
            <span class="flock-tag flock-tag-removable">
              ${escapeHtml(tag)}
              <button class="flock-tag-remove" data-tag="${escapeHtml(tag)}">&times;</button>
            </span>
          `).join('')}
          <button class="flock-tag-add" id="addTagBtn">${Icons.plus}</button>
        </div>
        <button class="flock-suggest-tags-btn" id="suggestTagsBtn">
          ${Icons.sparkle}
          <span>AI Suggest</span>
        </button>
      </div>
      <div class="flock-tag-suggestions" id="tagSuggestions" style="display: none;"></div>
    </div>
    ${contact.notes ? `
      <div class="flock-detail-section">
        <h3>Notes</h3>
        <p class="flock-detail-notes">${escapeHtml(contact.notes)}</p>
      </div>
    ` : ''}
    <div class="flock-detail-section">
      <h3>Recent Activity</h3>
      ${contactInteractions.length > 0 ? `
        <div class="flock-mini-activity">
          ${contactInteractions.map(i => `
            <div class="flock-mini-activity-item">
              ${Icons[i.type] || Icons.note}
              <span class="flock-mini-activity-text">${escapeHtml(i.description)}</span>
              <span class="flock-mini-activity-time">${timeAgo(i.timestamp)}</span>
            </div>
          `).join('')}
        </div>
      ` : '<p class="flock-no-activity">No recorded interactions yet</p>'}
    </div>
    <div class="flock-detail-meta">
      Added ${new Date(contact.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
    </div>
  `;

  contactList.style.display = 'none';
  filterBar.style.display = 'none';
  panel.style.display = 'block';

  // Event handlers
  document.getElementById('backBtn').addEventListener('click', hideContactDetail);
  panel.querySelector('.flock-open-profile').addEventListener('click', () => openTwitterProfile(username));

  // Stage pill handlers
  panel.querySelectorAll('.flock-stage-pill').forEach(pill => {
    pill.addEventListener('click', async () => {
      const stage = pill.dataset.stage;
      await updateContact(username, { pipelineStage: stage });

      // Update UI
      panel.querySelectorAll('.flock-stage-pill').forEach(p => {
        p.classList.toggle('active', p.dataset.stage === stage);
      });

      // Refresh data
      allContacts = await getAllContacts();
      updateStats(allContacts);
      showToast(`Moved to ${stage}`);
    });
  });

  // Add to list handler
  document.getElementById('addToListBtn')?.addEventListener('click', () => showAddToListModal(username, contact.listIds || []));

  // Remove from list handlers
  panel.querySelectorAll('.flock-detail-list-remove').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const listId = btn.dataset.listId;
      await removeContactFromList(username, listId);
      allContacts = await getAllContacts();
      showToast('Removed from list');
      showContactDetail(username);
    });
  });

  // Reminder handlers
  document.getElementById('setReminderBtn')?.addEventListener('click', () => showSetReminderModal(username));
  document.getElementById('clearReminderBtn')?.addEventListener('click', async () => {
    await clearReminder(username);
    allContacts = await getAllContacts();
    showToast('Reminder cleared');
    showContactDetail(username);
  });

  // Tag handlers
  document.getElementById('addTagBtn')?.addEventListener('click', () => showAddTagModal(username));

  panel.querySelectorAll('.flock-tag-remove').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const tag = btn.dataset.tag;
      await removeTagFromContact(username, tag);
      allContacts = await getAllContacts();
      showToast('Tag removed');
      showContactDetail(username);
    });
  });

  // AI suggest tags
  document.getElementById('suggestTagsBtn')?.addEventListener('click', async () => {
    const btn = document.getElementById('suggestTagsBtn');
    const suggestionsContainer = document.getElementById('tagSuggestions');

    btn.disabled = true;
    btn.innerHTML = `<span class="flock-spinner-sm"></span> <span>Thinking...</span>`;

    const result = await suggestTags(contact);

    if (result.success) {
      const existingTags = contact.tags || [];
      const newSuggestions = result.tags.filter(t => !existingTags.includes(t));

      if (newSuggestions.length === 0) {
        suggestionsContainer.innerHTML = '<p class="flock-suggestions-empty">No new tag suggestions</p>';
      } else {
        suggestionsContainer.innerHTML = `
          <p class="flock-suggestions-label">Suggested tags:</p>
          <div class="flock-suggested-tags">
            ${newSuggestions.map(tag => `
              <button class="flock-suggested-tag" data-tag="${escapeHtml(tag)}">
                ${Icons.plus}
                ${escapeHtml(tag)}
              </button>
            `).join('')}
          </div>
        `;

        suggestionsContainer.querySelectorAll('.flock-suggested-tag').forEach(tagBtn => {
          tagBtn.addEventListener('click', async () => {
            const tag = tagBtn.dataset.tag;
            await addTagToContact(username, tag);
            allContacts = await getAllContacts();
            showToast(`Added "${tag}" tag`);
            showContactDetail(username);
          });
        });
      }
      suggestionsContainer.style.display = 'block';
    } else {
      showToast(result.error, 'error');
    }

    btn.disabled = false;
    btn.innerHTML = `${Icons.sparkle} <span>AI Suggest</span>`;
  });
}

function showAddTagModal(username) {
  const overlay = document.createElement('div');
  overlay.className = 'flock-modal-overlay';
  overlay.id = 'addTagModal';
  overlay.innerHTML = `
    <div class="flock-modal flock-modal-sm">
      <div class="flock-modal-header">
        <h3>Add Tag</h3>
        <button class="flock-modal-close" id="closeAddTag">&times;</button>
      </div>
      <div class="flock-modal-body">
        <input type="text" class="flock-form-input" id="newTagInput" placeholder="e.g., investor, tech, friend" autofocus>
        <button class="flock-btn flock-btn-primary" id="saveTagBtn" style="margin-top: 12px;">Add Tag</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const closeModal = () => overlay.remove();
  document.getElementById('closeAddTag').addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  const saveTag = async () => {
    const input = document.getElementById('newTagInput');
    const tag = input.value.trim().toLowerCase().replace(/\s+/g, '-');

    if (!tag) {
      showToast('Please enter a tag', 'error');
      return;
    }

    await addTagToContact(username, tag);
    allContacts = await getAllContacts();
    closeModal();
    showToast(`Added "${tag}" tag`);
    showContactDetail(username);
  };

  document.getElementById('saveTagBtn').addEventListener('click', saveTag);
  document.getElementById('newTagInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveTag();
  });
}

async function showAddToListModal(username, currentListIds) {
  // Load lists if not already loaded
  if (allLists.length === 0) {
    allLists = await getAllLists();
    if (allLists.length === 0) {
      await saveLists(DEFAULT_LISTS);
      allLists = DEFAULT_LISTS;
    }
  }

  const availableLists = allLists.filter(l => !currentListIds.includes(l.id));

  if (availableLists.length === 0) {
    showToast('Already in all lists', 'error');
    return;
  }

  const overlay = document.createElement('div');
  overlay.className = 'flock-modal-overlay';
  overlay.id = 'addToListModal';
  overlay.innerHTML = `
    <div class="flock-modal flock-modal-sm">
      <div class="flock-modal-header">
        <h3>Add to List</h3>
        <button class="flock-modal-close" id="closeAddToList">&times;</button>
      </div>
      <div class="flock-modal-body flock-modal-list-picker">
        ${availableLists.map(list => `
          <button class="flock-list-pick-option" data-list-id="${escapeHtml(list.id)}">
            <span class="flock-list-pick-color" style="background: ${escapeHtml(list.color)}"></span>
            <span>${escapeHtml(list.name)}</span>
          </button>
        `).join('')}
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const closeModal = () => overlay.remove();
  document.getElementById('closeAddToList').addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  overlay.querySelectorAll('.flock-list-pick-option').forEach(btn => {
    btn.addEventListener('click', async () => {
      const listId = btn.dataset.listId;
      await addContactToList(username, listId);
      allContacts = await getAllContacts();
      closeModal();
      showToast('Added to list');
      showContactDetail(username);
    });
  });
}

function showSetReminderModal(username) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDate = tomorrow.toISOString().split('T')[0];

  const overlay = document.createElement('div');
  overlay.className = 'flock-modal-overlay';
  overlay.id = 'setReminderModal';
  overlay.innerHTML = `
    <div class="flock-modal">
      <div class="flock-modal-header">
        <h3>Set Reminder</h3>
        <button class="flock-modal-close" id="closeSetReminder">&times;</button>
      </div>
      <div class="flock-modal-body">
        <div class="flock-form-group">
          <label class="flock-form-label">Date</label>
          <input type="date" class="flock-form-input" id="reminderDate" value="${defaultDate}" min="${defaultDate}">
        </div>
        <div class="flock-form-group">
          <label class="flock-form-label">Note (optional)</label>
          <input type="text" class="flock-form-input" id="reminderNote" placeholder="e.g., Follow up on proposal">
        </div>
        <button class="flock-btn flock-btn-primary" id="saveReminderBtn">Set Reminder</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const closeModal = () => overlay.remove();
  document.getElementById('closeSetReminder').addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  document.getElementById('saveReminderBtn').addEventListener('click', async () => {
    const date = document.getElementById('reminderDate').value;
    const note = document.getElementById('reminderNote').value.trim();

    if (!date) {
      showToast('Please select a date', 'error');
      return;
    }

    await setReminder(username, date, note);
    allContacts = await getAllContacts();
    closeModal();
    showToast('Reminder set');
    showContactDetail(username);
  });
}

function hideContactDetail() {
  const panel = document.getElementById('detailPanel');
  const contactList = document.getElementById('contactList');
  const filterBar = document.getElementById('filterBar');

  panel.style.display = 'none';
  contactList.style.display = 'flex';
  filterBar.style.display = 'flex';
}

async function renderActivityFeed() {
  const container = document.getElementById('activityFeed');
  const interactions = await getAllInteractions();
  const contacts = await getAllContacts();
  const contactMap = Object.fromEntries(contacts.map(c => [c.username, c]));

  const sortedInteractions = Object.values(interactions)
    .filter(i => contactMap[i.username])
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 30);

  if (sortedInteractions.length === 0) {
    container.innerHTML = `
      <div class="flock-activity-empty">
        <p>No activity yet</p>
        <p class="flock-activity-hint">Interactions with saved contacts will appear here</p>
      </div>
    `;
    return;
  }

  container.innerHTML = sortedInteractions.map(interaction => {
    const contact = contactMap[interaction.username];
    return `
      <div class="flock-activity-item" data-username="${escapeHtml(interaction.username)}">
        <img
          class="flock-activity-avatar"
          src="${escapeHtml(contact?.profileImageUrl || '')}"
          alt="${escapeHtml(contact?.displayName || interaction.username)}"
          onerror="this.style.display='none'"
        >
        <div class="flock-activity-content">
          <div class="flock-activity-header">
            ${Icons[interaction.type] || Icons.note}
            <span class="flock-activity-name">${escapeHtml(contact?.displayName || interaction.username)}</span>
          </div>
          <p class="flock-activity-desc">${escapeHtml(interaction.description)}</p>
          <span class="flock-activity-time">${timeAgo(interaction.timestamp)}</span>
        </div>
      </div>
    `;
  }).join('');

  // Click handlers
  container.querySelectorAll('.flock-activity-item').forEach(item => {
    item.addEventListener('click', () => {
      const username = item.dataset.username;
      showContactDetail(username);
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
          <div class="flock-pipeline-item" data-username="${escapeHtml(contact.username)}">
            <img
              class="flock-pipeline-avatar"
              src="${escapeHtml(contact.profileImageUrl || '')}"
              alt="${escapeHtml(contact.displayName)}"
              onerror="this.style.display='none'"
            >
            <span class="flock-pipeline-name">${escapeHtml(contact.displayName || contact.username)}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');

  // Add click handlers
  container.querySelectorAll('.flock-pipeline-item').forEach(item => {
    item.addEventListener('click', () => {
      const username = item.dataset.username;
      showContactDetail(username);
    });
  });
}

// ================================
// ANALYTICS VIEW
// ================================

async function renderAnalyticsView() {
  const container = document.getElementById('analyticsView');
  const contacts = allContacts;
  const interactions = allInteractions;

  // Calculate metrics
  const metrics = calculateAnalyticsMetrics(contacts, interactions);

  // Determine health status text and class
  const healthStatus = metrics.overallHealth >= 70 ? 'OPTIMAL' :
                       metrics.overallHealth >= 40 ? 'MODERATE' : 'CRITICAL';
  const healthClass = metrics.overallHealth >= 70 ? 'optimal' :
                      metrics.overallHealth >= 40 ? 'moderate' : 'critical';

  container.innerHTML = `
    <div class="mc-dashboard">
      <!-- Mission Control Header -->
      <div class="mc-header">
        <div class="mc-header-left">
          <span class="mc-label">FLOCK ANALYTICS</span>
          <span class="mc-timestamp">${new Date().toLocaleTimeString('en-US', { hour12: false })}</span>
        </div>
        <div class="mc-header-right">
          <span class="mc-status mc-status-${healthClass}">${healthStatus}</span>
        </div>
      </div>

      <!-- Primary Metrics Row -->
      <div class="mc-primary-row">
        <!-- Health Gauge -->
        <div class="mc-gauge-container">
          <div class="mc-gauge">
            <svg viewBox="0 0 100 100" class="mc-gauge-svg">
              <circle cx="50" cy="50" r="42" class="mc-gauge-bg"/>
              <circle cx="50" cy="50" r="42" class="mc-gauge-fill mc-gauge-${healthClass}"
                      style="stroke-dasharray: ${metrics.overallHealth * 2.64} 264"/>
              <circle cx="50" cy="50" r="32" class="mc-gauge-inner"/>
            </svg>
            <div class="mc-gauge-value">
              <span class="mc-gauge-number">${metrics.overallHealth}</span>
              <span class="mc-gauge-unit">%</span>
            </div>
            <div class="mc-gauge-pulse mc-pulse-${healthClass}"></div>
          </div>
          <div class="mc-gauge-label">HEALTH INDEX</div>
        </div>

        <!-- Quick Stats -->
        <div class="mc-stats-grid">
          <div class="mc-stat">
            <span class="mc-stat-value mc-stat-success">${metrics.healthBreakdown.strong}</span>
            <span class="mc-stat-label">STRONG</span>
          </div>
          <div class="mc-stat">
            <span class="mc-stat-value mc-stat-warning">${metrics.healthBreakdown.medium}</span>
            <span class="mc-stat-label">MEDIUM</span>
          </div>
          <div class="mc-stat">
            <span class="mc-stat-value mc-stat-danger">${metrics.healthBreakdown.weak}</span>
            <span class="mc-stat-label">WEAK</span>
          </div>
          <div class="mc-stat mc-stat-highlight">
            <span class="mc-stat-value ${metrics.growthTrend >= 0 ? 'mc-stat-success' : 'mc-stat-danger'}">
              ${metrics.growthTrend >= 0 ? '+' : ''}${metrics.growthTrend}
            </span>
            <span class="mc-stat-label">30D GROWTH</span>
          </div>
        </div>
      </div>

      <!-- Pipeline Section -->
      <div class="mc-section">
        <div class="mc-section-header">
          <span class="mc-section-title">PIPELINE</span>
          <span class="mc-section-total">${contacts.length} CONTACTS</span>
        </div>
        <div class="mc-pipeline">
          ${Object.entries(metrics.stageDistribution).map(([stage, count], i) => {
            const pct = contacts.length > 0 ? (count / contacts.length * 100) : 0;
            return `
              <div class="mc-pipe-row" style="animation-delay: ${i * 50}ms">
                <span class="mc-pipe-label">${stage.toUpperCase()}</span>
                <div class="mc-pipe-track">
                  <div class="mc-pipe-fill mc-pipe-${stage}" style="--target-width: ${pct}%"></div>
                  <div class="mc-pipe-glow mc-pipe-${stage}"></div>
                </div>
                <span class="mc-pipe-value">${count}</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Activity Timeline -->
      <div class="mc-section">
        <div class="mc-section-header">
          <span class="mc-section-title">ACTIVITY · 7 DAYS</span>
        </div>
        <div class="mc-timeline">
          ${metrics.activityByDay.map((day, i) => {
            const level = getActivityLevel(day.count);
            const height = day.count === 0 ? 4 : Math.min(32, 8 + day.count * 6);
            return `
              <div class="mc-timeline-bar" style="animation-delay: ${i * 60}ms">
                <div class="mc-bar-fill ${level}" style="height: ${height}px"></div>
                <span class="mc-bar-label">${day.shortName}</span>
                <span class="mc-bar-count">${day.count}</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Tags & Attention Split -->
      <div class="mc-split-row">
        <!-- Tags -->
        <div class="mc-mini-section">
          <div class="mc-section-header">
            <span class="mc-section-title">TOP TAGS</span>
          </div>
          <div class="mc-tags">
            ${metrics.topTags.length > 0 ? metrics.topTags.slice(0, 4).map((tag, i) => `
              <div class="mc-tag" style="animation-delay: ${i * 40}ms">
                <span class="mc-tag-name">${escapeHtml(tag.name)}</span>
                <span class="mc-tag-count">${tag.count}</span>
              </div>
            `).join('') : '<div class="mc-empty">No tags</div>'}
          </div>
        </div>

        <!-- Attention -->
        <div class="mc-mini-section">
          <div class="mc-section-header">
            <span class="mc-section-title">ATTENTION</span>
            ${metrics.needsAttention.length > 0 ? `<span class="mc-alert-badge">${metrics.needsAttention.length}</span>` : ''}
          </div>
          <div class="mc-attention">
            ${metrics.needsAttention.length > 0 ? metrics.needsAttention.slice(0, 3).map((contact, i) => `
              <div class="mc-attention-row" data-username="${escapeHtml(contact.username)}" style="animation-delay: ${i * 40}ms">
                <img class="mc-attention-avatar" src="${escapeHtml(contact.profileImageUrl || '')}" alt="" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22><circle cx=%2212%22 cy=%228%22 r=%224%22 fill=%22%23536471%22/><path d=%22M4 20c0-4 4-6 8-6s8 2 8 6%22 fill=%22%23536471%22/></svg>'">
                <span class="mc-attention-name">${escapeHtml(contact.displayName || contact.username)}</span>
              </div>
            `).join('') : '<div class="mc-empty">All clear</div>'}
          </div>
        </div>
      </div>

      <!-- Scanline overlay for that terminal feel -->
      <div class="mc-scanlines"></div>
    </div>
  `;

  // Add click handlers for attention items
  container.querySelectorAll('.mc-attention-row').forEach(item => {
    item.addEventListener('click', () => {
      showContactDetail(item.dataset.username);
    });
  });

  // Trigger animations
  requestAnimationFrame(() => {
    container.querySelectorAll('.mc-pipe-fill').forEach(el => {
      el.style.width = el.style.getPropertyValue('--target-width');
    });
  });
}

function calculateAnalyticsMetrics(contacts, interactions) {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  // Health breakdown
  const healthBreakdown = { strong: 0, medium: 0, weak: 0 };
  let totalHealth = 0;

  contacts.forEach(contact => {
    const strength = getRelationshipStrength(contact, interactions);
    totalHealth += strength;
    if (strength >= 60) healthBreakdown.strong++;
    else if (strength >= 30) healthBreakdown.medium++;
    else healthBreakdown.weak++;
  });

  const overallHealth = contacts.length > 0 ? Math.round(totalHealth / contacts.length) : 0;

  // Growth data (last 30 days)
  const growthData = [];
  for (let i = 29; i >= 0; i--) {
    const dayStart = now - (i * dayMs);
    const dayEnd = dayStart + dayMs;
    const count = contacts.filter(c => c.createdAt >= dayStart && c.createdAt < dayEnd).length;
    growthData.push(count);
  }
  const growthTrend = contacts.filter(c => c.createdAt >= now - (30 * dayMs)).length;

  // Stage distribution
  const stages = ['new', 'contacted', 'engaged', 'qualified', 'won', 'lost'];
  const stageDistribution = {};
  stages.forEach(stage => {
    stageDistribution[stage] = contacts.filter(c => (c.pipelineStage || 'new') === stage).length;
  });

  // Activity by day (last 7 days)
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const shortNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const activityByDay = [];

  for (let i = 6; i >= 0; i--) {
    const dayStart = new Date(now - (i * dayMs));
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = dayStart.getTime() + dayMs;

    const count = Object.values(interactions).filter(int =>
      int.timestamp >= dayStart.getTime() && int.timestamp < dayEnd
    ).length;

    activityByDay.push({
      name: dayNames[dayStart.getDay()],
      shortName: shortNames[dayStart.getDay()],
      count
    });
  }

  // Top tags
  const tagCounts = {};
  contacts.forEach(contact => {
    (contact.tags || []).forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });
  const topTags = Object.entries(tagCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Contacts needing attention
  const needsAttention = contacts
    .map(contact => {
      const daysSinceInteraction = contact.lastInteraction
        ? Math.floor((now - contact.lastInteraction) / dayMs)
        : Infinity;

      let attentionReason = null;
      if (daysSinceInteraction >= 30) {
        attentionReason = `No contact in ${daysSinceInteraction} days`;
      } else if (contact.reminder?.date && contact.reminder.date < now) {
        attentionReason = 'Overdue reminder';
      } else if (daysSinceInteraction >= 14) {
        attentionReason = `${daysSinceInteraction} days since last contact`;
      }

      return attentionReason ? { ...contact, attentionReason } : null;
    })
    .filter(Boolean)
    .sort((a, b) => {
      // Prioritize overdue reminders
      if (a.attentionReason.includes('Overdue')) return -1;
      if (b.attentionReason.includes('Overdue')) return 1;
      return 0;
    });

  return {
    overallHealth,
    healthBreakdown,
    growthData,
    growthTrend,
    stageDistribution,
    activityByDay,
    topTags,
    needsAttention
  };
}

function renderGrowthChart(data) {
  const max = Math.max(...data, 1);
  const width = 100 / data.length;

  return `
    <svg class="flock-growth-svg" viewBox="0 0 100 40" preserveAspectRatio="none">
      ${data.map((value, i) => {
        const height = (value / max) * 35;
        const x = i * width;
        return `<rect x="${x}" y="${40 - height}" width="${width - 0.5}" height="${height}" fill="currentColor" opacity="${0.3 + (i / data.length) * 0.7}"/>`;
      }).join('')}
    </svg>
  `;
}

function getActivityLevel(count) {
  if (count === 0) return 'activity-none';
  if (count <= 2) return 'activity-low';
  if (count <= 5) return 'activity-medium';
  return 'activity-high';
}

// ================================
// NETWORK GRAPH VIEW
// ================================

let networkState = {
  nodes: [],
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
  dragging: null,
  panning: false,
  panStart: { x: 0, y: 0 },
  hoveredNode: null,
  imageCache: new Map()
};

async function renderNetworkView() {
  const canvas = document.getElementById('networkCanvas');
  const ctx = canvas.getContext('2d');
  const container = document.getElementById('networkView');

  // Set canvas size
  const rect = container.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height - 36; // Subtract controls height

  // Build nodes from contacts
  await buildNetworkNodes();

  // Setup event listeners
  setupNetworkInteractions(canvas, ctx);

  // Render legend
  renderNetworkLegend();

  // Initial render
  renderNetwork(canvas, ctx);

  // Animate
  animateNetwork(canvas, ctx);
}

async function buildNetworkNodes() {
  const contacts = allContacts;
  const lists = await getAllLists();

  networkState.nodes = contacts.map((contact, i) => {
    const angle = (i / contacts.length) * Math.PI * 2;
    const radius = 120 + Math.random() * 60;

    return {
      id: contact.username,
      contact,
      x: 200 + Math.cos(angle) * radius,
      y: 200 + Math.sin(angle) * radius,
      vx: 0,
      vy: 0,
      radius: getNodeRadius(contact),
      color: getNodeColor(contact, lists),
      image: null
    };
  });

  // Preload images
  networkState.nodes.forEach(node => {
    if (node.contact.profileImageUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        networkState.imageCache.set(node.id, img);
      };
      img.src = node.contact.profileImageUrl;
    }
  });
}

function getNodeRadius(contact) {
  const base = 18;
  const strength = getRelationshipStrength(contact, allInteractions);
  return base + (strength / 100) * 10;
}

function getNodeColor(contact, lists) {
  // Color by primary list if available
  if (contact.listIds && contact.listIds.length > 0) {
    const list = lists.find(l => l.id === contact.listIds[0]);
    if (list) return list.color;
  }

  // Otherwise color by stage
  const stageColors = {
    new: '#71767B',
    contacted: '#3B82F6',
    engaged: '#8B5CF6',
    qualified: '#F59E0B',
    won: '#10B981',
    lost: '#EF4444'
  };

  return stageColors[contact.pipelineStage] || stageColors.new;
}

function setupNetworkInteractions(canvas, ctx) {
  const tooltip = document.getElementById('networkTooltip');

  canvas.onmousedown = (e) => {
    const { x, y } = getCanvasCoords(e, canvas);
    const node = findNodeAt(x, y);

    if (node) {
      networkState.dragging = node;
    } else {
      networkState.panning = true;
      networkState.panStart = { x: e.clientX, y: e.clientY };
    }
  };

  canvas.onmousemove = (e) => {
    const { x, y } = getCanvasCoords(e, canvas);

    if (networkState.dragging) {
      networkState.dragging.x = x;
      networkState.dragging.y = y;
      networkState.dragging.vx = 0;
      networkState.dragging.vy = 0;
    } else if (networkState.panning) {
      const dx = e.clientX - networkState.panStart.x;
      const dy = e.clientY - networkState.panStart.y;
      networkState.offsetX += dx;
      networkState.offsetY += dy;
      networkState.panStart = { x: e.clientX, y: e.clientY };
    } else {
      const node = findNodeAt(x, y);
      networkState.hoveredNode = node;

      if (node) {
        canvas.style.cursor = 'pointer';
        tooltip.innerHTML = `
          <strong>${escapeHtml(node.contact.displayName || node.contact.username)}</strong>
          <span>@${escapeHtml(node.contact.username)}</span>
          ${node.contact.pipelineStage ? `<span class="stage-${node.contact.pipelineStage}">${node.contact.pipelineStage}</span>` : ''}
        `;
        tooltip.style.display = 'block';
        tooltip.style.left = `${e.clientX - canvas.offsetLeft + 10}px`;
        tooltip.style.top = `${e.clientY - canvas.offsetTop + 10}px`;
      } else {
        canvas.style.cursor = 'grab';
        tooltip.style.display = 'none';
      }
    }
  };

  canvas.onmouseup = () => {
    networkState.dragging = null;
    networkState.panning = false;
  };

  canvas.onmouseleave = () => {
    networkState.dragging = null;
    networkState.panning = false;
    tooltip.style.display = 'none';
  };

  canvas.ondblclick = (e) => {
    const { x, y } = getCanvasCoords(e, canvas);
    const node = findNodeAt(x, y);
    if (node) {
      showContactDetail(node.contact.username);
    }
  };

  // Zoom controls
  document.getElementById('networkZoomIn')?.addEventListener('click', () => {
    networkState.zoom = Math.min(networkState.zoom * 1.2, 3);
  });

  document.getElementById('networkZoomOut')?.addEventListener('click', () => {
    networkState.zoom = Math.max(networkState.zoom / 1.2, 0.3);
  });

  document.getElementById('networkReset')?.addEventListener('click', () => {
    networkState.zoom = 1;
    networkState.offsetX = 0;
    networkState.offsetY = 0;
  });

  // Mouse wheel zoom
  canvas.onwheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    networkState.zoom = Math.max(0.3, Math.min(3, networkState.zoom * delta));
  };
}

function getCanvasCoords(e, canvas) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left - networkState.offsetX) / networkState.zoom,
    y: (e.clientY - rect.top - networkState.offsetY) / networkState.zoom
  };
}

function findNodeAt(x, y) {
  for (const node of networkState.nodes) {
    const dx = node.x - x;
    const dy = node.y - y;
    if (Math.sqrt(dx * dx + dy * dy) < node.radius) {
      return node;
    }
  }
  return null;
}

function renderNetwork(canvas, ctx) {
  ctx.save();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Apply transform
  ctx.translate(networkState.offsetX, networkState.offsetY);
  ctx.scale(networkState.zoom, networkState.zoom);

  // Draw connections between contacts in same list
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.lineWidth = 1;

  for (let i = 0; i < networkState.nodes.length; i++) {
    for (let j = i + 1; j < networkState.nodes.length; j++) {
      const nodeA = networkState.nodes[i];
      const nodeB = networkState.nodes[j];

      // Check for shared lists or tags
      const sharedLists = (nodeA.contact.listIds || []).filter(id =>
        (nodeB.contact.listIds || []).includes(id)
      );
      const sharedTags = (nodeA.contact.tags || []).filter(tag =>
        (nodeB.contact.tags || []).includes(tag)
      );

      if (sharedLists.length > 0 || sharedTags.length > 0) {
        ctx.beginPath();
        ctx.moveTo(nodeA.x, nodeA.y);
        ctx.lineTo(nodeB.x, nodeB.y);
        ctx.stroke();
      }
    }
  }

  // Draw nodes
  networkState.nodes.forEach(node => {
    const isHovered = networkState.hoveredNode === node;

    // Glow effect for hovered
    if (isHovered) {
      ctx.shadowColor = node.color;
      ctx.shadowBlur = 20;
    }

    // Draw circle
    ctx.beginPath();
    ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
    ctx.fillStyle = node.color;
    ctx.fill();

    // Draw border
    ctx.strokeStyle = isHovered ? '#fff' : 'rgba(255,255,255,0.3)';
    ctx.lineWidth = isHovered ? 3 : 1;
    ctx.stroke();

    ctx.shadowBlur = 0;

    // Draw profile image if available
    const img = networkState.imageCache.get(node.id);
    if (img) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius - 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, node.x - node.radius + 2, node.y - node.radius + 2, (node.radius - 2) * 2, (node.radius - 2) * 2);
      ctx.restore();
    }
  });

  ctx.restore();
}

function animateNetwork(canvas, ctx) {
  // Simple force simulation
  const centerX = canvas.width / 2 / networkState.zoom;
  const centerY = canvas.height / 2 / networkState.zoom;

  networkState.nodes.forEach(node => {
    if (networkState.dragging === node) return;

    // Attract to center
    const dx = centerX - node.x;
    const dy = centerY - node.y;
    node.vx += dx * 0.0005;
    node.vy += dy * 0.0005;

    // Repel from other nodes
    networkState.nodes.forEach(other => {
      if (other === node) return;
      const ox = node.x - other.x;
      const oy = node.y - other.y;
      const dist = Math.sqrt(ox * ox + oy * oy) || 1;
      const minDist = node.radius + other.radius + 20;

      if (dist < minDist) {
        const force = (minDist - dist) / dist * 0.05;
        node.vx += ox * force;
        node.vy += oy * force;
      }
    });

    // Apply velocity with damping
    node.x += node.vx;
    node.y += node.vy;
    node.vx *= 0.9;
    node.vy *= 0.9;
  });

  renderNetwork(canvas, ctx);
  requestAnimationFrame(() => animateNetwork(canvas, ctx));
}

async function renderNetworkLegend() {
  const legend = document.getElementById('networkLegend');
  const lists = await getAllLists();

  const stages = [
    { name: 'New', color: '#71767B' },
    { name: 'Contacted', color: '#3B82F6' },
    { name: 'Engaged', color: '#8B5CF6' },
    { name: 'Qualified', color: '#F59E0B' },
    { name: 'Won', color: '#10B981' },
    { name: 'Lost', color: '#EF4444' }
  ];

  legend.innerHTML = `
    <div class="flock-legend-section">
      <span class="flock-legend-title">Stages</span>
      ${stages.map(s => `
        <span class="flock-legend-item">
          <span class="flock-legend-dot" style="background: ${s.color}"></span>
          ${s.name}
        </span>
      `).join('')}
    </div>
    ${lists.length > 0 ? `
      <div class="flock-legend-section">
        <span class="flock-legend-title">Lists</span>
        ${lists.slice(0, 3).map(l => `
          <span class="flock-legend-item">
            <span class="flock-legend-dot" style="background: ${l.color}"></span>
            ${escapeHtml(l.name)}
          </span>
        `).join('')}
      </div>
    ` : ''}
  `;
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

// ================================
// REMINDERS VIEW
// ================================

function formatReminderDate(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  const reminderDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (reminderDate.getTime() === today.getTime()) return 'Today';
  if (reminderDate.getTime() === tomorrow.getTime()) return 'Tomorrow';
  if (reminderDate < today) return 'Overdue';

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

async function renderRemindersView() {
  const container = document.getElementById('remindersView');
  const now = Date.now();

  // Get contacts with reminders
  const contactsWithReminders = allContacts.filter(c => c.reminder?.date);

  // Split into overdue, today, upcoming
  const overdue = contactsWithReminders.filter(c => c.reminder.date < now);
  const today = contactsWithReminders.filter(c => {
    const d = new Date(c.reminder.date);
    const n = new Date(now);
    return d.toDateString() === n.toDateString();
  });
  const upcoming = contactsWithReminders.filter(c => {
    const d = new Date(c.reminder.date);
    const n = new Date(now);
    return c.reminder.date > now && d.toDateString() !== n.toDateString();
  }).sort((a, b) => a.reminder.date - b.reminder.date);

  if (contactsWithReminders.length === 0) {
    container.innerHTML = `
      <div class="flock-reminders-empty">
        <div class="flock-reminders-empty-icon">${Icons.bell}</div>
        <p>No reminders set</p>
        <p class="flock-reminders-empty-hint">Set reminders from contact detail pages</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    ${overdue.length > 0 ? `
      <div class="flock-reminder-section">
        <div class="flock-reminder-section-header flock-reminder-overdue">
          <span class="flock-reminder-section-dot"></span>
          <span>Overdue</span>
          <span class="flock-reminder-section-count">${overdue.length}</span>
        </div>
        ${overdue.map(c => renderReminderCard(c, 'overdue')).join('')}
      </div>
    ` : ''}
    ${today.length > 0 ? `
      <div class="flock-reminder-section">
        <div class="flock-reminder-section-header flock-reminder-today">
          <span class="flock-reminder-section-dot"></span>
          <span>Today</span>
          <span class="flock-reminder-section-count">${today.length}</span>
        </div>
        ${today.map(c => renderReminderCard(c, 'today')).join('')}
      </div>
    ` : ''}
    ${upcoming.length > 0 ? `
      <div class="flock-reminder-section">
        <div class="flock-reminder-section-header flock-reminder-upcoming">
          <span class="flock-reminder-section-dot"></span>
          <span>Upcoming</span>
          <span class="flock-reminder-section-count">${upcoming.length}</span>
        </div>
        ${upcoming.map(c => renderReminderCard(c, 'upcoming')).join('')}
      </div>
    ` : ''}
  `;

  // Add click handlers
  container.querySelectorAll('.flock-reminder-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.flock-reminder-dismiss')) return;
      showContactDetail(card.dataset.username);
    });
  });

  // Dismiss handlers
  container.querySelectorAll('.flock-reminder-dismiss').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const username = btn.dataset.username;
      await clearReminder(username);
      allContacts = await getAllContacts();
      showToast('Reminder cleared');
      await renderRemindersView();
    });
  });
}

function renderReminderCard(contact, status) {
  return `
    <div class="flock-reminder-card flock-reminder-${status}" data-username="${escapeHtml(contact.username)}">
      <img
        class="flock-reminder-avatar"
        src="${escapeHtml(contact.profileImageUrl || '')}"
        alt="${escapeHtml(contact.displayName)}"
        onerror="this.style.display='none'"
      >
      <div class="flock-reminder-info">
        <div class="flock-reminder-name">${escapeHtml(contact.displayName || contact.username)}</div>
        <div class="flock-reminder-note">${escapeHtml(contact.reminder?.note || 'Follow up')}</div>
      </div>
      <div class="flock-reminder-meta">
        <span class="flock-reminder-date">${formatReminderDate(contact.reminder.date)}</span>
        <button class="flock-reminder-dismiss" data-username="${escapeHtml(contact.username)}" title="Clear reminder">
          ${Icons.close}
        </button>
      </div>
    </div>
  `;
}

// ================================
// LISTS VIEW
// ================================

let allLists = [];

async function renderListsView() {
  const container = document.getElementById('listsView');
  allLists = await getAllLists();

  // Initialize with default lists if empty
  if (allLists.length === 0) {
    await saveLists(DEFAULT_LISTS);
    allLists = DEFAULT_LISTS;
  }

  // Count contacts per list
  const listCounts = {};
  allLists.forEach(l => { listCounts[l.id] = 0; });
  allContacts.forEach(c => {
    (c.listIds || []).forEach(lid => {
      if (listCounts[lid] !== undefined) listCounts[lid]++;
    });
  });

  container.innerHTML = `
    <div class="flock-lists-header">
      <button class="flock-lists-add-btn" id="addListBtn">
        ${Icons.plus}
        <span>New List</span>
      </button>
    </div>
    <div class="flock-lists-grid">
      ${allLists.map(list => `
        <div class="flock-list-card" data-list-id="${escapeHtml(list.id)}">
          <div class="flock-list-color" style="background: ${escapeHtml(list.color)}"></div>
          <div class="flock-list-info">
            <div class="flock-list-name">${escapeHtml(list.name)}</div>
            <div class="flock-list-count">${listCounts[list.id]} contact${listCounts[list.id] !== 1 ? 's' : ''}</div>
          </div>
          <button class="flock-list-delete" data-list-id="${escapeHtml(list.id)}" title="Delete list">
            ${Icons.close}
          </button>
        </div>
      `).join('')}
    </div>
    ${allLists.length === 0 ? `
      <div class="flock-lists-empty">
        <p>No lists yet</p>
        <p class="flock-lists-empty-hint">Create lists to organize your contacts</p>
      </div>
    ` : ''}
  `;

  // Add list button handler
  document.getElementById('addListBtn')?.addEventListener('click', showAddListModal);

  // List card click handlers
  container.querySelectorAll('.flock-list-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.flock-list-delete')) return;
      const listId = card.dataset.listId;
      filterByList(listId);
    });
  });

  // Delete handlers
  container.querySelectorAll('.flock-list-delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const listId = btn.dataset.listId;
      const list = allLists.find(l => l.id === listId);
      if (confirm(`Delete "${list?.name}" list? Contacts won't be deleted.`)) {
        await deleteList(listId);
        allContacts = await getAllContacts();
        showToast('List deleted');
        await renderListsView();
        await populateListFilter();
      }
    });
  });
}

function filterByList(listId) {
  currentFilter.list = listId;
  document.getElementById('listFilter').value = listId;
  switchTab('all');
}

function showAddListModal() {
  const colors = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4', '#84CC16'];

  const overlay = document.createElement('div');
  overlay.className = 'flock-modal-overlay';
  overlay.id = 'addListModal';
  overlay.innerHTML = `
    <div class="flock-modal">
      <div class="flock-modal-header">
        <h3>New List</h3>
        <button class="flock-modal-close" id="closeAddList">&times;</button>
      </div>
      <div class="flock-modal-body">
        <div class="flock-form-group">
          <label class="flock-form-label">Name</label>
          <input type="text" class="flock-form-input" id="newListName" placeholder="e.g., VIP Contacts" autofocus>
        </div>
        <div class="flock-form-group">
          <label class="flock-form-label">Color</label>
          <div class="flock-color-picker">
            ${colors.map((c, i) => `
              <button class="flock-color-option ${i === 0 ? 'selected' : ''}" data-color="${c}" style="background: ${c}"></button>
            `).join('')}
          </div>
        </div>
        <button class="flock-btn flock-btn-primary" id="createListBtn">Create List</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  let selectedColor = colors[0];

  // Color picker
  overlay.querySelectorAll('.flock-color-option').forEach(btn => {
    btn.addEventListener('click', () => {
      overlay.querySelectorAll('.flock-color-option').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedColor = btn.dataset.color;
    });
  });

  // Close modal
  const closeModal = () => overlay.remove();
  document.getElementById('closeAddList').addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  // Create list
  document.getElementById('createListBtn').addEventListener('click', async () => {
    const name = document.getElementById('newListName').value.trim();
    if (!name) {
      showToast('Please enter a name', 'error');
      return;
    }
    await createList(name, selectedColor);
    closeModal();
    showToast('List created');
    await renderListsView();
    await populateListFilter();
  });

  // Enter to create
  document.getElementById('newListName').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      document.getElementById('createListBtn').click();
    }
  });
}

async function populateListFilter() {
  const listFilter = document.getElementById('listFilter');
  if (!listFilter) return;

  const lists = await getAllLists();
  listFilter.innerHTML = `<option value="">All lists</option>` +
    lists.map(l => `<option value="${escapeHtml(l.id)}">${escapeHtml(l.name)}</option>`).join('');
}

// ================================
// SMART TAGS
// ================================

async function getApiKey() {
  const result = await chrome.storage.sync.get('anthropicApiKey');
  return result.anthropicApiKey || null;
}

async function suggestTags(contact) {
  const apiKey = await getApiKey();
  if (!apiKey) {
    return { success: false, error: 'API key not configured. Go to Settings to add your Anthropic API key.' };
  }

  // Build context from contact data
  const context = [];
  if (contact.bio) context.push(`Bio: ${contact.bio}`);
  if (contact.displayName) context.push(`Name: ${contact.displayName}`);
  if (contact.followersCount) context.push(`Followers: ${formatCount(contact.followersCount)}`);
  if (contact.notes) context.push(`Notes: ${contact.notes}`);

  // Get recent interactions
  const interactions = await getAllInteractions();
  const contactInteractions = Object.values(interactions)
    .filter(i => i.username === contact.username)
    .slice(0, 5)
    .map(i => i.description);

  if (contactInteractions.length > 0) {
    context.push(`Recent interactions: ${contactInteractions.join(', ')}`);
  }

  if (context.length < 2) {
    return { success: false, error: 'Not enough information to suggest tags. Try adding notes or interacting more.' };
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 100,
        messages: [{
          role: 'user',
          content: `Based on this Twitter contact's information, suggest 3-5 relevant tags for organizing them in a CRM. Return ONLY a JSON array of lowercase single-word or hyphenated tags. No explanation.

Contact info:
${context.join('\n')}

Example output: ["investor", "tech", "saas", "founder"]`
        }]
      })
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.error?.message || 'API request failed' };
    }

    const data = await response.json();
    const text = data.content[0].text.trim();

    // Parse JSON array from response
    const tags = JSON.parse(text);
    if (Array.isArray(tags) && tags.every(t => typeof t === 'string')) {
      return { success: true, tags: tags.slice(0, 5) };
    }

    return { success: false, error: 'Invalid response format' };
  } catch (error) {
    console.error('[Flock] Tag suggestion error:', error);
    return { success: false, error: error.message || 'Failed to generate tags' };
  }
}

async function addTagToContact(username, tag) {
  const contact = await getContact(username);
  if (!contact) return;

  const tags = contact.tags || [];
  if (!tags.includes(tag)) {
    tags.push(tag);
    await updateContact(username, { tags });
  }
}

async function removeTagFromContact(username, tag) {
  const contact = await getContact(username);
  if (!contact) return;

  const tags = (contact.tags || []).filter(t => t !== tag);
  await updateContact(username, { tags });
}

function openTwitterProfile(username) {
  chrome.tabs.create({ url: `https://twitter.com/${username}` });
}

// ================================
// BULK SELECTION
// ================================

let bulkSelectMode = false;
let selectedContacts = new Set();

function toggleBulkSelectMode() {
  bulkSelectMode = !bulkSelectMode;
  selectedContacts.clear();
  updateBulkUI();
  applyFiltersAndSort();
}

function toggleContactSelection(username) {
  if (selectedContacts.has(username)) {
    selectedContacts.delete(username);
  } else {
    selectedContacts.add(username);
  }
  updateBulkUI();
}

function selectAllVisible() {
  const cards = document.querySelectorAll('.flock-contact-card');
  cards.forEach(card => {
    const username = card.dataset.username;
    if (username) selectedContacts.add(username);
  });
  updateBulkUI();
  applyFiltersAndSort();
}

function deselectAll() {
  selectedContacts.clear();
  updateBulkUI();
  applyFiltersAndSort();
}

function updateBulkUI() {
  const bulkBar = document.getElementById('bulkBar');
  const bulkToggle = document.getElementById('bulkToggle');
  const countSpan = bulkBar?.querySelector('.flock-bulk-count');

  if (bulkSelectMode) {
    bulkToggle?.classList.add('active');
    if (bulkBar) {
      bulkBar.style.display = 'flex';
      if (countSpan) {
        countSpan.textContent = selectedContacts.size > 0
          ? `${selectedContacts.size} selected`
          : '0 selected';
      }
    }
  } else {
    bulkToggle?.classList.remove('active');
    if (bulkBar) bulkBar.style.display = 'none';
  }

  // Update checkboxes and selected state
  document.querySelectorAll('.flock-contact-card').forEach(card => {
    const checkbox = card.querySelector('.flock-bulk-checkbox');
    const isSelected = selectedContacts.has(card.dataset.username);
    if (checkbox) {
      checkbox.checked = isSelected;
    }
    card.classList.toggle('flock-selected', isSelected);
  });
}

async function bulkAddTag() {
  if (selectedContacts.size === 0) return;

  const tag = prompt('Enter tag to add to selected contacts:');
  if (!tag) return;

  const result = await chrome.storage.local.get('contacts');
  const contactsObj = result.contacts || {};

  for (const username of selectedContacts) {
    if (contactsObj[username]) {
      const currentTags = contactsObj[username].tags || [];
      if (!currentTags.includes(tag)) {
        contactsObj[username].tags = [...currentTags, tag];
        contactsObj[username].updatedAt = Date.now();
      }
    }
  }

  await chrome.storage.local.set({ contacts: contactsObj });
  allContacts = Object.values(contactsObj);
  showToast(`Added "${tag}" to ${selectedContacts.size} contacts`);
  deselectAll();
}

async function bulkSetStage() {
  if (selectedContacts.size === 0) return;

  const stage = prompt('Enter stage (new/contacted/engaged/qualified/won/lost):');
  if (!stage || !['new', 'contacted', 'engaged', 'qualified', 'won', 'lost'].includes(stage)) {
    showToast('Invalid stage', 'error');
    return;
  }

  const result = await chrome.storage.local.get('contacts');
  const contactsObj = result.contacts || {};

  for (const username of selectedContacts) {
    if (contactsObj[username]) {
      contactsObj[username].pipelineStage = stage;
      contactsObj[username].updatedAt = Date.now();
    }
  }

  await chrome.storage.local.set({ contacts: contactsObj });
  allContacts = Object.values(contactsObj);
  showToast(`Moved ${selectedContacts.size} contacts to ${stage}`);
  deselectAll();
}

async function bulkAddToList() {
  if (selectedContacts.size === 0) return;

  const lists = await getAllLists();
  if (lists.length === 0) {
    showToast('No lists available. Create a list first.', 'error');
    return;
  }

  const listNames = lists.map((l, i) => `${i + 1}. ${l.name}`).join('\n');
  const choice = prompt(`Select a list (enter number):\n${listNames}`);
  if (!choice) return;

  const listIndex = parseInt(choice, 10) - 1;
  if (isNaN(listIndex) || listIndex < 0 || listIndex >= lists.length) {
    showToast('Invalid selection', 'error');
    return;
  }

  const selectedList = lists[listIndex];

  const result = await chrome.storage.local.get('contacts');
  const contactsObj = result.contacts || {};

  for (const username of selectedContacts) {
    if (contactsObj[username]) {
      const currentListIds = contactsObj[username].listIds || [];
      if (!currentListIds.includes(selectedList.id)) {
        contactsObj[username].listIds = [...currentListIds, selectedList.id];
        contactsObj[username].updatedAt = Date.now();
      }
    }
  }

  await chrome.storage.local.set({ contacts: contactsObj });
  allContacts = Object.values(contactsObj);
  showToast(`Added ${selectedContacts.size} contacts to "${selectedList.name}"`);
  deselectAll();
}

async function bulkDelete() {
  if (selectedContacts.size === 0) return;

  const confirmed = confirm(`Delete ${selectedContacts.size} contacts? This cannot be undone.`);
  if (!confirmed) return;

  const result = await chrome.storage.local.get('contacts');
  const contactsObj = result.contacts || {};

  for (const username of selectedContacts) {
    delete contactsObj[username];
  }

  await chrome.storage.local.set({ contacts: contactsObj });
  allContacts = Object.values(contactsObj);
  updateStats(allContacts);
  showToast(`Deleted ${selectedContacts.size} contacts`);

  bulkSelectMode = false;
  selectedContacts.clear();
  updateBulkUI();
  applyFiltersAndSort();
}

function setupBulkOperations() {
  // Toggle bulk select mode
  document.getElementById('bulkToggle')?.addEventListener('click', () => {
    toggleBulkSelectMode();
    document.getElementById('bulkToggle').classList.toggle('active', bulkSelectMode);
  });

  // Select all visible
  document.getElementById('bulkSelectAll')?.addEventListener('click', () => {
    selectAllVisible();
  });

  // Cancel bulk mode
  document.getElementById('bulkCancel')?.addEventListener('click', () => {
    bulkSelectMode = false;
    selectedContacts.clear();
    document.getElementById('bulkToggle').classList.remove('active');
    updateBulkUI();
    applyFiltersAndSort();
  });

  // Bulk tag
  document.getElementById('bulkTag')?.addEventListener('click', bulkAddTag);

  // Bulk stage
  document.getElementById('bulkStage')?.addEventListener('click', bulkSetStage);

  // Bulk list
  document.getElementById('bulkList')?.addEventListener('click', bulkAddToList);

  // Bulk delete
  document.getElementById('bulkDelete')?.addEventListener('click', bulkDelete);

  // Handle checkbox clicks via delegation
  document.getElementById('contactList')?.addEventListener('change', (e) => {
    if (e.target.classList.contains('flock-bulk-checkbox')) {
      const card = e.target.closest('.flock-contact-card');
      if (card) {
        toggleContactSelection(card.dataset.username);
      }
    }
  });

  // Prevent card click from opening detail when clicking checkbox
  document.getElementById('contactList')?.addEventListener('click', (e) => {
    if (e.target.closest('.flock-bulk-checkbox-wrap') && bulkSelectMode) {
      e.stopPropagation();
    }
  });
}

// ================================
// FILTERING & SORTING
// ================================

let currentFilter = { stage: '', sort: 'recent', followupOnly: false, list: '' };

function applyFiltersAndSort() {
  let filtered = [...allContacts];

  // Stage filter
  if (currentFilter.stage) {
    filtered = filtered.filter(c => (c.pipelineStage || 'new') === currentFilter.stage);
  }

  // List filter
  if (currentFilter.list) {
    filtered = filtered.filter(c => c.listIds?.includes(currentFilter.list));
  }

  // Follow-up filter
  if (currentFilter.followupOnly) {
    const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    filtered = filtered.filter(c => !c.lastInteraction || c.lastInteraction < weekAgo);
  }

  // Sort
  switch (currentFilter.sort) {
    case 'name':
      filtered.sort((a, b) => (a.displayName || a.username).localeCompare(b.displayName || b.username));
      break;
    case 'followers':
      filtered.sort((a, b) => (b.followersCount || 0) - (a.followersCount || 0));
      break;
    case 'interaction':
      filtered.sort((a, b) => (b.lastInteraction || 0) - (a.lastInteraction || 0));
      break;
    case 'reminder':
      filtered = filtered.filter(c => c.reminder?.date);
      filtered.sort((a, b) => (a.reminder?.date || Infinity) - (b.reminder?.date || Infinity));
      break;
    case 'recent':
    default:
      filtered.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      break;
  }

  renderContactList(filtered, allInteractions);
}

// ================================
// TAB HANDLING
// ================================

let currentTab = 'all';
let allContacts = [];
let allInteractions = {};

async function switchTab(tab) {
  currentTab = tab;

  // Update tab UI
  document.querySelectorAll('.flock-tab').forEach(t => {
    t.classList.toggle('flock-active', t.dataset.tab === tab);
  });

  // Hide detail panel if open
  hideContactDetail();

  // Show/hide views
  const contactList = document.getElementById('contactList');
  const remindersView = document.getElementById('remindersView');
  const listsView = document.getElementById('listsView');
  const pipelineView = document.getElementById('pipelineView');
  const analyticsView = document.getElementById('analyticsView');
  const networkView = document.getElementById('networkView');
  const emptyState = document.getElementById('emptyState');
  const filterBar = document.getElementById('filterBar');

  contactList.style.display = 'none';
  remindersView.style.display = 'none';
  listsView.style.display = 'none';
  pipelineView.style.display = 'none';
  analyticsView.style.display = 'none';
  networkView.style.display = 'none';

  if (allContacts.length === 0) {
    filterBar.style.display = 'none';
    emptyState.style.display = 'flex';
    return;
  }

  emptyState.style.display = 'none';

  switch (tab) {
    case 'all':
      filterBar.style.display = 'flex';
      contactList.style.display = 'flex';
      currentFilter.followupOnly = false;
      applyFiltersAndSort();
      break;

    case 'reminders':
      filterBar.style.display = 'none';
      remindersView.style.display = 'flex';
      await renderRemindersView();
      break;

    case 'lists':
      filterBar.style.display = 'none';
      listsView.style.display = 'flex';
      await renderListsView();
      break;

    case 'pipeline':
      filterBar.style.display = 'none';
      pipelineView.style.display = 'flex';
      renderPipelineView(allContacts);
      break;

    case 'analytics':
      filterBar.style.display = 'none';
      analyticsView.style.display = 'flex';
      await renderAnalyticsView();
      break;

    case 'network':
      filterBar.style.display = 'none';
      networkView.style.display = 'flex';
      await renderNetworkView();
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
    applyFiltersAndSort();
  }
}

function handleSearch(query) {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(async () => {
    if (!query.trim()) {
      applyFiltersAndSort();
      return;
    }

    const results = await searchContacts(query);
    renderContactList(results, allInteractions);
  }, 200);
}

async function renderSavedFilters() {
  const filters = await loadSavedFilters();
  const container = document.getElementById('savedFilters');
  if (!container) return;

  container.innerHTML = filters.map(filter => `
    <div class="flock-saved-filter" data-filter-id="${escapeHtml(filter.id)}" data-query="${escapeHtml(filter.query)}">
      <span class="flock-saved-filter-name">${escapeHtml(filter.name)}</span>
      <button class="flock-saved-filter-delete" title="Remove filter">
        <svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/></svg>
      </button>
    </div>
  `).join('');

  // Add click handlers
  container.querySelectorAll('.flock-saved-filter').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target.closest('.flock-saved-filter-delete')) return;
      const query = el.dataset.query;
      document.getElementById('searchInput').value = query;
      handleSearch(query);
    });
  });

  container.querySelectorAll('.flock-saved-filter-delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const filterId = btn.closest('.flock-saved-filter').dataset.filterId;
      await deleteFilter(filterId);
      renderSavedFilters();
      showToast('Filter removed');
    });
  });
}

function setupSearchUI() {
  // Search hints - click to insert
  document.querySelectorAll('.flock-search-hint').forEach(hint => {
    hint.addEventListener('click', () => {
      const input = document.getElementById('searchInput');
      const currentVal = input.value;
      const hintText = hint.textContent;

      if (currentVal && !currentVal.endsWith(' ')) {
        input.value = currentVal + ' ' + hintText;
      } else {
        input.value = currentVal + hintText;
      }

      input.focus();
      handleSearch(input.value);
    });
  });

  // Save search button
  document.getElementById('saveSearchBtn')?.addEventListener('click', async () => {
    const query = document.getElementById('searchInput').value.trim();
    if (!query) {
      showToast('Enter a search query first', 'error');
      return;
    }

    const name = prompt('Name this filter:', query.slice(0, 20));
    if (!name) return;

    await saveFilter(name, query);
    renderSavedFilters();
    showToast('Filter saved');
  });

  // Initial render
  renderSavedFilters();
}

// ================================
// MODALS
// ================================

function showHelpModal() {
  document.getElementById('helpModal').style.display = 'flex';
}

function hideHelpModal() {
  document.getElementById('helpModal').style.display = 'none';
}

// ================================
// KEYBOARD SHORTCUTS
// ================================

function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Don't trigger if typing in input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      if (e.key === 'Escape') {
        e.target.blur();
        if (searchVisible) toggleSearch();
      }
      return;
    }

    switch (e.key) {
      case '/':
        e.preventDefault();
        if (!searchVisible) toggleSearch();
        break;
      case '?':
        e.preventDefault();
        showHelpModal();
        break;
      case 'Escape':
        if (document.getElementById('helpModal').style.display === 'flex') {
          hideHelpModal();
        } else if (document.getElementById('detailPanel').style.display === 'block') {
          hideContactDetail();
        } else if (searchVisible) {
          toggleSearch();
        }
        break;
    }
  });
}

// ================================
// EXPORT
// ================================

async function handleExport() {
  showExportModal();
}

function showExportModal() {
  const modal = document.createElement('div');
  modal.className = 'flock-modal-overlay';
  modal.id = 'exportModal';
  modal.innerHTML = `
    <div class="flock-modal flock-export-modal">
      <div class="flock-modal-header">
        <h3>Export Contacts</h3>
        <button class="flock-modal-close" id="closeExport">&times;</button>
      </div>
      <div class="flock-modal-body">
        <p class="flock-export-info">Choose an export format:</p>
        <div class="flock-export-options">
          <button class="flock-export-option" data-format="json">
            <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" stroke-width="2" fill="none"/><path d="M14 2v6h6M8 13h8M8 17h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            <span class="flock-export-label">JSON</span>
            <span class="flock-export-desc">Full backup with all data</span>
          </button>
          <button class="flock-export-option" data-format="csv">
            <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2" fill="none"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18" stroke="currentColor" stroke-width="2"/></svg>
            <span class="flock-export-label">CSV</span>
            <span class="flock-export-desc">Spreadsheet compatible</span>
          </button>
          <button class="flock-export-option" data-format="notion">
            <svg viewBox="0 0 24 24"><path d="M4 4h16v16H4z" stroke="currentColor" stroke-width="2" fill="none"/><path d="M8 8h8M8 12h6M8 16h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            <span class="flock-export-label">Notion</span>
            <span class="flock-export-desc">Notion database import</span>
          </button>
          <button class="flock-export-option" data-format="vcard">
            <svg viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="8" cy="10" r="2" stroke="currentColor" stroke-width="2" fill="none"/><path d="M12 14c0-2 1.5-3 3-3h2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            <span class="flock-export-label">vCard</span>
            <span class="flock-export-desc">Contact cards (.vcf)</span>
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  modal.style.display = 'flex';

  // Event listeners
  document.getElementById('closeExport').addEventListener('click', () => closeExportModal());
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeExportModal();
  });

  modal.querySelectorAll('.flock-export-option').forEach(btn => {
    btn.addEventListener('click', () => {
      const format = btn.dataset.format;
      performExport(format);
      closeExportModal();
    });
  });
}

function closeExportModal() {
  const modal = document.getElementById('exportModal');
  if (modal) modal.remove();
}

async function performExport(format) {
  try {
    const contacts = allContacts;
    const lists = await getAllLists();
    const today = new Date().toISOString().split('T')[0];
    let content, filename, type;

    switch (format) {
      case 'json':
        const data = await exportData();
        content = JSON.stringify(data, null, 2);
        filename = `flock-export-${today}.json`;
        type = 'application/json';
        break;

      case 'csv':
        content = exportToCSV(contacts, lists);
        filename = `flock-contacts-${today}.csv`;
        type = 'text/csv';
        break;

      case 'notion':
        content = exportToNotion(contacts, lists);
        filename = `flock-notion-${today}.csv`;
        type = 'text/csv';
        break;

      case 'vcard':
        content = exportToVCard(contacts);
        filename = `flock-contacts-${today}.vcf`;
        type = 'text/vcard';
        break;

      default:
        throw new Error('Unknown format');
    }

    downloadFile(content, filename, type);
    showToast(`Exported ${contacts.length} contacts as ${format.toUpperCase()}`);
  } catch (error) {
    console.error('[Flock] Export error:', error);
    showToast('Export failed', 'error');
  }
}

function exportToCSV(contacts, lists) {
  const headers = [
    'Username',
    'Display Name',
    'Bio',
    'Followers',
    'Following',
    'Stage',
    'Tags',
    'Lists',
    'Notes',
    'Reminder Date',
    'Reminder Note',
    'Profile URL',
    'Added Date',
    'Last Interaction'
  ];

  const rows = contacts.map(c => {
    const contactLists = (c.listIds || [])
      .map(id => lists.find(l => l.id === id)?.name || '')
      .filter(Boolean)
      .join('; ');

    return [
      c.username || '',
      c.displayName || '',
      (c.bio || '').replace(/"/g, '""'),
      c.followersCount || 0,
      c.followingCount || 0,
      c.pipelineStage || 'new',
      (c.tags || []).join('; '),
      contactLists,
      (c.notes || '').replace(/"/g, '""'),
      c.reminder?.date ? new Date(c.reminder.date).toISOString() : '',
      (c.reminder?.note || '').replace(/"/g, '""'),
      `https://twitter.com/${c.username}`,
      c.createdAt ? new Date(c.createdAt).toISOString() : '',
      c.lastInteraction ? new Date(c.lastInteraction).toISOString() : ''
    ].map(v => `"${v}"`).join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

function exportToNotion(contacts, lists) {
  // Notion-friendly CSV with specific column types
  const headers = [
    'Name',
    'Twitter Handle',
    'Status',
    'Tags',
    'Notes',
    'Twitter URL',
    'Followers',
    'Bio',
    'Reminder',
    'Lists'
  ];

  const rows = contacts.map(c => {
    const contactLists = (c.listIds || [])
      .map(id => lists.find(l => l.id === id)?.name || '')
      .filter(Boolean)
      .join(', ');

    return [
      c.displayName || c.username,
      `@${c.username}`,
      c.pipelineStage || 'new',
      (c.tags || []).join(', '),
      (c.notes || '').replace(/"/g, '""').replace(/\n/g, ' '),
      `https://twitter.com/${c.username}`,
      c.followersCount || 0,
      (c.bio || '').replace(/"/g, '""').replace(/\n/g, ' '),
      c.reminder?.date ? new Date(c.reminder.date).toLocaleDateString() : '',
      contactLists
    ].map(v => `"${v}"`).join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

function exportToVCard(contacts) {
  return contacts.map(c => {
    const lines = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${c.displayName || c.username}`,
      `N:;${c.displayName || c.username};;;`,
      `NICKNAME:@${c.username}`,
      `URL:https://twitter.com/${c.username}`
    ];

    if (c.bio) {
      lines.push(`NOTE:${c.bio.replace(/\n/g, '\\n')}`);
    }

    if (c.notes) {
      lines.push(`X-FLOCK-NOTES:${c.notes.replace(/\n/g, '\\n')}`);
    }

    if (c.pipelineStage) {
      lines.push(`X-FLOCK-STAGE:${c.pipelineStage}`);
    }

    if (c.tags && c.tags.length > 0) {
      lines.push(`CATEGORIES:${c.tags.join(',')}`);
    }

    lines.push('END:VCARD');
    return lines.join('\r\n');
  }).join('\r\n');
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ================================
// INITIALIZATION
// ================================

async function init() {
  try {
    // Load data
    allContacts = await getAllContacts();
    allInteractions = await getAllInteractions();

    // Update stats
    updateStats(allContacts);

    // Populate list filter
    await populateListFilter();

    // Render suggestions
    renderSuggestions(allContacts, allInteractions);

    // Render initial view
    await switchTab('all');

    // Tab click handlers
    document.querySelectorAll('.flock-tab').forEach(tab => {
      tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    // Stat card click (filter to follow-ups)
    document.querySelector('.flock-stat-card[data-filter="followup"]')?.addEventListener('click', () => {
      currentFilter.followupOnly = !currentFilter.followupOnly;
      document.querySelector('.flock-stat-card[data-filter="followup"]').classList.toggle('flock-stat-active', currentFilter.followupOnly);
      if (currentTab !== 'all') switchTab('all');
      else applyFiltersAndSort();
    });

    // Filter handlers
    document.getElementById('listFilter').addEventListener('change', (e) => {
      currentFilter.list = e.target.value;
      applyFiltersAndSort();
    });

    document.getElementById('stageFilter').addEventListener('change', (e) => {
      currentFilter.stage = e.target.value;
      applyFiltersAndSort();
    });

    document.getElementById('sortBy').addEventListener('change', (e) => {
      currentFilter.sort = e.target.value;
      applyFiltersAndSort();
    });

    // Search
    document.getElementById('searchBtn').addEventListener('click', toggleSearch);
    document.getElementById('searchInput').addEventListener('input', (e) => {
      handleSearch(e.target.value);
    });
    setupSearchUI();

    // Help modal
    document.getElementById('helpBtn').addEventListener('click', showHelpModal);
    document.getElementById('closeHelp').addEventListener('click', hideHelpModal);
    document.getElementById('helpModal').addEventListener('click', (e) => {
      if (e.target.id === 'helpModal') hideHelpModal();
    });

    // Export
    document.getElementById('exportBtn').addEventListener('click', handleExport);

    // Settings
    document.getElementById('settingsBtn').addEventListener('click', () => {
      chrome.runtime.openOptionsPage?.();
    });

    // Keyboard shortcuts
    setupKeyboardShortcuts();

    // Bulk operations
    setupBulkOperations();

    // Hide loading
    document.getElementById('loadingState').style.display = 'none';

  } catch (error) {
    console.error('[Flock] Initialization error:', error);
    document.getElementById('loadingState').innerHTML = `
      <p style="color: var(--flock-error);">Failed to load. Please try again.</p>
    `;
  }
}

// Start
init();

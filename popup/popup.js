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
    <div class="flock-contact-card" data-username="${escapeHtml(contact.username)}">
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
  const emptyState = document.getElementById('emptyState');
  const filterBar = document.getElementById('filterBar');

  contactList.style.display = 'none';
  remindersView.style.display = 'none';
  listsView.style.display = 'none';
  pipelineView.style.display = 'none';

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
  }
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

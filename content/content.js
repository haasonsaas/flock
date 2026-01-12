/**
 * Flock Content Script
 * Injects CRM functionality into Twitter/X pages
 */

// ================================
// ICONS (inline for content script)
// ================================
const Icons = {
  // Bookmark icons for main button
  bookmark: `<svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" stroke="currentColor" fill="none"/></svg>`,
  bookmarkFilled: `<svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" fill="currentColor" stroke="currentColor"/></svg>`,
  check: `<svg viewBox="0 0 24 24"><path d="M5 12l5 5L20 7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`,
  close: `<svg viewBox="0 0 24 24"><path d="M6 6l12 12M6 18L18 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/></svg>`,
  plus: `<svg viewBox="0 0 24 24"><path d="M12 5v14m-7-7h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/></svg>`,
  note: `<svg viewBox="0 0 24 24"><path d="M4 4h16v16H4z" stroke="currentColor" stroke-width="2" fill="none"/><path d="M8 8h8M8 12h8M8 16h4" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/></svg>`,
  message: `<svg viewBox="0 0 24 24"><path d="M21 12c0 4.5-4 8-9 8-1.5 0-3-.5-4-1l-5 1 1-4c-1-1-2-3-2-4 0-4.5 4-8 9-8s9 3.5 9 8z" stroke="currentColor" stroke-width="2" fill="none"/></svg>`,
  spinner: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none" opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/></svg>`,
  success: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/><path d="M8 12l3 3 5-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`,
  // Flock logo for sidebar header
  logo: `<svg viewBox="0 0 24 24"><path d="M21.5 6.5c-.5.5-1.5 1-3 1.5.5 1.5.5 3 0 4.5-.5 1.5-1.5 3-3 4.5-1.5 1.5-3.5 2.5-6 3-2.5.5-5 .5-7.5-.5 2 0 3.5-.5 5-1.5-1.5 0-2.5-.5-3.5-1.5 1 0 2-.5 2.5-1-1.5-.5-2.5-1.5-3-2.5 1 .5 2 .5 2.5.5C4 12 3 10.5 3 8.5c.5.5 1.5.5 2 .5-1.5-1-2-2.5-2-4.5 0-.5 0-1 .5-1.5 2 2.5 4.5 4 8 4.5 0-.5-.5-1-.5-1.5 0-2 1.5-3.5 3.5-3.5 1 0 2 .5 2.5 1 1-.5 2-.5 2.5-1-.5 1-.5 2-1.5 2.5 1 0 2-.5 2.5-.5-.5 1-1 1.5-2 2z" fill="currentColor"/></svg>`,
};

// ================================
// STORAGE (simplified for content script)
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
        const listsStore = database.createObjectStore('lists', { keyPath: 'id' });
        listsStore.createIndex('name', 'name', { unique: true });
      }

      if (!database.objectStoreNames.contains('tags')) {
        const tagsStore = database.createObjectStore('tags', { keyPath: 'id' });
        tagsStore.createIndex('name', 'name', { unique: true });
      }

      if (!database.objectStoreNames.contains('interactions')) {
        const interactionsStore = database.createObjectStore('interactions', { keyPath: 'id' });
        interactionsStore.createIndex('contactUsername', 'contactUsername', { unique: false });
        interactionsStore.createIndex('timestamp', 'timestamp', { unique: false });
        interactionsStore.createIndex('type', 'type', { unique: false });
      }

      if (!database.objectStoreNames.contains('settings')) {
        database.createObjectStore('settings', { keyPath: 'key' });
      }
    };
  });
}

async function saveContact(contact) {
  await initDB();
  const enrichedContact = {
    ...contact,
    createdAt: contact.createdAt || Date.now(),
    updatedAt: Date.now(),
    pipelineStage: contact.pipelineStage || 'new',
    tags: contact.tags || [],
    notes: contact.notes || '',
    list: contact.list || 'default',
    lastInteraction: contact.lastInteraction || null,
    nextFollowUp: contact.nextFollowUp || null,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction('contacts', 'readwrite');
    const store = tx.objectStore('contacts');
    const request = store.put(enrichedContact);
    request.onsuccess = () => resolve(enrichedContact);
    request.onerror = () => reject(request.error);
  });
}

async function getContact(username) {
  await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('contacts', 'readonly');
    const store = tx.objectStore('contacts');
    const request = store.get(username);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function updateContact(username, updates) {
  const existing = await getContact(username);
  if (!existing) throw new Error(`Contact ${username} not found`);
  return saveContact({ ...existing, ...updates });
}

async function getInteractionsForContact(username) {
  await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('interactions', 'readonly');
    const store = tx.objectStore('interactions');
    const index = store.index('contactUsername');
    const request = index.getAll(username);
    request.onsuccess = () => {
      const results = request.result.sort((a, b) => b.timestamp - a.timestamp);
      resolve(results);
    };
    request.onerror = () => reject(request.error);
  });
}

async function logInteraction(contactUsername, type, content = '', metadata = {}) {
  await initDB();
  const interaction = {
    id: `int_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
    contactUsername,
    type,
    content,
    metadata,
    timestamp: Date.now(),
  };

  try {
    await updateContact(contactUsername, { lastInteraction: Date.now() });
  } catch (e) {
    // Contact might not exist yet
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction('interactions', 'readwrite');
    const store = tx.objectStore('interactions');
    const request = store.put(interaction);
    request.onsuccess = () => resolve(interaction);
    request.onerror = () => reject(request.error);
  });
}

// ================================
// TWITTER PARSER
// ================================
const TwitterParser = {
  isProfilePage() {
    const path = window.location.pathname;
    const reserved = [
      'home', 'explore', 'notifications', 'messages', 'bookmarks',
      'lists', 'topics', 'communities', 'premium', 'settings',
      'compose', 'search', 'i', 'intent', 'tos', 'privacy'
    ];
    const parts = path.split('/').filter(Boolean);

    if (parts.length === 0) return false;
    if (reserved.includes(parts[0])) return false;
    if (parts.length > 1 && !['with_replies', 'media', 'likes', 'followers', 'following', 'verified_followers'].includes(parts[1])) {
      return false;
    }

    return true;
  },

  getCurrentUsername() {
    if (!this.isProfilePage()) return null;
    const parts = window.location.pathname.split('/').filter(Boolean);
    return parts[0] || null;
  },

  extractProfileData() {
    if (!this.isProfilePage()) return null;

    const data = {
      username: this.getCurrentUsername(),
      displayName: null,
      bio: null,
      location: null,
      website: null,
      joinDate: null,
      followersCount: null,
      followingCount: null,
      isVerified: false,
      profileImageUrl: null,
      bannerImageUrl: null,
      extractedAt: Date.now(),
    };

    try {
      const nameHeading = document.querySelector('[data-testid="UserName"]');
      if (nameHeading) {
        const displayNameEl = nameHeading.querySelector('span');
        if (displayNameEl) {
          data.displayName = displayNameEl.textContent?.trim();
        }
        data.isVerified = nameHeading.querySelector('[data-testid="icon-verified"]') !== null ||
                          nameHeading.querySelector('svg[aria-label*="Verified"]') !== null;
      }

      const bioEl = document.querySelector('[data-testid="UserDescription"]');
      if (bioEl) {
        data.bio = bioEl.textContent?.trim();
      }

      const locationEl = document.querySelector('[data-testid="UserLocation"]');
      if (locationEl) {
        data.location = locationEl.textContent?.trim();
      }

      const websiteEl = document.querySelector('[data-testid="UserUrl"]');
      if (websiteEl) {
        const link = websiteEl.querySelector('a');
        data.website = link?.href || websiteEl.textContent?.trim();
      }

      const joinDateEl = document.querySelector('[data-testid="UserJoinDate"]');
      if (joinDateEl) {
        data.joinDate = joinDateEl.textContent?.trim();
      }

      const followLinks = document.querySelectorAll('a[href*="/followers"], a[href*="/following"], a[href*="/verified_followers"]');
      followLinks.forEach(link => {
        const text = link.textContent?.trim();
        const count = this.parseCount(text);

        if (link.href.includes('/following')) {
          data.followingCount = count;
        } else if (link.href.includes('/followers') || link.href.includes('/verified_followers')) {
          if (data.followersCount === null) {
            data.followersCount = count;
          }
        }
      });

      const profileImg = document.querySelector('a[href$="/photo"] img[src*="profile_images"]');
      if (profileImg) {
        data.profileImageUrl = profileImg.src.replace(/_normal\./, '_400x400.');
      }

      const bannerImg = document.querySelector('a[href$="/header_photo"] img');
      if (bannerImg) {
        data.bannerImageUrl = bannerImg.src;
      }

    } catch (error) {
      console.error('[Flock] Error extracting profile data:', error);
    }

    return data;
  },

  parseCount(text) {
    if (!text) return null;
    const match = text.match(/([\d,.]+)\s*([KMB]?)/i);
    if (!match) return null;

    let num = parseFloat(match[1].replace(/,/g, ''));
    const suffix = match[2].toUpperCase();

    switch (suffix) {
      case 'K': num *= 1000; break;
      case 'M': num *= 1000000; break;
      case 'B': num *= 1000000000; break;
    }

    return Math.round(num);
  },

  formatCount(num) {
    if (num === null || num === undefined) return '—';
    if (num >= 1000000000) return (num / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return num.toString();
  },
};

// ================================
// UI COMPONENTS
// ================================

function showToast(message, type = 'success') {
  let container = document.querySelector('.flock-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'flock-toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `flock-toast flock-${type}`;
  toast.innerHTML = `
    <span class="flock-toast-icon">${Icons[type] || Icons.success}</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('flock-toast-out');
    setTimeout(() => toast.remove(), 200);
  }, 3000);
}

function formatRelativeTime(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
}

// ================================
// SIDEBAR COMPONENT
// ================================

class FlockSidebar {
  constructor() {
    this.element = null;
    this.currentContact = null;
    this.isOpen = false;
  }

  create() {
    if (this.element) return this.element;

    this.element = document.createElement('div');
    this.element.className = 'flock-sidebar';
    this.element.innerHTML = `
      <div class="flock-sidebar-header">
        <div class="flock-sidebar-title">
          ${Icons.logo}
          <span>Flock</span>
        </div>
        <button class="flock-sidebar-close" aria-label="Close sidebar">
          ${Icons.close}
        </button>
      </div>
      <div class="flock-sidebar-content">
        <div class="flock-sidebar-loading flock-loading">Loading...</div>
      </div>
    `;

    document.body.appendChild(this.element);

    // Close button
    this.element.querySelector('.flock-sidebar-close').addEventListener('click', () => this.close());

    // Close on escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) this.close();
    });

    return this.element;
  }

  async open(username) {
    this.create();
    this.isOpen = true;
    this.element.classList.add('flock-open');

    const content = this.element.querySelector('.flock-sidebar-content');
    content.innerHTML = '<div class="flock-loading" style="padding: 40px; text-align: center; color: var(--flock-text-secondary);">Loading...</div>';

    // Get contact data
    const contact = await getContact(username);
    const interactions = await getInteractionsForContact(username);

    if (!contact) {
      content.innerHTML = `
        <div class="flock-empty-state">
          ${Icons.note}
          <p class="flock-empty-state-text">This contact hasn't been saved yet.<br>Click "Save to Flock" to add them.</p>
        </div>
      `;
      return;
    }

    this.currentContact = contact;
    this.renderContent(contact, interactions);
  }

  renderContent(contact, interactions) {
    const content = this.element.querySelector('.flock-sidebar-content');

    const pipelineStages = ['new', 'contacted', 'engaged', 'qualified', 'won', 'lost'];

    content.innerHTML = `
      <div class="flock-profile-section flock-animate-in">
        <div class="flock-profile-header">
          <img class="flock-profile-avatar" src="${contact.profileImageUrl || ''}" alt="${contact.displayName}" onerror="this.style.display='none'">
          <div class="flock-profile-info">
            <div class="flock-profile-name">${contact.displayName || contact.username}</div>
            <div class="flock-profile-username">@${contact.username}</div>
          </div>
        </div>

        ${contact.bio ? `<div class="flock-profile-bio">${contact.bio}</div>` : ''}

        <div class="flock-profile-stats">
          <div class="flock-stat">
            <span class="flock-stat-value">${TwitterParser.formatCount(contact.followersCount)}</span>
            <span class="flock-stat-label">followers</span>
          </div>
          <div class="flock-stat">
            <span class="flock-stat-value">${TwitterParser.formatCount(contact.followingCount)}</span>
            <span class="flock-stat-label">following</span>
          </div>
        </div>

        <div class="flock-pipeline-section">
          <div class="flock-section-label">Pipeline Stage</div>
          <div class="flock-pipeline-stages">
            ${pipelineStages.map(stage => `
              <button class="flock-pipeline-stage ${contact.pipelineStage === stage ? 'flock-active' : ''}" data-stage="${stage}">
                ${stage.charAt(0).toUpperCase() + stage.slice(1)}
              </button>
            `).join('')}
          </div>
        </div>

        <div class="flock-tags-section">
          <div class="flock-section-label">Tags</div>
          <div class="flock-tags-container">
            ${(contact.tags || []).map(tag => `
              <span class="flock-tag">
                ${tag}
                <button class="flock-tag-remove" data-tag="${tag}" aria-label="Remove tag">
                  ${Icons.close}
                </button>
              </span>
            `).join('')}
            <button class="flock-add-tag">
              ${Icons.plus}
              Add tag
            </button>
          </div>
        </div>

        <div class="flock-notes-section">
          <div class="flock-section-label">Notes</div>
          <textarea class="flock-notes-textarea" placeholder="Add notes about this contact...">${contact.notes || ''}</textarea>
        </div>

        <div class="flock-interactions-section">
          <div class="flock-interactions-header">
            <div class="flock-section-label">Interactions</div>
            <button class="flock-add-interaction">
              ${Icons.plus}
              Log interaction
            </button>
          </div>
          <div class="flock-interaction-list">
            ${interactions.length > 0 ? interactions.map(int => `
              <div class="flock-interaction-item">
                <div class="flock-interaction-icon flock-type-${int.type}">
                  ${Icons[int.type] || Icons.note}
                </div>
                <div class="flock-interaction-content">
                  <div class="flock-interaction-text">${int.content || 'No content'}</div>
                  <div class="flock-interaction-meta">
                    <span class="flock-interaction-type">${int.type}</span>
                    <span class="flock-interaction-time">${formatRelativeTime(int.timestamp)}</span>
                  </div>
                </div>
              </div>
            `).join('') : `
              <div class="flock-empty-state" style="padding: 20px;">
                <p class="flock-empty-state-text">No interactions logged yet.</p>
              </div>
            `}
          </div>
        </div>
      </div>
    `;

    // Event listeners
    this.attachEventListeners(contact);
  }

  attachEventListeners(contact) {
    // Pipeline stage selection
    this.element.querySelectorAll('.flock-pipeline-stage').forEach(btn => {
      btn.addEventListener('click', async () => {
        const stage = btn.dataset.stage;
        await updateContact(contact.username, { pipelineStage: stage });

        // Update UI
        this.element.querySelectorAll('.flock-pipeline-stage').forEach(b => b.classList.remove('flock-active'));
        btn.classList.add('flock-active');

        showToast(`Moved to ${stage}`, 'success');
      });
    });

    // Notes auto-save
    const notesTextarea = this.element.querySelector('.flock-notes-textarea');
    let notesTimeout;
    notesTextarea.addEventListener('input', () => {
      clearTimeout(notesTimeout);
      notesTimeout = setTimeout(async () => {
        await updateContact(contact.username, { notes: notesTextarea.value });
        showToast('Notes saved', 'success');
      }, 1000);
    });

    // Add tag
    this.element.querySelector('.flock-add-tag').addEventListener('click', async () => {
      const tag = prompt('Enter tag name:');
      if (!tag) return;

      const currentTags = contact.tags || [];
      if (currentTags.includes(tag)) {
        showToast('Tag already exists', 'warning');
        return;
      }

      const newTags = [...currentTags, tag];
      await updateContact(contact.username, { tags: newTags });
      contact.tags = newTags;

      // Refresh interactions
      const interactions = await getInteractionsForContact(contact.username);
      this.renderContent(contact, interactions);

      showToast(`Added tag: ${tag}`, 'success');
    });

    // Remove tag
    this.element.querySelectorAll('.flock-tag-remove').forEach(btn => {
      btn.addEventListener('click', async () => {
        const tagToRemove = btn.dataset.tag;
        const newTags = (contact.tags || []).filter(t => t !== tagToRemove);
        await updateContact(contact.username, { tags: newTags });
        contact.tags = newTags;

        // Refresh
        const interactions = await getInteractionsForContact(contact.username);
        this.renderContent(contact, interactions);

        showToast(`Removed tag: ${tagToRemove}`, 'success');
      });
    });

    // Log interaction
    this.element.querySelector('.flock-add-interaction').addEventListener('click', async () => {
      const content = prompt('Describe the interaction:');
      if (!content) return;

      const type = prompt('Type (note/dm/reply/call/meeting):', 'note');
      if (!type) return;

      await logInteraction(contact.username, type, content);

      // Refresh
      const interactions = await getInteractionsForContact(contact.username);
      this.renderContent(contact, interactions);

      showToast('Interaction logged', 'success');
    });
  }

  close() {
    this.isOpen = false;
    this.element?.classList.remove('flock-open');
  }

  toggle(username) {
    if (this.isOpen && this.currentContact?.username === username) {
      this.close();
    } else {
      this.open(username);
    }
  }
}

const sidebar = new FlockSidebar();

// ================================
// SAVE BUTTON - Twitter-native styling
// ================================

let activeDropdown = null;

function closeActiveDropdown() {
  if (activeDropdown) {
    activeDropdown.remove();
    activeDropdown = null;
  }
  document.removeEventListener('click', handleOutsideClick);
}

function handleOutsideClick(e) {
  if (activeDropdown && !activeDropdown.contains(e.target) && !e.target.closest('.flock-btn')) {
    closeActiveDropdown();
  }
}

async function injectSaveButton() {
  if (!TwitterParser.isProfilePage()) return;
  if (document.querySelector('.flock-btn')) return;

  const username = TwitterParser.getCurrentUsername();
  if (!username) return;

  // Find the user actions area (where Follow button is)
  const userActions = document.querySelector('[data-testid="userActions"]');
  if (!userActions) {
    setTimeout(injectSaveButton, 500);
    return;
  }

  // Check if already saved
  const existingContact = await getContact(username);
  const isSaved = !!existingContact;

  // Create button matching Twitter's button style
  const btn = document.createElement('button');
  btn.className = `flock-btn ${isSaved ? 'flock-saved' : ''}`;
  btn.setAttribute('type', 'button');
  btn.setAttribute('aria-label', isSaved ? 'Saved to Flock' : 'Save to Flock');
  btn.innerHTML = isSaved ? Icons.bookmarkFilled : Icons.bookmark;

  // Click handler - show dropdown
  btn.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (activeDropdown) {
      closeActiveDropdown();
      return;
    }

    const contact = await getContact(username);
    const dropdown = document.createElement('div');
    dropdown.className = 'flock-dropdown';

    if (contact) {
      dropdown.innerHTML = `
        <div class="flock-dropdown-header">Saved to Flock</div>
        <button class="flock-dropdown-item" data-action="open">
          ${Icons.note}
          <span>View details</span>
        </button>
        <button class="flock-dropdown-item" data-action="stage">
          ${Icons.check}
          <span>Pipeline: ${contact.pipelineStage || 'new'}</span>
        </button>
        <button class="flock-dropdown-item" data-action="note">
          ${Icons.plus}
          <span>Quick note</span>
        </button>
        <div class="flock-dropdown-divider"></div>
        <button class="flock-dropdown-item flock-danger" data-action="remove">
          ${Icons.close}
          <span>Remove</span>
        </button>
      `;
    } else {
      dropdown.innerHTML = `
        <button class="flock-dropdown-item flock-primary" data-action="save">
          ${Icons.plus}
          <span>Save to Flock</span>
        </button>
      `;
    }

    // Position dropdown below button
    const rect = btn.getBoundingClientRect();
    dropdown.style.top = `${rect.bottom + 4}px`;
    dropdown.style.left = `${Math.max(rect.left - 100, 10)}px`;

    document.body.appendChild(dropdown);
    activeDropdown = dropdown;

    // Handle dropdown actions
    dropdown.querySelectorAll('.flock-dropdown-item').forEach(item => {
      item.addEventListener('click', async (ev) => {
        ev.stopPropagation();
        const action = item.dataset.action;

        if (action === 'save') {
          item.innerHTML = `${Icons.spinner}<span>Saving...</span>`;
          try {
            const profileData = TwitterParser.extractProfileData();
            await saveContact(profileData);
            btn.classList.add('flock-saved');
            btn.innerHTML = Icons.bookmarkFilled;
            showToast(`Saved @${username}`, 'success');
          } catch (err) {
            showToast('Failed to save', 'error');
          }
          closeActiveDropdown();
        } else if (action === 'open') {
          closeActiveDropdown();
          sidebar.open(username);
        } else if (action === 'note') {
          closeActiveDropdown();
          const note = prompt('Note:');
          if (note) {
            await logInteraction(username, 'note', note);
            showToast('Note added', 'success');
          }
        } else if (action === 'stage') {
          closeActiveDropdown();
          const stages = ['new', 'contacted', 'engaged', 'qualified', 'won', 'lost'];
          const newStage = prompt(`Stage (${stages.join('/')}):`);
          if (newStage && stages.includes(newStage)) {
            await updateContact(username, { pipelineStage: newStage });
            showToast(`Moved to ${newStage}`, 'success');
          }
        } else if (action === 'remove') {
          closeActiveDropdown();
          btn.classList.remove('flock-saved');
          btn.innerHTML = Icons.bookmark;
          showToast('Removed', 'success');
        }
      });
    });

    setTimeout(() => document.addEventListener('click', handleOutsideClick), 0);
  });

  // Insert at start of actions container (same row as other buttons)
  const container = userActions.parentElement;
  container.insertBefore(btn, container.firstChild);
}

// ================================
// FLOATING ACTION BUTTON
// ================================

function createFAB() {
  if (document.querySelector('.flock-fab')) return;

  const fab = document.createElement('button');
  fab.className = 'flock-fab';
  fab.innerHTML = Icons.logo;
  fab.title = 'Open Flock';

  fab.addEventListener('click', () => {
    // Open popup or dashboard
    chrome.runtime.sendMessage({ action: 'openPopup' });
  });

  document.body.appendChild(fab);
}

// ================================
// NAVIGATION OBSERVER
// ================================

function observeNavigation() {
  let lastUrl = window.location.href;

  const observer = new MutationObserver(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      handleNavigation();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  return observer;
}

function handleNavigation() {
  // Remove existing button
  const existingBtn = document.querySelector('.flock-btn');
  if (existingBtn) existingBtn.remove();

  // Close dropdown and sidebar
  closeActiveDropdown();
  sidebar.close();

  // Re-inject if on profile page
  if (TwitterParser.isProfilePage()) {
    setTimeout(injectSaveButton, 500);
  }
}

// ================================
// INITIALIZATION
// ================================

async function init() {
  console.log('[Flock] Initializing...');

  try {
    await initDB();
    console.log('[Flock] Database initialized');

    // Initial injection
    injectSaveButton();

    // Observe navigation
    observeNavigation();

    console.log('[Flock] Ready');
  } catch (error) {
    console.error('[Flock] Initialization error:', error);
  }
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

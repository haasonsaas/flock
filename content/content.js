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
  // AI/Agent icons
  sparkle: `<svg viewBox="0 0 24 24"><path d="M12 2L14 8L20 10L14 12L12 18L10 12L4 10L10 8L12 2Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round" fill="none"/><path d="M19 15L20 17L22 18L20 19L19 21L18 19L16 18L18 17L19 15Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" fill="none"/></svg>`,
  brain: `<svg viewBox="0 0 24 24"><path d="M12 4.5c-3 0-5 2-5 4.5 0 1.5.5 2.5 1 3.5.5 1 1 2 1 3v2a2 2 0 002 2h2a2 2 0 002-2v-2c0-1 .5-2 1-3s1-2 1-3.5c0-2.5-2-4.5-5-4.5z" stroke="currentColor" stroke-width="2" fill="none"/><path d="M9 17.5h6M9 15h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  lightning: `<svg viewBox="0 0 24 24"><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" stroke="currentColor" stroke-width="2" stroke-linejoin="round" fill="none"/></svg>`,
  briefcase: `<svg viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2" stroke="currentColor" stroke-width="2" fill="none"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" stroke="currentColor" stroke-width="2"/></svg>`,
  link: `<svg viewBox="0 0 24 24"><path d="M10 14a5 5 0 007-7l-2-2a5 5 0 00-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/><path d="M14 10a5 5 0 00-7 7l2 2a5 5 0 007-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/></svg>`,
  globe: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/><path d="M2 12h20M12 2a15 15 0 010 20 15 15 0 010-20" stroke="currentColor" stroke-width="2" fill="none"/></svg>`,
  // Interaction icons
  like: `<svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" stroke="currentColor" stroke-width="2" fill="none"/></svg>`,
  retweet: `<svg viewBox="0 0 24 24"><path d="M17 1l4 4-4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M3 11V9a4 4 0 014-4h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M7 23l-4-4 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M21 13v2a4 4 0 01-4 4H3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`,
  reply: `<svg viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`,
  quote: `<svg viewBox="0 0 24 24"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21z" stroke="currentColor" stroke-width="2" fill="none"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v4z" stroke="currentColor" stroke-width="2" fill="none"/></svg>`,
  follow: `<svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/><circle cx="9" cy="7" r="4" stroke="currentColor" stroke-width="2" fill="none"/><path d="M19 8v6M22 11h-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`,
  view: `<svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2" fill="none"/></svg>`,
  dm: `<svg viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" stroke-width="2" fill="none"/><path d="M22 6l-10 7L2 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`,
  bookmark: `<svg viewBox="0 0 24 24"><path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" stroke="currentColor" stroke-width="2" fill="none"/></svg>`,
};

// ================================
// AI API (via background worker)
// ================================
const FlockAgent = {
  available: null,

  async checkAvailability() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'checkAiAvailable' }, (response) => {
        this.available = response?.available || false;
        resolve(this.available);
      });
    });
  },

  async enrichContact(contact) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'enrichContact', contact }, (response) => {
        if (response?.success) {
          resolve(response.data);
        } else {
          resolve({ error: response?.error || 'Failed to enrich contact' });
        }
      });
    });
  },

  async generateBrief(contact, interactions = []) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'generateBrief', contact, interactions }, (response) => {
        if (response?.success) {
          resolve(response.data);
        } else {
          resolve({ error: response?.error || 'Failed to generate brief' });
        }
      });
    });
  },

  async suggestFollowUp(contact, interactions = []) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'suggestFollowUp', contact, interactions }, (response) => {
        if (response?.success) {
          resolve(response.data);
        } else {
          resolve({ error: response?.error || 'Failed to get suggestions' });
        }
      });
    });
  }
};

// ================================
// STORAGE (using chrome.storage.local for cross-context sharing)
// ================================

async function getAllContacts() {
  const result = await chrome.storage.local.get('contacts');
  return result.contacts || {};
}

async function saveAllContacts(contacts) {
  await chrome.storage.local.set({ contacts });
}

async function saveContact(contact) {
  const contacts = await getAllContacts();
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

  contacts[contact.username] = enrichedContact;
  await saveAllContacts(contacts);
  return enrichedContact;
}

async function getContact(username) {
  const contacts = await getAllContacts();
  return contacts[username] || null;
}

async function updateContact(username, updates) {
  const existing = await getContact(username);
  if (!existing) throw new Error(`Contact ${username} not found`);
  return saveContact({ ...existing, ...updates });
}

async function deleteContact(username) {
  const contacts = await getAllContacts();
  delete contacts[username];
  await saveAllContacts(contacts);
}

async function getAllInteractions() {
  const result = await chrome.storage.local.get('interactions');
  return result.interactions || {};
}

async function saveAllInteractions(interactions) {
  await chrome.storage.local.set({ interactions });
}

async function getInteractionsForContact(username) {
  const interactions = await getAllInteractions();
  const contactInteractions = Object.values(interactions)
    .filter(i => i.contactUsername === username)
    .sort((a, b) => b.timestamp - a.timestamp);
  return contactInteractions;
}

async function logInteraction(contactUsername, type, content = '', metadata = {}) {
  const interactions = await getAllInteractions();
  const interaction = {
    id: `int_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
    contactUsername,
    type,
    content,
    metadata,
    timestamp: Date.now(),
  };

  interactions[interaction.id] = interaction;
  await saveAllInteractions(interactions);

  try {
    await updateContact(contactUsername, { lastInteraction: Date.now() });
  } catch (e) {
    // Contact might not exist yet
  }

  return interaction;
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

    // Check if we have enriched data
    const enriched = contact.enrichedData || {};
    const hasEnrichedData = enriched.company || enriched.role || enriched.linkedin;

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

        <!-- AI Enrichment Section -->
        <div class="flock-ai-section">
          <div class="flock-section-header">
            <div class="flock-section-label">
              ${Icons.sparkle}
              <span>AI Insights</span>
            </div>
            <button class="flock-enrich-btn ${hasEnrichedData ? 'flock-enriched' : ''}" data-action="enrich">
              ${hasEnrichedData ? 'Refresh' : 'Enrich'}
            </button>
          </div>

          ${hasEnrichedData ? `
            <div class="flock-enriched-data">
              ${enriched.company ? `
                <div class="flock-enriched-item">
                  ${Icons.briefcase}
                  <div>
                    <span class="flock-enriched-label">Company</span>
                    <span class="flock-enriched-value">${enriched.company}</span>
                  </div>
                </div>
              ` : ''}
              ${enriched.role ? `
                <div class="flock-enriched-item">
                  ${Icons.brain}
                  <div>
                    <span class="flock-enriched-label">Role</span>
                    <span class="flock-enriched-value">${enriched.role}</span>
                  </div>
                </div>
              ` : ''}
              ${enriched.industry ? `
                <div class="flock-enriched-item">
                  ${Icons.globe}
                  <div>
                    <span class="flock-enriched-label">Industry</span>
                    <span class="flock-enriched-value">${enriched.industry}</span>
                  </div>
                </div>
              ` : ''}
              ${enriched.linkedin ? `
                <div class="flock-enriched-item">
                  ${Icons.link}
                  <div>
                    <span class="flock-enriched-label">LinkedIn</span>
                    <a href="${enriched.linkedin}" target="_blank" class="flock-enriched-link">${enriched.linkedin.replace('https://www.linkedin.com/in/', '')}</a>
                  </div>
                </div>
              ` : ''}
              ${enriched.talkingPoints?.length ? `
                <div class="flock-talking-points">
                  <span class="flock-enriched-label">Talking Points</span>
                  <ul>
                    ${enriched.talkingPoints.map(p => `<li>${p}</li>`).join('')}
                  </ul>
                </div>
              ` : ''}
              <div class="flock-enriched-meta">
                <span class="flock-confidence flock-confidence-${enriched.confidence || 'low'}">${enriched.confidence || 'low'} confidence</span>
              </div>
            </div>
          ` : `
            <div class="flock-enrich-prompt">
              <p>Click "Enrich" to research this contact with AI and discover:</p>
              <ul>
                <li>Company & Role</li>
                <li>LinkedIn Profile</li>
                <li>Industry & Interests</li>
                <li>Conversation Starters</li>
              </ul>
            </div>
          `}

          <!-- AI Actions -->
          <div class="flock-ai-actions">
            <button class="flock-ai-btn" data-action="brief">
              ${Icons.note}
              Meeting Brief
            </button>
            <button class="flock-ai-btn" data-action="followup">
              ${Icons.lightning}
              Follow-up Ideas
            </button>
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
    this.attachEventListeners(contact, interactions);
  }

  attachEventListeners(contact, interactions) {
    // AI Enrich button
    const enrichBtn = this.element.querySelector('.flock-enrich-btn');
    if (enrichBtn) {
      enrichBtn.addEventListener('click', async () => {
        enrichBtn.disabled = true;
        enrichBtn.innerHTML = `${Icons.spinner} Researching...`;
        enrichBtn.classList.add('flock-loading');

        try {
          const enrichedData = await FlockAgent.enrichContact(contact);

          if (enrichedData.error) {
            showToast(enrichedData.error, 'error');
            enrichBtn.innerHTML = 'Enrich';
            enrichBtn.disabled = false;
            enrichBtn.classList.remove('flock-loading');
            return;
          }

          // Save enriched data to contact
          await updateContact(contact.username, { enrichedData });
          contact.enrichedData = enrichedData;

          showToast('Contact enriched!', 'success');

          // Re-render to show enriched data
          this.renderContent(contact, interactions);
        } catch (error) {
          showToast(`Enrichment failed: ${error.message}`, 'error');
          enrichBtn.innerHTML = 'Enrich';
          enrichBtn.disabled = false;
          enrichBtn.classList.remove('flock-loading');
        }
      });
    }

    // AI Brief button
    const briefBtn = this.element.querySelector('[data-action="brief"]');
    if (briefBtn) {
      briefBtn.addEventListener('click', async () => {
        briefBtn.disabled = true;
        briefBtn.innerHTML = `${Icons.spinner} Generating...`;

        try {
          const result = await FlockAgent.generateBrief(contact, interactions);

          if (result.error) {
            showToast(result.error, 'error');
          } else {
            // Show brief in a modal
            this.showBriefModal(result.brief);
          }
        } catch (error) {
          showToast(`Brief failed: ${error.message}`, 'error');
        }

        briefBtn.innerHTML = `${Icons.note} Meeting Brief`;
        briefBtn.disabled = false;
      });
    }

    // AI Follow-up button
    const followupBtn = this.element.querySelector('[data-action="followup"]');
    if (followupBtn) {
      followupBtn.addEventListener('click', async () => {
        followupBtn.disabled = true;
        followupBtn.innerHTML = `${Icons.spinner} Thinking...`;

        try {
          const result = await FlockAgent.suggestFollowUp(contact, interactions);

          if (result.error) {
            showToast(result.error, 'error');
          } else {
            // Show suggestions in a modal
            this.showFollowUpModal(result);
          }
        } catch (error) {
          showToast(`Follow-up failed: ${error.message}`, 'error');
        }

        followupBtn.innerHTML = `${Icons.lightning} Follow-up Ideas`;
        followupBtn.disabled = false;
      });
    }

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

  showBriefModal(briefContent) {
    this.closeModal();

    const modal = document.createElement('div');
    modal.className = 'flock-modal';
    modal.innerHTML = `
      <div class="flock-modal-backdrop"></div>
      <div class="flock-modal-content">
        <div class="flock-modal-header">
          ${Icons.note}
          <span>Meeting Brief</span>
          <button class="flock-modal-close">${Icons.close}</button>
        </div>
        <div class="flock-modal-body flock-brief-content">
          ${this.formatMarkdown(briefContent)}
        </div>
        <div class="flock-modal-footer">
          <button class="flock-modal-btn flock-copy-btn">Copy to Clipboard</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Close handlers
    modal.querySelector('.flock-modal-backdrop').addEventListener('click', () => this.closeModal());
    modal.querySelector('.flock-modal-close').addEventListener('click', () => this.closeModal());

    // Copy handler
    modal.querySelector('.flock-copy-btn').addEventListener('click', () => {
      navigator.clipboard.writeText(briefContent);
      showToast('Copied to clipboard', 'success');
    });

    // Escape key
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        this.closeModal();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
  }

  showFollowUpModal(suggestion) {
    this.closeModal();

    const modal = document.createElement('div');
    modal.className = 'flock-modal';
    modal.innerHTML = `
      <div class="flock-modal-backdrop"></div>
      <div class="flock-modal-content">
        <div class="flock-modal-header">
          ${Icons.lightning}
          <span>Follow-up Suggestions</span>
          <button class="flock-modal-close">${Icons.close}</button>
        </div>
        <div class="flock-modal-body">
          <div class="flock-followup-urgency flock-urgency-${suggestion.urgency || 'medium'}">
            Urgency: ${(suggestion.urgency || 'medium').toUpperCase()}
          </div>

          <div class="flock-followup-section">
            <h4>Recommended Action</h4>
            <p>${suggestion.suggestedAction || 'No suggestion'}</p>
          </div>

          <div class="flock-followup-section">
            <h4>Channel</h4>
            <span class="flock-followup-channel">${suggestion.channel || 'DM'}</span>
          </div>

          <div class="flock-followup-section">
            <h4>Timing</h4>
            <p>${suggestion.timing || 'Soon'}</p>
          </div>

          ${suggestion.messageIdeas?.length ? `
            <div class="flock-followup-section">
              <h4>Message Ideas</h4>
              <ul class="flock-message-ideas">
                ${suggestion.messageIdeas.map(idea => `<li>${idea}</li>`).join('')}
              </ul>
            </div>
          ` : ''}

          ${suggestion.reason ? `
            <div class="flock-followup-section flock-followup-reason">
              <h4>Why</h4>
              <p>${suggestion.reason}</p>
            </div>
          ` : ''}
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Close handlers
    modal.querySelector('.flock-modal-backdrop').addEventListener('click', () => this.closeModal());
    modal.querySelector('.flock-modal-close').addEventListener('click', () => this.closeModal());

    // Escape key
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        this.closeModal();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
  }

  closeModal() {
    const modal = document.querySelector('.flock-modal');
    if (modal) modal.remove();
  }

  formatMarkdown(text) {
    if (!text) return '';
    // Basic markdown conversion
    return text
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/^\* (.+)$/gm, '<li>$1</li>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/^/, '<p>')
      .replace(/$/, '</p>');
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
// AUTO-TRACK INTERACTIONS
// ================================

const InteractionTracker = {
  trackedActions: new Map(),
  pendingRetweet: null,
  pendingQuote: null,
  pendingReplyTo: null,

  // Reserved usernames to filter out
  RESERVED_USERNAMES: new Set([
    'home', 'explore', 'search', 'notifications', 'messages', 'bookmarks',
    'lists', 'i', 'settings', 'compose', 'intent', 'tos', 'privacy',
    'topics', 'communities', 'premium', 'verified'
  ]),

  // Debounce to prevent duplicate tracking
  debounce(key, delay = 5000) {
    const now = Date.now();
    const lastTime = this.trackedActions.get(key);
    if (lastTime && now - lastTime < delay) {
      return false;
    }
    this.trackedActions.set(key, now);
    // Clean old entries periodically
    if (this.trackedActions.size > 200) {
      const cutoff = now - 120000;
      for (const [k, v] of this.trackedActions) {
        if (v < cutoff) this.trackedActions.delete(k);
      }
    }
    return true;
  },

  // Validate username format
  isValidUsername(username) {
    if (!username) return false;
    if (this.RESERVED_USERNAMES.has(username.toLowerCase())) return false;
    // Twitter usernames: 1-15 chars, alphanumeric + underscore
    return /^[A-Za-z0-9_]{1,15}$/.test(username);
  },

  // Extract username from href
  extractUsernameFromHref(href) {
    if (!href) return null;
    const match = href.match(/(?:twitter\.com|x\.com)\/([A-Za-z0-9_]{1,15})(?:\/|$|\?)/);
    if (match && this.isValidUsername(match[1])) {
      return match[1];
    }
    // Handle relative URLs
    const relMatch = href.match(/^\/([A-Za-z0-9_]{1,15})(?:\/|$|\?)/);
    if (relMatch && this.isValidUsername(relMatch[1])) {
      return relMatch[1];
    }
    return null;
  },

  // Extract username from a tweet element - robust multi-strategy detection
  getTweetAuthor(tweetElement) {
    if (!tweetElement) return null;

    // Strategy 1: Find the first profile link in User-Name area (most reliable)
    const userNameArea = tweetElement.querySelector('[data-testid="User-Name"]');
    if (userNameArea) {
      // Look for the @username link specifically
      const links = userNameArea.querySelectorAll('a[href^="/"]');
      for (const link of links) {
        const href = link.getAttribute('href');
        const username = this.extractUsernameFromHref(href);
        if (username) return username;
      }

      // Fallback: parse @username from text content
      const text = userNameArea.textContent || '';
      const atMatch = text.match(/@([A-Za-z0-9_]{1,15})/);
      if (atMatch && this.isValidUsername(atMatch[1])) {
        return atMatch[1];
      }
    }

    // Strategy 2: Find avatar link (usually links to profile)
    const avatarLink = tweetElement.querySelector('a[href^="/"][role="link"] img[src*="profile_images"]');
    if (avatarLink) {
      const link = avatarLink.closest('a');
      if (link) {
        const username = this.extractUsernameFromHref(link.href || link.getAttribute('href'));
        if (username) return username;
      }
    }

    // Strategy 3: First link in tweet that goes to a profile
    const allLinks = tweetElement.querySelectorAll('a[href^="/"]');
    for (const link of allLinks) {
      const href = link.getAttribute('href');
      // Skip status links, hashtags, etc
      if (href?.includes('/status/') || href?.includes('/hashtag/')) continue;
      const username = this.extractUsernameFromHref(href);
      if (username) return username;
    }

    // Strategy 4: Look for data attributes Twitter might use
    const authorAttr = tweetElement.getAttribute('data-screen-name') ||
                       tweetElement.querySelector('[data-screen-name]')?.getAttribute('data-screen-name');
    if (authorAttr && this.isValidUsername(authorAttr)) {
      return authorAttr;
    }

    console.log('[Flock] Could not extract tweet author');
    return null;
  },

  // Get DM conversation partner username - multi-strategy
  getDMPartner() {
    // Strategy 1: Conversation header links
    const headerSelectors = [
      '[data-testid="DMDrawerHeader"] a[href^="/"]',
      '[data-testid="DMConversationHeader"] a[href^="/"]',
      '[data-testid="conversation-header"] a[href^="/"]',
      '[data-testid="DM_Conversation_Avatar"]',
    ];

    for (const selector of headerSelectors) {
      const elements = document.querySelectorAll(selector);
      for (const el of elements) {
        const link = el.closest('a') || el.querySelector('a') || el;
        const href = link.href || link.getAttribute('href');
        const username = this.extractUsernameFromHref(href);
        if (username) return username;
      }
    }

    // Strategy 2: Parse from URL if in a DM conversation
    const urlMatch = window.location.pathname.match(/\/messages\/(\d+-\d+)/);
    if (urlMatch) {
      // Can't get username from conversation ID, try header text
      const header = document.querySelector('[data-testid="DMDrawerHeader"], [data-testid="DMConversationHeader"]');
      if (header) {
        const links = header.querySelectorAll('a[href^="/"]');
        for (const link of links) {
          const href = link.getAttribute('href');
          if (href && !href.includes('/messages')) {
            const username = this.extractUsernameFromHref(href);
            if (username) return username;
          }
        }
      }
    }

    // Strategy 3: Look in the conversation area for the other person's avatar/name
    const conversationArea = document.querySelector('[data-testid="DMConversation"], [data-testid="DmActivityViewport"]');
    if (conversationArea) {
      const profileLinks = conversationArea.querySelectorAll('a[href^="/"]:not([href*="/messages"])');
      for (const link of profileLinks) {
        const username = this.extractUsernameFromHref(link.getAttribute('href'));
        if (username) return username;
      }
    }

    console.log('[Flock] Could not detect DM partner');
    return null;
  },

  // Get username from profile being viewed
  getProfileUsername() {
    const path = window.location.pathname;
    const match = path.match(/^\/([A-Za-z0-9_]{1,15})(?:\/|$)/);
    if (match && this.isValidUsername(match[1])) {
      return match[1];
    }
    return null;
  },

  // Check if a button is in "active" state (already liked/retweeted)
  isButtonActive(button) {
    if (!button) return false;

    // Check aria-label for state hints
    const ariaLabel = button.getAttribute('aria-label')?.toLowerCase() || '';
    if (ariaLabel.includes('unlike') || ariaLabel.includes('undo')) return true;

    // Check for color change (pink/red for likes, green for retweets)
    const svg = button.querySelector('svg');
    if (svg) {
      const color = window.getComputedStyle(svg).color;
      // Pink/red indicates liked
      if (color.includes('rgb(249, 24, 128)') || color.includes('rgb(244, 33, 46)')) return true;
      // Green indicates retweeted
      if (color.includes('rgb(0, 186, 124)')) return true;
    }

    // Check data attributes
    if (button.getAttribute('data-testid')?.includes('unlike')) return true;

    return false;
  },

  async trackInteraction(type, username, description, extraMeta = {}) {
    if (!username || !this.isValidUsername(username)) {
      console.log(`[Flock] Invalid username for ${type}: ${username}`);
      return false;
    }

    const contact = await getContact(username);
    if (!contact) {
      // Only track for saved contacts - privacy preserving
      return false;
    }

    // Use a unique key for deduplication
    const key = `${type}-${username}-${Math.floor(Date.now() / 10000)}`;
    if (!this.debounce(key)) {
      console.log(`[Flock] Debounced: ${type} for @${username}`);
      return false;
    }

    await logInteraction(username, type, description, {
      url: window.location.href,
      auto: true,
      ...extraMeta
    });

    console.log(`[Flock] Tracked: ${type} → @${username}`);
    showToast(`Tracked: ${description}`, 'success');
    return true;
  },

  // Track like with state verification
  async trackLike(tweetElement) {
    const author = this.getTweetAuthor(tweetElement);
    if (!author) return;

    // Wait a moment for state to update, then verify it's now liked
    setTimeout(async () => {
      // Find the current state of the like button
      const currentButton = tweetElement.querySelector('[data-testid="like"], [data-testid="unlike"]');
      const isNowLiked = currentButton?.getAttribute('data-testid') === 'unlike' ||
                         this.isButtonActive(currentButton);

      if (isNowLiked) {
        await this.trackInteraction('like', author, `Liked @${author}'s tweet`);
      }
    }, 400);
  },

  async trackRetweet(tweetElement) {
    const author = this.getTweetAuthor(tweetElement);
    if (!author) return;
    await this.trackInteraction('retweet', author, `Retweeted @${author}`);
  },

  async trackReply(tweetElement) {
    const author = this.getTweetAuthor(tweetElement);
    if (!author) return;
    await this.trackInteraction('reply', author, `Replied to @${author}`);
  },

  async trackQuote(tweetElement) {
    const author = this.getTweetAuthor(tweetElement);
    if (!author) return;
    await this.trackInteraction('quote', author, `Quoted @${author}`);
  },

  async trackBookmark(tweetElement) {
    const author = this.getTweetAuthor(tweetElement);
    if (!author) return;
    await this.trackInteraction('bookmark', author, `Bookmarked @${author}'s tweet`);
  },

  async trackDM() {
    const partner = this.getDMPartner();
    if (!partner) return;
    await this.trackInteraction('dm', partner, `DM to @${partner}`);
  },

  async trackFollow(username) {
    if (!username) return;
    await this.trackInteraction('follow', username, `Followed @${username}`);
  },

  async trackProfileView() {
    const username = this.getProfileUsername();
    if (!username) return;

    const contact = await getContact(username);
    if (!contact) return;

    // Only track once per session per profile
    const key = `view-${username}-session`;
    if (this.trackedActions.has(key)) return;
    this.trackedActions.set(key, Date.now());

    await logInteraction(username, 'view', `Viewed profile`, {
      url: window.location.href,
      auto: true
    });
    console.log(`[Flock] Tracked: Viewed @${username}'s profile`);
  },

  observeInteractions() {
    // Use capturing phase to catch events early
    document.addEventListener('click', async (e) => {
      const target = e.target;

      // Track likes - detect click on like button
      const likeButton = target.closest('[data-testid="like"]');
      if (likeButton) {
        const tweet = likeButton.closest('article');
        if (tweet) {
          // Check if it's already liked (clicking to unlike)
          if (!this.isButtonActive(likeButton)) {
            this.trackLike(tweet);
          }
        }
        return;
      }

      // Track unlikes are ignored (we only track positive interactions)

      // Track retweet button click (opens menu)
      const retweetButton = target.closest('[data-testid="retweet"]');
      if (retweetButton) {
        const tweet = retweetButton.closest('article');
        if (tweet && !this.isButtonActive(retweetButton)) {
          this.pendingRetweet = tweet;
        }
        return;
      }

      // Track retweet confirmation from dropdown
      const retweetConfirm = target.closest('[data-testid="retweetConfirm"]');
      if (retweetConfirm && this.pendingRetweet) {
        setTimeout(() => {
          this.trackRetweet(this.pendingRetweet);
          this.pendingRetweet = null;
        }, 400);
        return;
      }

      // Track quote tweet option from dropdown
      const menuItem = target.closest('[role="menuitem"]');
      if (menuItem && this.pendingRetweet) {
        const text = menuItem.textContent?.toLowerCase() || '';
        if (text.includes('quote')) {
          this.pendingQuote = this.pendingRetweet;
          this.pendingRetweet = null;
        }
        return;
      }

      // Track reply button click
      const replyButton = target.closest('[data-testid="reply"]');
      if (replyButton) {
        const tweet = replyButton.closest('article');
        if (tweet) {
          this.pendingReplyTo = tweet;
        }
        return;
      }

      // Track tweet send (for replies/quotes)
      const tweetButton = target.closest('[data-testid="tweetButton"], [data-testid="tweetButtonInline"]');
      if (tweetButton) {
        setTimeout(() => {
          if (this.pendingReplyTo) {
            this.trackReply(this.pendingReplyTo);
            this.pendingReplyTo = null;
          }
          if (this.pendingQuote) {
            this.trackQuote(this.pendingQuote);
            this.pendingQuote = null;
          }
        }, 600);
        return;
      }

      // Track bookmark button click
      const bookmarkButton = target.closest('[data-testid="bookmark"]');
      if (bookmarkButton) {
        const tweet = bookmarkButton.closest('article');
        if (tweet && !this.isButtonActive(bookmarkButton)) {
          setTimeout(() => this.trackBookmark(tweet), 400);
        }
        return;
      }

      // Track DM sends
      const dmSendButton = target.closest('[data-testid="dmComposerSendButton"]');
      if (dmSendButton) {
        setTimeout(() => this.trackDM(), 400);
        return;
      }

      // Track follows (on profile pages)
      const followButton = target.closest('[data-testid$="-follow"]');
      if (followButton) {
        const testId = followButton.getAttribute('data-testid') || '';
        // Only track follows, not unfollows
        if (!testId.includes('unfollow')) {
          const username = this.getProfileUsername();
          if (username) {
            setTimeout(() => this.trackFollow(username), 400);
          }
        }
        return;
      }
    }, true);

    // Also observe keyboard interactions (Enter key to send)
    document.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        // Check if in DM composer
        const dmInput = e.target.closest('[data-testid="dmComposerTextInput"]');
        if (dmInput) {
          setTimeout(() => this.trackDM(), 400);
        }
      }
    }, true);

    // Track profile views when navigating
    let lastTrackedProfile = null;
    const checkProfileView = () => {
      if (TwitterParser.isProfilePage()) {
        const username = this.getProfileUsername();
        if (username && username !== lastTrackedProfile) {
          lastTrackedProfile = username;
          this.trackProfileView();
        }
      } else {
        lastTrackedProfile = null;
      }
    };

    // Observe URL changes for profile tracking
    let lastUrl = window.location.href;
    const urlObserver = new MutationObserver(() => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        setTimeout(checkProfileView, 500);
      }
    });
    urlObserver.observe(document.body, { childList: true, subtree: true });

    // Initial profile check
    setTimeout(checkProfileView, 1000);

    console.log('[Flock] Interaction tracking enabled (likes, retweets, replies, quotes, bookmarks, DMs, follows, profile views)');
  }
};

// ================================
// KEYBOARD SHORTCUTS
// ================================

const KeyboardShortcuts = {
  shortcuts: {
    'cmd+shift+s': 'saveProfile',
    'ctrl+shift+s': 'saveProfile',
    'cmd+shift+f': 'openSidebar',
    'ctrl+shift+f': 'openSidebar',
    'cmd+shift+t': 'openTemplates',
    'ctrl+shift+t': 'openTemplates',
  },

  init() {
    document.addEventListener('keydown', (e) => this.handleKeydown(e));
    console.log('[Flock] Keyboard shortcuts enabled (Cmd/Ctrl+Shift+S: Save, Cmd/Ctrl+Shift+F: Sidebar, Cmd/Ctrl+Shift+T: Templates)');
  },

  getKeyCombo(e) {
    const parts = [];
    if (e.metaKey) parts.push('cmd');
    if (e.ctrlKey) parts.push('ctrl');
    if (e.shiftKey) parts.push('shift');
    if (e.altKey) parts.push('alt');
    parts.push(e.key.toLowerCase());
    return parts.join('+');
  },

  async handleKeydown(e) {
    const combo = this.getKeyCombo(e);
    const action = this.shortcuts[combo];

    if (!action) return;

    e.preventDefault();
    e.stopPropagation();

    switch (action) {
      case 'saveProfile':
        await this.saveCurrentProfile();
        break;
      case 'openSidebar':
        await this.openCurrentSidebar();
        break;
      case 'openTemplates':
        DMTemplates.showPicker();
        break;
    }
  },

  async saveCurrentProfile() {
    if (!TwitterParser.isProfilePage()) {
      showToast('Navigate to a profile to save', 'error');
      return;
    }

    const username = TwitterParser.getCurrentUsername();
    const existing = await getContact(username);

    if (existing) {
      showToast(`@${username} already saved`, 'success');
      sidebar.open(username);
      return;
    }

    const profileData = TwitterParser.extractProfileData();
    if (profileData) {
      await saveContact(profileData);
      showToast(`Saved @${username}`, 'success');

      // Update button UI if present
      const btn = document.querySelector('.flock-btn');
      if (btn) {
        btn.classList.add('flock-saved');
        btn.innerHTML = Icons.bookmarkFilled;
      }
    }
  },

  async openCurrentSidebar() {
    if (!TwitterParser.isProfilePage()) {
      showToast('Navigate to a profile first', 'error');
      return;
    }

    const username = TwitterParser.getCurrentUsername();
    sidebar.toggle(username);
  }
};

// ================================
// DM TEMPLATES
// ================================

const DMTemplates = {
  defaultTemplates: [
    {
      id: 'specific-praise',
      name: 'Specific praise',
      text: "Your thread on {topic} was one of the best breakdowns I've read. The part about {specific} clicked for me."
    },
    {
      id: 'quick-question',
      name: 'Quick question',
      text: "Hey {name} - quick q: {question}? No pressure if you're slammed."
    },
    {
      id: 'share-resource',
      name: 'Share something',
      text: "Saw your post about {topic}. This might be useful: {link}"
    },
    {
      id: 'intro-mutual',
      name: 'Mutual connection',
      text: "Hey {name}, {mutual} mentioned you're working on {topic}. I'm building something similar - would be cool to swap notes."
    },
    {
      id: 'offer-help',
      name: 'Offer help',
      text: "Noticed you're working on {topic}. I spent 2 years doing {related} - happy to share what worked (and what didn't) if helpful."
    },
    {
      id: 'simple-follow',
      name: 'Simple follow-up',
      text: "Hey, circling back on this ^"
    }
  ],

  async getTemplates() {
    const result = await chrome.storage.local.get('dmTemplates');
    return result.dmTemplates || this.defaultTemplates;
  },

  async saveTemplates(templates) {
    await chrome.storage.local.set({ dmTemplates: templates });
  },

  async addTemplate(name, text) {
    const templates = await this.getTemplates();
    templates.push({
      id: `custom_${Date.now()}`,
      name,
      text
    });
    await this.saveTemplates(templates);
    return templates;
  },

  fillPlaceholders(text, contact) {
    // Highlight unfilled placeholders in brackets
    return text
      .replace(/{name}/g, contact?.displayName?.split(' ')[0] || '[name]')
      .replace(/{fullname}/g, contact?.displayName || '[name]')
      .replace(/{username}/g, contact?.username ? `@${contact.username}` : '[username]')
      .replace(/{company}/g, contact?.enrichedData?.company || '[company]')
      .replace(/{role}/g, contact?.enrichedData?.role || '[role]')
      // Keep these as placeholders for user to fill
      .replace(/{topic}/g, '[topic]')
      .replace(/{specific}/g, '[specific thing]')
      .replace(/{question}/g, '[your question]')
      .replace(/{link}/g, '[link]')
      .replace(/{mutual}/g, '[mutual connection]')
      .replace(/{related}/g, '[related experience]');
  },

  showPicker(targetInput = null) {
    // Remove existing picker
    this.closePicker();

    // Find DM input if not provided
    if (!targetInput) {
      targetInput = document.querySelector('[data-testid="dmComposerTextInput"]');
    }

    if (!targetInput) {
      showToast('Open a DM conversation first', 'error');
      return;
    }

    this.createPickerUI(targetInput);
  },

  async createPickerUI(targetInput) {
    const templates = await this.getTemplates();
    const partner = InteractionTracker.getDMPartner();
    const contact = partner ? await getContact(partner) : null;

    const picker = document.createElement('div');
    picker.className = 'flock-template-picker';
    picker.innerHTML = `
      <div class="flock-template-header">
        <span class="flock-template-title">${Icons.message} Quick Templates</span>
        <button class="flock-template-close">${Icons.close}</button>
      </div>
      <div class="flock-template-list">
        ${templates.map(t => `
          <button class="flock-template-item" data-template-id="${t.id}">
            <span class="flock-template-name">${t.name}</span>
            <span class="flock-template-preview">${this.fillPlaceholders(t.text, contact).substring(0, 50)}...</span>
          </button>
        `).join('')}
      </div>
      <div class="flock-template-footer">
        <button class="flock-template-add">
          ${Icons.plus} New Template
        </button>
      </div>
    `;

    // Position near the input
    const rect = targetInput.getBoundingClientRect();
    picker.style.position = 'fixed';
    picker.style.bottom = `${window.innerHeight - rect.top + 10}px`;
    picker.style.left = `${rect.left}px`;
    picker.style.zIndex = '10001';

    document.body.appendChild(picker);

    // Event handlers
    picker.querySelector('.flock-template-close').addEventListener('click', () => this.closePicker());

    picker.querySelectorAll('.flock-template-item').forEach(item => {
      item.addEventListener('click', async () => {
        const templateId = item.dataset.templateId;
        const template = templates.find(t => t.id === templateId);
        if (template) {
          const filledText = this.fillPlaceholders(template.text, contact);
          this.insertText(targetInput, filledText);
          this.closePicker();
          showToast('Template inserted', 'success');
        }
      });
    });

    picker.querySelector('.flock-template-add').addEventListener('click', async () => {
      const name = prompt('Template name:');
      if (!name) return;
      const text = prompt('Template text (use {name}, {username}, {topic} as placeholders):');
      if (!text) return;

      await this.addTemplate(name, text);
      showToast('Template saved!', 'success');
      this.closePicker();
    });

    // Close on outside click
    setTimeout(() => {
      document.addEventListener('click', this.handleOutsideClick);
    }, 100);
  },

  handleOutsideClick(e) {
    const picker = document.querySelector('.flock-template-picker');
    if (picker && !picker.contains(e.target)) {
      DMTemplates.closePicker();
    }
  },

  closePicker() {
    const picker = document.querySelector('.flock-template-picker');
    if (picker) picker.remove();
    document.removeEventListener('click', this.handleOutsideClick);
  },

  insertText(input, text) {
    // Focus the input
    input.focus();

    // Try to set value directly for contenteditable divs
    if (input.getAttribute('contenteditable') === 'true') {
      // Twitter uses Draft.js, so we need to simulate typing
      const dataTransfer = new DataTransfer();
      dataTransfer.setData('text/plain', text);

      const pasteEvent = new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
        clipboardData: dataTransfer
      });

      input.dispatchEvent(pasteEvent);

      // Fallback: try execCommand
      if (!input.textContent.includes(text)) {
        document.execCommand('insertText', false, text);
      }
    } else {
      // Standard input
      input.value = text;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  },

  // Inject template button near DM composer
  injectTemplateButton() {
    const composer = document.querySelector('[data-testid="dmComposerTextInput"]');
    if (!composer) return;

    const existingBtn = document.querySelector('.flock-template-trigger');
    if (existingBtn) return;

    const container = composer.closest('[data-testid="DmActivityViewport"]') || composer.parentElement;
    if (!container) return;

    const btn = document.createElement('button');
    btn.className = 'flock-template-trigger';
    btn.innerHTML = Icons.message;
    btn.title = 'Insert template (Cmd/Ctrl+Shift+T)';

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.showPicker(composer);
    });

    // Insert button near composer
    const composerWrapper = composer.closest('div[data-testid]')?.parentElement;
    if (composerWrapper) {
      composerWrapper.style.position = 'relative';
      composerWrapper.appendChild(btn);
    }
  }
};

// ================================
// INITIALIZATION
// ================================

async function init() {
  console.log('[Flock] Initializing...');

  try {
    // Initial injection
    injectSaveButton();

    // Observe navigation
    observeNavigation();

    // Enable interaction tracking
    InteractionTracker.observeInteractions();

    // Enable keyboard shortcuts
    KeyboardShortcuts.init();

    // Check for DM composer periodically and inject template button
    setInterval(() => {
      if (window.location.pathname.includes('/messages')) {
        DMTemplates.injectTemplateButton();
      }
    }, 1000);

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

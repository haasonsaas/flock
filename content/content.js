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
  lastTrackedAction: null,

  // Debounce to prevent duplicate tracking
  debounce(key, delay = 2000) {
    const now = Date.now();
    if (this.lastTrackedAction?.key === key && now - this.lastTrackedAction.time < delay) {
      return false;
    }
    this.lastTrackedAction = { key, time: now };
    return true;
  },

  // Extract username from a tweet element
  getTweetAuthor(tweetElement) {
    const userLink = tweetElement.querySelector('a[href^="/"][role="link"]');
    if (userLink) {
      const match = userLink.href.match(/twitter\.com\/([^\/\?]+)|x\.com\/([^\/\?]+)/);
      return match ? (match[1] || match[2]) : null;
    }
    return null;
  },

  // Get DM conversation partner username
  getDMPartner() {
    // Check URL for DM conversation
    const match = window.location.pathname.match(/\/messages\/(\d+)-(\d+)/);
    if (match) {
      // Try to get username from conversation header
      const header = document.querySelector('[data-testid="conversation-header"]');
      if (header) {
        const usernameEl = header.querySelector('a[href^="/"]');
        if (usernameEl) {
          const href = usernameEl.getAttribute('href');
          return href?.replace('/', '') || null;
        }
      }
      // Fallback: look for username in the DM header
      const nameLink = document.querySelector('[data-testid="DM_Conversation_Avatar"]')?.closest('div')?.querySelector('a[href^="/"]');
      if (nameLink) {
        return nameLink.getAttribute('href')?.replace('/', '') || null;
      }
    }
    return null;
  },

  async trackLike(tweetElement) {
    const author = this.getTweetAuthor(tweetElement);
    if (!author) return;

    const contact = await getContact(author);
    if (!contact) return; // Only track for saved contacts

    const key = `like-${author}-${Date.now().toString().slice(0, -4)}`;
    if (!this.debounce(key)) return;

    await logInteraction(author, 'like', 'Liked a tweet', {
      url: window.location.href,
      auto: true
    });

    console.log(`[Flock] Auto-tracked: Liked tweet from @${author}`);
    showToast(`Tracked: Liked @${author}'s tweet`, 'success');
  },

  async trackReply(tweetElement) {
    const author = this.getTweetAuthor(tweetElement);
    if (!author) return;

    const contact = await getContact(author);
    if (!contact) return;

    const key = `reply-${author}-${Date.now().toString().slice(0, -4)}`;
    if (!this.debounce(key)) return;

    await logInteraction(author, 'reply', 'Replied to a tweet', {
      url: window.location.href,
      auto: true
    });

    console.log(`[Flock] Auto-tracked: Replied to @${author}`);
    showToast(`Tracked: Replied to @${author}`, 'success');
  },

  async trackDM() {
    const partner = this.getDMPartner();
    if (!partner) return;

    const contact = await getContact(partner);
    if (!contact) return;

    const key = `dm-${partner}-${Date.now().toString().slice(0, -4)}`;
    if (!this.debounce(key, 5000)) return; // 5s debounce for DMs

    await logInteraction(partner, 'dm', 'Sent a DM', {
      url: window.location.href,
      auto: true
    });

    console.log(`[Flock] Auto-tracked: DM to @${partner}`);
    showToast(`Tracked: DM to @${partner}`, 'success');
  },

  observeInteractions() {
    // Track likes
    document.addEventListener('click', async (e) => {
      const likeButton = e.target.closest('[data-testid="like"]');
      if (likeButton) {
        const tweet = likeButton.closest('article');
        if (tweet) {
          // Small delay to let the like register
          setTimeout(() => this.trackLike(tweet), 500);
        }
      }

      // Track replies (when clicking reply button, then detecting send)
      const replyButton = e.target.closest('[data-testid="reply"]');
      if (replyButton) {
        const tweet = replyButton.closest('article');
        if (tweet) {
          // Store the tweet we're replying to
          this.pendingReplyTo = tweet;
        }
      }

      // Track when tweet is sent (could be a reply)
      const tweetButton = e.target.closest('[data-testid="tweetButton"], [data-testid="tweetButtonInline"]');
      if (tweetButton && this.pendingReplyTo) {
        setTimeout(() => {
          this.trackReply(this.pendingReplyTo);
          this.pendingReplyTo = null;
        }, 1000);
      }

      // Track DM sends
      const dmSendButton = e.target.closest('[data-testid="dmComposerSendButton"]');
      if (dmSendButton) {
        setTimeout(() => this.trackDM(), 500);
      }
    }, true);

    console.log('[Flock] Interaction tracking enabled');
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
      id: 'intro',
      name: 'Introduction',
      text: "Hey {name}! I came across your profile and really enjoyed your content about {topic}. Would love to connect!"
    },
    {
      id: 'followup',
      name: 'Follow-up',
      text: "Hey {name}, just wanted to follow up on my previous message. Let me know if you'd be interested in chatting!"
    },
    {
      id: 'collab',
      name: 'Collaboration',
      text: "Hey {name}! I've been following your work and think there might be a great opportunity to collaborate. Would you be open to a quick chat?"
    },
    {
      id: 'congrats',
      name: 'Congratulations',
      text: "Hey {name}, just saw the news - congrats! 🎉 Really impressive stuff."
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
    return text
      .replace(/{name}/g, contact?.displayName?.split(' ')[0] || 'there')
      .replace(/{fullname}/g, contact?.displayName || 'there')
      .replace(/{username}/g, contact?.username || '')
      .replace(/{topic}/g, '[topic]')
      .replace(/{company}/g, contact?.enrichedData?.company || '[company]');
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

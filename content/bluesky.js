/**
 * Flock - Bluesky Content Script
 * Handles profile extraction and interaction tracking on bsky.app
 */

// ================================
// STORAGE HELPERS
// ================================

async function getContact(username) {
  const result = await chrome.storage.local.get('contacts');
  const contactsObj = result.contacts || {};
  // Bluesky contacts are stored with bsky: prefix
  return contactsObj[`bsky:${username}`] || null;
}

async function saveContact(contact) {
  const result = await chrome.storage.local.get('contacts');
  const contactsObj = result.contacts || {};
  // Store with bsky: prefix to differentiate from Twitter contacts
  const key = `bsky:${contact.username}`;

  if (contactsObj[key]) {
    // Update existing
    contactsObj[key] = {
      ...contactsObj[key],
      ...contact,
      updatedAt: Date.now(),
    };
  } else {
    // New contact
    contactsObj[key] = {
      ...contact,
      platform: 'bluesky',
      pipelineStage: 'new',
      tags: [],
      notes: '',
      listIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  await chrome.storage.local.set({ contacts: contactsObj });
  return contactsObj[key];
}

async function logInteraction(username, type, description, metadata = {}) {
  const result = await chrome.storage.local.get('interactions');
  const interactions = result.interactions || {};

  const id = `bsky_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  interactions[id] = {
    id,
    username: `bsky:${username}`,
    platform: 'bluesky',
    type,
    description,
    metadata,
    timestamp: Date.now(),
  };

  await chrome.storage.local.set({ interactions });

  // Update last interaction on contact
  const contactResult = await chrome.storage.local.get('contacts');
  const contacts = contactResult.contacts || {};
  const key = `bsky:${username}`;
  if (contacts[key]) {
    contacts[key].lastInteraction = Date.now();
    await chrome.storage.local.set({ contacts });
  }
}

// ================================
// BLUESKY API
// ================================

const BlueskyAPI = {
  baseUrl: 'https://public.api.bsky.app/xrpc',

  async getProfile(handle) {
    try {
      const response = await fetch(
        `${this.baseUrl}/app.bsky.actor.getProfile?actor=${encodeURIComponent(handle)}`
      );
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('[Flock] Bluesky API error:', error);
      return null;
    }
  },

  async resolveHandle(handle) {
    try {
      const response = await fetch(
        `${this.baseUrl}/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(handle)}`
      );
      if (!response.ok) return null;
      const data = await response.json();
      return data.did;
    } catch (error) {
      return null;
    }
  }
};

// ================================
// BLUESKY PARSER
// ================================

const BlueskyParser = {
  isProfilePage() {
    // Bluesky profile URLs: /profile/handle or /profile/did:plc:xxx
    return /^\/profile\/[^/]+\/?$/.test(window.location.pathname);
  },

  getCurrentHandle() {
    const match = window.location.pathname.match(/^\/profile\/([^/]+)/);
    return match ? match[1] : null;
  },

  async extractProfileData() {
    if (!this.isProfilePage()) return null;

    const handle = this.getCurrentHandle();
    if (!handle) return null;

    // Try to get data from API first (most reliable)
    const apiData = await BlueskyAPI.getProfile(handle);

    if (apiData) {
      return {
        username: apiData.handle,
        did: apiData.did,
        displayName: apiData.displayName || apiData.handle,
        bio: apiData.description || '',
        location: null, // Bluesky doesn't have location field
        website: null, // Will be extracted from bio if present
        joinDate: apiData.createdAt ? new Date(apiData.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : null,
        followersCount: apiData.followersCount || 0,
        followingCount: apiData.followsCount || 0,
        postsCount: apiData.postsCount || 0,
        isVerified: apiData.verification?.verifiedStatus === 'valid',
        profileImageUrl: apiData.avatar || null,
        bannerImageUrl: apiData.banner || null,
        platform: 'bluesky',
        extractedAt: Date.now(),
      };
    }

    // Fallback to DOM parsing if API fails
    return this.extractFromDOM(handle);
  },

  extractFromDOM(handle) {
    const data = {
      username: handle,
      did: null,
      displayName: null,
      bio: null,
      location: null,
      website: null,
      joinDate: null,
      followersCount: null,
      followingCount: null,
      postsCount: null,
      isVerified: false,
      profileImageUrl: null,
      bannerImageUrl: null,
      platform: 'bluesky',
      extractedAt: Date.now(),
    };

    try {
      // Display name - usually in a heading
      const nameEl = document.querySelector('[data-testid="profileHeaderDisplayName"]') ||
                     document.querySelector('h1') ||
                     document.querySelector('[class*="displayName"]');
      if (nameEl) {
        data.displayName = nameEl.textContent?.trim();
      }

      // Bio/description
      const bioEl = document.querySelector('[data-testid="profileHeaderDescription"]') ||
                    document.querySelector('[class*="description"]');
      if (bioEl) {
        data.bio = bioEl.textContent?.trim();
      }

      // Follower/following counts - look for links containing these patterns
      const statLinks = document.querySelectorAll('a[href*="/followers"], a[href*="/follows"]');
      statLinks.forEach(link => {
        const text = link.textContent?.trim();
        const count = this.parseCount(text);

        if (link.href.includes('/followers')) {
          data.followersCount = count;
        } else if (link.href.includes('/follows')) {
          data.followingCount = count;
        }
      });

      // Profile image
      const avatarImg = document.querySelector('img[src*="avatar"]') ||
                        document.querySelector('[data-testid="userAvatarImage"] img');
      if (avatarImg) {
        data.profileImageUrl = avatarImg.src;
      }

      // Banner image
      const bannerImg = document.querySelector('[data-testid="profileHeaderBanner"] img') ||
                        document.querySelector('img[src*="banner"]');
      if (bannerImg) {
        data.bannerImageUrl = bannerImg.src;
      }

    } catch (error) {
      console.error('[Flock] Error extracting Bluesky profile from DOM:', error);
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
  }
};

// ================================
// UI INJECTION
// ================================

function createSaveButton() {
  const btn = document.createElement('button');
  btn.id = 'flock-save-btn';
  btn.className = 'flock-save-btn';
  btn.innerHTML = `
    <svg viewBox="0 0 24 24" class="flock-btn-icon">
      <path d="M21.5 6.5c-.5.5-1.5 1-3 1.5.5 1.5.5 3 0 4.5-.5 1.5-1.5 3-3 4.5-1.5 1.5-3.5 2.5-6 3-2.5.5-5 .5-7.5-.5 2 0 3.5-.5 5-1.5-1.5 0-2.5-.5-3.5-1.5 1 0 2-.5 2.5-1-1.5-.5-2.5-1.5-3-2.5 1 .5 2 .5 2.5.5C4 12 3 10.5 3 8.5c.5.5 1.5.5 2 .5-1.5-1-2-2.5-2-4.5 0-.5 0-1 .5-1.5 2 2.5 4.5 4 8 4.5 0-.5-.5-1-.5-1.5 0-2 1.5-3.5 3.5-3.5 1 0 2 .5 2.5 1 1-.5 2-.5 2.5-1-.5 1-.5 2-1.5 2.5 1 0 2-.5 2.5-.5-.5 1-1 1.5-2 2z" fill="currentColor"/>
    </svg>
    <span class="flock-btn-text">Save to Flock</span>
  `;
  return btn;
}

async function updateButtonState(btn, username) {
  const contact = await getContact(username);
  if (contact) {
    btn.classList.add('flock-saved');
    btn.querySelector('.flock-btn-text').textContent = 'Saved';
  } else {
    btn.classList.remove('flock-saved');
    btn.querySelector('.flock-btn-text').textContent = 'Save to Flock';
  }
}

function showToast(message, type = 'success') {
  const existing = document.querySelector('.flock-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `flock-toast flock-toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('flock-toast-hide');
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

async function injectSaveButton() {
  if (!BlueskyParser.isProfilePage()) {
    const existing = document.getElementById('flock-save-btn');
    if (existing) existing.remove();
    return;
  }

  // Don't inject if already there
  if (document.getElementById('flock-save-btn')) return;

  const handle = BlueskyParser.getCurrentHandle();
  if (!handle) return;

  // Find a good place to inject - look for follow button area
  const followBtn = document.querySelector('[data-testid="followBtn"]') ||
                    document.querySelector('button[aria-label*="Follow"]') ||
                    document.querySelector('[class*="ProfileHeader"] button');

  if (!followBtn) {
    // Retry after a short delay
    setTimeout(injectSaveButton, 1000);
    return;
  }

  const btn = createSaveButton();
  await updateButtonState(btn, handle);

  btn.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();

    btn.disabled = true;
    btn.querySelector('.flock-btn-text').textContent = 'Saving...';

    try {
      const profileData = await BlueskyParser.extractProfileData();
      if (profileData) {
        await saveContact(profileData);
        await updateButtonState(btn, handle);
        showToast(`Saved @${handle} to Flock`);
      } else {
        showToast('Could not extract profile data', 'error');
      }
    } catch (error) {
      console.error('[Flock] Save error:', error);
      showToast('Error saving contact', 'error');
    }

    btn.disabled = false;
  });

  // Insert after the follow button
  followBtn.parentElement?.insertBefore(btn, followBtn.nextSibling);
}

// ================================
// INTERACTION TRACKING
// ================================

const InteractionTracker = {
  trackedElements: new WeakSet(),

  observeInteractions() {
    // Track likes
    document.addEventListener('click', async (e) => {
      const likeBtn = e.target.closest('[data-testid="likeBtn"], [aria-label*="Like"]');
      if (likeBtn && !this.trackedElements.has(likeBtn)) {
        this.trackedElements.add(likeBtn);
        const postAuthor = this.getPostAuthor(likeBtn);
        if (postAuthor) {
          await logInteraction(postAuthor, 'like', `Liked a post by @${postAuthor}`);
        }
      }

      // Track reposts
      const repostBtn = e.target.closest('[data-testid="repostBtn"], [aria-label*="Repost"]');
      if (repostBtn && !this.trackedElements.has(repostBtn)) {
        this.trackedElements.add(repostBtn);
        const postAuthor = this.getPostAuthor(repostBtn);
        if (postAuthor) {
          await logInteraction(postAuthor, 'repost', `Reposted a post by @${postAuthor}`);
        }
      }

      // Track follows
      const followBtn = e.target.closest('[data-testid="followBtn"]');
      if (followBtn) {
        const handle = BlueskyParser.getCurrentHandle();
        if (handle) {
          await logInteraction(handle, 'follow', `Followed @${handle}`);
        }
      }
    }, true);
  },

  getPostAuthor(element) {
    // Walk up to find post container and get author
    let current = element;
    while (current && !current.matches('[data-testid="postThreadItem"], [data-testid="feedItem"]')) {
      current = current.parentElement;
    }
    if (!current) return null;

    // Find author link
    const authorLink = current.querySelector('a[href^="/profile/"]');
    if (authorLink) {
      const match = authorLink.href.match(/\/profile\/([^/]+)/);
      return match ? match[1] : null;
    }
    return null;
  }
};

// ================================
// KEYBOARD SHORTCUTS
// ================================

const KeyboardShortcuts = {
  init() {
    document.addEventListener('keydown', async (e) => {
      // Cmd/Ctrl + Shift + S to save
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();

        if (BlueskyParser.isProfilePage()) {
          const profileData = await BlueskyParser.extractProfileData();
          if (profileData) {
            await saveContact(profileData);
            showToast(`Saved @${profileData.username} to Flock`);

            const btn = document.getElementById('flock-save-btn');
            if (btn) await updateButtonState(btn, profileData.username);
          }
        }
      }
    });
  }
};

// ================================
// NAVIGATION OBSERVER
// ================================

function observeNavigation() {
  let lastUrl = window.location.href;

  const observer = new MutationObserver(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      setTimeout(injectSaveButton, 500);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

// ================================
// INITIALIZATION
// ================================

async function init() {
  console.log('[Flock] Initializing Bluesky support...');

  try {
    // Initial button injection
    await injectSaveButton();

    // Observe navigation changes
    observeNavigation();

    // Enable interaction tracking
    InteractionTracker.observeInteractions();

    // Enable keyboard shortcuts
    KeyboardShortcuts.init();

    console.log('[Flock] Bluesky support ready');
  } catch (error) {
    console.error('[Flock] Bluesky initialization error:', error);
  }
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

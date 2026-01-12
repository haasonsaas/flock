/**
 * Twitter DOM Parser
 * Extracts profile data from Twitter/X pages
 */

const TwitterParser = {
  /**
   * Check if we're on a profile page
   */
  isProfilePage() {
    const path = window.location.pathname;
    // Profile pages are /{username} but not /home, /explore, /notifications, etc.
    const reserved = [
      'home', 'explore', 'notifications', 'messages', 'bookmarks',
      'lists', 'topics', 'communities', 'premium', 'settings',
      'compose', 'search', 'i', 'intent', 'tos', 'privacy'
    ];
    const parts = path.split('/').filter(Boolean);

    if (parts.length === 0) return false;
    if (reserved.includes(parts[0])) return false;
    if (parts.length > 1 && !['with_replies', 'media', 'likes', 'followers', 'following', 'verified_followers'].includes(parts[1])) {
      return false; // It's a tweet or something else
    }

    return true;
  },

  /**
   * Get the current profile username from URL
   */
  getCurrentUsername() {
    if (!this.isProfilePage()) return null;
    const parts = window.location.pathname.split('/').filter(Boolean);
    return parts[0] || null;
  },

  /**
   * Extract profile data from the current page
   */
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
      // Display name - look for the heading in the profile
      const nameHeading = document.querySelector('[data-testid="UserName"]');
      if (nameHeading) {
        const displayNameEl = nameHeading.querySelector('span');
        if (displayNameEl) {
          data.displayName = displayNameEl.textContent?.trim();
        }

        // Check for verified badge
        data.isVerified = nameHeading.querySelector('[data-testid="icon-verified"]') !== null ||
                          nameHeading.querySelector('svg[aria-label*="Verified"]') !== null;
      }

      // Bio
      const bioEl = document.querySelector('[data-testid="UserDescription"]');
      if (bioEl) {
        data.bio = bioEl.textContent?.trim();
      }

      // Location
      const locationEl = document.querySelector('[data-testid="UserLocation"]');
      if (locationEl) {
        data.location = locationEl.textContent?.trim();
      }

      // Website
      const websiteEl = document.querySelector('[data-testid="UserUrl"]');
      if (websiteEl) {
        const link = websiteEl.querySelector('a');
        data.website = link?.href || websiteEl.textContent?.trim();
      }

      // Join date
      const joinDateEl = document.querySelector('[data-testid="UserJoinDate"]');
      if (joinDateEl) {
        data.joinDate = joinDateEl.textContent?.trim();
      }

      // Followers/Following counts
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

      // Profile image
      const profileImg = document.querySelector('a[href$="/photo"] img[src*="profile_images"]');
      if (profileImg) {
        // Get the highest resolution version
        data.profileImageUrl = profileImg.src.replace(/_normal\./, '_400x400.');
      }

      // Banner image
      const bannerImg = document.querySelector('a[href$="/header_photo"] img');
      if (bannerImg) {
        data.bannerImageUrl = bannerImg.src;
      }

    } catch (error) {
      console.error('[Flock] Error extracting profile data:', error);
    }

    return data;
  },

  /**
   * Parse Twitter's count format (e.g., "1.2K", "5M") to number
   */
  parseCount(text) {
    if (!text) return null;

    // Extract the numeric part
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

  /**
   * Format a number for display (reverse of parseCount)
   */
  formatCount(num) {
    if (num === null || num === undefined) return '—';
    if (num >= 1000000000) return (num / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return num.toString();
  },

  /**
   * Find the profile header element to attach our button
   */
  getProfileHeaderElement() {
    // The header contains the follow button
    return document.querySelector('[data-testid="primaryColumn"] [data-testid="UserName"]')?.closest('div[class*="css"]');
  },

  /**
   * Check if our button is already injected
   */
  isButtonInjected() {
    return document.querySelector('.flock-save-btn') !== null;
  },

  /**
   * Get the Follow button element (for positioning reference)
   */
  getFollowButton() {
    return document.querySelector('[data-testid="primaryColumn"] [role="button"][data-testid*="follow"]') ||
           document.querySelector('[data-testid="primaryColumn"] [role="button"][aria-label*="Follow"]');
  },

  /**
   * Watch for navigation changes (Twitter is a SPA)
   */
  observeNavigation(callback) {
    let lastUrl = window.location.href;

    const observer = new MutationObserver(() => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        callback(lastUrl);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return observer;
  },

  /**
   * Wait for an element to appear
   */
  waitForElement(selector, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }

      const observer = new MutationObserver((mutations, obs) => {
        const el = document.querySelector(selector);
        if (el) {
          obs.disconnect();
          resolve(el);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });

      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Element ${selector} not found within ${timeout}ms`));
      }, timeout);
    });
  }
};

export default TwitterParser;

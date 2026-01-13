/**
 * Flock Service Worker
 * Background script for extension coordination and AI API calls
 */

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

// ================================
// CHROME SYNC MANAGER
// ================================

/**
 * Handles syncing settings, lists, tags, and filters across devices
 * using chrome.storage.sync (100KB total limit, 8KB per item)
 *
 * Synced data:
 * - lists: List definitions (names, colors)
 * - tags: Tag definitions
 * - savedFilters: Saved search filters
 * - userPreferences: UI preferences
 * - autopilotSettings: Autopilot configuration
 * - anthropicApiKey: API key (already synced)
 *
 * Local-only data (too large for sync):
 * - contacts: Full contact database
 * - interactions: Interaction history
 */

const SyncManager = {
  // Keys that should be synced across devices
  SYNC_KEYS: ['lists', 'tags', 'savedFilters', 'userPreferences'],

  // Sync status
  lastSyncTime: null,
  syncInProgress: false,

  /**
   * Initialize sync - pull from sync storage and merge with local
   */
  async initialize() {
    console.log('[Flock] Initializing sync manager...');

    try {
      // Get sync data
      const syncData = await chrome.storage.sync.get(this.SYNC_KEYS);
      const localData = await chrome.storage.local.get(this.SYNC_KEYS);

      // Merge strategy: sync wins for settings, but preserve local if sync is empty
      const mergedData = {};

      for (const key of this.SYNC_KEYS) {
        if (syncData[key] && Object.keys(syncData[key]).length > 0) {
          // Sync has data - use it (may need to merge with local)
          mergedData[key] = this.mergeData(key, localData[key], syncData[key]);
        } else if (localData[key]) {
          // Only local has data - push to sync
          mergedData[key] = localData[key];
        }
      }

      // Update both storages with merged data
      if (Object.keys(mergedData).length > 0) {
        await chrome.storage.local.set(mergedData);
        await this.pushToSync(mergedData);
      }

      this.lastSyncTime = Date.now();
      await chrome.storage.local.set({ lastSyncTime: this.lastSyncTime });

      console.log('[Flock] Sync manager initialized');
    } catch (error) {
      console.error('[Flock] Sync initialization error:', error);
    }
  },

  /**
   * Merge local and sync data intelligently
   */
  mergeData(key, localData, syncData) {
    if (!localData) return syncData;
    if (!syncData) return localData;

    // For arrays (lists, tags, savedFilters), merge by ID and deduplicate
    if (Array.isArray(syncData) && Array.isArray(localData)) {
      const merged = [...syncData];
      const syncIds = new Set(syncData.map(item => item.id));

      for (const localItem of localData) {
        if (!syncIds.has(localItem.id)) {
          merged.push(localItem);
        }
      }

      return merged;
    }

    // For objects, deep merge with sync taking precedence
    if (typeof syncData === 'object' && typeof localData === 'object') {
      return { ...localData, ...syncData };
    }

    return syncData;
  },

  /**
   * Push data to sync storage with size checking
   */
  async pushToSync(data) {
    try {
      // Check size before pushing (8KB per item limit)
      for (const [key, value] of Object.entries(data)) {
        const size = new Blob([JSON.stringify(value)]).size;
        if (size > 8000) {
          console.warn(`[Flock] Sync item ${key} too large (${size} bytes), truncating...`);
          // For arrays, keep most recent items
          if (Array.isArray(value)) {
            data[key] = value.slice(-50); // Keep last 50 items
          }
        }
      }

      await chrome.storage.sync.set(data);
      this.lastSyncTime = Date.now();
      await chrome.storage.local.set({ lastSyncTime: this.lastSyncTime });

    } catch (error) {
      if (error.message?.includes('QUOTA_BYTES')) {
        console.error('[Flock] Sync quota exceeded, cleaning up...');
        await this.cleanupSyncStorage();
      } else {
        throw error;
      }
    }
  },

  /**
   * Clean up sync storage when quota exceeded
   */
  async cleanupSyncStorage() {
    const syncData = await chrome.storage.sync.get(this.SYNC_KEYS);

    // Trim arrays to reduce size
    for (const key of this.SYNC_KEYS) {
      if (Array.isArray(syncData[key]) && syncData[key].length > 30) {
        syncData[key] = syncData[key].slice(-30);
      }
    }

    await chrome.storage.sync.set(syncData);
  },

  /**
   * Sync a specific key when it changes locally
   */
  async syncKey(key, value) {
    if (!this.SYNC_KEYS.includes(key)) return;

    try {
      await this.pushToSync({ [key]: value });
      console.log(`[Flock] Synced ${key}`);
    } catch (error) {
      console.error(`[Flock] Failed to sync ${key}:`, error);
    }
  },

  /**
   * Get sync status for UI
   */
  async getStatus() {
    const localResult = await chrome.storage.local.get('lastSyncTime');
    const syncBytesUsed = await new Promise(resolve => {
      chrome.storage.sync.getBytesInUse(null, resolve);
    });

    return {
      lastSyncTime: localResult.lastSyncTime || null,
      syncBytesUsed,
      syncBytesTotal: chrome.storage.sync.QUOTA_BYTES || 102400,
      syncEnabled: true
    };
  },

  /**
   * Force a full sync
   */
  async forceSync() {
    if (this.syncInProgress) {
      console.log('[Flock] Sync already in progress');
      return { success: false, error: 'Sync in progress' };
    }

    this.syncInProgress = true;

    try {
      const localData = await chrome.storage.local.get(this.SYNC_KEYS);
      await this.pushToSync(localData);

      this.syncInProgress = false;
      return { success: true, syncedAt: this.lastSyncTime };
    } catch (error) {
      this.syncInProgress = false;
      return { success: false, error: error.message };
    }
  }
};

// Listen for changes to sync storage (from other devices)
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'sync') {
    console.log('[Flock] Received sync changes from another device');

    // Update local storage with sync changes
    const updates = {};
    for (const [key, { newValue }] of Object.entries(changes)) {
      if (SyncManager.SYNC_KEYS.includes(key) && newValue !== undefined) {
        updates[key] = newValue;
      }
    }

    if (Object.keys(updates).length > 0) {
      chrome.storage.local.set(updates);
      console.log('[Flock] Applied sync updates locally:', Object.keys(updates));
    }
  }
});

// Initialize sync manager
SyncManager.initialize();

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  // Open popup - this is handled by default_popup in manifest
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'openPopup':
      // Can't programmatically open popup, but we can open options page
      chrome.runtime.openOptionsPage();
      break;

    case 'getContactCount':
      // This would be handled by the popup directly accessing IndexedDB
      sendResponse({ count: 0 });
      break;

    case 'exportData':
      // Trigger export functionality
      handleExport(sendResponse);
      return true; // Will respond asynchronously

    case 'enrichContact':
      handleEnrichContact(message.contact, sendResponse);
      return true;

    case 'generateBrief':
      handleGenerateBrief(message.contact, message.interactions, sendResponse);
      return true;

    case 'suggestFollowUp':
      handleSuggestFollowUp(message.contact, message.interactions, sendResponse);
      return true;

    case 'checkAiAvailable':
      checkAiAvailable(sendResponse);
      return true;

    default:
      console.log('[Flock] Unknown message action:', message.action);
  }
});

// ================================
// AI API CALLS
// ================================

async function getApiKey() {
  const result = await chrome.storage.sync.get('anthropicApiKey');
  return result.anthropicApiKey;
}

async function callAnthropic(systemPrompt, userPrompt) {
  const apiKey = await getApiKey();
  if (!apiKey) {
    return { error: 'No API key set. Add your Anthropic API key in Flock settings.' };
  }

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }]
      })
    });

    if (!response.ok) {
      const error = await response.json();
      return { error: error.error?.message || 'API request failed' };
    }

    const data = await response.json();
    return { content: data.content[0].text };
  } catch (error) {
    return { error: error.message };
  }
}

async function checkAiAvailable(sendResponse) {
  const apiKey = await getApiKey();
  sendResponse({ available: !!apiKey });
}

async function handleEnrichContact(contact, sendResponse) {
  const systemPrompt = `You are a research assistant that helps find professional information about people based on their Twitter/X profile. Return ONLY valid JSON with no other text.`;

  const userPrompt = `Research this Twitter/X user and find additional professional information:

**Username:** @${contact.username}
**Display Name:** ${contact.displayName || 'Unknown'}
**Bio:** ${contact.bio || 'No bio'}
**Location:** ${contact.location || 'Unknown'}
**Followers:** ${contact.followersCount || 'Unknown'}

Based on the available information, infer or research:
{
  "company": "Current company or null if unknown",
  "role": "Current job title or null if unknown",
  "industry": "Industry they likely work in or null",
  "linkedin": "LinkedIn URL if you can determine it, or null",
  "interests": ["2-4 professional interests based on bio/context"],
  "talkingPoints": ["2-3 conversation starters based on their profile"],
  "confidence": "high/medium/low - how confident you are"
}

Return ONLY the JSON object, no explanation.`;

  const result = await callAnthropic(systemPrompt, userPrompt);

  if (result.error) {
    sendResponse({ success: false, error: result.error });
    return;
  }

  try {
    // Parse JSON from response
    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[0]);
      sendResponse({ success: true, data });
    } else {
      sendResponse({ success: false, error: 'Invalid response format' });
    }
  } catch (e) {
    sendResponse({ success: false, error: 'Failed to parse response' });
  }
}

async function handleGenerateBrief(contact, interactions, sendResponse) {
  const systemPrompt = `You are a sales assistant that creates concise meeting briefs. Be direct and actionable.`;

  const interactionsSummary = interactions?.length
    ? interactions.slice(0, 5).map(i => `- ${i.type}: ${i.content || 'No notes'}`).join('\n')
    : 'No recorded interactions';

  const userPrompt = `Create a brief meeting prep for this contact:

**Contact:** @${contact.username} (${contact.displayName || 'Unknown'})
**Bio:** ${contact.bio || 'No bio'}
**Pipeline Stage:** ${contact.pipelineStage || 'New'}
**Company:** ${contact.enrichedData?.company || 'Unknown'}
**Role:** ${contact.enrichedData?.role || 'Unknown'}

**Recent Interactions:**
${interactionsSummary}

**Notes:** ${contact.notes || 'None'}

Create a brief with:
1. Key background (2-3 bullets)
2. Talking points (3-4 items)
3. Questions to ask
4. Recommended next step

Keep it concise and actionable.`;

  const result = await callAnthropic(systemPrompt, userPrompt);

  if (result.error) {
    sendResponse({ success: false, error: result.error });
  } else {
    sendResponse({ success: true, data: { brief: result.content } });
  }
}

async function handleSuggestFollowUp(contact, interactions, sendResponse) {
  const systemPrompt = `You are a sales coach. Analyze CRM data and suggest follow-up actions. Return ONLY valid JSON.`;

  const daysSinceContact = interactions?.length
    ? Math.floor((Date.now() - new Date(interactions[0].timestamp).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const userPrompt = `Analyze this contact and suggest follow-up:

**Contact:** @${contact.username}
**Pipeline Stage:** ${contact.pipelineStage || 'New'}
**Days since last contact:** ${daysSinceContact ?? 'Never contacted'}
**Tags:** ${contact.tags?.join(', ') || 'None'}

Return JSON:
{
  "urgency": "high/medium/low",
  "suggestedAction": "What to do next",
  "channel": "dm/reply/email/call",
  "timing": "When to follow up",
  "messageIdeas": ["2-3 message ideas"],
  "reason": "Brief explanation"
}

Return ONLY the JSON.`;

  const result = await callAnthropic(systemPrompt, userPrompt);

  if (result.error) {
    sendResponse({ success: false, error: result.error });
    return;
  }

  try {
    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[0]);
      sendResponse({ success: true, data });
    } else {
      sendResponse({ success: false, error: 'Invalid response format' });
    }
  } catch (e) {
    sendResponse({ success: false, error: 'Failed to parse response' });
  }
}

// Handle export
async function handleExport(sendResponse) {
  try {
    // The actual export happens in the popup/content script
    // This is just a coordinator
    sendResponse({ success: true });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

// Badge updates (show contact count)
async function updateBadge() {
  // Badge updates would go here
  // For now, we'll skip this as it requires more setup
}

// ================================
// NOTIFICATION SYSTEM
// ================================

const REMINDER_ALARM_NAME = 'flock-reminder-check';
const NOTIFICATION_CHECK_INTERVAL = 15; // minutes

async function getAllContacts() {
  const result = await chrome.storage.local.get('contacts');
  return result.contacts || {};
}

async function getContactsWithDueReminders() {
  const contacts = await getAllContacts();
  const now = Date.now();
  const dueContacts = [];

  for (const contact of Object.values(contacts)) {
    if (contact.reminder?.date) {
      const reminderTime = contact.reminder.date;
      // Check if reminder is due (within the last hour or overdue)
      if (reminderTime <= now) {
        // Check if we've already notified for this reminder
        const notifiedKey = `notified_${contact.username}_${reminderTime}`;
        const notifiedResult = await chrome.storage.local.get(notifiedKey);
        if (!notifiedResult[notifiedKey]) {
          dueContacts.push(contact);
        }
      }
    }
  }

  return dueContacts;
}

async function markReminderNotified(username, reminderTime) {
  const notifiedKey = `notified_${username}_${reminderTime}`;
  await chrome.storage.local.set({ [notifiedKey]: Date.now() });
}

async function sendReminderNotification(contact) {
  const notificationId = `flock-reminder-${contact.username}-${Date.now()}`;

  const options = {
    type: 'basic',
    iconUrl: 'assets/icon-128.png',
    title: `Reminder: @${contact.username}`,
    message: contact.reminder?.note || `Time to follow up with ${contact.displayName || contact.username}`,
    priority: 2,
    buttons: [
      { title: 'View Profile' },
      { title: 'Dismiss' }
    ],
    requireInteraction: true
  };

  try {
    await chrome.notifications.create(notificationId, options);
    await markReminderNotified(contact.username, contact.reminder.date);
    console.log(`[Flock] Sent reminder notification for @${contact.username}`);
  } catch (error) {
    console.error('[Flock] Failed to send notification:', error);
  }
}

async function checkReminders() {
  console.log('[Flock] Checking for due reminders...');
  const dueContacts = await getContactsWithDueReminders();

  for (const contact of dueContacts) {
    await sendReminderNotification(contact);
  }

  if (dueContacts.length > 0) {
    console.log(`[Flock] Sent ${dueContacts.length} reminder notification(s)`);
  }
}

// Handle notification clicks
chrome.notifications.onClicked.addListener(async (notificationId) => {
  if (notificationId.startsWith('flock-reminder-')) {
    // Extract username from notification ID
    const parts = notificationId.split('-');
    const username = parts[2];

    // Open Twitter profile
    if (username) {
      chrome.tabs.create({ url: `https://twitter.com/${username}` });
    }

    // Close notification
    chrome.notifications.clear(notificationId);
  }
});

// Handle notification button clicks
chrome.notifications.onButtonClicked.addListener(async (notificationId, buttonIndex) => {
  if (notificationId.startsWith('flock-reminder-')) {
    const parts = notificationId.split('-');
    const username = parts[2];

    if (buttonIndex === 0) {
      // View Profile
      if (username) {
        chrome.tabs.create({ url: `https://twitter.com/${username}` });
      }
    }
    // Button 1 (Dismiss) just closes the notification

    chrome.notifications.clear(notificationId);
  }
});

// Alarm handler
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === REMINDER_ALARM_NAME) {
    checkReminders();
  }
});

// Set up periodic reminder checking
async function setupReminderAlarm() {
  // Clear any existing alarm
  await chrome.alarms.clear(REMINDER_ALARM_NAME);

  // Create new alarm that fires every 15 minutes
  chrome.alarms.create(REMINDER_ALARM_NAME, {
    delayInMinutes: 1, // First check in 1 minute
    periodInMinutes: NOTIFICATION_CHECK_INTERVAL
  });

  console.log(`[Flock] Reminder alarm set to check every ${NOTIFICATION_CHECK_INTERVAL} minutes`);
}

// ================================
// DAILY DIGEST
// ================================

const DIGEST_ALARM_NAME = 'flock-daily-digest';

async function getContactsNeedingAttention() {
  const contacts = await getAllContacts();
  const now = Date.now();
  const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
  const needsAttention = [];

  for (const contact of Object.values(contacts)) {
    // Contacts with no interaction in 7+ days
    if (!contact.lastInteraction || contact.lastInteraction < sevenDaysAgo) {
      // Skip contacts in "won" or "lost" stages
      if (contact.pipelineStage !== 'won' && contact.pipelineStage !== 'lost') {
        needsAttention.push(contact);
      }
    }
  }

  return needsAttention.slice(0, 5); // Top 5
}

async function sendDailyDigest() {
  const needsAttention = await getContactsNeedingAttention();
  const dueReminders = await getContactsWithDueReminders();

  if (needsAttention.length === 0 && dueReminders.length === 0) {
    return; // Nothing to report
  }

  let message = '';
  if (dueReminders.length > 0) {
    message += `${dueReminders.length} reminder(s) due. `;
  }
  if (needsAttention.length > 0) {
    message += `${needsAttention.length} contact(s) need attention.`;
  }

  const options = {
    type: 'basic',
    iconUrl: 'assets/icon-128.png',
    title: 'Flock Daily Digest',
    message: message.trim(),
    priority: 1,
    buttons: [
      { title: 'Open Flock' }
    ]
  };

  try {
    await chrome.notifications.create('flock-daily-digest', options);
    console.log('[Flock] Sent daily digest notification');
  } catch (error) {
    console.error('[Flock] Failed to send daily digest:', error);
  }
}

// Set up daily digest (runs at 9 AM local time)
async function setupDailyDigest() {
  await chrome.alarms.clear(DIGEST_ALARM_NAME);

  // Calculate next 9 AM
  const now = new Date();
  let next9am = new Date(now);
  next9am.setHours(9, 0, 0, 0);

  if (now >= next9am) {
    // Already past 9 AM today, schedule for tomorrow
    next9am.setDate(next9am.getDate() + 1);
  }

  const delayInMinutes = (next9am.getTime() - now.getTime()) / (1000 * 60);

  chrome.alarms.create(DIGEST_ALARM_NAME, {
    delayInMinutes,
    periodInMinutes: 24 * 60 // Every 24 hours
  });

  console.log(`[Flock] Daily digest scheduled for 9 AM`);
}

// Handle daily digest alarm
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === DIGEST_ALARM_NAME) {
    sendDailyDigest();
  }
});

// Install/update handler
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('[Flock] Extension installed');
    // Set up alarms
    setupReminderAlarm();
    setupDailyDigest();
    // Could open onboarding page here
  } else if (details.reason === 'update') {
    console.log('[Flock] Extension updated to version', chrome.runtime.getManifest().version);
    // Re-setup alarms on update
    setupReminderAlarm();
    setupDailyDigest();
  }
});

// ================================
// ENGAGEMENT AUTOPILOT
// ================================

const AUTOPILOT_ALARM_NAME = 'flock-engagement-autopilot';
const AUTOPILOT_CHECK_INTERVAL = 60 * 6; // Every 6 hours

// Default settings (can be customized in options)
const AUTOPILOT_DEFAULTS = {
  enabled: true,
  coolingThresholdDays: 14, // Days before a contact is "cooling"
  criticalThresholdDays: 30, // Days before it's critical
  autoCreateReminders: true,
  priorityStages: ['qualified', 'engaged', 'contacted'] // Stages to watch
};

async function getAutopilotSettings() {
  const result = await chrome.storage.sync.get('autopilotSettings');
  return { ...AUTOPILOT_DEFAULTS, ...result.autopilotSettings };
}

async function saveAutopilotSettings(settings) {
  await chrome.storage.sync.set({ autopilotSettings: settings });
}

async function runEngagementAutopilot() {
  const settings = await getAutopilotSettings();
  if (!settings.enabled) return;

  console.log('[Flock] Running engagement autopilot...');

  const contacts = await getAllContacts();
  const now = Date.now();
  const coolingThreshold = settings.coolingThresholdDays * 24 * 60 * 60 * 1000;
  const criticalThreshold = settings.criticalThresholdDays * 24 * 60 * 60 * 1000;

  const coolingContacts = [];
  const criticalContacts = [];

  for (const contact of Object.values(contacts)) {
    // Skip contacts not in priority stages
    if (!settings.priorityStages.includes(contact.pipelineStage)) continue;

    // Skip if already has a reminder set
    if (contact.reminder?.date) continue;

    const lastInteraction = contact.lastInteraction || contact.savedAt || 0;
    const daysSince = now - lastInteraction;

    if (daysSince >= criticalThreshold) {
      criticalContacts.push({ contact, daysSince: Math.floor(daysSince / (24 * 60 * 60 * 1000)) });
    } else if (daysSince >= coolingThreshold) {
      coolingContacts.push({ contact, daysSince: Math.floor(daysSince / (24 * 60 * 60 * 1000)) });
    }
  }

  // Auto-create reminders for critical contacts
  if (settings.autoCreateReminders && criticalContacts.length > 0) {
    const contactsObj = await getAllContacts();

    for (const { contact, daysSince } of criticalContacts.slice(0, 3)) {
      // Check if we've already auto-created a reminder recently
      const autoReminderKey = `auto_reminder_${contact.username}`;
      const autoReminderResult = await chrome.storage.local.get(autoReminderKey);
      const lastAutoReminder = autoReminderResult[autoReminderKey];

      // Only auto-create reminder if we haven't in the last 7 days
      if (lastAutoReminder && (now - lastAutoReminder) < (7 * 24 * 60 * 60 * 1000)) {
        continue;
      }

      // Create auto-reminder for tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);

      contactsObj[contact.username] = {
        ...contact,
        reminder: {
          date: tomorrow.getTime(),
          note: `Auto-reminder: No interaction in ${daysSince} days`
        }
      };

      // Mark that we created an auto-reminder
      await chrome.storage.local.set({ [autoReminderKey]: now });
    }

    await chrome.storage.local.set({ contacts: contactsObj });
  }

  // Send cooling alert notification if there are critical contacts
  if (criticalContacts.length > 0) {
    const criticalNames = criticalContacts.slice(0, 3).map(c => `@${c.contact.username}`).join(', ');
    const message = criticalContacts.length === 1
      ? `${criticalNames} hasn't heard from you in ${criticalContacts[0].daysSince} days`
      : `${criticalContacts.length} contacts need attention: ${criticalNames}`;

    chrome.notifications.create('flock-cooling-alert', {
      type: 'basic',
      iconUrl: 'assets/icon-128.png',
      title: 'Relationships Cooling Off',
      message,
      priority: 1,
      buttons: [{ title: 'View in Flock' }]
    });
  }

  console.log(`[Flock] Autopilot: ${coolingContacts.length} cooling, ${criticalContacts.length} critical`);
}

// Handle cooling alert notification click
chrome.notifications.onClicked.addListener((notificationId) => {
  if (notificationId === 'flock-cooling-alert' || notificationId === 'flock-daily-digest') {
    // Open popup by clicking the extension action
    chrome.action.openPopup?.() || chrome.tabs.create({ url: 'popup/popup.html' });
    chrome.notifications.clear(notificationId);
  }
});

// Set up autopilot alarm
async function setupAutopilotAlarm() {
  await chrome.alarms.clear(AUTOPILOT_ALARM_NAME);

  chrome.alarms.create(AUTOPILOT_ALARM_NAME, {
    delayInMinutes: 30, // First run in 30 minutes
    periodInMinutes: AUTOPILOT_CHECK_INTERVAL
  });

  console.log('[Flock] Engagement autopilot scheduled');
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === AUTOPILOT_ALARM_NAME) {
    runEngagementAutopilot();
  }
});

// ================================
// MESSAGE HANDLERS FOR AUTOPILOT
// ================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getAutopilotSettings') {
    getAutopilotSettings().then(sendResponse);
    return true;
  }

  if (message.action === 'saveAutopilotSettings') {
    saveAutopilotSettings(message.settings).then(() => sendResponse({ success: true }));
    return true;
  }

  if (message.action === 'runAutopilotNow') {
    runEngagementAutopilot().then(() => sendResponse({ success: true }));
    return true;
  }
});

// ================================
// AI INTELLIGENCE ENGINE
// ================================

const AI_PROCESSING_ALARM_NAME = 'flock-ai-processing';
const AI_PROCESSING_INTERVAL = 60; // Every hour

// Also setup alarms when service worker starts (in case it was terminated)
setupReminderAlarm();
setupDailyDigest();
setupAutopilotAlarm();
setupAIProcessingAlarm();
setupOpportunityAlarm();

// Initial check on startup
setTimeout(checkReminders, 5000);

console.log('[Flock] Service worker initialized');

// --------------------------------
// 1. SMART AUTO-TAGGING
// --------------------------------

async function analyzeInteractionForTags(interaction, contact) {
  const systemPrompt = `You are an AI that analyzes social media interactions to extract meaningful tags and insights. Return ONLY valid JSON.`;

  const userPrompt = `Analyze this interaction and extract relevant tags:

**Interaction Type:** ${interaction.type}
**Description:** ${interaction.description || 'N/A'}
**Contact:** @${contact?.username || 'unknown'}
**Contact Bio:** ${contact?.bio || 'N/A'}
**Existing Tags:** ${contact?.tags?.join(', ') || 'None'}

Extract:
{
  "suggestedTags": ["2-4 relevant tags based on interaction content/context"],
  "sentiment": "positive/neutral/negative",
  "intent": "networking/sales/support/casual/collaboration/null",
  "topics": ["1-3 topics discussed or implied"],
  "dealSignals": {
    "interest": "high/medium/low/none",
    "urgency": "high/medium/low/none",
    "commitment": "strong/weak/none"
  },
  "followUpNeeded": true/false,
  "confidence": 0.0-1.0
}

Return ONLY the JSON object.`;

  const result = await callAnthropic(systemPrompt, userPrompt);

  if (result.error) return null;

  try {
    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error('[Flock] Failed to parse auto-tag response:', e);
  }
  return null;
}

async function processUntaggedInteractions() {
  console.log('[Flock] Processing interactions for auto-tagging...');

  const interactionsResult = await chrome.storage.local.get('interactions');
  const interactions = interactionsResult.interactions || {};
  const contactsResult = await chrome.storage.local.get('contacts');
  const contacts = contactsResult.contacts || {};

  let processed = 0;
  const updates = {};

  for (const [id, interaction] of Object.entries(interactions)) {
    // Skip already analyzed interactions
    if (interaction.aiAnalysis) continue;

    // Get associated contact
    const username = interaction.username?.replace('bsky:', '');
    const contact = contacts[interaction.username] || contacts[username];

    // Analyze interaction
    const analysis = await analyzeInteractionForTags(interaction, contact);

    if (analysis) {
      updates[id] = {
        ...interaction,
        aiAnalysis: {
          ...analysis,
          analyzedAt: Date.now()
        }
      };

      // Auto-add high-confidence tags to contact
      if (analysis.confidence > 0.7 && analysis.suggestedTags?.length > 0 && contact) {
        const contactKey = interaction.username?.startsWith('bsky:') ? interaction.username : username;
        const existingTags = new Set(contact.tags || []);
        analysis.suggestedTags.forEach(tag => {
          if (!existingTags.has(tag)) {
            existingTags.add(tag);
          }
        });
        contacts[contactKey] = {
          ...contact,
          tags: Array.from(existingTags),
          updatedAt: Date.now()
        };
      }

      processed++;

      // Limit to 10 per run to avoid API rate limits
      if (processed >= 10) break;
    }
  }

  // Save updates
  if (Object.keys(updates).length > 0) {
    const allInteractions = { ...interactions, ...updates };
    await chrome.storage.local.set({ interactions: allInteractions, contacts });
    console.log(`[Flock] Auto-tagged ${processed} interactions`);
  }
}

// --------------------------------
// 2. NEXT-BEST-ACTION ENGINE
// --------------------------------

async function generateNextBestAction(contact, interactions) {
  const systemPrompt = `You are an AI sales coach that analyzes CRM data to recommend the optimal next action. Be specific and actionable. Return ONLY valid JSON.`;

  const recentInteractions = interactions
    ?.filter(i => i.username === contact.username || i.username === `bsky:${contact.username}`)
    ?.slice(0, 5)
    ?.map(i => `- ${i.type}: ${i.description || 'No description'} (${new Date(i.timestamp).toLocaleDateString()})`)
    ?.join('\n') || 'No recorded interactions';

  const daysSinceContact = contact.lastInteraction
    ? Math.floor((Date.now() - contact.lastInteraction) / (1000 * 60 * 60 * 24))
    : null;

  const userPrompt = `Analyze this contact and recommend the optimal next action:

**Contact:** @${contact.username} (${contact.displayName || 'Unknown'})
**Platform:** ${contact.platform || 'twitter'}
**Bio:** ${contact.bio || 'No bio'}
**Pipeline Stage:** ${contact.pipelineStage || 'new'}
**Tags:** ${contact.tags?.join(', ') || 'None'}
**Days since last contact:** ${daysSinceContact ?? 'Never contacted'}
**Followers:** ${contact.followersCount || 'Unknown'}
**Notes:** ${contact.notes || 'None'}

**Recent Interactions:**
${recentInteractions}

**Enriched Data:**
- Company: ${contact.enrichedData?.company || 'Unknown'}
- Role: ${contact.enrichedData?.role || 'Unknown'}
- Interests: ${contact.enrichedData?.interests?.join(', ') || 'Unknown'}

Recommend the next best action:
{
  "action": "Specific action to take (e.g., 'Send a DM asking about their recent product launch')",
  "channel": "dm/reply/quote/like/email",
  "urgency": "high/medium/low",
  "timing": "now/today/this_week/next_week",
  "talkingPoints": ["2-3 specific talking points based on their profile/history"],
  "messageTemplate": "A draft message or conversation starter",
  "riskIfDelayed": "What might happen if you wait too long",
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation of why this action"
}

Return ONLY the JSON.`;

  const result = await callAnthropic(systemPrompt, userPrompt);

  if (result.error) return { error: result.error };

  try {
    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    return { error: 'Failed to parse response' };
  }
  return { error: 'Invalid response format' };
}

// --------------------------------
// 3. CONVERSATION INTELLIGENCE & OUTCOME PREDICTION
// --------------------------------

async function analyzeConversationHealth(contact, interactions) {
  const systemPrompt = `You are an AI that analyzes relationship health and predicts deal outcomes based on interaction patterns. Return ONLY valid JSON.`;

  const contactInteractions = interactions
    ?.filter(i => i.username === contact.username || i.username === `bsky:${contact.username}`)
    ?.slice(0, 10);

  const interactionSummary = contactInteractions
    ?.map(i => {
      const analysis = i.aiAnalysis || {};
      return `- ${i.type} (${new Date(i.timestamp).toLocaleDateString()}): ${i.description || 'N/A'} | Sentiment: ${analysis.sentiment || 'unknown'}`;
    })
    ?.join('\n') || 'No interactions';

  const userPrompt = `Analyze this relationship and predict outcomes:

**Contact:** @${contact.username}
**Pipeline Stage:** ${contact.pipelineStage || 'new'}
**Tags:** ${contact.tags?.join(', ') || 'None'}
**Notes:** ${contact.notes || 'None'}
**Days in current stage:** ${contact.stageChangedAt ? Math.floor((Date.now() - contact.stageChangedAt) / (1000 * 60 * 60 * 24)) : 'Unknown'}

**Interaction History:**
${interactionSummary}

Analyze and predict:
{
  "healthScore": 0-100,
  "healthTrend": "improving/stable/declining",
  "stageProgression": {
    "currentStage": "${contact.pipelineStage || 'new'}",
    "predictedNextStage": "contacted/engaged/qualified/won/lost",
    "probability": 0.0-1.0,
    "estimatedDays": 1-90
  },
  "riskFactors": ["List any red flags or concerns"],
  "positiveSignals": ["List positive indicators"],
  "churnRisk": "high/medium/low",
  "recommendedFocus": "What to focus on to move this forward",
  "dealProbability": 0.0-1.0,
  "confidence": 0.0-1.0
}

Return ONLY the JSON.`;

  const result = await callAnthropic(systemPrompt, userPrompt);

  if (result.error) return { error: result.error };

  try {
    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    return { error: 'Failed to parse response' };
  }
  return { error: 'Invalid response format' };
}

// --------------------------------
// 4. CONTENT RECOMMENDATION ENGINE
// --------------------------------

async function findContactsForContent(contentUrl, contentTitle, contentSummary) {
  const contactsResult = await chrome.storage.local.get('contacts');
  const contacts = Object.values(contactsResult.contacts || {});

  if (contacts.length === 0) return [];

  const systemPrompt = `You are an AI that matches content to people who would be most interested. Return ONLY valid JSON.`;

  // Create a summary of all contacts
  const contactsSummary = contacts.slice(0, 50).map(c => ({
    username: c.username,
    bio: c.bio?.substring(0, 100) || '',
    tags: c.tags?.slice(0, 5) || [],
    interests: c.enrichedData?.interests?.slice(0, 3) || [],
    industry: c.enrichedData?.industry || '',
    role: c.enrichedData?.role || ''
  }));

  const userPrompt = `Match this content to the most relevant contacts:

**Content URL:** ${contentUrl}
**Title:** ${contentTitle}
**Summary:** ${contentSummary}

**Available Contacts:**
${JSON.stringify(contactsSummary, null, 2)}

Identify the top 5 contacts who would be most interested in this content:
{
  "matches": [
    {
      "username": "username",
      "relevanceScore": 0.0-1.0,
      "reason": "Why this person would be interested",
      "suggestedMessage": "A personalized message to share this content"
    }
  ],
  "contentTopics": ["Main topics of the content"],
  "targetAudience": "Who this content is best suited for"
}

Return ONLY the JSON.`;

  const result = await callAnthropic(systemPrompt, userPrompt);

  if (result.error) return { error: result.error };

  try {
    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    return { error: 'Failed to parse response' };
  }
  return { error: 'Invalid response format' };
}

// --------------------------------
// 5. EVENT-BASED OUTREACH INTELLIGENCE
// --------------------------------

async function detectEventsAndMilestones(contact) {
  const systemPrompt = `You are an AI that detects upcoming events, milestones, and timely outreach opportunities from profile information. Return ONLY valid JSON.`;

  const userPrompt = `Analyze this contact for event-based outreach opportunities:

**Contact:** @${contact.username} (${contact.displayName || 'Unknown'})
**Bio:** ${contact.bio || 'No bio'}
**Notes:** ${contact.notes || 'None'}
**Tags:** ${contact.tags?.join(', ') || 'None'}
**Company:** ${contact.enrichedData?.company || 'Unknown'}
**Role:** ${contact.enrichedData?.role || 'Unknown'}
**Saved Date:** ${contact.createdAt ? new Date(contact.createdAt).toLocaleDateString() : 'Unknown'}

Look for:
- Company anniversaries (e.g., "Founded 2020")
- Role start dates (e.g., "Started as VP in March")
- Upcoming events (e.g., "Speaking at TechCrunch Disrupt")
- Product launches (e.g., "Launching v2 next month")
- Funding news (e.g., "Just raised Series A")
- Certifications/awards (e.g., "Recently became AWS certified")
- Personal milestones (e.g., "1 year on Twitter")

{
  "detectedEvents": [
    {
      "type": "anniversary/launch/event/funding/achievement/milestone",
      "description": "What the event is",
      "approximateDate": "YYYY-MM-DD or null if unknown",
      "outreachWindow": "before/during/after",
      "suggestedMessage": "A personalized congratulations or outreach message",
      "priority": "high/medium/low"
    }
  ],
  "seasonalOpportunities": ["Any seasonal/holiday outreach opportunities"],
  "hasTimeSensitiveOpportunity": true/false,
  "confidence": 0.0-1.0
}

Return ONLY the JSON.`;

  const result = await callAnthropic(systemPrompt, userPrompt);

  if (result.error) return { error: result.error };

  try {
    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    return { error: 'Failed to parse response' };
  }
  return { error: 'Invalid response format' };
}

async function processContactsForEvents() {
  console.log('[Flock] Processing contacts for event detection...');

  const contactsResult = await chrome.storage.local.get('contacts');
  const contacts = contactsResult.contacts || {};

  let processed = 0;

  for (const [key, contact] of Object.entries(contacts)) {
    // Skip if analyzed recently (within 7 days)
    if (contact.eventAnalysis?.analyzedAt &&
        (Date.now() - contact.eventAnalysis.analyzedAt) < (7 * 24 * 60 * 60 * 1000)) {
      continue;
    }

    const events = await detectEventsAndMilestones(contact);

    if (!events.error) {
      contacts[key] = {
        ...contact,
        eventAnalysis: {
          ...events,
          analyzedAt: Date.now()
        },
        updatedAt: Date.now()
      };

      // Create auto-reminder for high-priority time-sensitive opportunities
      if (events.hasTimeSensitiveOpportunity && !contact.reminder) {
        const highPriorityEvent = events.detectedEvents?.find(e => e.priority === 'high');
        if (highPriorityEvent) {
          const reminderDate = new Date();
          reminderDate.setDate(reminderDate.getDate() + 1);
          reminderDate.setHours(10, 0, 0, 0);

          contacts[key].reminder = {
            date: reminderDate.getTime(),
            note: `Event opportunity: ${highPriorityEvent.description}`
          };
        }
      }

      processed++;

      // Limit to 5 per run to avoid API rate limits
      if (processed >= 5) break;
    }
  }

  if (processed > 0) {
    await chrome.storage.local.set({ contacts });
    console.log(`[Flock] Analyzed ${processed} contacts for events`);
  }
}

// --------------------------------
// 6. SMART RELATIONSHIP SCORE ENGINE
// --------------------------------

async function calculateRelationshipScore(contact, interactions) {
  const contactInteractions = interactions
    ?.filter(i => i.username === contact.username || i.username === `bsky:${contact.username}`)
    || [];

  const now = Date.now();
  const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = now - (60 * 24 * 60 * 60 * 1000);

  // Recent interactions (last 30 days)
  const recentInteractions = contactInteractions.filter(i => i.timestamp > thirtyDaysAgo);
  const olderInteractions = contactInteractions.filter(i => i.timestamp > sixtyDaysAgo && i.timestamp <= thirtyDaysAgo);

  // Factor 1: Velocity (interaction frequency trend)
  const recentCount = recentInteractions.length;
  const olderCount = olderInteractions.length;
  const velocityTrend = olderCount > 0 ? (recentCount - olderCount) / olderCount : (recentCount > 0 ? 1 : 0);
  const velocityScore = Math.min(25, Math.max(0, 12.5 + (velocityTrend * 12.5) + (recentCount * 2)));

  // Factor 2: Quality (engagement depth - DMs and replies worth more than likes)
  const qualityWeights = { dm: 5, reply: 4, quote: 4, mention: 3, retweet: 2, like: 1, view: 0.5, follow: 3 };
  const qualitySum = recentInteractions.reduce((sum, i) => sum + (qualityWeights[i.type] || 1), 0);
  const qualityScore = Math.min(25, qualitySum * 2);

  // Factor 3: Recency (when was last interaction)
  const lastInteraction = contact.lastInteraction || contactInteractions[0]?.timestamp;
  const daysSinceLast = lastInteraction ? Math.floor((now - lastInteraction) / (1000 * 60 * 60 * 24)) : 999;
  const recencyScore = daysSinceLast <= 3 ? 25 : daysSinceLast <= 7 ? 20 : daysSinceLast <= 14 ? 15 : daysSinceLast <= 30 ? 10 : daysSinceLast <= 60 ? 5 : 0;

  // Factor 4: Depth (conversation turns - back and forth)
  const conversationDepth = contactInteractions.filter(i => ['dm', 'reply', 'mention'].includes(i.type)).length;
  const depthScore = Math.min(15, conversationDepth * 3);

  // Factor 5: Sentiment (from AI analysis if available)
  const analyzedInteractions = contactInteractions.filter(i => i.aiAnalysis?.sentiment);
  const sentimentCounts = { positive: 0, neutral: 0, negative: 0 };
  analyzedInteractions.forEach(i => sentimentCounts[i.aiAnalysis.sentiment]++);
  const sentimentScore = analyzedInteractions.length > 0
    ? Math.min(10, ((sentimentCounts.positive * 2) - (sentimentCounts.negative * 2) + 5))
    : 5;

  // Calculate total and trend
  const totalScore = Math.round(velocityScore + qualityScore + recencyScore + depthScore + sentimentScore);

  // Determine trend based on velocity
  const trend = velocityTrend > 0.2 ? 'rising' : velocityTrend < -0.2 ? 'falling' : 'stable';

  // Determine maturity stage
  let maturityStage = 'cold';
  if (totalScore >= 80) maturityStage = 'advocate';
  else if (totalScore >= 60) maturityStage = 'hot';
  else if (totalScore >= 40) maturityStage = 'warm';
  else if (totalScore >= 20) maturityStage = 'cooling';

  return {
    score: totalScore,
    trend,
    maturityStage,
    factors: {
      velocity: Math.round(velocityScore),
      quality: Math.round(qualityScore),
      recency: Math.round(recencyScore),
      depth: Math.round(depthScore),
      sentiment: Math.round(sentimentScore)
    },
    insights: {
      recentInteractions: recentCount,
      daysSinceContact: daysSinceLast === 999 ? null : daysSinceLast,
      dominantInteractionType: getMostFrequentType(recentInteractions),
      conversationDepth
    },
    calculatedAt: now
  };
}

function getMostFrequentType(interactions) {
  if (!interactions.length) return null;
  const counts = {};
  interactions.forEach(i => counts[i.type] = (counts[i.type] || 0) + 1);
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
}

async function processRelationshipScores() {
  console.log('[Flock] Processing relationship scores...');

  const contactsResult = await chrome.storage.local.get('contacts');
  const contacts = contactsResult.contacts || {};
  const interactionsResult = await chrome.storage.local.get('interactions');
  const interactions = Object.values(interactionsResult.interactions || {});

  let processed = 0;

  for (const [key, contact] of Object.entries(contacts)) {
    // Skip if scored recently (within 6 hours)
    if (contact.relationshipScore?.calculatedAt &&
        (Date.now() - contact.relationshipScore.calculatedAt) < (6 * 60 * 60 * 1000)) {
      continue;
    }

    const score = await calculateRelationshipScore(contact, interactions);
    contacts[key] = {
      ...contact,
      relationshipScore: score,
      updatedAt: Date.now()
    };

    processed++;
    if (processed >= 20) break; // Limit per batch
  }

  if (processed > 0) {
    await chrome.storage.local.set({ contacts });
    console.log(`[Flock] Updated ${processed} relationship scores`);
  }
}

// --------------------------------
// 7. PROACTIVE OPPORTUNITY DETECTION
// --------------------------------

const OPPORTUNITY_ALARM_NAME = 'flock-opportunity-check';
const OPPORTUNITY_CHECK_INTERVAL = 120; // Every 2 hours

async function detectOpportunities() {
  console.log('[Flock] Scanning for opportunities...');

  const contactsResult = await chrome.storage.local.get('contacts');
  const contacts = Object.values(contactsResult.contacts || {});
  const interactionsResult = await chrome.storage.local.get('interactions');
  const interactions = Object.values(interactionsResult.interactions || {});

  const opportunities = [];
  const now = Date.now();

  for (const contact of contacts) {
    // Skip contacts with low scores
    if (contact.relationshipScore?.score < 20) continue;

    const contactInteractions = interactions.filter(
      i => i.username === contact.username || i.username === `bsky:${contact.username}`
    );

    // Opportunity 1: Stale hot relationship (was active, now cooling)
    if (contact.relationshipScore?.maturityStage === 'hot' &&
        contact.relationshipScore?.trend === 'falling') {
      opportunities.push({
        type: 'cooling_relationship',
        contact: contact.username,
        priority: 'high',
        message: `${contact.displayName || contact.username} engagement is dropping - reach out now`,
        suggestedAction: 'Send a DM or reply to their recent content',
        detectedAt: now
      });
    }

    // Opportunity 2: Unanswered message (they replied, you didn't respond)
    const recentReplies = contactInteractions
      .filter(i => i.type === 'reply' && i.direction === 'inbound' && i.timestamp > (now - 7 * 24 * 60 * 60 * 1000))
      .sort((a, b) => b.timestamp - a.timestamp);

    if (recentReplies.length > 0) {
      const lastInbound = recentReplies[0];
      const hasOutboundAfter = contactInteractions.some(
        i => i.direction === 'outbound' && i.timestamp > lastInbound.timestamp
      );
      if (!hasOutboundAfter) {
        opportunities.push({
          type: 'unanswered_message',
          contact: contact.username,
          priority: 'high',
          message: `You haven't responded to ${contact.displayName || contact.username}'s message`,
          suggestedAction: 'Reply to continue the conversation',
          detectedAt: now
        });
      }
    }

    // Opportunity 3: Perfect timing (high-score contact with no recent interaction)
    const daysSinceLast = contact.relationshipScore?.insights?.daysSinceContact;
    if (contact.relationshipScore?.score >= 50 && daysSinceLast >= 7 && daysSinceLast <= 14) {
      opportunities.push({
        type: 'reconnect_window',
        contact: contact.username,
        priority: 'medium',
        message: `Good time to reconnect with ${contact.displayName || contact.username}`,
        suggestedAction: 'Share something valuable or check in',
        detectedAt: now
      });
    }

    // Opportunity 4: Rising star (rapidly improving relationship)
    if (contact.relationshipScore?.trend === 'rising' &&
        contact.relationshipScore?.factors?.velocity >= 20) {
      opportunities.push({
        type: 'rising_engagement',
        contact: contact.username,
        priority: 'medium',
        message: `${contact.displayName || contact.username} is increasingly engaged with you`,
        suggestedAction: 'Capitalize on momentum - propose a call or collaboration',
        detectedAt: now
      });
    }
  }

  // Store opportunities
  await chrome.storage.local.set({
    opportunities: opportunities.slice(0, 20), // Keep top 20
    opportunitiesUpdatedAt: now
  });

  // Send notification for high-priority opportunities
  const highPriority = opportunities.filter(o => o.priority === 'high');
  if (highPriority.length > 0) {
    const message = highPriority.length === 1
      ? highPriority[0].message
      : `${highPriority.length} contacts need your attention`;

    chrome.notifications.create('flock-opportunities', {
      type: 'basic',
      iconUrl: 'assets/icon-128.png',
      title: 'Flock Opportunity Alert',
      message,
      priority: 2,
      buttons: [{ title: 'View in Flock' }]
    });
  }

  console.log(`[Flock] Detected ${opportunities.length} opportunities`);
  return opportunities;
}

async function setupOpportunityAlarm() {
  await chrome.alarms.clear(OPPORTUNITY_ALARM_NAME);
  chrome.alarms.create(OPPORTUNITY_ALARM_NAME, {
    delayInMinutes: 10,
    periodInMinutes: OPPORTUNITY_CHECK_INTERVAL
  });
  console.log('[Flock] Opportunity detection scheduled');
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === OPPORTUNITY_ALARM_NAME) {
    detectOpportunities();
  }
});

// --------------------------------
// 8. CONVERSATION CONTINUATION INTELLIGENCE
// --------------------------------

async function analyzeConversationThreads(contact, interactions) {
  const contactInteractions = interactions
    ?.filter(i => i.username === contact.username || i.username === `bsky:${contact.username}`)
    ?.sort((a, b) => b.timestamp - a.timestamp)
    ?.slice(0, 20) || [];

  if (contactInteractions.length === 0) {
    return { threads: [], suggestions: [], openQuestions: [] };
  }

  const systemPrompt = `You are an AI that analyzes conversation history to identify open threads, unanswered questions, and suggest natural ways to continue conversations. Return ONLY valid JSON.`;

  const conversationSummary = contactInteractions.map(i => {
    const direction = i.direction || 'unknown';
    const date = new Date(i.timestamp).toLocaleDateString();
    return `[${date}] ${direction === 'outbound' ? 'You' : 'Them'} - ${i.type}: ${i.description || 'No description'}`;
  }).join('\n');

  const userPrompt = `Analyze this conversation history and identify continuation opportunities:

**Contact:** @${contact.username} (${contact.displayName || 'Unknown'})
**Bio:** ${contact.bio || 'No bio'}
**Tags:** ${contact.tags?.join(', ') || 'None'}

**Conversation History (newest first):**
${conversationSummary}

Analyze and return:
{
  "threads": [
    {
      "topic": "Main topic of this thread",
      "status": "open/resolved/stale",
      "lastActivity": "Who spoke last and when",
      "yourTurn": true/false
    }
  ],
  "openQuestions": ["Any questions asked but not answered"],
  "commitments": ["Any promises or next steps mentioned"],
  "sharedInterests": ["Topics you both engaged with"],
  "conversationStarters": [
    {
      "message": "A natural way to restart conversation",
      "context": "Why this would work",
      "timing": "now/wait"
    }
  ],
  "relationshipMomentum": "building/maintaining/fading",
  "suggestedNextMove": "Best next action to take"
}

Return ONLY the JSON.`;

  const result = await callAnthropic(systemPrompt, userPrompt);

  if (result.error) return { error: result.error };

  try {
    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    return { error: 'Failed to parse response' };
  }
  return { error: 'Invalid response format' };
}

// --------------------------------
// 9. CONTEXTUAL PROFILE SNAPSHOTS
// --------------------------------

async function generateProfileSnapshot(contact, interactions) {
  const contactInteractions = interactions
    ?.filter(i => i.username === contact.username || i.username === `bsky:${contact.username}`)
    ?.sort((a, b) => b.timestamp - a.timestamp)
    ?.slice(0, 15) || [];

  const score = contact.relationshipScore || await calculateRelationshipScore(contact, interactions);

  const systemPrompt = `You are an AI assistant that creates concise, actionable relationship briefs for a personal CRM. Be direct and specific. Return ONLY valid JSON.`;

  const interactionSummary = contactInteractions.slice(0, 10).map(i => {
    const date = new Date(i.timestamp).toLocaleDateString();
    const sentiment = i.aiAnalysis?.sentiment || 'unknown';
    return `- ${date}: ${i.type} (${sentiment}) - ${i.description || 'N/A'}`;
  }).join('\n');

  const userPrompt = `Create a contextual profile snapshot for quick reference before engaging:

**Contact:** @${contact.username}
**Name:** ${contact.displayName || 'Unknown'}
**Platform:** ${contact.platform || 'twitter'}
**Bio:** ${contact.bio || 'No bio'}
**Followers:** ${contact.followersCount?.toLocaleString() || 'Unknown'}
**Following:** ${contact.followingCount?.toLocaleString() || 'Unknown'}

**Your Relationship:**
- Score: ${score.score}/100 (${score.maturityStage}, ${score.trend})
- Pipeline Stage: ${contact.pipelineStage || 'new'}
- Tags: ${contact.tags?.join(', ') || 'None'}
- Days since contact: ${score.insights?.daysSinceContact ?? 'Never'}
- Your notes: ${contact.notes || 'None'}

**Recent Interactions:**
${interactionSummary || 'No recorded interactions'}

**Enriched Data:**
- Company: ${contact.enrichedData?.company || 'Unknown'}
- Role: ${contact.enrichedData?.role || 'Unknown'}
- Interests: ${contact.enrichedData?.interests?.join(', ') || 'Unknown'}

Generate a snapshot:
{
  "oneLiner": "Who they are in one sentence",
  "relationshipSummary": "Your relationship in 2-3 sentences",
  "talkingPoints": ["3-4 specific things to discuss based on their interests/recent activity"],
  "conversationStarters": ["2-3 natural opening messages"],
  "avoidTopics": ["Any topics to avoid based on past interactions"],
  "bestChannel": "dm/reply/quote",
  "bestTiming": "When to reach out (morning/afternoon/evening or specific context)",
  "opportunityAngle": "How this relationship could be valuable (if apparent)",
  "riskFactors": ["Any concerns about the relationship"],
  "nextBestAction": {
    "action": "Specific action to take",
    "why": "Brief reason",
    "urgency": "high/medium/low"
  }
}

Return ONLY the JSON.`;

  const result = await callAnthropic(systemPrompt, userPrompt);

  if (result.error) return { error: result.error };

  try {
    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const snapshot = JSON.parse(jsonMatch[0]);
      return {
        ...snapshot,
        relationshipScore: score,
        generatedAt: Date.now()
      };
    }
  } catch (e) {
    return { error: 'Failed to parse response' };
  }
  return { error: 'Invalid response format' };
}

// --------------------------------
// AI PROCESSING SCHEDULER
// --------------------------------

async function runAIProcessing() {
  const apiKey = await getApiKey();
  if (!apiKey) {
    console.log('[Flock] AI processing skipped - no API key');
    return;
  }

  console.log('[Flock] Running AI processing batch...');

  try {
    // Run relationship scoring (no API calls, fast)
    await processRelationshipScores();

    // Run auto-tagging (uses API)
    await processUntaggedInteractions();

    // Run event detection (uses API)
    await processContactsForEvents();

    // Run opportunity detection (no API calls, uses scores)
    await detectOpportunities();

    console.log('[Flock] AI processing batch complete');
  } catch (error) {
    console.error('[Flock] AI processing error:', error);
  }
}

async function setupAIProcessingAlarm() {
  await chrome.alarms.clear(AI_PROCESSING_ALARM_NAME);

  chrome.alarms.create(AI_PROCESSING_ALARM_NAME, {
    delayInMinutes: 5, // First run in 5 minutes
    periodInMinutes: AI_PROCESSING_INTERVAL
  });

  console.log('[Flock] AI processing alarm scheduled');
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === AI_PROCESSING_ALARM_NAME) {
    runAIProcessing();
  }
});

// --------------------------------
// MESSAGE HANDLERS FOR AI FEATURES
// --------------------------------

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'getNextBestAction':
      generateNextBestAction(message.contact, message.interactions)
        .then(data => sendResponse({ success: !data.error, data, error: data.error }));
      return true;

    case 'getConversationHealth':
      analyzeConversationHealth(message.contact, message.interactions)
        .then(data => sendResponse({ success: !data.error, data, error: data.error }));
      return true;

    case 'getContentRecommendations':
      findContactsForContent(message.url, message.title, message.summary)
        .then(data => sendResponse({ success: !data.error, data, error: data.error }));
      return true;

    case 'getEventOpportunities':
      detectEventsAndMilestones(message.contact)
        .then(data => sendResponse({ success: !data.error, data, error: data.error }));
      return true;

    case 'analyzeInteraction':
      analyzeInteractionForTags(message.interaction, message.contact)
        .then(data => sendResponse({ success: !!data, data }));
      return true;

    case 'runAIProcessingNow':
      runAIProcessing().then(() => sendResponse({ success: true }));
      return true;

    case 'getRelationshipScore':
      calculateRelationshipScore(message.contact, message.interactions)
        .then(data => sendResponse({ success: true, data }));
      return true;

    case 'getOpportunities':
      chrome.storage.local.get(['opportunities', 'opportunitiesUpdatedAt'])
        .then(result => sendResponse({
          success: true,
          data: result.opportunities || [],
          updatedAt: result.opportunitiesUpdatedAt
        }));
      return true;

    case 'detectOpportunitiesNow':
      detectOpportunities().then(data => sendResponse({ success: true, data }));
      return true;

    case 'getConversationThreads':
      analyzeConversationThreads(message.contact, message.interactions)
        .then(data => sendResponse({ success: !data.error, data, error: data.error }));
      return true;

    case 'getProfileSnapshot':
      generateProfileSnapshot(message.contact, message.interactions)
        .then(data => sendResponse({ success: !data.error, data, error: data.error }));
      return true;

    case 'refreshRelationshipScores':
      processRelationshipScores().then(() => sendResponse({ success: true }));
      return true;

    // Sync operations
    case 'getSyncStatus':
      SyncManager.getStatus().then(sendResponse);
      return true;

    case 'forceSync':
      SyncManager.forceSync().then(sendResponse);
      return true;

    case 'syncKey':
      SyncManager.syncKey(message.key, message.value).then(() => sendResponse({ success: true }));
      return true;
  }
});

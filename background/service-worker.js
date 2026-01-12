/**
 * Flock Service Worker
 * Background script for extension coordination and AI API calls
 */

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

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

// Also setup alarms when service worker starts (in case it was terminated)
setupReminderAlarm();
setupDailyDigest();
setupAutopilotAlarm();

// Initial check on startup
setTimeout(checkReminders, 5000);

console.log('[Flock] Service worker initialized');

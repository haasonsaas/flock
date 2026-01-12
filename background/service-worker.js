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

// Install/update handler
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('[Flock] Extension installed');
    // Could open onboarding page here
  } else if (details.reason === 'update') {
    console.log('[Flock] Extension updated to version', chrome.runtime.getManifest().version);
  }
});

console.log('[Flock] Service worker initialized');

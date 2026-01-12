# Flock - Twitter CRM

A Chrome extension that turns Twitter/X into your personal CRM. Save profiles, track interactions, and manage your sales pipeline without leaving Twitter.

## Features

### Core CRM
- **One-click profile saving** - Save any Twitter profile to your CRM with a single click
- **Profile data extraction** - Automatically captures username, bio, follower count, location, and more
- **Pipeline management** - Track contacts through stages: New → Contacted → Engaged → Qualified → Won/Lost
- **Tags & organization** - Categorize contacts with custom tags
- **Notes** - Add private notes to any contact
- **Interaction logging** - Track DMs, replies, calls, meetings, and other touchpoints

### UI Components
- **Save button** - Appears on Twitter profile pages, deeply integrated with Twitter's UI
- **Sidebar overlay** - Quick access to contact details without leaving the page
- **Popup dashboard** - Overview of all contacts with search and filtering
- **Pipeline view** - Visual Kanban-style board of your sales funnel

### Data
- **Local-first storage** - All data stored locally in IndexedDB (your data never leaves your browser)
- **Export/Import** - Full JSON export and import for backup and portability
- **No account required** - Works completely offline, no sign-up needed

### AI-Powered Features (Optional)
- **Contact Enrichment** - Research contacts automatically to find company, role, LinkedIn, and more
- **Meeting Briefs** - Generate one-pagers before calls with talking points and background
- **Follow-up Suggestions** - Get AI recommendations on when and how to follow up

## Installation

### From Source (Development)

1. **Generate icons**
   - Open `scripts/generate-icons.html` in your browser
   - Click "Download All Icons"
   - Move the downloaded PNGs to the `assets/` folder

2. **Load the extension**
   - Open Chrome and go to `chrome://extensions`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `flock` folder

3. **Use the extension**
   - Visit any Twitter/X profile
   - Click "Save to Flock" to add them to your CRM
   - Click the extension icon to open the dashboard

### AI Features Setup (Optional)

To enable AI-powered features like contact enrichment and meeting briefs:

1. **Get an Anthropic API key**
   - Visit [console.anthropic.com](https://console.anthropic.com/)
   - Create an account and generate an API key

2. **Add your API key to Flock**
   - Click the Flock extension icon
   - Go to Settings (or right-click → Options)
   - Paste your API key in the "AI Features" section
   - Click "Save"

3. **Use AI features**
   - Open any saved contact's sidebar
   - Click "Enrich" to research the contact
   - Use "Meeting Brief" or "Follow-up Ideas" for AI assistance

AI features are optional - the extension works fully without them. Your API key is stored securely in Chrome's sync storage.

## Project Structure

```
flock/
├── manifest.json           # Chrome extension manifest (v3)
├── background/
│   └── service-worker.js   # Background service worker + AI API calls
├── content/
│   ├── content.js          # Injected into Twitter pages
│   └── content.css         # Styles for injected elements
├── popup/
│   ├── popup.html          # Dashboard popup
│   ├── popup.css           # Dashboard styles
│   └── popup.js            # Dashboard logic
├── options/
│   ├── options.html        # Settings page (includes API key config)
│   ├── options.css         # Settings styles
│   └── options.js          # Settings logic
├── lib/
│   ├── storage.js          # IndexedDB wrapper
│   ├── twitter-parser.js   # DOM parsing utilities
│   └── icons.js            # SVG icon library
├── assets/
│   ├── icon.svg            # Source icon
│   ├── icon-16.png         # Toolbar icon
│   ├── icon-32.png         # Extension icon
│   ├── icon-48.png         # Extension management
│   └── icon-128.png        # Chrome Web Store
└── scripts/
    └── generate-icons.html # Icon generation utility
```

## Design

Flock uses a **Premium Utility** aesthetic:
- Dark theme that matches Twitter's dark mode
- Amber/gold accent color (#F59E0B) for distinction from Twitter's blue
- Clean, minimal interface with professional monospace accents
- Smooth micro-interactions and animations
- Native-feeling integration with Twitter's UI

## Development

### Tech Stack
- Vanilla JavaScript (no frameworks)
- IndexedDB for local storage
- Chrome Extension Manifest V3
- CSS custom properties for theming

### Key Files
- `content/content.js` - Main content script that injects UI into Twitter
- `background/service-worker.js` - Background worker handling AI API calls
- `lib/storage.js` - Database abstraction layer
- `lib/twitter-parser.js` - Twitter DOM parsing utilities
- `popup/popup.js` - Dashboard logic

### Testing
1. Make changes to the source files
2. Go to `chrome://extensions`
3. Click the refresh icon on the Flock extension
4. Reload the Twitter tab

## Roadmap

### Phase 2 (In Progress)
- [ ] Automatic interaction tracking
- [x] Contact enrichment (company, role, LinkedIn)
- [x] AI-powered meeting briefs
- [x] Follow-up suggestions
- [ ] Lead scoring
- [ ] Cloud sync (optional)
- [ ] Team collaboration

### Phase 3 (Future)
- [ ] CRM integrations (HubSpot, Salesforce)
- [ ] Prospecting tools
- [ ] Analytics dashboard
- [ ] Browser automation

## Privacy

Flock is designed with privacy in mind:
- All data stored locally in your browser
- No external servers or analytics
- No account required
- Full data export available

## License

MIT License - feel free to use, modify, and distribute.

---

Built for Twitter power users who want a simple, powerful CRM.

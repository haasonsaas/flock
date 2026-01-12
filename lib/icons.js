/**
 * Flock Icon Library
 * SVG icons as template strings for injection
 */

const FlockIcons = {
  // Flock logo (bird)
  logo: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M21.5 6.5c-.5.5-1.5 1-3 1.5.5 1.5.5 3 0 4.5-.5 1.5-1.5 3-3 4.5-1.5 1.5-3.5 2.5-6 3-2.5.5-5 .5-7.5-.5 2 0 3.5-.5 5-1.5-1.5 0-2.5-.5-3.5-1.5 1 0 2-.5 2.5-1-1.5-.5-2.5-1.5-3-2.5 1 .5 2 .5 2.5.5C4 12 3 10.5 3 8.5c.5.5 1.5.5 2 .5-1.5-1-2-2.5-2-4.5 0-.5 0-1 .5-1.5 2 2.5 4.5 4 8 4.5 0-.5-.5-1-.5-1.5 0-2 1.5-3.5 3.5-3.5 1 0 2 .5 2.5 1 1-.5 2-.5 2.5-1-.5 1-.5 2-1.5 2.5 1 0 2-.5 2.5-.5-.5 1-1 1.5-2 2z"/>
  </svg>`,

  // Plus icon
  plus: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 4v16m-8-8h16" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>
  </svg>`,

  // Check icon
  check: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M5 12l5 5L20 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  </svg>`,

  // X/Close icon
  close: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 6l12 12M6 18L18 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>
  </svg>`,

  // User/Contact icon
  user: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="2" fill="none"/>
    <path d="M4 20c0-4 4-6 8-6s8 2 8 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>
  </svg>`,

  // Note icon
  note: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 4h16v16H4z" stroke="currentColor" stroke-width="2" fill="none"/>
    <path d="M8 8h8M8 12h8M8 16h4" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>
  </svg>`,

  // Message/DM icon
  message: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M21 12c0 4.5-4 8-9 8-1.5 0-3-.5-4-1l-5 1 1-4c-1-1-2-3-2-4 0-4.5 4-8 9-8s9 3.5 9 8z" stroke="currentColor" stroke-width="2" fill="none"/>
  </svg>`,

  // Reply icon
  reply: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M9 14l-5-5 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <path d="M4 9h11c3 0 5 2 5 5v3" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>
  </svg>`,

  // Heart/Like icon
  heart: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 21C12 21 3 13.5 3 8.5C3 5.5 5.5 3 8.5 3C10 3 11.5 4 12 5C12.5 4 14 3 15.5 3C18.5 3 21 5.5 21 8.5C21 13.5 12 21 12 21Z" stroke="currentColor" stroke-width="2" fill="none"/>
  </svg>`,

  // Retweet icon
  retweet: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M17 2l4 4-4 4M3 11V9c0-2 2-4 4-4h14M7 22l-4-4 4-4M21 13v2c0 2-2 4-4 4H3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  </svg>`,

  // Calendar icon
  calendar: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2" fill="none"/>
    <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>
  </svg>`,

  // Tag icon
  tag: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 4h7l9 9-7 7-9-9V4z" stroke="currentColor" stroke-width="2" fill="none"/>
    <circle cx="8" cy="8" r="1.5" fill="currentColor"/>
  </svg>`,

  // Pipeline/Funnel icon
  pipeline: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 4h18v2l-7 7v7l-4 2v-9L3 6V4z" stroke="currentColor" stroke-width="2" fill="none"/>
  </svg>`,

  // Search icon
  search: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2" fill="none"/>
    <path d="M21 21l-4.5-4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>
  </svg>`,

  // Settings icon
  settings: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2" fill="none"/>
    <path d="M12 1v4m0 14v4M4.22 4.22l2.83 2.83m9.9 9.9l2.83 2.83M1 12h4m14 0h4M4.22 19.78l2.83-2.83m9.9-9.9l2.83-2.83" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>
  </svg>`,

  // Export icon
  export: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 3v12m-5-5l5 5 5-5M5 21h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  </svg>`,

  // Trash icon
  trash: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 6h18M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2m3 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6h14z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>
  </svg>`,

  // Edit/Pencil icon
  edit: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>
  </svg>`,

  // External link icon
  externalLink: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  </svg>`,

  // Chevron icons
  chevronLeft: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  </svg>`,

  chevronRight: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  </svg>`,

  chevronDown: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  </svg>`,

  // More (three dots) icon
  more: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
    <circle cx="6" cy="12" r="1.5" fill="currentColor"/>
    <circle cx="18" cy="12" r="1.5" fill="currentColor"/>
  </svg>`,

  // Star icon
  star: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" stroke-width="2" fill="none"/>
  </svg>`,

  starFilled: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="currentColor"/>
  </svg>`,

  // Loading spinner
  spinner: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none" opacity="0.25"/>
    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>
  </svg>`,

  // Verified badge
  verified: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <path d="M12 3l2.5 1.5L17 3l1 2.5 2.5 1-1.5 2.5L20.5 12l-1.5 2.5 1.5 2.5-2.5 1-1 2.5-2.5-1.5L12 21l-2.5-1.5L7 21l-1-2.5-2.5-1 1.5-2.5L3.5 12l1.5-2.5L3.5 7l2.5-1 1-2.5 2.5 1.5L12 3z" stroke="currentColor" stroke-width="2" fill="none"/>
  </svg>`,

  // Info icon
  info: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/>
    <path d="M12 16v-4M12 8h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>
  </svg>`,

  // Warning icon
  warning: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L2 22h20L12 2z" stroke="currentColor" stroke-width="2" fill="none"/>
    <path d="M12 9v4M12 17h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>
  </svg>`,

  // Success icon
  success: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/>
    <path d="M8 12l3 3 5-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  </svg>`,

  // List icon
  list: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>
  </svg>`,

  // Grid icon
  grid: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="3" width="7" height="7" stroke="currentColor" stroke-width="2" fill="none"/>
    <rect x="14" y="3" width="7" height="7" stroke="currentColor" stroke-width="2" fill="none"/>
    <rect x="3" y="14" width="7" height="7" stroke="currentColor" stroke-width="2" fill="none"/>
    <rect x="14" y="14" width="7" height="7" stroke="currentColor" stroke-width="2" fill="none"/>
  </svg>`,

  // Clock icon
  clock: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/>
    <path d="M12 6v6l4 2" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>
  </svg>`,
};

export default FlockIcons;

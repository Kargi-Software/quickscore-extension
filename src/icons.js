const Icons = {
  
  
  
  
  
  DEFAULT_TEAM_LOGO_DATA: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAoCAYAAACM/rhtAAAAeUlEQVR42u3YuxHAMAwCUPYfQVNpI2eD2E70446C/nUCwd3X5EBAAQVMBprZa9qAO1gUFNmwv1BU4r4gUY27RaIDd4NEF+4UyQ3Mxp0geYFVuB1SQAEFFLALqEsSAVSbiQCOL6wUlZ9iNFHMTorhTvP60HdLQAGH5AFGrvEOlMuDbQAAAABJRU5ErkJggg==",
  defaultTeamLogo() {
    try {
      if (typeof browser !== "undefined" && browser.runtime && browser.runtime.getURL) {
        return browser.runtime.getURL("icons/svg/default-team.svg");
      }
    } catch (e) {}
    return this.DEFAULT_TEAM_LOGO_DATA;
  },
  settings() {
    return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">\n      <circle cx="12" cy="12" r="3"></circle>\n      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>\n    </svg>`;
  },
  refresh() {
    return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">\n      <polyline points="23 4 23 10 17 10"></polyline>\n      <polyline points="1 20 1 14 7 14"></polyline>\n      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>\n    </svg>`;
  },
  close() {
    return `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round">\n      <line x1="18" y1="6" x2="6" y2="18"></line>\n      <line x1="6" y1="6" x2="18" y2="18"></line>\n    </svg>`;
  },
  removeX() {
    return `<svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round">\n      <line x1="18" y1="6" x2="6" y2="18"></line>\n      <line x1="6" y1="6" x2="18" y2="18"></line>\n    </svg>`;
  },
  chevronLeft() {
    return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">\n      <polyline points="15 18 9 12 15 6"></polyline>\n    </svg>`;
  },
  chevronRight() {
    return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">\n      <polyline points="9 18 15 12 9 6"></polyline>\n    </svg>`;
  },
  sidebar() {
    return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">\n      <rect x="3" y="3" width="18" height="18" rx="2"></rect>\n      <line x1="9" y1="3" x2="9" y2="21"></line>\n    </svg>`;
  },
  search() {
    return `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">\n      <circle cx="11" cy="11" r="7"></circle>\n      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>\n    </svg>`;
  },
  externalLink() {
    return `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">\n      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>\n      <polyline points="15 3 21 3 21 9"></polyline>\n      <line x1="10" y1="14" x2="21" y2="3"></line>\n    </svg>`;
  },
  pin() {
    return `<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" stroke="currentColor" stroke-width="1" stroke-linejoin="round">\n      <path d="M12 2a5 5 0 0 0-5 5c0 3.5 5 11 5 11s5-7.5 5-11a5 5 0 0 0-5-5zm0 7a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"></path>\n    </svg>`;
  },
  bell() {
    return `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">\n      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"></path>\n      <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>\n    </svg>`;
  },
  bellMuted() {
    return `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">\n      <path d="M18 8a6 6 0 0 0-9.33-5"></path>\n      <path d="M6.26 6.26A5.98 5.98 0 0 0 6 8c0 7-3 9-3 9h14"></path>\n      <path d="M18 8c0 3.5 1.34 5.86 2.21 7.15"></path>\n      <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>\n      <line x1="2" y1="2" x2="22" y2="22"></line>\n    </svg>`;
  },
  sun() {
    return `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">\n      <circle cx="12" cy="12" r="4"></circle>\n      <line x1="12" y1="2" x2="12" y2="4"></line>\n      <line x1="12" y1="20" x2="12" y2="22"></line>\n      <line x1="4.9" y1="4.9" x2="6.3" y2="6.3"></line>\n      <line x1="17.7" y1="17.7" x2="19.1" y2="19.1"></line>\n      <line x1="2" y1="12" x2="4" y2="12"></line>\n      <line x1="20" y1="12" x2="22" y2="12"></line>\n      <line x1="4.9" y1="19.1" x2="6.3" y2="17.7"></line>\n      <line x1="17.7" y1="6.3" x2="19.1" y2="4.9"></line>\n    </svg>`;
  },
  moon() {
    return `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">\n      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>\n    </svg>`;
  },
  star() {
    return `<svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor" stroke="none">\n      <path d="M12 2l2.9 6.26 6.6.72-4.9 4.55 1.35 6.47L12 16.9 6.05 20l1.35-6.47-4.9-4.55 6.6-.72z"></path>\n    </svg>`;
  },
  timeline() {
    return `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">\n      <line x1="4" y1="6" x2="20" y2="6"></line>\n      <line x1="4" y1="12" x2="15" y2="12"></line>\n      <line x1="4" y1="18" x2="11" y2="18"></line>\n    </svg>`;
  },
  spinner() {
    return `<svg class="lsp-spin" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round">\n      <path d="M12 3a9 9 0 1 1-9 9" opacity="0.85"></path>\n    </svg>`;
  },
  arrowIn() {
    return `<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">\n      <line x1="5" y1="12" x2="19" y2="12"></line>\n      <polyline points="13 6 19 12 13 18"></polyline>\n    </svg>`;
  },
  arrowOut() {
    return `<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">\n      <line x1="19" y1="12" x2="5" y2="12"></line>\n      <polyline points="11 6 5 12 11 18"></polyline>\n    </svg>`;
  },
  matchInfo() {
    return `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">\n      <circle cx="12" cy="12" r="9"></circle>\n      <line x1="12" y1="11" x2="12" y2="16.5"></line>\n      <circle cx="12" cy="7.5" r="0.5" fill="currentColor" stroke="none"></circle>\n    </svg>`;
  },
  lineup() {
    return `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">\n      <rect x="3" y="3" width="18" height="18" rx="2"></rect>\n      <circle cx="12" cy="7.5" r="1.6" fill="currentColor" stroke="none"></circle>\n      <circle cx="7" cy="14" r="1.6" fill="currentColor" stroke="none"></circle>\n      <circle cx="17" cy="14" r="1.6" fill="currentColor" stroke="none"></circle>\n      <circle cx="12" cy="18.5" r="1.6" fill="currentColor" stroke="none"></circle>\n    </svg>`;
  }
};

if (typeof window !== "undefined") {
  window.Icons = Icons;
} else {
  self.Icons = Icons;
}
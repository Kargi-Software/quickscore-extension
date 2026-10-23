let currentSettings = null;

let currentOffset = 0;

let lastMatches = [];

let collapsedLeagues = new Set;

let autoRefreshTimer = null;

let dayNavDebounceTimer = null;

let fetchToken = 0;

let isFetching = false;

let pinnedMatches = [];

let mutedMatches = [];

let currentSportFilter = null;

let recentlyUpdatedIds = new Set;

let expandedMatchId = null;

let activeDetailsTab = "events";

const matchDetailsCache = new Map;

let detailsRequestToken = 0;

const DAY_NAV_DEBOUNCE_MS = 350;

const SPORT_ICON_FILE = {
  soccer: "soccer.svg",
  basketball: "basketball.svg",
  football: "american-football.svg",
  baseball: "baseball.svg",
  hockey: "ice-hockey.svg"
};

function resolveSettings(settings) {
  return {
    ...settings,
    timezone: TimeUtil.getSystemTimezone()
  };
}

function isPinned(matchId) {
  return pinnedMatches.some(p => p.id === matchId);
}

function isMuted(matchId) {
  return mutedMatches.includes(matchId);
}

async function togglePin(match) {
  pinnedMatches = await Storage.togglePin(match);
  applyRender();
}

async function toggleMute(matchId) {
  mutedMatches = await Storage.toggleMute(matchId);
  applyRender();
}

function getEffectiveTheme() {
  const t = currentSettings && currentSettings.theme;
  if (t === "light" || t === "dark") return t;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme() {
  const t = currentSettings && currentSettings.theme;
  if (t === "light" || t === "dark") {
    document.documentElement.setAttribute("data-theme", t);
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
  updateThemeButton();
}

function updateThemeButton() {
  const btn = document.getElementById("theme-btn");
  const effective = getEffectiveTheme();
  btn.innerHTML = effective === "dark" ? Icons.sun() : Icons.moon();
  btn.title = effective === "dark" ? "Switch to light theme" : "Switch to dark theme";
}

async function toggleTheme() {
  const next = getEffectiveTheme() === "dark" ? "light" : "dark";
  currentSettings = resolveSettings(await Storage.updateSettings({
    theme: next
  }));
  applyTheme();
}

function applySidebarMode() {
  // Toolbar popup is a fixed ~440px panel. Firefox sidebar reuses this page
  // inside a taller/resizable browser panel — mark it so CSS can draw edges.
  let sidebar = false;
  try {
    if (browser.sidebarAction) {
      sidebar = window.innerWidth > 450 || window.innerHeight > 520;
    }
  } catch (e) {}
  document.documentElement.classList.toggle("sidebar-mode", sidebar);
}

async function init() {
  applySidebarMode();
  document.getElementById("refresh-btn").innerHTML = Icons.refresh();
  document.getElementById("settings-btn").innerHTML = Icons.settings();
  document.getElementById("close-btn").innerHTML = Icons.close();
  document.getElementById("day-prev").innerHTML = Icons.chevronLeft();
  document.getElementById("day-next").innerHTML = Icons.chevronRight();
  document.getElementById("sidebar-btn").innerHTML = Icons.sidebar();
  applyTheme();
  document.getElementById("loading").classList.remove("hidden");
  document.getElementById("empty-state").classList.add("hidden");
  browser.runtime.sendMessage({
    type: "POPUP_OPENED"
  }).catch(() => {});
  const [recentlyUpdatedMap, settings, pinned, muted, uiState, snapshot] = await Promise.all([ Storage.get(CONFIG.STORAGE_KEYS.RECENTLY_UPDATED_MATCHES, {}), Storage.getSettings(), Storage.getPinnedMatches(), Storage.getMutedMatches(), Storage.get(CONFIG.STORAGE_KEYS.UI_STATE, {
    dayOffset: 0,
    collapsedLeagues: []
  }), Storage.get(CONFIG.STORAGE_KEYS.MATCH_SNAPSHOT, null) ]);
  recentlyUpdatedIds = new Set(Object.keys(recentlyUpdatedMap || {}));
  currentSettings = resolveSettings(settings);
  applyTheme();
  populateSportChips(currentSettings);
  pinnedMatches = pinned;
  mutedMatches = muted;
  currentOffset = uiState && typeof uiState.dayOffset === "number" ? uiState.dayOffset : 0;
  collapsedLeagues = new Set(uiState && uiState.collapsedLeagues || []);
  wireControls();
  updateDayLabel();
  if (snapshot && snapshot.offsetDays === currentOffset && Array.isArray(snapshot.matches)) {
    lastMatches = snapshot.matches;
    applyRender();
    refreshDay({
      spinner: false,
      force: false
    });
  } else {
    await refreshDay({
      spinner: true,
      force: false
    });
  }
  setupAutoRefresh();
}

function wireControls() {
  document.getElementById("close-btn").addEventListener("click", () => {
    window.close();
  });
  document.getElementById("settings-btn").addEventListener("click", async () => {
    await browser.runtime.openOptionsPage();
    window.close();
  });
  document.getElementById("theme-btn").addEventListener("click", toggleTheme);
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (!currentSettings || currentSettings.theme !== "light" && currentSettings.theme !== "dark") {
      applyTheme();
    }
  });
  document.getElementById("refresh-btn").addEventListener("click", () => {
    refreshDay({
      spinner: true,
      force: true
    });
  });
  wireSidebarButton();
  wireDatePicker();
  document.getElementById("day-prev").addEventListener("click", () => {
    currentOffset -= 1;
    onDayChanged();
  });
  document.getElementById("day-next").addEventListener("click", () => {
    currentOffset += 1;
    onDayChanged();
  });
  document.getElementById("day-today").addEventListener("click", () => {
    currentOffset = 0;
    onDayChanged();
  });
}

function wireSidebarButton() {
  const btn = document.getElementById("sidebar-btn");
  if (!browser.sidebarAction) return;
  btn.classList.remove("hidden");
  btn.addEventListener("click", () => {
    browser.sidebarAction.open();
    window.close();
  });
}

function wireDatePicker() {
  const label = document.getElementById("day-label");
  const panel = document.getElementById("date-picker-panel");
  document.getElementById("dp-prev-month").innerHTML = Icons.chevronLeft();
  document.getElementById("dp-next-month").innerHTML = Icons.chevronRight();
  label.addEventListener("click", () => {
    if (panel.classList.contains("hidden")) {
      const dateStr = TimeUtil.getLocalDateStrForOffset(currentOffset, currentSettings.timezone);
      const [y, m] = dateStr.split("-").map(Number);
      openCalendar(y, m - 1);
    } else {
      panel.classList.add("hidden");
    }
  });
  document.getElementById("dp-prev-month").addEventListener("click", () => {
    calendarViewMonth -= 1;
    if (calendarViewMonth < 0) {
      calendarViewMonth = 11;
      calendarViewYear -= 1;
    }
    renderCalendarGrid();
  });
  document.getElementById("dp-next-month").addEventListener("click", () => {
    calendarViewMonth += 1;
    if (calendarViewMonth > 11) {
      calendarViewMonth = 0;
      calendarViewYear += 1;
    }
    renderCalendarGrid();
  });
}

let calendarViewYear = 0;

let calendarViewMonth = 0;

function openCalendar(year, month) {
  calendarViewYear = year;
  calendarViewMonth = month;
  document.getElementById("date-picker-panel").classList.remove("hidden");
  renderCalendarGrid();
}

function renderCalendarGrid() {
  const monthLabel = document.getElementById("dp-month-label");
  const weekdaysEl = document.getElementById("dp-weekdays");
  const gridEl = document.getElementById("dp-grid");
  const monthNames = [ "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December" ];
  monthLabel.textContent = `${monthNames[calendarViewMonth]} ${calendarViewYear}`;
  if (!weekdaysEl.childElementCount) {
    for (const wd of [ "M", "T", "W", "T", "F", "S", "S" ]) {
      const el = document.createElement("div");
      el.textContent = wd;
      weekdaysEl.appendChild(el);
    }
  }
  gridEl.innerHTML = "";
  const todayStr = TimeUtil.getLocalDateStrForOffset(0, currentSettings.timezone);
  const selectedStr = TimeUtil.getLocalDateStrForOffset(currentOffset, currentSettings.timezone);
  const rawWeekday = new Date(Date.UTC(calendarViewYear, calendarViewMonth, 1)).getUTCDay();
  const firstWeekday = (rawWeekday + 6) % 7;
  const daysInMonth = new Date(Date.UTC(calendarViewYear, calendarViewMonth + 1, 0)).getUTCDate();
  for (let i = 0; i < firstWeekday; i++) {
    const empty = document.createElement("div");
    empty.className = "dp-day dp-empty";
    gridEl.appendChild(empty);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${calendarViewYear}-${String(calendarViewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const btn = document.createElement("button");
    btn.className = "dp-day";
    btn.textContent = String(day);
    if (dateStr === todayStr) btn.classList.add("dp-today");
    if (dateStr === selectedStr) btn.classList.add("dp-selected");
    btn.addEventListener("click", () => {
      const diffDays = Math.round((new Date(`${dateStr}T00:00:00Z`) - new Date(`${todayStr}T00:00:00Z`)) / (24 * 60 * 60 * 1e3));
      currentOffset = diffDays;
      document.getElementById("date-picker-panel").classList.add("hidden");
      onDayChanged();
    });
    gridEl.appendChild(btn);
  }
}

function onDayChanged() {
  persistUiState();
  updateDayLabel();
  document.getElementById("date-picker-panel").classList.add("hidden");
  document.getElementById("sections").innerHTML = "";
  document.getElementById("empty-state").classList.add("hidden");
  document.getElementById("loading").classList.remove("hidden");
  if (dayNavDebounceTimer) clearTimeout(dayNavDebounceTimer);
  const targetOffset = currentOffset;
  dayNavDebounceTimer = setTimeout(() => {
    if (targetOffset === currentOffset) {
      refreshDay({
        spinner: true,
        force: false
      });
    }
  }, DAY_NAV_DEBOUNCE_MS);
}

function persistUiState() {
  Storage.set(CONFIG.STORAGE_KEYS.UI_STATE, {
    dayOffset: currentOffset,
    collapsedLeagues: Array.from(collapsedLeagues)
  });
}

function setupAutoRefresh() {
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer);
    autoRefreshTimer = null;
  }
  if (currentSettings.refreshMode !== CONFIG.REFRESH_MODES.AUTO) return;
  const intervalMs = Math.max(10, currentSettings.refreshIntervalSec || CONFIG.DEFAULT_POLL_INTERVAL_SEC) * 1e3;
  autoRefreshTimer = setInterval(() => {
    refreshDay({
      spinner: false,
      force: false
    });
  }, intervalMs);
}

function relevantSports(settings) {
  const sports = new Set;
  const selectedLeagues = LeaguesData.getLeaguesByIds(settings.selectedLeagueIds || []);
  selectedLeagues.forEach(l => sports.add(l.sport));
  (settings.favoriteTeams || []).forEach(t => {
    if (t.sport) sports.add(t.sport);
  });
  return Array.from(sports).sort();
}

function populateSportChips(settings) {
  const wrap = document.getElementById("sport-chips");
  wrap.innerHTML = "";
  const sports = relevantSports(settings);
  const wanted = settings.selectedSportFilter || CONFIG.ALL_SPORTS;
  const validValues = [ CONFIG.ALL_SPORTS, ...sports ];
  currentSportFilter = validValues.includes(wanted) ? wanted : CONFIG.ALL_SPORTS;
  const makeChip = (value, iconFile, label) => {
    const chip = document.createElement("button");
    chip.className = "chip" + (value === currentSportFilter ? " active" : "");
    chip.dataset.sport = value;
    chip.setAttribute("role", "tab");
    chip.title = label;
    if (iconFile) {
      const icon = document.createElement("img");
      icon.className = "chip-icon";
      icon.src = browser.runtime.getURL("icons/SVG/" + iconFile);
      icon.alt = label;
      chip.appendChild(icon);
    } else {
      chip.textContent = label;
    }
    chip.addEventListener("click", () => onSportChipClick(value));
    wrap.appendChild(chip);
  };
  makeChip(CONFIG.ALL_SPORTS, null, "All");
  for (const sport of sports) {
    makeChip(sport, SPORT_ICON_FILE[sport], sport.charAt(0).toUpperCase() + sport.slice(1));
  }
}

async function onSportChipClick(value) {
  if (value === currentSportFilter) return;
  currentSportFilter = value;
  document.querySelectorAll("#sport-chips .chip").forEach(c => {
    c.classList.toggle("active", c.dataset.sport === value);
  });
  if (currentSettings) currentSettings.selectedSportFilter = value;
  if (!isFetching) applyRender();
  currentSettings = resolveSettings(await Storage.updateSettings({
    selectedSportFilter: value
  }));
}

function updateDayLabel() {
  const label = document.getElementById("day-label");
  label.textContent = TimeUtil.getOffsetDayLabel(currentOffset, currentSettings && currentSettings.timezone || "UTC");
}

function showError(message) {
  const banner = document.getElementById("error-banner");
  banner.textContent = message;
  banner.classList.remove("hidden");
}

function hideError() {
  document.getElementById("error-banner").classList.add("hidden");
}

async function refreshDay(opts) {
  const loadingEl = document.getElementById("loading");
  const emptyEl = document.getElementById("empty-state");
  const myToken = ++fetchToken;
  const requestedOffset = currentOffset;
  isFetching = true;
  if (opts.spinner) {
    loadingEl.classList.remove("hidden");
    emptyEl.classList.add("hidden");
  }
  try {
    const response = await browser.runtime.sendMessage({
      type: "GET_MATCHES_FOR_DAY",
      offsetDays: requestedOffset,
      force: !!opts.force
    });
    if (myToken !== fetchToken) return;
    currentSettings = resolveSettings(response.settings);
    lastMatches = response.matches || [];
    if (response.hadError) {
      showError("Couldn't reach the score server (offline, rate-limited, or blocked). Showing the latest data available.");
    } else {
      hideError();
    }
    await Storage.set(CONFIG.STORAGE_KEYS.MATCH_SNAPSHOT, {
      offsetDays: requestedOffset,
      matches: lastMatches,
      fetchedAt: Date.now()
    });
    applyRender();
  } catch (e) {
    if (myToken !== fetchToken) return;
    if (opts.spinner) {
      showError("Failed to load matches. Please try the refresh button.");
    }
  } finally {
    if (myToken === fetchToken) {
      isFetching = false;
      if (opts.spinner) loadingEl.classList.add("hidden");
    }
  }
}

function applyRender() {
  render(lastMatches, currentSettings, currentSportFilter || CONFIG.ALL_SPORTS);
}

function render(matches, settings, sportFilter) {
  document.getElementById("loading").classList.add("hidden");
  const sectionsEl = document.getElementById("sections");
  const emptyEl = document.getElementById("empty-state");
  sectionsEl.innerHTML = "";
  const filtered = sportFilter === CONFIG.ALL_SPORTS ? matches : matches.filter(m => m.sport === sportFilter);
  const topMatchesById = new Map;
  for (const m of filtered) {
    if (Utils.isFavoriteMatch(m, settings.favoriteTeams) || isPinned(m.id)) {
      topMatchesById.set(m.id, m);
    }
  }
  const favoriteMatches = Array.from(topMatchesById.values()).sort((a, b) => new Date(a.startTimeUTC) - new Date(b.startTimeUTC));
  const selectedLeagueIds = new Set(settings.selectedLeagueIds || []);
  const generalMatches = filtered.filter(m => selectedLeagueIds.has(m.leagueId));
  const sorted = [ ...generalMatches ].sort((a, b) => new Date(a.startTimeUTC) - new Date(b.startTimeUTC));
  if (favoriteMatches.length === 0 && sorted.length === 0) {
    emptyEl.classList.remove("hidden");
    return;
  }
  emptyEl.classList.add("hidden");
  if (favoriteMatches.length > 0) {
    sectionsEl.appendChild(buildFavoritesSection(favoriteMatches, settings));
  }
  if (sorted.length > 0) {
    sectionsEl.appendChild(buildLeagueSections(sorted, settings));
  }
}

function buildFavoritesSection(matches, settings) {
  const section = document.createElement("div");
  section.className = "fav-section";
  const title = document.createElement("div");
  title.className = "section-title";
  title.innerHTML = `${Icons.star()}<span>Favorites &amp; Pinned</span>`;
  section.appendChild(title);
  appendMatchesWithDividers(section, matches, settings, true);
  return section;
}

function buildLeagueSections(matches, settings) {
  const frag = document.createDocumentFragment();
  const byCompetition = Utils.groupBy(matches, m => m.leagueName);
  for (const [competitionName, compMatches] of byCompetition.entries()) {
    const group = document.createElement("div");
    group.className = "competition-group";
    const isCollapsed = collapsedLeagues.has(competitionName);
    const competitionLink = compMatches[0] && compMatches[0].competitionLink;
    const compTitle = document.createElement("div");
    compTitle.className = "competition-title collapsible";
    compTitle.innerHTML = `<span class="collapse-arrow">${isCollapsed ? "▸" : "▾"}</span>` + `<span class="comp-name"></span>`;
    compTitle.querySelector(".comp-name").textContent = competitionName;
    compTitle.addEventListener("click", () => toggleCollapse(competitionName));
    if (competitionLink) {
      const linkBtn = document.createElement("a");
      linkBtn.className = "comp-link";
      linkBtn.href = competitionLink;
      linkBtn.target = "_blank";
      linkBtn.rel = "noopener noreferrer";
      linkBtn.title = "Open on ESPN";
      linkBtn.innerHTML = Icons.externalLink();
      linkBtn.addEventListener("click", e => e.stopPropagation());
      compTitle.appendChild(linkBtn);
    }
    group.appendChild(compTitle);
    const matchList = document.createElement("div");
    matchList.className = "match-list" + (isCollapsed ? " hidden" : "");
    appendMatchesWithDividers(matchList, compMatches, settings, false);
    group.appendChild(matchList);
    frag.appendChild(group);
  }
  return frag;
}

function appendMatchesWithDividers(container, matches, settings, forceFavoriteStyle) {
  let lastDayBucket = null;
  for (const match of matches) {
    const bucket = getDayBucket(match, settings.timezone);
    const enteringYesterday = bucket === "yesterday" && lastDayBucket !== "yesterday";
    const enteringTomorrow = bucket === "tomorrow" && lastDayBucket !== "tomorrow";
    const returningToToday = bucket === "same" && lastDayBucket === "yesterday";
    if (enteringYesterday || enteringTomorrow || returningToToday) {
      container.appendChild(buildDayDivider(bucket));
    }
    lastDayBucket = bucket;
    container.appendChild(buildMatchEntry(match, settings, forceFavoriteStyle));
  }
}

function getDayBucket(match, timezone) {
  if (currentOffset !== 0) return "same";
  const matchDayStr = TimeUtil.getLocalDateStrForMatch(match, timezone);
  const yesterdayStr = TimeUtil.getLocalDateStrForOffset(-1, timezone);
  const tomorrowStr = TimeUtil.getLocalDateStrForOffset(1, timezone);
  if (matchDayStr === yesterdayStr) return "yesterday";
  if (matchDayStr === tomorrowStr) return "tomorrow";
  return "same";
}

function buildDayDivider(bucket) {
  const el = document.createElement("div");
  el.className = "day-divider";
  el.textContent = bucket === "yesterday" ? "Late Night" : bucket === "tomorrow" ? "After Midnight" : "Today";
  return el;
}

function toggleCollapse(competitionName) {
  if (collapsedLeagues.has(competitionName)) {
    collapsedLeagues.delete(competitionName);
  } else {
    collapsedLeagues.add(competitionName);
  }
  persistUiState();
  applyRender();
}

function buildMatchEntry(match, settings, forceFavoriteStyle) {
  const wrap = document.createElement("div");
  wrap.className = "match-entry";
  wrap.appendChild(buildMatchRow(match, settings, forceFavoriteStyle));
  if (expandedMatchId === match.id) {
    wrap.appendChild(buildMatchDetailsPanel(match));
  }
  return wrap;
}

function toggleMatchDetails(match) {
  if (expandedMatchId === match.id) {
    expandedMatchId = null;
    applyRender();
    return;
  }
  expandedMatchId = match.id;
  const cached = matchDetailsCache.get(match.id);
  const needsFetch = !cached || match.state === "in" && cached.status !== "loading";
  if (needsFetch) {
    loadMatchDetails(match);
  }
  applyRender();
}

async function loadMatchDetails(match) {
  const myToken = ++detailsRequestToken;
  matchDetailsCache.set(match.id, {
    status: "loading",
    events: [],
    lineup: null,
    stats: []
  });
  try {
    const response = await browser.runtime.sendMessage({
      type: "GET_MATCH_SUMMARY",
      sport: match.sport,
      espnSlug: match.espnSlug,
      eventId: match.id
    });
    if (myToken !== detailsRequestToken || expandedMatchId !== match.id) return;
    if (!response || response.hadError) {
      matchDetailsCache.set(match.id, {
        status: "error",
        events: [],
        lineup: null,
        stats: []
      });
    } else {
      const events = MatchEvents.parseEvents(match.sport, response.raw, match);
      const lineup = MatchStats.buildLineup(match.sport, response.raw);
      const stats = MatchStats.buildComparisonStats(match.sport, response.raw);
      matchDetailsCache.set(match.id, {
        status: "ready",
        events: events,
        lineup: lineup,
        stats: stats
      });
    }
  } catch (e) {
    if (myToken !== detailsRequestToken || expandedMatchId !== match.id) return;
    matchDetailsCache.set(match.id, {
      status: "error",
      events: [],
      lineup: null,
      stats: []
    });
  }
  applyRender();
}

function setActiveDetailsTab(tab) {
  activeDetailsTab = tab;
  applyRender();
}

const EVENTS_TAB_EMOJI = {
  soccer: "⚽",
  basketball: "🏀",
  football: "🏈",
  hockey: "🏒",
  baseball: "⚾"
};

function buildMatchDetailsPanel(match) {
  const panel = document.createElement("div");
  panel.className = "match-details";
  const tabs = document.createElement("div");
  tabs.className = "details-tabs";
  const tabDefs = [];
  if (MatchEvents.isSupported(match.sport)) {
    tabDefs.push({
      id: "events",
      label: "Events",
      icon: EVENTS_TAB_EMOJI[match.sport] || "⚽"
    });
  }
  if (MatchStats.isLineupSupported(match.sport)) {
    tabDefs.push({
      id: "lineup",
      label: "Lineup",
      icon: Icons.lineup()
    });
  }
  if (MatchStats.isStatsSupported(match.sport)) {
    tabDefs.push({
      id: "stats",
      label: "Stats",
      icon: Icons.timeline()
    });
  }
  if (!tabDefs.some(t => t.id === activeDetailsTab)) {
    activeDetailsTab = tabDefs.length ? tabDefs[0].id : null;
  }
  for (const tabDef of tabDefs) {
    const tabBtn = document.createElement("button");
    tabBtn.className = "details-tab" + (activeDetailsTab === tabDef.id ? " active" : "");
    tabBtn.innerHTML = `<span class="details-tab-icon">${tabDef.icon}</span><span>${tabDef.label}</span>`;
    tabBtn.addEventListener("click", e => {
      e.preventDefault();
      e.stopPropagation();
      setActiveDetailsTab(tabDef.id);
    });
    tabs.appendChild(tabBtn);
  }
  panel.appendChild(tabs);
  const content = document.createElement("div");
  content.className = "details-content";
  const entry = matchDetailsCache.get(match.id);
  if (!entry || entry.status === "loading") {
    const loading = document.createElement("div");
    loading.className = "match-details-msg";
    loading.textContent = "Loading...";
    content.appendChild(loading);
  } else if (entry.status === "error") {
    const errWrap = document.createElement("div");
    errWrap.className = "match-details-msg";
    errWrap.textContent = "Couldn't load match data.";
    const retryBtn = document.createElement("button");
    retryBtn.className = "text-btn";
    retryBtn.textContent = "Retry";
    retryBtn.addEventListener("click", e => {
      e.preventDefault();
      e.stopPropagation();
      loadMatchDetails(match);
    });
    errWrap.appendChild(retryBtn);
    content.appendChild(errWrap);
  } else if (activeDetailsTab === "events") {
    content.appendChild(buildEventsTabContent(entry, match));
  } else if (activeDetailsTab === "lineup") {
    content.appendChild(buildLineupTabContent(entry, match));
  } else if (activeDetailsTab === "stats") {
    content.appendChild(buildStatsTabContent(entry, match));
  } else {
    const none = document.createElement("div");
    none.className = "match-details-msg";
    none.textContent = "Nothing to show for this sport yet.";
    content.appendChild(none);
  }
  panel.appendChild(content);
  return panel;
}

function buildEventsTabContent(entry, match) {
  const wrap = document.createElement("div");
  if (!entry.events.length) {
    wrap.className = "match-details-msg";
    wrap.textContent = "No events reported yet.";
    return wrap;
  }
  for (const ev of entry.events) {
    wrap.appendChild(buildEventRow(ev, match));
  }
  return wrap;
}

function buildLineupTabContent(entry, match) {
  const wrap = document.createElement("div");
  if (!entry.lineup) {
    wrap.className = "match-details-msg";
    wrap.textContent = "Lineup not available yet.";
    return wrap;
  }
  const subInMinuteById = new Map;
  const ownGoalIds = new Set;
  for (const ev of entry.events) {
    if (ev.kind === "substitution" && ev.primary && ev.primary.id != null) {
      subInMinuteById.set(String(ev.primary.id), ev.minuteLabel);
    }
    if (ev.kind === "goal" && ev.note === "OG" && ev.primary && ev.primary.id != null) {
      ownGoalIds.add(String(ev.primary.id));
    }
  }
  wrap.className = "lineup-columns";
  wrap.appendChild(buildLineupTeamBlock(match.homeTeam, entry.lineup.home, subInMinuteById, ownGoalIds));
  const divider = document.createElement("div");
  divider.className = "lineup-divider";
  wrap.appendChild(divider);
  wrap.appendChild(buildLineupTeamBlock(match.awayTeam, entry.lineup.away, subInMinuteById, ownGoalIds));
  return wrap;
}

function buildLineupTeamBlock(team, teamLineup, subInMinuteById, ownGoalIds) {
  const block = document.createElement("div");
  block.className = "lineup-team";
  const header = document.createElement("div");
  header.className = "lineup-team-header";
  const logo = document.createElement("img");
  logo.className = "lineup-team-logo";
  logo.alt = "";
  setTeamLogoImg(logo, team);
  const headerText = document.createElement("span");
  headerText.className = "lineup-team-header-text";
  headerText.textContent = team.name + (teamLineup.formation ? ` (${teamLineup.formation})` : "");
  header.title = headerText.textContent;
  header.appendChild(logo);
  header.appendChild(headerText);
  block.appendChild(header);
  for (const player of teamLineup.players) {
    const row = document.createElement("div");
    row.className = "lineup-row";
    player.chain.forEach((node, i) => {
      const isLast = i === player.chain.length - 1;
      const line = document.createElement("div");
      line.className = "lineup-player" + (i > 0 ? " lineup-sub" : "") + (!isLast ? " subbed-out" : "");
      if (i > 0) {
        const subIcon = document.createElement("span");
        subIcon.className = "lineup-sub-icon";
        subIcon.innerHTML = Icons.arrowIn();
        line.appendChild(subIcon);
      }
      const jersey = document.createElement("span");
      jersey.className = "lineup-jersey";
      jersey.textContent = node.jersey || "";
      line.appendChild(jersey);
      line.appendChild(buildPlayerLinkEl(node, "lineup-name"));
      const badges = buildLineupPlayerBadges(node, ownGoalIds);
      if (badges) line.appendChild(badges);
      if (i > 0) {
        const minute = subInMinuteById.get(node.id);
        if (minute) {
          const minuteEl = document.createElement("span");
          minuteEl.className = "lineup-sub-minute";
          minuteEl.textContent = minute;
          line.appendChild(minuteEl);
        }
      }
      row.appendChild(line);
    });
    block.appendChild(row);
  }
  return block;
}

function buildLineupPlayerBadges(node, ownGoalIds) {
  if (!node) return null;
  const goals = node.goals || 0;
  const assists = node.assists || 0;
  const yellow = node.yellowCards || 0;
  const red = node.redCards || 0;
  if (!goals && !assists && !yellow && !red) return null;
  const isOwnGoal = ownGoalIds && node.id != null && ownGoalIds.has(String(node.id));
  const wrap = document.createElement("span");
  wrap.className = "lineup-badges";
  if (isOwnGoal) {
    const chip = document.createElement("span");
    chip.className = "lineup-badge lb-goal lb-goal-own";
    chip.title = "Own goal";
    wrap.appendChild(chip);
    if (goals > 1) {
      const extra = document.createElement("span");
      extra.className = "lineup-badge lb-goal";
      extra.textContent = goals - 1 > 1 ? `⚽${goals - 1}` : "⚽";
      extra.title = goals - 1 === 1 ? "1 goal" : goals - 1 + " goals";
      wrap.appendChild(extra);
    }
  } else if (goals > 0) {
    const chip = document.createElement("span");
    chip.className = "lineup-badge lb-goal";
    chip.textContent = goals > 1 ? `⚽${goals}` : "⚽";
    chip.title = goals === 1 ? "1 goal" : goals + " goals";
    wrap.appendChild(chip);
  }
  if (assists > 0) {
    const chip = document.createElement("span");
    chip.className = "lineup-badge lb-assist";
    const icon = document.createElement("img");
    icon.className = "lb-assist-icon";
    icon.src = browser.runtime.getURL("icons/SVG/assist.svg");
    icon.alt = "Assist";
    icon.addEventListener("error", () => {
      icon.remove();
      chip.prepend(document.createTextNode("👟"));
    }, {
      once: true
    });
    chip.appendChild(icon);
    if (assists > 1) chip.appendChild(document.createTextNode(assists));
    chip.title = assists === 1 ? "1 assist" : assists + " assists";
    wrap.appendChild(chip);
  }
  for (let i = 0; i < yellow; i++) {
    const chip = document.createElement("span");
    chip.className = "lineup-badge lb-card yellow";
    chip.title = "Yellow card";
    wrap.appendChild(chip);
  }
  for (let i = 0; i < red; i++) {
    const chip = document.createElement("span");
    chip.className = "lineup-badge lb-card red";
    chip.title = "Red card";
    wrap.appendChild(chip);
  }
  return wrap;
}

function buildStatsTabContent(entry, match) {
  const wrap = document.createElement("div");
  if (!entry.stats.length) {
    wrap.className = "match-details-msg";
    wrap.textContent = "Stats not available yet.";
    return wrap;
  }
  for (const stat of entry.stats) {
    wrap.appendChild(buildStatRow(stat));
  }
  return wrap;
}

function buildStatRow(stat) {
  const row = document.createElement("div");
  row.className = "stat-row";
  const homeVal = document.createElement("span");
  homeVal.className = "stat-value";
  homeVal.textContent = formatStatValue(stat.home, stat.isPercent);
  const label = document.createElement("span");
  label.className = "stat-label";
  label.textContent = stat.label;
  const awayVal = document.createElement("span");
  awayVal.className = "stat-value";
  awayVal.textContent = formatStatValue(stat.away, stat.isPercent);
  const barWrap = document.createElement("div");
  barWrap.className = "stat-bar-wrap";
  const homeNum = parseFloat(stat.home) || 0;
  const awayNum = parseFloat(stat.away) || 0;
  const total = homeNum + awayNum;
  const homePct = total > 0 ? homeNum / total * 100 : 50;
  const homeBar = document.createElement("div");
  homeBar.className = "stat-bar-home";
  homeBar.style.width = homePct + "%";
  if (homePct >= 99.5) homeBar.style.borderRadius = "999px";
  const awayBar = document.createElement("div");
  awayBar.className = "stat-bar-away";
  awayBar.style.width = 100 - homePct + "%";
  if (homePct <= .5) awayBar.style.borderRadius = "999px";
  barWrap.appendChild(homeBar);
  barWrap.appendChild(awayBar);
  row.appendChild(homeVal);
  row.appendChild(label);
  row.appendChild(awayVal);
  row.appendChild(barWrap);
  return row;
}

function formatStatValue(value, isPercent) {
  if (value == null) return "-";
  return isPercent ? `${value}%` : String(value);
}

function buildPlayerLinkEl(player, extraClass) {
  const name = player && player.name && player.name !== "Unknown" ? player.name : null;
  const el = document.createElement(player && player.url && name ? "a" : "span");
  el.className = "event-player" + (extraClass ? " " + extraClass : "");
  el.title = name || "";
  if (player && player.url && name) {
    el.href = player.url;
    el.target = "_blank";
    el.rel = "noopener noreferrer";
    el.addEventListener("click", e => e.stopPropagation());
  }
  el.textContent = name || "—";
  return el;
}

function buildLinescoreTable(ev) {
  const wrap = document.createElement("div");
  wrap.className = "linescore-wrap";
  const table = document.createElement("table");
  table.className = "linescore-table";
  const thead = document.createElement("thead");
  const hr = document.createElement("tr");
  hr.appendChild(document.createElement("th")); 
  for (const inn of ev.innings) {
    const th = document.createElement("th");
    th.textContent = String(inn.num);
    hr.appendChild(th);
  }
  for (const label of ["R", "H", "E"]) {
    const th = document.createElement("th");
    th.className = "ls-total";
    th.textContent = label;
    hr.appendChild(th);
  }
  thead.appendChild(hr);
  table.appendChild(thead);
  const tbody = document.createElement("tbody");
  const makeRow = (abbr, inningsKey, totals) => {
    const tr = document.createElement("tr");
    const nameTd = document.createElement("td");
    nameTd.className = "ls-team";
    nameTd.textContent = abbr;
    tr.appendChild(nameTd);
    for (const inn of ev.innings) {
      const td = document.createElement("td");
      td.textContent = inn[inningsKey];
      tr.appendChild(td);
    }
    for (const k of ["r", "h", "e"]) {
      const td = document.createElement("td");
      td.className = "ls-total";
      td.textContent = totals[k];
      tr.appendChild(td);
    }
    return tr;
  };
  
  tbody.appendChild(makeRow(ev.awayAbbr, "away", ev.totals.away));
  tbody.appendChild(makeRow(ev.homeAbbr, "home", ev.totals.home));
  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

function buildDriveRow(ev, match) {
  const row = document.createElement("div");
  row.className = "event-row event-drive" + (ev.isHome === false ? " event-away" : "") + (ev.isScore ? " drive-score" : "");
  const teamImg = document.createElement("img");
  teamImg.className = "event-team-logo";
  teamImg.alt = "";
  const team = ev.isHome === false ? match.awayTeam : match.homeTeam;
  setTeamLogoImg(teamImg, team);
  const minute = document.createElement("span");
  minute.className = "event-minute";
  minute.textContent = ev.minuteLabel || "";
  const body = document.createElement("div");
  body.className = "event-body";
  const line1 = document.createElement("div");
  line1.className = "drive-result";
  const abbr = document.createElement("span");
  abbr.className = "drive-abbr";
  abbr.textContent = ev.teamAbbr || (team && team.name) || "";
  line1.appendChild(abbr);
  if (ev.result) {
    const res = document.createElement("span");
    res.className = "drive-result-text" + (ev.isScore ? " is-score" : "");
    res.textContent = ev.result;
    line1.appendChild(res);
  }
  body.appendChild(line1);
  const line2 = document.createElement("div");
  line2.className = "event-subtext";
  const bits = [];
  if (ev.text) bits.push(ev.text);
  else {
    if (ev.plays != null) bits.push(ev.plays + " plays");
    if (ev.yards != null) bits.push(ev.yards + " yds");
    if (ev.timeElapsed) bits.push(ev.timeElapsed);
  }
  if (ev.startText) bits.push(ev.startText);
  line2.textContent = bits.join(" · ");
  body.appendChild(line2);
  if (ev.scoreParts && ev.scoreParts.length) {
    const line3 = document.createElement("div");
    line3.className = "event-subtext drive-scorer";
    for (const part of ev.scoreParts) {
      if (part.url) {
        const a = document.createElement("a");
        a.className = "event-player";
        a.href = part.url;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.textContent = part.text;
        a.addEventListener("click", e => e.stopPropagation());
        line3.appendChild(a);
      } else {
        line3.appendChild(document.createTextNode(part.text));
      }
    }
    body.appendChild(line3);
  } else if (ev.scoreText) {
    const line3 = document.createElement("div");
    line3.className = "event-subtext drive-scorer";
    line3.textContent = ev.scoreText;
    body.appendChild(line3);
  }
  row.appendChild(minute);
  row.appendChild(teamImg);
  row.appendChild(body);
  return row;
}

function buildEventRow(ev, match) {
  if (ev.kind === "linescore") {
    return buildLinescoreTable(ev);
  }
  if (ev.kind === "drive") {
    return buildDriveRow(ev, match);
  }
  if (ev.kind === "kickoff" || ev.kind === "halftime" || ev.kind === "fulltime") {
    const divider = document.createElement("div");
    divider.className = "event-divider";
    let text;
    if (ev.kind === "kickoff") {
      text = "Kickoff";
    } else {
      text = `${ev.kind === "halftime" ? "HT" : "FT"} ${ev.scoreAfter.home} - ${ev.scoreAfter.away}`;
      if (ev.note) text += ` (${ev.note})`;
    }
    divider.textContent = text;
    return divider;
  }
  if (ev.kind === "period-marker") {
    const divider = document.createElement("div");
    divider.className = "event-divider";
    divider.textContent = ev.scoreAfter ? `${ev.label} ${ev.scoreAfter.home} - ${ev.scoreAfter.away}` : ev.label;
    return divider;
  }
  if (ev.kind === "period-end") {
    const divider = document.createElement("div");
    divider.className = "event-divider";
    divider.textContent = `${ev.periodLabel} ${ev.scoreAfter.home} - ${ev.scoreAfter.away}`;
    return divider;
  }
  const row = document.createElement("div");
  row.className = "event-row event-" + ev.kind + (ev.isHome === false ? " event-away" : "");
  const teamImg = document.createElement("img");
  teamImg.className = "event-team-logo";
  teamImg.alt = "";
  const team = ev.isHome === false ? match.awayTeam : match.homeTeam;
  setTeamLogoImg(teamImg, team);
  const minute = document.createElement("span");
  minute.className = "event-minute";
  minute.textContent = ev.minuteLabel || "";
  const iconWrap = document.createElement("span");
  iconWrap.className = "event-icon";
  const body = document.createElement("div");
  body.className = "event-body";
  const NFL_CHIP_LABEL = {
    touchdown: "TD",
    "field-goal": "FG",
    safety: "SF",
    "extra-point": "XP",
    "two-point-conversion": "2PT",
    score: "•"
  };
  if (ev.kind === "goal") {
    iconWrap.textContent = "⚽";
    const line1 = document.createElement("div");
    line1.appendChild(buildPlayerLinkEl(ev.primary));
    line1.appendChild(document.createTextNode(` (${ev.scoreAfter.home} - ${ev.scoreAfter.away})${ev.note ? " (" + ev.note + ")" : ""}`));
    body.appendChild(line1);
    if (ev.secondary) {
      const line2 = document.createElement("div");
      line2.className = "event-subtext";
      line2.appendChild(document.createTextNode("assist by "));
      line2.appendChild(buildPlayerLinkEl(ev.secondary));
      body.appendChild(line2);
    }
  } else if (ev.kind === "yellow-card") {
    iconWrap.innerHTML = `<span class="card-chip yellow"></span>`;
    body.appendChild(buildPlayerLinkEl(ev.primary));
  } else if (ev.kind === "red-card") {
    iconWrap.innerHTML = `<span class="card-chip red"></span>`;
    body.appendChild(buildPlayerLinkEl(ev.primary));
  } else if (ev.kind === "penalty-missed") {
    iconWrap.innerHTML = `<span class="card-chip missed-pen"></span>`;
    const line1 = document.createElement("div");
    line1.appendChild(buildPlayerLinkEl(ev.primary));
    line1.appendChild(document.createTextNode(" (missed penalty)"));
    body.appendChild(line1);
  } else if (ev.kind === "substitution") {
    iconWrap.innerHTML = Icons.arrowIn();
    const lineIn = document.createElement("div");
    lineIn.className = "sub-in";
    lineIn.appendChild(buildPlayerLinkEl(ev.primary));
    const lineOut = document.createElement("div");
    lineOut.className = "sub-out";
    lineOut.appendChild(buildPlayerLinkEl(ev.secondary));
    body.appendChild(lineIn);
    body.appendChild(lineOut);
  } else if (ev.kind === "technical-foul" || ev.kind === "flagrant-foul") {
    iconWrap.innerHTML = `<span class="card-chip ${ev.kind === "flagrant-foul" ? "red" : "yellow"}"></span>`;
    const line1 = document.createElement("div");
    const hasName = ev.primary && ev.primary.name && ev.primary.name !== "Unknown";
    if (hasName) {
      line1.appendChild(buildPlayerLinkEl(ev.primary));
      line1.appendChild(document.createTextNode(ev.kind === "flagrant-foul" ? " (flagrant foul)" : " (technical foul)"));
    } else {
      line1.textContent = ev.kind === "flagrant-foul" ? "Flagrant foul" : "Technical foul";
    }
    body.appendChild(line1);
  } else if (ev.kind === "hockey-goal") {
    iconWrap.textContent = "🥅";
    const line1 = document.createElement("div");
    line1.appendChild(buildPlayerLinkEl(ev.primary));
    line1.appendChild(document.createTextNode(` (${ev.scoreAfter.home} - ${ev.scoreAfter.away})`));
    body.appendChild(line1);
    if (ev.secondary) {
      const line2 = document.createElement("div");
      line2.className = "event-subtext";
      line2.appendChild(document.createTextNode("assist by "));
      line2.appendChild(buildPlayerLinkEl(ev.secondary));
      body.appendChild(line2);
    }
  } else if (ev.kind === "penalty") {
    iconWrap.innerHTML = `<span class="card-chip yellow"></span>`;
    const line1 = document.createElement("div");
    line1.appendChild(buildPlayerLinkEl(ev.primary));
    if (ev.text) line1.appendChild(document.createTextNode(` (${ev.text})`));
    body.appendChild(line1);
  } else if (ev.kind === "run") {
    iconWrap.innerHTML = `<span class="nfl-chip">RUN</span>`;
    const line1 = document.createElement("div");
    line1.textContent = ev.text || "";
    body.appendChild(line1);
    if (ev.scoreAfter && ev.scoreAfter.home != null && ev.scoreAfter.away != null) {
      const line2 = document.createElement("div");
      line2.className = "event-subtext";
      line2.textContent = `${ev.scoreAfter.home} - ${ev.scoreAfter.away}`;
      body.appendChild(line2);
    }
  } else if (NFL_CHIP_LABEL[ev.kind] !== undefined) {
    iconWrap.innerHTML = `<span class="nfl-chip">${NFL_CHIP_LABEL[ev.kind]}</span>`;
    const line1 = document.createElement("div");
    line1.textContent = ev.text || "";
    body.appendChild(line1);
    if (ev.scoreAfter && ev.scoreAfter.home != null && ev.scoreAfter.away != null) {
      const line2 = document.createElement("div");
      line2.className = "event-subtext";
      line2.textContent = `${ev.scoreAfter.home} - ${ev.scoreAfter.away}`;
      body.appendChild(line2);
    }
  }
  row.appendChild(minute);
  row.appendChild(teamImg);
  row.appendChild(iconWrap);
  row.appendChild(body);
  return row;
}

function buildMatchRow(match, settings, forceFavoriteStyle) {
  const row = document.createElement("a");
  row.className = "match-row";
  row.href = match.link;
  row.target = "_blank";
  row.rel = "noopener noreferrer";
  if (forceFavoriteStyle || Utils.isFavoriteMatch(match, settings.favoriteTeams)) {
    row.classList.add("favorite");
  }
  if (recentlyUpdatedIds.has(String(match.id))) {
    row.classList.add("just-updated");
    if (match.state === "post") row.classList.add("just-updated-final");
  }
  const iconsEl = buildRowIconsEl(match, settings);
  let homeLost = false;
  let awayLost = false;
  if (match.state === "post") {
    if (match.seriesWinner === "home") awayLost = true; else if (match.seriesWinner === "away") homeLost = true; else if (match.decidedByPenalties) {
      if (match.awayTeam.winner === true) homeLost = true; else if (match.homeTeam.winner === true) awayLost = true;
    } else if (match.isPlayoff && !match.hasSeries) {
      if (match.awayTeam.winner === true) homeLost = true; else if (match.homeTeam.winner === true) awayLost = true;
    }
  }
  const homeTeamEl = buildTeamEl(match.homeTeam, "home", homeLost);
  const awayTeamEl = buildTeamEl(match.awayTeam, "away", awayLost);
  const scoreStatusEl = buildScoreStatusEl(match, settings);
  row.appendChild(iconsEl);
  row.appendChild(homeTeamEl);
  row.appendChild(scoreStatusEl);
  row.appendChild(awayTeamEl);
  return row;
}

function buildRowIconsEl(match, settings) {
  
  
  
  const wrap = document.createElement("span");
  wrap.className = "row-icons";

  const pinSlot = document.createElement("span");
  pinSlot.className = "row-icon-slot";
  const pinBtn = document.createElement("button");
  pinBtn.className = "row-icon-btn pin-btn" + (isPinned(match.id) ? " active" : "");
  pinBtn.title = isPinned(match.id) ? "Unpin" : "Pin";
  pinBtn.innerHTML = Icons.pin();
  pinBtn.addEventListener("click", e => {
    e.preventDefault();
    e.stopPropagation();
    togglePin(match);
  });
  pinSlot.appendChild(pinBtn);
  wrap.appendChild(pinSlot);

  const muteSlot = document.createElement("span");
  muteSlot.className = "row-icon-slot";
  const eligibleForMute = match.state === "in" && Utils.isNotifyScopeMatch(match, {
    ...settings,
    pinnedMatches: pinnedMatches
  });
  if (eligibleForMute) {
    const muted = isMuted(match.id);
    const muteBtn = document.createElement("button");
    muteBtn.className = "row-icon-btn mute-btn" + (muted ? " active" : "");
    muteBtn.title = muted ? "Unmute notifications for this match" : "Mute notifications for this match";
    muteBtn.innerHTML = muted ? Icons.bellMuted() : Icons.bell();
    muteBtn.addEventListener("click", e => {
      e.preventDefault();
      e.stopPropagation();
      toggleMute(match.id);
    });
    muteSlot.appendChild(muteBtn);
  }
  wrap.appendChild(muteSlot);

  const detailsSlot = document.createElement("span");
  detailsSlot.className = "row-icon-slot";
  const eligibleForDetails = (MatchEvents.isSupported(match.sport) || MatchStats.isLineupSupported(match.sport) || MatchStats.isStatsSupported(match.sport)) && (match.state === "in" || match.state === "post");
  if (eligibleForDetails) {
    const isOpen = expandedMatchId === match.id;
    const cacheEntry = matchDetailsCache.get(match.id);
    const isLoading = isOpen && cacheEntry && cacheEntry.status === "loading";
    const detailsBtn = document.createElement("button");
    detailsBtn.className = "row-icon-btn details-btn" + (isOpen ? " active" : "");
    detailsBtn.title = isOpen ? "Hide match events" : "Show match events";
    detailsBtn.innerHTML = isLoading ? Icons.spinner() : Icons.matchInfo();
    detailsBtn.disabled = isLoading;
    detailsBtn.addEventListener("click", e => {
      e.preventDefault();
      e.stopPropagation();
      toggleMatchDetails(match);
    });
    detailsSlot.appendChild(detailsBtn);
  }
  wrap.appendChild(detailsSlot);
  return wrap;
}

const logoMemoryCache = new Map;

function defaultTeamLogoUrl() {
  return (Icons && Icons.defaultTeamLogo) ? Icons.defaultTeamLogo() : (Icons && Icons.DEFAULT_TEAM_LOGO_DATA) || "";
}

function teamLogoUrl(team) {
  const url = team && team.logo;
  if (!url || typeof url !== "string") return null;
  const t = url.trim();
  if (!t || t === "null" || t === "undefined") return null;
  if (!/^https?:\/\//i.test(t) && !t.startsWith("data:")) return null;
  return t;
}

function resolveLogo(url) {
  if (!url) return Promise.resolve(null);
  if (logoMemoryCache.has(url)) return Promise.resolve(logoMemoryCache.get(url));
  return Cache.getOrFetchLogo(url).then(dataUrl => {
    if (dataUrl) logoMemoryCache.set(url, dataUrl);
    return dataUrl;
  });
}

function setTeamLogoImg(img, team) {
  const fallback = defaultTeamLogoUrl();
  img.onerror = () => {
    img.onerror = null;
    img.src = fallback;
  };
  const url = teamLogoUrl(team);
  if (!url) {
    img.src = fallback;
    return;
  }
  if (logoMemoryCache.has(url)) {
    img.src = logoMemoryCache.get(url);
  } else {
    img.src = url;
    resolveLogo(url).then(dataUrl => {
      if (dataUrl && img.src === url) img.src = dataUrl;
    });
  }
}

function buildTeamEl(team, side, lost) {
  const el = document.createElement("div");
  el.className = `team ${side}`;
  const img = document.createElement("img");
  img.alt = "";
  img.loading = "lazy";
  setTeamLogoImg(img, team);
  const name = document.createElement("span");
  name.className = "team-name" + (lost ? " team-lost" : "");
  name.textContent = (team && team.name) || "TBD";
  if (side === "home") {
    el.appendChild(img);
    el.appendChild(name);
  } else {
    el.appendChild(name);
    el.appendChild(img);
  }
  return el;
}

function buildScoreStatusEl(match, settings) {
  const el = document.createElement("div");
  el.className = "score-status";
  if (match.state === "pre") {
    const pill = document.createElement("span");
    pill.className = "status-pill pill-time";
    pill.textContent = TimeUtil.formatTimeOnly(match.startTimeUTC, settings.timezone);
    el.appendChild(pill);
    return el;
  }
  const score = document.createElement("span");
  score.className = "score-line" + (match.state === "in" ? "" : " dim");
  score.textContent = `${match.homeScore} - ${match.awayScore}`;
  el.appendChild(score);
  const pill = document.createElement("span");
  if (match.state === "in") {
    pill.className = "status-pill pill-live";
    const dot = document.createElement("span");
    dot.className = "live-dot";
    pill.appendChild(dot);
    pill.appendChild(document.createTextNode(match.statusText || "LIVE"));
  } else {
    pill.className = "status-pill pill-ft";
    pill.textContent = match.statusText || "FT";
  }
  el.appendChild(pill);
  return el;
}

document.addEventListener("DOMContentLoaded", init);
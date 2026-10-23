let selectedLeagueIds = [];

let selectedTeams = [];

let existingSettings = null;

function teamLabel(team) {
  const leagueName = getLeagueNameFromSlug(team.leagueId);
  const sportName = LeaguesData.sportDisplayName(team.sport);
  return team.country ? `${team.name} (${sportName} - ${team.country} - ${leagueName})` : `${team.name} (${sportName})`;
}

async function init() {
  document.getElementById("league-search-icon").innerHTML = Icons.search();
  document.getElementById("team-search-icon").innerHTML = Icons.search();
  existingSettings = await Storage.getSettings();
  document.getElementById("refresh-mode").value = existingSettings.refreshMode;
  document.getElementById("refresh-interval").value = existingSettings.refreshIntervalSec;
  document.getElementById("notify-scope-all").checked = !!existingSettings.notifyScope.allLive;
  document.getElementById("notify-scope-favorites").checked = !!existingSettings.notifyScope.favorites;
  document.getElementById("notify-scope-pinned").checked = !!existingSettings.notifyScope.pinned;
  document.getElementById("notify-display-mode").value = existingSettings.notifyDisplayMode;
  document.getElementById("notify-interval").value = existingSettings.notifyIntervalSec;
  document.getElementById("notify-event-start").checked = !!existingSettings.notifyEvents.start;
  document.getElementById("notify-event-goal").checked = !!existingSettings.notifyEvents.goal;
  document.getElementById("notify-event-end").checked = !!existingSettings.notifyEvents.end;
  document.getElementById("show-late-night-yesterday").checked = existingSettings.showLateNightYesterday !== false;
  document.getElementById("show-early-morning-tomorrow").checked = existingSettings.showEarlyMorningTomorrow !== false;
  selectedLeagueIds = [ ...existingSettings.selectedLeagueIds || [] ];
  selectedTeams = [ ...existingSettings.favoriteTeams || [] ];
  renderLeagueChips();
  renderTeamChips();
  wireLeagueSearch();
  wireTeamSearch();
  document.addEventListener("click", e => {
    if (!e.target.closest(".picker")) {
      hideSuggestions("league-suggestions");
      hideSuggestions("team-suggestions");
    }
  });
  document.getElementById("save-btn").addEventListener("click", onSave);
  document.getElementById("export-btn").addEventListener("click", onExportSettings);
  document.getElementById("import-btn").addEventListener("click", () => {
    document.getElementById("import-file-input").click();
  });
  document.getElementById("import-file-input").addEventListener("change", onImportFileSelected);
}

function wireLeagueSearch() {
  const input = document.getElementById("league-search");
  const onInput = Utils.debounce(() => {
    const query = input.value.trim();
    if (!query) {
      hideSuggestions("league-suggestions");
      return;
    }
    const results = LeaguesData.searchLeagues(query, selectedLeagueIds).slice(0, 8);
    renderLeagueSuggestions(results);
  }, 150);
  input.addEventListener("input", onInput);
  input.addEventListener("focus", onInput);
}

function renderLeagueSuggestions(results) {
  const box = document.getElementById("league-suggestions");
  box.innerHTML = "";
  if (results.length === 0) {
    box.classList.add("hidden");
    return;
  }
  for (const league of results) {
    const item = document.createElement("div");
    item.className = "suggestion-item";
    item.textContent = `${league.name} (${LeaguesData.sportDisplayName(league.sport)})`;
    item.addEventListener("click", () => {
      selectedLeagueIds.push(league.id);
      renderLeagueChips();
      document.getElementById("league-search").value = "";
      hideSuggestions("league-suggestions");
    });
    box.appendChild(item);
  }
  box.classList.remove("hidden");
}

function renderLeagueChips() {
  const container = document.getElementById("selected-leagues");
  container.innerHTML = "";
  for (const id of selectedLeagueIds) {
    const league = LeaguesData.getLeagueById(id);
    if (!league) continue;
    const chip = document.createElement("div");
    chip.className = "chip";
    const label = document.createElement("span");
    label.textContent = `${league.name} (${LeaguesData.sportDisplayName(league.sport)})`;
    chip.appendChild(label);
    const removeBtn = document.createElement("button");
    removeBtn.className = "chip-remove";
    removeBtn.innerHTML = Icons.removeX();
    removeBtn.title = "Remove";
    removeBtn.addEventListener("click", () => {
      selectedLeagueIds = selectedLeagueIds.filter(lid => lid !== id);
      renderLeagueChips();
      document.getElementById("team-search").value = "";
      hideSuggestions("team-suggestions");
    });
    chip.appendChild(removeBtn);
    container.appendChild(chip);
  }
}

async function searchESPNTeams(query) {
  const url = "https://site.api.espn.com/apis/common/v3/search";
  const params = new URLSearchParams({
    query: query,
    limit: 20,
    type: "team"
  });
  const r = await fetch(`${url}?${params}`);
  const data = await r.json();
  const items = Array.isArray(data.items) ? data.items : [];
  return items.filter(team => team.type === "team").map(team => ({
    country: getCountryFromLeague(team.league),
    key: Utils.teamKey(team.sport, team.displayName),
    name: team.displayName,
    sport: team.sport,
    id: team.id,
    leagueId: getLeagueIdFromSlug(team.league),
    logo: team.logos?.[0]?.href ?? null
  }));
}

function getCountryFromLeague(leagueId) {
  const league = LeaguesData.LEAGUES.find(l => l.slug === leagueId || l.id === leagueId);
  return league?.country ?? null;
}

function getLeagueIdFromSlug(espnSlug) {
  const league = LeaguesData.LEAGUES.find(l => l.slug === espnSlug);
  return league?.id ?? espnSlug;
}

function getLeagueNameFromSlug(espnSlug) {
  const league = LeaguesData.LEAGUES.find(l => l.id === espnSlug);
  return league?.name ?? espnSlug;
}

function wireTeamSearch() {
  const input = document.getElementById("team-search");
  const box = document.getElementById("team-suggestions");
  const onInput = Utils.debounce(async () => {
    const query = input.value.trim();
    if (query.length < 2) {
      hideSuggestions("team-suggestions");
      return;
    }
    box.innerHTML = `<div class="suggestion-item muted">Searching…</div>`;
    box.classList.remove("hidden");
    let results = [];
    try {
      results = await searchESPNTeams(query);
    } catch (e) {
      results = [];
    }
    const supportedLeagueIds = new Set(LeaguesData.LEAGUES.map(l => l.id));
    const filtered = results.filter(t => supportedLeagueIds.has(t.leagueId)).filter(t => !selectedTeams.some(s => isSameTeam(s, t)));
    if (input.value.trim() !== query) return;
    renderTeamSuggestions(filtered);
  }, 250);
  input.addEventListener("input", onInput);
}

function isSameTeam(a, b) {
  const aId = a.providerIds?.espn ?? a.id;
  const bId = b.providerIds?.espn ?? b.id;
  if (aId && bId) return String(aId) === String(bId);
  return a.key === b.key;
}

function renderTeamSuggestions(results) {
  const box = document.getElementById("team-suggestions");
  box.innerHTML = "";
  if (results.length === 0) {
    box.innerHTML = `<div class="suggestion-item muted">No teams found</div>`;
    box.classList.remove("hidden");
    return;
  }
  for (const team of results) {
    const item = document.createElement("div");
    item.className = "suggestion-item";
    item.textContent = teamLabel(team);
    item.addEventListener("click", () => {
      selectedTeams.push(team);
      renderTeamChips();
      document.getElementById("team-search").value = "";
      hideSuggestions("team-suggestions");
    });
    box.appendChild(item);
  }
  box.classList.remove("hidden");
}

function renderTeamChips() {
  const container = document.getElementById("selected-teams");
  container.innerHTML = "";
  for (const team of selectedTeams) {
    const chip = document.createElement("div");
    chip.className = "chip";
    const label = document.createElement("span");
    label.textContent = teamLabel(team);
    chip.appendChild(label);
    const removeBtn = document.createElement("button");
    removeBtn.className = "chip-remove";
    removeBtn.innerHTML = Icons.removeX();
    removeBtn.title = "Remove";
    removeBtn.addEventListener("click", () => {
      selectedTeams = selectedTeams.filter(t => !isSameTeam(t, team));
      renderTeamChips();
    });
    chip.appendChild(removeBtn);
    container.appendChild(chip);
  }
}

function hideSuggestions(id) {
  const box = document.getElementById(id);
  box.classList.add("hidden");
  box.innerHTML = "";
}

async function onSave() {
  const refreshMode = document.getElementById("refresh-mode").value;
  const refreshIntervalSec = parseInt(document.getElementById("refresh-interval").value, 10) || CONFIG.DEFAULT_POLL_INTERVAL_SEC;
  const notifyScope = {
    allLive: document.getElementById("notify-scope-all").checked,
    favorites: document.getElementById("notify-scope-favorites").checked,
    pinned: document.getElementById("notify-scope-pinned").checked
  };
  const notifyDisplayMode = document.getElementById("notify-display-mode").value;
  const notifyIntervalSec = parseInt(document.getElementById("notify-interval").value, 10) || CONFIG.DEFAULT_POLL_INTERVAL_SEC;
  const notifyEvents = {
    start: document.getElementById("notify-event-start").checked,
    goal: document.getElementById("notify-event-goal").checked,
    end: document.getElementById("notify-event-end").checked
  };
  const showLateNightYesterday = document.getElementById("show-late-night-yesterday").checked;
  const showEarlyMorningTomorrow = document.getElementById("show-early-morning-tomorrow").checked;
  const updated = {
    ...existingSettings,
    refreshMode: refreshMode,
    refreshIntervalSec: refreshIntervalSec,
    notifyScope: notifyScope,
    notifyDisplayMode: notifyDisplayMode,
    notifyIntervalSec: notifyIntervalSec,
    notifyEvents: notifyEvents,
    showLateNightYesterday: showLateNightYesterday,
    showEarlyMorningTomorrow: showEarlyMorningTomorrow,
    selectedLeagueIds: [ ...selectedLeagueIds ],
    favoriteTeams: selectedTeams.map(t => ({
      sport: t.sport,
      key: t.key || Utils.teamKey(t.sport, t.name),
      name: t.name,
      leagueId: t.leagueId,
      logo: t.logo,
      country: t.country || null,
      providerIds: {
        espn: t.providerIds?.espn ?? String(t.id)
      }
    }))
  };
  await Storage.setSettings(updated);
  existingSettings = updated;
  await Storage.remove(CONFIG.STORAGE_KEYS.MATCH_SNAPSHOT);
  try {
    await browser.runtime.sendMessage({
      type: "SETTINGS_UPDATED"
    });
  } catch (e) {}
  const statusEl = document.getElementById("save-status");
  statusEl.textContent = "Saved!";
  setTimeout(() => {
    statusEl.textContent = "";
  }, 2e3);
}

function showBackupStatus(text, isError) {
  const el = document.getElementById("backup-status");
  el.textContent = text;
  el.classList.toggle("error", !!isError);
  setTimeout(() => {
    el.textContent = "";
    el.classList.remove("error");
  }, 4e3);
}

async function onExportSettings() {
  try {
    const settings = await Storage.getSettings();
    const pinnedMatches = await Storage.getPinnedMatches();
    const mutedMatches = await Storage.getMutedMatches();
    const manifest = browser.runtime.getManifest();
    const payload = {
      app: manifest.name,
      extensionVersion: manifest.version,
      exportFormatVersion: 1,
      exportedAt: (new Date).toISOString(),
      settings: settings,
      pinnedMatches: pinnedMatches,
      mutedMatches: mutedMatches
    };
    const blob = new Blob([ JSON.stringify(payload, null, 2) ], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const dateStamp = (new Date).toISOString().slice(0, 10);
    const a = document.createElement("a");
    a.href = url;
    a.download = `quickscore-settings-${dateStamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showBackupStatus("Exported!", false);
  } catch (e) {
    showBackupStatus("Export failed.", true);
  }
}

async function onImportFileSelected(e) {
  const file = e.target.files && e.target.files[0];
  e.target.value = "";
  if (!file) return;
  let parsed;
  try {
    const text = await file.text();
    parsed = JSON.parse(text);
  } catch (err) {
    showBackupStatus("That file isn't valid JSON.", true);
    return;
  }
  const importedSettings = parsed && typeof parsed === "object" ? parsed.settings && typeof parsed.settings === "object" ? parsed.settings : parsed : null;
  if (!importedSettings || typeof importedSettings !== "object") {
    showBackupStatus("That file doesn't look like a settings export.", true);
    return;
  }
  const fromVersion = parsed.extensionVersion ? ` (exported from v${parsed.extensionVersion})` : "";
  const confirmed = window.confirm(`Import settings${fromVersion}? This replaces your current settings, favorite teams, leagues, and pinned/muted matches.`);
  if (!confirmed) return;
  try {
    await Storage.setSettings(importedSettings);
    if (Array.isArray(parsed.pinnedMatches)) await Storage.setPinnedMatches(parsed.pinnedMatches);
    if (Array.isArray(parsed.mutedMatches)) await Storage.setMutedMatches(parsed.mutedMatches);
    await Storage.remove(CONFIG.STORAGE_KEYS.MATCH_SNAPSHOT);
    try {
      await browser.runtime.sendMessage({
        type: "SETTINGS_UPDATED"
      });
    } catch (err) {}
    showBackupStatus("Imported! Reloading…", false);
    setTimeout(() => location.reload(), 600);
  } catch (err) {
    showBackupStatus("Import failed.", true);
  }
}

document.addEventListener("DOMContentLoaded", init);
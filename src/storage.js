const Storage = {
  async get(key, fallback = null) {
    try {
      const result = await browser.storage.local.get(key);
      if (Object.prototype.hasOwnProperty.call(result, key)) {
        return result[key];
      }
      return fallback;
    } catch (e) {
      return fallback;
    }
  },
  async set(key, value) {
    try {
      await browser.storage.local.set({
        [key]: value
      });
      return true;
    } catch (e) {
      return false;
    }
  },
  async remove(key) {
    try {
      await browser.storage.local.remove(key);
      return true;
    } catch (e) {
      return false;
    }
  },
  async getSettings() {
    const stored = await this.get(CONFIG.STORAGE_KEYS.SETTINGS, null);
    if (!stored) {
      await this.set(CONFIG.STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
      return {
        ...DEFAULT_SETTINGS
      };
    }
    const merged = {
      ...DEFAULT_SETTINGS,
      ...stored
    };
    return this._migrate(merged);
  },
  _migrate(settings) {
    const migrated = {
      ...settings
    };
    if (Array.isArray(migrated.leagues) && !Array.isArray(migrated.selectedLeagueIds)) {
      migrated.selectedLeagueIds = migrated.leagues.filter(l => l.selected).map(l => l.id);
    }
    if (!Array.isArray(migrated.selectedLeagueIds)) {
      migrated.selectedLeagueIds = [ ...CONFIG.DEFAULT_SELECTED_LEAGUE_IDS ];
    }
    delete migrated.leagues;
    if (Array.isArray(migrated.favoriteTeams)) {
      migrated.favoriteTeams = migrated.favoriteTeams.map(team => {
        if (typeof team === "string" || typeof team === "number") {
          const name = String(team);
          return {
            key: Utils.teamKey("soccer", name),
            name: name,
            sport: "soccer",
            leagueId: null,
            logo: ""
          };
        }
        if (!team.key) {
          return {
            ...team,
            key: Utils.teamKey(team.sport || "soccer", team.name)
          };
        }
        return team;
      });
    } else {
      migrated.favoriteTeams = [];
    }
    if (!migrated.selectedSportFilter) {
      migrated.selectedSportFilter = CONFIG.ALL_SPORTS;
    }
    if (!migrated.notifyEvents || typeof migrated.notifyEvents !== "object") {
      migrated.notifyEvents = {
        ...DEFAULT_SETTINGS.notifyEvents
      };
    }
    if (!migrated.notifyDisplayMode) {
      migrated.notifyDisplayMode = DEFAULT_SETTINGS.notifyDisplayMode;
    }
    if (migrated.notifyScope === "disabled") {
      migrated.notifyScope = {
        ...CONFIG.NOTIFY_SCOPE_DEFAULT
      };
    }
    if (typeof migrated.notifyScope === "string") {
      migrated.notifyScope = migrated.notifyScope === "favorites_only" ? {
        allLive: false,
        favorites: true,
        pinned: false
      } : {
        allLive: true,
        favorites: false,
        pinned: false
      };
    }
    if (!migrated.notifyScope || typeof migrated.notifyScope !== "object") {
      migrated.notifyScope = {
        ...CONFIG.NOTIFY_SCOPE_DEFAULT
      };
    }
    delete migrated.timezone;
    return migrated;
  },
  async setSettings(settings) {
    return this.set(CONFIG.STORAGE_KEYS.SETTINGS, settings);
  },
  async updateSettings(partial) {
    const current = await this.getSettings();
    const updated = {
      ...current,
      ...partial
    };
    await this.setSettings(updated);
    return updated;
  },
  async getPinnedMatches() {
    return this.get(CONFIG.STORAGE_KEYS.PINNED_MATCHES, []);
  },
  async setPinnedMatches(list) {
    return this.set(CONFIG.STORAGE_KEYS.PINNED_MATCHES, list);
  },
  _PIN_MAX: 50,
  _MUTE_MAX: 100,
  async togglePin(match) {
    const list = await this.getPinnedMatches();
    const idx = list.findIndex(p => p.id === match.id);
    if (idx >= 0) {
      list.splice(idx, 1);
    } else {
      list.push({
        id: match.id,
        leagueId: match.leagueId,
        sport: match.sport
      });
      while (list.length > this._PIN_MAX) list.shift();
    }
    await this.setPinnedMatches(list);
    return list;
  },
  async getMutedMatches() {
    return this.get(CONFIG.STORAGE_KEYS.MUTED_MATCHES, []);
  },
  async setMutedMatches(list) {
    return this.set(CONFIG.STORAGE_KEYS.MUTED_MATCHES, list);
  },
  async toggleMute(matchId) {
    const list = await this.getMutedMatches();
    const idx = list.indexOf(matchId);
    if (idx >= 0) {
      list.splice(idx, 1);
    } else {
      list.push(matchId);
      while (list.length > this._MUTE_MAX) list.shift();
    }
    await this.setMutedMatches(list);
    return list;
  }
};

if (typeof window !== "undefined") {
  window.Storage = Storage;
} else {
  self.Storage = Storage;
}
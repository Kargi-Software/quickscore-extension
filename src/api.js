const Api = {
  BASE_URL: "https://site.api.espn.com/apis/site/v2/sports",
  SCOREPANEL_BASE_URL: "https://site.web.api.espn.com/apis/site/v2/sports/soccer/scorepanel",
  CORE_BASE_URL: "https://sports.core.api.espn.com/v2/sports",
  REQUEST_TIMEOUT_MS: 1e4,
  SCOREPANEL_TIMEOUT_MS: 2e4,
  async _fetchWithTimeout(url, timeoutMs = this.REQUEST_TIMEOUT_MS) {
    const controller = new AbortController;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, {
        cache: "no-store",
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeoutId);
    }
  },
  async fetchScoreboard(sport, leagueSlug, dateStr) {
    const url = `${this.BASE_URL}/${sport}/${leagueSlug}/scoreboard?dates=${dateStr}`;
    try {
      const res = await this._fetchWithTimeout(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      throw e;
    }
  },
  async fetchMatchSummary(sport, leagueSlug, eventId) {
    const url = `${this.BASE_URL}/${sport}/${leagueSlug}/summary?event=${eventId}`;
    try {
      const res = await this._fetchWithTimeout(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      throw e;
    }
  },
  async fetchSoccerScorePanel(dateStr) {
    const params = new URLSearchParams({
      league: "all",
      region: "us",
      lang: "en",
      contentorigin: "espn",
      limit: "300",
      dates: dateStr,
      tz: "America/New_York"
    });
    const url = `${this.SCOREPANEL_BASE_URL}?${params.toString()}`;
    try {
      const res = await this._fetchWithTimeout(url, this.SCOREPANEL_TIMEOUT_MS);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      throw e;
    }
  },
  
  
  
  async fetchCompetitorStatistics(sport, leagueSlug, eventId, teamId) {
    const url = `${this.CORE_BASE_URL}/${sport}/leagues/${leagueSlug}/events/${eventId}/competitions/${eventId}/competitors/${teamId}/statistics`;
    try {
      const res = await this._fetchWithTimeout(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      throw e;
    }
  }
};

if (typeof window !== "undefined") {
  window.Api = Api;
} else {
  self.Api = Api;
}
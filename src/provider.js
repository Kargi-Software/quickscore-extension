const Provider = {
  async getMatchesForLeague(league, dateList) {
    const allMatches = [];
    let hadError = false;
    const context = {
      sport: league.sport,
      leagueId: league.id,
      leagueName: league.name,
      linkSlug: league.slug
    };
    const results = await Promise.all(dateList.map(async dateStr => {
      try {
        const json = await Api.fetchScoreboard(league.sport, league.slug, dateStr);
        if (!json || !Array.isArray(json.events)) return [];
        return json.events.map(event => this._normalizeEvent(event, context)).filter(Boolean);
      } catch (e) {
        hadError = true;
        return [];
      }
    }));
    for (const events of results) allMatches.push(...events);
    const matches = this._dedupeById(allMatches);
    return {
      matches: matches,
      hadError: hadError
    };
  },
  async getSoccerMatchesForDate(dateStr) {
    try {
      const json = await Api.fetchSoccerScorePanel(dateStr);
      if (!json || !Array.isArray(json.scores)) return {
        matches: [],
        hadError: false
      };
      const allMatches = [];
      for (const group of json.scores) {
        const meta = group.leagues && group.leagues[0] || {};
        const events = group.events || [];
        for (const event of events) {
          const slug = event.leagueId || meta.slug || null;
          const catalogLeague = LeaguesData.getLeagueBySlug(slug);
          const context = {
            sport: "soccer",
            leagueId: catalogLeague ? catalogLeague.id : null,
            leagueName: catalogLeague ? catalogLeague.name : meta.name || "Other Competition",
            linkSlug: slug
          };
          const normalized = this._normalizeEvent(event, context);
          if (normalized) allMatches.push(normalized);
        }
      }
      return {
        matches: this._dedupeById(allMatches),
        hadError: false
      };
    } catch (e) {
      return {
        matches: [],
        hadError: true
      };
    }
  },
  _dedupeById(matches) {
    const seen = new Set;
    return matches.filter(m => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
  },
  _normalizeEvent(event, context) {
    try {
      const competition = event.competitions && event.competitions[0];
      if (!competition) return null;
      const competitors = competition.competitors || [];
      const home = competitors.find(c => c.homeAway === "home");
      const away = competitors.find(c => c.homeAway === "away");
      if (!home || !away) return null;
      const status = event.status || {};
      const stateRaw = status.type ? status.type.state : "pre";
      const statusText = status.type ? status.type.shortDetail : "";
      const decidedByPenalties = !!(status.type && status.type.name === "STATUS_FINAL_PEN");
      let seriesWinner = null;
      const series = competition.series;
      const hasSeries = !!series;
      if (series && series.completed && Array.isArray(series.competitors)) {
        const homeId = home.team && home.team.id;
        const awayId = away.team && away.team.id;
        const homeSeriesEntry = series.competitors.find(c => String(c.id) === String(homeId));
        const awaySeriesEntry = series.competitors.find(c => String(c.id) === String(awayId));
        if (homeSeriesEntry && awaySeriesEntry) {
          if (homeSeriesEntry.winner === true || awaySeriesEntry.winner === true) {
            seriesWinner = homeSeriesEntry.winner === true ? "home" : "away";
          } else if (typeof homeSeriesEntry.wins === "number" && typeof awaySeriesEntry.wins === "number") {
            if (homeSeriesEntry.wins > awaySeriesEntry.wins) seriesWinner = "home"; else if (awaySeriesEntry.wins > homeSeriesEntry.wins) seriesWinner = "away";
          }
        }
      }
      const seasonType = event.season && event.season.type;
      const notesText = Array.isArray(competition.notes) ? competition.notes.map(n => n && n.headline || "").join(" ") : "";
      const isPlayoff = seasonType === 3 || /playoff|postseason|play-in|wild card/i.test(notesText);
      return {
        id: event.id,
        sport: context.sport,
        leagueId: context.leagueId,
        leagueName: context.leagueName,
        homeTeam: {
          id: home.team ? home.team.id : null,
          name: home.team ? home.team.shortDisplayName || home.team.displayName || "TBD" : "TBD",
          logo: this._teamLogo(home.team),
          winner: home.winner === true
        },
        awayTeam: {
          id: away.team ? away.team.id : null,
          name: away.team ? away.team.shortDisplayName || away.team.displayName || "TBD" : "TBD",
          logo: this._teamLogo(away.team),
          winner: away.winner === true
        },
        homeScore: home.score !== undefined ? home.score : "0",
        awayScore: away.score !== undefined ? away.score : "0",
        state: stateRaw,
        statusText: statusText,
        decidedByPenalties: decidedByPenalties,
        isPlayoff: isPlayoff,
        hasSeries: hasSeries,
        seriesWinner: seriesWinner,
        startTimeUTC: event.date,
        espnSlug: context.linkSlug || null,
        link: context.sport === "soccer" ? `https://www.espn.com/soccer/match/_/gameId/${event.id}` : `https://www.espn.com/${context.linkSlug}/game/_/gameId/${event.id}`,
        competitionLink: !context.linkSlug ? null : context.sport === "soccer" ? `https://www.espn.com/soccer/standings/_/league/${context.linkSlug}` : `https://www.espn.com/${context.linkSlug}/standings`
      };
    } catch (e) {
      return null;
    }
  },
  
  
  
  _teamLogo(team) {
    if (!team) return null;
    if (team.logo && typeof team.logo === "string" && /^https?:\/\//i.test(team.logo)) {
      return team.logo;
    }
    const logos = Array.isArray(team.logos) ? team.logos : [];
    for (const entry of logos) {
      if (entry && entry.href && /^https?:\/\//i.test(entry.href)) return entry.href;
    }
    return null;
  }
};

if (typeof window !== "undefined") {
  window.Provider = Provider;
} else {
  self.Provider = Provider;
}
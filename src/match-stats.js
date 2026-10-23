const MatchStats = {
  LINEUP_BUILDERS: {
    soccer: "_buildSoccerLineup"
  },
  STATS_BUILDERS: {
    soccer: "_buildSoccerStats",
    basketball: "_buildBasketballStats",
    football: "_buildFootballStats",
    hockey: "_buildHockeyStats",
    baseball: "_buildBaseballStats"
  },
  isLineupSupported(sport) {
    return Object.prototype.hasOwnProperty.call(this.LINEUP_BUILDERS, sport);
  },
  isStatsSupported(sport) {
    return Object.prototype.hasOwnProperty.call(this.STATS_BUILDERS, sport);
  },
  buildLineup(sport, raw) {
    const fnName = this.LINEUP_BUILDERS[sport];
    return fnName ? this[fnName](raw) : null;
  },
  buildComparisonStats(sport, raw) {
    const fnName = this.STATS_BUILDERS[sport];
    return fnName ? this[fnName](raw) : [];
  },
  _playerRef(athlete, jersey, sport, rosterEntry) {
    if (!athlete) return null;
    const ref = {
      jersey: jersey || "",
      id: athlete.id != null ? String(athlete.id) : null,
      name: athlete.displayName || "",
      url: MatchEvents.buildPlayerUrl(athlete, sport)
    };
    if (rosterEntry && Array.isArray(rosterEntry.stats)) {
      const num = names => {
        for (const n of names) {
          const found = rosterEntry.stats.find(s => s && s.name === n);
          if (found != null) {
            const v = Number(found.value != null ? found.value : found.displayValue);
            if (Number.isFinite(v) && v > 0) return v;
          }
        }
        return 0;
      };
      ref.goals = num([ "totalGoals", "goals" ]);
      ref.assists = num([ "goalAssists", "assists" ]);
      ref.yellowCards = num([ "yellowCards" ]);
      ref.redCards = num([ "redCards" ]);
    }
    return ref;
  },
  _buildSoccerLineup(raw) {
    const rosters = raw && Array.isArray(raw.rosters) ? raw.rosters : [];
    if (rosters.length < 2) return null;
    const sport = "soccer";
    const bySide = {};
    for (const teamEntry of rosters) {
      if (!teamEntry || !Array.isArray(teamEntry.roster)) continue;
      const side = teamEntry.homeAway === "away" ? "away" : "home";
      const byId = new Map;
      for (const p of teamEntry.roster) {
        if (p && p.athlete && p.athlete.id != null) byId.set(String(p.athlete.id), p);
      }
      const starters = teamEntry.roster.filter(p => p && p.starter === true).sort((a, b) => (Number(a.formationPlace) || 0) - (Number(b.formationPlace) || 0));
      const players = starters.map(starter => {
        const chain = [ this._playerRef(starter.athlete, starter.jersey, sport, starter) ];
        const visited = new Set([ String(starter.athlete && starter.athlete.id) ]);
        let current = starter;
        while (current && current.subbedOut && current.subbedOutFor && current.subbedOutFor.athlete) {
          const nextId = String(current.subbedOutFor.athlete.id);
          if (visited.has(nextId)) break;
          visited.add(nextId);
          const nextEntry = byId.get(nextId) || null;
          const subAthlete = nextEntry && nextEntry.athlete || current.subbedOutFor.athlete;
          const subJersey = nextEntry && nextEntry.jersey || current.subbedOutFor.jersey;
          chain.push(this._playerRef(subAthlete, subJersey, sport, nextEntry));
          current = nextEntry;
        }
        return {
          chain: chain
        };
      });
      bySide[side] = {
        formation: teamEntry.formation || "",
        players: players
      };
    }
    if (!bySide.home || !bySide.away) return null;
    return bySide;
  },
  _findFlatStat(statsArray, names) {
    if (!Array.isArray(statsArray)) return null;
    for (const n of names) {
      const found = statsArray.find(s => s && s.name === n);
      if (found) return found.displayValue;
    }
    return null;
  },
  
  
  _flattenCoreCompetitorStats(corePayload) {
    if (!corePayload || !corePayload.splits || !Array.isArray(corePayload.splits.categories)) {
      return null;
    }
    const out = {};
    for (const cat of corePayload.splits.categories) {
      if (!cat || !Array.isArray(cat.stats)) continue;
      for (const st of cat.stats) {
        if (st && st.name) {
          out[st.name] = st.displayValue != null ? st.displayValue : (st.value != null ? String(st.value) : null);
        }
      }
    }
    return out;
  },
  _coreStat(flatHome, flatAway, name) {
    const h = flatHome && flatHome[name] != null ? flatHome[name] : null;
    const a = flatAway && flatAway[name] != null ? flatAway[name] : null;
    if (h == null && a == null) return null;
    return { home: h == null ? "0" : h, away: a == null ? "0" : a };
  },
  _buildSoccerStats(raw) {
    const boxscoreTeams = raw && raw.boxscore && Array.isArray(raw.boxscore.teams) ? raw.boxscore.teams : [];
    const teamByHomeAway = side => boxscoreTeams.find(t => t && t.homeAway === side);
    const homeStats = teamByHomeAway("home") ? teamByHomeAway("home").statistics : null;
    const awayStats = teamByHomeAway("away") ? teamByHomeAway("away").statistics : null;
    const ratioToPercent = v => {
      const n = parseFloat(v);
      return Number.isFinite(n) ? String(Math.round(n * 100)) : null;
    };
    const defs = [ {
      label: "Possession",
      isPercent: true,
      flat: [ "possessionPct" ]
    }, {
      label: "Shots",
      flat: [ "totalShots" ]
    }, {
      label: "Shots on Target",
      flat: [ "shotsOnTarget", "shotsOnGoal" ]
    }, {
      label: "Passes",
      flat: [ "totalPasses" ]
    }, {
      label: "Pass Accuracy",
      isPercent: true,
      flat: [ "passPct" ],
      transform: ratioToPercent
    }, {
      label: "Corners",
      flat: [ "wonCorners", "cornerKicks", "corners" ]
    }, {
      label: "Offsides",
      flat: [ "offsides" ]
    }, {
      label: "Yellow Cards",
      flat: [ "yellowCards" ]
    }, {
      label: "Red Cards",
      flat: [ "redCards" ]
    } ];
    const rows = defs.map(def => {
      let home = this._findFlatStat(homeStats, def.flat);
      let away = this._findFlatStat(awayStats, def.flat);
      if (def.transform) {
        home = home == null ? null : def.transform(home);
        away = away == null ? null : def.transform(away);
      }
      return {
        label: def.label,
        isPercent: !!def.isPercent,
        home: home == null ? "0" : home,
        away: away == null ? "0" : away
      };
    });
    
    
    if (typeof CONFIG !== "undefined" && CONFIG.hasXGChance && raw && raw.__xgChance) {
      const flatHome = this._flattenCoreCompetitorStats(raw.__xgChance.home);
      const flatAway = this._flattenCoreCompetitorStats(raw.__xgChance.away);
      const extras = [];
      const xg = this._coreStat(flatHome, flatAway, "expectedGoals");
      if (xg) extras.push({ label: "xG", isPercent: false, home: xg.home, away: xg.away });
      const bcc = this._coreStat(flatHome, flatAway, "bigChanceCreated");
      if (bcc) extras.push({ label: "Big Chances", isPercent: false, home: bcc.home, away: bcc.away });
      const bcm = this._coreStat(flatHome, flatAway, "bigChanceMissed");
      if (bcm) extras.push({ label: "Big Chances Missed", isPercent: false, home: bcm.home, away: bcm.away });
      if (extras.length) {
        const insertAt = rows.findIndex(r => r.label === "Shots on Target");
        const at = insertAt >= 0 ? insertAt + 1 : 3;
        rows.splice(at, 0, ...extras);
      }
    }
    return rows;
  },
  _buildBasketballStats(raw) {
    const boxscoreTeams = raw && raw.boxscore && Array.isArray(raw.boxscore.teams) ? raw.boxscore.teams : [];
    const teamByHomeAway = side => boxscoreTeams.find(t => t && t.homeAway === side);
    const homeStats = teamByHomeAway("home") ? teamByHomeAway("home").statistics : null;
    const awayStats = teamByHomeAway("away") ? teamByHomeAway("away").statistics : null;
    const defs = [ {
      label: "Field Goals",
      flat: [ "fieldGoalsMade-fieldGoalsAttempted" ]
    }, {
      label: "FG %",
      isPercent: true,
      flat: [ "fieldGoalPct" ]
    }, {
      label: "3-Pointers",
      flat: [ "threePointFieldGoalsMade-threePointFieldGoalsAttempted" ]
    }, {
      label: "3PT %",
      isPercent: true,
      flat: [ "threePointFieldGoalPct" ]
    }, {
      label: "Free Throws",
      flat: [ "freeThrowsMade-freeThrowsAttempted" ]
    }, {
      label: "FT %",
      isPercent: true,
      flat: [ "freeThrowPct" ]
    }, {
      label: "Rebounds",
      flat: [ "totalRebounds" ]
    }, {
      label: "Off. Rebounds",
      flat: [ "offensiveRebounds" ]
    }, {
      label: "Def. Rebounds",
      flat: [ "defensiveRebounds" ]
    }, {
      label: "Assists",
      flat: [ "assists" ]
    }, {
      label: "Steals",
      flat: [ "steals" ]
    }, {
      label: "Blocks",
      flat: [ "blocks" ]
    }, {
      label: "Turnovers",
      flat: [ "turnovers" ]
    }, {
      label: "Total Turnovers",
      flat: [ "totalTurnovers" ]
    }, {
      label: "Fouls",
      flat: [ "fouls" ]
    }, {
      label: "Technical Fouls",
      flat: [ "technicalFouls" ]
    }, {
      label: "Flagrant Fouls",
      flat: [ "flagrantFouls" ]
    }, {
      label: "Points in Paint",
      flat: [ "pointsInPaint" ]
    }, {
      label: "Fast Break Points",
      flat: [ "fastBreakPoints" ]
    }, {
      label: "Largest Lead",
      flat: [ "largestLead" ]
    }, {
      label: "Lead Changes",
      flat: [ "leadChanges" ]
    } ];
    return defs.map(def => ({
      label: def.label,
      isPercent: !!def.isPercent,
      home: this._findFlatStat(homeStats, def.flat) ?? "0",
      away: this._findFlatStat(awayStats, def.flat) ?? "0"
    }));
  },
  _buildFootballStats(raw) {
    const boxscoreTeams = raw && raw.boxscore && Array.isArray(raw.boxscore.teams) ? raw.boxscore.teams : [];
    const teamByHomeAway = side => boxscoreTeams.find(t => t && t.homeAway === side);
    const homeStats = teamByHomeAway("home") ? teamByHomeAway("home").statistics : null;
    const awayStats = teamByHomeAway("away") ? teamByHomeAway("away").statistics : null;
    const defs = [ {
      label: "First Downs",
      flat: [ "firstDowns" ]
    }, {
      label: "1st Downs (Pass)",
      flat: [ "firstDownsPassing" ]
    }, {
      label: "1st Downs (Rush)",
      flat: [ "firstDownsRushing" ]
    }, {
      label: "3rd Down Eff.",
      flat: [ "thirdDownEff" ]
    }, {
      label: "4th Down Eff.",
      flat: [ "fourthDownEff" ]
    }, {
      label: "Total Yards",
      flat: [ "totalYards" ]
    }, {
      label: "Yards / Play",
      flat: [ "yardsPerPlay" ]
    }, {
      label: "Total Drives",
      flat: [ "totalDrives" ]
    }, {
      label: "Passing Yards",
      flat: [ "netPassingYards" ]
    }, {
      label: "Comp / Att",
      flat: [ "completionAttempts" ]
    }, {
      label: "Yards / Pass",
      flat: [ "yardsPerPass" ]
    }, {
      label: "Interceptions",
      flat: [ "interceptions" ]
    }, {
      label: "Sacks",
      flat: [ "sacksYardsLost" ]
    }, {
      label: "Rushing Yards",
      flat: [ "rushingYards" ]
    }, {
      label: "Rush Attempts",
      flat: [ "rushingAttempts" ]
    }, {
      label: "Yards / Rush",
      flat: [ "yardsPerRushAttempt" ]
    }, {
      label: "Red Zone",
      flat: [ "redZoneAttempts" ]
    }, {
      label: "Penalties",
      flat: [ "totalPenaltiesYards" ]
    }, {
      label: "Turnovers",
      flat: [ "turnovers" ]
    }, {
      label: "Fumbles Lost",
      flat: [ "fumblesLost" ]
    }, {
      label: "Time of Possession",
      flat: [ "possessionTime" ]
    }, {
      label: "Offensive Plays",
      flat: [ "totalOffensivePlays" ]
    } ];
    return defs.map(def => ({
      label: def.label,
      isPercent: false,
      home: this._findFlatStat(homeStats, def.flat) ?? "0",
      away: this._findFlatStat(awayStats, def.flat) ?? "0"
    }));
  },
  _buildHockeyStats(raw) {
    const boxscoreTeams = raw && raw.boxscore && Array.isArray(raw.boxscore.teams) ? raw.boxscore.teams : [];
    const teamByHomeAway = side => boxscoreTeams.find(t => t && t.homeAway === side);
    const homeStats = teamByHomeAway("home") ? teamByHomeAway("home").statistics : null;
    const awayStats = teamByHomeAway("away") ? teamByHomeAway("away").statistics : null;
    const defs = [ {
      label: "Shots",
      flat: [ "shotsTotal" ]
    }, {
      label: "Blocked Shots",
      flat: [ "blockedShots" ]
    }, {
      label: "Hits",
      flat: [ "hits" ]
    }, {
      label: "Takeaways",
      flat: [ "takeaways" ]
    }, {
      label: "Giveaways",
      flat: [ "giveaways" ]
    }, {
      label: "Faceoffs Won",
      flat: [ "faceoffsWon" ]
    }, {
      label: "Faceoff %",
      isPercent: true,
      flat: [ "faceoffPercent" ]
    }, {
      label: "Power Play Goals",
      flat: [ "powerPlayGoals" ]
    }, {
      label: "Power Play Chances",
      flat: [ "powerPlayOpportunities" ]
    }, {
      label: "Power Play %",
      isPercent: true,
      flat: [ "powerPlayPct" ]
    }, {
      label: "Short-Handed Goals",
      flat: [ "shortHandedGoals" ]
    }, {
      label: "Penalties",
      flat: [ "penalties" ]
    }, {
      label: "Penalty Minutes",
      flat: [ "penaltyMinutes" ]
    }, {
      label: "Shootout Goals",
      flat: [ "shootoutGoals" ]
    } ];
    return defs.map(def => ({
      label: def.label,
      isPercent: !!def.isPercent,
      home: this._findFlatStat(homeStats, def.flat) ?? "0",
      away: this._findFlatStat(awayStats, def.flat) ?? "0"
    }));
  },
  _findNestedStat(categories, categoryName, statName) {
    if (!Array.isArray(categories)) return null;
    const cat = categories.find(c => c && c.name === categoryName);
    const stats = cat && Array.isArray(cat.stats) ? cat.stats : null;
    const found = stats ? stats.find(s => s && s.name === statName) : null;
    return found ? found.displayValue : null;
  },
  _buildBaseballStats(raw) {
    const boxscoreTeams = raw && raw.boxscore && Array.isArray(raw.boxscore.teams) ? raw.boxscore.teams : [];
    const teamByHomeAway = side => boxscoreTeams.find(t => t && t.homeAway === side);
    const homeCats = teamByHomeAway("home") ? teamByHomeAway("home").statistics : null;
    const awayCats = teamByHomeAway("away") ? teamByHomeAway("away").statistics : null;
    const defs = [ {
      label: "Runs",
      category: "batting",
      stat: "runs"
    }, {
      label: "Hits",
      category: "batting",
      stat: "hits"
    }, {
      label: "RBI",
      category: "batting",
      stat: "RBIs"
    }, {
      label: "Home Runs",
      category: "batting",
      stat: "homeRuns"
    }, {
      label: "Doubles",
      category: "batting",
      stat: "doubles"
    }, {
      label: "Triples",
      category: "batting",
      stat: "triples"
    }, {
      label: "Walks",
      category: "batting",
      stat: "walks"
    }, {
      label: "Strikeouts",
      category: "batting",
      stat: "strikeouts"
    }, {
      label: "At Bats",
      category: "batting",
      stat: "atBats"
    }, {
      label: "Stolen Bases",
      category: "batting",
      stat: "stolenBases"
    }, {
      label: "Left On Base",
      category: "batting",
      stat: "runnersLeftOnBase"
    }, {
      label: "Hit By Pitch",
      category: "batting",
      stat: "hitByPitch"
    }, {
      label: "Earned Runs",
      category: "pitching",
      stat: "earnedRuns"
    }, {
      label: "Pitching Strikeouts",
      category: "pitching",
      stat: "strikeouts"
    }, {
      label: "Pitching Walks",
      category: "pitching",
      stat: "walks"
    }, {
      label: "Saves",
      category: "pitching",
      stat: "saves"
    }, {
      label: "Batters Faced",
      category: "pitching",
      stat: "battersFaced"
    }, {
      label: "Errors",
      category: "fielding",
      stat: "errors"
    }, {
      label: "Assists",
      category: "fielding",
      stat: "assists"
    }, {
      label: "Putouts",
      category: "fielding",
      stat: "putouts"
    }, {
      label: "Double Plays",
      category: "fielding",
      stat: "doublePlays"
    } ];
    return defs.map(def => ({
      label: def.label,
      isPercent: false,
      home: this._findNestedStat(homeCats, def.category, def.stat) ?? "0",
      away: this._findNestedStat(awayCats, def.category, def.stat) ?? "0"
    }));
  }
};

if (typeof window !== "undefined") {
  window.MatchStats = MatchStats;
} else {
  self.MatchStats = MatchStats;
}
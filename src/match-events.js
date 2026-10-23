const MatchEvents = {
  SPORT_PARSERS: {
    soccer: "_parseSoccerEvents",
    basketball: "_parseBasketballEvents",
    football: "_parseFootballEvents",
    hockey: "_parseHockeyEvents",
    baseball: "_parseBaseballEvents"
  },
  isSupported(sport) {
    return Object.prototype.hasOwnProperty.call(this.SPORT_PARSERS, sport);
  },
  parseEvents(sport, raw, match) {
    const fnName = this.SPORT_PARSERS[sport];
    return fnName ? this[fnName](raw, match) : [];
  },
  buildPlayerUrl(athlete, sport) {
    if (!athlete || athlete.id == null) return null;
    const name = athlete.displayName || athlete.fullName || athlete.shortName || "";
    const slug = Utils.slugify(name);
    const sportPath = sport === "soccer" ? "soccer" : sport || "soccer";
    return `https://www.espn.com/${sportPath}/player/_/id/${athlete.id}${slug ? "/" + slug : ""}`;
  },
  _playerRef(participant, sport) {
    if (!participant) return null;
    let athlete = participant.athlete || null;
    if (!athlete && (participant.displayName || participant.fullName || participant.shortName || participant.id != null)) {
      athlete = participant;
    }
    if (!athlete) return null;
    const name = athlete.displayName || athlete.fullName || athlete.shortName || "";
    if (!name && athlete.id == null) return null;
    return {
      id: athlete.id != null ? athlete.id : null,
      name: name || "Unknown",
      url: this.buildPlayerUrl(athlete, sport)
    };
  },
  _nameFromPlayText(text) {
    if (!text || typeof text !== "string") return null;
    const t = text.trim();
    let m = t.match(/^(?:Coach\s+)?(.+?)\s+(?:technical|flagrant)\s+foul/i);
    if (m && m[1]) return m[1].trim();
    m = t.match(/(?:technical|flagrant)\s+foul(?:\s+type\s+\d+)?\s+on\s+(.+)$/i);
    if (m && m[1]) return m[1].trim();
    m = t.match(/^(.+?)\s+ejected/i);
    if (m && m[1]) return m[1].trim();
    return null;
  },
  _summarizeShootout(shootoutTeams, match) {
    if (!Array.isArray(shootoutTeams) || shootoutTeams.length < 2) return null;
    const scoreFor = teamEntry => teamEntry && Array.isArray(teamEntry.shots) ? teamEntry.shots.filter(s => s && s.didScore).length : 0;
    const norm = s => (s || "").toLowerCase().trim();
    const homeName = norm(match.homeTeam && match.homeTeam.name);
    const awayName = norm(match.awayTeam && match.awayTeam.name);
    const homeEntry = shootoutTeams.find(t => norm(t.team) === homeName) || shootoutTeams[0];
    const awayEntry = shootoutTeams.find(t => norm(t.team) === awayName) || shootoutTeams[1];
    return {
      home: scoreFor(homeEntry),
      away: scoreFor(awayEntry)
    };
  },
  _parseSoccerEvents(raw, match) {
    const rawEvents = raw && Array.isArray(raw.keyEvents) ? raw.keyEvents : [];
    if (!rawEvents.length || !match) return [];
    const sport = "soccer";
    const homeId = match.homeTeam && match.homeTeam.id != null ? String(match.homeTeam.id) : null;
    const isPenaltyMissed = t => typeof t === "string" && /penalt/i.test(t) && /miss/i.test(t);
    const isPenaltyScored = t => typeof t === "string" && /penalt/i.test(t) && /scor/i.test(t);
    const isOwnGoal = t => typeof t === "string" && /own.?goal/i.test(t);
    const hasShootout = Array.isArray(raw.shootout) && raw.shootout.length > 0;
    const out = [];
    let homeScore = 0;
    let awayScore = 0;
    for (const ev of rawEvents) {
      if (!ev) continue;
      const typeType = ev.type && ev.type.type;
      const minuteLabel = ev.clock && ev.clock.displayValue || "";
      const teamId = ev.team && ev.team.id != null ? String(ev.team.id) : null;
      const isHome = teamId != null && homeId != null ? teamId === homeId : null;
      const participants = Array.isArray(ev.participants) ? ev.participants : [];
      if (ev.scoringPlay === true) {
        if (isHome === true) homeScore += 1; else if (isHome === false) awayScore += 1;
        let note = null;
        if (isOwnGoal(typeType)) note = "OG"; else if (isPenaltyScored(typeType)) note = "pen";
        out.push({
          id: ev.id,
          kind: "goal",
          minuteLabel: minuteLabel,
          isHome: isHome,
          note: note,
          scoreAfter: {
            home: homeScore,
            away: awayScore
          },
          primary: this._playerRef(participants[0], sport),
          secondary: this._playerRef(participants[1], sport)
        });
        continue;
      }
      if (typeType === "yellow-card") {
        out.push({
          id: ev.id,
          kind: "yellow-card",
          minuteLabel: minuteLabel,
          isHome: isHome,
          primary: this._playerRef(participants[0], sport)
        });
        continue;
      }
      if (typeType === "red-card" || typeof typeType === "string" && typeType.endsWith("red-card")) {
        out.push({
          id: ev.id,
          kind: "red-card",
          minuteLabel: minuteLabel,
          isHome: isHome,
          primary: this._playerRef(participants[0], sport)
        });
        continue;
      }
      if (isPenaltyMissed(typeType)) {
        out.push({
          id: ev.id,
          kind: "penalty-missed",
          minuteLabel: minuteLabel,
          isHome: isHome,
          primary: this._playerRef(participants[0], sport)
        });
        continue;
      }
      if (typeType === "substitution") {
        out.push({
          id: ev.id,
          kind: "substitution",
          minuteLabel: minuteLabel,
          isHome: isHome,
          primary: this._playerRef(participants[0], sport),
          secondary: this._playerRef(participants[1], sport)
        });
        continue;
      }
      if (typeType === "kickoff" && ev.period && ev.period.number === 1) {
        out.push({
          id: ev.id,
          kind: "kickoff"
        });
        continue;
      }
      if (typeType === "halftime") {
        out.push({
          id: ev.id,
          kind: "halftime",
          scoreAfter: {
            home: homeScore,
            away: awayScore
          }
        });
        continue;
      }
      if (typeType === "end-regular-time") {
        const isTrueFinal = !hasShootout && !rawEvents.some(e => e && e.type && e.type.type === "end-extra-time");
        out.push({
          id: ev.id,
          kind: isTrueFinal ? "fulltime" : "period-marker",
          label: isTrueFinal ? undefined : "90'",
          scoreAfter: {
            home: homeScore,
            away: awayScore
          }
        });
        continue;
      }
      if (typeType === "start-extra-time" && ev.period && ev.period.number === 3) {
        out.push({
          id: ev.id,
          kind: "period-marker",
          label: "Extra Time"
        });
        continue;
      }
      if (typeType === "halftime-extra-time") {
        out.push({
          id: ev.id,
          kind: "period-marker",
          label: "ET Break",
          scoreAfter: {
            home: homeScore,
            away: awayScore
          }
        });
        continue;
      }
      if (typeType === "end-extra-time") {
        out.push({
          id: ev.id,
          kind: hasShootout ? "period-marker" : "fulltime",
          label: hasShootout ? "AET" : undefined,
          scoreAfter: {
            home: homeScore,
            away: awayScore
          }
        });
        continue;
      }
      if (typeType === "start-shootout") {
        out.push({
          id: ev.id,
          kind: "period-marker",
          label: "Penalties"
        });
        continue;
      }
      if (typeType === "end-match" && hasShootout) {
        const shootoutScore = this._summarizeShootout(raw.shootout, match);
        out.push({
          id: ev.id,
          kind: "fulltime",
          scoreAfter: {
            home: homeScore,
            away: awayScore
          },
          note: shootoutScore ? `${shootoutScore.home}-${shootoutScore.away} pens` : null
        });
        continue;
      }
    }
    return out;
  },
  _periodLabel(periodNumber, regulationPeriods) {
    if (periodNumber == null) return "";
    if (periodNumber <= regulationPeriods) return "Q" + periodNumber;
    const otNum = periodNumber - regulationPeriods;
    return otNum <= 1 ? "OT" : "OT" + otNum;
  },
  _clockLabel(clock) {
    if (typeof clock === "string") return clock;
    return clock && clock.displayValue || "";
  },
  _parseBasketballEvents(raw, match) {
    const plays = raw && Array.isArray(raw.plays) ? raw.plays : [];
    if (!plays.length || !match) return [];
    const urlSport = match.espnSlug || "nba";
    const homeId = match.homeTeam && match.homeTeam.id != null ? String(match.homeTeam.id) : null;
    const out = [];
    let currentPeriod = null;
    let runningScore = {
      home: 0,
      away: 0
    };
    for (const p of plays) {
      if (!p) continue;
      const period = p.period && p.period.number;
      const teamId = p.team && p.team.id != null ? String(p.team.id) : null;
      const isHome = teamId != null && homeId != null ? teamId === homeId : null;
      if (currentPeriod !== null && period != null && period !== currentPeriod) {
        out.push({
          id: "period-" + currentPeriod,
          kind: "period-end",
          periodLabel: this._periodLabel(currentPeriod, 4),
          scoreAfter: {
            ...runningScore
          }
        });
      }
      if (period != null) currentPeriod = period;
      const home = parseInt(p.homeScore, 10);
      const away = parseInt(p.awayScore, 10);
      if (Number.isFinite(home)) runningScore.home = home;
      if (Number.isFinite(away)) runningScore.away = away;
      const typeText = p.type && p.type.text || "";
      const playText = p.text || p.description || "";
      const combined = typeText + " " + playText;
      const isTechnical = /technical\s*foul/i.test(combined);
      const isFlagrant = /flagrant\s*foul/i.test(combined);
      if (isTechnical || isFlagrant) {
        const participants = Array.isArray(p.participants) ? p.participants : [];
        let primary = this._playerRef(participants[0], urlSport);
        if (!primary || !primary.name || primary.name === "Unknown") {
          const fromText = this._nameFromPlayText(playText) || this._nameFromPlayText(typeText);
          if (fromText) {
            primary = {
              id: primary && primary.id,
              name: fromText,
              url: primary && primary.url
            };
          }
        }
        out.push({
          id: p.id,
          kind: isFlagrant ? "flagrant-foul" : "technical-foul",
          minuteLabel: [ this._periodLabel(period, 4), this._clockLabel(p.clock) ].filter(Boolean).join(" "),
          isHome: isHome,
          primary: primary
        });
      }
    }
    if (currentPeriod !== null && match.state === "post") {
      out.push({
        id: "period-final",
        kind: "period-end",
        periodLabel: "Final",
        scoreAfter: {
          ...runningScore
        }
      });
    }
    return out;
  },
  _classifyFootballScore(sp) {
    const abbr = (sp.scoringType && (sp.scoringType.abbreviation || sp.scoringType.name) || "").toUpperCase();
    const text = (sp.type && sp.type.text || "").toLowerCase();
    if (abbr.includes("TD") || text.includes("touchdown")) return "touchdown";
    if (abbr.includes("FG") || text.includes("field goal")) return "field-goal";
    if (abbr.includes("SF") || text.includes("safety")) return "safety";
    if (text.includes("two-point") || text.includes("2-point")) return "two-point-conversion";
    if (text.includes("extra point") || text.includes("pat")) return "extra-point";
    return "score";
  },
  
  
  _footballAthleteIndex(raw) {
    const map = new Map();
    const teams = raw && raw.boxscore && Array.isArray(raw.boxscore.players) ? raw.boxscore.players : [];
    for (const team of teams) {
      for (const group of team && Array.isArray(team.statistics) ? team.statistics : []) {
        for (const entry of group && Array.isArray(group.athletes) ? group.athletes : []) {
          const ath = entry && (entry.athlete || entry);
          if (!ath || ath.id == null) continue;
          const full = ath.displayName || ath.fullName || "";
          const short = ath.shortName || "";
          if (full) map.set(full, { id: ath.id, name: full });
          if (short) map.set(short, { id: ath.id, name: full || short });
        }
      }
    }
    return map;
  },
  
  _linkifyPlayerNames(text, athleteMap, sportPath) {
    if (!text) return null;
    if (!athleteMap || athleteMap.size === 0) return [{ text: text }];
    const names = Array.from(athleteMap.keys()).sort((a, b) => b.length - a.length);
    const hits = [];
    const used = [];
    for (const name of names) {
      let from = 0;
      while (from < text.length) {
        const idx = text.indexOf(name, from);
        if (idx < 0) break;
        const end = idx + name.length;
        const overlaps = used.some(([s, e]) => idx < e && end > s);
        if (!overlaps) {
          used.push([idx, end]);
          hits.push({ start: idx, end: end, name: name });
        }
        from = idx + 1;
      }
    }
    hits.sort((a, b) => a.start - b.start);
    const parts = [];
    let cursor = 0;
    for (const h of hits) {
      if (h.start > cursor) parts.push({ text: text.slice(cursor, h.start) });
      const ath = athleteMap.get(h.name);
      const slug = Utils.slugify((ath && ath.name) || h.name);
      parts.push({
        text: h.name,
        url: ath ? `https://www.espn.com/${sportPath}/player/_/id/${ath.id}${slug ? "/" + slug : ""}` : null
      });
      cursor = h.end;
    }
    if (cursor < text.length) parts.push({ text: text.slice(cursor) });
    return parts.length ? parts : [{ text: text }];
  },
  
  
  _parseFootballEvents(raw, match) {
    if (!match) return [];
    const homeId = match.homeTeam && match.homeTeam.id != null ? String(match.homeTeam.id) : null;
    const drives = raw && raw.drives && Array.isArray(raw.drives.previous) ? raw.drives.previous : [];
    if (drives.length) {
      
      
      const scoringPlays = raw && Array.isArray(raw.scoringPlays) ? raw.scoringPlays : [];
      const athleteMap = this._footballAthleteIndex(raw);
      const sportPath = match.espnSlug || "nfl";
      let scoreIdx = 0;
      const out = [];
      for (const d of drives) {
        if (!d) continue;
        const teamId = d.team && d.team.id != null ? String(d.team.id) : null;
        const isHome = teamId != null && homeId != null ? teamId === homeId : null;
        const period = d.start && d.start.period && d.start.period.number;
        const result = d.displayResult || d.result || "";
        const desc = d.description || "";
        const abbr = (d.team && (d.team.abbreviation || d.team.shortDisplayName)) || "";
        let scoreText = null;
        let scoreParts = null;
        if (d.isScore === true && scoreIdx < scoringPlays.length) {
          const sp = scoringPlays[scoreIdx];
          const spTeam = sp && sp.team && sp.team.id != null ? String(sp.team.id) : null;
          
          if (!spTeam || !teamId || spTeam === teamId) {
            scoreText = (sp && sp.text) || null;
            scoreIdx += 1;
          } else {
            
            let found = -1;
            for (let j = scoreIdx; j < Math.min(scoreIdx + 3, scoringPlays.length); j++) {
              const cand = scoringPlays[j];
              const cid = cand && cand.team && cand.team.id != null ? String(cand.team.id) : null;
              if (cid === teamId) { found = j; break; }
            }
            if (found >= 0) {
              scoreText = scoringPlays[found].text || null;
              scoreIdx = found + 1;
            } else {
              scoreText = (sp && sp.text) || null;
              scoreIdx += 1;
            }
          }
          if (scoreText) scoreParts = this._linkifyPlayerNames(scoreText, athleteMap, sportPath);
        }
        out.push({
          id: d.id || ("drive-" + out.length),
          kind: "drive",
          minuteLabel: period != null ? this._periodLabel(period, 4) : "",
          isHome: isHome,
          teamAbbr: abbr,
          result: result,
          isScore: d.isScore === true,
          scoreText: scoreText,
          scoreParts: scoreParts,
          text: desc,
          startText: d.start && d.start.text || "",
          endText: d.end && d.end.text || "",
          yards: d.yards,
          plays: d.offensivePlays,
          timeElapsed: d.timeElapsed && d.timeElapsed.displayValue || ""
        });
      }
      return out;
    }
    
    const scoringPlays = raw && Array.isArray(raw.scoringPlays) ? raw.scoringPlays : [];
    const out = [];
    for (const sp of scoringPlays) {
      if (!sp) continue;
      const period = sp.period && sp.period.number;
      const teamId = sp.team && sp.team.id != null ? String(sp.team.id) : null;
      const isHome = teamId != null && homeId != null ? teamId === homeId : null;
      const home = parseInt(sp.homeScore, 10);
      const away = parseInt(sp.awayScore, 10);
      out.push({
        id: sp.id,
        kind: this._classifyFootballScore(sp),
        minuteLabel: [ this._periodLabel(period, 4), this._clockLabel(sp.clock) ].filter(Boolean).join(" "),
        isHome: isHome,
        text: sp.text || "",
        scoreAfter: {
          home: Number.isFinite(home) ? home : null,
          away: Number.isFinite(away) ? away : null
        }
      });
    }
    return out;
  },
  PENALTY_KEYWORDS: /tripping|slashing|hooking|holding|interference|roughing|high.?stick|cross.?check|boarding|elbowing|charging|delay of game|too many men|unsportsmanlike|fighting|misconduct|penalty/i,
  _parseHockeyEvents(raw, match) {
    const plays = raw && Array.isArray(raw.plays) ? raw.plays : [];
    if (!plays.length || !match) return [];
    const urlSport = match.espnSlug || "nhl";
    const homeId = match.homeTeam && match.homeTeam.id != null ? String(match.homeTeam.id) : null;
    const out = [];
    let currentPeriod = null;
    let runningScore = {
      home: 0,
      away: 0
    };
    for (const p of plays) {
      if (!p) continue;
      const period = p.period && p.period.number;
      const teamId = p.team && p.team.id != null ? String(p.team.id) : null;
      const isHome = teamId != null && homeId != null ? teamId === homeId : null;
      const typeText = p.type && p.type.text || "";
      if (currentPeriod !== null && period != null && period !== currentPeriod) {
        out.push({
          id: "period-" + currentPeriod,
          kind: "period-end",
          periodLabel: this._periodLabel(currentPeriod, 3),
          scoreAfter: {
            ...runningScore
          }
        });
      }
      if (period != null) currentPeriod = period;
      const home = parseInt(p.homeScore, 10);
      const away = parseInt(p.awayScore, 10);
      if (Number.isFinite(home)) runningScore.home = home;
      if (Number.isFinite(away)) runningScore.away = away;
      const participants = Array.isArray(p.participants) ? p.participants : [];
      if (p.scoringPlay === true || /^goal$/i.test(typeText)) {
        out.push({
          id: p.id,
          kind: "hockey-goal",
          minuteLabel: [ this._periodLabel(period, 3), this._clockLabel(p.clock) ].filter(Boolean).join(" "),
          isHome: isHome,
          scoreAfter: {
            ...runningScore
          },
          primary: this._playerRef(participants[0], urlSport),
          secondary: this._playerRef(participants[1], urlSport)
        });
      } else if (/^period (start|end)$/i.test(typeText)) {} else if (this.PENALTY_KEYWORDS.test(typeText)) {
        out.push({
          id: p.id,
          kind: "penalty",
          minuteLabel: [ this._periodLabel(period, 3), this._clockLabel(p.clock) ].filter(Boolean).join(" "),
          isHome: isHome,
          text: typeText,
          primary: this._playerRef(participants[0], urlSport)
        });
      }
    }
    if (currentPeriod !== null && match.state === "post") {
      out.push({
        id: "period-final",
        kind: "period-end",
        periodLabel: "Final",
        scoreAfter: {
          ...runningScore
        }
      });
    }
    return out;
  },
  
  
  _extractBaseballLinescore(raw, match) {
    const comps = raw && raw.header && Array.isArray(raw.header.competitions)
      ? (raw.header.competitions[0] && raw.header.competitions[0].competitors) || []
      : [];
    if (comps.length < 2) return null;
    const homeComp = comps.find(c => c && c.homeAway === "home") || comps[0];
    const awayComp = comps.find(c => c && c.homeAway === "away") || comps[1];
    const homeLs = Array.isArray(homeComp.linescores) ? homeComp.linescores : [];
    const awayLs = Array.isArray(awayComp.linescores) ? awayComp.linescores : [];
    if (!homeLs.length && !awayLs.length) return null;
    const n = Math.max(homeLs.length, awayLs.length);
    const innings = [];
    for (let i = 0; i < n; i++) {
      innings.push({
        num: i + 1,
        home: homeLs[i] && homeLs[i].displayValue != null ? String(homeLs[i].displayValue) : "—",
        away: awayLs[i] && awayLs[i].displayValue != null ? String(awayLs[i].displayValue) : "—"
      });
    }
    const homeTeam = homeComp.team || {};
    const awayTeam = awayComp.team || {};
    return {
      id: "linescore",
      kind: "linescore",
      homeAbbr: homeTeam.abbreviation || (match.homeTeam && match.homeTeam.name) || "HOME",
      awayAbbr: awayTeam.abbreviation || (match.awayTeam && match.awayTeam.name) || "AWAY",
      innings: innings,
      totals: {
        home: {
          r: homeComp.score != null ? String(homeComp.score) : "0",
          h: homeComp.hits != null ? String(homeComp.hits) : "0",
          e: homeComp.errors != null ? String(homeComp.errors) : "0"
        },
        away: {
          r: awayComp.score != null ? String(awayComp.score) : "0",
          h: awayComp.hits != null ? String(awayComp.hits) : "0",
          e: awayComp.errors != null ? String(awayComp.errors) : "0"
        }
      }
    };
  },
  _parseBaseballEvents(raw, match) {
    if (!match) return [];
    const out = [];
    const linescore = this._extractBaseballLinescore(raw, match);
    if (linescore) out.push(linescore);
    const plays = raw && Array.isArray(raw.plays) ? raw.plays : [];
    const homeId = match.homeTeam && match.homeTeam.id != null ? String(match.homeTeam.id) : null;
    for (const p of plays) {
      if (!p || p.scoringPlay !== true) continue;
      const period = p.period && p.period.number;
      const half = p.period && p.period.type ? String(p.period.type) : "";
      const teamId = p.team && p.team.id != null ? String(p.team.id) : null;
      const isHome = teamId != null && homeId != null ? teamId === homeId : null;
      const home = parseInt(p.homeScore, 10);
      const away = parseInt(p.awayScore, 10);
      const halfLabel = /^top$/i.test(half) ? "▲" : /^bottom$/i.test(half) ? "▼" : "";
      out.push({
        id: p.id,
        kind: "run",
        minuteLabel: period != null ? halfLabel + period : "",
        isHome: isHome,
        text: p.text || "",
        scoreAfter: {
          home: Number.isFinite(home) ? home : null,
          away: Number.isFinite(away) ? away : null
        }
      });
    }
    return out;
  }
};

if (typeof window !== "undefined") {
  window.MatchEvents = MatchEvents;
} else {
  self.MatchEvents = MatchEvents;
}
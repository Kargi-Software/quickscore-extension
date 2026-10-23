const ALARM_NAME = "qs_poll_alarm";

function getRelevantNonSoccerLeagues(settings) {
  const ids = new Set;
  for (const id of settings.selectedLeagueIds || []) {
    const league = LeaguesData.getLeagueById(id);
    if (league && league.sport !== "soccer") ids.add(id);
  }
  for (const team of settings.favoriteTeams || []) {
    if (team.leagueId && team.sport !== "soccer") ids.add(team.leagueId);
  }
  for (const pinned of settings.pinnedMatches || []) {
    if (pinned.leagueId && pinned.sport !== "soccer") ids.add(pinned.leagueId);
  }
  return LeaguesData.getLeaguesByIds(Array.from(ids));
}

function hasSoccerRelevance(settings) {
  const selectedSoccer = (settings.selectedLeagueIds || []).some(id => {
    const league = LeaguesData.getLeagueById(id);
    return league && league.sport === "soccer";
  });
  const favSoccer = (settings.favoriteTeams || []).some(t => t.sport === "soccer");
  const pinnedSoccer = (settings.pinnedMatches || []).some(p => p.sport === "soccer");
  return selectedSoccer || favSoccer || pinnedSoccer;
}

function isImminentOrLive(matches, isRelevant) {
  const now = Date.now();
  return matches.some(m => {
    if (isRelevant && !isRelevant(m)) return false;
    if (m.state === "in") return true;
    if (m.state === "pre") {
      const diff = new Date(m.startTimeUTC).getTime() - now;
      return diff <= CONFIG.IMMINENT_MATCH_WINDOW_MS && diff >= -CONFIG.OVERDUE_PRE_MATCH_WINDOW_MS;
    }
    return false;
  });
}

function shouldRefetch(entry, force, isRelevant, refreshIntervalMs) {
  const interval = refreshIntervalMs || CONFIG.FORCE_REFRESH_INTERVAL_MS;
  return force || !entry || Date.now() - entry.fetchedAt > interval || isImminentOrLive(entry.data, isRelevant);
}

const _inflightFetches = new Map;

async function getCachedMatches(cacheKey, force, fetchFn, isRelevant, refreshIntervalMs) {
  const entry = await Cache.getEntry(cacheKey);
  if (!shouldRefetch(entry, force, isRelevant, refreshIntervalMs)) {
    return {
      matches: entry.data,
      hadError: false
    };
  }
  const existing = _inflightFetches.get(cacheKey);
  if (existing) return existing;
  const promise = (async () => {
    try {
      const result = await fetchFn();
      if (!result.hadError) {
        await Cache.setEntry(cacheKey, result.matches);
        return {
          matches: result.matches,
          hadError: false
        };
      }
      const fallback = await Cache.getEntry(cacheKey);
      return {
        matches: fallback ? fallback.data : [],
        hadError: true
      };
    } finally {
      if (_inflightFetches.get(cacheKey) === promise) {
        _inflightFetches.delete(cacheKey);
      }
    }
  })();
  _inflightFetches.set(cacheKey, promise);
  return promise;
}

function getLeagueMatches(cacheKey, league, dateList, force, refreshIntervalMs) {
  return getCachedMatches(cacheKey, force, () => Provider.getMatchesForLeague(league, dateList), undefined, refreshIntervalMs);
}

function getSoccerPanelMatches(cacheKey, dateStr, force, settings, refreshIntervalMs) {
  const isRelevant = m => isRelevantMatch(m, settings);
  return getCachedMatches(cacheKey, force, () => Provider.getSoccerMatchesForDate(dateStr), isRelevant, refreshIntervalMs);
}

function mergeMatches(...matchArrays) {
  const byId = new Map;
  for (const arr of matchArrays) {
    for (const m of arr) {
      const existing = byId.get(m.id);
      if (!existing || !existing.leagueId && m.leagueId) {
        byId.set(m.id, m);
      }
    }
  }
  return Array.from(byId.values());
}

async function fetchAllMatches(settings, force = false) {
  const timezone = TimeUtil.getSystemTimezone();
  const leagues = getRelevantNonSoccerLeagues(settings);
  // All sports (soccer + US): ESPN dates= ≈ America/New_York calendar day.
  // Union Eastern days covering each local offset in the poll window
  // (Today uses 22:00–04:00 edges only when those settings are on).
  const espnDateOffsets = new Map;
  for (let offset = -CONFIG.DATE_RANGE_PAST_LOCAL_DAYS; offset <= CONFIG.DATE_RANGE_FUTURE_LOCAL_DAYS; offset++) {
    for (const dateStr of TimeUtil.getEspnScoreboardDatesForOffsetDay(offset, timezone, settings)) {
      if (!espnDateOffsets.has(dateStr)) espnDateOffsets.set(dateStr, new Set);
      espnDateOffsets.get(dateStr).add(offset);
    }
  }
  const fetches = [];
  for (const league of leagues) {
    for (const [dateStr, offsets] of espnDateOffsets) {
      const isPastOnly = [ ...offsets ].every(o => o < 0);
      const refreshIntervalMs = isPastOnly ? CONFIG.PAST_BUCKET_REFRESH_INTERVAL_MS : undefined;
      fetches.push(getLeagueMatches(`poll_${league.id}_${dateStr}`, league, [ dateStr ], force, refreshIntervalMs));
    }
  }
  if (hasSoccerRelevance(settings)) {
    for (const [dateStr, offsets] of espnDateOffsets) {
      const isPastOnly = [ ...offsets ].every(o => o < 0);
      const refreshIntervalMs = isPastOnly ? CONFIG.PAST_BUCKET_REFRESH_INTERVAL_MS : undefined;
      fetches.push(getSoccerPanelMatches(`poll_soccer_${dateStr}`, dateStr, force, settings, refreshIntervalMs));
    }
  }
  const results = await Promise.all(fetches);
  const allMatches = [];
  let hadError = false;
  for (const {matches: matches, hadError: entryHadError} of results) {
    if (entryHadError) hadError = true;
    allMatches.push(...matches);
  }
  return {
    matches: mergeMatches(allMatches),
    hadError: hadError
  };
}

function filterMatchesForDay(matches, offsetDays, timezone, settings) {
  const targetDayStr = TimeUtil.getLocalDateStrForOffset(offsetDays, timezone);
  const prevDayStr = TimeUtil.getLocalDateStrForOffset(offsetDays - 1, timezone);
  const nextDayStr = TimeUtil.getLocalDateStrForOffset(offsetDays + 1, timezone);
  const LATE_NIGHT_HOUR = TimeUtil.LATE_NIGHT_HOUR;
  const EARLY_MORNING_HOUR = TimeUtil.EARLY_MORNING_HOUR;
  const showYesterday = !settings || settings.showLateNightYesterday !== false;
  const showTomorrow = !settings || settings.showEarlyMorningTomorrow !== false;
  return matches.filter(m => {
    const matchDayStr = TimeUtil.getLocalDateStrForMatch(m, timezone);
    if (matchDayStr === targetDayStr) return true;
    if (offsetDays === 0 && matchDayStr === prevDayStr) {
      if (m.state === "in") return true;
      if (!showYesterday) return false;
      return m.state === "post" && TimeUtil.getLocalHourForMatch(m, timezone) >= LATE_NIGHT_HOUR;
    }
    if (offsetDays === 0 && matchDayStr === nextDayStr) {
      if (m.state === "in") return true;
      if (!showTomorrow) return false;
      return TimeUtil.getLocalHourForMatch(m, timezone) < EARLY_MORNING_HOUR;
    }
    return false;
  });
}

async function fetchMatchesForDay(settings, offsetDays, force) {
  const timezone = TimeUtil.getSystemTimezone();
  // Minimal ESPN Eastern dates covering this UI day only:
  //   offset 0 → Today window (24h, or 22:00→04:00 if those toggles are on)
  //   else     → that local calendar day 00:00–24:00
  // Result length is 1–3 depending on user TZ vs America/New_York — never a fixed 2/4.
  const candidateDates = TimeUtil.getEspnScoreboardDatesForOffsetDay(offsetDays, timezone, settings);
  const nonSoccerLeagues = getRelevantNonSoccerLeagues(settings);
  const dateKey = candidateDates.join("_") || "none";
  const fetches = nonSoccerLeagues.map(league =>
    getLeagueMatches(`day_${league.id}_${offsetDays}_${dateKey}`, league, candidateDates, force)
  );
  if (hasSoccerRelevance(settings)) {
    for (const dateStr of candidateDates) {
      fetches.push(getSoccerPanelMatches(`day_soccer_${dateStr}`, dateStr, force, settings));
    }
  }
  const results = await Promise.all(fetches);
  const allMatches = [];
  let hadError = false;
  for (const {matches: matches, hadError: entryHadError} of results) {
    if (entryHadError) hadError = true;
    allMatches.push(...matches);
  }
  const merged = mergeMatches(allMatches);
  const filtered = filterMatchesForDay(merged, offsetDays, timezone, settings);
  return {
    matches: filtered,
    hadError: hadError
  };
}

async function getSettingsWithExtras() {
  const settings = await Storage.getSettings();
  settings.pinnedMatches = await Storage.getPinnedMatches();
  settings.mutedMatches = await Storage.getMutedMatches();
  return settings;
}

function isRelevantMatch(match, settings) {
  const selectedLeagueIds = new Set(settings.selectedLeagueIds || []);
  return selectedLeagueIds.has(match.leagueId) || Utils.isFavoriteMatch(match, settings.favoriteTeams) || Utils.isPinnedMatch(match, settings.pinnedMatches);
}

function filterForNotifications(matches, settings) {
  return matches.filter(m => isRelevantMatch(m, settings));
}

let pollTickInFlight = false;

async function pollTick(reason = "alarm") {
  if (pollTickInFlight) {
    return;
  }
  pollTickInFlight = true;
  try {
    const settings = await getSettingsWithExtras();
    const {matches: matches} = await fetchAllMatches(settings);
    const notifyMatches = filterForNotifications(matches, settings);
    await Notifications.processUpdates(notifyMatches, settings);
    const timezone = TimeUtil.getSystemTimezone();
    const todayMatches = filterMatchesForDay(matches, 0, timezone, settings);
    await Storage.set(CONFIG.STORAGE_KEYS.MATCH_SNAPSHOT, {
      offsetDays: 0,
      matches: todayMatches,
      fetchedAt: Date.now()
    });
  } catch (e) {} finally {
    pollTickInFlight = false;
  }
}

async function syncAlarm(settings) {
  const intervalMin = Math.max(.5, (settings.notifyIntervalSec || CONFIG.DEFAULT_POLL_INTERVAL_SEC) / 60);
  const existing = await browser.alarms.get(ALARM_NAME);
  if (!existing || Math.abs(existing.periodInMinutes - intervalMin) > .01) {
    browser.alarms.create(ALARM_NAME, {
      periodInMinutes: intervalMin
    });
  }
}

browser.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === ALARM_NAME) {
    pollTick("alarm");
  }
});

if (browser.windows && browser.windows.onFocusChanged) {
  browser.windows.onFocusChanged.addListener(windowId => {
    if (windowId !== browser.windows.WINDOW_ID_NONE) {
      pollTick("window-focus");
    }
  });
}

async function bootstrap() {
  const settings = await Storage.getSettings();
  await syncAlarm(settings);
  const unread = await Storage.get(CONFIG.STORAGE_KEYS.UNREAD_BADGE_COUNT, 0);
  await Notifications.setBadge(unread);
  await pollTick("bootstrap");
}

browser.runtime.onInstalled.addListener(() => {
  bootstrap();
});

browser.runtime.onStartup.addListener(() => {
  bootstrap();
});

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === "GET_MATCHES_FOR_DAY") {
    (async () => {
      const settings = await getSettingsWithExtras();
      const offsetDays = message.offsetDays || 0;
      const force = !!message.force;
      const {matches: matches, hadError: hadError} = await fetchMatchesForDay(settings, offsetDays, force);
      sendResponse({
        matches: matches,
        settings: settings,
        hadError: hadError
      });
    })();
    return true;
  }
  if (message && message.type === "GET_MATCH_SUMMARY") {
    (async () => {
      try {
        const {sport: sport, espnSlug: espnSlug, eventId: eventId} = message;
        if (!sport || !espnSlug || !eventId) {
          sendResponse({
            raw: null,
            hadError: true
          });
          return;
        }
        const raw = await Api.fetchMatchSummary(sport, espnSlug, eventId);
        
        
        if (raw && sport === "soccer" && CONFIG.hasXGChance) {
          try {
            const comps = raw.header && Array.isArray(raw.header.competitions)
              ? (raw.header.competitions[0] && raw.header.competitions[0].competitors) || []
              : [];
            const homeComp = comps.find(c => c && c.homeAway === "home");
            const awayComp = comps.find(c => c && c.homeAway === "away");
            const homeId = homeComp && homeComp.team && homeComp.team.id != null ? homeComp.team.id : null;
            const awayId = awayComp && awayComp.team && awayComp.team.id != null ? awayComp.team.id : null;
            if (homeId != null && awayId != null) {
              const [homeStats, awayStats] = await Promise.all([
                Api.fetchCompetitorStatistics(sport, espnSlug, eventId, homeId).catch(() => null),
                Api.fetchCompetitorStatistics(sport, espnSlug, eventId, awayId).catch(() => null)
              ]);
              
              
              raw.__xgChance = { home: homeStats, away: awayStats };
            }
          } catch (e) {
            
          }
        }
        sendResponse({
          raw: raw || null,
          hadError: false
        });
      } catch (e) {
        sendResponse({
          raw: null,
          hadError: true
        });
      }
    })();
    return true;
  }
  if (message && message.type === "POPUP_OPENED") {
    Notifications.clearBadge();
    Notifications.clearRecentlyUpdated();
    sendResponse({
      ok: true
    });
    return false;
  }
  if (message && message.type === "SETTINGS_UPDATED") {
    (async () => {
      await Cache.clearMemory();
      const settings = await Storage.getSettings();
      await syncAlarm(settings);
      await pollTick("settings-updated");
      sendResponse({
        ok: true
      });
    })();
    return true;
  }
  return false;
});

bootstrap();
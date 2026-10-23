const Notifications = {
  _notificationLinks: new Map,
  _matchNotifs: new Map,
  _EVENT_TYPES: [ "start", "end", "off", "score" ],
  _SESSION_KEY: "qsNotifState",
  _LINK_TTL_MS: 10 * 60 * 1e3,
  _MAX_TRACKED_LINKS: 60,
  _PRUNE_AFTER_MS: 3 * 24 * 60 * 60 * 1e3,
  _processing: false,
  _badgeQueue: Promise.resolve(),
  _badgeEpoch: 0,
  _sessionQueue: Promise.resolve(),
  _PHASE_MAP: {
    pre: "pre",
    in: "live",
    live: "live",
    post: "post",
    off: "off",
    postponed: "off",
    canceled: "off",
    cancelled: "off",
    suspended: "off"
  },
  _OFF_LABEL: {
    postponed: "Postponed",
    canceled: "Canceled",
    cancelled: "Canceled",
    suspended: "Suspended"
  },
  _phaseOf(state) {
    if (!state) return null;
    return this._PHASE_MAP[String(state).toLowerCase()] || null;
  },
  _SCORE_EVENT_LABEL: {
    soccer: "Goal",
    hockey: "Goal",
    basketball: "Score",
    baseball: "Run",
    football: "Score"
  },
  _scoreLabel(sport) {
    return this._SCORE_EVENT_LABEL[sport] || "Score";
  },
  get _action() {
    if (typeof browser === "undefined") return null;
    return browser.action || null;
  },
  _num(v) {
    if (v === null || v === undefined || v === "") return null;
    const n = typeof v === "number" ? v : Number.parseInt(String(v).trim(), 10);
    return Number.isFinite(n) ? n : null;
  },
  _teamName(team, fb) {
    return team && team.name || fb;
  },
  _popupAllowed(settings) {
    return settings.notifyDisplayMode === CONFIG.NOTIFY_DISPLAY_MODES.SYSTEM_POPUP;
  },
  _scopeEligible(match, settings) {
    try {
      return Utils.isNotifyScopeMatch(match, settings) === true;
    } catch (e) {
      return false;
    }
  },
  async processUpdates(currentMatches, settings) {
    if (this._processing) {
      return 0;
    }
    this._processing = true;
    try {
      return await this._inner(currentMatches || [], settings || {});
    } catch (e) {
      return 0;
    } finally {
      this._processing = false;
    }
  },
  async _inner(currentMatches, settings) {
    const [prevScores, prevStates, lastProcessedAt] = await Promise.all([ Storage.get(CONFIG.STORAGE_KEYS.LAST_KNOWN_SCORES, {}), Storage.get(CONFIG.STORAGE_KEYS.LAST_MATCH_STATES, {}), Storage.get(CONFIG.STORAGE_KEYS.LAST_NOTIF_PROCESSED_AT, 0) ]);
    const newScores = {
      ...prevScores || {}
    };
    const newStates = {
      ...prevStates || {}
    };
    const now = Date.now();
    let updatedCount = 0;
    const staleGap = lastProcessedAt ? now - lastProcessedAt : Infinity;
    const isBootstrap = Object.keys(newStates).length === 0 || staleGap > CONFIG.NOTIFY_STALE_GAP_MS;
    const events = settings.notifyEvents || {};
    const mutedMatches = Array.isArray(settings.mutedMatches) ? settings.mutedMatches : [];
    const mutedSet = new Set(mutedMatches);
    const popupAllowed = this._popupAllowed(settings);
    const pending = [];
    const updatedIds = [];
    for (const match of currentMatches) {
      try {
        if (!match) continue;
        const id = match.id;
        if (id === undefined || id === null || id === "") continue;
        const prevScore = prevScores ? prevScores[id] : undefined;
        const prevEntry = prevStates ? prevStates[id] : null;
        const prevPhase = prevEntry && typeof prevEntry === "object" ? this._phaseOf(prevEntry.state) : null;
        const phase = this._phaseOf(match.state);
        const token = String(match.state || "").toLowerCase();
        if (!phase) {
          continue;
        }
        const home = this._teamName(match.homeTeam, "Home");
        const away = this._teamName(match.awayTeam, "Away");
        const title = `${home} vs ${away}`;
        const curHome = this._num(match.homeScore);
        const curAway = this._num(match.awayScore);
        const scoresValid = curHome !== null && curAway !== null;
        const scoreText = scoresValid ? `${curHome} - ${curAway}` : null;
        newStates[id] = {
          state: phase,
          updatedAt: now
        };
        newScores[id] = scoresValid ? {
          home: curHome,
          away: curAway,
          updatedAt: now
        } : prevScore && typeof prevScore === "object" ? {
          home: prevScore.home,
          away: prevScore.away,
          updatedAt: now
        } : {
          home: null,
          away: null,
          updatedAt: now
        };
        const isMuted = mutedSet.has(id);
        const scopeEligible = this._scopeEligible(match, settings) && !isMuted;
        const showPopup = scopeEligible && popupAllowed;
        let eventHappened = false;
        if (prevPhase === "pre" && phase === "live") {
          if (scopeEligible && !isBootstrap) eventHappened = true;
          if (showPopup && events.start && !isBootstrap) {
            await this._notify(title, "Match started", match.link, null, id, "start");
          }
        } else if (!prevPhase && phase === "live") {
          if (scopeEligible && !isBootstrap) eventHappened = true;
        }
        if (prevPhase && prevPhase !== "post" && phase === "post") {
          if (scopeEligible && !isBootstrap) eventHappened = true;
          if (showPopup && events.end && !isBootstrap) {
            await this._notify(title, scoreText ? `Match ended: ${scoreText}` : "Match ended", match.link, null, id, "end");
          }
        }
        if (prevPhase && prevPhase !== "off" && phase === "off") {
          if (scopeEligible && !isBootstrap) eventHappened = true;
          const label = this._OFF_LABEL[token] || "Suspended";
          if (showPopup && events.end && !isBootstrap) {
            await this._notify(title, `Match ${label.toLowerCase()}`, match.link, null, id, "off");
          }
        }
        const scorePopupSupported = match.sport !== "basketball" && match.sport !== "football";
        const prevHome = prevScore ? this._num(prevScore.home) : null;
        const prevAway = prevScore ? this._num(prevScore.away) : null;
        const canCompare = scoresValid && prevHome !== null && prevAway !== null;
        if (canCompare && phase === "live") {
          const homeChanged = curHome !== prevHome;
          const awayChanged = curAway !== prevAway;
          if (homeChanged || awayChanged) {
            if (scopeEligible && !isBootstrap) eventHappened = true;
            if (showPopup && events.goal && scorePopupSupported && !isBootstrap) {
              const label = this._scoreLabel(match.sport);
              if (curHome + curAway > prevHome + prevAway) {
                const logo = homeChanged && !awayChanged ? match.homeTeam && match.homeTeam.logo : awayChanged && !homeChanged ? match.awayTeam && match.awayTeam.logo : null;
                pending.push(this._resolveIcon(logo).then(icon => this._notify(title, `${label}! Now ${scoreText}`, match.link, icon, id, "score")));
              } else {
                await this._notify(title, `${label} corrected — now ${scoreText}`, match.link, null, id, "score");
              }
            }
          }
        }
        if (eventHappened) {
          updatedCount++;
          updatedIds.push(id);
        }
      } catch (e) {}
    }
    const allIds = new Set([ ...Object.keys(newStates), ...Object.keys(newScores) ]);
    for (const id of allIds) {
      const s = newStates[id], sc = newScores[id];
      const t = Math.max(s && typeof s === "object" && s.updatedAt || 0, sc && typeof sc === "object" && sc.updatedAt || 0);
      if (!t || now - t > this._PRUNE_AFTER_MS) {
        delete newStates[id];
        delete newScores[id];
      }
    }
    if (currentMatches.length > 0) {
      await Promise.all([ Storage.set(CONFIG.STORAGE_KEYS.LAST_KNOWN_SCORES, newScores), Storage.set(CONFIG.STORAGE_KEYS.LAST_MATCH_STATES, newStates) ]);
    }
    await Storage.set(CONFIG.STORAGE_KEYS.LAST_NOTIF_PROCESSED_AT, now);
    if (pending.length) await Promise.allSettled(pending);
    if (updatedCount > 0) {
      await this.bumpBadge(updatedCount);
      await this.bumpRecentlyUpdated(updatedIds);
    }
    return updatedCount;
  },
  _recentQueue: Promise.resolve(),
  _recentEpoch: 0,
  _enqueueRecent(fn) {
    const next = this._recentQueue.then(fn, fn);
    this._recentQueue = next.catch(() => {});
    return next;
  },
  async bumpRecentlyUpdated(ids) {
    if (!Array.isArray(ids) || ids.length === 0) return;
    return this._enqueueRecent(async () => {
      const epoch = this._recentEpoch;
      const prev = await Storage.get(CONFIG.STORAGE_KEYS.RECENTLY_UPDATED_MATCHES, {});
      if (epoch !== this._recentEpoch) return;
      const merged = {
        ...prev || {}
      };
      const now = Date.now();
      for (const id of ids) merged[id] = now;
      await Storage.set(CONFIG.STORAGE_KEYS.RECENTLY_UPDATED_MATCHES, merged);
    });
  },
  async clearRecentlyUpdated() {
    return this._enqueueRecent(async () => {
      this._recentEpoch++;
      try {
        await Storage.set(CONFIG.STORAGE_KEYS.RECENTLY_UPDATED_MATCHES, {});
      } catch (e) {}
    });
  },
  _enqueueBadge(fn) {
    const next = this._badgeQueue.then(fn, fn);
    this._badgeQueue = next.catch(() => {});
    return next;
  },
  async bumpBadge(delta) {
    if (!Number.isFinite(delta) || delta <= 0) return;
    return this._enqueueBadge(async () => {
      const epoch = this._badgeEpoch;
      const prev = await Storage.get(CONFIG.STORAGE_KEYS.UNREAD_BADGE_COUNT, 0);
      if (epoch !== this._badgeEpoch) return;
      const total = (Number.isFinite(prev) ? prev : 0) + delta;
      await Storage.set(CONFIG.STORAGE_KEYS.UNREAD_BADGE_COUNT, total);
      await this.setBadge(total);
    });
  },
  async setBadge(count) {
    const action = this._action;
    if (!action) return;
    try {
      if (!count || count <= 0) {
        await action.setBadgeText({
          text: ""
        });
        return;
      }
      await action.setBadgeBackgroundColor({
        color: "#e53935"
      });
      if (action.setBadgeTextColor) await action.setBadgeTextColor({
        color: "#ffffff"
      });
      await action.setBadgeText({
        text: count > 99 ? "99+" : String(count)
      });
    } catch (e) {}
  },
  async clearBadge() {
    return this._enqueueBadge(async () => {
      this._badgeEpoch++;
      try {
        await Storage.set(CONFIG.STORAGE_KEYS.UNREAD_BADGE_COUNT, 0);
        const action = this._action;
        if (action) await action.setBadgeText({
          text: ""
        });
      } catch (e) {}
    });
  },
  async _resolveIcon(logoUrl) {
    const def = browser.runtime.getURL("icons/icon-96.png");
    if (!logoUrl) return def;
    try {
      const resolved = await Promise.race([ Cache.getOrFetchLogo(logoUrl), new Promise(r => setTimeout(() => r(null), 2500)) ]);
      return resolved || def;
    } catch (e) {
      return def;
    }
  },
  _sessionAvailable() {
    return typeof browser !== "undefined" && browser.storage && !!browser.storage.session;
  },
  _mutateSession(fn) {
    if (!this._sessionAvailable()) return Promise.resolve();
    const next = this._sessionQueue.then(async () => {
      const bag = (await browser.storage.session.get(this._SESSION_KEY))[this._SESSION_KEY] || {};
      const links = bag.links || {};
      const matchNotifs = bag.matchNotifs || {};
      const cutoff = Date.now() - this._LINK_TTL_MS;
      for (const k of Object.keys(links)) if ((links[k].at || 0) < cutoff) delete links[k];
      const out = fn({
        links: links,
        matchNotifs: matchNotifs
      }) || {
        links: links,
        matchNotifs: matchNotifs
      };
      await browser.storage.session.set({
        [this._SESSION_KEY]: out
      });
    }).catch(() => {});
    this._sessionQueue = next;
    return next;
  },
  async _readSession() {
    if (!this._sessionAvailable()) return {
      links: {},
      matchNotifs: {}
    };
    try {
      const bag = (await browser.storage.session.get(this._SESSION_KEY))[this._SESSION_KEY] || {};
      return {
        links: bag.links || {},
        matchNotifs: bag.matchNotifs || {}
      };
    } catch (e) {
      return {
        links: {},
        matchNotifs: {}
      };
    }
  },
  async _rememberLink(notifId, link) {
    this._notificationLinks.set(notifId, {
      link: link,
      at: Date.now()
    });
    if (this._notificationLinks.size > this._MAX_TRACKED_LINKS) {
      const oldest = [ ...this._notificationLinks.entries() ].sort((a, b) => a[1].at - b[1].at)[0];
      if (oldest) this._notificationLinks.delete(oldest[0]);
    }
    await this._mutateSession(({links: links, matchNotifs: matchNotifs}) => {
      links[notifId] = {
        link: link,
        at: Date.now()
      };
      return {
        links: links,
        matchNotifs: matchNotifs
      };
    });
  },
  async _takeLink(notifId) {
    const local = this._notificationLinks.get(notifId);
    this._notificationLinks.delete(notifId);
    let link = local && local.link;
    if (!link) {
      const {links: links} = await this._readSession();
      if (links[notifId]) link = links[notifId].link;
    }
    for (const [matchId, bucket] of this._matchNotifs.entries()) {
      for (const type of this._EVENT_TYPES) {
        if (bucket[type] === notifId) delete bucket[type];
      }
      if (Object.keys(bucket).length === 0) this._matchNotifs.delete(matchId);
    }
    await this._mutateSession(({links: links, matchNotifs: matchNotifs}) => {
      delete links[notifId];
      for (const matchId of Object.keys(matchNotifs)) {
        const bucket = matchNotifs[matchId];
        for (const type of this._EVENT_TYPES) {
          if (bucket[type] === notifId) delete bucket[type];
        }
        if (Object.keys(bucket).length === 0) delete matchNotifs[matchId];
      }
      return {
        links: links,
        matchNotifs: matchNotifs
      };
    });
    return link;
  },
  async _clearForMatch(matchId, eventType) {
    if (matchId === undefined || matchId === null || matchId === "") return;
    let bucket = this._matchNotifs.get(matchId);
    if (!bucket) {
      const {matchNotifs: matchNotifs} = await this._readSession();
      bucket = matchNotifs[matchId] || null;
    }
    if (!bucket) return;
    const typesToClear = this._EVENT_TYPES.filter(type => {
      if (!bucket[type]) return false;
      return true;
    });
    if (typesToClear.length === 0) return;
    for (const type of typesToClear) {
      const notifId = bucket[type];
      this._notificationLinks.delete(notifId);
      try {
        await browser.notifications.clear(notifId);
      } catch (e) {}
    }
    const remaining = {
      ...bucket
    };
    for (const type of typesToClear) delete remaining[type];
    if (Object.keys(remaining).length === 0) this._matchNotifs.delete(matchId); else this._matchNotifs.set(matchId, remaining);
    await this._mutateSession(({links: links, matchNotifs: matchNotifs}) => {
      if (matchNotifs[matchId]) {
        const b = {
          ...matchNotifs[matchId]
        };
        for (const type of typesToClear) delete b[type];
        if (Object.keys(b).length === 0) delete matchNotifs[matchId]; else matchNotifs[matchId] = b;
      }
      return {
        links: links,
        matchNotifs: matchNotifs
      };
    });
  },
  async _trackMatchNotif(matchId, eventType, notifId) {
    const bucket = {
      ...this._matchNotifs.get(matchId) || {}
    };
    bucket[eventType] = notifId;
    this._matchNotifs.set(matchId, bucket);
    if (this._matchNotifs.size > this._MAX_TRACKED_LINKS) {
      const oldestKey = this._matchNotifs.keys().next().value;
      if (oldestKey !== undefined && oldestKey !== matchId) this._matchNotifs.delete(oldestKey);
    }
    await this._mutateSession(({links: links, matchNotifs: matchNotifs}) => {
      matchNotifs[matchId] = bucket;
      return {
        links: links,
        matchNotifs: matchNotifs
      };
    });
  },
  async _notify(title, message, link, iconUrl, matchId, eventType) {
    try {
      if (typeof browser === "undefined" || !browser.notifications || !browser.notifications.create) return;
      await this._clearForMatch(matchId, eventType);
      const notifId = `lsp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const base = {
        type: "basic",
        title: title || "QuickScore",
        message: message || ""
      };
      try {
        await browser.notifications.create(notifId, {
          ...base,
          iconUrl: iconUrl || browser.runtime.getURL("icons/icon-96.png")
        });
      } catch (e) {
        if (!iconUrl) throw e;
        await browser.notifications.create(notifId, {
          ...base,
          iconUrl: browser.runtime.getURL("icons/icon-96.png")
        });
      }
      if (link) await this._rememberLink(notifId, link);
      if (matchId !== undefined && matchId !== null && matchId !== "") {
        await this._trackMatchNotif(matchId, eventType, notifId);
      }
    } catch (e) {}
  }
};

if (typeof window !== "undefined") window.Notifications = Notifications; else self.Notifications = Notifications;

if (typeof browser !== "undefined" && browser.notifications) {
  if (browser.notifications.onClicked) {
    browser.notifications.onClicked.addListener(async notifId => {
      const link = await Notifications._takeLink(notifId);
      if (link) {
        try {
          await browser.tabs.create({
            url: link
          });
        } catch (e) {}
      }
      try {
        await browser.notifications.clear(notifId);
      } catch (e) {}
    });
  }
  if (browser.notifications.onClosed) {
    browser.notifications.onClosed.addListener(notifId => {
      Notifications._takeLink(notifId);
    });
  }
}
const CONFIG = {
  DEFAULT_POLL_INTERVAL_SEC: 60,
  DATE_RANGE_PAST_LOCAL_DAYS: 1,
  DATE_RANGE_FUTURE_LOCAL_DAYS: 1,
  REFRESH_MODES: {
    DISABLED: "disabled",
    MANUAL: "manual",
    AUTO: "auto"
  },
  NOTIFY_SCOPE_DEFAULT: {
    allLive: false,
    favorites: true,
    pinned: true
  },
  NOTIFY_DISPLAY_MODES: {
    SYSTEM_POPUP: "system_popup",
    BADGE_ONLY: "badge_only"
  },
  ALL_SPORTS: "all",
  DEFAULT_SELECTED_LEAGUE_IDS: [ "champions-league", "premier-league", "laliga", "serie-a", "ligue-1", "bundesliga" ],
  DEFAULT_FAVORITE_TEAMS: [],
  LOGO_CACHE_TTL_MS: 7 * 24 * 60 * 60 * 1e3,
  IMMINENT_MATCH_WINDOW_MS: 10 * 60 * 1e3,
  OVERDUE_PRE_MATCH_WINDOW_MS: 3 * 60 * 60 * 1e3,
  FORCE_REFRESH_INTERVAL_MS: 60 * 60 * 1e3,
  PAST_BUCKET_REFRESH_INTERVAL_MS: 4 * 60 * 60 * 1e3,
  NOTIFY_STALE_GAP_MS: 24 * 60 * 60 * 1e3,
  
  
  
  hasXGChance: true,
  STORAGE_KEYS: {
    SETTINGS: "qs_settings",
    LOGO_CACHE: "qs_logo_cache",
    LAST_KNOWN_SCORES: "qs_last_scores",
    LAST_MATCH_STATES: "qs_last_match_states",
    UI_STATE: "qs_ui_state",
    MATCH_SNAPSHOT: "qs_match_snapshot",
    PINNED_MATCHES: "qs_pinned_matches",
    MUTED_MATCHES: "qs_muted_matches",
    UNREAD_BADGE_COUNT: "qs_unread_badge_count",
    RECENTLY_UPDATED_MATCHES: "qs_recently_updated_matches",
    LAST_NOTIF_PROCESSED_AT: "qs_last_notif_processed_at"
  }
};

const DEFAULT_SETTINGS = {
  refreshMode: CONFIG.REFRESH_MODES.AUTO,
  refreshIntervalSec: CONFIG.DEFAULT_POLL_INTERVAL_SEC,
  notifyScope: {
    ...CONFIG.NOTIFY_SCOPE_DEFAULT
  },
  notifyIntervalSec: CONFIG.DEFAULT_POLL_INTERVAL_SEC,
  notifyDisplayMode: CONFIG.NOTIFY_DISPLAY_MODES.BADGE_ONLY,
  notifyEvents: {
    start: true,
    end: true,
    goal: true
  },
  selectedLeagueIds: CONFIG.DEFAULT_SELECTED_LEAGUE_IDS,
  favoriteTeams: CONFIG.DEFAULT_FAVORITE_TEAMS,
  selectedSportFilter: CONFIG.ALL_SPORTS,
  showLateNightYesterday: false,
  showEarlyMorningTomorrow: false
};

if (typeof window !== "undefined") {
  window.CONFIG = CONFIG;
  window.DEFAULT_SETTINGS = DEFAULT_SETTINGS;
} else {
  self.CONFIG = CONFIG;
  self.DEFAULT_SETTINGS = DEFAULT_SETTINGS;
}
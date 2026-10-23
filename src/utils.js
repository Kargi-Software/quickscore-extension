const Utils = {
  groupBy(array, keyFn) {
    const map = new Map;
    for (const item of array) {
      const key = keyFn(item);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    }
    return map;
  },
  slugify(text) {
    return String(text || "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  },
  teamKey(sport, name) {
    return `${sport}:${this.slugify(name)}`;
  },
  isFavoriteMatch(match, favoriteTeams) {
    if (!favoriteTeams?.length) return false;
    return favoriteTeams.some(fav => {
      if (fav.sport !== match.sport) return false;
      const espnId = fav.providerIds?.espn;
      if (espnId) {
        return String(match.homeTeam?.id) === espnId || String(match.awayTeam?.id) === espnId;
      }
      const slug = n => n?.toLowerCase().replace(/\s+/g, "-");
      return slug(match.homeTeam?.name) === slug(fav.name) || slug(match.awayTeam?.name) === slug(fav.name);
    });
  },
  isPinnedMatch(match, pinnedMatches) {
    if (!pinnedMatches || pinnedMatches.length === 0) return false;
    return pinnedMatches.some(p => p.id === match.id);
  },
  isNotifyScopeMatch(match, settings) {
    const scope = settings.notifyScope || {};
    if (scope.allLive) return true;
    if (scope.favorites && Utils.isFavoriteMatch(match, settings.favoriteTeams)) return true;
    if (scope.pinned && Utils.isPinnedMatch(match, settings.pinnedMatches)) return true;
    return false;
  },
  debounce(fn, waitMs) {
    let timer = null;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), waitMs);
    };
  }
};

if (typeof window !== "undefined") {
  window.Utils = Utils;
} else {
  self.Utils = Utils;
}
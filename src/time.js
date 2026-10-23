const TimeUtil = {
  // ESPN US-sport scoreboard `dates=YYYYMMDD` is the America/New_York calendar day.
  ESPN_SCOREBOARD_TZ: "America/New_York",
  // Must match filterMatchesForDay in background.js (Today edges only).
  LATE_NIGHT_HOUR: 22,
  EARLY_MORNING_HOUR: 4,

  _tzOffsetMinutesAt(date, timezone) {
    try {
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone || "UTC",
        hourCycle: "h23",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      });
      const parts = formatter.formatToParts(date).reduce((acc, p) => {
        if (p.type !== "literal") acc[p.type] = p.value;
        return acc;
      }, {});
      const asIfUTC = Date.UTC(
        Number(parts.year),
        Number(parts.month) - 1,
        Number(parts.day),
        Number(parts.hour),
        Number(parts.minute),
        Number(parts.second)
      );
      return (asIfUTC - date.getTime()) / 6e4;
    } catch (e) {
      return 0;
    }
  },

  _partsInZone(ms, timeZone) {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timeZone || "UTC",
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
    const parts = formatter.formatToParts(new Date(ms)).reduce((acc, p) => {
      if (p.type !== "literal") acc[p.type] = p.value;
      return acc;
    }, {});
    return {
      year: Number(parts.year),
      month: Number(parts.month),
      day: Number(parts.day),
      hour: Number(parts.hour),
      minute: Number(parts.minute),
      second: Number(parts.second)
    };
  },

  _zonedTimeToUtcMs(year, month, day, hour, minute, second, timeZone) {
    const approx = Date.UTC(year, month - 1, day, hour || 0, minute || 0, second || 0);
    const offsetMinutes = this._tzOffsetMinutesAt(new Date(approx), timeZone);
    return approx - offsetMinutes * 6e4;
  },

  _yyyyMmDdFromParts(p) {
    return (
      String(p.year) +
      String(p.month).padStart(2, "0") +
      String(p.day).padStart(2, "0")
    );
  },

  _nextCivilDate(year, month, day) {
    const t = new Date(Date.UTC(year, month - 1, day + 1));
    return {
      year: t.getUTCFullYear(),
      month: t.getUTCMonth() + 1,
      day: t.getUTCDate()
    };
  },

  // [startMs, endMs) of the user's local calendar day for offsetDays (0=today).
  getLocalDayBoundsMs(offsetDays, timezone) {
    const tz = timezone || "UTC";
    const target = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1e3);
    const localStr = this._localDayFormatter(tz).format(target);
    const [y, m, d] = localStr.split("-").map(Number);
    const startMs = this._zonedTimeToUtcMs(y, m, d, 0, 0, 0, tz);
    const next = this._nextCivilDate(y, m, d);
    const endMs = this._zonedTimeToUtcMs(next.year, next.month, next.day, 0, 0, 0, tz);
    return { startMs, endMs };
  },


  getTodayViewBoundsMs(timezone, settings) {
    const tz = timezone || "UTC";
    const showYesterday = !settings || settings.showLateNightYesterday !== false;
    const showTomorrow = !settings || settings.showEarlyMorningTomorrow !== false;
    const today = this.getLocalDayBoundsMs(0, tz);
    let startMs = today.startMs;
    let endMs = today.endMs;
    if (showYesterday) {
      const y = this._partsInZone(today.startMs - 1, tz);
      startMs = this._zonedTimeToUtcMs(
        y.year, y.month, y.day,
        this.LATE_NIGHT_HOUR, 0, 0, tz
      );
    }
    if (showTomorrow) {
      const t = this._partsInZone(today.endMs, tz);
      endMs = this._zonedTimeToUtcMs(
        t.year, t.month, t.day,
        this.EARLY_MORNING_HOUR, 0, 0, tz
      );
    }
    return { startMs, endMs };
  },

  getEspnScoreboardDatesForInstantRange(startMs, endMs) {
    if (!(endMs > startMs)) return [];
    const et = this.ESPN_SCOREBOARD_TZ;
    const startParts = this._partsInZone(startMs, et);
    let cur = this._zonedTimeToUtcMs(
      startParts.year, startParts.month, startParts.day, 0, 0, 0, et
    );
    const dates = [];
    let guard = 0;
    while (cur < endMs && guard++ < 14) {
      const p = this._partsInZone(cur, et);
      const nextCivil = this._nextCivilDate(p.year, p.month, p.day);
      const next = this._zonedTimeToUtcMs(
        nextCivil.year, nextCivil.month, nextCivil.day, 0, 0, 0, et
      );
      if (next > startMs && cur < endMs) {
        dates.push(this._yyyyMmDdFromParts(p));
      }
      cur = next;
    }
    return dates;
  },


  getEspnScoreboardDatesForOffsetDay(offsetDays, timezone, settings) {
    const tz = timezone || "UTC";
    if (offsetDays === 0) {
      const { startMs, endMs } = this.getTodayViewBoundsMs(tz, settings);
      return this.getEspnScoreboardDatesForInstantRange(startMs, endMs);
    }
    const { startMs, endMs } = this.getLocalDayBoundsMs(offsetDays, tz);
    return this.getEspnScoreboardDatesForInstantRange(startMs, endMs);
  },

  getEspnScoreboardDatesForLocalOffsets(fromOffsetDays, toOffsetDays, timezone, settings) {
    const dates = new Set();
    for (let offset = fromOffsetDays; offset <= toOffsetDays; offset++) {
      for (const d of this.getEspnScoreboardDatesForOffsetDay(offset, timezone, settings)) {
        dates.add(d);
      }
    }
    return Array.from(dates).sort();
  },

  getRequiredUtcDatesForLocalRange(fromOffsetDays, toOffsetDays, timezone) {
    const dates = new Set();
    for (let offset = fromOffsetDays; offset <= toOffsetDays; offset++) {
      const { startMs, endMs } = this.getLocalDayBoundsMs(offset, timezone);
      dates.add(this.formatYYYYMMDD(new Date(startMs)));
      dates.add(this.formatYYYYMMDD(new Date(endMs - 1)));
    }
    return Array.from(dates).sort();
  },

  formatYYYYMMDD(date) {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, "0");
    const d = String(date.getUTCDate()).padStart(2, "0");
    return `${y}${m}${d}`;
  },

  formatTimeOnly(isoString, timezone) {
    try {
      const date = new Date(isoString);
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone || "UTC",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
      });
      return formatter.format(date);
    } catch (e) {
      const date = new Date(isoString);
      return date.toISOString().substr(11, 5);
    }
  },

  getLocalDateStrForOffset(offsetDays, timezone) {
    const target = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1e3);
    return this._localDayFormatter(timezone).format(target);
  },

  getLocalDateStrForMatch(match, timezone) {
    return this._localDayFormatter(timezone).format(new Date(match.startTimeUTC));
  },

  getLocalHourForMatch(match, timezone) {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone || "UTC",
      hour: "2-digit",
      hour12: false
    });
    const parts = formatter.formatToParts(new Date(match.startTimeUTC));
    const hourPart = parts.find(p => p.type === "hour");
    const hour = hourPart ? parseInt(hourPart.value, 10) : 0;
    return hour === 24 ? 0 : hour;
  },

  _localDayFormatter(timezone) {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone || "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });
  },

  getSystemTimezone() {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    } catch (e) {
      return "UTC";
    }
  },

  getOffsetDayLabel(offsetDays, timezone) {
    if (offsetDays === 0) return "Today";
    if (offsetDays === -1) return "Yesterday";
    if (offsetDays === 1) return "Tomorrow";
    const target = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1e3);
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone || "UTC",
      weekday: "short",
      month: "short",
      day: "numeric"
    });
    return formatter.format(target);
  }
};

if (typeof window !== "undefined") {
  window.TimeUtil = TimeUtil;
} else {
  self.TimeUtil = TimeUtil;
}

const Cache = {
  _memoryMatchCache: new Map,
  _SESSION_PREFIX: "qs_match_cache_",
  _logoMem: null,
  _logoLoadPromise: null,
  _logoInflight: new Map,
  _logoPersistTimer: null,
  _LOGO_SIZE_PX: 48,
  _LOGO_MAX_ENTRIES: 150,
  _LOGO_MAX_DATAURL_CHARS: 12 * 1024,
  _sessionAvailable() {
    return typeof browser !== "undefined" && browser.storage && !!browser.storage.session;
  },
  async getEntry(key) {
    const mem = this._memoryMatchCache.get(key);
    if (mem) return mem;
    const persisted = await this._readPersisted(key);
    if (persisted) this._memoryMatchCache.set(key, persisted);
    return persisted;
  },
  async setEntry(key, data) {
    const entry = {
      data: data,
      fetchedAt: Date.now()
    };
    this._memoryMatchCache.set(key, entry);
    await this._writePersisted(key, entry);
  },
  async _readPersisted(key) {
    if (!this._sessionAvailable()) return null;
    try {
      const storageKey = this._SESSION_PREFIX + key;
      const result = await browser.storage.session.get(storageKey);
      return result[storageKey] || null;
    } catch (e) {
      return null;
    }
  },
  async _writePersisted(key, entry) {
    if (!this._sessionAvailable()) return;
    try {
      await browser.storage.session.set({
        [this._SESSION_PREFIX + key]: entry
      });
    } catch (e) {}
  },
  async clearMemory() {
    this._memoryMatchCache.clear();
    if (!this._sessionAvailable()) return;
    try {
      const all = await browser.storage.session.get(null);
      const staleKeys = Object.keys(all).filter(k => k.startsWith(this._SESSION_PREFIX));
      if (staleKeys.length) await browser.storage.session.remove(staleKeys);
    } catch (e) {}
  },
  async _ensureLogoMem() {
    if (this._logoMem) return this._logoMem;
    if (this._logoLoadPromise) return this._logoLoadPromise;
    this._logoLoadPromise = (async () => {
      const raw = await Storage.get(CONFIG.STORAGE_KEYS.LOGO_CACHE, {});
      const map = new Map;
      const now = Date.now();
      if (raw && typeof raw === "object") {
        for (const [url, entry] of Object.entries(raw)) {
          if (!entry || !entry.dataUrl) continue;
          if (entry.expiresAt && entry.expiresAt < now) continue;
          if (typeof entry.dataUrl === "string" && entry.dataUrl.length > this._LOGO_MAX_DATAURL_CHARS) continue;
          map.set(url, entry);
        }
      }
      this._logoMem = map;
      return map;
    })();
    try {
      return await this._logoLoadPromise;
    } finally {
      this._logoLoadPromise = null;
    }
  },
  _scheduleLogoPersist() {
    if (this._logoPersistTimer) return;
    this._logoPersistTimer = setTimeout(() => {
      this._logoPersistTimer = null;
      this._persistLogoMem();
    }, 400);
  },
  async _persistLogoMem() {
    if (!this._logoMem) return;
    if (this._logoMem.size > this._LOGO_MAX_ENTRIES) {
      const sorted = Array.from(this._logoMem.entries()).sort((a, b) => (a[1].expiresAt || 0) - (b[1].expiresAt || 0));
      const drop = sorted.length - this._LOGO_MAX_ENTRIES;
      for (let i = 0; i < drop; i++) this._logoMem.delete(sorted[i][0]);
    }
    const obj = {};
    for (const [url, entry] of this._logoMem.entries()) {
      obj[url] = entry;
    }
    await Storage.set(CONFIG.STORAGE_KEYS.LOGO_CACHE, obj);
  },
  async _blobToThumbDataUrl(blob) {
    const size = this._LOGO_SIZE_PX;
    try {
      if (typeof createImageBitmap !== "function") throw new Error("no bitmap");
      const bitmap = await createImageBitmap(blob);
      const w = bitmap.width || size;
      const h = bitmap.height || size;
      const scale = Math.min(size / w, size / h, 1);
      const dw = Math.max(1, Math.round(w * scale));
      const dh = Math.max(1, Math.round(h * scale));
      let canvas;
      if (typeof OffscreenCanvas !== "undefined") {
        canvas = new OffscreenCanvas(dw, dh);
      } else if (typeof document !== "undefined") {
        canvas = document.createElement("canvas");
        canvas.width = dw;
        canvas.height = dh;
      } else {
        bitmap.close && bitmap.close();
        throw new Error("no canvas");
      }
      const ctx = canvas.getContext("2d");
      ctx.drawImage(bitmap, 0, 0, dw, dh);
      bitmap.close && bitmap.close();
      if (canvas.convertToBlob) {
        const outBlob = await canvas.convertToBlob({
          type: "image/png"
        });
        return await this._blobToDataUrl(outBlob);
      }
      return canvas.toDataURL("image/png");
    } catch (e) {
      return await this._blobToDataUrl(blob);
    }
  },
  _blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader;
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  },
  async getOrFetchLogo(url) {
    if (!url) return null;
    const mem = await this._ensureLogoMem();
    const hit = mem.get(url);
    if (hit && hit.dataUrl && (!hit.expiresAt || hit.expiresAt > Date.now())) {
      return hit.dataUrl;
    }
    if (this._logoInflight.has(url)) return this._logoInflight.get(url);
    const promise = (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) return url;
        const blob = await res.blob();
        const dataUrl = await this._blobToThumbDataUrl(blob);
        const entry = {
          dataUrl: dataUrl,
          expiresAt: Date.now() + CONFIG.LOGO_CACHE_TTL_MS
        };
        mem.set(url, entry);
        this._scheduleLogoPersist();
        return dataUrl;
      } catch (e) {
        return url;
      } finally {
        this._logoInflight.delete(url);
      }
    })();
    this._logoInflight.set(url, promise);
    return promise;
  }
};

if (typeof window !== "undefined") {
  window.Cache = Cache;
} else {
  self.Cache = Cache;
}
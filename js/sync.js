const SYNC_TOKEN_KEY = 'financial-sync-token';
const SYNC_GIST_KEY = 'financial-sync-gist-id';
const GIST_FILENAME = 'financial-data.json';
const API_BASE = 'https://api.github.com';

const CloudSync = {
  _token: null,
  _gistId: null,
  _pushTimer: null,
  _statusCallback: null,

  init() {
    this._token = localStorage.getItem(SYNC_TOKEN_KEY) || null;
    this._gistId = localStorage.getItem(SYNC_GIST_KEY) || null;
  },

  isConfigured() {
    return !!(this._token && this._gistId);
  },

  setToken(token) {
    this._token = token || null;
    if (token) {
      localStorage.setItem(SYNC_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(SYNC_TOKEN_KEY);
    }
  },

  setGistId(id) {
    this._gistId = id || null;
    if (id) {
      localStorage.setItem(SYNC_GIST_KEY, id);
    } else {
      localStorage.removeItem(SYNC_GIST_KEY);
    }
  },

  getToken() { return this._token; },
  getGistId() { return this._gistId; },

  onStatus(callback) {
    this._statusCallback = callback;
  },

  _emitStatus(type, message) {
    if (this._statusCallback) this._statusCallback(type, message);
  },

  async _fetch(url, options = {}) {
    const headers = {
      'Authorization': `token ${this._token}`,
      'Accept': 'application/vnd.github.v3+json',
      ...options.headers
    };
    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`GitHub API ${res.status}: ${body}`);
    }
    return res.json();
  },

  async createGist(data) {
    if (!this._token) throw new Error('토큰이 설정되지 않았습니다.');
    this._emitStatus('syncing', '새 Gist 생성 중...');
    try {
      const payload = {
        description: 'Financial Management Data (auto-sync)',
        public: false,
        files: {
          [GIST_FILENAME]: {
            content: JSON.stringify(data, null, 2)
          }
        }
      };
      const result = await this._fetch(`${API_BASE}/gists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      this.setGistId(result.id);
      this._emitStatus('success', 'Gist 생성 완료');
      return result.id;
    } catch (e) {
      this._emitStatus('error', `Gist 생성 실패: ${e.message}`);
      throw e;
    }
  },

  async push(data) {
    if (!this.isConfigured()) return;
    this._emitStatus('syncing', '업로드 중...');
    try {
      data._lastModified = Date.now();
      const payload = {
        files: {
          [GIST_FILENAME]: {
            content: JSON.stringify(data, null, 2)
          }
        }
      };
      await this._fetch(`${API_BASE}/gists/${this._gistId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const time = new Date().toLocaleTimeString('ko-KR');
      this._emitStatus('success', `동기화 완료 (${time})`);
    } catch (e) {
      this._emitStatus('error', `업로드 실패: ${e.message}`);
      throw e;
    }
  },

  async pull() {
    if (!this.isConfigured()) return null;
    this._emitStatus('syncing', '다운로드 중...');
    try {
      const result = await this._fetch(`${API_BASE}/gists/${this._gistId}`);
      const file = result.files[GIST_FILENAME];
      if (!file) {
        this._emitStatus('error', 'Gist에 데이터 파일이 없습니다.');
        return null;
      }
      let content = file.content;
      if (file.truncated && file.raw_url) {
        const res = await fetch(file.raw_url, {
          headers: { 'Authorization': `token ${this._token}` }
        });
        content = await res.text();
      }
      const data = JSON.parse(content);
      const time = new Date().toLocaleTimeString('ko-KR');
      this._emitStatus('success', `다운로드 완료 (${time})`);
      return data;
    } catch (e) {
      this._emitStatus('error', `다운로드 실패: ${e.message}`);
      throw e;
    }
  },

  schedulePush(data) {
    if (!this.isConfigured()) return;
    if (this._pushTimer) clearTimeout(this._pushTimer);
    this._pushTimer = setTimeout(() => {
      this.push(data).catch(() => {});
    }, 3000);
  },

  async validateToken(token) {
    try {
      const res = await fetch(`${API_BASE}/user`, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      if (!res.ok) return null;
      return res.json();
    } catch {
      return null;
    }
  },

  async findGist(token) {
    try {
      const res = await fetch(`${API_BASE}/gists`, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      if (!res.ok) return null;
      const gists = await res.json();
      const match = gists.find(g => g.files && g.files[GIST_FILENAME]);
      return match ? match.id : null;
    } catch {
      return null;
    }
  },

  disconnect() {
    this.setToken(null);
    this.setGistId(null);
    if (this._pushTimer) clearTimeout(this._pushTimer);
    this._emitStatus('disconnected', '연결 해제됨');
  }
};

CloudSync.init();

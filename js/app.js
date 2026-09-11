const App = {
  currentTab: 'budget',

  init() {
    DataStore.load();
    this._migrateOnce();
    this.bindTabs();
    this.bindSettings();
    this._initSync();
    this.switchTab('budget');
  },

  _initSync() {
    CloudSync.onStatus((type, msg) => {
      const el = document.getElementById('sync-status');
      if (el) {
        el.textContent = msg;
        el.className = 'sync-status sync-' + type;
      }
    });
    if (CloudSync.isConfigured()) {
      DataStore.syncFromCloud().then(updated => {
        if (updated) this.switchTab(this.currentTab);
      });
    }
  },

  _migrateOnce() {
    const data = DataStore.getData();
    if (!data.loans) return;
    const from = data.loans.find(l => l.name && l.name.includes('신용대출(2)'));
    const to = data.loans.find(l => l.name && l.name.includes('신용대출(1)'));
    if (from && to && from.rateHistory && from.rateHistory.length > 0 && (!to.rateHistory || to.rateHistory.length === 0)) {
      to.rateHistory = JSON.parse(JSON.stringify(from.rateHistory));
      to.rateType = from.rateType;
      from.rateHistory = [];
      from.rateType = 'fixed';
      DataStore.save();
    }
  },

  bindTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.switchTab(btn.dataset.tab);
      });
    });
  },

  switchTab(tabName) {
    this.currentTab = tabName;

    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    document.querySelectorAll('.tab-content').forEach(section => {
      section.classList.toggle('active', section.id === `tab-${tabName}`);
    });

    const container = document.getElementById(`tab-${tabName}`);
    if (!container) return;

    switch (tabName) {
      case 'budget':
        BudgetView.render(container);
        break;
      case 'cards':
        CardsView.render(container);
        break;
      case 'loans':
        LoansView.render(container);
        break;
      case 'dashboard':
        DashboardView.render(container);
        break;
      case 'settings':
        this.renderSettings(container);
        break;
    }
  },

  renderSettings(container) {
    const data = DataStore.getData();
    const s = data.settings;
    const hasToken = !!CloudSync.getToken();
    const hasGist = !!CloudSync.getGistId();
    const isConnected = CloudSync.isConfigured();

    container.innerHTML = `
      <div class="settings-panel">
        <h3>기간 설정</h3>
        <div class="settings-row">
          <label>시작년도:</label>
          <input type="number" id="set-start-year" value="${s.startYear}" min="2020" max="2030">
        </div>
        <div class="settings-row">
          <label>시작월:</label>
          <input type="number" id="set-start-month" value="${s.startMonth}" min="1" max="12">
        </div>
        <div class="settings-row">
          <label>기간(개월):</label>
          <input type="number" id="set-months" value="${s.months}" min="1" max="60">
        </div>
        <div class="settings-row">
          <label>납부일 기준:</label>
          <input type="number" id="set-payday-base" value="${s.payDayBase || 25}" min="1" max="31">
        </div>
        <button class="btn" onclick="App.saveSettings()">설정 저장</button>

        <hr>
        <h3>클라우드 동기화</h3>
        <div class="sync-section">
          <div class="settings-row">
            <label>GitHub Token:</label>
            <input type="password" id="sync-token" value="${hasToken ? '••••••••' : ''}" placeholder="ghp_xxxx..." class="sync-input">
            <button class="btn btn-sm" onclick="App.connectSync()">
              ${isConnected ? '재연결' : '연결'}
            </button>
          </div>
          <div class="settings-row">
            <label>Gist ID:</label>
            <input type="text" id="sync-gist-id" value="${hasGist ? CloudSync.getGistId() : ''}" placeholder="토큰 연결 시 자동 검색" class="sync-input sync-gist-readonly" readonly>
          </div>
          ${isConnected ? `
          <div class="settings-row sync-actions">
            <button class="btn btn-sync" onclick="App.syncPush()">업로드</button>
            <button class="btn btn-sync" onclick="App.syncPull()">다운로드</button>
            <button class="btn btn-danger btn-sm" onclick="App.disconnectSync()">연결 해제</button>
          </div>
          ` : `
          <div class="sync-guide">
            <p>토큰 하나로 어디서든 동기화됩니다.</p>
            <p>1. <a href="https://github.com/settings/tokens/new?scopes=gist&description=Financial+Sync" target="_blank" style="color:var(--accent)">Classic Token 생성</a> → "gist" 체크 → Generate</p>
            <p>2. 토큰(ghp_...)을 위 필드에 붙여넣고 "연결" 클릭</p>
            <p>3. 기존 Gist가 있으면 자동 검색, 없으면 새로 생성</p>
          </div>
          `}
          <div id="sync-status" class="sync-status"></div>
        </div>

        <hr>
        <h3>데이터 관리</h3>
        <div class="settings-row">
          <button class="btn" onclick="App.exportData()">JSON 내보내기</button>
          <button class="btn" onclick="document.getElementById('import-file').click()">JSON 가져오기</button>
          <input type="file" id="import-file" accept=".json" style="display:none" onchange="App.importData(event)">
        </div>
        <div class="settings-row">
          <button class="btn btn-danger" onclick="App.resetData()">초기화 (기본값 복원)</button>
        </div>
      </div>
    `;
  },

  navigateToCard(cardId, monthKey) {
    this.switchTab('cards');
    requestAnimationFrame(() => {
      CardsView.focusCardMonth(cardId, monthKey);
    });
  },

  navigateToLoan(loanId, monthKey) {
    this.switchTab('loans');
    requestAnimationFrame(() => {
      LoansView.focusLoanMonth(loanId, monthKey);
    });
  },

  bindSettings() {},

  saveSettings() {
    const startYear = Number(document.getElementById('set-start-year').value);
    const startMonth = Number(document.getElementById('set-start-month').value);
    const months = Number(document.getElementById('set-months').value);
    const payDayBase = Number(document.getElementById('set-payday-base').value) || 25;
    DataStore.updateSettings({ startYear, startMonth, months, payDayBase });
    alert('설정이 저장되었습니다.');
    this.switchTab('settings');
  },

  exportData() {
    const json = DataStore.exportJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financial-data-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        DataStore.importJSON(e.target.result);
        alert('데이터를 성공적으로 가져왔습니다.');
        this.switchTab(this.currentTab);
      } catch {
        alert('올바른 JSON 파일이 아닙니다.');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  },

  resetData() {
    if (!confirm('모든 데이터를 초기화하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) return;
    DataStore.resetToDefault();
    alert('초기화되었습니다.');
    this.switchTab(this.currentTab);
  },

  async connectSync() {
    const tokenInput = document.getElementById('sync-token');
    const gistInput = document.getElementById('sync-gist-id');
    let token = tokenInput.value.trim();
    if (token === '••••••••') token = CloudSync.getToken();
    if (!token || !token.startsWith('ghp_')) {
      alert('Classic Personal Access Token이 필요합니다.\n(ghp_로 시작하는 토큰)\n\nFine-grained 토큰(github_pat_)은 Gist API를 지원하지 않습니다.');
      return;
    }

    const status = document.getElementById('sync-status');
    status.textContent = '토큰 확인 중...';
    status.className = 'sync-status sync-syncing';

    const user = await CloudSync.validateToken(token);
    if (!user) {
      status.textContent = '토큰이 유효하지 않습니다.';
      status.className = 'sync-status sync-error';
      return;
    }

    CloudSync.setToken(token);
    const gistId = gistInput.value.trim();
    if (gistId) {
      CloudSync.setGistId(gistId);
      status.textContent = `${user.login} 계정으로 연결됨`;
      status.className = 'sync-status sync-success';
    } else {
      status.textContent = '기존 Gist 검색 중...';
      status.className = 'sync-status sync-syncing';
      const foundId = await CloudSync.findGist(token);
      if (foundId) {
        CloudSync.setGistId(foundId);
        status.textContent = `${user.login} 계정의 Gist를 자동으로 찾았습니다.`;
        status.className = 'sync-status sync-success';
        const updated = await DataStore.syncFromCloud();
        if (updated) this.switchTab(this.currentTab);
      } else {
        try {
          const data = DataStore.getData();
          await CloudSync.createGist(data);
        } catch {
          return;
        }
      }
    }
    this.renderSettings(document.getElementById('tab-settings'));
  },

  async syncPush() {
    try {
      const data = DataStore.getData();
      await CloudSync.push(data);
    } catch { /* status callback handles UI */ }
  },

  async syncPull() {
    try {
      const updated = await DataStore.syncFromCloud();
      if (updated) {
        this.switchTab(this.currentTab);
        const el = document.getElementById('sync-status');
        if (el) {
          el.textContent = '데이터를 클라우드에서 불러왔습니다.';
          el.className = 'sync-status sync-success';
        }
      } else {
        const el = document.getElementById('sync-status');
        if (el) {
          el.textContent = '로컬 데이터가 이미 최신입니다.';
          el.className = 'sync-status sync-success';
        }
      }
    } catch { /* status callback handles UI */ }
  },

  disconnectSync() {
    if (!confirm('클라우드 동기화 연결을 해제하시겠습니까?\n(Gist 데이터는 삭제되지 않습니다)')) return;
    CloudSync.disconnect();
    this.renderSettings(document.getElementById('tab-settings'));
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());

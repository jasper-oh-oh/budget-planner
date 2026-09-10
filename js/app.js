const App = {
  currentTab: 'budget',

  init() {
    DataStore.load();
    this._migrateOnce();
    this.bindTabs();
    this.bindSettings();
    this.switchTab('budget');
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
        <button class="btn" onclick="App.saveSettings()">설정 저장</button>

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
    DataStore.updateSettings({ startYear, startMonth, months });
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
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());

const LoansView = {
  render(container) {
    const data = DataStore.getData();
    container.innerHTML = '';

    const toolbar = document.createElement('div');
    toolbar.className = 'toolbar';
    toolbar.innerHTML = `<button onclick="LoansView.addLoan()" class="btn btn-sm">+ 대출 추가</button>`;
    container.appendChild(toolbar);

    for (const loan of data.loans) {
      container.appendChild(this._renderLoan(loan));
    }
  },

  _renderLoan(loan) {
    const section = document.createElement('div');
    section.className = 'card-section loan-section';
    section.dataset.loanId = loan.id;
    section.style.borderLeftColor = loan.color;

    const header = document.createElement('div');
    header.className = 'card-header';
    header.innerHTML = `
      <h3 style="color: ${loan.color}">${loan.name}</h3>
      <div class="card-meta">
        <span>원금: <strong>${this._formatNumber(loan.principal)}</strong></span>
        <span>이율: <strong>${(loan.annualRate * 100).toFixed(3)}%</strong></span>
        <span>금리: <strong>${loan.rateType === 'variable' ? '변동' : '고정'}</strong></span>
        <span>기간: <strong>${loan.termYears}년</strong></span>
        <span>상환: <strong>${REPAYMENT_LABELS[loan.repaymentType]}</strong></span>
        <span>실행: <strong>${loan.startYear}.${String(loan.startMonth).padStart(2, '0')}</strong></span>
        <span>납부일: <strong>${loan.payDay ? loan.payDay + '일' : '-'}</strong></span>
        ${loan.rateType === 'variable' ? `<button class="btn btn-sm btn-rate-history" onclick="LoansView.openRateHistory('${loan.id}')">금리 이력</button>` : ''}
        <button class="btn btn-sm" onclick="LoansView.editLoan('${loan.id}')">설정</button>
        <button class="btn btn-sm btn-danger" onclick="LoansView.removeLoan('${loan.id}')">삭제</button>
      </div>
    `;
    section.appendChild(header);

    const results = DataStore.simulateLoan(loan);
    const wrapper = document.createElement('div');
    wrapper.className = 'table-wrapper';
    wrapper.appendChild(this._buildTable(loan, results));
    section.appendChild(wrapper);

    return section;
  },

  _buildTable(loan, results) {
    const table = document.createElement('table');
    table.className = 'card-table';

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headerRow.innerHTML = '<th class="sticky-col">항목</th>';
    for (const r of results) {
      headerRow.innerHTML += `<th data-loan-id="${loan.id}" data-month="${r.monthKey}">${DataStore.getMonthLabel(r.monthKey)}</th>`;
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    const isVariable = loan.rateType === 'variable';
    const rows = [
      { label: '이자율(연)', key: 'annualRate', format: 'percent', editable: isVariable },
      { label: '잔액', key: 'balance' },
      { label: '① 원금상환', key: 'principalPayment' },
      { label: '② 이자', key: 'interest', className: 'interest-row' },
      { label: '③ 월납부액(①+②)', key: 'payment', className: 'highlight-row' },
    ];

    for (const rowDef of rows) {
      const tr = document.createElement('tr');
      if (rowDef.className) tr.className = rowDef.className;
      tr.innerHTML = `<td class="sticky-col row-label">${rowDef.label}</td>`;
      for (const r of results) {
        const val = r[rowDef.key];
        let display;
        if (rowDef.format === 'percent') {
          display = (val * 100).toFixed(3) + '%';
        } else {
          display = this._formatNumber(val);
        }
        if (rowDef.editable) {
          tr.innerHTML += `<td class="cell editable" data-loan-id="${loan.id}" data-month="${r.monthKey}"
                               onclick="LoansView.editRate(this)">${display}</td>`;
        } else {
          tr.innerHTML += `<td class="cell">${display}</td>`;
        }
      }
      tbody.appendChild(tr);
    }

    table.appendChild(tbody);
    return table;
  },

  addLoan() {
    const name = prompt('대출 이름 (예: 농협 주택담보대출):');
    if (!name) return;
    const principal = Number(prompt('대출 원금 (원):', '0')) || 0;
    const startYear = Number(prompt('대출 실행 년도:', '2025')) || 2025;
    const startMonth = Number(prompt('대출 실행 월:', '1')) || 1;
    const termYears = Number(prompt('대출 기간 (년):', '5')) || 5;
    const annualRate = Number(prompt('연이율 (예: 0.05 = 5%):', '0.05')) || 0.05;
    const typeIdx = prompt('상환방식:\n1. 원리금균등\n2. 원금균등\n3. 만기일시\n\n번호 입력:');
    const types = ['amortized', 'equalPrincipal', 'bullet'];
    const repaymentType = types[Number(typeIdx) - 1] || 'amortized';

    const colors = ['#4CAF50', '#03A9F4', '#FF7043', '#607D8B', '#9C27B0', '#795548'];
    const data = DataStore.getData();
    const color = colors[data.loans.length % colors.length];

    const rateIdx = prompt('금리 유형:\n1. 고정금리\n2. 변동금리\n\n번호 입력:', '1');
    const rateType = rateIdx === '2' ? 'variable' : 'fixed';

    const payDayStr = prompt('납부일 (없으면 빈칸):', '');
    const payDay = payDayStr ? Number(payDayStr) || null : null;

    DataStore.addLoan({ name, color, principal, startYear, startMonth, termYears, annualRate, repaymentType, rateType, rateOverrides: {}, payDay });
    this._refresh();
  },

  editLoan(loanId) {
    const data = DataStore.getData();
    const loan = data.loans.find(l => l.id === loanId);
    if (!loan) return;

    const name = prompt('대출 이름:', loan.name);
    if (name) DataStore.updateLoanField(loanId, 'name', name);

    const principal = prompt('대출 원금:', loan.principal);
    if (principal !== null) DataStore.updateLoanField(loanId, 'principal', Number(principal) || 0);

    const startYear = prompt('실행 년도:', loan.startYear);
    if (startYear !== null) DataStore.updateLoanField(loanId, 'startYear', Number(startYear) || 2025);

    const startMonth = prompt('실행 월:', loan.startMonth);
    if (startMonth !== null) DataStore.updateLoanField(loanId, 'startMonth', Number(startMonth) || 1);

    const termYears = prompt('대출 기간 (년):', loan.termYears);
    if (termYears !== null) DataStore.updateLoanField(loanId, 'termYears', Number(termYears) || 1);

    const annualRate = prompt('연이율 (예: 0.05):', loan.annualRate);
    if (annualRate !== null) DataStore.updateLoanField(loanId, 'annualRate', Number(annualRate) || 0);

    const typeIdx = prompt(`상환방식 (현재: ${REPAYMENT_LABELS[loan.repaymentType]}):\n1. 원리금균등\n2. 원금균등\n3. 만기일시\n\n번호 입력 (변경 없으면 빈칸):`);
    if (typeIdx) {
      const types = ['amortized', 'equalPrincipal', 'bullet'];
      const t = types[Number(typeIdx) - 1];
      if (t) DataStore.updateLoanField(loanId, 'repaymentType', t);
    }

    const rateIdx = prompt(`금리 유형 (현재: ${loan.rateType === 'variable' ? '변동' : '고정'}):\n1. 고정금리\n2. 변동금리\n\n번호 입력 (변경 없으면 빈칸):`);
    if (rateIdx === '1') DataStore.updateLoanField(loanId, 'rateType', 'fixed');
    if (rateIdx === '2') DataStore.updateLoanField(loanId, 'rateType', 'variable');

    const payDayStr = prompt('납부일:', loan.payDay || '');
    if (payDayStr !== null) {
      DataStore.updateLoanField(loanId, 'payDay', payDayStr.trim() === '' ? null : (Number(payDayStr) || null));
    }

    this._refresh();
  },

  removeLoan(loanId) {
    if (!confirm('이 대출을 삭제하시겠습니까?')) return;
    DataStore.removeLoan(loanId);
    this._refresh();
  },

  _refresh() {
    const container = document.getElementById('tab-loans');
    if (container) this.render(container);
  },

  openRateHistory(loanId) {
    const data = DataStore.getData();
    const loan = data.loans.find(l => l.id === loanId);
    if (!loan) return;

    const existing = document.getElementById('rate-history-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'rate-history-modal';
    modal.className = 'modal-overlay';
    modal.innerHTML = this._renderRateHistoryModal(loan);
    document.body.appendChild(modal);

    modal.addEventListener('click', (e) => {
      if (e.target === modal) this._closeRateHistory();
    });
  },

  _renderRateHistoryModal(loan) {
    const history = loan.rateHistory || [];
    let rows = '';
    for (let i = 0; i < history.length; i++) {
      const h = history[i];
      rows += `<tr>
        <td><input type="month" class="rate-input rate-date" value="${h.from}" data-idx="${i}"></td>
        <td><input type="text" class="rate-input rate-value" value="${(h.rate * 100).toFixed(3)}" data-idx="${i}"> %</td>
        <td><button class="btn btn-sm btn-danger" onclick="LoansView._removeRateEntry('${loan.id}', ${i})">삭제</button></td>
      </tr>`;
    }

    return `<div class="modal-content">
      <div class="modal-header">
        <h3>금리 변경 이력 — ${loan.name}</h3>
        <button class="btn btn-sm" onclick="LoansView._closeRateHistory()">닫기</button>
      </div>
      <p class="modal-desc">변경 시점과 적용 금리를 입력하세요. 각 시점 이후 다음 변경 시점까지 해당 금리가 적용됩니다.<br>
      기본 금리(대출 실행 시): <strong>${(loan.annualRate * 100).toFixed(3)}%</strong></p>
      <table class="rate-history-table">
        <thead><tr><th>변경 시점</th><th>연이율</th><th></th></tr></thead>
        <tbody id="rate-history-body">${rows}</tbody>
      </table>
      <div class="modal-actions">
        <button class="btn btn-sm" onclick="LoansView._addRateEntry('${loan.id}')">+ 금리 변경 추가</button>
        <button class="btn" onclick="LoansView._saveRateHistory('${loan.id}')">저장</button>
      </div>
    </div>`;
  },

  _collectDomHistory() {
    const dates = document.querySelectorAll('.rate-date');
    const values = document.querySelectorAll('.rate-value');
    const history = [];
    dates.forEach((dateInput, i) => {
      const from = dateInput.value;
      const rate = parseFloat(values[i].value) / 100;
      if (from && !isNaN(rate)) history.push({ from, rate });
    });
    return history;
  },

  _addRateEntry(loanId) {
    const data = DataStore.getData();
    const loan = data.loans.find(l => l.id === loanId);
    if (!loan) return;

    loan.rateHistory = this._collectDomHistory();
    const now = new Date();
    const defaultFrom = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    loan.rateHistory.push({ from: defaultFrom, rate: loan.annualRate });

    const modal = document.getElementById('rate-history-modal');
    if (modal) modal.innerHTML = this._renderRateHistoryModal(loan);
  },

  _removeRateEntry(loanId, idx) {
    const data = DataStore.getData();
    const loan = data.loans.find(l => l.id === loanId);
    if (!loan) return;

    loan.rateHistory = this._collectDomHistory();
    loan.rateHistory.splice(idx, 1);

    const modal = document.getElementById('rate-history-modal');
    if (modal) modal.innerHTML = this._renderRateHistoryModal(loan);
  },

  _saveRateHistory(loanId) {
    const data = DataStore.getData();
    const loan = data.loans.find(l => l.id === loanId);
    if (!loan) return;

    const dates = document.querySelectorAll('.rate-date');
    const values = document.querySelectorAll('.rate-value');
    const history = [];

    dates.forEach((dateInput, i) => {
      const from = dateInput.value;
      const rate = parseFloat(values[i].value) / 100;
      if (from && !isNaN(rate)) {
        history.push({ from, rate });
      }
    });

    history.sort((a, b) => a.from.localeCompare(b.from));
    loan.rateHistory = history;
    loan.rateOverrides = {};
    DataStore.save();

    this._closeRateHistory();
    this._refresh();
  },

  _closeRateHistory() {
    const modal = document.getElementById('rate-history-modal');
    if (modal) modal.remove();
  },

  editRate(td) {
    if (td.querySelector('input')) return;
    const currentText = td.textContent.trim();
    const currentPct = parseFloat(currentText.replace('%', ''));
    const { loanId, month } = td.dataset;

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'cell-input';
    input.value = currentPct;
    input.placeholder = '%';

    const save = () => {
      const raw = parseFloat(input.value);
      if (isNaN(raw)) { td.textContent = currentText; return; }
      const rate = raw / 100;
      const choice = prompt(
        '적용 범위를 선택하세요:\n' +
        `1. 이번 달(${DataStore.getMonthLabel(month)})만 변경\n` +
        '2. 이번 달 이후 모두 변경\n\n번호 입력:',
        '2'
      );
      if (choice === '1') {
        DataStore.setLoanRateOverride(loanId, month, rate, false);
      } else if (choice === '2') {
        DataStore.setLoanRateOverride(loanId, month, rate, true);
      } else {
        td.textContent = currentText;
        return;
      }
      this._refresh();
    };

    input.addEventListener('blur', save);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); input.removeEventListener('blur', save); save(); }
      if (e.key === 'Escape') { input.removeEventListener('blur', save); td.textContent = currentText; }
    });

    td.textContent = '';
    td.appendChild(input);
    input.focus();
    input.select();
  },

  focusLoanMonth(loanId, monthKey) {
    const section = document.querySelector(`.loan-section[data-loan-id="${loanId}"]`);
    if (!section) return;
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });

    const th = section.querySelector(`th[data-loan-id="${loanId}"][data-month="${monthKey}"]`);
    if (th) {
      th.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      const col = th.cellIndex;
      section.querySelectorAll('td, th').forEach(cell => {
        if (cell.cellIndex === col) cell.classList.add('focus-highlight');
      });
      setTimeout(() => {
        section.querySelectorAll('.focus-highlight').forEach(c => c.classList.remove('focus-highlight'));
      }, 2000);
    }
  },

  _formatNumber(num) {
    if (num === 0 || num === null || num === undefined) return '₩0';
    return '₩' + Math.round(num).toLocaleString('ko-KR');
  }
};

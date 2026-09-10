const BudgetView = {
  render(container) {
    const data = DataStore.getData();
    const monthKeys = DataStore.getMonthKeys();

    container.innerHTML = '';

    const toolbar = document.createElement('div');
    toolbar.className = 'toolbar';
    toolbar.innerHTML = `
      <button onclick="BudgetView.addItem('income')" class="btn btn-sm">+ 수입 항목</button>
      <button onclick="BudgetView.addItem('expense')" class="btn btn-sm">+ 지출 항목</button>
    `;
    container.appendChild(toolbar);

    const wrapper = document.createElement('div');
    wrapper.className = 'table-wrapper';
    const table = document.createElement('table');
    table.className = 'budget-table';

    table.appendChild(this._buildHeader(monthKeys));
    table.appendChild(this._buildBody(data, monthKeys));

    wrapper.appendChild(table);
    container.appendChild(wrapper);
  },

  _buildHeader(monthKeys) {
    const thead = document.createElement('thead');

    const row1 = document.createElement('tr');
    row1.innerHTML = '<th class="sticky-col col-category" rowspan="2">분류</th>' +
      '<th class="sticky-col col-name" rowspan="2">항목</th>' +
      '<th class="sticky-col col-payday" rowspan="2">납부일</th>';
    for (const mk of monthKeys) {
      row1.innerHTML += `<th colspan="2" class="month-header">${DataStore.getMonthLabel(mk)}</th>`;
    }
    thead.appendChild(row1);

    const row2 = document.createElement('tr');
    for (let i = 0; i < monthKeys.length; i++) {
      row2.innerHTML += '<th class="sub-header expected">예상</th><th class="sub-header actual">실제</th>';
    }
    thead.appendChild(row2);

    return thead;
  },

  _buildBody(data, monthKeys) {
    const tbody = document.createElement('tbody');

    // === 수입 섹션 ===
    const incomeHeader = document.createElement('tr');
    incomeHeader.className = 'section-header income-section';
    incomeHeader.innerHTML = `<td class="sticky-col col-category section-title" colspan="3">수입</td>` +
      monthKeys.map(() => '<td colspan="2"></td>').join('');
    tbody.appendChild(incomeHeader);

    for (const cat of INCOME_CATEGORIES) {
      const items = data.incomeItems.filter(i => i.category === cat);
      if (items.length === 0) continue;
      for (let idx = 0; idx < items.length; idx++) {
        tbody.appendChild(this._buildItemRow(items[idx], 'income', monthKeys, cat, idx === 0 ? items.length : 0));
      }
    }

    tbody.appendChild(this._buildTotalRow('수입합계', monthKeys, 'income', 'income-total'));

    // === 지출 섹션 ===
    const expenseHeader = document.createElement('tr');
    expenseHeader.className = 'section-header expense-section';
    expenseHeader.innerHTML = `<td class="sticky-col col-category section-title" colspan="3">지출</td>` +
      monthKeys.map(() => '<td colspan="2"></td>').join('');
    tbody.appendChild(expenseHeader);

    for (const cat of EXPENSE_CATEGORIES) {
      if (cat === '카드대금') {
        this._buildCardBillingRows(tbody, data, monthKeys);
        continue;
      }
      if (cat === '대출') {
        const manualItems = data.expenseItems.filter(i => i.category === '대출');
        const loanCount = data.loans ? data.loans.length : 0;
        const totalRows = manualItems.length + loanCount;
        for (let idx = 0; idx < manualItems.length; idx++) {
          tbody.appendChild(this._buildItemRow(manualItems[idx], 'expense', monthKeys, '대출', idx === 0 ? totalRows : 0));
        }
        this._buildLoanPaymentRows(tbody, data, monthKeys, manualItems.length === 0 ? 0 : -1);
        continue;
      }
      const items = data.expenseItems.filter(i => i.category === cat);
      if (items.length === 0) continue;
      for (let idx = 0; idx < items.length; idx++) {
        tbody.appendChild(this._buildItemRow(items[idx], 'expense', monthKeys, cat, idx === 0 ? items.length : 0));
      }
    }

    tbody.appendChild(this._buildTotalRow('지출합계', monthKeys, 'expense', 'expense-total'));
    tbody.appendChild(this._buildBalanceRow(monthKeys));

    return tbody;
  },

  _buildItemRow(item, type, monthKeys, category, rowspan) {
    const tr = document.createElement('tr');
    tr.className = `item-row ${type}-row`;

    let cells = '';
    if (rowspan > 0) {
      cells += `<td class="sticky-col col-category category-label" rowspan="${rowspan}">${category}</td>`;
    }
    cells += `<td class="sticky-col col-name item-name">
      <span class="item-label">${item.name}</span>
      <button class="btn-icon btn-delete" onclick="BudgetView.removeItem('${type}', '${item.id}')" title="삭제">×</button>
    </td>`;
    cells += type === 'expense'
      ? `<td class="sticky-col col-payday">${item.payDay || ''}</td>`
      : `<td class="sticky-col col-payday"></td>`;

    for (const mk of monthKeys) {
      const md = DataStore.ensureMonthData(mk);
      const section = type === 'income' ? md.income : md.expense;
      const d = section[item.id] || { expected: 0, actual: 0 };
      cells += `<td class="cell expected" data-month="${mk}" data-type="${type}" data-item="${item.id}" data-field="expected"
                    onclick="BudgetView.editCell(this)">${this._formatNumber(d.expected)}</td>`;
      cells += `<td class="cell actual" data-month="${mk}" data-type="${type}" data-item="${item.id}" data-field="actual"
                    onclick="BudgetView.editCell(this)">${this._formatNumber(d.actual)}</td>`;
    }

    tr.innerHTML = cells;
    return tr;
  },

  _buildCardBillingRows(tbody, data, monthKeys) {
    const cards = data.cards;
    if (cards.length === 0) return;

    for (let idx = 0; idx < cards.length; idx++) {
      const card = cards[idx];
      const sim = DataStore.simulateCard(card);
      const tr = document.createElement('tr');
      tr.className = 'item-row expense-row card-billing-row';

      let cells = '';
      if (idx === 0) {
        cells += `<td class="sticky-col col-category category-label category-card" rowspan="${cards.length}">카드대금</td>`;
      }
      cells += `<td class="sticky-col col-name item-name">
        <span class="item-label" style="color:${card.color}">${card.name}</span>
      </td>`;
      cells += `<td class="sticky-col col-payday"></td>`;

      for (const mk of monthKeys) {
        const monthResult = sim.find(r => r.monthKey === mk);
        const billing = monthResult ? monthResult.billing : 0;
        const billingKey = 'card-billing-' + card.id;
        const md = DataStore.ensureMonthData(mk);
        const actualData = md.expense[billingKey] || { expected: 0, actual: 0 };

        cells += `<td class="cell expected card-linked" data-card-id="${card.id}" data-month="${mk}"
                      onclick="App.navigateToCard('${card.id}', '${mk}')">${this._formatNumber(billing)}</td>`;
        cells += `<td class="cell actual" data-month="${mk}" data-type="expense" data-item="${billingKey}" data-field="actual"
                      onclick="BudgetView.editCell(this)">${this._formatNumber(actualData.actual)}</td>`;
      }

      tr.innerHTML = cells;
      tbody.appendChild(tr);
    }
  },

  _buildLoanPaymentRows(tbody, data, monthKeys, categoryRowspanHandled) {
    const loans = data.loans || [];
    if (loans.length === 0) return;

    for (let idx = 0; idx < loans.length; idx++) {
      const loan = loans[idx];
      const sim = DataStore.simulateLoan(loan);
      const tr = document.createElement('tr');
      tr.className = 'item-row expense-row loan-payment-row';

      let cells = '';
      if (categoryRowspanHandled === 0 && idx === 0) {
        cells += `<td class="sticky-col col-category category-label category-loan" rowspan="${loans.length}">대출</td>`;
      }
      cells += `<td class="sticky-col col-name item-name">
        <span class="item-label" style="color:${loan.color}">${loan.name}</span>
      </td>`;
      cells += `<td class="sticky-col col-payday"></td>`;

      for (const mk of monthKeys) {
        const monthResult = sim.find(r => r.monthKey === mk);
        const payment = monthResult ? monthResult.payment : 0;
        const paymentKey = 'loan-payment-' + loan.id;
        const md = DataStore.ensureMonthData(mk);
        const actualData = md.expense[paymentKey] || { expected: 0, actual: 0 };

        cells += `<td class="cell expected loan-linked" data-loan-id="${loan.id}" data-month="${mk}"
                      onclick="App.navigateToLoan('${loan.id}', '${mk}')">${this._formatNumber(payment)}</td>`;
        cells += `<td class="cell actual" data-month="${mk}" data-type="expense" data-item="${paymentKey}" data-field="actual"
                      onclick="BudgetView.editCell(this)">${this._formatNumber(actualData.actual)}</td>`;
      }

      tr.innerHTML = cells;
      tbody.appendChild(tr);
    }
  },

  _buildTotalRow(label, monthKeys, type, className) {
    const tr = document.createElement('tr');
    tr.className = `total-row ${className}`;

    let cells = `<td class="sticky-col col-category total-label" colspan="2">${label}</td><td class="sticky-col col-payday"></td>`;

    for (const mk of monthKeys) {
      const totals = DataStore.getMonthTotals(mk);
      const exp = type === 'income' ? totals.incomeExpected : totals.expenseExpected;
      const act = type === 'income' ? totals.incomeActual : totals.expenseActual;
      cells += `<td class="cell total expected">${this._formatNumber(exp)}</td>`;
      cells += `<td class="cell total actual">${this._formatNumber(act)}</td>`;
    }

    tr.innerHTML = cells;
    return tr;
  },

  _buildBalanceRow(monthKeys) {
    const tr = document.createElement('tr');
    tr.className = 'balance-row';

    let cells = `<td class="sticky-col col-category balance-label" colspan="2">결산</td><td class="sticky-col col-payday"></td>`;

    for (const mk of monthKeys) {
      const totals = DataStore.getMonthTotals(mk);
      const balExp = totals.balanceExpected;
      const balAct = totals.balanceActual;
      cells += `<td class="cell balance expected ${balExp >= 0 ? 'positive' : 'negative'}">${this._formatNumber(balExp)}</td>`;
      cells += `<td class="cell balance actual ${balAct >= 0 ? 'positive' : 'negative'}">${this._formatNumber(balAct)}</td>`;
    }

    tr.innerHTML = cells;
    return tr;
  },

  editCell(td) {
    if (td.querySelector('input')) return;

    const currentText = td.textContent.trim();
    const currentVal = this._parseNumber(currentText);
    const { month, type, item, field } = td.dataset;

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'cell-input';
    input.value = currentVal;
    input.addEventListener('blur', () => this._saveCell(td, input, month, type, item, field));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') input.blur();
      if (e.key === 'Escape') td.textContent = currentText;
      if (e.key === 'Tab') {
        e.preventDefault();
        input.blur();
        const next = e.shiftKey ? td.previousElementSibling : td.nextElementSibling;
        if (next && next.classList.contains('cell') && !next.classList.contains('card-linked')) {
          next.click();
        }
      }
    });

    td.textContent = '';
    td.appendChild(input);
    input.focus();
    input.select();
  },

  _saveCell(td, input, monthKey, type, itemId, field) {
    const val = this._parseNumber(input.value);
    DataStore.updateCell(monthKey, type, itemId, field, val);
    td.textContent = this._formatNumber(val);
    this._refreshTotals();
  },

  _refreshTotals() {
    const container = document.getElementById('tab-budget');
    if (container) this.render(container);
  },

  _formatNumber(num) {
    if (num === 0 || num === null || num === undefined) return '₩0';
    return '₩' + Math.round(num).toLocaleString('ko-KR');
  },

  _parseNumber(str) {
    if (!str) return 0;
    const cleaned = String(str).replace(/[₩,\s]/g, '');
    const num = Number(cleaned);
    return isNaN(num) ? 0 : num;
  },

  addItem(type) {
    const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES.filter(c => c !== '카드대금');
    const catIdx = prompt(
      `${type === 'income' ? '수입' : '지출'} 분류를 선택하세요:\n` +
      categories.map((c, i) => `${i + 1}. ${c}`).join('\n') +
      '\n\n번호 입력:'
    );
    if (!catIdx) return;
    const category = categories[Number(catIdx) - 1];
    if (!category) { alert('올바른 번호를 입력하세요.'); return; }

    const name = prompt('항목명:');
    if (!name) return;

    let defaultAmount = 0;
    const amtStr = prompt('기본 월 금액 (원):', '0');
    if (amtStr) defaultAmount = Number(amtStr.replace(/[,\s]/g, '')) || 0;

    if (type === 'income') {
      DataStore.addIncomeItem(name, category, defaultAmount);
    } else {
      const payDayStr = prompt('납부일 (없으면 빈칸):', '');
      const payDay = payDayStr ? Number(payDayStr) || null : null;
      DataStore.addExpenseItem(name, category, payDay, defaultAmount);
    }

    this._refreshTotals();
  },

  removeItem(type, id) {
    if (!confirm('이 항목을 삭제하시겠습니까?')) return;
    DataStore.removeItem(type, id);
    this._refreshTotals();
  }
};

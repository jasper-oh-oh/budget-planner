const BudgetView = {
  _sortMode: 'default',

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

    const firstRow = table.querySelector('thead tr:first-child');
    if (firstRow) {
      const h = firstRow.offsetHeight;
      table.querySelectorAll('thead tr:nth-child(2) th').forEach(th => {
        th.style.top = h + 'px';
      });
    }

    this._bindTooltip(wrapper);
  },

  _bindTooltip(wrapper) {
    let tip = document.querySelector('.budget-tooltip');
    if (!tip) {
      tip = document.createElement('div');
      tip.className = 'budget-tooltip';
      document.body.appendChild(tip);
    }

    wrapper.addEventListener('mouseover', (e) => {
      const cell = e.target.closest('[data-tooltip]');
      if (!cell) return;
      tip.textContent = cell.dataset.tooltip;
      tip.style.display = 'block';
    });

    wrapper.addEventListener('mousemove', (e) => {
      if (tip.style.display === 'block') {
        tip.style.left = e.clientX + 12 + 'px';
        tip.style.top = e.clientY - 28 + 'px';
      }
    });

    wrapper.addEventListener('mouseout', (e) => {
      const cell = e.target.closest('[data-tooltip]');
      if (!cell || !cell.contains(e.relatedTarget)) {
        tip.style.display = 'none';
      }
    });
  },

  setSortMode(mode) {
    if (this._sortMode === mode) return;
    this._sortMode = mode;
    const container = document.getElementById('tab-budget');
    const wrapper = container && container.querySelector('.table-wrapper');
    const scrollLeft = wrapper ? wrapper.scrollLeft : 0;
    const scrollTop = wrapper ? wrapper.scrollTop : 0;
    this.render(container);
    const newWrapper = container.querySelector('.table-wrapper');
    if (newWrapper) { newWrapper.scrollLeft = scrollLeft; newWrapper.scrollTop = scrollTop; }
  },

  _buildHeader(monthKeys) {
    const thead = document.createElement('thead');
    const isPayDay = this._sortMode === 'payDay';

    const row1 = document.createElement('tr');
    row1.innerHTML =
      `<th class="sticky-col col-category sortable" rowspan="2" onclick="BudgetView.setSortMode('default')">분류</th>` +
      `<th class="sticky-col col-name sortable" rowspan="2" onclick="BudgetView.setSortMode('default')">항목</th>` +
      `<th class="sticky-col col-payday sortable${isPayDay ? ' sort-active' : ''}" rowspan="2" onclick="BudgetView.setSortMode('payDay')">납부일</th>`;
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

    // === 수입 섹션 (항상 기본 순서) ===
    const incomeHeader = document.createElement('tr');
    incomeHeader.className = 'section-header income-section';
    incomeHeader.innerHTML = `<td class="sticky-col col-category section-title" colspan="3">수입</td>` +
      monthKeys.map(() => '<td colspan="2"></td>').join('');
    tbody.appendChild(incomeHeader);

    const allIncome = this._collectIncomeItems(data);
    for (const cat of INCOME_CATEGORIES) {
      const catItems = allIncome.filter(i => i.category === cat);
      if (catItems.length === 0) continue;
      for (let idx = 0; idx < catItems.length; idx++) {
        const rowspan = idx === 0 ? catItems.length : 0;
        const entry = catItems[idx];
        if (entry.renderType === 'stock') {
          tbody.appendChild(this._buildStockIncomeRow(entry.stock, monthKeys, data, rowspan, cat));
        } else {
          tbody.appendChild(this._buildItemRow(entry.item, 'income', monthKeys, cat, rowspan));
        }
      }
    }

    tbody.appendChild(this._buildTotalRow('수입합계', monthKeys, 'income', 'income-total'));

    // === 지출 섹션 ===
    const expenseHeader = document.createElement('tr');
    expenseHeader.className = 'section-header expense-section';
    expenseHeader.innerHTML = `<td class="sticky-col col-category section-title" colspan="3">지출</td>` +
      monthKeys.map(() => '<td colspan="2"></td>').join('');
    tbody.appendChild(expenseHeader);

    const allExpense = this._collectExpenseItems(data);

    if (this._sortMode === 'payDay') {
      this._buildExpenseByPayDay(tbody, allExpense, monthKeys, data);
    } else {
      this._buildExpenseDefault(tbody, allExpense, monthKeys, data);
    }

    tbody.appendChild(this._buildTotalRow('지출합계', monthKeys, 'expense', 'expense-total'));
    tbody.appendChild(this._buildBalanceRow(monthKeys));

    return tbody;
  },

  _collectIncomeItems(data) {
    const items = [];
    for (const item of data.incomeItems) {
      items.push({
        category: item.category,
        name: item.name,
        renderType: 'income',
        item: item
      });
    }
    for (const stock of (data.stocks || [])) {
      items.push({
        category: '주식',
        name: stock.name,
        renderType: 'stock',
        stock: stock
      });
    }
    return items;
  },

  _collectExpenseItems(data) {
    const items = [];

    for (const item of data.expenseItems) {
      items.push({
        category: item.category,
        name: item.name,
        payDay: item.payDay,
        renderType: 'expense',
        item: item
      });
    }

    for (const card of data.cards) {
      items.push({
        category: '카드대금',
        name: card.name,
        payDay: card.payDay,
        renderType: 'card',
        card: card
      });
    }

    for (const loan of (data.loans || [])) {
      items.push({
        category: '대출',
        name: loan.name,
        payDay: loan.payDay,
        renderType: 'loan',
        loan: loan
      });
    }

    return items;
  },

  _buildExpenseDefault(tbody, allItems, monthKeys, data) {
    for (const cat of EXPENSE_CATEGORIES) {
      const catItems = allItems.filter(i => i.category === cat);
      if (catItems.length === 0) continue;
      catItems.sort((a, b) => a.name.localeCompare(b.name, 'ko') || (a.payDay || 999) - (b.payDay || 999));
      for (let idx = 0; idx < catItems.length; idx++) {
        const rowspan = idx === 0 ? catItems.length : 0;
        tbody.appendChild(this._renderExpenseRow(catItems[idx], monthKeys, data, rowspan));
      }
    }
  },

  _buildExpenseByPayDay(tbody, allItems, monthKeys, data) {
    const base = data.settings.payDayBase || 25;
    const catOrder = {};
    EXPENSE_CATEGORIES.forEach((c, i) => { catOrder[c] = i; });

    allItems.sort((a, b) => {
      const aKey = this._circularPayDayKey(a.payDay, base);
      const bKey = this._circularPayDayKey(b.payDay, base);
      if (aKey !== bKey) return aKey - bKey;
      const aCat = catOrder[a.category] ?? 999;
      const bCat = catOrder[b.category] ?? 999;
      if (aCat !== bCat) return aCat - bCat;
      return a.name.localeCompare(b.name, 'ko');
    });

    for (const entry of allItems) {
      tbody.appendChild(this._renderExpenseRow(entry, monthKeys, data, 1));
    }
  },

  _circularPayDayKey(payDay, base) {
    if (payDay == null) return Infinity;
    return ((payDay - base) % 31 + 31) % 31;
  },

  _renderExpenseRow(entry, monthKeys, data, rowspan) {
    if (entry.renderType === 'card') {
      return this._buildCardBillingRow(entry.card, monthKeys, data, rowspan, entry.category);
    }
    if (entry.renderType === 'loan') {
      return this._buildLoanPaymentRow(entry.loan, monthKeys, data, rowspan, entry.category);
    }
    return this._buildItemRow(entry.item, 'expense', monthKeys, entry.category, rowspan);
  },

  _buildItemRow(item, type, monthKeys, category, rowspan) {
    const tr = document.createElement('tr');
    tr.className = `item-row ${type}-row`;

    let cells = '';
    if (rowspan > 0) {
      const catClass = category === '카드대금' ? ' category-card' : (category === '대출' ? ' category-loan' : '');
      cells += `<td class="sticky-col col-category category-label${catClass}" rowspan="${rowspan}">${category}</td>`;
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
      cells += `<td class="cell expected" data-tooltip="${item.name}" data-month="${mk}" data-type="${type}" data-item="${item.id}" data-field="expected"
                    onclick="BudgetView.editCell(this)">${this._formatNumber(d.expected)}</td>`;
      cells += `<td class="cell actual" data-tooltip="${item.name}" data-month="${mk}" data-type="${type}" data-item="${item.id}" data-field="actual"
                    onclick="BudgetView.editCell(this)">${this._formatNumber(d.actual)}</td>`;
    }

    tr.innerHTML = cells;
    return tr;
  },

  _buildCardBillingRow(card, monthKeys, data, rowspan, category) {
    const sim = DataStore.simulateCard(card);
    const tr = document.createElement('tr');
    tr.className = 'item-row expense-row card-billing-row';

    let cells = '';
    if (rowspan > 0) {
      cells += `<td class="sticky-col col-category category-label category-card" rowspan="${rowspan}">${category}</td>`;
    }
    cells += `<td class="sticky-col col-name item-name">
      <span class="item-label" style="color:${card.color}">${card.name}</span>
    </td>`;
    cells += `<td class="sticky-col col-payday">${card.payDay || ''}</td>`;

    for (const mk of monthKeys) {
      const monthResult = sim.find(r => r.monthKey === mk);
      const billing = monthResult ? monthResult.billing : 0;
      const billingKey = 'card-billing-' + card.id;
      const md = DataStore.ensureMonthData(mk);
      const actualData = md.expense[billingKey] || { expected: 0, actual: 0 };

      cells += `<td class="cell expected card-linked" data-tooltip="${card.name}" data-card-id="${card.id}" data-month="${mk}"
                    onclick="App.navigateToCard('${card.id}', '${mk}')">${this._formatNumber(billing)}</td>`;
      cells += `<td class="cell actual" data-tooltip="${card.name}" data-month="${mk}" data-type="expense" data-item="${billingKey}" data-field="actual"
                    onclick="BudgetView.editCell(this)">${this._formatNumber(actualData.actual)}</td>`;
    }

    tr.innerHTML = cells;
    return tr;
  },

  _buildLoanPaymentRow(loan, monthKeys, data, rowspan, category) {
    const sim = DataStore.simulateLoan(loan);
    const tr = document.createElement('tr');
    tr.className = 'item-row expense-row loan-payment-row';

    let cells = '';
    if (rowspan > 0) {
      cells += `<td class="sticky-col col-category category-label category-loan" rowspan="${rowspan}">${category}</td>`;
    }
    cells += `<td class="sticky-col col-name item-name">
      <span class="item-label" style="color:${loan.color}">${loan.name}</span>
    </td>`;
    cells += `<td class="sticky-col col-payday">${loan.payDay || ''}</td>`;

    for (const mk of monthKeys) {
      const monthResult = sim.find(r => r.monthKey === mk);
      const payment = monthResult ? monthResult.payment : 0;
      const paymentKey = 'loan-payment-' + loan.id;
      const md = DataStore.ensureMonthData(mk);
      const actualData = md.expense[paymentKey] || { expected: 0, actual: 0 };

      cells += `<td class="cell expected loan-linked" data-tooltip="${loan.name}" data-loan-id="${loan.id}" data-month="${mk}"
                    onclick="App.navigateToLoan('${loan.id}', '${mk}')">${this._formatNumber(payment)}</td>`;
      cells += `<td class="cell actual" data-tooltip="${loan.name}" data-month="${mk}" data-type="expense" data-item="${paymentKey}" data-field="actual"
                    onclick="BudgetView.editCell(this)">${this._formatNumber(actualData.actual)}</td>`;
    }

    tr.innerHTML = cells;
    return tr;
  },

  _buildStockIncomeRow(stock, monthKeys, data, rowspan, category) {
    const sim = DataStore.simulateStock(stock);
    const tr = document.createElement('tr');
    tr.className = 'item-row income-row stock-income-row';

    let cells = '';
    if (rowspan > 0) {
      cells += `<td class="sticky-col col-category category-label category-stock" rowspan="${rowspan}">${category}</td>`;
    }
    cells += `<td class="sticky-col col-name item-name">
      <span class="item-label" style="color:${stock.color}">${stock.name}</span>
    </td>`;
    cells += `<td class="sticky-col col-payday"></td>`;

    for (const mk of monthKeys) {
      const monthResult = sim.find(r => r.monthKey === mk);
      const income = monthResult ? monthResult.sellAmount : 0;
      const incomeKey = 'stock-income-' + stock.id;
      const md = DataStore.ensureMonthData(mk);
      const actualData = md.income[incomeKey] || { expected: 0, actual: 0 };

      cells += `<td class="cell expected stock-linked" data-tooltip="${stock.name}" data-stock-id="${stock.id}" data-month="${mk}"
                    onclick="App.navigateToStock('${stock.id}', '${mk}')">${this._formatNumber(income)}</td>`;
      cells += `<td class="cell actual" data-tooltip="${stock.name}" data-month="${mk}" data-type="income" data-item="${incomeKey}" data-field="actual"
                    onclick="BudgetView.editCell(this)">${this._formatNumber(actualData.actual)}</td>`;
    }

    tr.innerHTML = cells;
    return tr;
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
        if (next && next.classList.contains('cell') && !next.classList.contains('card-linked') && !next.classList.contains('stock-linked')) {
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
    if (!container) return;
    const table = container.querySelector('.budget-table');
    if (!table) { this.render(container); return; }

    const monthKeys = DataStore.getMonthKeys();

    const updateRow = (row, getExp, getAct, formatClass) => {
      if (!row) return;
      const cells = row.querySelectorAll('.cell');
      for (let i = 0; i < monthKeys.length; i++) {
        const exp = getExp(monthKeys[i]);
        const act = getAct(monthKeys[i]);
        const expCell = cells[i * 2];
        const actCell = cells[i * 2 + 1];
        if (expCell) expCell.textContent = this._formatNumber(exp);
        if (actCell) actCell.textContent = this._formatNumber(act);
        if (formatClass) {
          if (expCell) { expCell.classList.toggle('positive', exp >= 0); expCell.classList.toggle('negative', exp < 0); }
          if (actCell) { actCell.classList.toggle('positive', act >= 0); actCell.classList.toggle('negative', act < 0); }
        }
      }
    };

    const incomeTotal = table.querySelector('.income-total');
    const expenseTotal = table.querySelector('.expense-total');
    const balanceRow = table.querySelector('.balance-row');

    updateRow(incomeTotal,
      mk => DataStore.getMonthTotals(mk).incomeExpected,
      mk => DataStore.getMonthTotals(mk).incomeActual);
    updateRow(expenseTotal,
      mk => DataStore.getMonthTotals(mk).expenseExpected,
      mk => DataStore.getMonthTotals(mk).expenseActual);
    updateRow(balanceRow,
      mk => DataStore.getMonthTotals(mk).balanceExpected,
      mk => DataStore.getMonthTotals(mk).balanceActual, true);
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
    const categories = type === 'income' ? INCOME_CATEGORIES.filter(c => c !== '주식') : EXPENSE_CATEGORIES.filter(c => c !== '카드대금');
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

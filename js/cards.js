const CardsView = {
  render(container) {
    const data = DataStore.getData();
    container.innerHTML = '';

    const toolbar = document.createElement('div');
    toolbar.className = 'toolbar';
    toolbar.innerHTML = `<button onclick="CardsView.addCard()" class="btn btn-sm">+ 카드 추가</button>`;
    container.appendChild(toolbar);

    for (const card of data.cards) {
      container.appendChild(this._renderCard(card));
    }
  },

  _renderCard(card) {
    const section = document.createElement('div');
    section.className = 'card-section';
    section.dataset.cardId = card.id;
    section.style.borderLeftColor = card.color;

    const header = document.createElement('div');
    header.className = 'card-header';
    header.innerHTML = `
      <h3 style="color: ${card.color}">${card.name}</h3>
      <div class="card-meta">
        <span>월이용금액: <strong>${this._formatNumber(card.monthlyUsage)}</strong></span>
        <span>최소결제비율: <strong>${(card.minPaymentRatio * 100).toFixed(0)}%</strong></span>
        <span>이자율: <strong>${(card.interestRate * 100).toFixed(3)}%</strong></span>
        <span>기준월: <strong>${card.baseMonth ? DataStore.getMonthLabel(card.baseMonth) : '-'}</strong></span>
        <span>결제일: <strong>${card.payDay ? card.payDay + '일' : '-'}</strong></span>
        <button class="btn btn-sm" onclick="CardsView.editCard('${card.id}')">설정</button>
        <button class="btn btn-sm btn-danger" onclick="CardsView.removeCard('${card.id}')">삭제</button>
      </div>
    `;
    section.appendChild(header);

    const results = DataStore.simulateCard(card);
    const wrapper = document.createElement('div');
    wrapper.className = 'table-wrapper';
    wrapper.appendChild(this._buildTable(card, results));
    section.appendChild(wrapper);

    return section;
  },

  _buildTable(card, results) {
    const table = document.createElement('table');
    table.className = 'card-table';

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headerRow.innerHTML = '<th class="sticky-col">항목</th>';
    for (const r of results) {
      headerRow.innerHTML += `<th data-card-id="${card.id}" data-month="${r.monthKey}">${DataStore.getMonthLabel(r.monthKey)}</th>`;
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    const rows = [
      { label: '청구액(④+⑦)', key: 'billing', editable: false, className: 'highlight-row' },
      { label: '① 월이용금액', key: 'usage', editable: true, overrideKey: 'monthlyUsage' },
      { label: '② 이월결제금액', key: 'carryOver', editable: false },
      { label: '③ 최소결제비율', key: 'minPaymentRatio', editable: true, overrideKey: 'minPaymentRatio', format: 'percent' },
      { label: '④ 최소결제금액[(①+②)×③]', key: 'minPayment', editable: false },
      { label: '⑤ 잔여결제금액[(①+②)-④]', key: 'remaining', editable: false },
      { label: '⑥ 이자율', key: 'interestRate', editable: true, overrideKey: 'interestRate', format: 'percent' },
      { label: '⑦ 이용수수료[⑤×⑥/12]', key: 'fee', editable: false, className: 'interest-row' },
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
          tr.innerHTML += `<td class="cell editable" data-card="${card.id}" data-month="${r.monthKey}" data-override="${rowDef.overrideKey}" data-format="${rowDef.format || ''}"
                               onclick="CardsView.editCardCell(this)">${display}</td>`;
        } else {
          const cls = rowDef.key === 'remaining' && val > 0 ? 'negative' : '';
          tr.innerHTML += `<td class="cell ${cls}">${display}</td>`;
        }
      }
      tbody.appendChild(tr);
    }

    table.appendChild(tbody);
    return table;
  },

  editCardCell(td) {
    if (td.querySelector('input')) return;

    const currentText = td.textContent.trim();
    const { card: cardId, month, override: overrideKey } = td.dataset;
    const isPercent = overrideKey === 'minPaymentRatio' || overrideKey === 'interestRate';
    const currentVal = isPercent
      ? parseFloat(currentText.replace('%', ''))
      : this._parseNumber(currentText);

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'cell-input';
    input.value = currentVal;
    if (isPercent) input.placeholder = '%';
    input.addEventListener('blur', () => {
      const raw = parseFloat(input.value) || 0;
      const val = isPercent ? raw / 100 : raw;
      DataStore.setCardMonthlyOverride(cardId, month, overrideKey, val);
      this._refresh();
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') input.blur();
      if (e.key === 'Escape') td.textContent = currentText;
    });

    td.textContent = '';
    td.appendChild(input);
    input.focus();
    input.select();
  },

  addCard() {
    const name = prompt('카드 이름:');
    if (!name) return;

    const usage = Number(prompt('월 필이용금액:', '200000')) || 200000;
    const ratio = Number(prompt('최소결제비율 (0~1):', '0.1')) || 0.1;
    const rate = Number(prompt('연이자율 (0~1):', '0.18')) || 0.18;
    const initial = Number(prompt('초기 이월잔액:', '0')) || 0;
    const baseMonthStr = prompt('기준월 (YYYY-MM, 예: 2026-09):', '');
    const baseMonth = baseMonthStr && /^\d{4}-\d{2}$/.test(baseMonthStr.trim()) ? baseMonthStr.trim() : null;
    const payDayStr = prompt('결제일 (없으면 빈칸):', '');
    const payDay = payDayStr ? Number(payDayStr) || null : null;

    const colors = ['#FFD700', '#4CAF50', '#03A9F4', '#FF5722', '#9C27B0', '#795548'];
    const data = DataStore.getData();
    const color = colors[data.cards.length % colors.length];

    DataStore.addCard(name, usage, ratio, rate, initial, color, payDay, baseMonth);
    this._refresh();
  },

  editCard(cardId) {
    const data = DataStore.getData();
    const card = data.cards.find(c => c.id === cardId);
    if (!card) return;

    const name = prompt('카드 이름:', card.name);
    if (name) DataStore.updateCardField(cardId, 'name', name);

    const usage = prompt('월 필이용금액:', card.monthlyUsage);
    if (usage !== null) DataStore.updateCardField(cardId, 'monthlyUsage', Number(usage) || 0);

    const ratio = prompt('최소결제비율 (0~1):', card.minPaymentRatio);
    if (ratio !== null) DataStore.updateCardField(cardId, 'minPaymentRatio', Number(ratio) || 0.1);

    const rate = prompt('연이자율 (0~1):', card.interestRate);
    if (rate !== null) DataStore.updateCardField(cardId, 'interestRate', Number(rate) || 0);

    const initial = prompt('초기 이월잔액:', card.initialCarryOver);
    if (initial !== null) DataStore.updateCardField(cardId, 'initialCarryOver', Number(initial) || 0);

    const baseMonthStr = prompt('기준월 (YYYY-MM):', card.baseMonth || '');
    if (baseMonthStr !== null) {
      DataStore.updateCardField(cardId, 'baseMonth', baseMonthStr.trim() && /^\d{4}-\d{2}$/.test(baseMonthStr.trim()) ? baseMonthStr.trim() : null);
    }

    const payDayStr = prompt('결제일:', card.payDay || '');
    if (payDayStr !== null) {
      DataStore.updateCardField(cardId, 'payDay', payDayStr.trim() === '' ? null : (Number(payDayStr) || null));
    }

    this._refresh();
  },

  removeCard(cardId) {
    if (!confirm('이 카드를 삭제하시겠습니까?')) return;
    DataStore.removeCard(cardId);
    this._refresh();
  },

  _refresh() {
    const container = document.getElementById('tab-cards');
    if (container) this.render(container);
  },

  _formatNumber(num) {
    if (num === 0 || num === null || num === undefined) return '₩0';
    return '₩' + Math.round(num).toLocaleString('ko-KR');
  },

  _parseNumber(str) {
    if (!str) return 0;
    const cleaned = String(str).replace(/[₩,%\s]/g, '');
    const num = Number(cleaned);
    return isNaN(num) ? 0 : num;
  },

  focusCardMonth(cardId, monthKey) {
    const section = document.querySelector(`.card-section[data-card-id="${cardId}"]`);
    if (!section) return;
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });

    const th = section.querySelector(`th[data-card-id="${cardId}"][data-month="${monthKey}"]`);
    if (th) {
      th.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      th.classList.add('focus-highlight');
      const col = th.cellIndex;
      section.querySelectorAll('td, th').forEach(cell => {
        if (cell.cellIndex === col) cell.classList.add('focus-highlight');
      });
      setTimeout(() => {
        section.querySelectorAll('.focus-highlight').forEach(c => c.classList.remove('focus-highlight'));
      }, 2000);
    }
  }
};

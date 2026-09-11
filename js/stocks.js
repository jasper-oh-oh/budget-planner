const StocksView = {
  render(container) {
    const data = DataStore.getData();
    container.innerHTML = '';

    const toolbar = document.createElement('div');
    toolbar.className = 'toolbar';
    toolbar.innerHTML = `<button onclick="StocksView.addStock()" class="btn btn-sm">+ 종목 추가</button>`;
    container.appendChild(toolbar);

    if (data.stocks.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-message';
      empty.textContent = '등록된 종목이 없습니다. "종목 추가" 버튼을 클릭하여 시작하세요.';
      container.appendChild(empty);
      return;
    }

    for (const stock of data.stocks) {
      container.appendChild(this._renderStock(stock));
    }
  },

  _renderStock(stock) {
    const section = document.createElement('div');
    section.className = 'card-section stock-section';
    section.dataset.stockId = stock.id;
    section.style.borderLeftColor = stock.color;

    const header = document.createElement('div');
    header.className = 'card-header';
    const initQty = stock.initialHoldingQty || 0;
    const initPrice = stock.initialAvgPrice || 0;
    const initInfo = initQty > 0
      ? `<span>기간 전 보유: <strong>${initQty.toLocaleString('ko-KR')}주</strong></span>
         <span>평균단가: <strong>${this._formatNumber(initPrice)}</strong></span>`
      : '';
    header.innerHTML = `
      <h3 style="color: ${stock.color}">${stock.name}</h3>
      <div class="card-meta">
        ${initInfo}
        <button class="btn btn-sm" onclick="StocksView.editStock('${stock.id}')">설정</button>
        <button class="btn btn-sm btn-danger" onclick="StocksView.removeStock('${stock.id}')">삭제</button>
      </div>
    `;
    section.appendChild(header);

    const results = DataStore.simulateStock(stock);
    const wrapper = document.createElement('div');
    wrapper.className = 'table-wrapper';
    wrapper.appendChild(this._buildTable(stock, results));
    section.appendChild(wrapper);

    return section;
  },

  _buildTable(stock, results) {
    const table = document.createElement('table');
    table.className = 'card-table';

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headerRow.innerHTML = '<th class="sticky-col">항목</th>';
    for (const r of results) {
      headerRow.innerHTML += `<th data-stock-id="${stock.id}" data-month="${r.monthKey}">${DataStore.getMonthLabel(r.monthKey)}</th>`;
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    const rows = [
      { label: '매도 총액(④×⑤)', key: 'sellAmount', editable: false, className: 'highlight-row' },
      { label: '① 매입 수량', key: 'buyQty', editable: true, overrideKey: 'buyQty', format: 'qty' },
      { label: '② 매입 단가', key: 'buyPrice', editable: true, overrideKey: 'buyPrice' },
      { label: '③ 매입 총액(①×②)', key: 'buyAmount', editable: false },
      { label: '④ 매도 수량', key: 'sellQty', editable: true, overrideKey: 'sellQty', format: 'qty' },
      { label: '⑤ 매도 단가', key: 'sellPrice', editable: true, overrideKey: 'sellPrice' },
      { label: '보유 수량', key: 'holdingQty', editable: false, format: 'qty' },
      { label: '누적 투자금', key: 'totalInvested', editable: false },
    ];

    for (const rowDef of rows) {
      const tr = document.createElement('tr');
      if (rowDef.className) tr.className = rowDef.className;

      tr.innerHTML = `<td class="sticky-col row-label">${rowDef.label}</td>`;

      for (const r of results) {
        const val = r[rowDef.key];
        let display;
        if (rowDef.format === 'qty') {
          display = val > 0 ? val.toLocaleString('ko-KR') + '주' : '-';
        } else {
          display = this._formatNumber(val);
        }

        if (rowDef.editable) {
          tr.innerHTML += `<td class="cell editable" data-stock="${stock.id}" data-month="${r.monthKey}" data-override="${rowDef.overrideKey}" data-format="${rowDef.format || ''}"
                               onclick="StocksView.editStockCell(this)">${display}</td>`;
        } else {
          tr.innerHTML += `<td class="cell">${display}</td>`;
        }
      }
      tbody.appendChild(tr);
    }

    table.appendChild(tbody);
    return table;
  },

  editStockCell(td) {
    if (td.querySelector('input')) return;

    const currentText = td.textContent.trim();
    const { stock: stockId, month, override: overrideKey, format } = td.dataset;
    const isQty = format === 'qty';
    const currentVal = isQty
      ? parseInt(currentText.replace(/[주,\s]/g, '')) || 0
      : this._parseNumber(currentText);

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'cell-input';
    input.value = currentVal || '';
    input.addEventListener('blur', () => {
      const raw = isQty ? (parseInt(input.value) || 0) : (parseFloat(input.value.replace(/[,\s]/g, '')) || 0);
      DataStore.setStockMonthlyOverride(stockId, month, overrideKey, raw);
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

  addStock() {
    const name = prompt('종목 이름:');
    if (!name) return;

    const initialQty = Number(prompt('기간 이전 보유 수량 (없으면 0):', '0')) || 0;
    const initialPrice = Number(prompt('기간 이전 평균 매입 단가 (없으면 0):', '0')) || 0;

    const colors = ['#E91E63', '#9C27B0', '#673AB7', '#3F51B5', '#00BCD4', '#FF9800'];
    const data = DataStore.getData();
    const color = colors[data.stocks.length % colors.length];

    DataStore.addStock(name, color, initialQty, initialPrice);
    this._refresh();
  },

  editStock(stockId) {
    const data = DataStore.getData();
    const stock = data.stocks.find(s => s.id === stockId);
    if (!stock) return;

    const name = prompt('종목 이름:', stock.name);
    if (name) DataStore.updateStockField(stockId, 'name', name);

    const qtyStr = prompt('기간 이전 보유 수량:', stock.initialHoldingQty || 0);
    if (qtyStr !== null) DataStore.updateStockField(stockId, 'initialHoldingQty', Number(qtyStr) || 0);

    const priceStr = prompt('기간 이전 평균 매입 단가:', stock.initialAvgPrice || 0);
    if (priceStr !== null) DataStore.updateStockField(stockId, 'initialAvgPrice', Number(priceStr) || 0);

    this._refresh();
  },

  removeStock(stockId) {
    if (!confirm('이 종목을 삭제하시겠습니까?')) return;
    DataStore.removeStock(stockId);
    this._refresh();
  },

  _refresh() {
    const container = document.getElementById('tab-stocks');
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

  focusStockMonth(stockId, monthKey) {
    const section = document.querySelector(`.stock-section[data-stock-id="${stockId}"]`);
    if (!section) return;
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });

    const th = section.querySelector(`th[data-stock-id="${stockId}"][data-month="${monthKey}"]`);
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

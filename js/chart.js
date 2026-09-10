const DashboardView = {
  render(container) {
    container.innerHTML = '';

    const grid = document.createElement('div');
    grid.className = 'dashboard-grid';

    grid.appendChild(this._createSummaryCards());
    grid.appendChild(this._createChart('월별 수입/지출', this._drawBudgetChart.bind(this)));
    grid.appendChild(this._createChart('월별 결산 추이', this._drawBalanceChart.bind(this)));
    grid.appendChild(this._createChart('신용카드 잔액 추이', this._drawCardChart.bind(this)));

    container.appendChild(grid);
  },

  _createSummaryCards() {
    const data = DataStore.getData();
    const monthKeys = DataStore.getMonthKeys();
    const now = new Date();
    const currentKey = DataStore.monthKey(now.getFullYear(), now.getMonth() + 1);
    const mk = monthKeys.includes(currentKey) ? currentKey : monthKeys[monthKeys.length - 1];
    const totals = DataStore.getMonthTotals(mk);

    let totalCardDebt = 0;
    for (const card of data.cards) {
      totalCardDebt += card.initialCarryOver;
    }

    const div = document.createElement('div');
    div.className = 'summary-cards';
    div.innerHTML = `
      <div class="summary-card">
        <div class="summary-label">이번 달 예상 수입</div>
        <div class="summary-value income">${this._fmt(totals.incomeExpected)}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">이번 달 예상 지출</div>
        <div class="summary-value expense">${this._fmt(totals.expenseExpected)}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">이번 달 예상 결산</div>
        <div class="summary-value ${totals.balanceExpected >= 0 ? 'income' : 'expense'}">${this._fmt(totals.balanceExpected)}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">신용카드 총 이월잔액</div>
        <div class="summary-value expense">${this._fmt(totalCardDebt)}</div>
      </div>
    `;
    return div;
  },

  _createChart(title, drawFn) {
    const div = document.createElement('div');
    div.className = 'chart-container';
    div.innerHTML = `<h3 class="chart-title">${title}</h3>`;
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 300;
    div.appendChild(canvas);

    requestAnimationFrame(() => {
      const rect = div.getBoundingClientRect();
      canvas.width = Math.max(rect.width - 40, 600);
      canvas.height = 280;
      drawFn(canvas);
    });

    return div;
  },

  _drawBudgetChart(canvas) {
    const ctx = canvas.getContext('2d');
    const monthKeys = DataStore.getMonthKeys();
    const data = monthKeys.map(mk => DataStore.getMonthTotals(mk));

    const labels = monthKeys.map(mk => DataStore.getMonthLabel(mk));
    const incomes = data.map(d => d.incomeExpected);
    const expenses = data.map(d => d.expenseExpected);

    const maxVal = Math.max(...incomes, ...expenses, 1);
    this._drawBarChart(ctx, canvas, labels, [
      { data: incomes, color: '#4CAF50', label: '수입' },
      { data: expenses, color: '#F44336', label: '지출' }
    ], maxVal);
  },

  _drawBalanceChart(canvas) {
    const ctx = canvas.getContext('2d');
    const monthKeys = DataStore.getMonthKeys();
    const labels = monthKeys.map(mk => DataStore.getMonthLabel(mk));
    const balances = monthKeys.map(mk => DataStore.getMonthTotals(mk).balanceExpected);

    let cumulative = [];
    let sum = 0;
    for (const b of balances) {
      sum += b;
      cumulative.push(sum);
    }

    this._drawLineChart(ctx, canvas, labels, [
      { data: balances, color: '#2196F3', label: '월별 결산' },
      { data: cumulative, color: '#FF9800', label: '누적 잔액' }
    ]);
  },

  _drawCardChart(canvas) {
    const ctx = canvas.getContext('2d');
    const data = DataStore.getData();
    const monthKeys = DataStore.getMonthKeys();
    const labels = monthKeys.map(mk => DataStore.getMonthLabel(mk));

    const series = data.cards.map(card => {
      const sim = DataStore.simulateCard(card);
      return {
        data: sim.map(s => s.carryOver),
        color: card.color,
        label: card.name
      };
    });

    this._drawLineChart(ctx, canvas, labels, series);
  },

  _drawBarChart(ctx, canvas, labels, series, maxVal) {
    const W = canvas.width, H = canvas.height;
    const pad = { top: 40, right: 20, bottom: 50, left: 80 };
    const chartW = W - pad.left - pad.right;
    const chartH = H - pad.top - pad.bottom;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#1e1e2e';
    ctx.fillRect(0, 0, W, H);

    const n = labels.length;
    const groupW = chartW / n;
    const barW = groupW / (series.length + 1);

    for (let i = 0; i <= 5; i++) {
      const y = pad.top + chartH - (chartH * i / 5);
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(W - pad.right, y);
      ctx.stroke();

      ctx.fillStyle = '#888';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(this._shortNum(maxVal * i / 5), pad.left - 8, y + 4);
    }

    for (let i = 0; i < n; i++) {
      const x = pad.left + i * groupW + groupW / 2;
      ctx.fillStyle = '#888';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(labels[i], x, H - pad.bottom + 18);

      for (let s = 0; s < series.length; s++) {
        const val = series[s].data[i];
        const barH = (val / maxVal) * chartH;
        const bx = pad.left + i * groupW + (s + 0.5) * barW;
        const by = pad.top + chartH - barH;
        ctx.fillStyle = series[s].color;
        ctx.fillRect(bx, by, barW * 0.8, barH);
      }
    }

    this._drawLegend(ctx, series, W, pad.top - 10);
  },

  _drawLineChart(ctx, canvas, labels, series) {
    const W = canvas.width, H = canvas.height;
    const pad = { top: 40, right: 20, bottom: 50, left: 80 };
    const chartW = W - pad.left - pad.right;
    const chartH = H - pad.top - pad.bottom;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#1e1e2e';
    ctx.fillRect(0, 0, W, H);

    const allVals = series.flatMap(s => s.data);
    const minVal = Math.min(0, ...allVals);
    const maxVal = Math.max(...allVals, 1);
    const range = maxVal - minVal || 1;

    for (let i = 0; i <= 5; i++) {
      const val = minVal + range * i / 5;
      const y = pad.top + chartH - (chartH * i / 5);
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(W - pad.right, y);
      ctx.stroke();

      ctx.fillStyle = '#888';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(this._shortNum(val), pad.left - 8, y + 4);
    }

    if (minVal < 0) {
      const zeroY = pad.top + chartH - ((0 - minVal) / range) * chartH;
      ctx.strokeStyle = '#666';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(pad.left, zeroY);
      ctx.lineTo(W - pad.right, zeroY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    const n = labels.length;
    for (let i = 0; i < n; i++) {
      const x = pad.left + (i / (n - 1)) * chartW;
      ctx.fillStyle = '#888';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(labels[i], x, H - pad.bottom + 18);
    }

    for (const s of series) {
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const x = pad.left + (i / (n - 1)) * chartW;
        const y = pad.top + chartH - ((s.data[i] - minVal) / range) * chartH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      for (let i = 0; i < n; i++) {
        const x = pad.left + (i / (n - 1)) * chartW;
        const y = pad.top + chartH - ((s.data[i] - minVal) / range) * chartH;
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    this._drawLegend(ctx, series, W, pad.top - 10);
  },

  _drawLegend(ctx, series, canvasW, y) {
    ctx.font = '12px sans-serif';
    let x = canvasW / 2 - (series.length * 80) / 2;
    for (const s of series) {
      ctx.fillStyle = s.color;
      ctx.fillRect(x, y - 8, 14, 10);
      ctx.fillStyle = '#ccc';
      ctx.textAlign = 'left';
      ctx.fillText(s.label, x + 18, y);
      x += 100;
    }
  },

  _shortNum(val) {
    const abs = Math.abs(val);
    const sign = val < 0 ? '-' : '';
    if (abs >= 100000000) return sign + (abs / 100000000).toFixed(1) + '억';
    if (abs >= 10000) return sign + (abs / 10000).toFixed(0) + '만';
    return sign + Math.round(abs).toLocaleString();
  },

  _fmt(num) {
    if (!num) return '₩0';
    return '₩' + Math.round(num).toLocaleString('ko-KR');
  }
};

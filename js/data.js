const STORAGE_KEY = 'financial-management-data';

const INCOME_CATEGORIES = ['급여', '부수입', '주식'];
const EXPENSE_CATEGORIES = ['주거비', '보험', '교육', '생활비', '대출', '투자/저축', '카드대금'];

const DEFAULT_DATA = {
  settings: {
    startMonth: 9,
    startYear: 2025,
    months: 13,
    payDayBase: 25
  },
  incomeItems: [
    { id: 'inc-1', name: '급여', category: '급여', defaultAmount: 0 },
    { id: 'inc-2', name: '부수입', category: '부수입', defaultAmount: 0 }
  ],
  expenseItems: [
    { id: 'exp-1', name: '주택청약', category: '주거비', payDay: 27, defaultAmount: 50000 },
    { id: 'exp-2', name: '관리비', category: '주거비', payDay: 29, defaultAmount: 50000 },
    { id: 'exp-3', name: '전기(한전)', category: '주거비', payDay: 30, defaultAmount: 70000 },
    { id: 'exp-17', name: '인터넷', category: '주거비', payDay: null, defaultAmount: 0 },
    { id: 'exp-18', name: '가스', category: '주거비', payDay: null, defaultAmount: 50000 },
    { id: 'exp-8', name: '순실보험금', category: '보험', payDay: null, defaultAmount: 0 },
    { id: 'exp-11', name: '운전자보험(메시)', category: '보험', payDay: 5, defaultAmount: 11000 },
    { id: 'exp-12', name: '운전자보험(엄비)', category: '보험', payDay: 5, defaultAmount: 5000 },
    { id: 'exp-13', name: '한화생명(급여포함)', category: '보험', payDay: null, defaultAmount: 120000 },
    { id: 'exp-14', name: '한화생명(사랑스마트넥터)', category: '보험', payDay: null, defaultAmount: 0 },
    { id: 'exp-15', name: '한화생명(i-Care)', category: '보험', payDay: null, defaultAmount: 0 },
    { id: 'exp-5', name: '오케스트라', category: '교육', payDay: null, defaultAmount: 100000 },
    { id: 'exp-6', name: '수업료', category: '교육', payDay: null, defaultAmount: 1800000 },
    { id: 'exp-7', name: '추가수업료', category: '교육', payDay: null, defaultAmount: 0 },
    { id: 'exp-4', name: '네이버/구독', category: '생활비', payDay: null, defaultAmount: 600000 },
    { id: 'exp-9', name: '헬스', category: '생활비', payDay: null, defaultAmount: 70000 },
    { id: 'exp-10', name: '보험연금대출', category: '대출', payDay: 31, defaultAmount: 30000 },
    { id: 'exp-16', name: '미래에셋', category: '투자/저축', payDay: null, defaultAmount: 70000 }
  ],
  monthlyData: {},
  cards: [
    {
      id: 'card-1',
      name: '현대카드',
      color: '#FFD700',
      monthlyUsage: 200000,
      minPaymentRatio: 0.1,
      interestRate: 0.196,
      initialCarryOver: 28000000,
      baseMonth: '2026-09',
      payDay: null,
      monthlyOverrides: {}
    },
    {
      id: 'card-2',
      name: '농협카드',
      color: '#4CAF50',
      monthlyUsage: 200000,
      minPaymentRatio: 0.1,
      interestRate: 0.192,
      initialCarryOver: 10450202,
      baseMonth: '2026-09',
      payDay: null,
      monthlyOverrides: {}
    },
    {
      id: 'card-3',
      name: '하나카드',
      color: '#03A9F4',
      monthlyUsage: 2000000,
      minPaymentRatio: 0.2,
      interestRate: 0.1442,
      initialCarryOver: 1000000,
      baseMonth: '2026-09',
      payDay: null,
      monthlyOverrides: {}
    }
  ],
  loans: [
    {
      id: 'loan-1', name: '농협 주택담보대출', color: '#4CAF50',
      principal: 300000000, startYear: 2019, startMonth: 4,
      termYears: 30, annualRate: 0.035, repaymentType: 'amortized',
      rateType: 'variable', rateOverrides: {}, payDay: null
    },
    {
      id: 'loan-2', name: '하나은행 신용대출(1)', color: '#03A9F4',
      principal: 120000000, startYear: 2025, startMonth: 8,
      termYears: 1, annualRate: 0.05, repaymentType: 'bullet',
      rateType: 'fixed', rateOverrides: {}, payDay: null
    },
    {
      id: 'loan-3', name: '하나은행 신용대출(2)', color: '#29B6F6',
      principal: 8000000, startYear: 2025, startMonth: 8,
      termYears: 1, annualRate: 0.05, repaymentType: 'bullet',
      rateType: 'fixed', rateOverrides: {}, payDay: null
    },
    {
      id: 'loan-4', name: 'BMW 자동차할부', color: '#607D8B',
      principal: 35000000, startYear: 2022, startMonth: 7,
      termYears: 7, annualRate: 0.04, repaymentType: 'amortized',
      rateType: 'fixed', rateOverrides: {}, payDay: null
    },
    {
      id: 'loan-5', name: '현대캐피탈 자동차할부', color: '#FF7043',
      principal: 20000000, startYear: 2025, startMonth: 4,
      termYears: 5, annualRate: 0.05, repaymentType: 'amortized',
      rateType: 'fixed', rateOverrides: {}, payDay: null
    }
  ],
  stocks: []
};

const REPAYMENT_LABELS = {
  amortized: '원리금균등',
  equalPrincipal: '원금균등',
  bullet: '만기일시'
};

const DataStore = {
  _data: null,

  load() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        this._data = JSON.parse(raw);
        this._migrate();
      } catch {
        this._data = JSON.parse(JSON.stringify(DEFAULT_DATA));
      }
    } else {
      this._data = JSON.parse(JSON.stringify(DEFAULT_DATA));
      this._initMonthlyData(true);
    }
    return this._data;
  },

  _migrate() {
    const def = DEFAULT_DATA;
    if (!this._data.settings) this._data.settings = { ...def.settings };
    if (!this._data.incomeItems) this._data.incomeItems = [...def.incomeItems];
    if (!this._data.expenseItems) this._data.expenseItems = [...def.expenseItems];
    if (!this._data.monthlyData) this._data.monthlyData = {};
    if (!this._data.cards) this._data.cards = [...def.cards];
    if (!this._data.loans) this._data.loans = JSON.parse(JSON.stringify(def.loans));
    for (const loan of this._data.loans) {
      if (!loan.rateType) loan.rateType = 'fixed';
      if (!loan.rateOverrides) loan.rateOverrides = {};
      if (!loan.rateHistory) loan.rateHistory = [];
    }
    if (!this._data.stocks) this._data.stocks = [];
    for (const stock of this._data.stocks) {
      if (stock.initialHoldingQty === undefined) stock.initialHoldingQty = 0;
      if (stock.initialAvgPrice === undefined) stock.initialAvgPrice = 0;
    }
    if (this._data.settings.payDayBase === undefined) this._data.settings.payDayBase = 25;
    for (const card of this._data.cards) {
      if (card.payDay === undefined) card.payDay = null;
      if (card.baseMonth === undefined) card.baseMonth = '2026-09';
    }
    for (const loan of this._data.loans) {
      if (loan.payDay === undefined) loan.payDay = null;
    }
    for (const item of this._data.incomeItems) {
      if (!item.category) item.category = INCOME_CATEGORIES[0];
    }
    for (const item of this._data.expenseItems) {
      if (!item.category) item.category = '생활비';
    }
  },

  save() {
    this._data._lastModified = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this._data));
    if (typeof CloudSync !== 'undefined') CloudSync.schedulePush(this._data);
  },

  getData() {
    if (!this._data) this.load();
    return this._data;
  },

  _initMonthlyData(skipSave) {
    const { startMonth, startYear, months } = this._data.settings;
    for (let i = 0; i < months; i++) {
      const m = (startMonth - 1 + i) % 12 + 1;
      const y = startYear + Math.floor((startMonth - 1 + i) / 12);
      const key = this.monthKey(y, m);
      if (!this._data.monthlyData[key]) {
        this._data.monthlyData[key] = this._createMonthEntry();
      }
    }
    if (!skipSave) this.save();
  },

  _createMonthEntry() {
    const entry = { income: {}, expense: {} };
    for (const item of this._data.incomeItems) {
      entry.income[item.id] = { expected: item.defaultAmount, actual: 0 };
    }
    for (const item of this._data.expenseItems) {
      entry.expense[item.id] = { expected: item.defaultAmount, actual: 0 };
    }
    return entry;
  },

  monthKey(year, month) {
    return `${year}-${String(month).padStart(2, '0')}`;
  },

  getMonthKeys() {
    const { startMonth, startYear, months } = this._data.settings;
    const keys = [];
    for (let i = 0; i < months; i++) {
      const m = (startMonth - 1 + i) % 12 + 1;
      const y = startYear + Math.floor((startMonth - 1 + i) / 12);
      keys.push(this.monthKey(y, m));
    }
    return keys;
  },

  getMonthLabel(key) {
    const [y, m] = key.split('-');
    return `${y}.${m}`;
  },

  ensureMonthData(key) {
    if (!this._data.monthlyData[key]) {
      this._data.monthlyData[key] = this._createMonthEntry();
    }
    const md = this._data.monthlyData[key];
    for (const item of this._data.incomeItems) {
      if (!md.income[item.id]) md.income[item.id] = { expected: item.defaultAmount, actual: 0 };
    }
    for (const item of this._data.expenseItems) {
      if (!md.expense[item.id]) md.expense[item.id] = { expected: item.defaultAmount, actual: 0 };
    }
    return md;
  },

  updateCell(monthKey, type, itemId, field, value) {
    const md = this.ensureMonthData(monthKey);
    const section = type === 'income' ? md.income : md.expense;
    if (!section[itemId]) section[itemId] = { expected: 0, actual: 0 };
    section[itemId][field] = value;
    this.save();
  },

  getCardBillingForMonth(monthKey) {
    const billings = [];
    for (const card of this._data.cards) {
      const sim = this.simulateCard(card);
      const monthResult = sim.find(r => r.monthKey === monthKey);
      billings.push({
        cardId: card.id,
        cardName: card.name,
        color: card.color,
        billing: monthResult ? monthResult.billing : 0
      });
    }
    return billings;
  },

  getCardBillingTotal(monthKey) {
    const billings = this.getCardBillingForMonth(monthKey);
    return billings.reduce((sum, b) => sum + b.billing, 0);
  },

  getCardActualForMonth(monthKey) {
    const md = this.ensureMonthData(monthKey);
    let total = 0;
    for (const card of this._data.cards) {
      const key = 'card-billing-' + card.id;
      const d = md.expense[key];
      if (d) total += d.actual;
    }
    return total;
  },

  getMonthTotals(monthKey) {
    const md = this.ensureMonthData(monthKey);
    let incomeExp = 0, incomeAct = 0, expenseExp = 0, expenseAct = 0;
    for (const item of this._data.incomeItems) {
      const d = md.income[item.id] || { expected: 0, actual: 0 };
      incomeExp += d.expected;
      incomeAct += d.actual;
    }
    for (const item of this._data.expenseItems) {
      const d = md.expense[item.id] || { expected: 0, actual: 0 };
      expenseExp += d.expected;
      expenseAct += d.actual;
    }
    const cardBillingExp = this.getCardBillingTotal(monthKey);
    const cardBillingAct = this.getCardActualForMonth(monthKey);
    expenseExp += cardBillingExp;
    expenseAct += cardBillingAct;
    const loanPaymentExp = this.getLoanPaymentTotal(monthKey);
    const loanPaymentAct = this.getLoanActualForMonth(monthKey);
    expenseExp += loanPaymentExp;
    expenseAct += loanPaymentAct;
    const stockIncomeExp = this.getStockIncomeTotal(monthKey);
    const stockIncomeAct = this.getStockActualForMonth(monthKey);
    incomeExp += stockIncomeExp;
    incomeAct += stockIncomeAct;
    return {
      incomeExpected: incomeExp,
      incomeActual: incomeAct,
      expenseExpected: expenseExp,
      expenseActual: expenseAct,
      balanceExpected: incomeExp - expenseExp,
      balanceActual: incomeAct - expenseAct
    };
  },

  addIncomeItem(name, category, defaultAmount = 0) {
    const id = 'inc-' + Date.now();
    this._data.incomeItems.push({ id, name, category: category || INCOME_CATEGORIES[0], defaultAmount });
    for (const key of this.getMonthKeys()) {
      this.ensureMonthData(key);
    }
    this.save();
    return id;
  },

  addExpenseItem(name, category, payDay = null, defaultAmount = 0) {
    const id = 'exp-' + Date.now();
    this._data.expenseItems.push({ id, name, category: category || '생활비', payDay, defaultAmount });
    for (const key of this.getMonthKeys()) {
      this.ensureMonthData(key);
    }
    this.save();
    return id;
  },

  removeItem(type, id) {
    if (type === 'income') {
      this._data.incomeItems = this._data.incomeItems.filter(i => i.id !== id);
      for (const key in this._data.monthlyData) {
        delete this._data.monthlyData[key].income[id];
      }
    } else {
      this._data.expenseItems = this._data.expenseItems.filter(i => i.id !== id);
      for (const key in this._data.monthlyData) {
        delete this._data.monthlyData[key].expense[id];
      }
    }
    this.save();
  },

  addCard(name, monthlyUsage, minPaymentRatio, interestRate, initialCarryOver, color, payDay, baseMonth) {
    const id = 'card-' + Date.now();
    this._data.cards.push({
      id, name, color: color || '#999',
      monthlyUsage, minPaymentRatio, interestRate, initialCarryOver,
      baseMonth: baseMonth || null,
      payDay: payDay || null,
      monthlyOverrides: {}
    });
    this.save();
    return id;
  },

  removeCard(id) {
    this._data.cards = this._data.cards.filter(c => c.id !== id);
    this.save();
  },

  updateCardField(cardId, field, value) {
    const card = this._data.cards.find(c => c.id === cardId);
    if (card) {
      card[field] = value;
      this.save();
    }
  },

  setCardMonthlyOverride(cardId, monthKey, field, value) {
    const card = this._data.cards.find(c => c.id === cardId);
    if (!card) return;
    if (!card.monthlyOverrides[monthKey]) card.monthlyOverrides[monthKey] = {};
    card.monthlyOverrides[monthKey][field] = value;
    this.save();
  },

  simulateCard(card) {
    const monthKeys = this.getMonthKeys();
    const results = [];
    let carryOver = card.initialCarryOver;
    const base = card.baseMonth || null;

    for (let i = 0; i < monthKeys.length; i++) {
      const mk = monthKeys[i];

      if (base && mk < base) {
        results.push({
          monthKey: mk, billing: 0, usage: 0, carryOver: 0,
          minPaymentRatio: 0, minPayment: 0, remaining: 0, interestRate: 0, fee: 0
        });
        continue;
      }

      const overrides = card.monthlyOverrides[mk] || {};
      const usage = overrides.monthlyUsage ?? card.monthlyUsage;
      const ratio = overrides.minPaymentRatio ?? card.minPaymentRatio;
      const effectiveRate = ratio >= 1 ? 0 : (overrides.interestRate ?? card.interestRate);

      const minPayment = Math.round((usage + carryOver) * ratio);
      const remaining = Math.round((usage + carryOver) - minPayment);
      const fee = Math.round(remaining * effectiveRate / 12);
      const billing = minPayment + fee;

      results.push({
        monthKey: mk,
        billing: Math.round(billing),
        usage: Math.round(usage),
        carryOver: Math.round(carryOver),
        minPaymentRatio: ratio,
        minPayment,
        remaining,
        interestRate: effectiveRate,
        fee,
      });

      carryOver = remaining + fee;
    }
    return results;
  },

  // === Loan methods ===

  _getLoanRate(loan, monthKey) {
    if (loan.rateType === 'variable') {
      if (loan.rateOverrides[monthKey] !== undefined) return loan.rateOverrides[monthKey];
      if (loan.rateHistory && loan.rateHistory.length > 0) {
        let rate = loan.annualRate;
        for (const entry of loan.rateHistory) {
          if (entry.from <= monthKey) rate = entry.rate;
        }
        return rate;
      }
    }
    return loan.annualRate;
  },

  _calcAmortizedPayment(balance, monthlyRate, remainingMonths) {
    if (monthlyRate <= 0 || remainingMonths <= 0) return balance;
    return balance * monthlyRate * Math.pow(1 + monthlyRate, remainingMonths)
      / (Math.pow(1 + monthlyRate, remainingMonths) - 1);
  },

  setLoanRateOverride(loanId, monthKey, rate, applyForward) {
    const loan = this._data.loans.find(l => l.id === loanId);
    if (!loan) return;
    if (applyForward) {
      const monthKeys = this.getMonthKeys();
      const startIdx = monthKeys.indexOf(monthKey);
      if (startIdx >= 0) {
        for (let i = startIdx; i < monthKeys.length; i++) {
          loan.rateOverrides[monthKeys[i]] = rate;
        }
      }
    } else {
      loan.rateOverrides[monthKey] = rate;
    }
    this.save();
  },

  simulateLoan(loan) {
    const monthKeys = this.getMonthKeys();
    const totalMonths = loan.termYears * 12;
    const loanStartAbs = loan.startYear * 12 + (loan.startMonth - 1);
    const firstTrackAbs = this._data.settings.startYear * 12 + (this._data.settings.startMonth - 1);
    const monthlyPrincipal = loan.repaymentType === 'equalPrincipal' ? loan.principal / totalMonths : 0;

    let balance = loan.principal;
    let currentRate = loan.annualRate;
    let fixedPayment = loan.repaymentType === 'amortized'
      ? this._calcAmortizedPayment(balance, currentRate / 12, totalMonths) : 0;

    for (let abs = loanStartAbs; abs < firstTrackAbs; abs++) {
      const elapsed = abs - loanStartAbs;
      if (elapsed >= totalMonths || balance <= 0) { balance = 0; break; }
      const absM = abs % 12 + 1;
      const absY = Math.floor(abs / 12);
      const mk = this.monthKey(absY, absM);

      const rate = this._getLoanRate(loan, mk);
      if (loan.rateType === 'variable' && rate !== currentRate) {
        currentRate = rate;
        const remaining = totalMonths - elapsed;
        if (loan.repaymentType === 'amortized') {
          fixedPayment = this._calcAmortizedPayment(balance, currentRate / 12, remaining);
        }
      }
      const r = currentRate / 12;
      const interest = balance * r;
      let princPay = 0;
      if (loan.repaymentType === 'amortized') {
        princPay = fixedPayment - interest;
      } else if (loan.repaymentType === 'equalPrincipal') {
        princPay = monthlyPrincipal;
      }
      balance = Math.max(0, balance - princPay);
    }

    const results = [];
    for (const mk of monthKeys) {
      const [y, m] = mk.split('-').map(Number);
      const abs = y * 12 + (m - 1);
      const elapsed = abs - loanStartAbs;

      if (elapsed < 0 || balance <= 0) {
        results.push({ monthKey: mk, balance: 0, principalPayment: 0, interest: 0, payment: 0, annualRate: 0 });
        continue;
      }

      const rate = this._getLoanRate(loan, mk);
      if (loan.rateType === 'variable' && rate !== currentRate) {
        currentRate = rate;
        const remaining = totalMonths - elapsed;
        if (loan.repaymentType === 'amortized' && remaining > 0) {
          fixedPayment = this._calcAmortizedPayment(balance, currentRate / 12, remaining);
        }
      }

      const r = currentRate / 12;
      const isLastMonth = elapsed >= totalMonths - 1;
      const interest = Math.round(balance * r);

      let princPay, payment;
      if (loan.repaymentType === 'bullet') {
        if (isLastMonth) {
          princPay = Math.round(balance);
          payment = princPay + interest;
        } else {
          princPay = 0;
          payment = interest;
        }
      } else if (loan.repaymentType === 'amortized') {
        payment = Math.round(fixedPayment);
        princPay = Math.min(payment - interest, Math.round(balance));
        if (isLastMonth || balance - princPay < 100) {
          princPay = Math.round(balance);
          payment = princPay + interest;
        }
      } else {
        princPay = Math.min(Math.round(monthlyPrincipal), Math.round(balance));
        payment = princPay + interest;
      }

      results.push({
        monthKey: mk,
        balance: Math.round(balance),
        principalPayment: princPay,
        interest,
        payment,
        annualRate: currentRate
      });

      balance = Math.max(0, balance - princPay);
    }
    return results;
  },

  getLoanPaymentForMonth(monthKey) {
    const payments = [];
    for (const loan of this._data.loans) {
      const sim = this.simulateLoan(loan);
      const monthResult = sim.find(r => r.monthKey === monthKey);
      payments.push({
        loanId: loan.id,
        loanName: loan.name,
        color: loan.color,
        payment: monthResult ? monthResult.payment : 0
      });
    }
    return payments;
  },

  getLoanPaymentTotal(monthKey) {
    return this.getLoanPaymentForMonth(monthKey).reduce((sum, p) => sum + p.payment, 0);
  },

  getLoanActualForMonth(monthKey) {
    const md = this.ensureMonthData(monthKey);
    let total = 0;
    for (const loan of this._data.loans) {
      const key = 'loan-payment-' + loan.id;
      const d = md.expense[key];
      if (d) total += d.actual;
    }
    return total;
  },

  // === Stock methods ===

  addStock(name, color, initialHoldingQty, initialAvgPrice) {
    const id = 'stock-' + Date.now();
    this._data.stocks.push({
      id, name, color: color || '#E91E63',
      initialHoldingQty: initialHoldingQty || 0,
      initialAvgPrice: initialAvgPrice || 0,
      monthlyOverrides: {}
    });
    this.save();
    return id;
  },

  removeStock(id) {
    this._data.stocks = this._data.stocks.filter(s => s.id !== id);
    this.save();
  },

  updateStockField(stockId, field, value) {
    const stock = this._data.stocks.find(s => s.id === stockId);
    if (stock) { stock[field] = value; this.save(); }
  },

  setStockMonthlyOverride(stockId, monthKey, field, value) {
    const stock = this._data.stocks.find(s => s.id === stockId);
    if (!stock) return;
    if (!stock.monthlyOverrides[monthKey]) stock.monthlyOverrides[monthKey] = {};
    stock.monthlyOverrides[monthKey][field] = value;
    this.save();
  },

  _applyStockMonth(stock, mk, holdingQty, avgPrice) {
    const o = stock.monthlyOverrides[mk] || {};
    const buyQty = o.buyQty || 0;
    const buyPrice = o.buyPrice || 0;
    const sellQty = Math.min(o.sellQty || 0, holdingQty + buyQty);
    const sellPrice = o.sellPrice || 0;

    if (buyQty > 0 && buyPrice > 0) {
      const totalCost = holdingQty * avgPrice + buyQty * buyPrice;
      holdingQty += buyQty;
      avgPrice = holdingQty > 0 ? totalCost / holdingQty : 0;
    }

    const sellAmount = sellQty * sellPrice;
    if (sellQty > 0) holdingQty -= sellQty;

    return { buyQty, buyPrice, sellQty, sellPrice, sellAmount, holdingQty, avgPrice };
  },

  simulateStock(stock) {
    const monthKeys = this.getMonthKeys();
    const firstKey = monthKeys[0];
    let holdingQty = stock.initialHoldingQty || 0;
    let avgPrice = stock.initialAvgPrice || 0;

    const preKeys = Object.keys(stock.monthlyOverrides)
      .filter(k => k < firstKey)
      .sort();
    for (const pk of preKeys) {
      const r = this._applyStockMonth(stock, pk, holdingQty, avgPrice);
      holdingQty = r.holdingQty;
      avgPrice = r.avgPrice;
    }

    const results = [];
    for (const mk of monthKeys) {
      const r = this._applyStockMonth(stock, mk, holdingQty, avgPrice);
      holdingQty = r.holdingQty;
      avgPrice = r.avgPrice;

      results.push({
        monthKey: mk,
        buyQty: r.buyQty,
        buyPrice: r.buyPrice,
        buyAmount: r.buyQty * r.buyPrice,
        sellQty: r.sellQty,
        sellPrice: r.sellPrice,
        sellAmount: r.sellAmount,
        holdingQty,
        totalInvested: Math.round(holdingQty * avgPrice)
      });
    }
    return results;
  },

  getStockIncomeForMonth(monthKey) {
    const incomes = [];
    for (const stock of this._data.stocks) {
      const sim = this.simulateStock(stock);
      const monthResult = sim.find(r => r.monthKey === monthKey);
      incomes.push({
        stockId: stock.id,
        stockName: stock.name,
        color: stock.color,
        income: monthResult ? monthResult.sellAmount : 0
      });
    }
    return incomes;
  },

  getStockIncomeTotal(monthKey) {
    return this.getStockIncomeForMonth(monthKey).reduce((sum, s) => sum + s.income, 0);
  },

  getStockActualForMonth(monthKey) {
    const md = this.ensureMonthData(monthKey);
    let total = 0;
    for (const stock of this._data.stocks) {
      const key = 'stock-income-' + stock.id;
      const d = md.income[key];
      if (d) total += d.actual;
    }
    return total;
  },

  addLoan(opts) {
    const id = 'loan-' + Date.now();
    this._data.loans.push({ id, ...opts });
    this.save();
    return id;
  },

  removeLoan(id) {
    this._data.loans = this._data.loans.filter(l => l.id !== id);
    this.save();
  },

  updateLoanField(loanId, field, value) {
    const loan = this._data.loans.find(l => l.id === loanId);
    if (loan) { loan[field] = value; this.save(); }
  },

  updateSettings(newSettings) {
    Object.assign(this._data.settings, newSettings);
    this._initMonthlyData();
    this.save();
  },

  exportJSON() {
    return JSON.stringify(this._data, null, 2);
  },

  importJSON(jsonStr) {
    const parsed = JSON.parse(jsonStr);
    this._data = parsed;
    this._migrate();
    this.save();
  },

  resetToDefault() {
    this._data = JSON.parse(JSON.stringify(DEFAULT_DATA));
    this._initMonthlyData();
    this.save();
  },

  async syncFromCloud(force) {
    if (typeof CloudSync === 'undefined' || !CloudSync.isConfigured()) return false;
    try {
      const remote = await CloudSync.pull();
      if (!remote) return false;
      if (!force) {
        const localTime = this._data._lastModified || 0;
        const remoteTime = remote._lastModified || 0;
        if (remoteTime <= localTime) return false;
      }
      this._data = remote;
      this._migrate();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._data));
      return true;
    } catch {
      return false;
    }
  }
};

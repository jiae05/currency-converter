/* ─────────────────────────────────────────────────────────
   CONFIG
───────────────────────────────────────────────────────── */
const CONFIG = {
  BASE_URL: 'https://api.frankfurter.app',
  DEFAULT_FROM: 'USD',
  DEFAULT_TO: 'KRW',
  MAX_FAVORITES: 6,
  DEBOUNCE_MS: 400,
  STORAGE_KEY: 'favoriteCurrencies',
};

/* ─────────────────────────────────────────────────────────
   STATE
───────────────────────────────────────────────────────── */
const STATE = {
  currencies: {},      // { code: name }
  fromCurrency: CONFIG.DEFAULT_FROM,
  toCurrency: CONFIG.DEFAULT_TO,
  amount: 1,
  currentPeriodDays: 7,
  favorites: [],
  chart: null,
};

/* ─────────────────────────────────────────────────────────
   DOM 참조
───────────────────────────────────────────────────────── */
const $ = id => document.getElementById(id);

const DOM = {
  amount:       $('amount'),
  fromCurrency: $('fromCurrency'),
  toCurrency:   $('toCurrency'),
  swapBtn:      $('swapBtn'),
  resultMain:   $('resultMain'),
  resultSub:    $('resultSub'),
  errorBox:     $('errorBox'),
  errorMsg:     $('errorMsg'),
  lastUpdated:  $('lastUpdated'),
  chartLoading: $('chartLoading'),
  rateChart:    $('rateChart'),
  periodTabs:   $('periodTabs'),
  addFavBtn:    $('addFavBtn'),
  favModal:     $('favModal'),
  favSelect:    $('favSelect'),
  confirmFavBtn:$('confirmFavBtn'),
  cancelFavBtn: $('cancelFavBtn'),
  favoritesGrid:$('favoritesGrid'),
};

/* ─────────────────────────────────────────────────────────
   API 모듈
───────────────────────────────────────────────────────── */
async function apiFetch(path) {
  const res = await fetch(CONFIG.BASE_URL + path);
  if (!res.ok) throw new Error(`API 오류: ${res.status}`);
  return res.json();
}

async function fetchCurrencies() {
  return apiFetch('/currencies');
}

async function fetchLatestRates(from, toCodes) {
  const to = Array.isArray(toCodes) ? toCodes.join(',') : toCodes;
  return apiFetch(`/latest?from=${from}&to=${to}`);
}

async function fetchHistory(from, to, days) {
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - days);
  const startStr = start.toISOString().slice(0, 10);
  const todayStr = today.toISOString().slice(0, 10);
  return apiFetch(`/${startStr}..${todayStr}?from=${from}&to=${to}`);
}

/* ─────────────────────────────────────────────────────────
   UI 헬퍼
───────────────────────────────────────────────────────── */
function showError(msg) {
  DOM.errorMsg.textContent = msg;
  DOM.errorBox.classList.remove('hidden');
}

function hideError() {
  DOM.errorBox.classList.add('hidden');
}

function setChartLoading(on) {
  DOM.chartLoading.classList.toggle('hidden', !on);
}

function formatNumber(n) {
  if (n >= 100) return n.toLocaleString('ko-KR', { maximumFractionDigits: 2 });
  if (n >= 1)   return n.toLocaleString('ko-KR', { maximumFractionDigits: 4 });
  return n.toLocaleString('ko-KR', { maximumFractionDigits: 6 });
}

function renderCurrencyOptions(from = STATE.fromCurrency, to = STATE.toCurrency) {
  const entries = Object.entries(STATE.currencies);
  const makeOption = (code, name) => {
    const opt = document.createElement('option');
    opt.value = code;
    opt.textContent = `${code} — ${name}`;
    return opt;
  };

  [DOM.fromCurrency, DOM.toCurrency, DOM.favSelect].forEach(sel => {
    sel.innerHTML = '';
    entries.forEach(([code, name]) => sel.appendChild(makeOption(code, name)));
  });

  DOM.fromCurrency.value = from;
  DOM.toCurrency.value = to;
}

/* ─────────────────────────────────────────────────────────
   기본 변환 기능
───────────────────────────────────────────────────────── */
async function convert() {
  hideError();
  const amount = parseFloat(DOM.amount.value);

  if (isNaN(amount) || amount < 0) {
    showError('올바른 금액을 입력해주세요.');
    DOM.resultMain.textContent = '--';
    DOM.resultSub.textContent = '';
    return;
  }

  const from = DOM.fromCurrency.value;
  const to   = DOM.toCurrency.value;

  if (!from || !to) return;

  if (from === to) {
    DOM.resultMain.textContent = `${formatNumber(amount)} ${to}`;
    DOM.resultSub.textContent  = `1 ${from} = 1 ${to}`;
    return;
  }

  try {
    const data = await fetchLatestRates(from, [to]);
    const rate  = data.rates[to];
    const result = amount * rate;

    DOM.resultMain.textContent = `${formatNumber(result)} ${to}`;
    DOM.resultSub.textContent  = `1 ${from} = ${formatNumber(rate)} ${to}`;
    DOM.lastUpdated.textContent = `마지막 업데이트: ${data.date}`;
  } catch (e) {
    showError('환율 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
  }
}

/* ─────────────────────────────────────────────────────────
   차트 모듈
───────────────────────────────────────────────────────── */
function initChart() {
  const ctx = DOM.rateChart.getContext('2d');
  STATE.chart = new Chart(ctx, {
    type: 'line',
    data: { labels: [], datasets: [{
      label: '',
      data: [],
      borderColor: '#6366f1',
      backgroundColor: 'rgba(99,102,241,0.1)',
      borderWidth: 2,
      fill: true,
      tension: 0.35,
      pointRadius: 2,
      pointHoverRadius: 5,
    }]},
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` ${formatNumber(ctx.parsed.y)} ${STATE.toCurrency}`,
          },
        },
      },
      scales: {
        x: {
          ticks: { maxTicksLimit: 6, font: { size: 11 } },
          grid: { display: false },
        },
        y: {
          ticks: { font: { size: 11 }, callback: v => formatNumber(v) },
          grid: { color: 'rgba(0,0,0,0.05)' },
        },
      },
    },
  });
}

async function updateChart() {
  const from = STATE.fromCurrency;
  const to   = STATE.toCurrency;
  const days = STATE.currentPeriodDays;

  if (!from || !to || from === to) return;

  setChartLoading(true);
  try {
    const data = await fetchHistory(from, to, days);
    const ratesObj = data.rates; // { "2026-01-01": { KRW: 1380 }, ... }
    const labels = Object.keys(ratesObj);
    const values = labels.map(d => ratesObj[d][to]);

    STATE.chart.data.labels = labels;
    STATE.chart.data.datasets[0].data = values;
    STATE.chart.data.datasets[0].label = `${from} → ${to}`;
    STATE.chart.update();
  } catch (e) {
    // 차트 오류는 조용히 처리 (변환 결과 영역에 영향 없음)
  } finally {
    setChartLoading(false);
  }
}

/* ─────────────────────────────────────────────────────────
   즐겨찾기 모듈
───────────────────────────────────────────────────────── */
function loadFavorites() {
  try {
    const stored = localStorage.getItem(CONFIG.STORAGE_KEY);
    STATE.favorites = stored ? JSON.parse(stored) : ['EUR', 'JPY', 'KRW'];
  } catch {
    STATE.favorites = ['EUR', 'JPY', 'KRW'];
  }
}

function saveFavorites() {
  localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(STATE.favorites));
}

async function renderFavorites() {
  const grid = DOM.favoritesGrid;
  grid.innerHTML = '';

  if (STATE.favorites.length === 0) {
    grid.innerHTML = '<p class="empty-msg">즐겨찾기 통화를 추가해보세요.</p>';
    return;
  }

  const from = STATE.fromCurrency || CONFIG.DEFAULT_FROM;
  let rates = {};

  try {
    const data = await fetchLatestRates(from, STATE.favorites);
    rates = data.rates;
  } catch { /* 오류 시 요율 없이 렌더링 */ }

  STATE.favorites.forEach(code => {
    const card = document.createElement('div');
    card.className = 'fav-card';
    card.dataset.code = code;

    const name = STATE.currencies[code] || code;
    const rate = rates[code] ? formatNumber(rates[code]) : '--';

    card.innerHTML = `
      <button class="fav-card__remove" data-code="${code}" title="삭제">✕</button>
      <div class="fav-card__code">${code}</div>
      <div class="fav-card__name">${name}</div>
      <div class="fav-card__rate">${rate}</div>
    `;

    // 카드 클릭 → 대상 통화 변경
    card.addEventListener('click', e => {
      if (e.target.classList.contains('fav-card__remove')) return;
      DOM.toCurrency.value = code;
      STATE.toCurrency = code;
      convert();
      updateChart();
    });

    // 삭제 버튼
    card.querySelector('.fav-card__remove').addEventListener('click', e => {
      e.stopPropagation();
      STATE.favorites = STATE.favorites.filter(c => c !== code);
      saveFavorites();
      renderFavorites();
    });

    grid.appendChild(card);
  });
}

/* ─────────────────────────────────────────────────────────
   이벤트 핸들러
───────────────────────────────────────────────────────── */
let debounceTimer;
function debounce(fn, ms) {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(fn, ms);
}

function onCurrencyChange() {
  STATE.fromCurrency = DOM.fromCurrency.value;
  STATE.toCurrency   = DOM.toCurrency.value;
  convert();
  updateChart();
  renderFavorites();
}

function bindEvents() {
  DOM.amount.addEventListener('input', () => debounce(convert, CONFIG.DEBOUNCE_MS));

  DOM.fromCurrency.addEventListener('change', onCurrencyChange);
  DOM.toCurrency.addEventListener('change', onCurrencyChange);

  DOM.swapBtn.addEventListener('click', () => {
    const tmp = DOM.fromCurrency.value;
    DOM.fromCurrency.value = DOM.toCurrency.value;
    DOM.toCurrency.value   = tmp;
    onCurrencyChange();
  });

  // 기간 탭
  DOM.periodTabs.addEventListener('click', e => {
    const btn = e.target.closest('.period-btn');
    if (!btn) return;
    document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    STATE.currentPeriodDays = parseInt(btn.dataset.days);
    updateChart();
  });

  // 즐겨찾기 추가 모달
  DOM.addFavBtn.addEventListener('click', () => {
    DOM.favModal.classList.toggle('hidden');
  });

  DOM.cancelFavBtn.addEventListener('click', () => {
    DOM.favModal.classList.add('hidden');
  });

  DOM.confirmFavBtn.addEventListener('click', () => {
    const code = DOM.favSelect.value;
    if (!code) return;
    if (STATE.favorites.includes(code)) {
      alert(`${code}는 이미 즐겨찾기에 있습니다.`);
      return;
    }
    if (STATE.favorites.length >= CONFIG.MAX_FAVORITES) {
      alert(`즐겨찾기는 최대 ${CONFIG.MAX_FAVORITES}개까지 추가할 수 있습니다.`);
      return;
    }
    STATE.favorites.push(code);
    saveFavorites();
    renderFavorites();
    DOM.favModal.classList.add('hidden');
  });
}

/* ─────────────────────────────────────────────────────────
   초기화
───────────────────────────────────────────────────────── */
async function init() {
  try {
    STATE.currencies = await fetchCurrencies();
  } catch {
    showError('통화 목록을 불러오지 못했습니다. 페이지를 새로고침해주세요.');
    return;
  }

  renderCurrencyOptions();
  loadFavorites();
  bindEvents();
  initChart();
  initBudget();

  await Promise.all([convert(), updateChart(), renderFavorites()]);
}

/* ─────────────────────────────────────────────────────────
   여행 예산 계산기 모듈
───────────────────────────────────────────────────────── */
const BUDGET_STORAGE_KEY = 'travelBudgetItems';

const BUDGET_DOM = {
  baseCurrency:  $('budgetBaseCurrency'),
  items:         $('budgetItems'),
  empty:         $('budgetEmpty'),
  addBtn:        $('addExpenseBtn'),
  totalAmount:   $('budgetTotalAmount'),
};

let budgetItems = []; // [{ id, desc, amount, currency }]
let budgetBase = 'KRW';

function loadBudget() {
  try {
    const stored = localStorage.getItem(BUDGET_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      budgetItems = parsed.items || [];
      budgetBase  = parsed.base  || 'KRW';
    }
  } catch { /* ignore */ }
}

function saveBudget() {
  localStorage.setItem(BUDGET_STORAGE_KEY, JSON.stringify({
    items: budgetItems,
    base: budgetBase,
  }));
}

function renderBudgetCurrencySelect() {
  const codes = Object.keys(STATE.currencies);
  BUDGET_DOM.baseCurrency.innerHTML = codes
    .map(c => `<option value="${c}">${c} — ${STATE.currencies[c]}</option>`)
    .join('');
  BUDGET_DOM.baseCurrency.value = budgetBase;
}

function createExpenseRow(item) {
  const row = document.createElement('div');
  row.className = 'expense-row';
  row.dataset.id = item.id;

  const codes = Object.keys(STATE.currencies);
  const options = codes.map(c =>
    `<option value="${c}" ${c === item.currency ? 'selected' : ''}>${c}</option>`
  ).join('');

  row.innerHTML = `
    <input class="expense-row__desc" type="text" placeholder="항목 (예: 호텔)" value="${item.desc}" />
    <input class="expense-row__amount" type="number" placeholder="금액" value="${item.amount}" min="0" step="any" />
    <select class="expense-row__currency">${options}</select>
    <span class="expense-row__converted">계산 중...</span>
    <button class="expense-row__remove" title="삭제">✕</button>
  `;

  row.querySelector('.expense-row__desc').addEventListener('input', e => {
    item.desc = e.target.value;
    saveBudget();
  });

  row.querySelector('.expense-row__amount').addEventListener('input', e => {
    item.amount = parseFloat(e.target.value) || 0;
    saveBudget();
    recalcBudget();
  });

  row.querySelector('.expense-row__currency').addEventListener('change', e => {
    item.currency = e.target.value;
    saveBudget();
    recalcBudget();
  });

  row.querySelector('.expense-row__remove').addEventListener('click', () => {
    budgetItems = budgetItems.filter(i => i.id !== item.id);
    saveBudget();
    renderBudgetItems();
    recalcBudget();
  });

  return row;
}

function renderBudgetItems() {
  BUDGET_DOM.items.innerHTML = '';

  if (budgetItems.length === 0) {
    BUDGET_DOM.items.appendChild(BUDGET_DOM.empty);
    BUDGET_DOM.empty.classList.remove('hidden');
    BUDGET_DOM.totalAmount.textContent = '--';
    return;
  }

  BUDGET_DOM.empty.classList.add('hidden');
  budgetItems.forEach(item => {
    BUDGET_DOM.items.appendChild(createExpenseRow(item));
  });
}

async function recalcBudget() {
  if (budgetItems.length === 0) {
    BUDGET_DOM.totalAmount.textContent = '--';
    return;
  }

  // 필요한 통화 목록 (base와 다른 것들)
  const uniqueCurrencies = [...new Set(
    budgetItems.map(i => i.currency).filter(c => c !== budgetBase)
  )];

  let rates = {};
  if (uniqueCurrencies.length > 0) {
    try {
      const data = await fetchLatestRates(budgetBase, uniqueCurrencies);
      // rates: { USD: 0.00073, ... } → base 기준으로 1/rate
      // fetchLatestRates(base, to) → data.rates[to] = how much `to` you get per 1 `base`
      // We need: 1 `currency` = ? `base`
      // So: baseAmount = amount / data.rates[currency]
      rates = data.rates;
    } catch { /* 변환 실패 시 0 처리 */ }
  }

  let total = 0;
  budgetItems.forEach(item => {
    const row = BUDGET_DOM.items.querySelector(`[data-id="${item.id}"]`);
    const convertedEl = row ? row.querySelector('.expense-row__converted') : null;

    if (!item.amount || item.amount <= 0) {
      if (convertedEl) convertedEl.textContent = `0 ${budgetBase}`;
      return;
    }

    let baseAmount;
    if (item.currency === budgetBase) {
      baseAmount = item.amount;
    } else if (rates[item.currency]) {
      baseAmount = item.amount / rates[item.currency];
    } else {
      baseAmount = 0;
    }

    total += baseAmount;
    if (convertedEl) {
      convertedEl.textContent = `≈ ${formatNumber(baseAmount)} ${budgetBase}`;
    }
  });

  BUDGET_DOM.totalAmount.textContent = `${formatNumber(total)} ${budgetBase}`;
}

function initBudget() {
  loadBudget();
  renderBudgetCurrencySelect();
  renderBudgetItems();
  recalcBudget();

  BUDGET_DOM.baseCurrency.addEventListener('change', e => {
    budgetBase = e.target.value;
    saveBudget();
    recalcBudget();
  });

  BUDGET_DOM.addBtn.addEventListener('click', () => {
    const item = {
      id: Date.now(),
      desc: '',
      amount: 0,
      currency: STATE.fromCurrency || CONFIG.DEFAULT_FROM,
    };
    budgetItems.push(item);
    saveBudget();
    renderBudgetItems();
    recalcBudget();
    // 새 항목의 설명 input에 포커스
    const lastRow = BUDGET_DOM.items.lastElementChild;
    if (lastRow) lastRow.querySelector('.expense-row__desc')?.focus();
  });
}

document.addEventListener('DOMContentLoaded', init);

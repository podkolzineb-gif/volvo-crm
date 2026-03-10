(() => {
  'use strict';

  const STORAGE_KEYS = {
    requests: 'mini_crm_requests_v1',
    fuel: 'mini_crm_fuel_cache_v1'
  };

  const DEFAULT_FUEL_CONSUMPTION_PER_HOUR = 10;
  const DEFAULT_FUEL_PRICE = 56;

  const REQUEST_STATUSES = {
    planned: 'planned',
    completed: 'completed'
  };

  // Фичи для будущего роста CRM. Логика не меняется.
  const features = {
    machines: false,
    employees: false,
    marketing: false,
    payments: false
  };

  const DRIFF_DT_SPB_URL = 'https://driff.ru/fuel-dynamics/dt/sankt-peterburg/';
  const DRIFF_PROXY_URLS = [
    'https://api.allorigins.win/raw?url=' + encodeURIComponent(DRIFF_DT_SPB_URL),
    'https://r.jina.ai/http://driff.ru/fuel-dynamics/dt/sankt-peterburg/'
  ];

  const fuelConfig = {
    maxCacheAgeMinutes: 180,
    providers: [
      new DriffFuelProvider({
        label: 'Driff ДТ (Санкт-Петербург)',
        urls: DRIFF_PROXY_URLS
      }),
      new HtmlFuelProvider({
        label: 'Лукойл (парсер через прокси)',
        url: 'https://api.allorigins.win/raw?url=https://auto.lukoil.ru/ru/Prices',
        pattern: /ДТ[^0-9]{0,40}(\d+[\.,]\d{1,2})/i
      })
    ]
  };

  const state = {
    fuelCache: loadFuelCache(),
    requests: [],
    historyRange: 'all'
  };

  state.requests = loadRequests(getCurrentFuelPriceNumber());

  const els = {
    navButtons: Array.from(document.querySelectorAll('.bottom-nav-btn')),
    sections: Array.from(document.querySelectorAll('.section')),

    requestForm: document.getElementById('requestForm'),
    formMessage: document.getElementById('formMessage'),

    worksList: document.getElementById('worksList'),
    clientsList: document.getElementById('clientsList'),
    clientsMessage: document.getElementById('clientsMessage'),

    exportCsvBtn: document.getElementById('exportCsvBtn'),

    historyFilterButtons: Array.from(document.querySelectorAll('.history-filter-btn')),
    historyTableBody: document.getElementById('historyTableBody'),
    exportHistoryCsvBtn: document.getElementById('exportHistoryCsvBtn'),
    historyMessage: document.getElementById('historyMessage'),

    refreshFuelBtn: document.getElementById('refreshFuelBtn'),
    fuelPrice: document.getElementById('fuelPrice'),
    fuelMeta: document.getElementById('fuelMeta'),

    nextJob: document.getElementById('nextJob'),

    todayHours: document.getElementById('todayHours'),
    todayAmount: document.getElementById('todayAmount'),
    monthHours: document.getElementById('monthHours'),
    monthAmount: document.getElementById('monthAmount'),

    todayProfit: document.getElementById('todayProfit'),
    perfHours: document.getElementById('perfHours'),
    perfRevenue: document.getElementById('perfRevenue'),
    perfFuel: document.getElementById('perfFuel'),
    perfRevenueFill: document.getElementById('perfRevenueFill'),
    perfFuelFill: document.getElementById('perfFuelFill'),

    featureFlags: document.getElementById('featureFlags')
  };

  init();

  function init() {
    bindEvents();
    setDefaultDate();
    renderFeatureFlags();
    renderAll();
    refreshFuelPrice(false);
  }

  function bindEvents() {
    els.navButtons.forEach((button) => {
      button.addEventListener('click', () => switchSection(button.dataset.section));
    });

    els.requestForm.addEventListener('submit', handleFormSubmit);
    els.exportCsvBtn.addEventListener('click', handleExportClientsCsv);

    els.exportHistoryCsvBtn.addEventListener('click', handleExportHistoryCsv);
    els.historyFilterButtons.forEach((button) => {
      button.addEventListener('click', () => setHistoryRange(button.dataset.range));
    });

    els.historyTableBody.addEventListener('click', handleHistoryTableClick);

    els.refreshFuelBtn.addEventListener('click', () => refreshFuelPrice(true));
  }

  function switchSection(sectionId) {
    els.navButtons.forEach((button) => {
      button.classList.toggle('active', button.dataset.section === sectionId);
    });

    els.sections.forEach((section) => {
      section.classList.toggle('active', section.id === sectionId);
    });
  }

  function setHistoryRange(range) {
    state.historyRange = ['today', 'week', 'month', 'all'].includes(range) ? range : 'all';

    els.historyFilterButtons.forEach((button) => {
      button.classList.toggle('active', button.dataset.range === state.historyRange);
    });

    renderHistoryTable(getHistoryRequests());
  }

  function setDefaultDate() {
    const dateInput = els.requestForm.elements.date;
    if (!dateInput.value) {
      dateInput.value = toInputDate(new Date());
    }
  }

  function handleFormSubmit(event) {
    event.preventDefault();

    const formData = new FormData(els.requestForm);
    const request = buildRequestFromForm(formData);

    if (!isValidRequest(request)) {
      setMessage(els.formMessage, 'Проверьте форму: заполните обязательные поля и корректные числа.', 'error');
      return;
    }

    state.requests.push(request);
    persistRequests();
    renderAll();

    els.requestForm.reset();
    setDefaultDate();
    setMessage(els.formMessage, 'Заявка успешно добавлена.', 'success');
    switchSection('dashboard');
  }

  function buildRequestFromForm(formData) {
    const date = String(formData.get('date') || '').trim();
    const hours = toNonNegativeNumber(formData.get('hours'));
    const amount = toNonNegativeNumber(formData.get('amount'));

    const fuelLitersInput = String(formData.get('fuelLiters') || '').trim();
    const parsedFuelLiters = toOptionalNonNegativeNumber(fuelLitersInput);
    const fuelLiters = Number.isFinite(parsedFuelLiters)
      ? parsedFuelLiters
      : round2(hours * DEFAULT_FUEL_CONSUMPTION_PER_HOUR);

    const fuelPrice = getCurrentFuelPriceNumber();
    const fuelCost = round2(fuelLiters * fuelPrice);
    const profit = round2(amount - fuelCost);

    return {
      id: createId(),
      name: String(formData.get('name') || '').trim(),
      phone: String(formData.get('phone') || '').trim(),
      date,
      workType: String(formData.get('workType') || '').trim(),
      address: String(formData.get('address') || '').trim(),
      hours,
      amount,
      fuelLiters,
      fuelPrice,
      fuelCost,
      profit,
      status: resolveStatus(REQUEST_STATUSES.planned, date),
      createdAt: new Date().toISOString()
    };
  }

  function isValidRequest(request) {
    return Boolean(
      request.name &&
        request.phone &&
        request.date &&
        request.workType &&
        request.address &&
        Number.isFinite(request.hours) &&
        Number.isFinite(request.amount) &&
        Number.isFinite(request.fuelLiters) &&
        Number.isFinite(request.fuelPrice) &&
        Number.isFinite(request.fuelCost) &&
        Number.isFinite(request.profit) &&
        request.hours >= 0 &&
        request.amount >= 0 &&
        request.fuelLiters >= 0 &&
        request.fuelPrice > 0
    );
  }

  function isCoreRequestValid(request) {
    return Boolean(
      request &&
        request.name &&
        request.phone &&
        request.date &&
        request.workType &&
        request.address &&
        Number.isFinite(request.hours) &&
        Number.isFinite(request.amount) &&
        request.hours >= 0 &&
        request.amount >= 0
    );
  }

  function setMessage(element, text, type) {
    if (!element) {
      return;
    }

    element.textContent = text || '';
    element.classList.remove('success', 'error');

    if (type) {
      element.classList.add(type);
    }
  }

  function renderAll() {
    syncDerivedRequestFields();

    const requestsByDateDesc = getSortedRequestsByDate(state.requests, 'desc');

    renderDashboard(requestsByDateDesc);
    renderNextJob(state.requests);
    renderWorksList(requestsByDateDesc);
    renderClientsList(requestsByDateDesc);
    renderHistoryTable(getHistoryRequests());
  }

  function renderDashboard(requests) {
    const now = new Date();

    const todayRequests = requests.filter((request) => isSameDay(parseDate(request.date), now));
    const monthRequests = requests.filter((request) => isSameMonth(parseDate(request.date), now));

    const todayHours = todayRequests.reduce((sum, item) => sum + item.hours, 0);
    const todayAmount = todayRequests.reduce((sum, item) => sum + item.amount, 0);
    const monthHours = monthRequests.reduce((sum, item) => sum + item.hours, 0);
    const monthAmount = monthRequests.reduce((sum, item) => sum + item.amount, 0);

    const todayFuelLiters = todayRequests.reduce((sum, item) => sum + item.fuelLiters, 0);
    const todayFuelCost = todayRequests.reduce((sum, item) => sum + item.fuelCost, 0);
    const todayProfit = todayRequests.reduce((sum, item) => sum + item.profit, 0);

    els.todayHours.textContent = formatHours(todayHours);
    els.todayAmount.textContent = formatCurrency(todayAmount);
    els.monthHours.textContent = formatHours(monthHours);
    els.monthAmount.textContent = formatCurrency(monthAmount);

    els.todayProfit.textContent = formatCurrency(todayProfit);
    els.perfHours.textContent = `${formatHours(todayHours)} ч`;
    els.perfRevenue.textContent = formatCurrency(todayAmount);
    els.perfFuel.textContent = `${formatDecimal(todayFuelLiters)} л`;

    updatePerformanceBars(todayAmount, todayFuelCost);
  }

  function updatePerformanceBars(revenue, fuelCost) {
    const safeRevenue = Math.max(0, revenue);
    const safeFuelCost = Math.max(0, fuelCost);

    const revenueWidth = safeRevenue > 0 ? 100 : 0;
    const fuelWidth = safeRevenue > 0 ? Math.min(100, (safeFuelCost / safeRevenue) * 100) : 0;

    els.perfRevenueFill.style.width = `${revenueWidth}%`;
    els.perfFuelFill.style.width = `${fuelWidth > 0 ? Math.max(fuelWidth, 6) : 0}%`;
  }

  function renderNextJob(requests) {
    const today = startOfLocalDay(new Date());

    const futurePlanned = [...requests]
      .filter((request) => {
        const date = parseDate(request.date);
        return date && date >= today && resolveStatus(request.status, request.date) === REQUEST_STATUSES.planned;
      })
      .sort((a, b) => parseDate(a.date) - parseDate(b.date));

    const nextJob = futurePlanned[0];

    if (!nextJob) {
      els.nextJob.innerHTML = '<div class="empty-state">Пока нет будущих заявок.</div>';
      return;
    }

    els.nextJob.innerHTML = `
      <div class="next-job-content">
        <div class="next-job-main">
          <p class="next-job-name">${escapeHtml(nextJob.name)}</p>
          <p class="next-job-date">${escapeHtml(formatLongDate(nextJob.date))}</p>
          <p class="next-job-type">${escapeHtml(nextJob.workType)}</p>
          <p class="next-job-address">${escapeHtml(nextJob.address)}</p>
        </div>
        <div class="next-job-footer">
          <span>Часы: ${escapeHtml(formatHours(nextJob.hours))}</span>
          <strong>${escapeHtml(formatCurrency(nextJob.amount))}</strong>
        </div>
      </div>
    `;
  }

  function renderWorksList(requests) {
    const recent = requests.slice(0, 6);

    if (!recent.length) {
      els.worksList.innerHTML = '<div class="empty-state">Пока нет заявок.</div>';
      return;
    }

    els.worksList.innerHTML = recent
      .map(
        (request) => `
          <article class="work-item">
            <div class="work-item-head">
              <strong>${escapeHtml(formatDate(request.date))}</strong>
              <span class="tag tag-light">${escapeHtml(request.name)}</span>
            </div>
            <div class="work-meta">
              <div>${escapeHtml(request.workType)}</div>
              <div>${escapeHtml(request.address)}</div>
            </div>
            <div class="work-tags">
              <span class="tag">${escapeHtml(formatHours(request.hours))} ч</span>
              <span class="tag tag-light">${escapeHtml(formatCurrency(request.amount))}</span>
            </div>
          </article>
        `
      )
      .join('');
  }

  function renderClientsList(requests) {
    const clients = aggregateClients(requests);

    if (!clients.length) {
      els.clientsList.innerHTML = '<div class="empty-state">Пока нет клиентов.</div>';
      return;
    }

    els.clientsList.innerHTML = clients
      .map(
        (client) => `
          <article class="client-item">
            <div class="client-item-head">
              <strong>${escapeHtml(client.name)}</strong>
              <span class="tag">${escapeHtml(formatCurrency(client.totalAmount))}</span>
            </div>
            <div class="client-meta">
              <div>${escapeHtml(client.phone)}</div>
            </div>
            <div class="client-tags">
              <span class="tag tag-light">Заявок: ${escapeHtml(String(client.requestsCount))}</span>
            </div>
          </article>
        `
      )
      .join('');
  }

  function renderHistoryTable(requests) {
    if (!requests.length) {
      els.historyTableBody.innerHTML = '<tr><td class="empty-state" colspan="10">По выбранному фильтру нет заявок.</td></tr>';
      return;
    }

    els.historyTableBody.innerHTML = requests
      .map(
        (request) => `
          <tr>
            <td>${escapeHtml(formatDate(request.date))}</td>
            <td>${escapeHtml(request.name)}</td>
            <td>${escapeHtml(request.phone)}</td>
            <td>${escapeHtml(request.workType)}</td>
            <td>${escapeHtml(request.address)}</td>
            <td>${escapeHtml(formatHours(request.hours))}</td>
            <td>${escapeHtml(formatCurrency(request.amount))}</td>
            <td>${escapeHtml(formatDecimal(request.fuelLiters))}</td>
            <td>${renderStatusBadge(request.status)}</td>
            <td>
              <button class="repeat-btn" type="button" data-repeat-id="${escapeHtml(request.id)}">Повторить</button>
            </td>
          </tr>
        `
      )
      .join('');
  }

  function renderStatusBadge(status) {
    const safeStatus = status === REQUEST_STATUSES.completed ? REQUEST_STATUSES.completed : REQUEST_STATUSES.planned;
    const label = safeStatus === REQUEST_STATUSES.completed ? 'Выполнено' : 'Запланировано';
    const className = safeStatus === REQUEST_STATUSES.completed ? 'history-status history-status-completed' : 'history-status history-status-planned';
    return `<span class="${className}">${label}</span>`;
  }

  function getHistoryRequests() {
    const sortedDesc = getSortedRequestsByDate(state.requests, 'desc');

    if (state.historyRange === 'all') {
      return sortedDesc;
    }

    const now = new Date();

    if (state.historyRange === 'today') {
      return sortedDesc.filter((request) => isSameDay(parseDate(request.date), now));
    }

    if (state.historyRange === 'week') {
      const fromDate = startOfLocalDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6));
      const toDate = endOfLocalDay(now);
      return sortedDesc.filter((request) => {
        const date = parseDate(request.date);
        return date && date >= fromDate && date <= toDate;
      });
    }

    if (state.historyRange === 'month') {
      return sortedDesc.filter((request) => isSameMonth(parseDate(request.date), now));
    }

    return sortedDesc;
  }

  function handleHistoryTableClick(event) {
    const button = event.target.closest('button[data-repeat-id]');
    if (!button) {
      return;
    }

    const sourceId = button.dataset.repeatId;
    const source = state.requests.find((item) => item.id === sourceId);

    if (!source) {
      setMessage(els.historyMessage, 'Не удалось найти исходную заявку.', 'error');
      return;
    }

    const repeatedRaw = {
      ...source,
      id: createId(),
      date: toInputDate(new Date()),
      status: REQUEST_STATUSES.planned,
      createdAt: new Date().toISOString()
    };

    const repeated = normalizeRequest(repeatedRaw, getCurrentFuelPriceNumber());

    state.requests.push(repeated);
    persistRequests();
    renderAll();

    setMessage(els.historyMessage, 'Повторная заявка создана с датой на сегодня.', 'success');
  }

  function aggregateClients(requests) {
    const map = new Map();

    requests.forEach((request) => {
      const normalizedPhone = normalizePhone(request.phone);
      const key = normalizedPhone || request.name.toLowerCase();

      if (!map.has(key)) {
        map.set(key, {
          name: request.name,
          phone: request.phone,
          requestsCount: 0,
          totalAmount: 0
        });
      }

      const client = map.get(key);
      client.requestsCount += 1;
      client.totalAmount += request.amount;

      if (!client.name && request.name) {
        client.name = request.name;
      }
      if (!client.phone && request.phone) {
        client.phone = request.phone;
      }
    });

    return Array.from(map.values()).sort((a, b) => b.totalAmount - a.totalAmount);
  }

  function handleExportClientsCsv() {
    const clients = aggregateClients(state.requests);

    if (!clients.length) {
      setMessage(els.clientsMessage, 'Нет данных для экспорта CSV.', 'error');
      return;
    }

    const headers = ['Имя', 'Телефон', 'Количество заявок', 'Общая сумма'];
    const rows = clients.map((client) => [
      client.name,
      client.phone,
      String(client.requestsCount),
      String(client.totalAmount)
    ]);

    exportCsv(headers, rows, `clients-${toInputDate(new Date())}.csv`);
    setMessage(els.clientsMessage, 'CSV с клиентами сформирован.', 'success');
  }

  function handleExportHistoryCsv() {
    const history = getHistoryRequests();

    if (!history.length) {
      setMessage(els.historyMessage, 'Нет данных для экспорта по выбранному фильтру.', 'error');
      return;
    }

    const headers = [
      'Дата',
      'Клиент',
      'Телефон',
      'Тип работ',
      'Адрес',
      'Часы',
      'Сумма',
      'Топливо (л)',
      'Цена топлива',
      'Стоимость топлива',
      'Чистая прибыль',
      'Статус'
    ];

    const rows = history.map((request) => [
      formatDate(request.date),
      request.name,
      request.phone,
      request.workType,
      request.address,
      formatHours(request.hours),
      String(request.amount),
      String(request.fuelLiters),
      String(request.fuelPrice),
      String(request.fuelCost),
      String(request.profit),
      request.status
    ]);

    exportCsv(headers, rows, `history-${state.historyRange}-${toInputDate(new Date())}.csv`);
    setMessage(els.historyMessage, 'CSV по истории сформирован.', 'success');
  }

  function exportCsv(headers, rows, fileName) {
    const csvContent = [headers, ...rows]
      .map((rowItems) => rowItems.map(csvEscape).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = fileName;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  }

  async function refreshFuelPrice(forceRefresh) {
    const cache = state.fuelCache;
    const isCacheFresh = cache && getMinutesDiff(new Date(cache.fetchedAt), new Date()) <= fuelConfig.maxCacheAgeMinutes;

    if (!forceRefresh && isCacheFresh) {
      renderFuel(cache.price, cache.source, cache.fetchedAt, true);
      return;
    }

    els.fuelMeta.textContent = 'Получаем цену из внешнего источника...';

    for (const provider of fuelConfig.providers) {
      try {
        const result = await provider.getPrice();

        state.fuelCache = result;
        persistFuelCache();
        renderFuel(result.price, result.source, result.fetchedAt, false);
        return;
      } catch (_error) {
        // Пробуем следующий источник.
      }
    }

    if (cache) {
      renderFuel(cache.price, `${cache.source} (кэш)`, cache.fetchedAt, true);
      els.fuelMeta.textContent = `Внешний источник недоступен. Показаны кэш-данные от ${formatDateTime(cache.fetchedAt)}.`;
      return;
    }

    els.fuelPrice.textContent = '-';
    els.fuelMeta.textContent = 'Источник цены недоступен. Показан режим без актуальной цены.';
  }

  function renderFuel(price, source, fetchedAt, fromCache) {
    els.fuelPrice.textContent = `${formatDecimal(price)} ₽/л`;
    els.fuelMeta.textContent = `${fromCache ? 'Кэш' : 'Источник'}: ${source}. Обновлено: ${formatDateTime(fetchedAt)}.`;
  }

  function renderFeatureFlags() {
    els.featureFlags.textContent = `features = ${JSON.stringify(features, null, 2)}`;
  }

  function syncDerivedRequestFields() {
    const defaultFuelPrice = getCurrentFuelPriceNumber();
    let hasChanges = false;

    state.requests = state.requests.map((request) => {
      const normalized = normalizeRequest(request, defaultFuelPrice);

      if (requestFingerprint(request) !== requestFingerprint(normalized)) {
        hasChanges = true;
      }

      return normalized;
    });

    if (hasChanges) {
      persistRequests();
    }
  }

  function requestFingerprint(request) {
    return [
      request.id,
      request.name,
      request.phone,
      request.date,
      request.workType,
      request.address,
      request.hours,
      request.amount,
      request.fuelLiters,
      request.fuelPrice,
      request.fuelCost,
      request.profit,
      request.status,
      request.createdAt
    ].join('|');
  }

  function getSortedRequestsByDate(requests, direction) {
    const sign = direction === 'asc' ? 1 : -1;

    return [...requests].sort((a, b) => {
      const dateA = parseDate(a.date);
      const dateB = parseDate(b.date);
      const tsA = dateA ? dateA.getTime() : 0;
      const tsB = dateB ? dateB.getTime() : 0;

      if (tsA !== tsB) {
        return (tsA - tsB) * sign;
      }

      const createdA = new Date(a.createdAt || 0).getTime();
      const createdB = new Date(b.createdAt || 0).getTime();
      return (createdA - createdB) * sign;
    });
  }

  function loadRequests(defaultFuelPrice) {
    const parsed = safeJsonParse(localStorage.getItem(STORAGE_KEYS.requests), []);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((raw) => normalizeRequest(raw, defaultFuelPrice))
      .filter((item) => item && isCoreRequestValid(item));
  }

  function persistRequests() {
    localStorage.setItem(STORAGE_KEYS.requests, JSON.stringify(state.requests));
  }

  function normalizeRequest(raw, defaultFuelPrice) {
    if (!raw || typeof raw !== 'object') {
      return null;
    }

    const hours = toNonNegativeNumber(raw.hours);
    const amount = toNonNegativeNumber(raw.amount);

    const optionalFuelLiters = toOptionalNonNegativeNumber(raw.fuelLiters);
    const fuelLiters = Number.isFinite(optionalFuelLiters)
      ? optionalFuelLiters
      : round2(hours * DEFAULT_FUEL_CONSUMPTION_PER_HOUR);

    const optionalFuelPrice = toOptionalPositiveNumber(raw.fuelPrice);
    const fuelPrice = Number.isFinite(optionalFuelPrice)
      ? optionalFuelPrice
      : (Number.isFinite(defaultFuelPrice) && defaultFuelPrice > 0 ? defaultFuelPrice : DEFAULT_FUEL_PRICE);

    const fuelCost = round2(fuelLiters * fuelPrice);
    const profit = round2(amount - fuelCost);

    return {
      id: String(raw.id || createId()),
      name: String(raw.name || '').trim(),
      phone: String(raw.phone || '').trim(),
      date: String(raw.date || '').trim(),
      workType: String(raw.workType || '').trim(),
      address: String(raw.address || '').trim(),
      hours,
      amount,
      fuelLiters,
      fuelPrice,
      fuelCost,
      profit,
      status: resolveStatus(raw.status, raw.date),
      createdAt: raw.createdAt ? String(raw.createdAt) : new Date().toISOString()
    };
  }

  function resolveStatus(rawStatus, dateInput) {
    if (isDateBeforeToday(dateInput)) {
      return REQUEST_STATUSES.completed;
    }

    return rawStatus === REQUEST_STATUSES.completed ? REQUEST_STATUSES.completed : REQUEST_STATUSES.planned;
  }

  function isDateBeforeToday(dateInput) {
    const date = parseDate(dateInput);
    if (!date) {
      return false;
    }

    const today = startOfLocalDay(new Date());
    return date < today;
  }

  function loadFuelCache() {
    const parsed = safeJsonParse(localStorage.getItem(STORAGE_KEYS.fuel), null);

    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    if (!Number.isFinite(Number(parsed.price)) || !parsed.fetchedAt || !parsed.source) {
      return null;
    }

    return {
      price: Number(parsed.price),
      source: String(parsed.source),
      fetchedAt: String(parsed.fetchedAt)
    };
  }

  function persistFuelCache() {
    if (!state.fuelCache) {
      return;
    }

    localStorage.setItem(STORAGE_KEYS.fuel, JSON.stringify(state.fuelCache));
  }

  function getCurrentFuelPriceNumber() {
    if (state.fuelCache && Number.isFinite(state.fuelCache.price) && state.fuelCache.price > 0) {
      return state.fuelCache.price;
    }
    return DEFAULT_FUEL_PRICE;
  }

  function safeJsonParse(value, fallback) {
    if (!value) {
      return fallback;
    }

    try {
      return JSON.parse(value);
    } catch (_error) {
      return fallback;
    }
  }

  function createId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    return `req-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  }

  function parseDate(dateInput) {
    if (!dateInput) {
      return null;
    }

    const date = new Date(`${dateInput}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function isSameDay(a, b) {
    return Boolean(a) && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  function isSameMonth(a, b) {
    return Boolean(a) && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
  }

  function startOfLocalDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function endOfLocalDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
  }

  function toInputDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function formatDate(dateInput) {
    const date = parseDate(dateInput);
    if (!date) {
      return '-';
    }

    return new Intl.DateTimeFormat('ru-RU').format(date);
  }

  function formatLongDate(dateInput) {
    const date = parseDate(dateInput);
    if (!date) {
      return '-';
    }

    return new Intl.DateTimeFormat('ru-RU', {
      weekday: 'short',
      day: 'numeric',
      month: 'long'
    }).format(date);
  }

  function formatDateTime(isoString) {
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) {
      return '-';
    }

    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  function formatHours(value) {
    return Number.isInteger(value) ? String(value) : formatDecimal(value);
  }

  function formatDecimal(value) {
    return new Intl.NumberFormat('ru-RU', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(value);
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      maximumFractionDigits: 0
    }).format(value);
  }

  function normalizePhone(phone) {
    return String(phone || '').replace(/\D/g, '');
  }

  function csvEscape(value) {
    const escaped = String(value ?? '').replace(/"/g, '""');
    return `"${escaped}"`;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getMinutesDiff(from, to) {
    return Math.abs((to.getTime() - from.getTime()) / 60000);
  }

  function toNonNegativeNumber(value) {
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0) {
      return 0;
    }
    return number;
  }

  function toOptionalNonNegativeNumber(value) {
    if (value === null || value === undefined || value === '') {
      return NaN;
    }

    const number = Number(value);
    if (!Number.isFinite(number) || number < 0) {
      return NaN;
    }

    return number;
  }

  function toOptionalPositiveNumber(value) {
    if (value === null || value === undefined || value === '') {
      return NaN;
    }

    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0) {
      return NaN;
    }

    return number;
  }

  function round2(value) {
    return Math.round(Number(value) * 100) / 100;
  }

  // --- Провайдеры цены топлива (расширяемая архитектура) ---

  function DriffFuelProvider({ label, urls }) {
    this.label = label;
    this.urls = Array.isArray(urls) ? urls : [];
  }

  DriffFuelProvider.prototype.getPrice = async function getPrice() {
    for (const url of this.urls) {
      try {
        const response = await fetch(url, {
          cache: 'no-store',
          headers: {
            Accept: 'text/html,application/json;q=0.9,*/*;q=0.8'
          }
        });

        if (!response.ok) {
          continue;
        }

        const html = await response.text();
        const price = extractDriffDieselPrice(html);

        if (!Number.isFinite(price) || price <= 0) {
          continue;
        }

        return {
          price,
          source: this.label,
          fetchedAt: new Date().toISOString()
        };
      } catch (_error) {
        // Пробуем следующий прокси-источник.
      }
    }

    throw new Error('Driff provider unavailable');
  };

  function extractDriffDieselPrice(html) {
    const raw = String(html || '');
    if (!raw) {
      return null;
    }

    const plain = raw
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/\s+/g, ' ');

    const keywordPatterns = [
      /(?:дт|дизел[ья])[^0-9]{0,80}(\d{2,3}(?:[\.,]\d{1,2})?)/i,
      /(?:цена|стоимост[ьи]|средн\w*)[^0-9]{0,80}(\d{2,3}(?:[\.,]\d{1,2})?)/i
    ];

    for (const pattern of keywordPatterns) {
      const match = plain.match(pattern) || raw.match(pattern);
      if (match && match[1]) {
        const value = toFuelNumber(match[1]);
        if (Number.isFinite(value) && value >= 35 && value <= 120) {
          return value;
        }
      }
    }

    const currencyMatches = Array.from(raw.matchAll(/(\d{2,3}(?:[\.,]\d{1,2})?)\s*(?:₽|руб)/gi)).map((item) => item[1]);
    const jsonMatches = Array.from(raw.matchAll(/"(?:price|value|cost)"\s*:\s*"?(\d{2,3}(?:[\.,]\d{1,2})?)/gi)).map((item) => item[1]);
    const genericMatches = Array.from(plain.matchAll(/\b(\d{2,3}(?:[\.,]\d{1,2})?)\b/g)).map((item) => item[1]);

    return pickPlausibleFuelPrice([...currencyMatches, ...jsonMatches, ...genericMatches]);
  }

  function pickPlausibleFuelPrice(values) {
    const normalized = values
      .map(toFuelNumber)
      .filter((value) => Number.isFinite(value) && value >= 35 && value <= 120);

    if (!normalized.length) {
      return null;
    }

    const decimalValues = normalized.filter((value) => !Number.isInteger(value));
    const pool = decimalValues.length ? decimalValues : normalized;
    const sample = pool.slice(-7);
    const avg = sample.reduce((sum, value) => sum + value, 0) / sample.length;

    return Number(avg.toFixed(2));
  }

  function toFuelNumber(input) {
    const value = Number(String(input).replace(',', '.'));
    return Number.isFinite(value) ? value : NaN;
  }

  function HtmlFuelProvider({ label, url, pattern }) {
    this.label = label;
    this.url = url;
    this.pattern = pattern;
  }

  HtmlFuelProvider.prototype.getPrice = async function getPrice() {
    const response = await fetch(this.url, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`HTML provider failed: ${response.status}`);
    }

    const html = await response.text();
    const matched = html.match(this.pattern);

    if (!matched || !matched[1]) {
      throw new Error('HTML provider did not find diesel price');
    }

    const price = Number(String(matched[1]).replace(',', '.'));
    if (!Number.isFinite(price) || price <= 0) {
      throw new Error('HTML provider returned invalid price');
    }

    return {
      price,
      source: this.label,
      fetchedAt: new Date().toISOString()
    };
  };
})();

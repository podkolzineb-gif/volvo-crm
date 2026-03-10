(() => {
  'use strict';

  const STORAGE_KEYS = {
    requests: 'mini_crm_requests_v1',
    fuel: 'mini_crm_fuel_cache_v1'
  };

  // Фичи для будущего роста CRM. Переключатели можно использовать в новых модулях.
  const features = {
    machines: false,
    employees: false,
    marketing: false,
    payments: false
  };

  const state = {
    requests: loadRequests(),
    fuelCache: loadFuelCache()
  };

  const fuelConfig = {
    maxCacheAgeMinutes: 180,
    providers: [
      new JsonFuelProvider({
        label: 'Fuel API (пример)',
        url: 'https://example.com/api/fuel/diesel',
        extractPrice: (payload) =>
          Number(payload?.diesel ?? payload?.price ?? payload?.data?.diesel ?? payload?.data?.price)
      }),
      new HtmlFuelProvider({
        label: 'Лукойл (парсер через прокси)',
        url: 'https://api.allorigins.win/raw?url=https://auto.lukoil.ru/ru/Prices',
        pattern: /ДТ[^0-9]{0,40}(\d+[\.,]\d{1,2})/i
      })
    ]
  };

  const els = {
    tabs: Array.from(document.querySelectorAll('.tab-btn')),
    sections: Array.from(document.querySelectorAll('.section')),
    requestForm: document.getElementById('requestForm'),
    formMessage: document.getElementById('formMessage'),
    worksTableBody: document.getElementById('worksTableBody'),
    clientsTableBody: document.getElementById('clientsTableBody'),
    exportCsvBtn: document.getElementById('exportCsvBtn'),
    refreshFuelBtn: document.getElementById('refreshFuelBtn'),
    fuelPrice: document.getElementById('fuelPrice'),
    fuelMeta: document.getElementById('fuelMeta'),
    nextJob: document.getElementById('nextJob'),
    todayHours: document.getElementById('todayHours'),
    todayAmount: document.getElementById('todayAmount'),
    monthHours: document.getElementById('monthHours'),
    monthAmount: document.getElementById('monthAmount'),
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
    els.tabs.forEach((tab) => {
      tab.addEventListener('click', () => switchSection(tab.dataset.section));
    });

    els.requestForm.addEventListener('submit', handleFormSubmit);
    els.exportCsvBtn.addEventListener('click', handleExportClientsCsv);
    els.refreshFuelBtn.addEventListener('click', () => refreshFuelPrice(true));
  }

  function switchSection(sectionId) {
    els.tabs.forEach((tab) => {
      tab.classList.toggle('active', tab.dataset.section === sectionId);
    });

    els.sections.forEach((section) => {
      section.classList.toggle('active', section.id === sectionId);
    });
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

    const request = {
      id: createId(),
      name: String(formData.get('name') || '').trim(),
      phone: String(formData.get('phone') || '').trim(),
      date: String(formData.get('date') || '').trim(),
      workType: String(formData.get('workType') || '').trim(),
      address: String(formData.get('address') || '').trim(),
      hours: Number(formData.get('hours')),
      amount: Number(formData.get('amount')),
      createdAt: new Date().toISOString()
    };

    if (!isValidRequest(request)) {
      setFormMessage('Проверьте форму: заполните все поля, часы и сумма должны быть >= 0.', 'error');
      return;
    }

    state.requests.push(request);
    persistRequests();
    renderAll();

    els.requestForm.reset();
    setDefaultDate();
    setFormMessage('Заявка успешно добавлена.', 'success');
    switchSection('dashboard');
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
        request.hours >= 0 &&
        request.amount >= 0
    );
  }

  function setFormMessage(message, type) {
    els.formMessage.textContent = message;
    els.formMessage.classList.remove('success', 'error');
    if (type) {
      els.formMessage.classList.add(type);
    }
  }

  function renderAll() {
    const sortedRequests = getSortedRequestsByDate(state.requests);
    renderDashboard(sortedRequests);
    renderNextJob(sortedRequests);
    renderWorksTable(sortedRequests);
    renderClientsTable(sortedRequests);
  }

  function renderDashboard(requests) {
    const now = new Date();

    const todayRequests = requests.filter((request) => isSameDay(parseDate(request.date), now));
    const monthRequests = requests.filter((request) => isSameMonth(parseDate(request.date), now));

    const todayHours = todayRequests.reduce((sum, item) => sum + item.hours, 0);
    const todayAmount = todayRequests.reduce((sum, item) => sum + item.amount, 0);
    const monthHours = monthRequests.reduce((sum, item) => sum + item.hours, 0);
    const monthAmount = monthRequests.reduce((sum, item) => sum + item.amount, 0);

    els.todayHours.textContent = formatHours(todayHours);
    els.todayAmount.textContent = formatCurrency(todayAmount);
    els.monthHours.textContent = formatHours(monthHours);
    els.monthAmount.textContent = formatCurrency(monthAmount);
  }

  function renderNextJob(requests) {
    const today = startOfLocalDay(new Date());

    const futureRequests = requests
      .filter((request) => {
        const date = parseDate(request.date);
        return date && date > today;
      })
      .sort((a, b) => parseDate(a.date) - parseDate(b.date));

    const nextJob = futureRequests[0];

    if (!nextJob) {
      els.nextJob.className = 'next-job-empty';
      els.nextJob.textContent = 'Пока нет будущих заявок.';
      return;
    }

    els.nextJob.className = '';
    els.nextJob.innerHTML = [
      row('Имя', nextJob.name),
      row('Дата', formatDate(nextJob.date)),
      row('Тип работ', nextJob.workType),
      row('Адрес', nextJob.address),
      row('Часы', formatHours(nextJob.hours)),
      row('Сумма', formatCurrency(nextJob.amount))
    ].join('');
  }

  function row(label, value) {
    return `<div class="next-job-row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value))}</strong></div>`;
  }

  function renderWorksTable(requests) {
    if (!requests.length) {
      els.worksTableBody.innerHTML = '<tr><td class="empty-cell" colspan="6">Пока нет заявок.</td></tr>';
      return;
    }

    els.worksTableBody.innerHTML = requests
      .map(
        (request) => `
          <tr>
            <td>${escapeHtml(formatDate(request.date))}</td>
            <td>${escapeHtml(request.name)}</td>
            <td>${escapeHtml(request.workType)}</td>
            <td>${escapeHtml(formatHours(request.hours))}</td>
            <td>${escapeHtml(formatCurrency(request.amount))}</td>
            <td>${escapeHtml(request.address)}</td>
          </tr>
        `
      )
      .join('');
  }

  function renderClientsTable(requests) {
    const clients = aggregateClients(requests);

    if (!clients.length) {
      els.clientsTableBody.innerHTML = '<tr><td class="empty-cell" colspan="4">Пока нет клиентов.</td></tr>';
      return;
    }

    els.clientsTableBody.innerHTML = clients
      .map(
        (client) => `
          <tr>
            <td>${escapeHtml(client.name)}</td>
            <td>${escapeHtml(client.phone)}</td>
            <td>${escapeHtml(String(client.requestsCount))}</td>
            <td>${escapeHtml(formatCurrency(client.totalAmount))}</td>
          </tr>
        `
      )
      .join('');
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
      setFormMessage('Нет данных для экспорта CSV.', 'error');
      return;
    }

    const headers = ['Имя', 'Телефон', 'Количество заявок', 'Общая сумма'];
    const rows = clients.map((client) => [
      client.name,
      client.phone,
      String(client.requestsCount),
      String(client.totalAmount)
    ]);

    const csvContent = [headers, ...rows]
      .map((rowItems) => rowItems.map(csvEscape).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `clients-${toInputDate(new Date())}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
    setFormMessage('CSV с клиентами сформирован.', 'success');
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
        // Переходим к следующему провайдеру, если текущий недоступен.
      }
    }

    if (cache) {
      renderFuel(cache.price, `${cache.source} (кэш)`, cache.fetchedAt, true);
      els.fuelMeta.textContent = `Внешний источник недоступен. Показаны кэш-данные от ${formatDateTime(cache.fetchedAt)}.`;
      return;
    }

    els.fuelPrice.textContent = '-';
    els.fuelMeta.textContent = 'Источник цены недоступен. Подключите рабочий API в конфиге fuelConfig.providers.';
  }

  function renderFuel(price, source, fetchedAt, fromCache) {
    els.fuelPrice.textContent = `${formatDecimal(price)} ₽/л`;
    els.fuelMeta.textContent = `${fromCache ? 'Кэш' : 'Источник'}: ${source}. Обновлено: ${formatDateTime(fetchedAt)}.`;
  }

  function renderFeatureFlags() {
    els.featureFlags.textContent = `features = ${JSON.stringify(features, null, 2)}`;
  }

  function getSortedRequestsByDate(requests) {
    return [...requests].sort((a, b) => parseDate(a.date) - parseDate(b.date));
  }

  function loadRequests() {
    const parsed = safeJsonParse(localStorage.getItem(STORAGE_KEYS.requests), []);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map(normalizeRequest)
      .filter((item) => item && isValidRequest(item));
  }

  function persistRequests() {
    localStorage.setItem(STORAGE_KEYS.requests, JSON.stringify(state.requests));
  }

  function normalizeRequest(raw) {
    if (!raw || typeof raw !== 'object') {
      return null;
    }

    return {
      id: String(raw.id || createId()),
      name: String(raw.name || '').trim(),
      phone: String(raw.phone || '').trim(),
      date: String(raw.date || '').trim(),
      workType: String(raw.workType || '').trim(),
      address: String(raw.address || '').trim(),
      hours: Number(raw.hours),
      amount: Number(raw.amount),
      createdAt: raw.createdAt ? String(raw.createdAt) : new Date().toISOString()
    };
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

  // --- Провайдеры цены топлива (расширяемая архитектура) ---

  function JsonFuelProvider({ label, url, extractPrice }) {
    this.label = label;
    this.url = url;
    this.extractPrice = extractPrice;
  }

  JsonFuelProvider.prototype.getPrice = async function getPrice() {
    const response = await fetch(this.url, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`JSON provider failed: ${response.status}`);
    }

    const payload = await response.json();
    const price = Number(this.extractPrice(payload));

    if (!Number.isFinite(price) || price <= 0) {
      throw new Error('JSON provider returned invalid price');
    }

    return {
      price,
      source: this.label,
      fetchedAt: new Date().toISOString()
    };
  };

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


(() => {
  'use strict';

  // ================================
  // Constants
  // ================================
  const STORAGE_KEYS = {
    requests: 'tractor_crm_requests_v2',
    clients: 'tractor_crm_clients_v2',
    machines: 'tractor_crm_machines_v2',
    employees: 'tractor_crm_employees_v2',
    services: 'tractor_crm_services_v2',
    zones: 'tractor_crm_zones_v2',
    marketingTasks: 'tractor_crm_marketing_tasks_v1',
    ui: 'tractor_crm_ui_state_v2',
    sentNotifications: 'tractor_crm_sent_notifications_v2',
    inAppNotifications: 'tractor_crm_in_app_notifications_v2',
    remote: 'tractor_crm_remote_state_v1'
  };

  const REQUEST_STATUS_LABELS = {
    new: 'Новая',
    confirmed: 'Подтверждена',
    in_work: 'В работе',
    completed: 'Завершена',
    canceled: 'Отменена',
    overdue: 'Просрочена'
  };

  const PAYMENT_STATUS_LABELS = {
    unpaid: 'Не оплачено',
    partial: 'Частично',
    paid: 'Оплачено'
  };

  const MACHINE_STATUS_LABELS = {
    free: 'Свободна',
    busy: 'Занята',
    repair: 'Ремонт',
    offline: 'Недоступна'
  };

  const EMPLOYEE_STATUS_LABELS = {
    active: 'Активен',
    dayoff: 'Выходной',
    unavailable: 'Недоступен'
  };

  const SOURCE_LABELS = {
    avito: 'Avito',
    website: 'Сайт',
    telegram: 'Telegram',
    whatsapp: 'WhatsApp',
    repeat: 'Повторный клиент',
    referral: 'Рекомендация',
    other: 'Другое',
    online_booking: 'Онлайн-бронирование',
    landing: 'Лендинг',
    wfolio: 'Wfolio',
    booking_form: 'Форма бронирования'
  };

  const SOURCE_OPTIONS = [
    { value: '', label: 'Не указан' },
    { value: 'avito', label: 'Avito' },
    { value: 'website', label: 'Сайт' },
    { value: 'telegram', label: 'Telegram' },
    { value: 'whatsapp', label: 'WhatsApp' },
    { value: 'repeat', label: 'Повторный клиент' },
    { value: 'referral', label: 'Рекомендация' },
    { value: 'other', label: 'Другое' },
    { value: 'online_booking', label: 'Онлайн-бронирование' },
    { value: 'landing', label: 'Лендинг' },
    { value: 'wfolio', label: 'Wfolio' },
    { value: 'booking_form', label: 'Форма бронирования' }
  ];

  const MACHINE_TYPES = ['погрузчик', 'экскаватор', 'мини-трактор', 'самосвал'];

  const BOOKING_SLOTS = [
    { start: '08:00', end: '10:00' },
    { start: '10:00', end: '12:00' },
    { start: '12:00', end: '14:00' },
    { start: '14:00', end: '16:00' },
    { start: '16:00', end: '18:00' }
  ];

  const CAMPAIGN_TEMPLATES = [
    {
      id: 'tpl_snow',
      title: 'Сезонная чистка снега',
      text: 'Здравствуйте, {name}! В вашем районе ({settlement}) открыли запись на чистку снега. Готовы забронировать слот?'
    },
    {
      id: 'tpl_spring',
      title: 'Весенняя планировка участка',
      text: 'Здравствуйте, {name}! Напоминаем про весеннюю планировку участка. Сейчас есть свободные окна на этой неделе.'
    },
    {
      id: 'tpl_ground',
      title: 'Вывоз грунта',
      text: 'Здравствуйте, {name}! Если планируете земляные работы, можем взять вывоз грунта и погрузку под ключ.'
    },
    {
      id: 'tpl_tomorrow',
      title: 'Окно на завтра',
      text: 'Здравствуйте, {name}! На завтра освободилось окно по услуге "{service}". Подтвердим запись?'
    },
    {
      id: 'tpl_repeat',
      title: 'Повторный клиент',
      text: 'Здравствуйте, {name}! Спасибо, что снова выбираете нас. Для вас приоритетное окно на ближайшие дни.'
    },
    {
      id: 'tpl_debt',
      title: 'Долг по оплате',
      text: 'Здравствуйте, {name}! Напоминаем про остаток оплаты по заявке. При необходимости отправим ссылку для удобной оплаты.'
    },
    {
      id: 'tpl_review',
      title: 'Запрос отзыва',
      text: 'Здравствуйте, {name}! Спасибо за заказ. Будем благодарны за короткий отзыв о нашей работе.'
    }
  ];

  const MARKETING_TASK_LABELS = {
    followup_30: 'Позвонить через 30 дней',
    seasonal_offer: 'Предложить сезонную услугу',
    review_request: 'Запросить отзыв',
    debt_reminder: 'Напомнить о долге'
  };

  const DEFAULT_SERVICE_SEED = [
    {
      id: 'svc_snow',
      name: 'Чистка снега',
      recommendedMachineType: 'мини-трактор',
      minPrice: 5000,
      minHours: 2,
      seasonality: 'зима',
      needsAdditionalMachine: false,
      relatedServices: ['Погрузка / разгрузка'],
      description: 'Расчистка территории и подъездных путей.'
    },
    {
      id: 'svc_plan',
      name: 'Планировка участка',
      recommendedMachineType: 'погрузчик',
      minPrice: 7000,
      minHours: 3,
      seasonality: 'весна',
      needsAdditionalMachine: false,
      relatedServices: ['Отсыпка'],
      description: 'Выравнивание, планировка и подготовка участка.'
    },
    {
      id: 'svc_trench',
      name: 'Копка траншей',
      recommendedMachineType: 'экскаватор',
      minPrice: 9000,
      minHours: 4,
      seasonality: 'круглогодично',
      needsAdditionalMachine: false,
      relatedServices: ['Вывоз грунта'],
      description: 'Траншеи под коммуникации и дренаж.'
    },
    {
      id: 'svc_ground',
      name: 'Вывоз грунта',
      recommendedMachineType: 'самосвал',
      minPrice: 12000,
      minHours: 4,
      seasonality: 'круглогодично',
      needsAdditionalMachine: true,
      relatedServices: ['Копка траншей'],
      description: 'Погрузка и вывоз грунта/мусора.'
    },
    {
      id: 'svc_fill',
      name: 'Отсыпка',
      recommendedMachineType: 'самосвал',
      minPrice: 10000,
      minHours: 3,
      seasonality: 'лето',
      needsAdditionalMachine: true,
      relatedServices: ['Планировка участка'],
      description: 'Отсыпка песком/щебнем и разравнивание.'
    },
    {
      id: 'svc_load',
      name: 'Погрузка / разгрузка',
      recommendedMachineType: 'погрузчик',
      minPrice: 6000,
      minHours: 2,
      seasonality: 'круглогодично',
      needsAdditionalMachine: false,
      relatedServices: ['Вывоз грунта'],
      description: 'Работы с материалами на объекте.'
    }
  ];

  const DEFAULT_ZONE_SEED = [
    { id: 'zone_1', name: 'Центральный', isActive: true, onlineEnabled: true, markup: 0, comment: 'Базовая зона обслуживания' },
    { id: 'zone_2', name: 'Северный', isActive: true, onlineEnabled: true, markup: 1200, comment: 'Удаленный район' },
    { id: 'zone_3', name: 'Южный', isActive: true, onlineEnabled: false, markup: 1800, comment: 'Только через диспетчера' }
  ];


  function getDefaultRemoteState() {
    return {
      apiBaseUrl: 'http://localhost:8787',
      enabled: true,
      pollMs: 30000,
      lastSyncAt: '',
      lastError: '',
      readToken: ''
    };
  }
  function getDefaultUIState() {
    return {
      activeScreen: 'dashboard',
      request: {
        search: '',
        status: 'all',
        settlement: 'all',
        workType: 'all',
        source: 'all',
        segment: 'all',
        period: 'all',
        sortBy: 'objectDate',
        sortDir: 'asc',
        viewMode: 'table'
      },
      clients: {
        segment: 'all',
        source: 'all',
        settlement: 'all',
        service: 'all',
        selectedClientId: ''
      },
      calendar: {
        focusDate: toDateOnlyString(new Date()),
        range: 'week',
        mode: 'list'
      },
      campaigns: {
        segment: 'all',
        source: 'all',
        settlement: 'all',
        service: 'all',
        templateId: CAMPAIGN_TEMPLATES[0].id,
        message: CAMPAIGN_TEMPLATES[0].text
      }
    };
  }

  const state = {
    requests: [],
    clients: [],
    machines: [],
    employees: [],
    services: [],
    zones: [],
    marketingTasks: [],
    ui: getDefaultUIState(),
    sentNotificationKeys: new Set(),
    inAppNotifications: [],
    remote: getDefaultRemoteState(),
    editors: {
      request: 'create',
      client: 'create',
      machine: 'create',
      employee: 'create',
      service: 'create',
      zone: 'create'
    }
  };

  const els = {};
  let remoteSyncTimer = null;

  // ================================
  // Init
  // ================================
  document.addEventListener('DOMContentLoaded', init);

  function init() {
    cacheElements();
    loadState();
    bindEvents();
    renderAll();
    syncRequestsFromRemote({ silent: true });
    startRemoteSyncLoop();
    runReminderScan();
    setInterval(runReminderScan, 60 * 1000);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        runReminderScan();
        syncRequestsFromRemote({ silent: true });
      }
    });
  }

  function cacheElements() {
    const ids = [
      'mainNav', 'mobileNavToggle',
      'syncRemoteBtn', 'setRemoteApiBtn', 'remoteSyncInfo',
      'newRequestBtn', 'notifyPermissionBtn',
      'inAppNoticeBox', 'noticeList', 'clearNoticesBtn',

      'summaryCards', 'opsSummaryCards', 'analyticsLoadByDay', 'analyticsByMachineType', 'analyticsByEmployee', 'analyticsUnassigned', 'analyticsSourceCount', 'analyticsSourceRevenue', 'marketingTasksList',
      'dashboardRequestsList', 'dashboardCalendarMonth', 'dashboardCalendarGrid', 'dashboardDayTitle', 'dashboardCalendarTasks',
      'dashboardMachineCards', 'dashboardClientsList', 'dashboardFinanceBox', 'dashboardAddRequestBtn', 'dashboardCreateCampaignBtn',

      'searchInput', 'statusFilter', 'settlementFilter', 'workTypeFilter', 'sourceFilter', 'requestSegmentFilter', 'periodFilter', 'sortBySelect', 'sortDirSelect',
      'tableViewBtn', 'cardsViewBtn',
      'exportPhonesBtn', 'exportCallListBtn', 'exportFullCsvBtn', 'exportJsonBtn', 'importJsonBtn', 'jsonFileInput',
      'resultsInfo', 'tableWrap', 'cardsWrap', 'requestsTableBody',

      'requestForm', 'formTitle', 'requestIdInput', 'clientNameInput', 'phoneInput', 'sourceInput', 'tagsInput',
      'settlementInput', 'streetInput', 'houseInput', 'addressInput',
      'serviceInput', 'workTypeInput', 'objectDateInput', 'statusInput', 'startTimeInput', 'durationHoursInput', 'endTimeInput', 'desiredTimeInput',
      'assignedEmployeeInput', 'assignedMachinesInput', 'crewEmployeesInput', 'recommendedTypeInput',
      'costInput', 'prepaymentInput', 'balanceInput', 'paymentStatusInput', 'paymentMethodInput', 'paymentLinkInput', 'paymentDateInput',
      'generatePaymentLinkBtn', 'markPaidBtn',
      'dispatcherNoteInput', 'commentInput', 'internalCommentInput',
      'assignmentHints', 'conflictBox', 'resetFormBtn',

      'clientsInfo', 'clientsTableBody', 'clientSegmentFilter', 'clientSourceFilter', 'clientSettlementFilter', 'clientServiceFilter',
      'clientFormTitle', 'clientForm', 'clientIdInput', 'clientFullNameInput', 'clientPhoneInput', 'clientSourceInput', 'clientTagsInput', 'clientAddressInput', 'clientCommentInput', 'resetClientFormBtn',
      'clientHistoryCard', 'clientHistoryContent',

      'machinesInfo', 'machinesTableBody',
      'machineFormTitle', 'machineForm', 'machineIdInput', 'machineNameInput', 'machineTypeInput', 'machineInternalInput', 'machinePlateInput',
      'machineStatusInput', 'machineRateInput', 'machineMinCallInput', 'machineDefaultEmployeeInput', 'machineZonesInput', 'machineCommentInput', 'machineActiveInput', 'resetMachineFormBtn',

      'employeesInfo', 'employeesTableBody',
      'employeeFormTitle', 'employeeForm', 'employeeIdInput', 'employeeNameInput', 'employeePhoneInput', 'employeeRoleInput', 'employeeRateInput',
      'employeeMachineTypesInput', 'employeeScheduleInput', 'employeeDaysOffInput', 'employeeStatusInput', 'employeeCommentInput', 'resetEmployeeFormBtn',

      'servicesInfo', 'servicesTableBody',
      'serviceFormTitle', 'serviceForm', 'serviceIdInput', 'serviceNameInput', 'serviceMachineTypeInput', 'serviceMinPriceInput', 'serviceMinHoursInput',
      'serviceSeasonalityInput', 'serviceExtraMachineInput', 'serviceRelatedInput', 'serviceDescriptionInput', 'resetServiceFormBtn',

      'zonesInfo', 'zonesTableBody',
      'zoneFormTitle', 'zoneForm', 'zoneIdInput', 'zoneNameInput', 'zoneMarkupInput', 'zoneActiveInput', 'zoneOnlineInput', 'zoneCommentInput', 'resetZoneFormBtn',

      'calendarDateInput', 'calendarRangeInput', 'calendarModeInput', 'calendarListPanel', 'calendarMachinePanel', 'calendarListView', 'calendarMachineView',

      'bookingForm', 'bookingServiceInput', 'bookingZoneInput', 'bookingStreetInput', 'bookingHouseInput', 'bookingDateInput', 'bookingSlotInput', 'bookingNameInput', 'bookingPhoneInput', 'bookingCommentInput', 'bookingPricePreview', 'bookingAvailability', 'bookingZonesStatus', 'bookingCalendarMini', 'bookingCalendarTitle', 'bookingSummaryList', 'bookingTotalPreview',

      'campaignSegmentInput', 'campaignSourceInput', 'campaignSettlementInput', 'campaignServiceInput', 'campaignTemplateInput', 'campaignMessageInput',
      'campaignPreviewBtn', 'campaignCopyPhonesBtn', 'campaignExportCsvBtn', 'campaignPrepareChannelBtn',
      'campaignPreviewBox', 'campaignRecipientsInfo', 'campaignRecipientsList'
    ];

    ids.forEach((id) => {
      els[id] = document.getElementById(id);
    });

    els.screens = Array.from(document.querySelectorAll('.screen[data-screen]'));
    els.navButtons = Array.from(document.querySelectorAll('.nav-btn[data-screen]'));
  }

  // ================================
  // Storage
  // ================================
  function loadState() {
    const oldUi = safeParseJson(localStorage.getItem(STORAGE_KEYS.ui), loadLegacyArrayIfNeeded(STORAGE_KEYS.ui) || {});

    state.requests = loadArray(STORAGE_KEYS.requests).map(normalizeRequest);
    state.clients = loadArray(STORAGE_KEYS.clients).map(normalizeClient);
    state.machines = loadArray(STORAGE_KEYS.machines).map(normalizeMachine);
    state.employees = loadArray(STORAGE_KEYS.employees).map(normalizeEmployee);
    state.services = loadArray(STORAGE_KEYS.services).map(normalizeService);
    state.zones = loadArray(STORAGE_KEYS.zones).map(normalizeZone);
    state.marketingTasks = loadArray(STORAGE_KEYS.marketingTasks).map(normalizeMarketingTask);

    if (!state.services.length) {
      state.services = DEFAULT_SERVICE_SEED.map((item) => normalizeService(item));
      saveServices();
    }


    if (!state.zones.length) {
      state.zones = DEFAULT_ZONE_SEED.map((item) => normalizeZone(item));
      saveZones();
    }

    state.ui = normalizeUIState(oldUi);

    state.sentNotificationKeys = new Set(loadArray(STORAGE_KEYS.sentNotifications));
    state.inAppNotifications = loadArray(STORAGE_KEYS.inAppNotifications).slice(0, 30);
    state.remote = normalizeRemoteState(safeParseJson(localStorage.getItem(STORAGE_KEYS.remote), {}));

    migrateLegacyDataIfNeeded();
    resetAllForms();
  }

  function safeParseJson(raw, fallback) {
    try {
      if (!raw) {
        return fallback;
      }
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function saveRequests() { localStorage.setItem(STORAGE_KEYS.requests, JSON.stringify(state.requests)); }
  function saveClients() { localStorage.setItem(STORAGE_KEYS.clients, JSON.stringify(state.clients)); }
  function saveMachines() { localStorage.setItem(STORAGE_KEYS.machines, JSON.stringify(state.machines)); }
  function saveEmployees() { localStorage.setItem(STORAGE_KEYS.employees, JSON.stringify(state.employees)); }
  function saveServices() { localStorage.setItem(STORAGE_KEYS.services, JSON.stringify(state.services)); }
  function saveZones() { localStorage.setItem(STORAGE_KEYS.zones, JSON.stringify(state.zones)); }
  function saveMarketingTasks() { localStorage.setItem(STORAGE_KEYS.marketingTasks, JSON.stringify(state.marketingTasks)); }
  function saveUIState() { localStorage.setItem(STORAGE_KEYS.ui, JSON.stringify(state.ui)); }
  function saveSentNotificationKeys() { localStorage.setItem(STORAGE_KEYS.sentNotifications, JSON.stringify([...state.sentNotificationKeys])); }
  function saveInAppNotifications() { localStorage.setItem(STORAGE_KEYS.inAppNotifications, JSON.stringify(state.inAppNotifications.slice(0, 30))); }
  function saveRemoteState() { localStorage.setItem(STORAGE_KEYS.remote, JSON.stringify(state.remote)); }


  function normalizeRemoteState(raw) {
    const defaults = getDefaultRemoteState();
    const source = raw && typeof raw === 'object' ? raw : {};

    const pollMs = Math.max(10000, Math.min(300000, Number(source.pollMs) || defaults.pollMs));

    return {
      apiBaseUrl: normalizeApiBaseUrl(source.apiBaseUrl || defaults.apiBaseUrl),
      enabled: toBoolean(source.enabled, defaults.enabled),
      pollMs,
      lastSyncAt: sanitizeString(source.lastSyncAt),
      lastError: sanitizeString(source.lastError),
      readToken: sanitizeString(source.readToken)
    };
  }
  function normalizeUIState(raw) {
    const defaults = getDefaultUIState();
    const normalized = {
      activeScreen: defaults.activeScreen,
      request: { ...defaults.request },
      clients: { ...defaults.clients },
      calendar: { ...defaults.calendar },
      campaigns: { ...defaults.campaigns }
    };

    if (raw && typeof raw === 'object') {
      if (typeof raw.activeScreen === 'string') normalized.activeScreen = raw.activeScreen;
      if (raw.request && typeof raw.request === 'object') Object.assign(normalized.request, raw.request);
      if (raw.clients && typeof raw.clients === 'object') Object.assign(normalized.clients, raw.clients);
      if (raw.calendar && typeof raw.calendar === 'object') Object.assign(normalized.calendar, raw.calendar);
      if (raw.campaigns && typeof raw.campaigns === 'object') Object.assign(normalized.campaigns, raw.campaigns);

      // Legacy compatibility
      ['search', 'status', 'settlement', 'workType', 'period', 'sortBy', 'sortDir', 'viewMode'].forEach((key) => {
        if (typeof raw[key] === 'string') normalized.request[key] = raw[key];
      });
    }

    if (!normalized.calendar.focusDate) normalized.calendar.focusDate = toDateOnlyString(new Date());
    if (!normalized.campaigns.templateId) normalized.campaigns.templateId = CAMPAIGN_TEMPLATES[0].id;
    if (!normalized.campaigns.message) normalized.campaigns.message = CAMPAIGN_TEMPLATES[0].text;

    return normalized;
  }

  // ================================
  // Helpers
  // ================================
  function uid(prefix = 'id') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  function sanitizeString(value) {
    return String(value ?? '').trim();
  }


  function normalizeApiBaseUrl(value) {
    const raw = sanitizeString(value);
    if (!raw) return getDefaultRemoteState().apiBaseUrl;

    let normalized = raw.replace(/\/+$/, '');
    normalized = normalized.replace(/\/api\/requests$/i, '');
    normalized = normalized.replace(/\/api\/(booking|leads\/create)$/i, '');
    normalized = normalized.replace(/\/api$/i, '');

    return normalized;
  }

  function normalizePhoneForCompare(value) {
    const digits = String(value ?? '').replace(/\D+/g, '');
    if (!digits) return '';
    if (digits.length === 11 && digits.startsWith('8')) return `7${digits.slice(1)}`;
    if (digits.length === 10) return `7${digits}`;
    return digits;
  }

  function formatDateTime(value) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return new Intl.DateTimeFormat('ru-RU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }
  function normalizeNumber(value) {
    const prepared = String(value ?? '')
      .replace(',', '.')
      .replace(/[^0-9.-]/g, '')
      .trim();
    if (!prepared) return 0;
    const parsed = Number(prepared);
    return Number.isFinite(parsed) ? round2(parsed) : 0;
  }

  function round2(value) {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
  }

  function toBoolean(value, fallback) {
    if (typeof value === 'boolean') return value;
    if (value === 'true' || value === '1' || value === 1) return true;
    if (value === 'false' || value === '0' || value === 0) return false;
    return fallback;
  }

  function normalizeTags(value) {
    if (Array.isArray(value)) {
      return value.map((item) => sanitizeString(item)).filter(Boolean);
    }
    return sanitizeString(value)
      .split(',')
      .map((item) => sanitizeString(item))
      .filter(Boolean);
  }

  function normalizeIdArray(value) {
    if (Array.isArray(value)) return value.map((item) => sanitizeString(item)).filter(Boolean);
    if (typeof value === 'string') return normalizeTags(value);
    return [];
  }

  function tagsToText(tags) {
    return normalizeTags(tags).join(', ');
  }

  function parseDateOnly(value) {
    if (!value) return null;
    const parts = String(value).split('-').map(Number);
    if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) return null;
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  function startOfDay(date = new Date()) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function toDateOnlyString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function formatDate(value) {
    const date = parseDateOnly(value);
    if (!date) return '-';
    return new Intl.DateTimeFormat('ru-RU', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
  }

  function formatDateLong(value) {
    const date = parseDateOnly(value);
    if (!date) return '-';
    return new Intl.DateTimeFormat('ru-RU', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
  }

  function addDays(date, days) {
    const clone = new Date(date);
    clone.setDate(clone.getDate() + days);
    return clone;
  }

  function daysBetween(dayA, dayB) {
    const ms = startOfDay(dayB).getTime() - startOfDay(dayA).getTime();
    return Math.floor(ms / (24 * 60 * 60 * 1000));
  }

  function sanitizeTime(value) {
    const raw = sanitizeString(value);
    const match = raw.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return '';
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return '';
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  }

  function parseSlot(slotText) {
    const slot = sanitizeString(slotText);
    const matches = slot.match(/(\d{1,2}:\d{2})/g) || [];
    return {
      start: sanitizeTime(matches[0] || ''),
      end: sanitizeTime(matches[1] || '')
    };
  }

  function timeToMinutes(time) {
    const safe = sanitizeTime(time);
    if (!safe) return 0;
    const [hour, minute] = safe.split(':').map(Number);
    return hour * 60 + minute;
  }

  function minutesToTime(totalMinutes) {
    const minutes = Math.max(0, Math.min(23 * 60 + 59, Math.floor(totalMinutes)));
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  }

  function calcEndTime(startTime, durationHours) {
    const start = sanitizeTime(startTime) || '09:00';
    const mins = Math.max(30, Math.round(normalizeNumber(durationHours || 2) * 60));
    return minutesToTime(timeToMinutes(start) + mins);
  }

  function formatDesiredSlot(start, end) {
    if (!start || !end) return '';
    return `${start}-${end}`;
  }

  function formatMoney(value) {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      maximumFractionDigits: 2
    }).format(normalizeNumber(value));
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function csvEscape(value) {
    const prepared = String(value ?? '');
    return `"${prepared.replace(/"/g, '""')}"`;
  }

  function downloadFile(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function setMultiSelectValues(select, values) {
    const selected = new Set(values || []);
    Array.from(select.options).forEach((option) => {
      option.selected = selected.has(option.value);
    });
  }

  function getMultiSelectValues(select) {
    return Array.from(select.selectedOptions).map((option) => option.value);
  }

  function copyTextToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    const area = document.createElement('textarea');
    area.value = text;
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    area.remove();
    return Promise.resolve();
  }

  // ================================
  // Normalizers
  // ================================
  function sanitizeRequestStatus(value) {
    const allowed = ['new', 'confirmed', 'in_work', 'completed', 'canceled'];
    return allowed.includes(value) ? value : 'new';
  }

  function sanitizeMachineStatus(value) {
    const allowed = ['free', 'busy', 'repair', 'offline'];
    return allowed.includes(value) ? value : 'free';
  }

  function sanitizeEmployeeStatus(value) {
    const allowed = ['active', 'dayoff', 'unavailable'];
    return allowed.includes(value) ? value : 'active';
  }

  function calculateFinancials(cost, prepayment) {
    const normalizedCost = Math.max(0, normalizeNumber(cost));
    const normalizedPrepayment = Math.max(0, normalizeNumber(prepayment));
    const balance = round2(normalizedCost - normalizedPrepayment);

    let paymentStatus = 'unpaid';
    if (normalizedCost > 0 && balance <= 0) paymentStatus = 'paid';
    else if (normalizedPrepayment > 0 && balance > 0) paymentStatus = 'partial';

    return {
      cost: normalizedCost,
      prepayment: normalizedPrepayment,
      balance,
      paymentStatus
    };
  }

  function normalizeRequest(raw) {
    const source = raw || {};
    const nowIso = new Date().toISOString();

    let startTime = sanitizeTime(source.startTime);
    let endTime = sanitizeTime(source.endTime);
    if (!startTime && source.desiredTime) {
      const parsed = parseSlot(source.desiredTime);
      startTime = parsed.start;
      endTime = parsed.end;
    }
    if (!startTime) startTime = '09:00';

    let durationHours = normalizeNumber(source.durationHours);
    if (durationHours <= 0) {
      if (startTime && endTime) durationHours = round2(Math.max(0.5, (timeToMinutes(endTime) - timeToMinutes(startTime)) / 60));
      else durationHours = 2;
    }
    if (!endTime) endTime = calcEndTime(startTime, durationHours);

    const financials = calculateFinancials(source.cost, source.prepayment);

    const zoneId = sanitizeString(source.zoneId);
    const settlement = sanitizeString(source.settlement || source.village);
    const street = sanitizeString(source.street);
    const house = sanitizeString(source.house);
    const composedAddress = [settlement, street, house].filter(Boolean).join(', ');

    return {
      id: sanitizeString(source.id) || uid('req'),
      createdAt: sanitizeString(source.createdAt) || nowIso,
      updatedAt: sanitizeString(source.updatedAt) || nowIso,

      clientName: sanitizeString(source.clientName || source.name),
      phone: sanitizeString(source.phone),
      source: sanitizeString(source.source),
      channel: sanitizeString(source.channel),
      sourcePage: sanitizeString(source.sourcePage),
      landingId: sanitizeString(source.landingId),
      utmSource: sanitizeString(source.utmSource || source.utm_source),
      utmMedium: sanitizeString(source.utmMedium || source.utm_medium),
      utmCampaign: sanitizeString(source.utmCampaign || source.utm_campaign),
      utmContent: sanitizeString(source.utmContent || source.utm_content),
      utmTerm: sanitizeString(source.utmTerm || source.utm_term),
      referrer: sanitizeString(source.referrer),
      createdFrom: sanitizeString(source.createdFrom),
      bookingOrigin: sanitizeString(source.bookingOrigin),
      externalId: sanitizeString(source.externalId),
      tags: normalizeTags(source.tags),

      zoneId,
      settlement,
      street,
      house,
      address: sanitizeString(source.address) || composedAddress,

      serviceId: sanitizeString(source.serviceId),
      workType: sanitizeString(source.workType || source.work),

      objectDate: sanitizeString(source.objectDate || source.date),
      startTime,
      endTime,
      durationHours,
      desiredTime: sanitizeString(source.desiredTime) || formatDesiredSlot(startTime, endTime),

      status: sanitizeRequestStatus(source.status),

      cost: financials.cost,
      prepayment: financials.prepayment,
      balance: financials.balance,
      paymentMethod: sanitizeString(source.paymentMethod),
      paymentStatus: financials.paymentStatus,
      paymentLink: sanitizeString(source.paymentLink),
      paymentDate: sanitizeString(source.paymentDate),

      assignedMachineIds: normalizeIdArray(source.assignedMachineIds || source.machineIds),
      assignedEmployeeId: sanitizeString(source.assignedEmployeeId || source.employeeId),
      crewEmployeeIds: normalizeIdArray(source.crewEmployeeIds || source.crewIds),

      comment: sanitizeString(source.comment),
      internalComment: sanitizeString(source.internalComment || source.internalNotes),
      internalNotes: sanitizeString(source.internalNotes || source.internalComment),
      dispatcherNote: sanitizeString(source.dispatcherNote),

      onlineBooking: toBoolean(source.onlineBooking, source.source === 'online_booking' || source.createdFrom === 'wfolio')
    };
  }

  function normalizeClient(raw) {
    const source = raw || {};
    const nowIso = new Date().toISOString();

    return {
      id: sanitizeString(source.id) || uid('cl'),
      createdAt: sanitizeString(source.createdAt) || nowIso,
      updatedAt: sanitizeString(source.updatedAt) || nowIso,
      name: sanitizeString(source.name || source.fullName || source.clientName),
      phone: sanitizeString(source.phone),
      source: sanitizeString(source.source),
      channel: sanitizeString(source.channel),
      sourcePage: sanitizeString(source.sourcePage),
      landingId: sanitizeString(source.landingId),
      utmSource: sanitizeString(source.utmSource || source.utm_source),
      utmMedium: sanitizeString(source.utmMedium || source.utm_medium),
      utmCampaign: sanitizeString(source.utmCampaign || source.utm_campaign),
      utmContent: sanitizeString(source.utmContent || source.utm_content),
      utmTerm: sanitizeString(source.utmTerm || source.utm_term),
      referrer: sanitizeString(source.referrer),
      createdFrom: sanitizeString(source.createdFrom),
      bookingOrigin: sanitizeString(source.bookingOrigin),
      externalId: sanitizeString(source.externalId),
      tags: normalizeTags(source.tags),
      address: sanitizeString(source.address),
      comment: sanitizeString(source.comment),
      rating: sanitizeString(source.rating)
    };
  }

  function normalizeMachine(raw) {
    const source = raw || {};
    let machineType = sanitizeString(source.machineType || source.type);
    if (!MACHINE_TYPES.includes(machineType)) machineType = machineType || 'погрузчик';

    return {
      id: sanitizeString(source.id) || uid('mach'),
      name: sanitizeString(source.name || source.title),
      machineType,
      internalNumber: sanitizeString(source.internalNumber || source.innerNumber),
      plate: sanitizeString(source.plate || source.plateNumber),
      status: sanitizeMachineStatus(source.status),
      baseRateHour: Math.max(0, normalizeNumber(source.baseRateHour || source.rate)),
      minCallOut: Math.max(0, normalizeNumber(source.minCallOut || source.minOut)),
      zones: normalizeTags(source.zones || source.settlements),
      comment: sanitizeString(source.comment),
      defaultEmployeeId: sanitizeString(source.defaultEmployeeId),
      isActive: toBoolean(source.isActive, true)
    };
  }

  function normalizeEmployee(raw) {
    const source = raw || {};

    return {
      id: sanitizeString(source.id) || uid('emp'),
      fullName: sanitizeString(source.fullName || source.name),
      phone: sanitizeString(source.phone),
      role: sanitizeString(source.role || 'Машинист'),
      machineTypes: normalizeTags(source.machineTypes),
      workSchedule: sanitizeString(source.workSchedule || source.schedule || '09:00-18:00'),
      daysOff: sanitizeString(source.daysOff || source.weekends || 'сб,вс'),
      rate: Math.max(0, normalizeNumber(source.rate)),
      status: sanitizeEmployeeStatus(source.status),
      comment: sanitizeString(source.comment)
    };
  }

  function normalizeService(raw) {
    const source = raw || {};

    return {
      id: sanitizeString(source.id) || uid('svc'),
      name: sanitizeString(source.name || source.title),
      recommendedMachineType: sanitizeString(source.recommendedMachineType || source.machineType),
      minPrice: Math.max(0, normalizeNumber(source.minPrice)),
      minHours: Math.max(0, normalizeNumber(source.minHours)),
      seasonality: sanitizeString(source.seasonality || 'круглогодично'),
      needsAdditionalMachine: toBoolean(source.needsAdditionalMachine, false),
      relatedServices: normalizeTags(source.relatedServices),
      description: sanitizeString(source.description)
    };
  }

  function normalizeZone(raw) {
    const source = raw || {};
    return {
      id: sanitizeString(source.id) || uid('zone'),
      name: sanitizeString(source.name),
      isActive: toBoolean(source.isActive, true),
      onlineEnabled: toBoolean(source.onlineEnabled, true),
      markup: Math.max(0, normalizeNumber(source.markup)),
      comment: sanitizeString(source.comment)
    };
  }

  function normalizeMarketingTask(raw) {
    const source = raw || {};
    return {
      id: sanitizeString(source.id) || uid('task'),
      type: sanitizeString(source.type || 'followup_30'),
      title: sanitizeString(source.title),
      clientId: sanitizeString(source.clientId),
      requestId: sanitizeString(source.requestId),
      dueDate: sanitizeString(source.dueDate || toDateOnlyString(new Date())),
      status: sanitizeString(source.status || 'open'),
      note: sanitizeString(source.note),
      createdAt: sanitizeString(source.createdAt || new Date().toISOString())
    };
  }

  // ================================
  // Lookup helpers
  // ================================
  function getServiceById(id) { return state.services.find((item) => item.id === id) || null; }
  function getZoneById(id) { return state.zones.find((item) => item.id === id) || null; }
  function getMachineById(id) { return state.machines.find((item) => item.id === id) || null; }
  function getEmployeeById(id) { return state.employees.find((item) => item.id === id) || null; }
  function getClientById(id) { return state.clients.find((item) => item.id === id) || null; }

  function getMachineNames(ids) {
    return normalizeIdArray(ids).map((id) => getMachineById(id)?.name).filter(Boolean);
  }

  function getEmployeeName(id) {
    return getEmployeeById(id)?.fullName || '';
  }

  function getCrewNames(ids) {
    return normalizeIdArray(ids).map((id) => getEmployeeById(id)?.fullName).filter(Boolean);
  }

  function sourceLabel(value) {
    return SOURCE_LABELS[value] || value || 'Не указан';
  }

  function getRequestSourceBadgeLabel(request) {
    if (!request) return 'Не указан';
    if (request.channel === 'wfolio' || request.createdFrom === 'wfolio') return 'Wfolio / Landing';
    return sourceLabel(request.source);
  }

  function getRequestSourceBadgeClass(request) {
    if (!request) return 'badge-new';
    if (request.channel === 'wfolio' || request.createdFrom === 'wfolio') return 'badge-online';
    if (request.source === 'online_booking') return 'badge-online';
    if (request.source === 'landing' || request.source === 'website') return 'badge-active';
    return 'badge-new';
  }

  function renderRequestSourceBadge(request) {
    return `<span class="badge ${escapeHtml(getRequestSourceBadgeClass(request))}">${escapeHtml(getRequestSourceBadgeLabel(request))}</span>`;
  }

  // ================================
  // Migration
  // ================================
  function migrateLegacyDataIfNeeded() {
    if (!state.clients.length && state.requests.length) {
      rebuildClientsFromRequests();
      saveClients();
    }

    if (!state.services.length) {
      state.services = DEFAULT_SERVICE_SEED.map((item) => normalizeService(item));
      saveServices();
    }

    if (!state.zones.length) {
      const settlements = uniqueValues(state.requests.map((req) => req.settlement));
      if (settlements.length) {
        state.zones = settlements.map((name) => normalizeZone({
          id: uid('zone'),
          name,
          isActive: true,
          onlineEnabled: true,
          markup: 0,
          comment: 'Автосоздано из существующих заявок'
        }));
      } else {
        state.zones = DEFAULT_ZONE_SEED.map((zone) => normalizeZone(zone));
      }
      saveZones();
    }

    const zoneByName = new Map(state.zones.map((zone) => [zone.name, zone.id]));
    const machineIds = new Set(state.machines.map((item) => item.id));
    const employeeIds = new Set(state.employees.map((item) => item.id));
    const serviceIds = new Set(state.services.map((item) => item.id));

    let touchedRequests = false;

    state.requests = state.requests.map((request) => {
      const next = { ...request };
      const prevJson = JSON.stringify(request);

      if (!next.zoneId && next.settlement && zoneByName.has(next.settlement)) {
        next.zoneId = zoneByName.get(next.settlement);
      }

      next.assignedMachineIds = next.assignedMachineIds.filter((id) => machineIds.has(id));
      if (!employeeIds.has(next.assignedEmployeeId)) next.assignedEmployeeId = '';
      next.crewEmployeeIds = next.crewEmployeeIds.filter((id) => employeeIds.has(id));
      if (!serviceIds.has(next.serviceId)) next.serviceId = '';

      if (!next.street && next.address && next.address !== next.settlement) {
        next.street = next.address;
      }
      if (!next.address) {
        next.address = [next.settlement, next.street, next.house].filter(Boolean).join(', ');
      }

      next.endTime = sanitizeTime(next.endTime) || calcEndTime(next.startTime, next.durationHours || 2);
      next.desiredTime = next.desiredTime || formatDesiredSlot(next.startTime, next.endTime);

      if (JSON.stringify(next) !== prevJson) touchedRequests = true;
      return next;
    });

    if (touchedRequests) saveRequests();

    ensureMarketingTriggers();
  }
  // ================================
  // Calculations and derived data
  // ================================
  function uniqueValues(values) {
    return [...new Set((values || []).map((item) => sanitizeString(item)).filter(Boolean))];
  }

  function getEffectiveRequestStatus(request) {
    if (!request || !request.objectDate) return request?.status || 'new';
    if (request.status === 'completed' || request.status === 'canceled') return request.status;
    const date = parseDateOnly(request.objectDate);
    if (!date) return request.status;
    if (startOfDay(date).getTime() < startOfDay(new Date()).getTime()) return 'overdue';
    return request.status;
  }

  function isRequestOverdue(request) {
    return getEffectiveRequestStatus(request) === 'overdue';
  }

  function isRequestClosed(request) {
    return request.status === 'completed' || request.status === 'canceled';
  }

  function isPlanningRelevant(request) {
    return !isRequestClosed(request);
  }

  function getPaymentStatusLabel(status) {
    return PAYMENT_STATUS_LABELS[status] || 'Не оплачено';
  }

  function getStatusLabel(status) {
    return REQUEST_STATUS_LABELS[status] || 'Новая';
  }

  function settlementLabelFromRequest(request) {
    if (request.settlement) return request.settlement;
    const zone = getZoneById(request.zoneId);
    return zone ? zone.name : '';
  }

  function getRequestServiceName(request) {
    if (request.serviceId) {
      const service = getServiceById(request.serviceId);
      if (service) return service.name;
    }
    return request.workType || 'Не указано';
  }

  function getRequestTimeRange(request) {
    let start = sanitizeTime(request.startTime);
    let end = sanitizeTime(request.endTime);

    if (!start || !end) {
      const parsed = parseSlot(request.desiredTime);
      if (!start) start = parsed.start;
      if (!end) end = parsed.end;
    }

    if (!start) start = '09:00';
    if (!end) end = calcEndTime(start, request.durationHours || 2);

    let startMin = timeToMinutes(start);
    let endMin = timeToMinutes(end);
    if (endMin <= startMin) {
      endMin = startMin + Math.max(30, Math.round((request.durationHours || 2) * 60));
    }

    return {
      start,
      end,
      startMin,
      endMin
    };
  }

  function rangesOverlap(a, b) {
    return a.startMin < b.endMin && b.startMin < a.endMin;
  }

  function detectRequestConflicts(draftRequest, excludeRequestId = '') {
    if (!draftRequest.objectDate) return [];
    const conflicts = [];
    const draftRange = getRequestTimeRange(draftRequest);
    const draftMachineIds = new Set(normalizeIdArray(draftRequest.assignedMachineIds));
    const draftEmployeeIds = new Set([
      sanitizeString(draftRequest.assignedEmployeeId),
      ...normalizeIdArray(draftRequest.crewEmployeeIds)
    ].filter(Boolean));

    if (!draftMachineIds.size && !draftEmployeeIds.size) return [];

    state.requests.forEach((request) => {
      if (!request || request.id === excludeRequestId) return;
      if (!isPlanningRelevant(request)) return;
      if (request.objectDate !== draftRequest.objectDate) return;

      const requestRange = getRequestTimeRange(request);
      if (!rangesOverlap(draftRange, requestRange)) return;

      const reasons = [];
      const requestMachineIds = new Set(normalizeIdArray(request.assignedMachineIds));
      const requestEmployeeIds = new Set([
        sanitizeString(request.assignedEmployeeId),
        ...normalizeIdArray(request.crewEmployeeIds)
      ].filter(Boolean));

      draftMachineIds.forEach((machineId) => {
        if (requestMachineIds.has(machineId)) {
          const machine = getMachineById(machineId);
          reasons.push(`Техника: ${machine ? machine.name : machineId}`);
        }
      });

      draftEmployeeIds.forEach((employeeId) => {
        if (requestEmployeeIds.has(employeeId)) {
          const employee = getEmployeeById(employeeId);
          reasons.push(`Сотрудник: ${employee ? employee.fullName : employeeId}`);
        }
      });

      if (!reasons.length) return;

      conflicts.push({
        request,
        reasons,
        range: requestRange
      });
    });

    return conflicts;
  }

  function calculateRequestEstimate(serviceId, zoneId) {
    const service = getServiceById(serviceId);
    const zone = getZoneById(zoneId);
    const base = service ? Math.max(0, service.minPrice) : 0;
    const markup = zone ? Math.max(0, zone.markup) : 0;
    const total = round2(base + markup);
    return {
      base,
      markup,
      total
    };
  }

  function getActiveFleetCapacity() {
    return state.machines.filter((machine) => machine.isActive && machine.status !== 'repair' && machine.status !== 'offline').length;
  }

  function getBusyLoadForDate(date, startTime = '', endTime = '') {
    if (!date) return 0;
    const hasRange = Boolean(sanitizeTime(startTime) && sanitizeTime(endTime));
    const targetRange = hasRange ? getRequestTimeRange({ startTime, endTime, durationHours: 2, desiredTime: `${startTime}-${endTime}` }) : null;

    return state.requests.filter((request) => {
      if (!isPlanningRelevant(request)) return false;
      if (request.objectDate !== date) return false;
      if (!hasRange) return true;
      return rangesOverlap(targetRange, getRequestTimeRange(request));
    }).length;
  }

  function getDateRange(startDateString, range) {
    const startDate = parseDateOnly(startDateString) || startOfDay(new Date());
    const days = range === 'week' ? 7 : 1;
    const values = [];
    for (let i = 0; i < days; i += 1) {
      values.push(toDateOnlyString(addDays(startDate, i)));
    }
    return values;
  }

  function getClientAggregates() {
    const map = new Map();

    state.requests.forEach((request) => {
      const phone = sanitizeString(request.phone);
      if (!phone) return;

      const service = request.serviceId ? getServiceById(request.serviceId) : null;
      const source = request.source || '';
      const settlement = settlementLabelFromRequest(request);
      const objectDate = parseDateOnly(request.objectDate);

      if (!map.has(phone)) {
        map.set(phone, {
          phone,
          requestIds: [],
          requestsCount: 0,
          totalRevenue: 0,
          totalBalance: 0,
          services: new Set(),
          serviceIds: new Set(),
          sources: new Set(),
          settlements: new Set(),
          lastDate: null,
          seasonal: false,
          latestRequestId: ''
        });
      }

      const agg = map.get(phone);
      agg.requestIds.push(request.id);
      agg.requestsCount += 1;

      if (request.status !== 'canceled') {
        agg.totalRevenue = round2(agg.totalRevenue + request.cost);
        agg.totalBalance = round2(agg.totalBalance + Math.max(0, request.balance));
      }

      if (service) {
        agg.services.add(service.name);
        agg.serviceIds.add(service.id);
        if (!/кругл/i.test(service.seasonality || '')) {
          agg.seasonal = true;
        }
      } else if (request.workType) {
        agg.services.add(request.workType);
      }

      if (source) agg.sources.add(source);
      if (settlement) agg.settlements.add(settlement);

      if (objectDate && (!agg.lastDate || objectDate > agg.lastDate)) {
        agg.lastDate = objectDate;
        agg.latestRequestId = request.id;
      }
    });

    return map;
  }

  function getClientSegment(client, aggregateMap) {
    const aggregate = aggregateMap.get(client.phone);
    if (!aggregate) return 'new';
    if (aggregate.totalBalance > 0) return 'debt';
    if (aggregate.requestsCount > 1) return 'repeat';
    if (aggregate.seasonal) return 'seasonal';
    return 'new';
  }

  function isClientInactive(aggregate) {
    if (!aggregate || !aggregate.lastDate) return true;
    const diff = daysBetween(aggregate.lastDate, new Date());
    return diff > 90;
  }

  function isRequestSeasonal(request) {
    const service = request.serviceId ? getServiceById(request.serviceId) : null;
    return Boolean(service && service.seasonality && !/кругл/i.test(service.seasonality));
  }

  function getRequestSourceAnalytics() {
    const countMap = new Map();
    const revenueMap = new Map();

    state.requests.forEach((request) => {
      const key = request.source || 'other';
      countMap.set(key, (countMap.get(key) || 0) + 1);
      if (request.status !== 'canceled') {
        revenueMap.set(key, round2((revenueMap.get(key) || 0) + request.cost));
      }
    });

    return { countMap, revenueMap };
  }

  function getRequestsWithoutAssignmentsCount() {
    return state.requests.filter((request) => !isRequestClosed(request) && !request.assignedMachineIds.length).length;
  }

  // ================================
  // Synchronization helpers
  // ================================
  function rebuildClientsFromRequests() {
    const byPhone = new Map();

    state.requests.forEach((request) => {
      const phone = sanitizeString(request.phone);
      if (!phone) return;

      const current = byPhone.get(phone);
      const candidate = {
        id: current?.id || uid('cl'),
        createdAt: current?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        name: sanitizeString(request.clientName) || current?.name || '',
        phone,
        source: sanitizeString(request.source) || current?.source || '',
        tags: uniqueValues([...(current?.tags || []), ...normalizeTags(request.tags)]),
        address: sanitizeString(request.address) || [request.settlement, request.street, request.house].filter(Boolean).join(', ') || current?.address || '',
        comment: current?.comment || '',
        rating: current?.rating || ''
      };
      byPhone.set(phone, normalizeClient(candidate));
    });

    if (byPhone.size) {
      const existingByPhone = new Map(state.clients.map((client) => [client.phone, client]));
      byPhone.forEach((value, phone) => {
        if (existingByPhone.has(phone)) {
          const existing = existingByPhone.get(phone);
          byPhone.set(phone, normalizeClient({
            ...existing,
            ...value,
            tags: uniqueValues([...(existing.tags || []), ...(value.tags || [])]),
            comment: existing.comment || value.comment || ''
          }));
        }
      });

      state.clients = Array.from(byPhone.values());
    }
  }

  function upsertClientFromRequest(request) {
    const phone = sanitizeString(request.phone);
    if (!phone) return;

    const existingIndex = state.clients.findIndex((client) => client.phone === phone);
    const address = sanitizeString(request.address) || [request.settlement, request.street, request.house].filter(Boolean).join(', ');

    if (existingIndex >= 0) {
      const existing = state.clients[existingIndex];
      state.clients[existingIndex] = normalizeClient({
        ...existing,
        name: request.clientName || existing.name,
        source: request.source || existing.source,
        channel: request.channel || existing.channel || '',
        sourcePage: request.sourcePage || existing.sourcePage || '',
        landingId: request.landingId || existing.landingId || '',
        utmSource: request.utmSource || existing.utmSource || '',
        utmMedium: request.utmMedium || existing.utmMedium || '',
        utmCampaign: request.utmCampaign || existing.utmCampaign || '',
        utmContent: request.utmContent || existing.utmContent || '',
        utmTerm: request.utmTerm || existing.utmTerm || '',
        referrer: request.referrer || existing.referrer || '',
        tags: uniqueValues([...(existing.tags || []), ...normalizeTags(request.tags)]),
        address: address || existing.address,
        updatedAt: new Date().toISOString()
      });
    } else {
      state.clients.push(normalizeClient({
        name: request.clientName,
        phone,
        source: request.source,
        channel: request.channel || '',
        sourcePage: request.sourcePage || '',
        landingId: request.landingId || '',
        utmSource: request.utmSource || '',
        utmMedium: request.utmMedium || '',
        utmCampaign: request.utmCampaign || '',
        utmContent: request.utmContent || '',
        utmTerm: request.utmTerm || '',
        referrer: request.referrer || '',
        tags: normalizeTags(request.tags),
        address,
        comment: '',
        rating: ''
      }));
    }

    saveClients();
  }

  function ensureMarketingTriggers() {
    const existingKeys = new Set(
      state.marketingTasks
        .map((task) => sanitizeString(task.note))
        .filter((note) => note.startsWith('auto:'))
    );

    const today = startOfDay(new Date());
    let changed = false;

    state.requests.forEach((request) => {
      const requestDate = parseDateOnly(request.objectDate) || today;

      if (request.status === 'completed') {
        const followupKey = `auto:followup_30:${request.id}`;
        if (!existingKeys.has(followupKey)) {
          state.marketingTasks.push(normalizeMarketingTask({
            type: 'followup_30',
            title: MARKETING_TASK_LABELS.followup_30,
            requestId: request.id,
            clientId: findClientIdByPhone(request.phone),
            dueDate: toDateOnlyString(addDays(requestDate, 30)),
            status: 'open',
            note: followupKey
          }));
          existingKeys.add(followupKey);
          changed = true;
        }

        const reviewKey = `auto:review_request:${request.id}`;
        if (!existingKeys.has(reviewKey)) {
          state.marketingTasks.push(normalizeMarketingTask({
            type: 'review_request',
            title: MARKETING_TASK_LABELS.review_request,
            requestId: request.id,
            clientId: findClientIdByPhone(request.phone),
            dueDate: toDateOnlyString(addDays(requestDate, 2)),
            status: 'open',
            note: reviewKey
          }));
          existingKeys.add(reviewKey);
          changed = true;
        }
      }

      if (!isRequestClosed(request) && request.balance > 0) {
        const debtKey = `auto:debt_reminder:${request.id}`;
        if (!existingKeys.has(debtKey)) {
          state.marketingTasks.push(normalizeMarketingTask({
            type: 'debt_reminder',
            title: MARKETING_TASK_LABELS.debt_reminder,
            requestId: request.id,
            clientId: findClientIdByPhone(request.phone),
            dueDate: toDateOnlyString(today),
            status: 'open',
            note: debtKey
          }));
          existingKeys.add(debtKey);
          changed = true;
        }
      }

      if (isRequestSeasonal(request) && request.status === 'completed') {
        const seasonalKey = `auto:seasonal_offer:${request.id}`;
        if (!existingKeys.has(seasonalKey)) {
          state.marketingTasks.push(normalizeMarketingTask({
            type: 'seasonal_offer',
            title: MARKETING_TASK_LABELS.seasonal_offer,
            requestId: request.id,
            clientId: findClientIdByPhone(request.phone),
            dueDate: toDateOnlyString(addDays(requestDate, 180)),
            status: 'open',
            note: seasonalKey
          }));
          existingKeys.add(seasonalKey);
          changed = true;
        }
      }
    });

    if (changed) {
      state.marketingTasks = state.marketingTasks.map(normalizeMarketingTask);
      saveMarketingTasks();
    }
  }

  function findClientIdByPhone(phone) {
    const cleanPhone = sanitizeString(phone);
    const client = state.clients.find((item) => item.phone === cleanPhone);
    return client ? client.id : '';
  }

  // ================================
  // Filters and sorting
  // ================================
  function getFilteredRequests() {
    const filter = state.ui.request;
    const aggregateMap = getClientAggregates();
    const now = new Date();
    const todayStr = toDateOnlyString(now);
    const tomorrowStr = toDateOnlyString(addDays(startOfDay(now), 1));
    const weekStart = startOfDay(now);
    const weekEnd = addDays(weekStart, 6);

    let list = state.requests.filter((request) => {
      const q = filter.search.toLowerCase();
      if (q) {
        const searchable = [
          request.clientName,
          request.phone,
          request.address,
          request.settlement,
          request.street,
          request.house,
          request.workType,
          getRequestServiceName(request)
        ].join(' ').toLowerCase();
        if (!searchable.includes(q)) return false;
      }

      const effectiveStatus = getEffectiveRequestStatus(request);
      if (filter.status !== 'all' && effectiveStatus !== filter.status) return false;

      if (filter.settlement !== 'all') {
        const settlement = settlementLabelFromRequest(request);
        if (settlement !== filter.settlement) return false;
      }

      if (filter.workType !== 'all') {
        const serviceName = getRequestServiceName(request);
        if (serviceName !== filter.workType && request.workType !== filter.workType) return false;
      }

      if (filter.source !== 'all' && (request.source || 'other') !== filter.source) return false;

      if (filter.segment !== 'all') {
        const aggregate = aggregateMap.get(request.phone);
        if (filter.segment === 'new_clients' && !(aggregate && aggregate.requestsCount <= 1)) return false;
        if (filter.segment === 'repeat_clients' && !(aggregate && aggregate.requestsCount > 1)) return false;
        if (filter.segment === 'with_debt' && !(request.balance > 0 && request.status !== 'canceled')) return false;
        if (filter.segment === 'seasonal' && !isRequestSeasonal(request)) return false;
      }

      if (filter.period !== 'all') {
        if (filter.period === 'today' && request.objectDate !== todayStr) return false;
        if (filter.period === 'tomorrow' && request.objectDate !== tomorrowStr) return false;
        if (filter.period === 'week') {
          const day = parseDateOnly(request.objectDate);
          if (!day || day < weekStart || day > weekEnd) return false;
        }
        if (filter.period === 'overdue' && !isRequestOverdue(request)) return false;
        if (filter.period === 'completed' && request.status !== 'completed') return false;
        if (filter.period === 'with_balance' && !(request.balance > 0 && request.status !== 'canceled')) return false;
      }

      return true;
    });

    const sortBy = filter.sortBy;
    const dir = filter.sortDir === 'desc' ? -1 : 1;

    list = list.slice().sort((a, b) => {
      let aValue;
      let bValue;

      if (sortBy === 'objectDate') {
        aValue = parseDateOnly(a.objectDate)?.getTime() || 0;
        bValue = parseDateOnly(b.objectDate)?.getTime() || 0;
      } else if (sortBy === 'createdAt') {
        aValue = new Date(a.createdAt).getTime() || 0;
        bValue = new Date(b.createdAt).getTime() || 0;
      } else if (sortBy === 'clientName') {
        aValue = (a.clientName || '').toLowerCase();
        bValue = (b.clientName || '').toLowerCase();
      } else if (sortBy === 'cost') {
        aValue = a.cost || 0;
        bValue = b.cost || 0;
      } else {
        aValue = parseDateOnly(a.objectDate)?.getTime() || 0;
        bValue = parseDateOnly(b.objectDate)?.getTime() || 0;
      }

      if (aValue < bValue) return -1 * dir;
      if (aValue > bValue) return 1 * dir;
      return 0;
    });

    return list;
  }

  function getFilteredClients() {
    const segment = state.ui.clients.segment;
    const sourceFilter = state.ui.clients.source;
    const settlementFilter = state.ui.clients.settlement;
    const serviceFilter = state.ui.clients.service;

    const aggregateMap = getClientAggregates();

    return state.clients.filter((client) => {
      const aggregate = aggregateMap.get(client.phone);

      if (segment !== 'all') {
        if (segment === 'new' && !(aggregate && aggregate.requestsCount <= 1)) return false;
        if (segment === 'repeat' && !(aggregate && aggregate.requestsCount > 1)) return false;
        if (segment === 'debt' && !(aggregate && aggregate.totalBalance > 0)) return false;
        if (segment === 'inactive' && !(aggregate && isClientInactive(aggregate))) return false;
        if (segment === 'seasonal' && !(aggregate && aggregate.seasonal)) return false;
      }

      if (sourceFilter !== 'all') {
        const source = client.source || (aggregate ? [...aggregate.sources][0] : '') || 'other';
        if (source !== sourceFilter) return false;
      }

      if (settlementFilter !== 'all') {
        if (!(aggregate && aggregate.settlements.has(settlementFilter))) return false;
      }

      if (serviceFilter !== 'all') {
        const service = getServiceById(serviceFilter);
        const serviceName = service ? service.name : serviceFilter;
        if (!(aggregate && aggregate.services.has(serviceName))) return false;
      }

      return true;
    });
  }

  function getCampaignRecipients() {
    const cfg = state.ui.campaigns;
    const aggregateMap = getClientAggregates();

    const recipients = state.clients.filter((client) => {
      const aggregate = aggregateMap.get(client.phone);
      if (!aggregate) return false;

      if (cfg.segment !== 'all') {
        if (cfg.segment === 'new' && !(aggregate.requestsCount <= 1)) return false;
        if (cfg.segment === 'repeat' && !(aggregate.requestsCount > 1)) return false;
        if (cfg.segment === 'debt' && !(aggregate.totalBalance > 0)) return false;
        if (cfg.segment === 'inactive' && !isClientInactive(aggregate)) return false;
        if (cfg.segment === 'seasonal' && !aggregate.seasonal) return false;
      }

      if (cfg.source !== 'all') {
        const source = client.source || [...aggregate.sources][0] || 'other';
        if (source !== cfg.source) return false;
      }

      if (cfg.settlement !== 'all' && !aggregate.settlements.has(cfg.settlement)) return false;
      if (cfg.service !== 'all' && !aggregate.serviceIds.has(cfg.service)) return false;

      return true;
    });

    return recipients
      .map((client) => {
        const aggregate = aggregateMap.get(client.phone);
        return {
          client,
          aggregate
        };
      })
      .sort((a, b) => (b.aggregate.requestsCount - a.aggregate.requestsCount) || a.client.name.localeCompare(b.client.name, 'ru'));
  }


  // ================================
  // Remote integration (Wfolio / Landing)
  // ================================
  function renderRemoteSyncStatus() {
    if (!els.remoteSyncInfo) return;

    const parts = [`API: ${state.remote.apiBaseUrl || '-'}`];
    if (state.remote.lastSyncAt) {
      parts.push(`Синхронизировано: ${formatDateTime(state.remote.lastSyncAt)}`);
    } else {
      parts.push('Синхронизация еще не выполнялась');
    }

    if (state.remote.lastError) {
      parts.push(`Ошибка: ${state.remote.lastError}`);
      els.remoteSyncInfo.classList.add('error');
    } else {
      els.remoteSyncInfo.classList.remove('error');
    }

    els.remoteSyncInfo.textContent = parts.join(' · ');
  }

  function buildRemoteHeaders() {
    const headers = { Accept: 'application/json' };
    if (state.remote.readToken) {
      headers['X-API-Key'] = state.remote.readToken;
    }
    return headers;
  }

  function isRemoteRequestNewer(existing, incoming) {
    const existingTs = Date.parse(existing.updatedAt || existing.createdAt || '');
    const incomingTs = Date.parse(incoming.updatedAt || incoming.createdAt || '');
    if (!Number.isFinite(incomingTs)) return false;
    if (!Number.isFinite(existingTs)) return true;
    return incomingTs >= existingTs;
  }

  function isLikelySameRemoteRequest(existing, incoming) {
    if (!existing || !incoming) return false;

    const existingPhone = normalizePhoneForCompare(existing.phone);
    const incomingPhone = normalizePhoneForCompare(incoming.phone);
    if (!existingPhone || !incomingPhone || existingPhone !== incomingPhone) return false;

    if ((existing.objectDate || '') !== (incoming.objectDate || '')) return false;

    const existingWork = sanitizeString(existing.workType || '').toLowerCase();
    const incomingWork = sanitizeString(incoming.workType || '').toLowerCase();
    if (existingWork && incomingWork && existingWork !== incomingWork) return false;

    const existingTime = sanitizeString(existing.desiredTime || `${existing.startTime}-${existing.endTime}`);
    const incomingTime = sanitizeString(incoming.desiredTime || `${incoming.startTime}-${incoming.endTime}`);
    if (existingTime && incomingTime && existingTime !== incomingTime) return false;

    const existingTs = Date.parse(existing.createdAt || '');
    const incomingTs = Date.parse(incoming.createdAt || '');
    if (!Number.isFinite(existingTs) || !Number.isFinite(incomingTs)) return true;

    const diffMinutes = Math.abs(incomingTs - existingTs) / (60 * 1000);
    return diffMinutes <= 360;
  }

  function mergeRemoteRequests(remoteRequests) {
    if (!Array.isArray(remoteRequests) || !remoteRequests.length) {
      return { changed: false, newCount: 0, updatedCount: 0 };
    }

    const idToIndex = new Map(state.requests.map((request, index) => [request.id, index]));
    const touched = [];
    let newCount = 0;
    let updatedCount = 0;

    remoteRequests.forEach((item) => {
      const normalized = normalizeRequest(item);

      if (!normalized.source) normalized.source = 'landing';
      if (!normalized.channel && (normalized.source === 'landing' || normalized.createdFrom === 'wfolio')) normalized.channel = 'wfolio';
      if (!normalized.createdFrom && normalized.channel === 'wfolio') normalized.createdFrom = 'wfolio';
      if (!normalized.bookingOrigin && normalized.createdFrom === 'wfolio') normalized.bookingOrigin = 'website_form';

      const tags = new Set(normalizeTags(normalized.tags));
      if (normalized.createdFrom === 'wfolio' || normalized.channel === 'wfolio') {
        tags.add('wfolio');
        tags.add('landing');
      }
      normalized.tags = [...tags];

      const existingIndex = idToIndex.get(normalized.id);
      if (existingIndex !== undefined) {
        const existing = state.requests[existingIndex];
        if (isRemoteRequestNewer(existing, normalized)) {
          state.requests[existingIndex] = normalizeRequest({ ...existing, ...normalized });
          touched.push(state.requests[existingIndex]);
          updatedCount += 1;
        }
        return;
      }

      const duplicateIndex = state.requests.findIndex((request) => isLikelySameRemoteRequest(request, normalized));
      if (duplicateIndex >= 0) {
        const existing = state.requests[duplicateIndex];
        state.requests[duplicateIndex] = normalizeRequest({
          ...existing,
          ...normalized,
          id: existing.id,
          externalId: normalized.id || existing.externalId
        });
        touched.push(state.requests[duplicateIndex]);
        updatedCount += 1;
        return;
      }

      state.requests.unshift(normalized);
      touched.push(normalized);
      newCount += 1;
    });

    const changed = newCount > 0 || updatedCount > 0;
    if (!changed) return { changed: false, newCount, updatedCount };

    saveRequests();
    touched.forEach((request) => upsertClientFromRequest(request));

    return { changed: true, newCount, updatedCount };
  }

  async function fetchRemoteRequests() {
    const apiBaseUrl = normalizeApiBaseUrl(state.remote.apiBaseUrl);
    const endpoint = `${apiBaseUrl}/api/requests`;
    const params = new URLSearchParams({ limit: '2000' });

    const response = await fetch(`${endpoint}?${params.toString()}`, {
      method: 'GET',
      headers: buildRemoteHeaders(),
      mode: 'cors'
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `HTTP ${response.status}`);
    }

    const payload = await response.json();
    const requests = Array.isArray(payload?.requests)
      ? payload.requests
      : Array.isArray(payload?.data)
        ? payload.data
        : [];

    return requests;
  }

  async function syncRequestsFromRemote(options = {}) {
    const { silent = false, manual = false } = options;

    if (!state.remote.enabled) {
      if (!silent) alert('Синхронизация отключена в настройках интеграции.');
      return;
    }

    if (typeof fetch !== 'function') {
      state.remote.lastError = 'Браузер не поддерживает fetch API.';
      saveRemoteState();
      renderRemoteSyncStatus();
      if (!silent) alert(state.remote.lastError);
      return;
    }

    try {
      const remoteRequests = await fetchRemoteRequests();
      const result = mergeRemoteRequests(remoteRequests.map(normalizeRequest));

      state.remote.lastSyncAt = new Date().toISOString();
      state.remote.lastError = '';
      saveRemoteState();

      if (result.changed) {
        ensureMarketingTriggers();
        renderAll();
      } else {
        renderRemoteSyncStatus();
      }

      if (manual) {
        alert(`Синхронизация завершена. Новых: ${result.newCount}, обновлено: ${result.updatedCount}.`);
      }
    } catch (error) {
      state.remote.lastError = sanitizeString(error?.message || 'Не удалось получить заявки с сервера.');
      saveRemoteState();
      renderRemoteSyncStatus();
      if (!silent) {
        alert(`Ошибка синхронизации: ${state.remote.lastError}`);
      }
    }
  }

  function startRemoteSyncLoop() {
    if (remoteSyncTimer) {
      clearInterval(remoteSyncTimer);
      remoteSyncTimer = null;
    }

    if (!state.remote.enabled) return;

    remoteSyncTimer = setInterval(() => {
      syncRequestsFromRemote({ silent: true });
    }, state.remote.pollMs);
  }
  // ================================
  // Rendering
  // ================================
  function renderAll() {
    syncControlsFromState();
    renderNavigation();
    updateNotificationControls();
    renderInAppNotifications();
    renderSummary();
    renderRequestFiltersOptions();
    renderRequests();
    renderRemoteSyncStatus();
    renderClients();
    renderMachines();
    renderEmployees();
    renderServices();
    renderZones();
    renderCalendar();
    renderBooking();
    renderCampaigns();
    updateRequestDerivedFields();
    updateAssignmentHintsAndConflicts();
  }

  function syncControlsFromState() {
    if (els.searchInput) els.searchInput.value = state.ui.request.search;
    if (els.statusFilter) els.statusFilter.value = state.ui.request.status;
    if (els.periodFilter) els.periodFilter.value = state.ui.request.period;
    if (els.sortBySelect) els.sortBySelect.value = state.ui.request.sortBy;
    if (els.sortDirSelect) els.sortDirSelect.value = state.ui.request.sortDir;
    if (els.sourceFilter) els.sourceFilter.value = state.ui.request.source;
    if (els.requestSegmentFilter) els.requestSegmentFilter.value = state.ui.request.segment;

    if (els.clientSegmentFilter) els.clientSegmentFilter.value = state.ui.clients.segment;
    if (els.clientSourceFilter) els.clientSourceFilter.value = state.ui.clients.source;
    if (els.clientSettlementFilter) els.clientSettlementFilter.value = state.ui.clients.settlement;
    if (els.clientServiceFilter) els.clientServiceFilter.value = state.ui.clients.service;

    if (els.calendarDateInput) els.calendarDateInput.value = state.ui.calendar.focusDate;
    if (els.calendarRangeInput) els.calendarRangeInput.value = state.ui.calendar.range;
    if (els.calendarModeInput) els.calendarModeInput.value = state.ui.calendar.mode;

    if (els.campaignSegmentInput) els.campaignSegmentInput.value = state.ui.campaigns.segment;
    if (els.campaignSourceInput) els.campaignSourceInput.value = state.ui.campaigns.source;
    if (els.campaignSettlementInput) els.campaignSettlementInput.value = state.ui.campaigns.settlement;
    if (els.campaignServiceInput) els.campaignServiceInput.value = state.ui.campaigns.service;
    if (els.campaignTemplateInput) els.campaignTemplateInput.value = state.ui.campaigns.templateId;
    if (els.campaignMessageInput && document.activeElement !== els.campaignMessageInput) {
      els.campaignMessageInput.value = state.ui.campaigns.message;
    }

    const viewMode = state.ui.request.viewMode;
    if (els.tableViewBtn) els.tableViewBtn.classList.toggle('active', viewMode === 'table');
    if (els.cardsViewBtn) els.cardsViewBtn.classList.toggle('active', viewMode === 'cards');
    if (els.tableWrap) els.tableWrap.classList.toggle('hidden', viewMode !== 'table');
    if (els.cardsWrap) els.cardsWrap.classList.toggle('hidden', viewMode !== 'cards');
  }

  function renderNavigation() {
    const screen = state.ui.activeScreen || 'dashboard';

    els.navButtons.forEach((button) => {
      const isActive = button.dataset.screen === screen;
      button.classList.toggle('active', isActive);
    });

    els.screens.forEach((screenEl) => {
      const isActive = screenEl.dataset.screen === screen;
      screenEl.classList.toggle('active', isActive);
    });
  }

  function renderSummary() {
    const today = startOfDay(new Date());
    const todayStr = toDateOnlyString(today);
    const weekEnd = addDays(today, 6);

    const newCount = state.requests.filter((request) => getEffectiveRequestStatus(request) === 'new').length;
    const inWorkCount = state.requests.filter((request) => ['confirmed', 'in_work'].includes(getEffectiveRequestStatus(request))).length;
    const overdueCount = state.requests.filter(isRequestOverdue).length;

    const paidWeek = state.requests
      .filter((request) => {
        if (request.status === 'canceled') return false;
        const date = parseDateOnly(request.objectDate);
        return date && date >= today && date <= weekEnd;
      })
      .reduce((acc, request) => acc + request.prepayment, 0);

    if (els.summaryCards) {
      els.summaryCards.innerHTML = [
        summaryCard('Новые заявки', newCount, 'Сегодня'),
        summaryCard('В работе', inWorkCount, 'Активные'),
        summaryCard('Просрочены', overdueCount, 'Требуют внимания'),
        summaryCard('Оплачено', formatMoney(paidWeek), 'За неделю')
      ].join('');
    }

    const freeMachines = state.machines.filter((machine) => machine.isActive && machine.status === 'free').length;
    const busyMachines = state.machines.filter((machine) => machine.isActive && machine.status === 'busy').length;
    const repairMachines = state.machines.filter((machine) => machine.isActive && machine.status === 'repair').length;
    const availableEmployees = state.employees.filter((employee) => employee.status === 'active').length;
    const unassignedRequests = getRequestsWithoutAssignmentsCount();
    const onlineRequests = state.requests.filter((request) => request.source === 'online_booking').length;

    if (els.opsSummaryCards) {
      els.opsSummaryCards.innerHTML = [
        summaryCard('Техника свободна', freeMachines),
        summaryCard('Техника занята', busyMachines),
        summaryCard('В ремонте', repairMachines),
        summaryCard('Сотрудники доступны', availableEmployees),
        summaryCard('Без назначений', unassignedRequests),
        summaryCard('Онлайн-брони', onlineRequests)
      ].join('');
    }

    renderDashboardShowcase(todayStr, today);
    renderAnalyticsBlocks();
    renderMarketingTasks();
  }

  function summaryCard(title, value, note = '') {
    return `<article class="summary-card"><small>${escapeHtml(title)}</small><strong>${escapeHtml(String(value))}</strong>${note ? `<p class="muted">${escapeHtml(note)}</p>` : ''}</article>`;
  }

  function renderDashboardShowcase(todayStr, todayDate) {
    renderDashboardRequests();
    renderDashboardCalendar(todayStr, todayDate);
    renderDashboardMachines();
    renderDashboardClients();
    renderDashboardFinance(todayDate);
  }

  function renderDashboardRequests() {
    if (!els.dashboardRequestsList) return;

    const list = state.requests
      .filter((request) => request.status !== 'canceled')
      .sort((a, b) => {
        const aDate = parseDateOnly(a.objectDate)?.getTime() || 0;
        const bDate = parseDateOnly(b.objectDate)?.getTime() || 0;
        if (aDate !== bDate) return aDate - bDate;
        return getRequestTimeRange(a).startMin - getRequestTimeRange(b).startMin;
      })
      .slice(0, 3);

    if (!list.length) {
      els.dashboardRequestsList.innerHTML = '<p class="analytics-empty">Заявок пока нет. Добавьте первую заявку.</p>';
      return;
    }

    els.dashboardRequestsList.innerHTML = list.map((request) => {
      const status = getEffectiveRequestStatus(request);
      const range = getRequestTimeRange(request);
      const machine = getMachineNames(request.assignedMachineIds).join(', ') || 'Техника не назначена';
      const employee = getEmployeeName(request.assignedEmployeeId) || 'Сотрудник не назначен';
      return `
        <article class="dashboard-request-item">
          <div class="dashboard-request-head">
            <div>
              <p class="dashboard-request-title">${escapeHtml(getRequestServiceName(request))}</p>
              <p class="dashboard-request-sub">${escapeHtml(formatDate(request.objectDate))}, ${escapeHtml(settlementLabelFromRequest(request) || '-')}</p>
            </div>
            <span class="badge badge-${escapeHtml(status)}">${escapeHtml(getStatusLabel(status))}</span>
          </div>
          <div class="dashboard-request-meta">
            <span>${escapeHtml(range.start)}-${escapeHtml(range.end)}</span>
            <strong>${escapeHtml(formatMoney(request.cost))}</strong>
          </div>
          <div class="dashboard-tech-line">⚙ ${escapeHtml(machine)} • ${escapeHtml(employee)}</div>
        </article>
      `;
    }).join('');
  }

  function renderDashboardCalendar(todayStr, todayDate) {
    if (!els.dashboardCalendarGrid || !els.dashboardCalendarTasks || !els.dashboardCalendarMonth || !els.dashboardDayTitle) return;

    const monthStart = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1);
    const monthEnd = new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 0);
    const firstWeekday = (monthStart.getDay() + 6) % 7;

    const monthLabel = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' }).format(todayDate);
    els.dashboardCalendarMonth.textContent = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

    const cells = [];
    for (let i = 0; i < firstWeekday; i += 1) {
      cells.push('<div class="dash-day"></div>');
    }

    for (let day = 1; day <= monthEnd.getDate(); day += 1) {
      const date = new Date(todayDate.getFullYear(), todayDate.getMonth(), day);
      const dateStr = toDateOnlyString(date);
      const has = state.requests.some((request) => request.objectDate === dateStr);
      const isToday = dateStr === todayStr;
      cells.push(`<div class="dash-day ${has ? 'has' : ''} ${isToday ? 'today' : ''}">${day}</div>`);
    }

    els.dashboardCalendarGrid.innerHTML = cells.join('');

    const todayItems = state.requests
      .filter((request) => request.objectDate === todayStr)
      .sort((a, b) => getRequestTimeRange(a).startMin - getRequestTimeRange(b).startMin)
      .slice(0, 4);

    els.dashboardDayTitle.textContent = `Сегодня: ${formatDate(todayStr)}`;

    if (!todayItems.length) {
      els.dashboardCalendarTasks.innerHTML = '<p class="analytics-empty">На сегодня задач нет.</p>';
      return;
    }

    els.dashboardCalendarTasks.innerHTML = todayItems.map((request) => {
      const range = getRequestTimeRange(request);
      const employee = getEmployeeName(request.assignedEmployeeId) || 'без исполнителя';
      return `<div class="dashboard-task-item"><strong>${escapeHtml(getRequestServiceName(request))}</strong><br>${escapeHtml(range.start)}-${escapeHtml(range.end)} · ${escapeHtml(employee)}</div>`;
    }).join('');
  }

  function machineEmojiByType(type) {
    const value = (type || '').toLowerCase();
    if (value.includes('экскаватор')) return '🚜';
    if (value.includes('самосвал')) return '🚛';
    if (value.includes('мини')) return '🚜';
    if (value.includes('погрузчик')) return '🏗';
    return '⚙';
  }

  function renderDashboardMachines() {
    if (!els.dashboardMachineCards) return;

    const list = state.machines
      .filter((machine) => machine.isActive)
      .sort((a, b) => {
        const aBusy = a.status === 'busy' ? 0 : 1;
        const bBusy = b.status === 'busy' ? 0 : 1;
        return aBusy - bBusy;
      })
      .slice(0, 3);

    if (!list.length) {
      els.dashboardMachineCards.innerHTML = '<p class="analytics-empty">Техника не добавлена.</p>';
      return;
    }

    els.dashboardMachineCards.innerHTML = list.map((machine) => {
      return `
        <article class="machine-mini-card">
          <div class="machine-emoji">${machineEmojiByType(machine.machineType)}</div>
          <div class="machine-mini-name">${escapeHtml(machine.name)}</div>
          <span class="badge badge-${escapeHtml(machine.status)}">${escapeHtml(MACHINE_STATUS_LABELS[machine.status] || machine.status)}</span>
        </article>
      `;
    }).join('');
  }

  function renderDashboardClients() {
    if (!els.dashboardClientsList) return;

    const aggregate = [...getClientAggregates().values()]
      .sort((a, b) => b.requestsCount - a.requestsCount)
      .slice(0, 4);

    if (!aggregate.length) {
      els.dashboardClientsList.innerHTML = '<p class="analytics-empty">Клиентская база пока пуста.</p>';
      return;
    }

    els.dashboardClientsList.innerHTML = aggregate.map((item) => {
      const client = state.clients.find((c) => c.phone === item.phone);
      const name = client ? client.name : item.phone;
      const initial = sanitizeString(name).charAt(0).toUpperCase() || 'К';
      return `<div class="dashboard-client-item"><span class="dashboard-client-main"><i class="client-avatar">${escapeHtml(initial)}</i><span>${escapeHtml(name)}</span></span><span class="badge badge-new">${escapeHtml(String(item.requestsCount))} заявок</span></div>`;
    }).join('');
  }

  function renderDashboardFinance(todayDate) {
    if (!els.dashboardFinanceBox) return;

    const monthStart = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1);
    const monthEnd = new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 0);

    let income = 0;
    let paid = 0;

    state.requests.forEach((request) => {
      const date = parseDateOnly(request.objectDate);
      if (!date || date < monthStart || date > monthEnd || request.status === 'canceled') return;
      income += request.cost;
      paid += request.prepayment;
    });

    const expenses = round2(income * 0.35);

    els.dashboardFinanceBox.innerHTML = `
      <div class="finance-row"><span>Доход за месяц</span><strong>${escapeHtml(formatMoney(income))}</strong></div>
      <div class="finance-row"><span>Оплачено</span><strong>${escapeHtml(formatMoney(paid))}</strong></div>
      <div class="finance-row"><span>Расходы</span><strong>${escapeHtml(formatMoney(expenses))}</strong></div>
    `;
  }

  function renderAnalyticsBlocks() {
    const focusDates = getDateRange(toDateOnlyString(startOfDay(new Date())), 'week');

    const loadRows = focusDates.map((date) => {
      const count = state.requests.filter((request) => request.objectDate === date && isPlanningRelevant(request)).length;
      return { label: formatDate(date), value: `${count} заявок` };
    });
    els.analyticsLoadByDay.innerHTML = renderAnalyticsRows(loadRows);

    const byType = new Map();
    state.requests.forEach((request) => {
      if (!isPlanningRelevant(request)) return;
      let type = '';
      if (request.assignedMachineIds.length) {
        const machine = getMachineById(request.assignedMachineIds[0]);
        type = machine ? machine.machineType : '';
      }
      if (!type && request.serviceId) {
        const service = getServiceById(request.serviceId);
        type = service ? service.recommendedMachineType : '';
      }
      type = type || 'Не указан';
      byType.set(type, (byType.get(type) || 0) + 1);
    });
    els.analyticsByMachineType.innerHTML = renderAnalyticsRows(mapToRows(byType, 'заявок'));

    const byEmployee = new Map();
    state.requests.forEach((request) => {
      if (!isPlanningRelevant(request)) return;
      const ids = [request.assignedEmployeeId, ...request.crewEmployeeIds].filter(Boolean);
      if (!ids.length) return;
      ids.forEach((id) => {
        const employee = getEmployeeById(id);
        const key = employee ? employee.fullName : id;
        byEmployee.set(key, (byEmployee.get(key) || 0) + 1);
      });
    });
    els.analyticsByEmployee.innerHTML = renderAnalyticsRows(mapToRows(byEmployee, 'заявок'));

    const aggregate = getClientAggregates();
    const seasonalClients = [...aggregate.values()].filter((item) => item.seasonal).length;
    const inactiveClients = [...aggregate.values()].filter((item) => isClientInactive(item)).length;
    const rowsUnassigned = [
      { label: 'Без техники', value: `${getRequestsWithoutAssignmentsCount()} шт` },
      { label: 'С долгом по оплате', value: `${state.requests.filter((request) => request.balance > 0 && request.status !== 'canceled').length} шт` },
      { label: 'Сезонные клиенты', value: `${seasonalClients} шт` },
      { label: 'Неактивные >90 дн', value: `${inactiveClients} шт` }
    ];
    els.analyticsUnassigned.innerHTML = renderAnalyticsRows(rowsUnassigned);

    const sourceAnalytics = getRequestSourceAnalytics();
    els.analyticsSourceCount.innerHTML = renderAnalyticsRows(
      mapToRows(sourceAnalytics.countMap, 'заявок', (key) => sourceLabel(key))
    );
    els.analyticsSourceRevenue.innerHTML = renderAnalyticsRows(
      mapToRows(sourceAnalytics.revenueMap, '', (key) => sourceLabel(key), (value) => formatMoney(value))
    );
  }

  function mapToRows(map, suffix = '', keyFormatter = (key) => key, valueFormatter = null) {
    if (!map || !map.size) return [];
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([key, value]) => ({
        label: keyFormatter(key),
        value: valueFormatter ? valueFormatter(value) : `${value}${suffix ? ` ${suffix}` : ''}`.trim()
      }));
  }

  function renderAnalyticsRows(rows) {
    if (!rows || !rows.length) {
      return '<p class="analytics-empty">Нет данных</p>';
    }

    return rows
      .map((row) => `<div class="analytics-row"><span>${escapeHtml(row.label)}</span><strong>${escapeHtml(row.value)}</strong></div>`)
      .join('');
  }

  function renderMarketingTasks() {
    const openTasks = state.marketingTasks
      .filter((task) => task.status !== 'done')
      .sort((a, b) => {
        const aDate = parseDateOnly(a.dueDate)?.getTime() || 0;
        const bDate = parseDateOnly(b.dueDate)?.getTime() || 0;
        return aDate - bDate;
      })
      .slice(0, 20);

    if (!openTasks.length) {
      els.marketingTasksList.innerHTML = '<p class="analytics-empty">Активных маркетинговых задач нет</p>';
      return;
    }

    els.marketingTasksList.innerHTML = openTasks.map((task) => {
      const client = task.clientId ? getClientById(task.clientId) : null;
      const request = task.requestId ? state.requests.find((item) => item.id === task.requestId) : null;
      return `
        <div class="analytics-row">
          <span>${escapeHtml(task.title || MARKETING_TASK_LABELS[task.type] || 'Задача')} · ${escapeHtml(formatDate(task.dueDate))}${client ? ` · ${escapeHtml(client.name)}` : ''}${request ? ` · ${escapeHtml(getRequestServiceName(request))}` : ''}</span>
          <button class="btn btn-ghost" type="button" data-action="task-done" data-id="${escapeHtml(task.id)}">Выполнено</button>
        </div>
      `;
    }).join('');
  }

  function renderRequestFiltersOptions() {
    const settlements = uniqueValues([
      ...state.zones.map((zone) => zone.name),
      ...state.requests.map((request) => settlementLabelFromRequest(request))
    ]);
    fillSelect(
      els.settlementFilter,
      [{ value: 'all', label: 'Все' }, ...settlements.map((value) => ({ value, label: value }))],
      state.ui.request.settlement,
      'all'
    );

    const workTypes = uniqueValues([
      ...state.services.map((service) => service.name),
      ...state.requests.map((request) => request.workType),
      ...state.requests.map((request) => getRequestServiceName(request))
    ]);
    fillSelect(
      els.workTypeFilter,
      [{ value: 'all', label: 'Все' }, ...workTypes.map((value) => ({ value, label: value }))],
      state.ui.request.workType,
      'all'
    );

    const sourceOptions = uniqueValues([
      ...SOURCE_OPTIONS.map((opt) => opt.value).filter(Boolean),
      ...state.requests.map((request) => request.source || 'other'),
      ...state.clients.map((client) => client.source || 'other')
    ]).map((value) => ({ value, label: sourceLabel(value) }));

    fillSelect(
      els.sourceFilter,
      [{ value: 'all', label: 'Все' }, ...sourceOptions],
      state.ui.request.source,
      'all'
    );

    fillSelect(els.sourceInput, SOURCE_OPTIONS, els.sourceInput.value || '', '');

    fillSelect(
      els.serviceInput,
      [{ value: '', label: 'Не выбрано' }, ...state.services.map((service) => ({ value: service.id, label: service.name }))],
      els.serviceInput.value || '',
      ''
    );

    const settlementOptionsForRequestForm = [
      { value: '', label: 'Не выбрано' },
      ...state.zones.map((zone) => ({
        value: zone.id,
        label: `${zone.name}${zone.isActive ? '' : ' (неактивна)'}${zone.onlineEnabled ? '' : ' · только офлайн'}`
      }))
    ];
    fillSelect(els.settlementInput, settlementOptionsForRequestForm, els.settlementInput.value || '', '');

    fillSelect(
      els.assignedEmployeeInput,
      [{ value: '', label: 'Не назначен' }, ...state.employees.map((employee) => ({ value: employee.id, label: `${employee.fullName} (${EMPLOYEE_STATUS_LABELS[employee.status] || employee.status})` }))],
      els.assignedEmployeeInput.value || '',
      ''
    );

    fillMultiSelect(
      els.crewEmployeesInput,
      state.employees.map((employee) => ({ value: employee.id, label: employee.fullName })),
      getMultiSelectValues(els.crewEmployeesInput)
    );

    fillMultiSelect(
      els.assignedMachinesInput,
      state.machines.map((machine) => ({ value: machine.id, label: `${machine.name} (${machine.machineType})` })),
      getMultiSelectValues(els.assignedMachinesInput)
    );

    fillSelect(
      els.machineDefaultEmployeeInput,
      [{ value: '', label: 'Не назначен' }, ...state.employees.map((employee) => ({ value: employee.id, label: employee.fullName }))],
      els.machineDefaultEmployeeInput.value || '',
      ''
    );

    fillSelect(
      els.clientSourceFilter,
      [{ value: 'all', label: 'Все источники' }, ...sourceOptions],
      state.ui.clients.source,
      'all'
    );

    fillSelect(
      els.clientSettlementFilter,
      [{ value: 'all', label: 'Все поселки' }, ...settlements.map((value) => ({ value, label: value }))],
      state.ui.clients.settlement,
      'all'
    );

    fillSelect(
      els.clientServiceFilter,
      [{ value: 'all', label: 'Все услуги' }, ...state.services.map((service) => ({ value: service.id, label: service.name }))],
      state.ui.clients.service,
      'all'
    );

    fillSelect(
      els.campaignSourceInput,
      [{ value: 'all', label: 'Все' }, ...sourceOptions],
      state.ui.campaigns.source,
      'all'
    );

    fillSelect(
      els.campaignSettlementInput,
      [{ value: 'all', label: 'Все' }, ...settlements.map((value) => ({ value, label: value }))],
      state.ui.campaigns.settlement,
      'all'
    );

    fillSelect(
      els.campaignServiceInput,
      [{ value: 'all', label: 'Все' }, ...state.services.map((service) => ({ value: service.id, label: service.name }))],
      state.ui.campaigns.service,
      'all'
    );

    fillSelect(
      els.campaignSegmentInput,
      [
        { value: 'all', label: 'Все' },
        { value: 'new', label: 'Новые' },
        { value: 'repeat', label: 'Повторные' },
        { value: 'debt', label: 'С долгом' },
        { value: 'inactive', label: 'Давно не обращались' },
        { value: 'seasonal', label: 'Сезонные' }
      ],
      state.ui.campaigns.segment,
      'all'
    );

    fillSelect(
      els.campaignTemplateInput,
      CAMPAIGN_TEMPLATES.map((tpl) => ({ value: tpl.id, label: tpl.title })),
      state.ui.campaigns.templateId,
      CAMPAIGN_TEMPLATES[0].id
    );

    fillSelect(
      els.bookingServiceInput,
      [{ value: '', label: 'Выберите' }, ...state.services.map((service) => ({ value: service.id, label: service.name }))],
      els.bookingServiceInput.value || '',
      ''
    );

    fillSelect(
      els.bookingZoneInput,
      [{ value: '', label: 'Выберите' }, ...state.zones.map((zone) => ({
        value: zone.id,
        label: zone.isActive
          ? `${zone.name}${zone.onlineEnabled ? '' : ' (только через диспетчера)'}`
          : `${zone.name} (временно недоступна)`,
        disabled: !zone.isActive || !zone.onlineEnabled
      }))],
      els.bookingZoneInput.value || '',
      ''
    );

    fillSelect(
      els.bookingSlotInput,
      [{ value: '', label: 'Выберите' }, ...BOOKING_SLOTS.map((slot) => ({ value: `${slot.start}-${slot.end}`, label: `${slot.start}-${slot.end}` }))],
      els.bookingSlotInput.value || '',
      ''
    );
  }

  function fillSelect(select, options, selectedValue, fallbackValue = '') {
    if (!select) return;

    const current = sanitizeString(selectedValue);
    const hasOption = options.some((option) => option.value === current);
    const nextValue = hasOption ? current : fallbackValue;

    select.innerHTML = options
      .map((option) => `<option value="${escapeHtml(option.value)}"${option.disabled ? " disabled" : ""}>${escapeHtml(option.label)}</option>`)
      .join('');

    select.value = nextValue;
  }

  function fillMultiSelect(select, options, selectedValues) {
    if (!select) return;
    select.innerHTML = options
      .map((option) => `<option value="${escapeHtml(option.value)}"${option.disabled ? " disabled" : ""}>${escapeHtml(option.label)}</option>`)
      .join('');
    setMultiSelectValues(select, normalizeIdArray(selectedValues));
  }

  function renderRequests() {
    const list = getFilteredRequests();

    els.resultsInfo.textContent = `Показано: ${list.length} из ${state.requests.length}`;
    renderRequestsTable(list);
    renderRequestsCards(list);
  }

  function renderRequestsTable(list) {
    if (!list.length) {
      els.requestsTableBody.innerHTML = '<tr><td colspan="8" class="muted">Нет заявок по текущим фильтрам</td></tr>';
      return;
    }

    els.requestsTableBody.innerHTML = list.map((request) => {
      const effectiveStatus = getEffectiveRequestStatus(request);
      const statusBadge = `<span class="badge badge-${escapeHtml(effectiveStatus)}">${escapeHtml(getStatusLabel(effectiveStatus))}</span>`;
      const paymentBadge = `<span class="badge badge-${escapeHtml(request.paymentStatus)}">${escapeHtml(getPaymentStatusLabel(request.paymentStatus))}</span>`;

      const conflictCount = detectRequestConflicts(request, request.id).length;
      const rowClass = `${isRequestOverdue(request) ? 'overdue-row' : ''} ${conflictCount ? 'conflict-row' : ''}`.trim();

      const machineNames = getMachineNames(request.assignedMachineIds).join(', ');
      const employeeName = getEmployeeName(request.assignedEmployeeId);
      const crew = getCrewNames(request.crewEmployeeIds).join(', ');
      const range = getRequestTimeRange(request);

      return `
        <tr class="${escapeHtml(rowClass)}">
          <td>
            <strong>${escapeHtml(request.clientName || 'Без имени')}</strong><br>
            ${renderRequestSourceBadge(request)}
            ${request.channel ? `<div class="muted">Канал: ${escapeHtml(request.channel)}</div>` : ''}
          </td>
          <td>
            ${escapeHtml(request.phone || '-')}
            <div class="muted">${escapeHtml([settlementLabelFromRequest(request), request.street, request.house, request.address].filter(Boolean).join(', ') || '-')}</div>
          </td>
          <td>${escapeHtml(getRequestServiceName(request))}</td>
          <td>
            ${escapeHtml(formatDate(request.objectDate))}
            <div class="muted">${escapeHtml(range.start)}-${escapeHtml(range.end)}</div>
          </td>
          <td>${statusBadge}</td>
          <td>
            <div>${escapeHtml(machineNames || 'Техника не назначена')}</div>
            <div class="muted">${escapeHtml(employeeName || 'Сотрудник не назначен')}${crew ? ` · Экипаж: ${escapeHtml(crew)}` : ''}</div>
            ${conflictCount ? `<div class="muted">Конфликтов: ${conflictCount}</div>` : ''}
          </td>
          <td>
            ${paymentBadge}
            <div class="muted">${escapeHtml(formatMoney(request.cost))}</div>
            <div class="muted">Остаток: ${escapeHtml(formatMoney(request.balance))}</div>
          </td>
          <td>
            <div class="table-actions">
              <button class="btn btn-ghost" type="button" data-action="edit-request" data-id="${escapeHtml(request.id)}">Ред.</button>
              <button class="btn btn-ghost" type="button" data-action="copy-request" data-id="${escapeHtml(request.id)}">Копия</button>
              <button class="btn btn-ghost" type="button" data-action="delete-request" data-id="${escapeHtml(request.id)}">Удалить</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function renderRequestsCards(list) {
    if (!list.length) {
      els.cardsWrap.innerHTML = '<p class="muted">Нет заявок по текущим фильтрам</p>';
      return;
    }

    els.cardsWrap.innerHTML = list.map((request) => {
      const effectiveStatus = getEffectiveRequestStatus(request);
      const paymentBadge = `<span class="badge badge-${escapeHtml(request.paymentStatus)}">${escapeHtml(getPaymentStatusLabel(request.paymentStatus))}</span>`;
      const statusBadge = `<span class="badge badge-${escapeHtml(effectiveStatus)}">${escapeHtml(getStatusLabel(effectiveStatus))}</span>`;
      const conflictCount = detectRequestConflicts(request, request.id).length;
      const range = getRequestTimeRange(request);

      const relatedServices = getRelatedServicesForRequest(request);

      return `
        <article class="request-card ${isRequestOverdue(request) ? 'overdue-row' : ''}">
          <div class="card-head">
            <div>
              <strong>${escapeHtml(request.clientName || 'Без имени')}</strong>
              <div class="muted">${escapeHtml(request.phone || '-')}</div>
              <div>${renderRequestSourceBadge(request)}</div>
            </div>
            <div>${statusBadge}</div>
          </div>
          <div class="meta"><b>Поселок:</b> <span>${escapeHtml(settlementLabelFromRequest(request) || '-')}</span></div>
          <div class="meta"><b>Адрес:</b> <span>${escapeHtml([request.street, request.house, request.address].filter(Boolean).join(', ') || '-')}</span></div>
          <div class="meta"><b>Услуга:</b> <span>${escapeHtml(getRequestServiceName(request))}</span></div>
          <div class="meta"><b>Дата:</b> <span>${escapeHtml(formatDate(request.objectDate))} ${escapeHtml(range.start)}-${escapeHtml(range.end)}</span></div>
          <div class="meta"><b>Оплата:</b> <span>${paymentBadge} ${escapeHtml(formatMoney(request.cost))} · долг ${escapeHtml(formatMoney(request.balance))}</span></div>
          <div class="meta"><b>Комментарий:</b> <span>${escapeHtml(request.comment || request.internalComment || '-')}</span></div>
          ${relatedServices.length ? `<div class="meta"><b>Допродажа:</b> <span>${escapeHtml(relatedServices.join(', '))}</span></div>` : ''}
          ${conflictCount ? `<div class="meta"><b>Конфликты:</b> <span>${escapeHtml(String(conflictCount))}</span></div>` : ''}
          <div class="card-actions">
            <button class="btn btn-ghost" type="button" data-action="edit-request" data-id="${escapeHtml(request.id)}">Ред.</button>
            <button class="btn btn-ghost" type="button" data-action="copy-request" data-id="${escapeHtml(request.id)}">Копия</button>
            <button class="btn btn-ghost" type="button" data-action="delete-request" data-id="${escapeHtml(request.id)}">Удалить</button>
          </div>
        </article>
      `;
    }).join('');
  }

  function getRelatedServicesForRequest(request) {
    if (!request.serviceId) return [];
    const service = getServiceById(request.serviceId);
    return service ? uniqueValues(service.relatedServices) : [];
  }

  function renderClients() {
    const aggregateMap = getClientAggregates();
    const list = getFilteredClients();

    els.clientsInfo.textContent = `Показано: ${list.length} из ${state.clients.length}`;

    if (!list.length) {
      els.clientsTableBody.innerHTML = '<tr><td colspan="6" class="muted">Клиенты не найдены</td></tr>';
    } else {
      els.clientsTableBody.innerHTML = list.map((client) => {
        const aggregate = aggregateMap.get(client.phone);
        const count = aggregate ? aggregate.requestsCount : 0;
        const revenue = aggregate ? aggregate.totalRevenue : 0;
        const last = aggregate?.lastDate ? formatDate(toDateOnlyString(aggregate.lastDate)) : '-';

        let segmentLabel = 'Новый';
        if (aggregate && aggregate.totalBalance > 0) segmentLabel = 'С долгом';
        else if (aggregate && aggregate.requestsCount > 1) segmentLabel = 'Повторный';
        else if (aggregate && aggregate.seasonal) segmentLabel = 'Сезонный';

        return `
          <tr>
            <td>${escapeHtml(client.name || '-')}</td>
            <td>${escapeHtml(client.phone || '-')}</td>
            <td>${escapeHtml(sourceLabel(client.source || (aggregate ? [...aggregate.sources][0] : '')))}</td>
            <td>${escapeHtml(`${count} заявок · ${formatMoney(revenue)} · ${last}`)}</td>
            <td>${escapeHtml(segmentLabel)}</td>
            <td>
              <div class="table-actions">
                <button class="btn btn-ghost" type="button" data-action="client-history" data-id="${escapeHtml(client.id)}">История</button>
                <button class="btn btn-ghost" type="button" data-action="edit-client" data-id="${escapeHtml(client.id)}">Ред.</button>
                <button class="btn btn-ghost" type="button" data-action="delete-client" data-id="${escapeHtml(client.id)}">Удалить</button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    }

    renderClientHistory();
  }

  function renderClientHistory() {
    const selectedId = state.ui.clients.selectedClientId;
    const aggregateMap = getClientAggregates();
    const client = selectedId ? getClientById(selectedId) : null;

    if (!client) {
      els.clientHistoryContent.innerHTML = '<p class="analytics-empty">Выберите клиента в таблице, чтобы посмотреть историю.</p>';
      return;
    }

    const aggregate = aggregateMap.get(client.phone);
    const clientRequests = state.requests
      .filter((request) => request.phone === client.phone)
      .sort((a, b) => (parseDateOnly(b.objectDate)?.getTime() || 0) - (parseDateOnly(a.objectDate)?.getTime() || 0));

    const relatedUpsell = uniqueValues(clientRequests.flatMap((request) => getRelatedServicesForRequest(request)));

    const rows = [
      { label: 'Клиент', value: client.name || '-' },
      { label: 'Телефон', value: client.phone || '-' },
      { label: 'Заявок', value: String(aggregate ? aggregate.requestsCount : 0) },
      { label: 'На сумму', value: formatMoney(aggregate ? aggregate.totalRevenue : 0) },
      { label: 'Услуги', value: aggregate ? [...aggregate.services].join(', ') || '-' : '-' },
      { label: 'Последний заказ', value: aggregate?.lastDate ? formatDate(toDateOnlyString(aggregate.lastDate)) : '-' },
      { label: 'Источник', value: sourceLabel(client.source || (aggregate ? [...aggregate.sources][0] : '')) },
      { label: 'Канал', value: client.channel || '-' },
      { label: 'Метки/рейтинг', value: `${tagsToText(client.tags)} ${client.rating ? `· ${client.rating}` : ''}`.trim() || '-' },
      { label: 'Внутренние заметки', value: client.comment || '-' },
      { label: 'Связанные услуги', value: relatedUpsell.join(', ') || '-' }
    ];

    els.clientHistoryContent.innerHTML = renderAnalyticsRows(rows);
  }

  function renderMachines() {
    els.machinesInfo.textContent = `Всего: ${state.machines.length}`;

    if (!state.machines.length) {
      els.machinesTableBody.innerHTML = '<tr><td colspan="6" class="muted">Техника еще не добавлена</td></tr>';
      return;
    }

    els.machinesTableBody.innerHTML = state.machines.map((machine) => {
      return `
        <tr>
          <td>${escapeHtml(machine.name)}</td>
          <td>${escapeHtml(machine.machineType)}</td>
          <td>${escapeHtml(machine.internalNumber || '-')} / ${escapeHtml(machine.plate || '-')}</td>
          <td><span class="badge badge-${escapeHtml(machine.status)}">${escapeHtml(MACHINE_STATUS_LABELS[machine.status] || machine.status)}</span></td>
          <td>${escapeHtml(formatMoney(machine.baseRateHour))}</td>
          <td>
            <div class="table-actions">
              <button class="btn btn-ghost" type="button" data-action="edit-machine" data-id="${escapeHtml(machine.id)}">Ред.</button>
              <button class="btn btn-ghost" type="button" data-action="delete-machine" data-id="${escapeHtml(machine.id)}">Удалить</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function renderEmployees() {
    els.employeesInfo.textContent = `Всего: ${state.employees.length}`;

    if (!state.employees.length) {
      els.employeesTableBody.innerHTML = '<tr><td colspan="6" class="muted">Сотрудники еще не добавлены</td></tr>';
      return;
    }

    els.employeesTableBody.innerHTML = state.employees.map((employee) => {
      return `
        <tr>
          <td>${escapeHtml(employee.fullName)}</td>
          <td>${escapeHtml(employee.phone || '-')}</td>
          <td>${escapeHtml(employee.role || '-')}</td>
          <td>${escapeHtml(tagsToText(employee.machineTypes) || '-')}</td>
          <td><span class="badge badge-${escapeHtml(employee.status)}">${escapeHtml(EMPLOYEE_STATUS_LABELS[employee.status] || employee.status)}</span></td>
          <td>
            <div class="table-actions">
              <button class="btn btn-ghost" type="button" data-action="edit-employee" data-id="${escapeHtml(employee.id)}">Ред.</button>
              <button class="btn btn-ghost" type="button" data-action="delete-employee" data-id="${escapeHtml(employee.id)}">Удалить</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function renderServices() {
    els.servicesInfo.textContent = `Всего: ${state.services.length}`;

    if (!state.services.length) {
      els.servicesTableBody.innerHTML = '<tr><td colspan="6" class="muted">Услуги еще не добавлены</td></tr>';
      return;
    }

    els.servicesTableBody.innerHTML = state.services.map((service) => {
      return `
        <tr>
          <td>${escapeHtml(service.name)}</td>
          <td>${escapeHtml(service.recommendedMachineType || '-')}</td>
          <td>${escapeHtml(formatMoney(service.minPrice))}</td>
          <td>${escapeHtml(`${service.minHours || 0} ч`)}</td>
          <td>${escapeHtml(tagsToText(service.relatedServices) || '-')}</td>
          <td>
            <div class="table-actions">
              <button class="btn btn-ghost" type="button" data-action="edit-service" data-id="${escapeHtml(service.id)}">Ред.</button>
              <button class="btn btn-ghost" type="button" data-action="delete-service" data-id="${escapeHtml(service.id)}">Удалить</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function renderZones() {
    els.zonesInfo.textContent = `Всего: ${state.zones.length}`;
    if (!state.zones.length) {
      els.zonesTableBody.innerHTML = '<tr><td colspan="5" class="muted">Зоны еще не добавлены</td></tr>';
      return;
    }

    els.zonesTableBody.innerHTML = state.zones.map((zone) => {
      return `
        <tr>
          <td>${escapeHtml(zone.name)}</td>
          <td><span class="badge ${zone.isActive ? 'badge-active' : 'badge-offline_zone'}">${zone.isActive ? 'Активна' : 'Неактивна'}</span></td>
          <td><span class="badge ${zone.onlineEnabled ? 'badge-online' : 'badge-offline_zone'}">${zone.onlineEnabled ? 'Разрешено' : 'Выключено'}</span></td>
          <td>${escapeHtml(formatMoney(zone.markup))}</td>
          <td>
            <div class="table-actions">
              <button class="btn btn-ghost" type="button" data-action="edit-zone" data-id="${escapeHtml(zone.id)}">Ред.</button>
              <button class="btn btn-ghost" type="button" data-action="delete-zone" data-id="${escapeHtml(zone.id)}">Удалить</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function renderCalendar() {
    const dates = getDateRange(state.ui.calendar.focusDate, state.ui.calendar.range);
    const mode = state.ui.calendar.mode;

    els.calendarListPanel.classList.toggle('hidden', mode !== 'list');
    els.calendarMachinePanel.classList.toggle('hidden', mode !== 'machines');

    renderCalendarList(dates);
    renderCalendarByMachines(dates);
  }

  function renderCalendarList(dates) {
    els.calendarListView.innerHTML = dates.map((date) => {
      const dayRequests = state.requests
        .filter((request) => request.objectDate === date)
        .sort((a, b) => getRequestTimeRange(a).startMin - getRequestTimeRange(b).startMin);

      const content = dayRequests.length
        ? dayRequests.map((request) => {
          const range = getRequestTimeRange(request);
          const conflicts = detectRequestConflicts(request, request.id);
          const machines = getMachineNames(request.assignedMachineIds).join(', ') || 'Без техники';
          const employee = getEmployeeName(request.assignedEmployeeId) || 'Без сотрудника';
          return `
            <div class="calendar-item ${conflicts.length ? 'conflict' : ''}">
              <strong>${escapeHtml(range.start)}-${escapeHtml(range.end)} · ${escapeHtml(request.clientName || '-')}</strong>
              <span>${escapeHtml(getRequestServiceName(request))}</span>
              <span>${escapeHtml(machines)} · ${escapeHtml(employee)}</span>
            </div>
          `;
        }).join('')
        : '<p class="analytics-empty">Нет заявок</p>';

      return `
        <article class="calendar-day-block">
          <h3 class="calendar-day-title">${escapeHtml(formatDateLong(date))}</h3>
          ${content}
        </article>
      `;
    }).join('');
  }

  function renderCalendarByMachines(dates) {
    const machines = state.machines.filter((machine) => machine.isActive);
    const rows = machines.length ? machines : [{ id: '_unassigned', name: 'Без техники', machineType: '-' }];

    const head = `
      <thead>
        <tr>
          <th>Техника</th>
          ${dates.map((date) => `<th>${escapeHtml(formatDate(date))}</th>`).join('')}
        </tr>
      </thead>
    `;

    const body = rows.map((machine) => {
      const isUnassigned = machine.id === '_unassigned';
      const cells = dates.map((date) => {
        const items = state.requests.filter((request) => {
          if (request.objectDate !== date) return false;
          if (isUnassigned) return !request.assignedMachineIds.length;
          return request.assignedMachineIds.includes(machine.id);
        });

        if (!items.length) {
          return '<td><div class="plan-cell-items"><span class="muted">-</span></div></td>';
        }

        const chips = items.map((request) => {
          const conflicts = detectRequestConflicts(request, request.id);
          const range = getRequestTimeRange(request);
          return `
            <div class="plan-chip ${conflicts.length ? 'conflict' : ''}">
              <strong>${escapeHtml(range.start)}-${escapeHtml(range.end)}</strong><br>
              ${escapeHtml(request.clientName || '-')}
              <div>${escapeHtml(getRequestServiceName(request))}</div>
            </div>
          `;
        }).join('');

        return `<td><div class="plan-cell-items">${chips}</div></td>`;
      }).join('');

      return `
        <tr>
          <td><strong>${escapeHtml(machine.name)}</strong><br><span class="muted">${escapeHtml(machine.machineType || '')}</span></td>
          ${cells}
        </tr>
      `;
    }).join('');

    els.calendarMachineView.innerHTML = `<table class="machine-plan-table">${head}<tbody>${body}</tbody></table>`;
  }

  function renderBooking() {
    renderBookingZonesStatus();
    updateBookingPreview();
  }

  function renderBookingZonesStatus() {
    if (!state.zones.length) {
      els.bookingZonesStatus.innerHTML = '<p class="analytics-empty">Зоны не настроены</p>';
      return;
    }

    els.bookingZonesStatus.innerHTML = state.zones.map((zone) => {
      const status = zone.isActive ? (zone.onlineEnabled ? 'Онлайн доступен' : 'Только через диспетчера') : 'Не обслуживается';
      const badgeClass = zone.isActive ? (zone.onlineEnabled ? 'badge-online' : 'badge-offline_zone') : 'badge-offline_zone';
      return `
        <div class="analytics-row">
          <span>${escapeHtml(zone.name)} · надбавка ${escapeHtml(formatMoney(zone.markup))}</span>
          <span class="badge ${badgeClass}">${escapeHtml(status)}</span>
        </div>
      `;
    }).join('');
  }

  function getBookingAvailability(date, slot, zoneId) {
    const zone = getZoneById(zoneId);
    if (!zone) return { state: 'unknown', text: 'Выберите обслуживаемый поселок.' };
    if (!zone.isActive) return { state: 'unavailable', text: 'Эта зона временно не обслуживается.' };
    if (!zone.onlineEnabled) return { state: 'unavailable', text: 'Онлайн-бронирование для зоны отключено. Оформите через диспетчера.' };

    if (!date) return { state: 'unknown', text: 'Выберите дату, чтобы проверить доступность.' };

    const parsedDate = parseDateOnly(date);
    const today = startOfDay(new Date());
    if (parsedDate && parsedDate < today) {
      return { state: 'unavailable', text: 'Нельзя бронировать прошедшие даты.' };
    }

    const capacity = getActiveFleetCapacity();
    if (capacity <= 0) {
      return { state: 'unavailable', text: 'Нет доступной техники на выбранный день.' };
    }

    let start = '';
    let end = '';
    if (slot) {
      const parsed = parseSlot(slot);
      start = parsed.start;
      end = parsed.end;
    }

    const load = getBusyLoadForDate(date, start, end);
    if (load >= capacity) {
      return { state: 'unavailable', text: `Слот занят: ${load}/${capacity} заявок в работе.` };
    }
    if (load >= Math.max(1, capacity - 1)) {
      return { state: 'limited', text: `Ограниченная доступность: ${load}/${capacity}. Подтверждение у диспетчера.` };
    }
    return { state: 'available', text: `Доступно: ${capacity - load} из ${capacity} единиц техники свободны.` };
  }

  function renderBookingMiniCalendar(selectedDate, zoneId, slot) {
    if (!els.bookingCalendarMini) return;

    const base = parseDateOnly(selectedDate) || startOfDay(new Date());
    const year = base.getFullYear();
    const month = base.getMonth();
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);
    const firstWeekday = (monthStart.getDay() + 6) % 7;
    const today = startOfDay(new Date());

    const monthLabel = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' }).format(base);
    if (els.bookingCalendarTitle) {
      els.bookingCalendarTitle.textContent = `Доступность · ${monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}`;
    }

    const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    const cells = days.map((day) => `<span class="booking-weekday">${day}</span>`);

    for (let i = 0; i < firstWeekday; i += 1) {
      cells.push('<span class="booking-day booking-day-empty" aria-hidden="true"></span>');
    }

    for (let day = 1; day <= monthEnd.getDate(); day += 1) {
      const date = new Date(year, month, day);
      const dateStr = toDateOnlyString(date);
      const availability = getBookingAvailability(dateStr, slot, zoneId);
      const isSelected = selectedDate === dateStr;
      const isPast = date < today;

      let stateClass = 'busy';
      if (availability.state === 'available') stateClass = 'free';
      if (availability.state === 'limited') stateClass = 'limited';
      if (availability.state === 'unknown') stateClass = 'free';

      const disabled = isPast || availability.state === 'unavailable';
      cells.push(`<button type="button" class="booking-day ${stateClass}${isSelected ? ' selected' : ''}" data-booking-date="${dateStr}" ${disabled ? 'disabled' : ''}>${day}</button>`);
    }

    els.bookingCalendarMini.innerHTML = cells.join('');
  }

  function renderBookingSummary(service, zone, estimate) {
    if (!els.bookingSummaryList) return;

    const street = sanitizeString(els.bookingStreetInput.value);
    const house = sanitizeString(els.bookingHouseInput.value);
    const items = [];

    if (zone) {
      const addressTail = [street, house].filter(Boolean).join(', ');
      items.push(`<li>${escapeHtml(zone.name)}${addressTail ? `, ${escapeHtml(addressTail)}` : ''}</li>`);
    }

    if (service) {
      items.push(`<li>${escapeHtml(service.name)}</li>`);
      if (service.recommendedMachineType) {
        const minHours = Math.max(1, normalizeNumber(service.minHours || 0));
        items.push(`<li>${escapeHtml(service.recommendedMachineType)}${minHours ? ` · от ${escapeHtml(String(minHours))} ч` : ''}</li>`);
      }
    }

    if (estimate) {
      items.push(`<li>База ${escapeHtml(formatMoney(estimate.base))} + надбавка ${escapeHtml(formatMoney(estimate.markup))}</li>`);
    }

    if (!items.length) {
      els.bookingSummaryList.innerHTML = '<p class="analytics-empty">Выберите услугу и поселок для расчета.</p>';
      return;
    }

    els.bookingSummaryList.innerHTML = `<ul>${items.join('')}</ul>`;
  }

  function updateBookingPreview() {
    const serviceId = sanitizeString(els.bookingServiceInput.value);
    const zoneId = sanitizeString(els.bookingZoneInput.value);
    const date = sanitizeString(els.bookingDateInput.value);
    const slot = sanitizeString(els.bookingSlotInput.value);

    const service = serviceId ? getServiceById(serviceId) : null;
    const zone = zoneId ? getZoneById(zoneId) : null;

    let estimate = null;
    if (serviceId && zoneId) {
      estimate = calculateRequestEstimate(serviceId, zoneId);
      els.bookingPricePreview.textContent = `Предварительная стоимость: от ${formatMoney(estimate.total)}`;
    } else {
      els.bookingPricePreview.textContent = 'Выберите услугу и поселок для предварительного расчета.';
    }

    if (els.bookingTotalPreview) {
      els.bookingTotalPreview.textContent = estimate ? formatMoney(estimate.total) : '—';
    }

    const availability = getBookingAvailability(date, slot, zoneId);
    els.bookingAvailability.textContent = availability.text;
    els.bookingAvailability.classList.toggle('unavailable', availability.state === 'unavailable');
    els.bookingAvailability.classList.toggle('limited', availability.state === 'limited');

    renderBookingMiniCalendar(date, zoneId, slot);
    renderBookingSummary(service, zone, estimate);
  }

  function renderCampaigns() {
    const recipients = getCampaignRecipients();

    els.campaignRecipientsInfo.textContent = `Получателей: ${recipients.length}`;
    if (!recipients.length) {
      els.campaignRecipientsList.innerHTML = '<p class="analytics-empty">По текущим условиям получателей нет.</p>';
    } else {
      els.campaignRecipientsList.innerHTML = recipients.map(({ client, aggregate }) => {
        const settlement = aggregate ? [...aggregate.settlements][0] || '-' : '-';
        return `
          <div class="analytics-row">
            <span>${escapeHtml(client.name || '-')} · ${escapeHtml(client.phone || '-')} · ${escapeHtml(settlement)}</span>
            <strong>${escapeHtml(`${aggregate?.requestsCount || 0} заказов`)}</strong>
          </div>
        `;
      }).join('');
    }

    renderCampaignPreview(recipients);
  }

  function renderCampaignPreview(recipients) {
    const message = state.ui.campaigns.message || '';
    const previewList = recipients.slice(0, 3).map(({ client, aggregate }) => personalizeCampaignMessage(message, client, aggregate));

    if (!previewList.length) {
      els.campaignPreviewBox.innerHTML = '<p class="analytics-empty">Нет примеров для предпросмотра.</p>';
      return;
    }

    els.campaignPreviewBox.innerHTML = previewList
      .map((text, idx) => `<div class="hint-item"><strong>Пример ${idx + 1}:</strong> ${escapeHtml(text)}</div>`)
      .join('');
  }

  function personalizeCampaignMessage(template, client, aggregate) {
    const name = client?.name || 'клиент';
    const settlement = aggregate ? [...aggregate.settlements][0] || 'вашем районе' : 'вашем районе';
    const serviceId = aggregate ? [...aggregate.serviceIds][0] : '';
    const service = serviceId ? getServiceById(serviceId) : null;
    const serviceName = service ? service.name : (aggregate ? [...aggregate.services][0] : '') || 'услуге';

    return (template || '')
      .replaceAll('{name}', name)
      .replaceAll('{settlement}', settlement)
      .replaceAll('{service}', serviceName);
  }

  function updateNotificationControls() {
    if (!els.notifyPermissionBtn) return;

    const button = els.notifyPermissionBtn;
    button.classList.remove('is-granted', 'is-denied', 'is-unsupported');

    if (!('Notification' in window)) {
      button.disabled = true;
      button.dataset.notifyState = 'unsupported';
      button.classList.add('is-unsupported');
      button.title = 'Браузер не поддерживает уведомления';
      button.setAttribute('aria-label', 'Уведомления недоступны');
      return;
    }

    button.disabled = false;

    if (Notification.permission === 'granted') {
      button.dataset.notifyState = 'granted';
      button.classList.add('is-granted');
      button.title = 'Уведомления включены';
      button.setAttribute('aria-label', 'Уведомления включены');
    } else if (Notification.permission === 'denied') {
      button.dataset.notifyState = 'denied';
      button.classList.add('is-denied');
      button.title = 'Уведомления заблокированы';
      button.setAttribute('aria-label', 'Уведомления заблокированы');
    } else {
      button.dataset.notifyState = 'default';
      button.title = 'Включить уведомления';
      button.setAttribute('aria-label', 'Включить уведомления');
    }
  }

  function renderInAppNotifications() {
    const hasNotifications = state.inAppNotifications.length > 0;
    const notificationUnsupported = !('Notification' in window);
    const notificationDenied = !notificationUnsupported && Notification.permission === 'denied';

    if (!hasNotifications && !notificationUnsupported && !notificationDenied) {
      els.inAppNoticeBox.classList.add('hidden');
      return;
    }

    els.inAppNoticeBox.classList.remove('hidden');

    if (hasNotifications) {
      els.noticeList.innerHTML = state.inAppNotifications.slice(0, 20).map((item) => {
        return `<article class="notice-item">${escapeHtml(item.message)} <div class="muted">${escapeHtml(item.createdAt)}</div></article>`;
      }).join('');
      return;
    }

    if (notificationUnsupported) {
      els.noticeList.innerHTML = '<article class="notice-item">Браузер не поддерживает уведомления. Используйте встроенный список напоминаний.</article>';
      return;
    }

    els.noticeList.innerHTML = '<article class="notice-item">Браузерные уведомления заблокированы. Разрешите их в настройках браузера, чтобы получать напоминания при открытой вкладке.</article>';
  }

  // ================================
  // Form helpers
  // ================================
  function resetAllForms() {
    resetRequestForm();
    resetClientForm();
    resetMachineForm();
    resetEmployeeForm();
    resetServiceForm();
    resetZoneForm();
  }

  function resetRequestForm() {
    if (els.requestForm) els.requestForm.reset();

    state.editors.request = 'create';
    els.formTitle.textContent = 'Новая заявка';
    els.requestIdInput.value = '';
    els.statusInput.value = 'new';
    els.objectDateInput.value = toDateOnlyString(new Date());
    els.startTimeInput.value = '09:00';
    els.durationHoursInput.value = '2';
    els.endTimeInput.value = calcEndTime('09:00', 2);
    els.paymentDateInput.value = '';
    els.paymentLinkInput.value = '';
    els.balanceInput.value = formatMoney(0);
    els.paymentStatusInput.value = getPaymentStatusLabel('unpaid');
    els.recommendedTypeInput.value = '';

    setMultiSelectValues(els.assignedMachinesInput, []);
    setMultiSelectValues(els.crewEmployeesInput, []);

    els.conflictBox.classList.add('hidden');
    els.assignmentHints.innerHTML = '';
  }

  function resetClientForm() {
    if (els.clientForm) els.clientForm.reset();
    state.editors.client = 'create';
    els.clientFormTitle.textContent = 'Новый клиент';
    els.clientIdInput.value = '';
  }

  function resetMachineForm() {
    if (els.machineForm) els.machineForm.reset();
    state.editors.machine = 'create';
    els.machineFormTitle.textContent = 'Новая техника';
    els.machineIdInput.value = '';
    els.machineActiveInput.checked = true;
  }

  function resetEmployeeForm() {
    if (els.employeeForm) els.employeeForm.reset();
    state.editors.employee = 'create';
    els.employeeFormTitle.textContent = 'Новый сотрудник';
    els.employeeIdInput.value = '';
    if (els.employeeStatusInput) els.employeeStatusInput.value = 'active';
  }

  function resetServiceForm() {
    if (els.serviceForm) els.serviceForm.reset();
    state.editors.service = 'create';
    els.serviceFormTitle.textContent = 'Новая услуга';
    els.serviceIdInput.value = '';
  }

  function resetZoneForm() {
    if (els.zoneForm) els.zoneForm.reset();
    state.editors.zone = 'create';
    els.zoneFormTitle.textContent = 'Новая зона';
    els.zoneIdInput.value = '';
    els.zoneActiveInput.checked = true;
    els.zoneOnlineInput.checked = true;
  }

  function updateRequestDerivedFields() {
    const start = sanitizeTime(els.startTimeInput.value) || '09:00';
    const duration = Math.max(0.5, normalizeNumber(els.durationHoursInput.value || 2));
    const end = calcEndTime(start, duration);
    els.endTimeInput.value = end;

    const financials = calculateFinancials(els.costInput.value, els.prepaymentInput.value);
    els.balanceInput.value = formatMoney(financials.balance);
    els.paymentStatusInput.value = getPaymentStatusLabel(financials.paymentStatus);

    const selectedService = getServiceById(els.serviceInput.value);
    els.recommendedTypeInput.value = selectedService?.recommendedMachineType || '';

    if (!normalizeNumber(els.costInput.value) && selectedService) {
      const estimate = calculateRequestEstimate(selectedService.id, els.settlementInput.value);
      if (estimate.total > 0) {
        els.costInput.value = String(estimate.total);
        const nextFinancials = calculateFinancials(els.costInput.value, els.prepaymentInput.value);
        els.balanceInput.value = formatMoney(nextFinancials.balance);
        els.paymentStatusInput.value = getPaymentStatusLabel(nextFinancials.paymentStatus);
      }
    }
  }

  function buildRequestFromForm(existingId = '') {
    const id = sanitizeString(els.requestIdInput.value) || existingId || uid('req');
    const existing = existingId ? state.requests.find((item) => item.id === existingId) : null;

    const startTime = sanitizeTime(els.startTimeInput.value) || '09:00';
    const durationHours = Math.max(0.5, normalizeNumber(els.durationHoursInput.value || 2));
    const endTime = sanitizeTime(els.endTimeInput.value) || calcEndTime(startTime, durationHours);
    const desiredTime = formatDesiredSlot(startTime, endTime);

    const zoneId = sanitizeString(els.settlementInput.value);
    const zone = getZoneById(zoneId);
    const settlement = zone ? zone.name : '';

    const financials = calculateFinancials(els.costInput.value, els.prepaymentInput.value);

    return normalizeRequest({
      ...existing,
      id,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      clientName: sanitizeString(els.clientNameInput.value),
      phone: sanitizeString(els.phoneInput.value),
      source: sanitizeString(els.sourceInput.value),
      tags: normalizeTags(els.tagsInput.value),
      zoneId,
      settlement,
      street: sanitizeString(els.streetInput.value),
      house: sanitizeString(els.houseInput.value),
      address: sanitizeString(els.addressInput.value) || [settlement, sanitizeString(els.streetInput.value), sanitizeString(els.houseInput.value)].filter(Boolean).join(', '),
      serviceId: sanitizeString(els.serviceInput.value),
      workType: sanitizeString(els.workTypeInput.value),
      objectDate: sanitizeString(els.objectDateInput.value),
      status: sanitizeRequestStatus(els.statusInput.value),
      startTime,
      durationHours,
      endTime,
      desiredTime,
      assignedEmployeeId: sanitizeString(els.assignedEmployeeInput.value),
      assignedMachineIds: getMultiSelectValues(els.assignedMachinesInput),
      crewEmployeeIds: getMultiSelectValues(els.crewEmployeesInput),
      cost: financials.cost,
      prepayment: financials.prepayment,
      paymentMethod: sanitizeString(els.paymentMethodInput.value),
      paymentStatus: financials.paymentStatus,
      paymentLink: sanitizeString(els.paymentLinkInput.value),
      paymentDate: sanitizeString(els.paymentDateInput.value),
      dispatcherNote: sanitizeString(els.dispatcherNoteInput.value),
      comment: sanitizeString(els.commentInput.value),
      internalComment: sanitizeString(els.internalCommentInput.value),
      onlineBooking: sanitizeString(els.sourceInput.value) === 'online_booking'
    });
  }

  function fillRequestForm(request) {
    if (!request) return;
    state.editors.request = request.id;
    els.formTitle.textContent = `Редактирование #${request.id}`;

    els.requestIdInput.value = request.id;
    els.clientNameInput.value = request.clientName || '';
    els.phoneInput.value = request.phone || '';
    els.sourceInput.value = request.source || '';
    els.tagsInput.value = tagsToText(request.tags);

    els.settlementInput.value = request.zoneId || '';
    els.streetInput.value = request.street || '';
    els.houseInput.value = request.house || '';
    els.addressInput.value = request.address || '';

    els.serviceInput.value = request.serviceId || '';
    els.workTypeInput.value = request.workType || '';
    els.objectDateInput.value = request.objectDate || '';
    els.statusInput.value = request.status || 'new';

    els.startTimeInput.value = request.startTime || '09:00';
    els.durationHoursInput.value = request.durationHours || 2;
    els.endTimeInput.value = request.endTime || calcEndTime(request.startTime || '09:00', request.durationHours || 2);
    els.desiredTimeInput.value = request.desiredTime || '';

    els.assignedEmployeeInput.value = request.assignedEmployeeId || '';
    setMultiSelectValues(els.assignedMachinesInput, request.assignedMachineIds);
    setMultiSelectValues(els.crewEmployeesInput, request.crewEmployeeIds);

    els.costInput.value = request.cost || 0;
    els.prepaymentInput.value = request.prepayment || 0;
    els.balanceInput.value = formatMoney(request.balance || 0);
    els.paymentStatusInput.value = getPaymentStatusLabel(request.paymentStatus || 'unpaid');
    els.paymentMethodInput.value = request.paymentMethod || '';
    els.paymentLinkInput.value = request.paymentLink || '';
    els.paymentDateInput.value = request.paymentDate || '';

    els.dispatcherNoteInput.value = request.dispatcherNote || '';
    els.commentInput.value = request.comment || '';
    els.internalCommentInput.value = request.internalComment || '';

    updateRequestDerivedFields();
    updateAssignmentHintsAndConflicts();
  }

  function updateAssignmentHintsAndConflicts() {
    const draft = buildRequestFromForm(state.editors.request !== 'create' ? state.editors.request : '');
    const service = draft.serviceId ? getServiceById(draft.serviceId) : null;

    const hints = [];
    if (service?.recommendedMachineType) {
      hints.push(`Рекомендуемый тип техники: ${service.recommendedMachineType}`);
    }

    if (draft.objectDate) {
      const availableMachines = getAvailableMachines(draft);
      const availableEmployees = getAvailableEmployees(draft);

      hints.push(`Свободная техника на дату: ${availableMachines.map((item) => item.name).join(', ') || 'нет'}`);
      hints.push(`Свободные сотрудники: ${availableEmployees.map((item) => item.fullName).join(', ') || 'нет'}`);

      if (service?.needsAdditionalMachine) {
        hints.push('Для услуги рекомендуется дополнительная единица техники.');
      }
    } else {
      hints.push('Укажите дату и время, чтобы увидеть подсказки по назначению.');
    }

    els.assignmentHints.innerHTML = hints.map((line) => `<div class="hint-item">${escapeHtml(line)}</div>`).join('');

    const conflicts = detectRequestConflicts(draft, state.editors.request === 'create' ? '' : state.editors.request);
    if (!conflicts.length) {
      els.conflictBox.classList.add('hidden');
      els.conflictBox.innerHTML = '';
      return;
    }

    const lines = conflicts.map((item) => {
      const request = item.request;
      return `<li>Заявка ${escapeHtml(request.clientName || request.id)} (${escapeHtml(formatDate(request.objectDate))} ${escapeHtml(item.range.start)}-${escapeHtml(item.range.end)}): ${escapeHtml(item.reasons.join('; '))}</li>`;
    }).join('');

    els.conflictBox.classList.remove('hidden');
    els.conflictBox.innerHTML = `<h4>Обнаружены конфликты назначения</h4><ul>${lines}</ul><p>Можно сохранить вручную, но есть риск перегруза.</p>`;
  }

  function getAvailableMachines(draft) {
    const type = draft.serviceId ? getServiceById(draft.serviceId)?.recommendedMachineType : '';
    return state.machines.filter((machine) => {
      if (!machine.isActive) return false;
      if (machine.status === 'repair' || machine.status === 'offline') return false;
      if (type && machine.machineType !== type) return false;

      const conflicts = detectRequestConflicts({
        ...draft,
        assignedMachineIds: [machine.id],
        assignedEmployeeId: '',
        crewEmployeeIds: []
      }, state.editors.request === 'create' ? '' : state.editors.request);

      return !conflicts.length;
    });
  }

  function getAvailableEmployees(draft) {
    return state.employees.filter((employee) => {
      if (employee.status !== 'active') return false;
      const conflicts = detectRequestConflicts({
        ...draft,
        assignedMachineIds: [],
        assignedEmployeeId: employee.id,
        crewEmployeeIds: []
      }, state.editors.request === 'create' ? '' : state.editors.request);
      return !conflicts.length;
    });
  }

  // ================================
  // Events
  // ================================
  function bindEvents() {
    bindNavigationEvents();
    bindRequestEvents();
    bindClientEvents();
    bindMachineEvents();
    bindEmployeeEvents();
    bindServiceEvents();
    bindZoneEvents();
    bindCalendarEvents();
    bindBookingEvents();
    bindCampaignEvents();
    bindNotificationEvents();
    bindExportImportEvents();
  }

  function bindNavigationEvents() {
    els.navButtons.forEach((button) => {
      button.addEventListener('click', () => {
        setActiveScreen(button.dataset.screen);
        if (els.mainNav) {
          els.mainNav.classList.remove('open');
        }
      });
    });

    if (els.mobileNavToggle && els.mainNav) {
      els.mobileNavToggle.addEventListener('click', () => {
        const next = !els.mainNav.classList.contains('open');
        els.mainNav.classList.toggle('open', next);
        els.mobileNavToggle.setAttribute('aria-expanded', String(next));
      });

      document.addEventListener('click', (event) => {
        if (window.innerWidth > 760) return;
        if (!els.mainNav.classList.contains('open')) return;
        const insideNav = event.target.closest('#mainNav');
        const insideToggle = event.target.closest('#mobileNavToggle');
        if (!insideNav && !insideToggle) {
          els.mainNav.classList.remove('open');
          els.mobileNavToggle.setAttribute('aria-expanded', 'false');
        }
      });
    }

    els.newRequestBtn.addEventListener('click', () => {
      setActiveScreen('requests');
      resetRequestForm();
      renderAll();
      if (els.mainNav) {
        els.mainNav.classList.remove('open');
      }
    });

    if (els.dashboardAddRequestBtn) {
      els.dashboardAddRequestBtn.addEventListener('click', () => {
        setActiveScreen('requests');
        resetRequestForm();
        renderAll();
      });
    }

    if (els.dashboardCreateCampaignBtn) {
      els.dashboardCreateCampaignBtn.addEventListener('click', () => {
        setActiveScreen('campaigns');
      });
    }
  }

  function setActiveScreen(screen) {
    state.ui.activeScreen = screen;
    saveUIState();
    renderNavigation();
  }

  function bindRequestEvents() {
    els.searchInput.addEventListener('input', () => {
      state.ui.request.search = els.searchInput.value;
      saveUIState();
      renderRequests();
    });

    [
      ['statusFilter', 'status'],
      ['settlementFilter', 'settlement'],
      ['workTypeFilter', 'workType'],
      ['sourceFilter', 'source'],
      ['requestSegmentFilter', 'segment'],
      ['periodFilter', 'period'],
      ['sortBySelect', 'sortBy'],
      ['sortDirSelect', 'sortDir']
    ].forEach(([id, key]) => {
      els[id].addEventListener('change', () => {
        state.ui.request[key] = els[id].value;
        saveUIState();
        renderRequests();
      });
    });

    els.tableViewBtn.addEventListener('click', () => {
      state.ui.request.viewMode = 'table';
      saveUIState();
      syncControlsFromState();
    });

    els.cardsViewBtn.addEventListener('click', () => {
      state.ui.request.viewMode = 'cards';
      saveUIState();
      syncControlsFromState();
    });

    els.requestForm.addEventListener('submit', handleRequestSubmit);
    els.resetFormBtn.addEventListener('click', () => {
      resetRequestForm();
      renderAll();
    });

    [
      'serviceInput', 'settlementInput', 'startTimeInput', 'durationHoursInput', 'costInput', 'prepaymentInput',
      'objectDateInput', 'assignedEmployeeInput', 'statusInput', 'sourceInput'
    ].forEach((id) => {
      els[id].addEventListener('change', () => {
        updateRequestDerivedFields();
        updateAssignmentHintsAndConflicts();
      });
    });

    ['assignedMachinesInput', 'crewEmployeesInput'].forEach((id) => {
      els[id].addEventListener('change', () => {
        updateAssignmentHintsAndConflicts();
      });
    });

    els.generatePaymentLinkBtn.addEventListener('click', () => {
      const id = sanitizeString(els.requestIdInput.value) || uid('pay');
      const amount = Math.max(0, normalizeNumber(els.costInput.value));
      const link = `https://pay.local/tractor/${id}?amount=${amount}`;
      els.paymentLinkInput.value = link;
      if (!els.paymentMethodInput.value) els.paymentMethodInput.value = 'link';
    });

    els.markPaidBtn.addEventListener('click', () => {
      const cost = Math.max(0, normalizeNumber(els.costInput.value));
      els.prepaymentInput.value = String(cost);
      els.paymentDateInput.value = toDateOnlyString(new Date());
      if (!els.paymentMethodInput.value) els.paymentMethodInput.value = 'link';
      updateRequestDerivedFields();
    });

    const onRequestAction = (event) => {
      const target = event.target.closest('button[data-action]');
      if (!target) return;
      const action = target.dataset.action;
      const id = target.dataset.id;
      if (!id) return;

      if (action === 'edit-request') {
        const request = state.requests.find((item) => item.id === id);
        if (!request) return;
        setActiveScreen('requests');
        fillRequestForm(request);
      }

      if (action === 'copy-request') {
        const request = state.requests.find((item) => item.id === id);
        if (!request) return;
        const clone = normalizeRequest({
          ...request,
          id: uid('req'),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: 'new'
        });
        state.requests.unshift(clone);
        saveRequests();
        upsertClientFromRequest(clone);
        ensureMarketingTriggers();
        renderAll();
      }

      if (action === 'delete-request') {
        if (!confirm('Удалить заявку?')) return;
        state.requests = state.requests.filter((item) => item.id !== id);
        saveRequests();
        renderAll();
      }
    };

    els.requestsTableBody.addEventListener('click', onRequestAction);
    els.cardsWrap.addEventListener('click', onRequestAction);
  }

  function handleRequestSubmit(event) {
    event.preventDefault();

    const editingId = state.editors.request !== 'create' ? state.editors.request : '';
    const next = buildRequestFromForm(editingId);

    if (!next.clientName || !next.phone) {
      alert('Укажите имя и телефон клиента.');
      return;
    }

    if (!next.objectDate) {
      alert('Укажите дату объекта.');
      return;
    }

    const conflicts = detectRequestConflicts(next, editingId);
    if (conflicts.length && !confirm(`Найдено конфликтов: ${conflicts.length}. Сохранить заявку с риском перегруза?`)) {
      return;
    }

    if (editingId) {
      state.requests = state.requests.map((item) => (item.id === editingId ? next : item));
    } else {
      state.requests.unshift(next);
    }

    saveRequests();
    upsertClientFromRequest(next);
    ensureMarketingTriggers();

    resetRequestForm();
    renderAll();
  }

  function bindClientEvents() {
    els.clientForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const editingId = state.editors.client !== 'create' ? state.editors.client : '';
      const existing = editingId ? getClientById(editingId) : null;

      const payload = normalizeClient({
        ...existing,
        id: editingId || uid('cl'),
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        name: sanitizeString(els.clientFullNameInput.value),
        phone: sanitizeString(els.clientPhoneInput.value),
        source: sanitizeString(els.clientSourceInput.value),
        tags: normalizeTags(els.clientTagsInput.value),
        address: sanitizeString(els.clientAddressInput.value),
        comment: sanitizeString(els.clientCommentInput.value),
        rating: ''
      });

      if (!payload.name || !payload.phone) {
        alert('Укажите имя и телефон клиента.');
        return;
      }

      if (editingId) {
        state.clients = state.clients.map((item) => (item.id === editingId ? payload : item));
      } else {
        state.clients.unshift(payload);
      }

      saveClients();
      resetClientForm();
      renderAll();
    });

    els.resetClientFormBtn.addEventListener('click', () => {
      resetClientForm();
    });

    [
      ['clientSegmentFilter', 'segment'],
      ['clientSourceFilter', 'source'],
      ['clientSettlementFilter', 'settlement'],
      ['clientServiceFilter', 'service']
    ].forEach(([id, key]) => {
      els[id].addEventListener('change', () => {
        state.ui.clients[key] = els[id].value;
        saveUIState();
        renderClients();
      });
    });

    els.clientsTableBody.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-action]');
      if (!button) return;
      const { action, id } = button.dataset;
      if (!id) return;

      if (action === 'client-history') {
        state.ui.clients.selectedClientId = id;
        saveUIState();
        renderClientHistory();
      }

      if (action === 'edit-client') {
        const client = getClientById(id);
        if (!client) return;
        state.editors.client = client.id;
        els.clientFormTitle.textContent = `Редактирование #${client.id}`;
        els.clientIdInput.value = client.id;
        els.clientFullNameInput.value = client.name || '';
        els.clientPhoneInput.value = client.phone || '';
        els.clientSourceInput.value = client.source || '';
        els.clientTagsInput.value = tagsToText(client.tags);
        els.clientAddressInput.value = client.address || '';
        els.clientCommentInput.value = client.comment || '';
      }

      if (action === 'delete-client') {
        if (!confirm('Удалить клиента?')) return;
        state.clients = state.clients.filter((item) => item.id !== id);
        if (state.ui.clients.selectedClientId === id) state.ui.clients.selectedClientId = '';
        saveClients();
        saveUIState();
        renderClients();
      }
    });
  }

  function bindMachineEvents() {
    els.machineForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const editingId = state.editors.machine !== 'create' ? state.editors.machine : '';
      const payload = normalizeMachine({
        id: editingId || uid('mach'),
        name: sanitizeString(els.machineNameInput.value),
        machineType: sanitizeString(els.machineTypeInput.value),
        internalNumber: sanitizeString(els.machineInternalInput.value),
        plate: sanitizeString(els.machinePlateInput.value),
        status: sanitizeString(els.machineStatusInput.value),
        baseRateHour: normalizeNumber(els.machineRateInput.value),
        minCallOut: normalizeNumber(els.machineMinCallInput.value),
        defaultEmployeeId: sanitizeString(els.machineDefaultEmployeeInput.value),
        zones: normalizeTags(els.machineZonesInput.value),
        comment: sanitizeString(els.machineCommentInput.value),
        isActive: els.machineActiveInput.checked
      });

      if (!payload.name) {
        alert('Введите название техники.');
        return;
      }

      if (editingId) {
        state.machines = state.machines.map((item) => (item.id === editingId ? payload : item));
      } else {
        state.machines.unshift(payload);
      }

      saveMachines();
      resetMachineForm();
      renderAll();
    });

    els.resetMachineFormBtn.addEventListener('click', resetMachineForm);

    els.machinesTableBody.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-action]');
      if (!button) return;
      const { action, id } = button.dataset;
      if (!id) return;

      if (action === 'edit-machine') {
        const machine = getMachineById(id);
        if (!machine) return;
        state.editors.machine = id;
        els.machineFormTitle.textContent = `Редактирование #${machine.id}`;
        els.machineIdInput.value = machine.id;
        els.machineNameInput.value = machine.name;
        els.machineTypeInput.value = machine.machineType;
        els.machineInternalInput.value = machine.internalNumber || '';
        els.machinePlateInput.value = machine.plate || '';
        els.machineStatusInput.value = machine.status;
        els.machineRateInput.value = machine.baseRateHour || 0;
        els.machineMinCallInput.value = machine.minCallOut || 0;
        els.machineDefaultEmployeeInput.value = machine.defaultEmployeeId || '';
        els.machineZonesInput.value = tagsToText(machine.zones);
        els.machineCommentInput.value = machine.comment || '';
        els.machineActiveInput.checked = machine.isActive;
      }

      if (action === 'delete-machine') {
        if (!confirm('Удалить технику?')) return;
        state.machines = state.machines.filter((item) => item.id !== id);
        state.requests = state.requests.map((request) => normalizeRequest({
          ...request,
          assignedMachineIds: request.assignedMachineIds.filter((machineId) => machineId !== id)
        }));
        saveMachines();
        saveRequests();
        renderAll();
      }
    });
  }

  function bindEmployeeEvents() {
    els.employeeForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const editingId = state.editors.employee !== 'create' ? state.editors.employee : '';
      const payload = normalizeEmployee({
        id: editingId || uid('emp'),
        fullName: sanitizeString(els.employeeNameInput.value),
        phone: sanitizeString(els.employeePhoneInput.value),
        role: sanitizeString(els.employeeRoleInput.value),
        machineTypes: normalizeTags(els.employeeMachineTypesInput.value),
        workSchedule: sanitizeString(els.employeeScheduleInput.value),
        daysOff: sanitizeString(els.employeeDaysOffInput.value),
        rate: normalizeNumber(els.employeeRateInput.value),
        status: sanitizeString(els.employeeStatusInput.value),
        comment: sanitizeString(els.employeeCommentInput.value)
      });

      if (!payload.fullName || !payload.phone) {
        alert('Введите ФИО и телефон сотрудника.');
        return;
      }

      if (editingId) {
        state.employees = state.employees.map((item) => (item.id === editingId ? payload : item));
      } else {
        state.employees.unshift(payload);
      }

      saveEmployees();
      resetEmployeeForm();
      renderAll();
    });

    els.resetEmployeeFormBtn.addEventListener('click', resetEmployeeForm);

    els.employeesTableBody.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-action]');
      if (!button) return;
      const { action, id } = button.dataset;
      if (!id) return;

      if (action === 'edit-employee') {
        const employee = getEmployeeById(id);
        if (!employee) return;
        state.editors.employee = id;
        els.employeeFormTitle.textContent = `Редактирование #${employee.id}`;
        els.employeeIdInput.value = employee.id;
        els.employeeNameInput.value = employee.fullName;
        els.employeePhoneInput.value = employee.phone;
        els.employeeRoleInput.value = employee.role || '';
        els.employeeMachineTypesInput.value = tagsToText(employee.machineTypes);
        els.employeeScheduleInput.value = employee.workSchedule || '';
        els.employeeDaysOffInput.value = employee.daysOff || '';
        els.employeeRateInput.value = employee.rate || 0;
        els.employeeStatusInput.value = employee.status;
        els.employeeCommentInput.value = employee.comment || '';
      }

      if (action === 'delete-employee') {
        if (!confirm('Удалить сотрудника?')) return;
        state.employees = state.employees.filter((item) => item.id !== id);
        state.requests = state.requests.map((request) => normalizeRequest({
          ...request,
          assignedEmployeeId: request.assignedEmployeeId === id ? '' : request.assignedEmployeeId,
          crewEmployeeIds: request.crewEmployeeIds.filter((employeeId) => employeeId !== id)
        }));
        saveEmployees();
        saveRequests();
        renderAll();
      }
    });
  }

  function bindServiceEvents() {
    els.serviceForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const editingId = state.editors.service !== 'create' ? state.editors.service : '';
      const payload = normalizeService({
        id: editingId || uid('svc'),
        name: sanitizeString(els.serviceNameInput.value),
        recommendedMachineType: sanitizeString(els.serviceMachineTypeInput.value),
        minPrice: normalizeNumber(els.serviceMinPriceInput.value),
        minHours: normalizeNumber(els.serviceMinHoursInput.value),
        seasonality: sanitizeString(els.serviceSeasonalityInput.value),
        needsAdditionalMachine: els.serviceExtraMachineInput.checked,
        relatedServices: normalizeTags(els.serviceRelatedInput.value),
        description: sanitizeString(els.serviceDescriptionInput.value)
      });

      if (!payload.name) {
        alert('Введите название услуги.');
        return;
      }

      if (editingId) {
        state.services = state.services.map((item) => (item.id === editingId ? payload : item));
      } else {
        state.services.unshift(payload);
      }

      saveServices();
      resetServiceForm();
      renderAll();
    });

    els.resetServiceFormBtn.addEventListener('click', resetServiceForm);

    els.servicesTableBody.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-action]');
      if (!button) return;
      const { action, id } = button.dataset;
      if (!id) return;

      if (action === 'edit-service') {
        const service = getServiceById(id);
        if (!service) return;
        state.editors.service = id;
        els.serviceFormTitle.textContent = `Редактирование #${service.id}`;
        els.serviceIdInput.value = service.id;
        els.serviceNameInput.value = service.name;
        els.serviceMachineTypeInput.value = service.recommendedMachineType || '';
        els.serviceMinPriceInput.value = service.minPrice || 0;
        els.serviceMinHoursInput.value = service.minHours || 0;
        els.serviceSeasonalityInput.value = service.seasonality || '';
        els.serviceExtraMachineInput.checked = service.needsAdditionalMachine;
        els.serviceRelatedInput.value = tagsToText(service.relatedServices);
        els.serviceDescriptionInput.value = service.description || '';
      }

      if (action === 'delete-service') {
        if (!confirm('Удалить услугу?')) return;
        state.services = state.services.filter((item) => item.id !== id);
        state.requests = state.requests.map((request) => normalizeRequest({
          ...request,
          serviceId: request.serviceId === id ? '' : request.serviceId
        }));
        saveServices();
        saveRequests();
        renderAll();
      }
    });
  }

  function bindZoneEvents() {
    els.zoneForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const editingId = state.editors.zone !== 'create' ? state.editors.zone : '';
      const payload = normalizeZone({
        id: editingId || uid('zone'),
        name: sanitizeString(els.zoneNameInput.value),
        markup: normalizeNumber(els.zoneMarkupInput.value),
        isActive: els.zoneActiveInput.checked,
        onlineEnabled: els.zoneOnlineInput.checked,
        comment: sanitizeString(els.zoneCommentInput.value)
      });

      if (!payload.name) {
        alert('Введите название зоны.');
        return;
      }

      if (editingId) {
        state.zones = state.zones.map((item) => (item.id === editingId ? payload : item));
      } else {
        state.zones.unshift(payload);
      }

      saveZones();
      resetZoneForm();
      renderAll();
    });

    els.resetZoneFormBtn.addEventListener('click', resetZoneForm);

    els.zonesTableBody.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-action]');
      if (!button) return;
      const { action, id } = button.dataset;
      if (!id) return;

      if (action === 'edit-zone') {
        const zone = getZoneById(id);
        if (!zone) return;
        state.editors.zone = id;
        els.zoneFormTitle.textContent = `Редактирование #${zone.id}`;
        els.zoneIdInput.value = zone.id;
        els.zoneNameInput.value = zone.name;
        els.zoneMarkupInput.value = zone.markup || 0;
        els.zoneActiveInput.checked = zone.isActive;
        els.zoneOnlineInput.checked = zone.onlineEnabled;
        els.zoneCommentInput.value = zone.comment || '';
      }

      if (action === 'delete-zone') {
        if (!confirm('Удалить зону?')) return;
        const zone = getZoneById(id);
        state.zones = state.zones.filter((item) => item.id !== id);
        state.requests = state.requests.map((request) => {
          if (request.zoneId !== id) return request;
          return normalizeRequest({
            ...request,
            zoneId: '',
            settlement: request.settlement || zone?.name || ''
          });
        });
        saveZones();
        saveRequests();
        renderAll();
      }
    });
  }

  function bindCalendarEvents() {
    els.calendarDateInput.addEventListener('change', () => {
      state.ui.calendar.focusDate = els.calendarDateInput.value || toDateOnlyString(new Date());
      saveUIState();
      renderCalendar();
    });

    els.calendarRangeInput.addEventListener('change', () => {
      state.ui.calendar.range = els.calendarRangeInput.value;
      saveUIState();
      renderCalendar();
    });

    els.calendarModeInput.addEventListener('change', () => {
      state.ui.calendar.mode = els.calendarModeInput.value;
      saveUIState();
      renderCalendar();
    });
  }

  function bindBookingEvents() {
    ['bookingServiceInput', 'bookingZoneInput', 'bookingDateInput', 'bookingSlotInput'].forEach((id) => {
      els[id].addEventListener('change', updateBookingPreview);
    });

    ['bookingStreetInput', 'bookingHouseInput'].forEach((id) => {
      els[id].addEventListener('input', updateBookingPreview);
    });

    if (els.bookingCalendarMini) {
      els.bookingCalendarMini.addEventListener('click', (event) => {
        const target = event.target.closest('button[data-booking-date]');
        if (!target || target.disabled) return;
        const date = sanitizeString(target.dataset.bookingDate);
        if (!date) return;
        els.bookingDateInput.value = date;
        updateBookingPreview();
      });
    }

    els.bookingForm.addEventListener('submit', (event) => {
      event.preventDefault();

      const serviceId = sanitizeString(els.bookingServiceInput.value);
      const zoneId = sanitizeString(els.bookingZoneInput.value);
      const zone = getZoneById(zoneId);
      const date = sanitizeString(els.bookingDateInput.value);
      const slot = sanitizeString(els.bookingSlotInput.value);

      if (!serviceId || !zoneId || !date || !slot) {
        alert('Заполните обязательные поля формы бронирования.');
        return;
      }

      const availability = getBookingAvailability(date, slot, zoneId);
      if (availability.state === 'unavailable') {
        alert(`Невозможно забронировать: ${availability.text}`);
        return;
      }

      const slotParts = parseSlot(slot);
      const estimate = calculateRequestEstimate(serviceId, zoneId);
      const service = getServiceById(serviceId);

      const request = normalizeRequest({
        id: uid('req'),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        clientName: sanitizeString(els.bookingNameInput.value),
        phone: sanitizeString(els.bookingPhoneInput.value),
        source: 'online_booking',
        tags: ['online'],
        zoneId,
        settlement: zone ? zone.name : '',
        street: sanitizeString(els.bookingStreetInput.value),
        house: sanitizeString(els.bookingHouseInput.value),
        address: [zone?.name || '', sanitizeString(els.bookingStreetInput.value), sanitizeString(els.bookingHouseInput.value)].filter(Boolean).join(', '),
        serviceId,
        workType: service ? service.name : '',
        objectDate: date,
        startTime: slotParts.start,
        endTime: slotParts.end,
        durationHours: Math.max(0.5, (timeToMinutes(slotParts.end) - timeToMinutes(slotParts.start)) / 60),
        desiredTime: slot,
        status: 'new',
        cost: estimate.total,
        prepayment: 0,
        paymentMethod: '',
        paymentStatus: 'unpaid',
        paymentLink: '',
        paymentDate: '',
        assignedMachineIds: [],
        assignedEmployeeId: '',
        crewEmployeeIds: [],
        dispatcherNote: 'Новая заявка из клиентского окна бронирования.',
        comment: sanitizeString(els.bookingCommentInput.value),
        internalComment: 'Онлайн-бронирование',
        onlineBooking: true
      });

      if (!request.clientName || !request.phone) {
        alert('Укажите имя и телефон.');
        return;
      }

      state.requests.unshift(request);
      saveRequests();
      upsertClientFromRequest(request);
      ensureMarketingTriggers();
      renderAll();

      els.bookingForm.reset();
      updateBookingPreview();
      alert('Заявка отправлена. Диспетчер свяжется с клиентом.');
    });
  }

  function bindCampaignEvents() {
    [
      ['campaignSegmentInput', 'segment'],
      ['campaignSourceInput', 'source'],
      ['campaignSettlementInput', 'settlement'],
      ['campaignServiceInput', 'service']
    ].forEach(([id, key]) => {
      els[id].addEventListener('change', () => {
        state.ui.campaigns[key] = els[id].value;
        saveUIState();
        renderCampaigns();
      });
    });

    els.campaignTemplateInput.addEventListener('change', () => {
      const template = CAMPAIGN_TEMPLATES.find((item) => item.id === els.campaignTemplateInput.value);
      state.ui.campaigns.templateId = els.campaignTemplateInput.value;
      if (template) {
        state.ui.campaigns.message = template.text;
        els.campaignMessageInput.value = template.text;
      }
      saveUIState();
      renderCampaigns();
    });

    els.campaignMessageInput.addEventListener('input', () => {
      state.ui.campaigns.message = els.campaignMessageInput.value;
      saveUIState();
    });

    els.campaignPreviewBtn.addEventListener('click', () => {
      state.ui.campaigns.message = els.campaignMessageInput.value;
      saveUIState();
      renderCampaigns();
    });

    els.campaignCopyPhonesBtn.addEventListener('click', async () => {
      const recipients = getCampaignRecipients();
      const phones = uniqueValues(recipients.map((item) => item.client.phone));
      if (!phones.length) {
        alert('Нет телефонов для копирования.');
        return;
      }
      await copyTextToClipboard(phones.join(', '));
      alert(`Скопировано телефонов: ${phones.length}`);
    });

    els.campaignExportCsvBtn.addEventListener('click', () => {
      const recipients = getCampaignRecipients();
      const header = ['Имя', 'Телефон', 'Поселок', 'Заявок', 'Сумма', 'Долг'];
      const rows = recipients.map(({ client, aggregate }) => {
        const settlement = aggregate ? [...aggregate.settlements][0] || '' : '';
        return [client.name, client.phone, settlement, aggregate?.requestsCount || 0, aggregate?.totalRevenue || 0, aggregate?.totalBalance || 0];
      });
      const csv = [header, ...rows].map((row) => row.map(csvEscape).join(';')).join('\n');
      downloadFile(`campaign_recipients_${toDateOnlyString(new Date())}.csv`, csv, 'text/csv;charset=utf-8');
    });

    els.campaignPrepareChannelBtn.addEventListener('click', async () => {
      const recipients = getCampaignRecipients();
      if (!recipients.length) {
        alert('Нет получателей для подготовки текста.');
        return;
      }

      const lines = recipients.map(({ client, aggregate }) => {
        const text = personalizeCampaignMessage(state.ui.campaigns.message, client, aggregate);
        return `${client.phone}: ${text}`;
      });

      await copyTextToClipboard(lines.join('\n'));
      alert('Текст для WhatsApp/Telegram/SMS подготовлен и скопирован.');
    });
  }

  function bindNotificationEvents() {
    els.notifyPermissionBtn.addEventListener('click', requestNotificationPermission);

    els.clearNoticesBtn.addEventListener('click', () => {
      state.inAppNotifications = [];
      saveInAppNotifications();
      renderInAppNotifications();
    });

    els.marketingTasksList.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-action="task-done"]');
      if (!button) return;
      const id = button.dataset.id;
      state.marketingTasks = state.marketingTasks.map((task) => (task.id === id ? { ...task, status: 'done' } : task));
      saveMarketingTasks();
      renderMarketingTasks();
    });
  }

  async function requestNotificationPermission() {
    if (!('Notification' in window)) {
      alert('Браузер не поддерживает уведомления.');
      return;
    }

    const result = await Notification.requestPermission();
    updateNotificationControls();
    if (result === 'granted') {
      alert('Уведомления разрешены.');
    } else {
      alert('Уведомления не разрешены.');
    }
  }

  function runReminderScan() {
    const today = startOfDay(new Date());
    let changed = false;

    state.requests.forEach((request) => {
      if (!request.objectDate) return;
      if (request.status === 'completed' || request.status === 'canceled') return;

      const date = parseDateOnly(request.objectDate);
      if (!date) return;

      const diff = daysBetween(today, date);
      if (diff !== 7) return;

      const key = `reminder_7d_${request.id}_${request.objectDate}`;
      if (state.sentNotificationKeys.has(key)) return;

      const message = `Через 7 дней объект: ${request.clientName || 'клиент'} (${formatDate(request.objectDate)} ${getRequestServiceName(request)})`;
      state.sentNotificationKeys.add(key);
      changed = true;

      state.inAppNotifications.unshift({
        key,
        message,
        createdAt: new Date().toLocaleString('ru-RU')
      });

      if (state.inAppNotifications.length > 30) {
        state.inAppNotifications = state.inAppNotifications.slice(0, 30);
      }

      if ('Notification' in window && Notification.permission === 'granted' && document.visibilityState === 'visible') {
        try {
          new Notification('CRM: напоминание за 7 дней', { body: message });
        } catch {
          // no-op
        }
      }
    });

    if (changed) {
      saveSentNotificationKeys();
      saveInAppNotifications();
      renderInAppNotifications();
    }
  }

  function bindExportImportEvents() {
    els.exportPhonesBtn.addEventListener('click', exportPhonesCsv);
    els.exportCallListBtn.addEventListener('click', exportCallListCsv);
    els.exportFullCsvBtn.addEventListener('click', exportFullCsv);
    els.exportJsonBtn.addEventListener('click', exportJsonBackup);

    els.importJsonBtn.addEventListener('click', () => {
      els.jsonFileInput.value = '';
      els.jsonFileInput.click();
    });

    els.jsonFileInput.addEventListener('change', handleJsonImport);

    if (els.syncRemoteBtn) {
      els.syncRemoteBtn.addEventListener('click', () => {
        syncRequestsFromRemote({ manual: true });
      });
    }

    if (els.setRemoteApiBtn) {
      els.setRemoteApiBtn.addEventListener('click', () => {
        const nextUrl = prompt('URL интеграционного backend (пример: http://localhost:8787)', state.remote.apiBaseUrl || 'http://localhost:8787');
        if (nextUrl === null) return;

        const normalizedUrl = normalizeApiBaseUrl(nextUrl);
        if (!normalizedUrl) {
          alert('Некорректный URL endpoint.');
          return;
        }

        state.remote.apiBaseUrl = normalizedUrl;

        const nextToken = prompt('Read token для GET /api/requests (опционально, можно оставить пустым)', state.remote.readToken || '');
        if (nextToken !== null) {
          state.remote.readToken = sanitizeString(nextToken);
        }

        state.remote.lastError = '';
        saveRemoteState();
        renderRemoteSyncStatus();
        startRemoteSyncLoop();
      });
    }
  }

  function exportPhonesCsv() {
    const list = getFilteredRequests();
    const phones = uniqueValues(list.map((request) => request.phone));
    const csv = ['Телефон', ...phones].map((value) => csvEscape(value)).join('\n');
    downloadFile(`phones_${toDateOnlyString(new Date())}.csv`, csv, 'text/csv;charset=utf-8');
  }

  function exportCallListCsv() {
    const list = getFilteredRequests();
    const header = ['Имя', 'Телефон', 'Поселок', 'Услуга', 'Дата', 'Статус'];
    const rows = list.map((request) => [
      request.clientName,
      request.phone,
      settlementLabelFromRequest(request),
      getRequestServiceName(request),
      request.objectDate,
      getStatusLabel(getEffectiveRequestStatus(request))
    ]);

    const csv = [header, ...rows].map((row) => row.map(csvEscape).join(';')).join('\n');
    downloadFile(`call_list_${toDateOnlyString(new Date())}.csv`, csv, 'text/csv;charset=utf-8');
  }

  function exportFullCsv() {
    const header = [
      'ID', 'Создана', 'Клиент', 'Телефон', 'Источник', 'Канал', 'Источник страницы', 'Landing ID', 'Booking Origin', 'Created From', 'Метки',
      'UTM Source', 'UTM Medium', 'UTM Campaign', 'UTM Content', 'UTM Term', 'Referrer',
      'Зона', 'Улица', 'Дом', 'Адрес',
      'Услуга', 'Вид работ', 'Дата объекта', 'Начало', 'Окончание', 'Длительность',
      'Статус', 'Стоимость', 'Предоплата', 'Остаток', 'Статус оплаты', 'Способ оплаты', 'Ссылка оплаты', 'Дата оплаты',
      'Назначенный сотрудник', 'Назначенная техника', 'Экипаж',
      'Комментарий', 'Внутренний комментарий', 'Примечание диспетчера', 'Онлайн-бронирование'
    ];

    const rows = state.requests.map((request) => [
      request.id,
      request.createdAt,
      request.clientName,
      request.phone,
      sourceLabel(request.source),
      request.channel || '',
      request.sourcePage || '',
      request.landingId || '',
      request.bookingOrigin || '',
      request.createdFrom || '',
      tagsToText(request.tags),
      request.utmSource || '',
      request.utmMedium || '',
      request.utmCampaign || '',
      request.utmContent || '',
      request.utmTerm || '',
      request.referrer || '',
      settlementLabelFromRequest(request),
      request.street,
      request.house,
      request.address,
      getRequestServiceName(request),
      request.workType,
      request.objectDate,
      request.startTime,
      request.endTime,
      request.durationHours,
      getStatusLabel(getEffectiveRequestStatus(request)),
      request.cost,
      request.prepayment,
      request.balance,
      getPaymentStatusLabel(request.paymentStatus),
      request.paymentMethod,
      request.paymentLink,
      request.paymentDate,
      getEmployeeName(request.assignedEmployeeId),
      getMachineNames(request.assignedMachineIds).join(', '),
      getCrewNames(request.crewEmployeeIds).join(', '),
      request.comment,
      request.internalComment,
      request.dispatcherNote,
      request.onlineBooking ? 'Да' : 'Нет'
    ]);

    const csv = [header, ...rows].map((row) => row.map(csvEscape).join(';')).join('\n');
    downloadFile(`crm_full_${toDateOnlyString(new Date())}.csv`, csv, 'text/csv;charset=utf-8');
  }

  function exportJsonBackup() {
    const payload = {
      version: 4,
      exportedAt: new Date().toISOString(),
      data: {
        requests: state.requests,
        clients: state.clients,
        machines: state.machines,
        employees: state.employees,
        services: state.services,
        zones: state.zones,
        marketingTasks: state.marketingTasks,
        uiState: state.ui,
        remoteState: state.remote,
        notifications: {
          sentKeys: [...state.sentNotificationKeys],
          inApp: state.inAppNotifications
        }
      }
    };

    const content = JSON.stringify(payload, null, 2);
    downloadFile(`crm_backup_${toDateOnlyString(new Date())}.json`, content, 'application/json;charset=utf-8');
  }

  function handleJsonImport(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || '{}'));
        const data = parsed.data && typeof parsed.data === 'object' ? parsed.data : parsed;

        state.requests = Array.isArray(data.requests) ? data.requests.map(normalizeRequest) : [];
        state.clients = Array.isArray(data.clients) ? data.clients.map(normalizeClient) : [];
        state.machines = Array.isArray(data.machines) ? data.machines.map(normalizeMachine) : [];
        state.employees = Array.isArray(data.employees) ? data.employees.map(normalizeEmployee) : [];
        state.services = Array.isArray(data.services) ? data.services.map(normalizeService) : [];
        state.zones = Array.isArray(data.zones) ? data.zones.map(normalizeZone) : [];
        state.marketingTasks = Array.isArray(data.marketingTasks) ? data.marketingTasks.map(normalizeMarketingTask) : [];

        if (data.uiState && typeof data.uiState === 'object') {
          state.ui = normalizeUIState(data.uiState);
        }
        if (data.remoteState && typeof data.remoteState === 'object') {
          state.remote = normalizeRemoteState(data.remoteState);
        }

        const notifications = data.notifications || {};
        if (Array.isArray(notifications.sentKeys)) {
          state.sentNotificationKeys = new Set(notifications.sentKeys.map((item) => String(item)));
        }
        if (Array.isArray(notifications.inApp)) {
          state.inAppNotifications = notifications.inApp.slice(0, 30);
        }

        migrateLegacyDataIfNeeded();
        ensureMarketingTriggers();

        saveRequests();
        saveClients();
        saveMachines();
        saveEmployees();
        saveServices();
        saveZones();
        saveMarketingTasks();
        saveUIState();
        saveSentNotificationKeys();
        saveInAppNotifications();
        saveRemoteState();
        startRemoteSyncLoop();

        resetAllForms();
        renderAll();

        alert('Импорт завершен успешно.');
      } catch {
        alert('Не удалось импортировать файл. Проверьте формат JSON.');
      }
    };
    reader.readAsText(file, 'utf-8');
  }

  // ================================
  // Legacy storage fallback
  // ================================
  function loadLegacyArrayIfNeeded(key) {
    const legacyMap = {
      [STORAGE_KEYS.requests]: ['tractor_crm_requests'],
      [STORAGE_KEYS.clients]: ['tractor_crm_clients'],
      [STORAGE_KEYS.ui]: ['tractor_crm_ui_state'],
      [STORAGE_KEYS.sentNotifications]: ['tractor_crm_sent_notifications'],
      [STORAGE_KEYS.inAppNotifications]: ['tractor_crm_in_app_notifications']
    };

    const aliases = legacyMap[key] || [];
    for (const alias of aliases) {
      const parsed = safeParseJson(localStorage.getItem(alias), null);
      if (Array.isArray(parsed)) return parsed;
      if (parsed && typeof parsed === 'object') return parsed;
    }
    return null;
  }

  // Override loader with legacy fallback support.
  function loadArray(key) {
    const parsed = safeParseJson(localStorage.getItem(key), null);
    if (Array.isArray(parsed)) return parsed;

    const fallback = loadLegacyArrayIfNeeded(key);
    if (Array.isArray(fallback)) return fallback;

    return [];
  }

})();






















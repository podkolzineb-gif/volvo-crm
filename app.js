(() => {
  'use strict';

  const STORAGE_KEYS = {
    jobs: 'mini_crm_jobs_v2',
    legacyJobs: 'mini_crm_requests_v1',
    clients: 'mini_crm_clients_v1',
    expenses: 'mini_crm_expenses_v1',
    historicalEntries: 'mini_crm_historical_entries_v1',
    appSettings: 'mini_crm_app_settings_v1',
    serviceSettings: 'mini_crm_service_settings_v1',
    fuel: 'mini_crm_fuel_cache_v1',
    ui: 'mini_crm_ui_state_v1'
  };

  const DEFAULT_FUEL_CONSUMPTION_PER_HOUR = 10;
  const DEFAULT_FUEL_PRICE = 56;
  const DEFAULT_OPERATOR_RATE = 1000;
  const DEFAULT_SERVICE_SETTINGS = {
    serviceIntervalHours: 250,
    lastServiceHours: 0,
    currentMachineHours: 0
  };

  const STATUSES = {
    planned: 'planned',
    completed: 'completed'
  };

  const OPERATOR_PAY_MODES = {
    auto: 'auto',
    manual: 'manual'
  };

  const EXPENSE_CATEGORIES = ['repair', 'parts', 'fuel', 'operator', 'other'];
  const HISTORICAL_SOURCE = 'paper_ledger';
  const EXPENSE_CATEGORY_LABELS = {
    all: 'Все',
    repair: 'Ремонт',
    parts: 'Запчасти',
    fuel: 'Топливо',
    operator: 'Машинист',
    other: 'Прочее'
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
    jobs: [],
    expenses: [],
    historicalEntries: [],
    clients: [],
    appSettings: loadAppSettings(),
    serviceSettings: null,
    ui: loadUiState(),
    currentView: 'main',
    selectedJobId: null,
    jobEditingId: null,
    expenseEditingId: null,
    historicalEditingId: null
  };

  state.jobs = loadJobs(getCurrentFuelPriceNumber());
  state.expenses = loadExpenses();
  state.historicalEntries = loadHistoricalEntries();
  state.clients = deriveClients(state.jobs);
  state.serviceSettings = loadServiceSettings(state.jobs);

  const els = {
    navButtons: Array.from(document.querySelectorAll('.bottom-nav-btn')),
    sections: Array.from(document.querySelectorAll('.section')),
    mobileApp: document.querySelector('.mobile-app'),

    jobForm: document.getElementById('jobForm'),
    jobFormMessage: document.getElementById('jobFormMessage'),
    operatorPayMode: document.getElementById('operatorPayMode'),
    operatorPayWrap: document.getElementById('operatorPayWrap'),
    jobSubmitBtn: document.getElementById('jobSubmitBtn'),
    cancelJobEditBtn: document.getElementById('cancelJobEditBtn'),

    previewFuelCost: document.getElementById('previewFuelCost'),
    previewOperatorPay: document.getElementById('previewOperatorPay'),
    previewNetProfit: document.getElementById('previewNetProfit'),

    historyRangeFilters: Array.from(document.querySelectorAll('#historyRangeFilters .filter-btn')),
    historyPaymentFilters: Array.from(document.querySelectorAll('#historyPaymentFilters .filter-btn')),
    historyTableBody: document.getElementById('historyTableBody'),
    exportHistoryCsvBtn: document.getElementById('exportHistoryCsvBtn'),
    historyMessage: document.getElementById('historyMessage'),


    historicalForm: document.getElementById('historicalForm'),
    historicalFormMessage: document.getElementById('historicalFormMessage'),
    cancelHistoricalEditBtn: document.getElementById('cancelHistoricalEditBtn'),
    historicalTableBody: document.getElementById('historicalTableBody'),
    exportHistoricalCsvBtn: document.getElementById('exportHistoricalCsvBtn'),
    historicalMessage: document.getElementById('historicalMessage'),

    expenseForm: document.getElementById('expenseForm'),
    expenseRelatedJobId: document.getElementById('expenseRelatedJobId'),
    expenseFormMessage: document.getElementById('expenseFormMessage'),
    cancelExpenseEditBtn: document.getElementById('cancelExpenseEditBtn'),

    expenseRangeFilters: Array.from(document.querySelectorAll('#expenseRangeFilters .filter-btn')),
    expenseCategoryFilters: Array.from(document.querySelectorAll('#expenseCategoryFilters .filter-btn')),
    expensesTableBody: document.getElementById('expensesTableBody'),
    exportExpensesCsvBtn: document.getElementById('exportExpensesCsvBtn'),
    expensesMessage: document.getElementById('expensesMessage'),

    clientsList: document.getElementById('clientsList'),
    exportClientsCsvBtn: document.getElementById('exportClientsCsvBtn'),
    clientsMessage: document.getElementById('clientsMessage'),

    nextJob: document.getElementById('nextJob'),
    futureJobsList: document.getElementById('futureJobsList'),
    archiveJobsTableBody: document.getElementById('archiveJobsTableBody'),

    todayHoursCard: document.getElementById('todayHoursCard'),
    todayRevenueCard: document.getElementById('todayRevenueCard'),
    todayExpensesCard: document.getElementById('todayExpensesCard'),
    todayNetCard: document.getElementById('todayNetCard'),
    debtCard: document.getElementById('debtCard'),

    serviceAlertPanel: document.getElementById('serviceAlertPanel'),
    serviceAlertTitle: document.getElementById('serviceAlertTitle'),
    serviceCurrentHours: document.getElementById('serviceCurrentHours'),
    serviceLastHours: document.getElementById('serviceLastHours'),
    servicePassedHours: document.getElementById('servicePassedHours'),
    serviceRemainingHours: document.getElementById('serviceRemainingHours'),
    markServiceBtn: document.getElementById('markServiceBtn'),


    lifetimeRevenueCard: document.getElementById('lifetimeRevenueCard'),
    lifetimeHoursCard: document.getElementById('lifetimeHoursCard'),
    liveRevenueCard: document.getElementById('liveRevenueCard'),
    archiveRevenueCard: document.getElementById('archiveRevenueCard'),
    liveHoursCard: document.getElementById('liveHoursCard'),
    archiveHoursCard: document.getElementById('archiveHoursCard'),

    todayFuelCost: document.getElementById('todayFuelCost'),
    todayOperatorCost: document.getElementById('todayOperatorCost'),
    monthRepairParts: document.getElementById('monthRepairParts'),

    monthIncome: document.getElementById('monthIncome'),
    monthFuel: document.getElementById('monthFuel'),
    monthOperator: document.getElementById('monthOperator'),
    monthRepair: document.getElementById('monthRepair'),
    monthParts: document.getElementById('monthParts'),
    monthOther: document.getElementById('monthOther'),
    monthNet: document.getElementById('monthNet'),

    downloadBackupBtn: document.getElementById('downloadBackupBtn'),
    openRestoreDialogBtn: document.getElementById('openRestoreDialogBtn'),
    restoreBackupInput: document.getElementById('restoreBackupInput'),
    backupMessage: document.getElementById('backupMessage'),

    jobDetailsBackBtn: document.getElementById('jobDetailsBackBtn'),
    jobDetailsContent: document.getElementById('jobDetailsContent'),
    jobDetailsEditBtn: document.getElementById('jobDetailsEditBtn'),
    jobDetailsDeleteBtn: document.getElementById('jobDetailsDeleteBtn'),
    jobDetailsPaidBtn: document.getElementById('jobDetailsPaidBtn'),
    jobDetailsCompleteBtn: document.getElementById('jobDetailsCompleteBtn'),
    jobDetailsMessage: document.getElementById('jobDetailsMessage'),

    refreshFuelBtn: document.getElementById('refreshFuelBtn'),
    fuelPrice: document.getElementById('fuelPrice'),
    fuelMeta: document.getElementById('fuelMeta')
  };

  init();

  function init() {
    bindEvents();
    setDefaultDates();
    syncUiFilters();
    applyUiStateSection();
    syncDerivedJobFields();
    persistAppSettings();
    persistServiceSettings();
    renderAll();
    refreshFuelPrice(false);
  }

  function bindEvents() {
    els.navButtons.forEach((button) => {
      button.addEventListener('click', () => switchSection(button.dataset.section));
    });

    els.jobForm.addEventListener('submit', handleJobSubmit);
    els.jobForm.addEventListener('input', renderJobPreview);
    els.cancelJobEditBtn.addEventListener('click', cancelJobEdit);
    els.operatorPayMode.addEventListener('change', () => {
      toggleOperatorManualInput();
      renderJobPreview();
    });

    els.historyRangeFilters.forEach((button) => {
      button.addEventListener('click', () => setHistoryRange(button.dataset.range));
    });
    els.historyPaymentFilters.forEach((button) => {
      button.addEventListener('click', () => setHistoryPaymentFilter(button.dataset.payment));
    });
    els.exportHistoryCsvBtn.addEventListener('click', handleExportHistoryCsv);
    els.historyTableBody.addEventListener('click', handleHistoryClick);

    els.historicalForm.addEventListener('submit', handleHistoricalSubmit);
    els.cancelHistoricalEditBtn.addEventListener('click', cancelHistoricalEdit);
    els.historicalTableBody.addEventListener('click', handleHistoricalTableClick);
    els.exportHistoricalCsvBtn.addEventListener('click', handleExportHistoricalCsv);

    els.expenseForm.addEventListener('submit', handleExpenseSubmit);
    els.cancelExpenseEditBtn.addEventListener('click', cancelExpenseEdit);

    els.expenseRangeFilters.forEach((button) => {
      button.addEventListener('click', () => setExpenseRange(button.dataset.range));
    });
    els.expenseCategoryFilters.forEach((button) => {
      button.addEventListener('click', () => setExpenseCategory(button.dataset.category));
    });

    els.expensesTableBody.addEventListener('click', handleExpenseTableClick);
    els.exportExpensesCsvBtn.addEventListener('click', handleExportExpensesCsv);

    els.exportClientsCsvBtn.addEventListener('click', handleExportClientsCsv);

    els.nextJob.addEventListener('click', handleNextJobClick);
    els.futureJobsList.addEventListener('click', handleFutureJobsClick);
    els.archiveJobsTableBody.addEventListener('click', handleArchiveJobsClick);

    els.jobDetailsBackBtn.addEventListener('click', closeJobDetails);
    els.jobDetailsEditBtn.addEventListener('click', handleEditJobFromDetails);
    els.jobDetailsDeleteBtn.addEventListener('click', handleDeleteJobFromDetails);
    els.jobDetailsPaidBtn.addEventListener('click', handleTogglePaidFromDetails);
    els.jobDetailsCompleteBtn.addEventListener('click', handleCompleteJobFromDetails);

    els.markServiceBtn.addEventListener('click', handleMarkService);
    els.downloadBackupBtn.addEventListener('click', handleDownloadBackup);
    els.openRestoreDialogBtn.addEventListener('click', () => els.restoreBackupInput.click());
    els.restoreBackupInput.addEventListener('change', handleRestoreBackup);

    els.refreshFuelBtn.addEventListener('click', () => refreshFuelPrice(true));
  }

  function switchSection(sectionId) {
    const safeSection = getValidSection(sectionId);

    state.ui.section = safeSection;
    state.currentView = 'main';
    state.selectedJobId = null;

    persistUiState();
    renderView();
  }

  function getValidSection(sectionId) {
    const validSections = ['dashboard', 'add-job', 'history', 'archive', 'expenses', 'clients'];
    return validSections.includes(sectionId) ? sectionId : 'dashboard';
  }

  function applyUiStateSection() {
    state.ui.section = getValidSection(state.ui.section || 'dashboard');
    state.currentView = 'main';
    state.selectedJobId = null;
    renderView();
  }

  function renderView() {
    const mainSection = getValidSection(state.ui.section || 'dashboard');
    const isDetails = state.currentView === 'job-details' && Boolean(state.selectedJobId);

    els.navButtons.forEach((button) => {
      button.classList.toggle('active', !isDetails && button.dataset.section === mainSection);
    });

    els.sections.forEach((section) => {
      if (isDetails) {
        section.classList.toggle('active', section.id === 'job-details');
      } else {
        section.classList.toggle('active', section.id === mainSection);
      }
    });

    els.mobileApp.classList.toggle('details-open', isDetails);
  }

  function openJobDetails(jobId) {
    const job = state.jobs.find((item) => item.id === jobId);
    if (!job) {
      return;
    }

    state.selectedJobId = job.id;
    state.currentView = 'job-details';
    renderJobDetails();
    renderView();
  }

  function closeJobDetails() {
    state.currentView = 'main';
    state.selectedJobId = null;
    setMessage(els.jobDetailsMessage, '', null);
    renderView();
  }

  function getSelectedJob() {
    if (!state.selectedJobId) {
      return null;
    }
    return state.jobs.find((job) => job.id === state.selectedJobId) || null;
  }

  function setDefaultDates() {
    if (!els.jobForm.elements.date.value) {
      els.jobForm.elements.date.value = toInputDate(new Date());
    }

    if (!els.expenseForm.elements.date.value) {
      els.expenseForm.elements.date.value = toInputDate(new Date());
    }


    if (!els.historicalForm.elements.date.value) {
      els.historicalForm.elements.date.value = toInputDate(new Date());
    }


    if (!els.jobForm.elements.operatorRate.value) {
      els.jobForm.elements.operatorRate.value = String(DEFAULT_OPERATOR_RATE);
    }

    if (!els.jobForm.elements.fuelPrice.value) {
      els.jobForm.elements.fuelPrice.value = String(getCurrentFuelPriceNumber());
    }

    if (!els.jobForm.elements.operatorPayMode.value) {
      els.jobForm.elements.operatorPayMode.value = OPERATOR_PAY_MODES.auto;
    }

    toggleOperatorManualInput();
    renderJobPreview();
  }

  function syncUiFilters() {
    const historyRange = ['today', 'week', 'month', 'all'].includes(state.ui.historyRange) ? state.ui.historyRange : 'all';
    state.ui.historyRange = historyRange;

    els.historyRangeFilters.forEach((button) => {
      button.classList.toggle('active', button.dataset.range === historyRange);
    });

    const historyPaymentFilter = ['all', 'paid', 'debt'].includes(state.ui.historyPaymentFilter) ? state.ui.historyPaymentFilter : 'all';
    state.ui.historyPaymentFilter = historyPaymentFilter;

    els.historyPaymentFilters.forEach((button) => {
      button.classList.toggle('active', button.dataset.payment === historyPaymentFilter);
    });

    const expenseRange = ['today', 'month', 'all'].includes(state.ui.expenseRange) ? state.ui.expenseRange : 'all';
    state.ui.expenseRange = expenseRange;

    els.expenseRangeFilters.forEach((button) => {
      button.classList.toggle('active', button.dataset.range === expenseRange);
    });

    const expenseCategory = ['all', ...EXPENSE_CATEGORIES].includes(state.ui.expenseCategory)
      ? state.ui.expenseCategory
      : 'all';
    state.ui.expenseCategory = expenseCategory;

    els.expenseCategoryFilters.forEach((button) => {
      button.classList.toggle('active', button.dataset.category === expenseCategory);
    });
  }

  function setHistoryRange(range) {
    state.ui.historyRange = ['today', 'week', 'month', 'all'].includes(range) ? range : 'all';
    syncUiFilters();
    persistUiState();
    renderHistoryTable();
  }

  function setHistoryPaymentFilter(filter) {
    state.ui.historyPaymentFilter = ['all', 'paid', 'debt'].includes(filter) ? filter : 'all';
    syncUiFilters();
    persistUiState();
    renderHistoryTable();
  }

  function setExpenseRange(range) {
    state.ui.expenseRange = ['today', 'month', 'all'].includes(range) ? range : 'all';
    syncUiFilters();
    persistUiState();
    renderExpensesTable();
  }

  function setExpenseCategory(category) {
    state.ui.expenseCategory = ['all', ...EXPENSE_CATEGORIES].includes(category) ? category : 'all';
    syncUiFilters();
    persistUiState();
    renderExpensesTable();
  }

  function handleJobSubmit(event) {
    event.preventDefault();

    const formData = new FormData(els.jobForm);
    const job = buildJobFromForm(formData);
    const editingId = state.jobEditingId;
    const existingJob = editingId ? state.jobs.find((item) => item.id === editingId) : null;

    if (existingJob && existingJob.status === STATUSES.completed) {
      job.status = STATUSES.completed;
      if (!Number.isFinite(job.currentHours) && Number.isFinite(existingJob.currentHours)) {
        job.currentHours = existingJob.currentHours;
      }
    }

    if (!isJobValid(job)) {
      const needsHours = job.status === STATUSES.completed && !Number.isFinite(job.currentHours);
      const message = needsHours
        ? 'Для выполненной заявки заполните поле "Текущие моточасы".'
        : 'Проверьте форму заявки: заполните обязательные поля и числа.';
      setMessage(els.jobFormMessage, message, 'error');
      return;
    }

    if (editingId && existingJob) {
      job.id = existingJob.id;
      job.createdAt = existingJob.createdAt;
      job.comment = existingJob.comment || '';

      if (job.paid === true && existingJob.paid === true && existingJob.paidAt) {
        job.paidAt = existingJob.paidAt;
      }

      if (job.paid !== true) {
        job.paidAt = null;
      }

      const index = state.jobs.findIndex((item) => item.id === editingId);
      if (index >= 0) {
        state.jobs[index] = job;
      }
      setMessage(els.jobFormMessage, 'Заявка обновлена.', 'success');
    } else {
      state.jobs.push(job);
      setMessage(els.jobFormMessage, 'Заявка добавлена.', 'success');
    }

    if (job.status === STATUSES.completed && Number.isFinite(job.currentHours)) {
      updateCurrentMachineHours(job.currentHours);
    }

    persistJobs();
    resetJobEditState();

    els.jobForm.reset();
    setDefaultDates();

    renderAll();
    switchSection('dashboard');
  }

  function buildJobFromForm(formData) {
    const date = String(formData.get('date') || '').trim();
    const hours = toNonNegativeNumber(formData.get('hours'));
    const amount = toNonNegativeNumber(formData.get('amount'));

    const fuelLitersInput = String(formData.get('fuelLiters') || '').trim();
    const fuelLiters = Number.isFinite(toOptionalNonNegativeNumber(fuelLitersInput))
      ? toOptionalNonNegativeNumber(fuelLitersInput)
      : round2(hours * DEFAULT_FUEL_CONSUMPTION_PER_HOUR);

    const fuelPriceInput = String(formData.get('fuelPrice') || '').trim();
    const fuelPrice = Number.isFinite(toOptionalPositiveNumber(fuelPriceInput))
      ? toOptionalPositiveNumber(fuelPriceInput)
      : getCurrentFuelPriceNumber();

    const fuelCost = round2(fuelLiters * fuelPrice);

    const operatorRateInput = String(formData.get('operatorRate') || '').trim();
    const operatorRate = Number.isFinite(toOptionalNonNegativeNumber(operatorRateInput))
      ? toOptionalNonNegativeNumber(operatorRateInput)
      : DEFAULT_OPERATOR_RATE;

    const operatorPayMode = formData.get('operatorPayMode') === OPERATOR_PAY_MODES.manual ? OPERATOR_PAY_MODES.manual : OPERATOR_PAY_MODES.auto;

    const operatorPayInput = String(formData.get('operatorPay') || '').trim();
    const operatorPay = operatorPayMode === OPERATOR_PAY_MODES.auto
      ? round2(operatorRate * hours)
      : round2(toNonNegativeNumber(operatorPayInput));

    const jobNetProfit = round2(amount - fuelCost - operatorPay);
    const status = resolveStatus(STATUSES.planned, date);

    const currentHoursInput = String(formData.get('currentHours') || '').trim();
    const currentHours = Number.isFinite(toOptionalNonNegativeNumber(currentHoursInput))
      ? round2(toOptionalNonNegativeNumber(currentHoursInput))
      : null;

    const isPaid = formData.get('paid') === 'on';

    return {
      id: createId('job'),
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

      operatorRate,
      operatorPay,
      operatorPayMode,

      jobNetProfit,
      currentHours,
      paid: isPaid,
      paidAt: isPaid ? new Date().toISOString() : null,
      comment: '',
      status,
      createdAt: new Date().toISOString()
    };
  }

    function startJobEdit(jobId) {
    const job = state.jobs.find((item) => item.id === jobId);
    if (!job) {
      return;
    }

    state.jobEditingId = job.id;
    const form = els.jobForm.elements;

    form.jobId.value = job.id;
    form.name.value = job.name || '';
    form.phone.value = job.phone || '';
    form.date.value = job.date || toInputDate(new Date());
    form.workType.value = job.workType || '';
    form.address.value = job.address || '';
    form.hours.value = Number.isFinite(job.hours) ? String(job.hours) : '';
    form.amount.value = Number.isFinite(job.amount) ? String(job.amount) : '';
    form.currentHours.value = Number.isFinite(job.currentHours) ? String(job.currentHours) : '';

    form.fuelLiters.value = Number.isFinite(job.fuelLiters) ? String(job.fuelLiters) : '';
    form.fuelPrice.value = Number.isFinite(job.fuelPrice) ? String(job.fuelPrice) : '';
    form.operatorRate.value = Number.isFinite(job.operatorRate) ? String(job.operatorRate) : '';
    form.operatorPayMode.value = job.operatorPayMode === OPERATOR_PAY_MODES.manual ? OPERATOR_PAY_MODES.manual : OPERATOR_PAY_MODES.auto;
    form.operatorPay.value = Number.isFinite(job.operatorPay) ? String(job.operatorPay) : '';
    form.paid.checked = job.paid === true;

    els.jobSubmitBtn.textContent = 'Сохранить заявку';
    els.cancelJobEditBtn.classList.remove('hidden');

    toggleOperatorManualInput();
    renderJobPreview();
    setMessage(els.jobFormMessage, 'Режим редактирования заявки.', null);

    switchSection('add-job');
  }

  function resetJobEditState() {
    state.jobEditingId = null;
    els.jobForm.elements.jobId.value = '';
    els.jobSubmitBtn.textContent = 'Добавить заявку';
    els.cancelJobEditBtn.classList.add('hidden');
  }

  function cancelJobEdit() {
    resetJobEditState();
    els.jobForm.reset();
    setDefaultDates();
    setMessage(els.jobFormMessage, 'Редактирование заявки отменено.', null);
  }
  function toggleOperatorManualInput() {
    const mode = els.jobForm.elements.operatorPayMode.value;
    const isManual = mode === OPERATOR_PAY_MODES.manual;
    els.operatorPayWrap.classList.toggle('hidden', !isManual);
  }

  function renderJobPreview() {
    const form = els.jobForm.elements;

    const hours = toNonNegativeNumber(form.hours.value);
    const amount = toNonNegativeNumber(form.amount.value);

    const fuelLiters = Number.isFinite(toOptionalNonNegativeNumber(form.fuelLiters.value))
      ? toOptionalNonNegativeNumber(form.fuelLiters.value)
      : round2(hours * DEFAULT_FUEL_CONSUMPTION_PER_HOUR);

    const fuelPrice = Number.isFinite(toOptionalPositiveNumber(form.fuelPrice.value))
      ? toOptionalPositiveNumber(form.fuelPrice.value)
      : getCurrentFuelPriceNumber();

    const fuelCost = round2(fuelLiters * fuelPrice);

    const operatorRate = Number.isFinite(toOptionalNonNegativeNumber(form.operatorRate.value))
      ? toOptionalNonNegativeNumber(form.operatorRate.value)
      : DEFAULT_OPERATOR_RATE;

    const operatorPayMode = form.operatorPayMode.value === OPERATOR_PAY_MODES.manual ? OPERATOR_PAY_MODES.manual : OPERATOR_PAY_MODES.auto;

    const operatorPay = operatorPayMode === OPERATOR_PAY_MODES.auto
      ? round2(operatorRate * hours)
      : round2(toNonNegativeNumber(form.operatorPay.value));

    const netProfit = round2(amount - fuelCost - operatorPay);

    els.previewFuelCost.textContent = formatCurrency(fuelCost);
    els.previewOperatorPay.textContent = formatCurrency(operatorPay);
    els.previewNetProfit.textContent = formatCurrency(netProfit);
  }

  function isJobValid(job) {
    const hasCurrentHoursIfCompleted = job.status !== STATUSES.completed
      || (Number.isFinite(job.currentHours) && job.currentHours >= 0);

    return Boolean(
      job.name &&
      job.phone &&
      job.date &&
      job.workType &&
      job.address &&
      Number.isFinite(job.hours) && job.hours >= 0 &&
      Number.isFinite(job.amount) && job.amount >= 0 &&
      Number.isFinite(job.fuelLiters) && job.fuelLiters >= 0 &&
      Number.isFinite(job.fuelPrice) && job.fuelPrice > 0 &&
      Number.isFinite(job.fuelCost) &&
      Number.isFinite(job.operatorRate) && job.operatorRate >= 0 &&
      Number.isFinite(job.operatorPay) && job.operatorPay >= 0 &&
      Number.isFinite(job.jobNetProfit) &&
      typeof job.paid === 'boolean' &&
      hasCurrentHoursIfCompleted
    );
  }

  function renderAll() {
    syncDerivedJobFields();
    state.clients = deriveClients(state.jobs);

    persistClients();

    renderDashboard();
    renderNextJob();
    renderFutureJobs();
    renderHistoryTable();
    renderArchiveJobsTable();
    renderHistoricalTable();
    renderExpensesTable();
    renderClients();
    populateExpenseJobOptions();
    renderJobPreview();

    if (state.currentView === 'job-details') {
      renderJobDetails();
    }

    renderView();
  }

  function renderDashboard() {
    const now = new Date();
    const todayJobs = state.jobs.filter((job) => isSameDay(parseDate(job.date), now));
    const monthJobs = state.jobs.filter((job) => isSameMonth(parseDate(job.date), now));

    const todayExpensesItems = getExpensesForRange(state.expenses, 'today', 'all');
    const monthExpensesItems = getExpensesForRange(state.expenses, 'month', 'all');

    const todayHours = sumBy(todayJobs, 'hours');
    const todayIncome = sumBy(todayJobs, 'amount');

    const jobFuelToday = sumBy(todayJobs, 'fuelCost');
    const jobOperatorToday = sumBy(todayJobs, 'operatorPay');
    const otherToday = sumAmount(todayExpensesItems);

    const todayTotalExpenses = round2(jobFuelToday + jobOperatorToday + otherToday);
    const todayNetProfit = round2(todayIncome - todayTotalExpenses);

    els.todayHoursCard.textContent = formatHours(todayHours);
    els.todayRevenueCard.textContent = formatCurrency(todayIncome);
    els.todayExpensesCard.textContent = formatCurrency(todayTotalExpenses);
    els.todayNetCard.textContent = formatCurrency(todayNetProfit);

    const debtAmount = round2(state.jobs
      .filter((job) => job.status === STATUSES.completed && job.paid !== true)
      .reduce((sum, job) => sum + toNonNegativeNumber(job.amount), 0));
    els.debtCard.textContent = formatCurrency(debtAmount);


    const liveRevenue = sumBy(state.jobs, 'amount');
    const historicalRevenue = sumBy(state.historicalEntries, 'amount');
    const liveHours = sumBy(state.jobs, 'hours');
    const historicalHours = sumBy(state.historicalEntries, 'hours');

    const lifetimeRevenue = round2(liveRevenue + historicalRevenue);
    const lifetimeHours = round2(liveHours + historicalHours);

    els.lifetimeRevenueCard.textContent = formatCurrency(lifetimeRevenue);
    els.lifetimeHoursCard.textContent = formatHours(lifetimeHours);
    els.liveRevenueCard.textContent = formatCurrency(liveRevenue);
    els.archiveRevenueCard.textContent = formatCurrency(historicalRevenue);
    els.liveHoursCard.textContent = formatHours(liveHours);
    els.archiveHoursCard.textContent = formatHours(historicalHours);

    const todayFuelCategory = sumAmount(filterByCategory(todayExpensesItems, 'fuel'));
    const todayOperatorCategory = sumAmount(filterByCategory(todayExpensesItems, 'operator'));

    els.todayFuelCost.textContent = formatCurrency(jobFuelToday + todayFuelCategory);
    els.todayOperatorCost.textContent = formatCurrency(jobOperatorToday + todayOperatorCategory);

    const monthRepair = sumAmount(filterByCategory(monthExpensesItems, 'repair'));
    const monthParts = sumAmount(filterByCategory(monthExpensesItems, 'parts'));

    els.monthRepairParts.textContent = formatCurrency(monthRepair + monthParts);

    const monthIncome = sumBy(monthJobs, 'amount');
    const monthFuel = sumBy(monthJobs, 'fuelCost') + sumAmount(filterByCategory(monthExpensesItems, 'fuel'));
    const monthOperator = sumBy(monthJobs, 'operatorPay') + sumAmount(filterByCategory(monthExpensesItems, 'operator'));
    const monthOther = sumAmount(filterByCategory(monthExpensesItems, 'other'));

    const monthNet = round2(monthIncome - monthFuel - monthOperator - monthRepair - monthParts - monthOther);

    els.monthIncome.textContent = formatCurrency(monthIncome);
    els.monthFuel.textContent = formatCurrency(monthFuel);
    els.monthOperator.textContent = formatCurrency(monthOperator);
    els.monthRepair.textContent = formatCurrency(monthRepair);
    els.monthParts.textContent = formatCurrency(monthParts);
    els.monthOther.textContent = formatCurrency(monthOther);
    els.monthNet.textContent = formatCurrency(monthNet);

    renderServiceInfo();
  }

  function renderServiceInfo() {
    const settings = state.serviceSettings || DEFAULT_SERVICE_SETTINGS;
    const interval = toPositiveOrDefault(settings.serviceIntervalHours, DEFAULT_SERVICE_SETTINGS.serviceIntervalHours);
    const current = toNonNegativeNumber(settings.currentMachineHours);
    const last = toNonNegativeNumber(settings.lastServiceHours);
    const passed = Math.max(0, round2(current - last));
    const remaining = Math.max(0, round2(interval - passed));
    const isUrgent = passed >= interval;

    els.serviceAlertPanel.classList.toggle('urgent', isUrgent);
    els.serviceAlertTitle.textContent = isUrgent ? 'Срочно ТО!' : 'Контроль ТО';
    els.serviceCurrentHours.textContent = `${formatHours(current)} мч`;
    els.serviceLastHours.textContent = `${formatHours(last)} мч`;
    els.servicePassedHours.textContent = `${formatHours(passed)} мч`;
    els.serviceRemainingHours.textContent = `${formatHours(remaining)} мч`;
  }

  function handleMarkService() {
    const current = toNonNegativeNumber(state.serviceSettings.currentMachineHours);
    state.serviceSettings.lastServiceHours = current;
    persistServiceSettings();
    renderServiceInfo();
  }

  function updateCurrentMachineHours(hours) {
    const value = Number(hours);
    if (!Number.isFinite(value) || value < 0) {
      return;
    }

    if (value > toNonNegativeNumber(state.serviceSettings.currentMachineHours)) {
      state.serviceSettings.currentMachineHours = round2(value);
      persistServiceSettings();
    }
  }

  function renderNextJob() {
    const today = startOfLocalDay(new Date());

    const nextJob = [...state.jobs]
      .filter((job) => {
        const date = parseDate(job.date);
        return date && date >= today && job.status === STATUSES.planned;
      })
      .sort((a, b) => parseDate(a.date) - parseDate(b.date))[0];

    if (!nextJob) {
      els.nextJob.className = 'empty-state';
      els.nextJob.textContent = 'Пока нет будущих заявок.';
      delete els.nextJob.dataset.openJobId;
      return;
    }

    els.nextJob.className = 'is-clickable';
    els.nextJob.dataset.openJobId = nextJob.id;
    els.nextJob.innerHTML = `
      <div class="next-job-main">
        <strong>${escapeHtml(nextJob.name)}</strong>
        <p>${escapeHtml(formatLongDate(nextJob.date))}</p>
        <p>${escapeHtml(nextJob.workType)}</p>
        <p>${escapeHtml(nextJob.address)}</p>
      </div>
      <div class="next-job-footer">
        <span>Часы: ${escapeHtml(formatHours(nextJob.hours))}</span>
        <strong>${escapeHtml(formatCurrency(nextJob.amount))}</strong>
      </div>
    `;
  }

  function handleNextJobClick(event) {
    const target = event.target.closest('[data-open-job-id]');
    if (!target) {
      return;
    }

    openJobDetails(target.dataset.openJobId);
  }

  function renderFutureJobs() {
    const today = startOfLocalDay(new Date());
    const futureJobs = [...state.jobs]
      .filter((job) => {
        const date = parseDate(job.date);
        return date && date >= today && job.status === STATUSES.planned;
      })
      .sort((a, b) => parseDate(a.date) - parseDate(b.date));

    if (!futureJobs.length) {
      els.futureJobsList.innerHTML = '<div class="empty-state">Будущих заявок нет.</div>';
      return;
    }

    els.futureJobsList.innerHTML = futureJobs
      .slice(0, 12)
      .map((job) => `
        <button type="button" class="future-job-item is-clickable" data-open-job-id="${escapeHtml(job.id)}">
          <div class="future-job-item-head">
            <span>${escapeHtml(formatDate(job.date))}</span>
            <strong>${escapeHtml(formatCurrency(job.amount))}</strong>
          </div>
          <div>${escapeHtml(job.name)}</div>
          <div class="future-job-item-meta">${escapeHtml(job.workType)}</div>
        </button>
      `)
      .join('');
  }

  function handleFutureJobsClick(event) {
    const target = event.target.closest('[data-open-job-id]');
    if (!target) {
      return;
    }

    openJobDetails(target.dataset.openJobId);
  }

  function renderArchiveJobsTable() {
    const archivedJobs = getSortedJobsByDate(state.jobs.filter((job) => job.status === STATUSES.completed), 'desc');

    if (!archivedJobs.length) {
      els.archiveJobsTableBody.innerHTML = '<tr><td class="empty-state" colspan="5">Архивных заявок нет.</td></tr>';
      return;
    }

    els.archiveJobsTableBody.innerHTML = archivedJobs
      .map((job) => `
        <tr class="clickable-row" data-open-job-id="${escapeHtml(job.id)}">
          <td>${escapeHtml(formatDate(job.date))}</td>
          <td>${escapeHtml(job.name)}</td>
          <td>${escapeHtml(job.workType)}</td>
          <td>${escapeHtml(formatCurrency(job.amount))}</td>
          <td>${renderPaymentBadge(job)}</td>
        </tr>
      `)
      .join('');
  }

  function handleArchiveJobsClick(event) {
    const row = event.target.closest('tr[data-open-job-id]');
    if (!row) {
      return;
    }

    openJobDetails(row.dataset.openJobId);
  }

  function renderHistoryTable() {
    const jobs = getJobsForHistory();

    if (!jobs.length) {
      els.historyTableBody.innerHTML = '<tr><td class="empty-state" colspan="13">Нет заявок по выбранному фильтру.</td></tr>';
      return;
    }

    els.historyTableBody.innerHTML = jobs
      .map((job) => {
        const isDebt = job.status === STATUSES.completed && job.paid !== true;
        const rowClass = isDebt ? 'debt-row clickable-row' : 'clickable-row';
        return `
        <tr class="${rowClass}" data-open-job-id="${escapeHtml(job.id)}">
          <td>${escapeHtml(formatDate(job.date))}</td>
          <td>${escapeHtml(job.name)}</td>
          <td>${escapeHtml(job.phone)}</td>
          <td>${escapeHtml(job.workType)}</td>
          <td>${escapeHtml(job.address)}</td>
          <td>${escapeHtml(formatHours(job.hours))}</td>
          <td>${escapeHtml(formatCurrency(job.amount))}</td>
          <td>${escapeHtml(formatCurrency(job.fuelCost))}</td>
          <td>${escapeHtml(formatCurrency(job.operatorPay))}</td>
          <td>${escapeHtml(formatCurrency(job.jobNetProfit))}</td>
          <td>${renderStatusBadge(job.status)}</td>
          <td>${renderPaymentBadge(job)}</td>
          <td><button type="button" class="action-btn" data-repeat-job-id="${escapeHtml(job.id)}">Повторить</button></td>
        </tr>
      `;
      })
      .join('');
  }

  function handleHistoryClick(event) {
    const repeatButton = event.target.closest('button[data-repeat-job-id]');
    if (repeatButton) {
      const sourceId = repeatButton.dataset.repeatJobId;
      const sourceJob = state.jobs.find((job) => job.id === sourceId);

      if (!sourceJob) {
        setMessage(els.historyMessage, 'Не удалось найти заявку для повтора.', 'error');
        return;
      }

      const clone = normalizeJob({
        ...sourceJob,
        id: createId('job'),
        date: toInputDate(new Date()),
        status: STATUSES.planned,
        currentHours: null,
        paid: false,
        paidAt: null,
        createdAt: new Date().toISOString()
      }, getCurrentFuelPriceNumber());

      state.jobs.push(clone);
      persistJobs();

      renderAll();
      setMessage(els.historyMessage, 'Заявка успешно повторена (дата: сегодня).', 'success');
      return;
    }

    const row = event.target.closest('tr[data-open-job-id]');
    if (!row) {
      return;
    }

    openJobDetails(row.dataset.openJobId);
  }

  function getJobsForHistory() {
    const sorted = getSortedJobsByDate(state.jobs, 'desc');
    const range = state.ui.historyRange || 'all';
    const paymentFilter = state.ui.historyPaymentFilter || 'all';

    let filteredByRange = sorted;

    if (range !== 'all') {
      const now = new Date();

      if (range === 'today') {
        filteredByRange = sorted.filter((job) => isSameDay(parseDate(job.date), now));
      }

      if (range === 'week') {
        const start = startOfLocalDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6));
        const end = endOfLocalDay(now);
        filteredByRange = sorted.filter((job) => {
          const date = parseDate(job.date);
          return date && date >= start && date <= end;
        });
      }

      if (range === 'month') {
        filteredByRange = sorted.filter((job) => isSameMonth(parseDate(job.date), now));
      }
    }

    if (paymentFilter === 'paid') {
      return filteredByRange.filter((job) => job.status === STATUSES.completed && job.paid === true);
    }

    if (paymentFilter === 'debt') {
      return filteredByRange.filter((job) => job.status === STATUSES.completed && job.paid !== true);
    }

    return filteredByRange;
  }

  function renderStatusBadge(status) {
    const safeStatus = status === STATUSES.completed ? STATUSES.completed : STATUSES.planned;
    const label = safeStatus === STATUSES.completed ? 'Выполнено' : 'Запланировано';
    const className = safeStatus === STATUSES.completed ? 'status-pill status-completed' : 'status-pill status-planned';
    return `<span class="${className}">${label}</span>`;
  }

  function renderPaymentBadge(job) {
    if (job.status !== STATUSES.completed) {
      return '<span class="status-pill">-</span>';
    }

    if (job.paid === true) {
      return '<span class="status-pill status-paid">Оплачено</span>';
    }

    return '<span class="status-pill status-debt">Не оплачено</span>';
  }

    function renderJobDetails() {
    const job = getSelectedJob();
    if (!job) {
      closeJobDetails();
      return;
    }

    const currentHours = Number.isFinite(job.currentHours) ? `${formatHours(job.currentHours)} мч` : '-';
    const paidLabel = job.status === STATUSES.completed
      ? (job.paid === true ? 'Оплачено' : 'Не оплачено')
      : '-';
    const paidAt = job.paidAt ? formatDateTime(job.paidAt) : '-';
    const comment = String(job.comment || '').trim() || '-';

    els.jobDetailsContent.innerHTML = `
      <article class="job-details-client">
        <strong>${escapeHtml(job.name || 'Без имени')}</strong>
        <div>${escapeHtml(job.phone || '-')}</div>
      </article>

      <article class="job-details-grid">
        <div class="job-details-row"><span>Дата</span><strong>${escapeHtml(formatDate(job.date))}</strong></div>
        <div class="job-details-row"><span>Тип работ</span><strong>${escapeHtml(job.workType || '-')}</strong></div>
        <div class="job-details-row"><span>Адрес</span><strong>${escapeHtml(job.address || '-')}</strong></div>
        <div class="job-details-row"><span>Часы</span><strong>${escapeHtml(formatHours(job.hours))}</strong></div>
        <div class="job-details-row"><span>Сумма</span><strong>${escapeHtml(formatCurrency(job.amount))}</strong></div>
        <div class="job-details-row"><span>Топливо, л</span><strong>${escapeHtml(formatHours(job.fuelLiters))}</strong></div>
        <div class="job-details-row"><span>Топливо, ₽</span><strong>${escapeHtml(formatCurrency(job.fuelCost))}</strong></div>
        <div class="job-details-row"><span>Зарплата машиниста</span><strong>${escapeHtml(formatCurrency(job.operatorPay))}</strong></div>
        <div class="job-details-row"><span>Прибыль по заявке</span><strong>${escapeHtml(formatCurrency(job.jobNetProfit))}</strong></div>
        <div class="job-details-row"><span>Статус</span><strong>${job.status === STATUSES.completed ? 'Выполнено' : 'Запланировано'}</strong></div>
        <div class="job-details-row"><span>Оплата</span><strong>${paidLabel}</strong></div>
        <div class="job-details-row"><span>Оплачено в</span><strong>${escapeHtml(paidAt)}</strong></div>
        <div class="job-details-row"><span>Моточасы</span><strong>${escapeHtml(currentHours)}</strong></div>
        <div class="job-details-row"><span>Комментарий</span><strong>${escapeHtml(comment)}</strong></div>
      </article>
    `;

    els.jobDetailsPaidBtn.textContent = job.paid === true ? 'Снять оплату' : 'Отметить оплачено';
    els.jobDetailsCompleteBtn.classList.toggle('hidden', job.status === STATUSES.completed);
  }

  function handleEditJobFromDetails() {
    const job = getSelectedJob();
    if (!job) {
      return;
    }

    startJobEdit(job.id);
  }

  function handleDeleteJobFromDetails() {
    const job = getSelectedJob();
    if (!job) {
      return;
    }

    const confirmed = window.confirm(`Удалить заявку ${job.name} от ${formatDate(job.date)}?`);
    if (!confirmed) {
      return;
    }

    deleteJobById(job.id);
    closeJobDetails();
    renderAll();
  }

  function handleTogglePaidFromDetails() {
    const job = getSelectedJob();
    if (!job) {
      return;
    }

    if (job.status !== STATUSES.completed) {
      setMessage(els.jobDetailsMessage, 'Оплата доступна только для выполненной заявки.', 'error');
      return;
    }

    job.paid = job.paid !== true;
    job.paidAt = job.paid ? new Date().toISOString() : null;

    persistJobs();
    renderAll();
    setMessage(els.jobDetailsMessage, 'Статус оплаты обновлен.', 'success');
  }

  function handleCompleteJobFromDetails() {
    const job = getSelectedJob();
    if (!job) {
      return;
    }

    if (job.status === STATUSES.completed) {
      return;
    }

    let currentHours = Number.isFinite(job.currentHours) ? job.currentHours : null;

    if (!Number.isFinite(currentHours)) {
      const input = window.prompt('Введите текущие моточасы для завершения заявки:', '');
      if (input === null) {
        return;
      }

      const parsed = toOptionalNonNegativeNumber(input);
      if (!Number.isFinite(parsed)) {
        setMessage(els.jobDetailsMessage, 'Некорректные моточасы.', 'error');
        return;
      }

      currentHours = round2(parsed);
    }

    job.status = STATUSES.completed;
    job.currentHours = currentHours;
    if (typeof job.paid !== 'boolean') {
      job.paid = false;
    }

    updateCurrentMachineHours(job.currentHours);
    persistJobs();
    renderAll();
    setMessage(els.jobDetailsMessage, 'Заявка завершена.', 'success');
  }

  function deleteJobById(jobId) {
    const exists = state.jobs.some((job) => job.id === jobId);
    if (!exists) {
      return;
    }

    state.jobs = state.jobs.filter((job) => job.id !== jobId);

    if (state.jobEditingId === jobId) {
      resetJobEditState();
      els.jobForm.reset();
      setDefaultDates();
    }

    persistJobs();
  }
  function getExpenseCategoryLabel(category) {
    return EXPENSE_CATEGORY_LABELS[category] || EXPENSE_CATEGORY_LABELS.other;
  }

  function handleExportHistoryCsv() {
    const jobs = getJobsForHistory();

    if (!jobs.length) {
      setMessage(els.historyMessage, 'Нет данных для экспорта.', 'error');
      return;
    }

    const headers = ['Дата', 'Клиент', 'Телефон', 'Тип работ', 'Адрес', 'Часы', 'Сумма', 'Топливо, л', 'Топливо, ₽', 'Машинист, ₽', 'Прибыль, ₽', 'Статус', 'Оплата'];

    const rows = jobs.map((job) => [
      formatDate(job.date),
      job.name,
      job.phone,
      job.workType,
      job.address,
      formatHours(job.hours),
      String(job.amount),
      String(job.fuelLiters),
      String(job.fuelCost),
      String(job.operatorPay),
      String(job.jobNetProfit),
      job.status,
      job.status === STATUSES.completed ? (job.paid === true ? 'Оплачено' : 'Не оплачено') : '-'
    ]);

    exportCsv(headers, rows, `history-${state.ui.historyRange || 'all'}-${toInputDate(new Date())}.csv`);
    setMessage(els.historyMessage, 'CSV истории сформирован.', 'success');
  }

  function handleExpenseSubmit(event) {
    event.preventDefault();

    const formData = new FormData(els.expenseForm);
    const expense = buildExpenseFromForm(formData);

    if (!isExpenseValid(expense)) {
      setMessage(els.expenseFormMessage, 'Проверьте форму расхода.', 'error');
      return;
    }

    if (state.expenseEditingId) {
      const index = state.expenses.findIndex((item) => item.id === state.expenseEditingId);
      if (index >= 0) {
        state.expenses[index] = { ...expense, id: state.expenseEditingId, createdAt: state.expenses[index].createdAt };
      }
      state.expenseEditingId = null;
      setMessage(els.expenseFormMessage, 'Расход обновлен.', 'success');
    } else {
      state.expenses.push(expense);
      setMessage(els.expenseFormMessage, 'Расход добавлен.', 'success');
    }

    persistExpenses();
    resetExpenseForm();
    renderAll();
  }

  function buildExpenseFromForm(formData) {
    const category = EXPENSE_CATEGORIES.includes(String(formData.get('category') || '').trim())
      ? String(formData.get('category')).trim()
      : 'other';

    return {
      id: createId('exp'),
      date: String(formData.get('date') || '').trim(),
      category,
      title: String(formData.get('title') || '').trim(),
      amount: round2(toNonNegativeNumber(formData.get('amount'))),
      relatedJobId: String(formData.get('relatedJobId') || '').trim(),
      comment: String(formData.get('comment') || '').trim(),
      createdAt: new Date().toISOString()
    };
  }

  function isExpenseValid(expense) {
    return Boolean(
      expense.date &&
      EXPENSE_CATEGORIES.includes(expense.category) &&
      expense.title &&
      Number.isFinite(expense.amount) &&
      expense.amount >= 0
    );
  }

  function resetExpenseForm() {
    els.expenseForm.reset();
    els.expenseForm.elements.date.value = toInputDate(new Date());
    els.expenseForm.elements.category.value = 'repair';
    els.expenseForm.elements.expenseId.value = '';
    state.expenseEditingId = null;
    els.cancelExpenseEditBtn.classList.add('hidden');
  }

  function cancelExpenseEdit() {
    resetExpenseForm();
    setMessage(els.expenseFormMessage, 'Редактирование отменено.', null);
  }

  function handleExpenseTableClick(event) {
    const editButton = event.target.closest('button[data-edit-expense-id]');
    if (editButton) {
      startExpenseEdit(editButton.dataset.editExpenseId);
      return;
    }

    const deleteButton = event.target.closest('button[data-delete-expense-id]');
    if (deleteButton) {
      deleteExpense(deleteButton.dataset.deleteExpenseId);
    }
  }

  function startExpenseEdit(expenseId) {
    const expense = state.expenses.find((item) => item.id === expenseId);
    if (!expense) {
      setMessage(els.expensesMessage, 'Расход не найден.', 'error');
      return;
    }

    state.expenseEditingId = expense.id;
    els.expenseForm.elements.expenseId.value = expense.id;
    els.expenseForm.elements.date.value = expense.date;
    els.expenseForm.elements.category.value = expense.category;
    els.expenseForm.elements.title.value = expense.title;
    els.expenseForm.elements.amount.value = String(expense.amount);
    els.expenseForm.elements.relatedJobId.value = expense.relatedJobId || '';
    els.expenseForm.elements.comment.value = expense.comment || '';

    els.cancelExpenseEditBtn.classList.remove('hidden');
    switchSection('expenses');
    setMessage(els.expenseFormMessage, 'Режим редактирования расхода.', null);
  }

  function deleteExpense(expenseId) {
    const exists = state.expenses.some((item) => item.id === expenseId);
    if (!exists) {
      setMessage(els.expensesMessage, 'Расход не найден.', 'error');
      return;
    }

    state.expenses = state.expenses.filter((item) => item.id !== expenseId);
    persistExpenses();
    renderAll();

    setMessage(els.expensesMessage, 'Расход удален.', 'success');

    if (state.expenseEditingId === expenseId) {
      resetExpenseForm();
    }
  }

  function renderExpensesTable() {
    const expenses = getFilteredExpenses();

    if (!expenses.length) {
      els.expensesTableBody.innerHTML = '<tr><td class="empty-state" colspan="6">Расходов по фильтру нет.</td></tr>';
      return;
    }

    els.expensesTableBody.innerHTML = expenses
      .map((expense) => `
        <tr>
          <td>${escapeHtml(formatDate(expense.date))}</td>
          <td>${escapeHtml(getExpenseCategoryLabel(expense.category))}</td>
          <td>${escapeHtml(expense.title)}</td>
          <td>${escapeHtml(formatCurrency(expense.amount))}</td>
          <td>${escapeHtml(expense.comment || '-')}</td>
          <td>
            <button type="button" class="action-btn" data-edit-expense-id="${escapeHtml(expense.id)}">Ред.</button>
            <button type="button" class="action-btn danger" data-delete-expense-id="${escapeHtml(expense.id)}">Удалить</button>
          </td>
        </tr>
      `)
      .join('');
  }

  function getFilteredExpenses() {
    return getExpensesForRange(state.expenses, state.ui.expenseRange || 'all', state.ui.expenseCategory || 'all')
      .sort((a, b) => {
        const dA = parseDate(a.date);
        const dB = parseDate(b.date);
        const tsA = dA ? dA.getTime() : 0;
        const tsB = dB ? dB.getTime() : 0;

        if (tsA !== tsB) {
          return tsB - tsA;
        }

        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      });
  }

  function getExpensesForRange(expenses, range, category) {
    const now = new Date();

    let filtered = expenses;

    if (range === 'today') {
      filtered = filtered.filter((item) => isSameDay(parseDate(item.date), now));
    }

    if (range === 'month') {
      filtered = filtered.filter((item) => isSameMonth(parseDate(item.date), now));
    }

    if (category && category !== 'all') {
      filtered = filtered.filter((item) => item.category === category);
    }

    return filtered;
  }

  function handleExportExpensesCsv() {
    const expenses = getFilteredExpenses();

    if (!expenses.length) {
      setMessage(els.expensesMessage, 'Нет расходов для экспорта.', 'error');
      return;
    }

    const headers = ['Дата', 'Категория', 'Название', 'Сумма', 'Комментарий', 'ID связанной заявки'];
    const rows = expenses.map((item) => [
      formatDate(item.date),
      getExpenseCategoryLabel(item.category),
      item.title,
      String(item.amount),
      item.comment,
      item.relatedJobId
    ]);

    exportCsv(headers, rows, `expenses-${state.ui.expenseRange || 'all'}-${toInputDate(new Date())}.csv`);
    setMessage(els.expensesMessage, 'CSV расходов сформирован.', 'success');
  }


  function handleHistoricalSubmit(event) {
    event.preventDefault();

    const formData = new FormData(els.historicalForm);
    const entry = buildHistoricalEntryFromForm(formData);

    if (!isHistoricalEntryValid(entry)) {
      setMessage(els.historicalFormMessage, 'Проверьте форму архива.', 'error');
      return;
    }

    if (state.historicalEditingId) {
      const index = state.historicalEntries.findIndex((item) => item.id === state.historicalEditingId);
      if (index >= 0) {
        state.historicalEntries[index] = {
          ...entry,
          id: state.historicalEditingId,
          source: state.historicalEntries[index].source || HISTORICAL_SOURCE,
          createdAt: state.historicalEntries[index].createdAt
        };
      }
      state.historicalEditingId = null;
      setMessage(els.historicalFormMessage, 'Запись архива обновлена.', 'success');
    } else {
      state.historicalEntries.push(entry);
      setMessage(els.historicalFormMessage, 'Запись архива добавлена.', 'success');
    }

    persistHistoricalEntries();
    resetHistoricalForm();
    renderAll();
  }

  function buildHistoricalEntryFromForm(formData) {
    return {
      id: createId('hist'),
      date: String(formData.get('date') || '').trim(),
      hours: round2(toNonNegativeNumber(formData.get('hours'))),
      amount: round2(toNonNegativeNumber(formData.get('amount'))),
      note: String(formData.get('note') || '').trim(),
      source: HISTORICAL_SOURCE,
      createdAt: new Date().toISOString()
    };
  }

  function isHistoricalEntryValid(entry) {
    return Boolean(
      entry.date &&
      Number.isFinite(entry.hours) && entry.hours >= 0 &&
      Number.isFinite(entry.amount) && entry.amount >= 0 &&
      entry.source === HISTORICAL_SOURCE
    );
  }

  function resetHistoricalForm() {
    els.historicalForm.reset();
    els.historicalForm.elements.date.value = toInputDate(new Date());
    els.historicalForm.elements.historicalId.value = '';
    state.historicalEditingId = null;
    els.cancelHistoricalEditBtn.classList.add('hidden');
  }

  function cancelHistoricalEdit() {
    resetHistoricalForm();
    setMessage(els.historicalFormMessage, 'Редактирование архива отменено.', null);
  }

  function handleHistoricalTableClick(event) {
    const editButton = event.target.closest('button[data-edit-historical-id]');
    if (editButton) {
      startHistoricalEdit(editButton.dataset.editHistoricalId);
      return;
    }

    const deleteButton = event.target.closest('button[data-delete-historical-id]');
    if (deleteButton) {
      deleteHistoricalEntry(deleteButton.dataset.deleteHistoricalId);
    }
  }

  function startHistoricalEdit(entryId) {
    const entry = state.historicalEntries.find((item) => item.id === entryId);
    if (!entry) {
      setMessage(els.historicalMessage, 'Запись архива не найдена.', 'error');
      return;
    }

    state.historicalEditingId = entry.id;
    els.historicalForm.elements.historicalId.value = entry.id;
    els.historicalForm.elements.date.value = entry.date;
    els.historicalForm.elements.hours.value = String(entry.hours);
    els.historicalForm.elements.amount.value = String(entry.amount);
    els.historicalForm.elements.note.value = entry.note || '';

    els.cancelHistoricalEditBtn.classList.remove('hidden');
    switchSection('archive');
    setMessage(els.historicalFormMessage, 'Режим редактирования архива.', null);
  }

  function deleteHistoricalEntry(entryId) {
    const exists = state.historicalEntries.some((item) => item.id === entryId);
    if (!exists) {
      setMessage(els.historicalMessage, 'Запись архива не найдена.', 'error');
      return;
    }

    state.historicalEntries = state.historicalEntries.filter((item) => item.id !== entryId);
    persistHistoricalEntries();
    renderAll();

    setMessage(els.historicalMessage, 'Запись архива удалена.', 'success');

    if (state.historicalEditingId === entryId) {
      resetHistoricalForm();
    }
  }

  function getHistoricalEntriesSorted() {
    return [...state.historicalEntries].sort((a, b) => {
      const dA = parseDate(a.date);
      const dB = parseDate(b.date);
      const tsA = dA ? dA.getTime() : 0;
      const tsB = dB ? dB.getTime() : 0;

      if (tsA !== tsB) {
        return tsB - tsA;
      }

      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });
  }

  function renderHistoricalTable() {
    const entries = getHistoricalEntriesSorted();

    if (!entries.length) {
      els.historicalTableBody.innerHTML = '<tr><td class="empty-state" colspan="5">Архивных записей пока нет.</td></tr>';
      return;
    }

    els.historicalTableBody.innerHTML = entries
      .map((entry) => `
        <tr>
          <td>${escapeHtml(formatDate(entry.date))}</td>
          <td>${escapeHtml(formatHours(entry.hours))}</td>
          <td>${escapeHtml(formatCurrency(entry.amount))}</td>
          <td>${escapeHtml(entry.note || '-')}</td>
          <td>
            <button type="button" class="action-btn" data-edit-historical-id="${escapeHtml(entry.id)}">Ред.</button>
            <button type="button" class="action-btn danger" data-delete-historical-id="${escapeHtml(entry.id)}">Удалить</button>
          </td>
        </tr>
      `)
      .join('');
  }

  function handleExportHistoricalCsv() {
    const entries = getHistoricalEntriesSorted();

    if (!entries.length) {
      setMessage(els.historicalMessage, 'Нет архивных записей для экспорта.', 'error');
      return;
    }

    const headers = ['Дата', 'Часы', 'Сумма', 'Комментарий', 'Источник', 'createdAt'];
    const rows = entries.map((entry) => [
      formatDate(entry.date),
      String(entry.hours),
      String(entry.amount),
      entry.note,
      entry.source,
      entry.createdAt
    ]);

    exportCsv(headers, rows, `historical-${toInputDate(new Date())}.csv`);
    setMessage(els.historicalMessage, 'CSV архива сформирован.', 'success');
  }
  function handleDownloadBackup() {
    const backup = {
      exportedAt: new Date().toISOString(),
      version: 1,
      jobs: state.jobs,
      clients: state.clients,
      expenses: state.expenses,
      historicalEntries: state.historicalEntries,
      appSettings: state.appSettings,
      serviceSettings: state.serviceSettings,
      uiState: state.ui
    };

    const fileName = `volvo-bl71b-backup-${toInputDate(new Date())}.json`;
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    setMessage(els.backupMessage, 'Резервная копия создана.', 'success');
  }

  async function handleRestoreBackup(event) {
    const fileInput = event.target;
    const file = fileInput.files && fileInput.files[0];

    if (!file) {
      return;
    }

    if (!window.confirm('Текущие данные будут заменены. Продолжить?')) {
      fileInput.value = '';
      return;
    }

    try {
      const rawText = await file.text();
      const parsed = safeJsonParse(rawText, null);

      if (!parsed || typeof parsed !== 'object') {
        throw new Error('invalid-json');
      }

      applyBackupData(parsed);
      renderAll();
      syncUiFilters();
      applyUiStateSection();
      setMessage(els.backupMessage, 'Данные успешно восстановлены.', 'success');
    } catch (_error) {
      setMessage(els.backupMessage, 'Не удалось восстановить данные: проверьте JSON-файл.', 'error');
    } finally {
      fileInput.value = '';
    }
  }

  function applyBackupData(backup) {
    if (!Array.isArray(backup.jobs) || !Array.isArray(backup.expenses) || !Array.isArray(backup.historicalEntries)) {
      throw new Error('invalid-structure');
    }

    const defaultFuelPrice = getCurrentFuelPriceNumber();

    state.jobs = backup.jobs
      .map((raw) => normalizeJob(raw, defaultFuelPrice))
      .filter((job) => job && isCoreJobValid(job));

    state.expenses = backup.expenses
      .map(normalizeExpense)
      .filter((item) => item && isExpenseValid(item));

    state.historicalEntries = backup.historicalEntries
      .map(normalizeHistoricalEntry)
      .filter((item) => item && isHistoricalEntryValid(item));

    state.appSettings = backup.appSettings && typeof backup.appSettings === 'object'
      ? { version: Number.isFinite(Number(backup.appSettings.version)) ? Number(backup.appSettings.version) : 1 }
      : { version: 1 };

    state.serviceSettings = normalizeServiceSettings(backup.serviceSettings, state.jobs);

    const uiStateCandidate = backup.uiState && typeof backup.uiState === 'object' ? backup.uiState : null;
    state.ui = uiStateCandidate
      ? {
          section: getValidSection(uiStateCandidate.section),
          historyRange: String(uiStateCandidate.historyRange || 'all'),
          historyPaymentFilter: String(uiStateCandidate.historyPaymentFilter || 'all'),
          expenseRange: String(uiStateCandidate.expenseRange || 'all'),
          expenseCategory: String(uiStateCandidate.expenseCategory || 'all')
        }
      : loadUiState();

    state.clients = Array.isArray(backup.clients)
      ? backup.clients.map((client) => ({
          name: String(client.name || '').trim(),
          phone: String(client.phone || '').trim(),
          requestsCount: toNonNegativeNumber(client.requestsCount),
          totalAmount: round2(toNonNegativeNumber(client.totalAmount)),
          totalNetProfit: round2(toNonNegativeNumber(client.totalNetProfit))
        }))
      : deriveClients(state.jobs);

    persistJobs();
    persistExpenses();
    persistHistoricalEntries();
    persistClients();
    persistAppSettings();
    persistServiceSettings();
    persistUiState();
  }
  function renderClients() {
    if (!state.clients.length) {
      els.clientsList.innerHTML = '<div class="empty-state">Пока нет клиентов.</div>';
      return;
    }

    els.clientsList.innerHTML = state.clients
      .map((client) => `
        <article class="client-item">
          <div class="client-item-head">
            <strong>${escapeHtml(client.name)}</strong>
            <span>${escapeHtml(formatCurrency(client.totalAmount))}</span>
          </div>
          <div class="client-meta">
            <div>${escapeHtml(client.phone)}</div>
            <div>Заявок: ${escapeHtml(String(client.requestsCount))}</div>
            <div>Чистая прибыль: ${escapeHtml(formatCurrency(client.totalNetProfit))}</div>
          </div>
        </article>
      `)
      .join('');
  }

  function handleExportClientsCsv() {
    if (!state.clients.length) {
      setMessage(els.clientsMessage, 'Нет клиентов для экспорта.', 'error');
      return;
    }

    const headers = ['Имя', 'Телефон', 'Количество заявок', 'Выручка', 'Чистая прибыль'];
    const rows = state.clients.map((client) => [
      client.name,
      client.phone,
      String(client.requestsCount),
      String(client.totalAmount),
      String(client.totalNetProfit)
    ]);

    exportCsv(headers, rows, `clients-${toInputDate(new Date())}.csv`);
    setMessage(els.clientsMessage, 'CSV клиентов сформирован.', 'success');
  }

  function deriveClients(jobs) {
    const map = new Map();

    jobs.forEach((job) => {
      const key = normalizePhone(job.phone) || job.name.toLowerCase();

      if (!map.has(key)) {
        map.set(key, {
          name: job.name,
          phone: job.phone,
          requestsCount: 0,
          totalAmount: 0,
          totalNetProfit: 0
        });
      }

      const client = map.get(key);
      client.requestsCount += 1;
      client.totalAmount += job.amount;
      client.totalNetProfit += job.jobNetProfit;

      if (!client.name && job.name) {
        client.name = job.name;
      }

      if (!client.phone && job.phone) {
        client.phone = job.phone;
      }
    });

    return Array.from(map.values()).sort((a, b) => b.totalAmount - a.totalAmount);
  }

  function populateExpenseJobOptions() {
    const previousValue = els.expenseForm.elements.relatedJobId.value;
    const sortedJobs = getSortedJobsByDate(state.jobs, 'desc').slice(0, 100);

    const options = ['<option value="">Без привязки</option>']
      .concat(
        sortedJobs.map((job) => `<option value="${escapeHtml(job.id)}">${escapeHtml(formatDate(job.date))} - ${escapeHtml(job.name)} - ${escapeHtml(formatCurrency(job.amount))}</option>`)
      );

    els.expenseRelatedJobId.innerHTML = options.join('');

    if (previousValue && sortedJobs.some((job) => job.id === previousValue)) {
      els.expenseForm.elements.relatedJobId.value = previousValue;
    }
  }

  function syncDerivedJobFields() {
    const defaultFuelPrice = getCurrentFuelPriceNumber();
    let jobsChanged = false;

    state.jobs = state.jobs.map((job) => {
      const normalized = normalizeJob(job, defaultFuelPrice);
      if (fingerprintJob(job) !== fingerprintJob(normalized)) {
        jobsChanged = true;
      }
      return normalized;
    });

    const serviceChanged = syncServiceSettingsFromJobs();

    if (jobsChanged) {
      persistJobs();
    }

    if (serviceChanged) {
      persistServiceSettings();
    }
  }

  function fingerprintJob(job) {
    return [
      job.id,
      job.name,
      job.phone,
      job.date,
      job.workType,
      job.address,
      job.hours,
      job.amount,
      job.fuelLiters,
      job.fuelPrice,
      job.fuelCost,
      job.operatorRate,
      job.operatorPay,
      job.operatorPayMode,
      job.jobNetProfit,
      job.currentHours,
      job.paid,
      job.paidAt,
      job.comment,
      job.status,
      job.createdAt
    ].join('|');
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

        if (!els.jobForm.elements.fuelPrice.value) {
          els.jobForm.elements.fuelPrice.value = String(result.price);
          renderJobPreview();
        }

        return;
      } catch (_error) {
        // Переход к следующему провайдеру.
      }
    }

    if (cache) {
      renderFuel(cache.price, `${cache.source} (кэш)`, cache.fetchedAt, true);
      els.fuelMeta.textContent = `Внешний источник недоступен. Показаны кэш-данные от ${formatDateTime(cache.fetchedAt)}.`;
      return;
    }

    els.fuelPrice.textContent = '-';
    els.fuelMeta.textContent = 'Источник цены недоступен. Используется дефолтная цена 56 ₽/л.';
  }

  function renderFuel(price, source, fetchedAt, fromCache) {
    els.fuelPrice.textContent = `${formatDecimal(price)} ₽/л`;
    els.fuelMeta.textContent = `${fromCache ? 'Кэш' : 'Источник'}: ${source}. Обновлено: ${formatDateTime(fetchedAt)}.`;
  }

  function loadJobs(defaultFuelPrice) {
    const stored = safeJsonParse(localStorage.getItem(STORAGE_KEYS.jobs), null);
    const legacy = safeJsonParse(localStorage.getItem(STORAGE_KEYS.legacyJobs), null);

    const source = Array.isArray(stored) ? stored : (Array.isArray(legacy) ? legacy : []);

    return source
      .map((raw) => normalizeJob(raw, defaultFuelPrice))
      .filter((job) => job && isCoreJobValid(job));
  }

  function normalizeJob(raw, defaultFuelPrice) {
    if (!raw || typeof raw !== 'object') {
      return null;
    }

    const hours = toNonNegativeNumber(raw.hours);
    const amount = toNonNegativeNumber(raw.amount);

    const fuelLiters = Number.isFinite(toOptionalNonNegativeNumber(raw.fuelLiters))
      ? toOptionalNonNegativeNumber(raw.fuelLiters)
      : round2(hours * DEFAULT_FUEL_CONSUMPTION_PER_HOUR);

    const fuelPrice = Number.isFinite(toOptionalPositiveNumber(raw.fuelPrice))
      ? toOptionalPositiveNumber(raw.fuelPrice)
      : (Number.isFinite(defaultFuelPrice) && defaultFuelPrice > 0 ? defaultFuelPrice : DEFAULT_FUEL_PRICE);

    const fuelCost = round2(fuelLiters * fuelPrice);

    const operatorRate = Number.isFinite(toOptionalNonNegativeNumber(raw.operatorRate))
      ? toOptionalNonNegativeNumber(raw.operatorRate)
      : DEFAULT_OPERATOR_RATE;

    const operatorPayMode = raw.operatorPayMode === OPERATOR_PAY_MODES.manual ? OPERATOR_PAY_MODES.manual : OPERATOR_PAY_MODES.auto;

    const operatorPayRaw = toOptionalNonNegativeNumber(raw.operatorPay);
    const operatorPay = operatorPayMode === OPERATOR_PAY_MODES.auto
      ? round2(operatorRate * hours)
      : round2(Number.isFinite(operatorPayRaw) ? operatorPayRaw : 0);

    const jobNetProfit = round2(amount - fuelCost - operatorPay);
    const status = resolveStatus(raw.status, raw.date);

    const currentHoursRaw = toOptionalNonNegativeNumber(raw.currentHours);
    const currentHours = Number.isFinite(currentHoursRaw) ? round2(currentHoursRaw) : null;
    const paid = raw.paid === true;
    const paidAt = paid ? String(raw.paidAt || raw.createdAt || new Date().toISOString()) : null;

    return {
      id: String(raw.id || createId('job')),
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

      operatorRate,
      operatorPay,
      operatorPayMode,

      jobNetProfit,
      currentHours,
      paid,
      paidAt,
      comment: String(raw.comment || '').trim(),
      status,
      createdAt: raw.createdAt ? String(raw.createdAt) : new Date().toISOString()
    };
  }

  function isCoreJobValid(job) {
    return Boolean(
      job.name &&
      job.phone &&
      job.date &&
      job.workType &&
      job.address &&
      Number.isFinite(job.hours) &&
      Number.isFinite(job.amount)
    );
  }

  function loadExpenses() {
    const raw = safeJsonParse(localStorage.getItem(STORAGE_KEYS.expenses), []);
    if (!Array.isArray(raw)) {
      return [];
    }

    return raw
      .map(normalizeExpense)
      .filter((item) => item && isExpenseValid(item));
  }

  function normalizeExpense(raw) {
    if (!raw || typeof raw !== 'object') {
      return null;
    }

    const category = EXPENSE_CATEGORIES.includes(String(raw.category || '').trim())
      ? String(raw.category).trim()
      : 'other';

    return {
      id: String(raw.id || createId('exp')),
      date: String(raw.date || '').trim(),
      category,
      title: String(raw.title || '').trim(),
      amount: round2(toNonNegativeNumber(raw.amount)),
      relatedJobId: String(raw.relatedJobId || '').trim(),
      comment: String(raw.comment || '').trim(),
      createdAt: raw.createdAt ? String(raw.createdAt) : new Date().toISOString()
    };
  }


  function loadHistoricalEntries() {
    const raw = safeJsonParse(localStorage.getItem(STORAGE_KEYS.historicalEntries), []);
    if (!Array.isArray(raw)) {
      return [];
    }

    return raw
      .map(normalizeHistoricalEntry)
      .filter((item) => item && isHistoricalEntryValid(item));
  }

  function normalizeHistoricalEntry(raw) {
    if (!raw || typeof raw !== 'object') {
      return null;
    }

    return {
      id: String(raw.id || createId('hist')),
      date: String(raw.date || '').trim(),
      hours: round2(toNonNegativeNumber(raw.hours)),
      amount: round2(toNonNegativeNumber(raw.amount)),
      note: String(raw.note || '').trim(),
      source: HISTORICAL_SOURCE,
      createdAt: raw.createdAt ? String(raw.createdAt) : new Date().toISOString()
    };
  }
  function loadAppSettings() {
    const parsed = safeJsonParse(localStorage.getItem(STORAGE_KEYS.appSettings), null);
    if (!parsed || typeof parsed !== 'object') {
      return { version: 1 };
    }

    return {
      version: Number.isFinite(Number(parsed.version)) ? Number(parsed.version) : 1
    };
  }

  function loadServiceSettings(jobs) {
    const parsed = safeJsonParse(localStorage.getItem(STORAGE_KEYS.serviceSettings), null);
    return normalizeServiceSettings(parsed, jobs);
  }

  function normalizeServiceSettings(raw, jobs) {
    const maxCurrentHoursFromJobs = getMaxCurrentHoursFromJobs(jobs);

    const intervalRaw = raw && typeof raw === 'object'
      ? toOptionalPositiveNumber(raw.serviceIntervalHours)
      : NaN;
    const lastRaw = raw && typeof raw === 'object'
      ? toOptionalNonNegativeNumber(raw.lastServiceHours)
      : NaN;
    const currentRaw = raw && typeof raw === 'object'
      ? toOptionalNonNegativeNumber(raw.currentMachineHours)
      : NaN;

    const serviceIntervalHours = Number.isFinite(intervalRaw)
      ? round2(intervalRaw)
      : DEFAULT_SERVICE_SETTINGS.serviceIntervalHours;
    const currentMachineHours = Math.max(
      Number.isFinite(currentRaw) ? round2(currentRaw) : DEFAULT_SERVICE_SETTINGS.currentMachineHours,
      maxCurrentHoursFromJobs
    );

    const lastServiceHours = Number.isFinite(lastRaw)
      ? Math.min(round2(lastRaw), currentMachineHours)
      : DEFAULT_SERVICE_SETTINGS.lastServiceHours;

    return {
      serviceIntervalHours,
      lastServiceHours,
      currentMachineHours
    };
  }

  function syncServiceSettingsFromJobs() {
    const maxCurrentHoursFromJobs = getMaxCurrentHoursFromJobs(state.jobs);
    if (maxCurrentHoursFromJobs > toNonNegativeNumber(state.serviceSettings.currentMachineHours)) {
      state.serviceSettings.currentMachineHours = maxCurrentHoursFromJobs;
      return true;
    }
    return false;
  }

  function getMaxCurrentHoursFromJobs(jobs) {
    return round2((Array.isArray(jobs) ? jobs : [])
      .filter((job) => job.status === STATUSES.completed)
      .reduce((max, job) => {
        const value = toOptionalNonNegativeNumber(job.currentHours);
        return Number.isFinite(value) && value > max ? value : max;
      }, 0));
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

  function loadUiState() {
    const parsed = safeJsonParse(localStorage.getItem(STORAGE_KEYS.ui), null);

    if (!parsed || typeof parsed !== 'object') {
      return {
        section: 'dashboard',
        historyRange: 'all',
        historyPaymentFilter: 'all',
        expenseRange: 'all',
        expenseCategory: 'all'
      };
    }

    return {
      section: getValidSection(parsed.section),
      historyRange: String(parsed.historyRange || 'all'),
      historyPaymentFilter: String(parsed.historyPaymentFilter || 'all'),
      expenseRange: String(parsed.expenseRange || 'all'),
      expenseCategory: String(parsed.expenseCategory || 'all')
    };
  }

  function persistJobs() {
    localStorage.setItem(STORAGE_KEYS.jobs, JSON.stringify(state.jobs));
  }

  function persistClients() {
    localStorage.setItem(STORAGE_KEYS.clients, JSON.stringify(state.clients));
  }

  function persistAppSettings() {
    localStorage.setItem(STORAGE_KEYS.appSettings, JSON.stringify(state.appSettings));
  }

  function persistServiceSettings() {
    localStorage.setItem(STORAGE_KEYS.serviceSettings, JSON.stringify(state.serviceSettings));
  }

  function persistExpenses() {
    localStorage.setItem(STORAGE_KEYS.expenses, JSON.stringify(state.expenses));
  }


  function persistHistoricalEntries() {
    localStorage.setItem(STORAGE_KEYS.historicalEntries, JSON.stringify(state.historicalEntries));
  }
  function persistFuelCache() {
    if (state.fuelCache) {
      localStorage.setItem(STORAGE_KEYS.fuel, JSON.stringify(state.fuelCache));
    }
  }

  function persistUiState() {
    localStorage.setItem(STORAGE_KEYS.ui, JSON.stringify(state.ui));
  }

  function getCurrentFuelPriceNumber() {
    if (state.fuelCache && Number.isFinite(state.fuelCache.price) && state.fuelCache.price > 0) {
      return state.fuelCache.price;
    }
    return DEFAULT_FUEL_PRICE;
  }

  function getSortedJobsByDate(jobs, direction) {
    const factor = direction === 'asc' ? 1 : -1;

    return [...jobs].sort((a, b) => {
      const dateA = parseDate(a.date);
      const dateB = parseDate(b.date);
      const tsA = dateA ? dateA.getTime() : 0;
      const tsB = dateB ? dateB.getTime() : 0;

      if (tsA !== tsB) {
        return (tsA - tsB) * factor;
      }

      const createdA = new Date(a.createdAt || 0).getTime();
      const createdB = new Date(b.createdAt || 0).getTime();
      return (createdA - createdB) * factor;
    });
  }

  function resolveStatus(rawStatus, dateInput) {
    if (isDateBeforeToday(dateInput)) {
      return STATUSES.completed;
    }

    return rawStatus === STATUSES.completed ? STATUSES.completed : STATUSES.planned;
  }

  function isDateBeforeToday(dateInput) {
    const date = parseDate(dateInput);
    if (!date) {
      return false;
    }

    const today = startOfLocalDay(new Date());
    return date < today;
  }

  function filterByCategory(items, category) {
    return items.filter((item) => item.category === category);
  }

  function sumBy(items, field) {
    return round2(items.reduce((sum, item) => sum + toNonNegativeNumber(item[field]), 0));
  }

  function sumAmount(items) {
    return round2(items.reduce((sum, item) => sum + toNonNegativeNumber(item.amount), 0));
  }

  function exportCsv(headers, rows, fileName) {
    const delimiter = ';';
    const excelSeparatorHint = `sep=${delimiter}`;

    const csvBody = [headers, ...rows]
      .map((row) => row.map(csvEscape).join(delimiter))
      .join('\r\n');

    const csv = `\uFEFF${excelSeparatorHint}\r\n${csvBody}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
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

  function parseDate(input) {
    if (!input) {
      return null;
    }

    const date = new Date(`${input}T00:00:00`);
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

  function formatDate(input) {
    const date = parseDate(input);
    if (!date) {
      return '-';
    }

    return new Intl.DateTimeFormat('ru-RU').format(date);
  }

  function formatLongDate(input) {
    const date = parseDate(input);
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

  function toPositiveOrDefault(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : fallback;
  }

  function round2(value) {
    return Math.round(Number(value) * 100) / 100;
  }

  function createId(prefix) {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return `${prefix}_${window.crypto.randomUUID()}`;
    }
    return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
  }

  function csvEscape(value) {
    const normalized = String(value ?? '')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/"/g, '""');

    return `"${normalized}"`;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
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

  function getMinutesDiff(from, to) {
    return Math.abs((to.getTime() - from.getTime()) / 60000);
  }

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
        // fallback to next url
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

    const patterns = [
      /(?:дт|дизел[ья])[^0-9]{0,80}(\d{2,3}(?:[\.,]\d{1,2})?)/i,
      /(?:цена|стоимост[ьи]|средн\w*)[^0-9]{0,80}(\d{2,3}(?:[\.,]\d{1,2})?)/i
    ];

    for (const pattern of patterns) {
      const match = plain.match(pattern) || raw.match(pattern);
      if (match && match[1]) {
        const value = toFuelNumber(match[1]);
        if (Number.isFinite(value) && value >= 35 && value <= 120) {
          return value;
        }
      }
    }

    const candidates = Array.from(raw.matchAll(/(\d{2,3}(?:[\.,]\d{1,2})?)\s*(?:₽|руб)/gi)).map((m) => m[1]);
    return pickPlausibleFuelPrice(candidates);
  }

  function pickPlausibleFuelPrice(values) {
    const numbers = values
      .map(toFuelNumber)
      .filter((value) => Number.isFinite(value) && value >= 35 && value <= 120);

    if (!numbers.length) {
      return null;
    }

    const last = numbers[numbers.length - 1];
    return Number(last.toFixed(2));
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

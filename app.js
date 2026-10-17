/**
 * LifeOS Main Application Controller
 * Handles Navigation, UI Rendering, Modals, Charts, Event Handlers
 */

const LifeApp = (() => {
  // Current active navigation tab
  let currentTab = 'dashboard';
  let hideBalances = false;

  // Chart instances
  let expenseChartInstance = null;
  let cashFlowChartInstance = null;

  // Statement import temporary buffer
  let importedTransactionsBuffer = [];

  // DOM Elements cache
  let dom = {};

  function init() {
    cacheDom();
    bindGlobalEvents();
    initTheme();
    checkLockState();
  }

  function cacheDom() {
    dom = {
      appRoot: document.getElementById('app-root'),
      lockModal: document.getElementById('lock-screen-modal'),
      lockTitle: document.getElementById('lock-screen-title'),
      lockSubtitle: document.getElementById('lock-screen-subtitle'),
      lockForm: document.getElementById('lock-form'),
      lockPasswordInput: document.getElementById('lock-password-input'),
      lockPasswordConfirmGroup: document.getElementById('lock-password-confirm-group'),
      lockPasswordConfirmInput: document.getElementById('lock-password-confirm-input'),
      lockSubmitBtn: document.getElementById('lock-submit-btn'),
      lockErrorMsg: document.getElementById('lock-error-msg'),
      mainContent: document.getElementById('main-content'),
      currentGreeting: document.getElementById('header-greeting'),
      currentDateTicker: document.getElementById('header-date-ticker'),
      quickLockBtn: document.getElementById('btn-quick-lock'),
      themeToggleBtn: document.getElementById('btn-toggle-theme'),
      toggleBalanceBtn: document.getElementById('btn-toggle-balance'),
      toastContainer: document.getElementById('toast-container'),
      // Navigation containers
      sidebarNavLinks: document.querySelectorAll('.sidebar-nav-link'),
      bottomNavLinks: document.querySelectorAll('.bottom-nav-link'),
      tabViews: document.querySelectorAll('.tab-view')
    };
  }

  // Vietnamese currency formatter
  function formatMoney(amount, currency = '₫') {
    if (hideBalances) return '••••••';
    if (amount === undefined || amount === null || isNaN(amount)) return `0 ${currency}`;
    const formatted = Math.round(amount).toLocaleString('vi-VN');
    return `${formatted} ${currency}`;
  }

  // Toast notifications
  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    const bgColors = {
      success: 'bg-emerald-600 text-white',
      error: 'bg-rose-600 text-white',
      warning: 'bg-amber-600 text-white',
      info: 'bg-indigo-600 text-white'
    };
    const iconName = {
      success: 'check-circle-2',
      error: 'alert-triangle',
      warning: 'alert-circle',
      info: 'info'
    }[type] || 'info';

    toast.className = `flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl transition-all duration-300 transform translate-y-2 opacity-0 text-sm font-medium ${bgColors[type] || bgColors.info}`;
    toast.innerHTML = `
      <i data-lucide="${iconName}" class="w-5 h-5 flex-shrink-0"></i>
      <span>${escapeHtml(message)}</span>
    `;

    dom.toastContainer.appendChild(toast);
    if (window.lucide) lucide.createIcons({ root: toast });

    requestAnimationFrame(() => {
      toast.classList.remove('translate-y-2', 'opacity-0');
    });

    setTimeout(() => {
      toast.classList.add('opacity-0', 'translate-x-full');
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // Confetti celebration
  function triggerCelebration() {
    if (window.confetti) {
      window.confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6']
      });
    }
  }

  // Theme setup
  function initTheme() {
    const publicSettings = LifeStorage.getPublicSettings();
    if (publicSettings.theme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }
  }

  function toggleTheme() {
    const isDark = document.documentElement.classList.contains('dark');
    const newTheme = isDark ? 'light' : 'dark';
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    LifeStorage.setPublicSettings({ theme: newTheme });

    const state = LifeStorage.getState();
    if (state) {
      state.settings.theme = newTheme;
      LifeStorage.saveState();
    }
    renderCharts();
  }

  // Header Greetings & Clock
  function updateHeaderGreeting() {
    const now = new Date();
    const hour = now.getHours();
    let greeting = 'Chào buổi tối 🌙';
    if (hour >= 5 && hour < 11) greeting = 'Chào buổi sáng ☀️';
    else if (hour >= 11 && hour < 14) greeting = 'Chào buổi trưa 🌤️';
    else if (hour >= 14 && hour < 18) greeting = 'Chào buổi chiều ☕';

    if (dom.currentGreeting) dom.currentGreeting.textContent = greeting;

    const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const dayName = days[now.getDay()];
    const dateFormatted = `${dayName}, ${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;
    if (dom.currentDateTicker) dom.currentDateTicker.textContent = dateFormatted;
  }

  // Check Lock State & Handle UI
  function checkLockState() {
    updateHeaderGreeting();
    const hasVault = LifeStorage.hasVault();

    if (LifeStorage.isLocked()) {
      dom.lockModal.classList.remove('hidden');
      dom.lockErrorMsg.classList.add('hidden');
      dom.lockPasswordInput.value = '';
      if (dom.lockPasswordConfirmInput) dom.lockPasswordConfirmInput.value = '';

      if (!hasVault) {
        // Setup Mode
        dom.lockTitle.textContent = 'Khởi tạo Mật khẩu Bảo vệ LifeOS';
        dom.lockSubtitle.textContent = 'Thiết lập Master Password để mã hóa toàn bộ dữ liệu (AES-GCM 256). Mật khẩu này không lưu trên bất kỳ máy chủ nào!';
        dom.lockPasswordConfirmGroup.classList.remove('hidden');
        dom.lockSubmitBtn.textContent = 'Kích hoạt LifeOS';
      } else {
        // Unlock Mode
        dom.lockTitle.textContent = 'Mở khóa LifeOS';
        dom.lockSubtitle.textContent = 'Nhập Master Password để giải mã dữ liệu cá nhân của bạn';
        dom.lockPasswordConfirmGroup.classList.add('hidden');
        dom.lockSubmitBtn.textContent = 'Mở khóa ngay';
      }

      setTimeout(() => dom.lockPasswordInput.focus(), 150);
    } else {
      dom.lockModal.classList.add('hidden');
      renderCurrentTab();
      checkUrlParameters();
    }
  }

  // Pending SMS buffer if app is locked when URL opens
  let pendingAutoSMS = null;

  // Auto detect ?sms= or ?text= from iPhone Shortcuts or shared text
  async function checkUrlParameters() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const incomingSMS = urlParams.get('sms') || urlParams.get('text');
      if (!incomingSMS) return;

      const rawText = decodeURIComponent(incomingSMS).trim();
      // Clean URL immediately to prevent duplicate parsing on manual browser reload
      window.history.replaceState({}, document.title, window.location.pathname);

      if (LifeStorage.isLocked()) {
        pendingAutoSMS = rawText;
        showToast('🔒 Đã nhận giao dịch! Vui lòng nhập mật khẩu để tự động lưu vào sổ.', 'info');
        return;
      }

      await autoProcessIncomingSMS(rawText);
    } catch (e) {
      console.warn('URL parameter auto-process:', e);
    }
  }

  // Auto-parse & Auto-save directly into wallet with ZERO manual clicks
  async function autoProcessIncomingSMS(rawText) {
    if (!rawText) return;
    try {
      const parsed = LifeParser.parseSMS(rawText);
      if (!parsed || !parsed.success) {
        showToast('⚠️ Không nhận diện được số tiền trong thông báo.', 'warning');
        return;
      }

      const state = LifeStorage.getState();
      if (!state || !state.wallets) return;

      // 1. Auto match target wallet (Prioritize MB Bank)
      let targetWallet = null;
      if (parsed.bankCode) {
        targetWallet = state.wallets.find(w => w.bankCode === parsed.bankCode);
      }
      if (!targetWallet) {
        targetWallet = state.wallets.find(w => 
          w.name.toLowerCase().includes('mb') || 
          w.name.includes('085') ||
          (w.bankCode && w.bankCode.toLowerCase().includes('mb'))
        );
      }
      if (!targetWallet && state.wallets.length > 0) {
        targetWallet = state.wallets[0];
      }

      // If no wallet exists yet, auto-create MB Bank wallet
      if (!targetWallet) {
        targetWallet = {
          id: 'w_mb_' + Date.now(),
          name: 'MB Bank',
          bankCode: 'MB',
          balance: parsed.newBalance !== null ? parsed.newBalance : 0,
          color: '#2563eb',
          icon: 'landmark'
        };
        state.wallets.push(targetWallet);
      }

      // 2. Auto create transaction record
      const newTx = {
        id: 'tx_auto_' + Date.now(),
        walletId: targetWallet.id,
        type: parsed.type,
        amount: parsed.amount,
        category: parsed.category || 'other',
        date: parsed.date,
        time: parsed.time,
        note: parsed.description || (parsed.bank ? parsed.bank + ' Giao dịch' : 'MB Bank'),
        source: 'sms'
      };

      state.transactions.unshift(newTx);

      // 3. Auto update wallet balance
      if (parsed.newBalance !== null && parsed.newBalance !== undefined) {
        targetWallet.balance = parsed.newBalance;
      } else {
        if (parsed.type === 'income') {
          targetWallet.balance += parsed.amount;
        } else {
          targetWallet.balance -= parsed.amount;
        }
      }

      // 4. Save state encrypted & notify
      await LifeStorage.saveState();
      triggerCelebration();

      const typeSign = parsed.type === 'income' ? '+' : '-';
      const catObj = LifeParser.CATEGORIES.find(c => c.id === parsed.category);
      const catName = catObj ? ` (${catObj.name})` : '';

      showToast(
        `⚡ ĐÃ TỰ ĐỘNG LƯU: ${typeSign}${formatMoney(parsed.amount)}${catName} vào ví ${targetWallet.name}!`,
        'success'
      );

      // Render updated UI
      renderCurrentTab();
    } catch (err) {
      console.error('Auto process SMS error:', err);
      showToast('Lỗi tự động lưu: ' + err.message, 'error');
    }
  }

  // Master Lock Form Submission
  async function handleLockSubmit(e) {
    e.preventDefault();
    const password = dom.lockPasswordInput.value.trim();
    dom.lockErrorMsg.classList.add('hidden');

    if (!password) {
      showLockError('Vui lòng nhập mật khẩu!');
      return;
    }

    const hasVault = LifeStorage.hasVault();

    try {
      if (!hasVault) {
        // First-time setup
        const confirmPass = dom.lockPasswordConfirmInput.value.trim();
        if (password.length < 4) {
          showLockError('Mật khẩu tối thiểu 4 ký tự!');
          return;
        }
        if (password !== confirmPass) {
          showLockError('Mật khẩu xác nhận không trùng khớp!');
          return;
        }

        await LifeStorage.initVault(password);
        showToast('Khởi tạo LifeOS thành công! Dữ liệu của bạn đã được mã hóa an toàn.');
      } else {
        // Unlock
        await LifeStorage.unlockVault(password);
        showToast('Mở khóa thành công!');
      }

      dom.lockModal.classList.add('hidden');
      renderCurrentTab();

      // Process any pending SMS queued while locked
      if (pendingAutoSMS) {
        const textToProcess = pendingAutoSMS;
        pendingAutoSMS = null;
        setTimeout(() => autoProcessIncomingSMS(textToProcess), 300);
      }
    } catch (err) {
      showLockError(err.message || 'Mật khẩu không đúng!');
      const card = dom.lockModal.querySelector('.glass-panel');
      card.classList.add('animate-shake');
      setTimeout(() => card.classList.remove('animate-shake'), 450);
    }
  }

  function showLockError(msg) {
    dom.lockErrorMsg.textContent = msg;
    dom.lockErrorMsg.classList.remove('hidden');
  }

  // Navigation switching
  function switchTab(tabId) {
    currentTab = tabId;

    // Update Desktop Sidebar
    dom.sidebarNavLinks.forEach(link => {
      const target = link.getAttribute('data-tab');
      if (target === tabId) {
        link.className = 'sidebar-nav-link flex items-center gap-3 px-4 py-3 rounded-xl font-semibold bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 transition-all';
      } else {
        link.className = 'sidebar-nav-link flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all';
      }
    });

    // Update Mobile Bottom Bar
    dom.bottomNavLinks.forEach(link => {
      const target = link.getAttribute('data-tab');
      if (target === tabId) {
        link.className = 'bottom-nav-link flex flex-col items-center justify-center text-xs font-semibold text-indigo-600 dark:text-indigo-400';
      } else {
        link.className = 'bottom-nav-link flex flex-col items-center justify-center text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-indigo-600';
      }
    });

    // Toggle Views
    dom.tabViews.forEach(view => {
      if (view.id === `view-${tabId}`) {
        view.classList.remove('hidden');
      } else {
        view.classList.add('hidden');
      }
    });

    renderCurrentTab();
  }

  function renderCurrentTab() {
    if (LifeStorage.isLocked()) return;

    if (currentTab === 'dashboard') renderDashboard();
    else if (currentTab === 'finance') renderFinance();
    else if (currentTab === 'tasks') renderTasks();
    else if (currentTab === 'habits') renderHabits();
    else if (currentTab === 'notes') renderNotes();
    else if (currentTab === 'settings') renderSettings();

    if (window.lucide) lucide.createIcons();
  }

  // ============================================================================
  // TAB 1: DASHBOARD
  // ============================================================================
  function renderDashboard() {
    const state = LifeStorage.getState();
    if (!state) return;

    const todayStr = new Date().toISOString().slice(0, 10);
    const currentMonthStr = todayStr.slice(0, 7);

    // 1. Calculate Total Balance across all wallets
    let totalBalance = state.wallets.reduce((sum, w) => sum + (w.balance || 0), 0);

    // 2. Calculate Monthly Income & Expense
    let monthIncome = 0;
    let monthExpense = 0;

    state.transactions.forEach(tx => {
      if (tx.date && tx.date.startsWith(currentMonthStr)) {
        if (tx.type === 'income') monthIncome += tx.amount || 0;
        else if (tx.type === 'expense') monthExpense += tx.amount || 0;
      }
    });

    const netCashFlow = monthIncome - monthExpense;

    // Render Financial Summary Cards
    const totalBalEl = document.getElementById('dash-total-balance');
    const monthIncEl = document.getElementById('dash-month-income');
    const monthExpEl = document.getElementById('dash-month-expense');
    const netFlowEl = document.getElementById('dash-net-flow');

    if (totalBalEl) totalBalEl.textContent = formatMoney(totalBalance);
    if (monthIncEl) monthIncEl.textContent = `+${formatMoney(monthIncome)}`;
    if (monthExpEl) monthExpEl.textContent = `-${formatMoney(monthExpense)}`;
    if (netFlowEl) {
      netFlowEl.textContent = `${netCashFlow >= 0 ? '+' : ''}${formatMoney(netCashFlow)}`;
      netFlowEl.className = `font-bold text-lg ${netCashFlow >= 0 ? 'text-emerald-500' : 'text-rose-500'}`;
    }

    // Render Wallets Mini List
    const walletListEl = document.getElementById('dash-wallets-list');
    if (walletListEl) {
      if (state.wallets.length === 0) {
        walletListEl.innerHTML = `<p class="text-sm text-slate-500 py-2">Chưa có ví nào. Hãy bấm sang tab Tài chính để thêm ví!</p>`;
      } else {
        walletListEl.innerHTML = state.wallets.map(w => `
          <div class="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 transition-all hover:scale-[1.01]">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-sm" style="background-color: ${w.color || '#3b82f6'};">
                <i data-lucide="${w.icon || 'landmark'}" class="w-5 h-5"></i>
              </div>
              <div>
                <p class="font-semibold text-slate-800 dark:text-slate-100 text-sm">${escapeHtml(w.name)}</p>
                <p class="text-xs text-slate-500 dark:text-slate-400">${w.bankCode || 'VÍ'}</p>
              </div>
            </div>
            <span class="font-bold text-slate-900 dark:text-white text-sm">${formatMoney(w.balance)}</span>
          </div>
        `).join('');
      }
    }

    // Render Today's Tasks Snapshot
    const taskListEl = document.getElementById('dash-today-tasks');
    const todayTasks = state.tasks.filter(t => t.date === todayStr);
    const completedToday = todayTasks.filter(t => t.completed).length;

    if (taskListEl) {
      if (todayTasks.length === 0) {
        taskListEl.innerHTML = `
          <div class="text-center py-6">
            <i data-lucide="sparkles" class="w-8 h-8 mx-auto text-amber-500 mb-2"></i>
            <p class="text-sm text-slate-600 dark:text-slate-300 font-medium">Hôm nay không có việc gấp!</p>
            <button onclick="LifeApp.switchTab('tasks')" class="mt-2 text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">+ Lên lịch việc mới</button>
          </div>
        `;
      } else {
        taskListEl.innerHTML = `
          <div class="flex items-center justify-between mb-3 text-xs text-slate-500">
            <span>Tiến độ: ${completedToday}/${todayTasks.length} việc</span>
            <span class="font-semibold text-indigo-600 dark:text-indigo-400 cursor-pointer" onclick="LifeApp.switchTab('tasks')">Xem tất cả &rarr;</span>
          </div>
          <div class="space-y-2">
            ${todayTasks.slice(0, 4).map(t => `
              <div class="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors">
                <input type="checkbox" ${t.completed ? 'checked' : ''} 
                  onchange="LifeApp.toggleTask('${t.id}')"
                  class="w-5 h-5 rounded-lg text-indigo-600 focus:ring-indigo-500 cursor-pointer border-slate-300 dark:border-slate-600">
                <span class="text-sm font-medium flex-1 ${t.completed ? 'task-completed-title text-slate-400' : 'text-slate-700 dark:text-slate-200'}">${escapeHtml(t.title)}</span>
                <span class="text-[10px] px-2 py-0.5 rounded-full font-semibold ${getPriorityBadgeClass(t.priority)}">${getPriorityLabel(t.priority)}</span>
              </div>
            `).join('')}
          </div>
        `;
      }
    }

    // Render Habits Progress Snapshot
    const habitSnapshotEl = document.getElementById('dash-habits-snapshot');
    if (habitSnapshotEl) {
      const habits = state.habits || [];
      const totalHabits = habits.length;
      const checkedToday = habits.filter(h => h.completedDates && h.completedDates.includes(todayStr)).length;
      const percent = totalHabits > 0 ? Math.round((checkedToday / totalHabits) * 100) : 0;

      habitSnapshotEl.innerHTML = `
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <span class="text-2xl font-black text-indigo-600 dark:text-indigo-400">${percent}%</span>
            <span class="text-xs text-slate-500">Đã hoàn thành hôm nay (${checkedToday}/${totalHabits})</span>
          </div>
          <button onclick="LifeApp.switchTab('habits')" class="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">Chi tiết &rarr;</button>
        </div>
        <div class="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden mb-4">
          <div class="bg-gradient-to-r from-indigo-500 to-emerald-500 h-full rounded-full transition-all duration-500" style="width: ${percent}%"></div>
        </div>
        <div class="grid grid-cols-2 gap-2">
          ${habits.slice(0, 4).map(h => {
            const isDone = h.completedDates && h.completedDates.includes(todayStr);
            return `
              <button onclick="LifeApp.toggleHabit('${h.id}')" class="flex items-center justify-between p-2.5 rounded-xl border transition-all text-left ${isDone ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300' : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-400'}">
                <span class="text-xs font-semibold truncate pr-1">${escapeHtml(h.title)}</span>
                <span class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isDone ? 'bg-emerald-500 text-white' : 'border border-slate-300 dark:border-slate-600 text-slate-400'}">
                  ${isDone ? '✓' : ''}
                </span>
              </button>
            `;
          }).join('')}
        </div>
      `;
    }

    // Render Urgent Bills Reminder Alert Banner
    const billAlertEl = document.getElementById('dash-urgent-bills-alert');
    if (billAlertEl) {
      const todayDay = new Date().getDate();
      const currentMonth = todayStr.slice(0, 7);
      const urgentBills = (state.bills || []).filter(b => {
        const isPaid = b.paidMonths && b.paidMonths.includes(currentMonth);
        if (isPaid) return false;
        const diff = b.dueDay - todayDay;
        return diff <= 5; // Due within 5 days or overdue
      });

      if (urgentBills.length > 0) {
        billAlertEl.classList.remove('hidden');
        billAlertEl.innerHTML = `
          <div class="flex items-center justify-between gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300">
            <div class="flex items-center gap-3">
              <i data-lucide="bell-ring" class="w-6 h-6 text-amber-600 dark:text-amber-400 flex-shrink-0 animate-bounce"></i>
              <div>
                <p class="font-bold text-sm">Bạn có ${urgentBills.length} hóa đơn sắp đến hạn thanh toán!</p>
                <p class="text-xs text-amber-700 dark:text-amber-400/90">${urgentBills.map(b => `${b.title} (${b.dueDay}/${new Date().getMonth() + 1})`).join(', ')}</p>
              </div>
            </div>
            <button onclick="LifeApp.switchTab('tasks')" class="px-3 py-1.5 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 transition-colors shadow-sm flex-shrink-0">
              Kiểm tra ngay
            </button>
          </div>
        `;
      } else {
        billAlertEl.classList.add('hidden');
      }
    }
  }

  // ============================================================================
  // TAB 2: FINANCE & SMART BANKING
  // ============================================================================
  function renderFinance() {
    const state = LifeStorage.getState();
    if (!state) return;

    // Render Wallets Cards
    const walletsGrid = document.getElementById('finance-wallets-grid');
    if (walletsGrid) {
      walletsGrid.innerHTML = state.wallets.map(w => `
        <div class="relative p-5 rounded-2xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 border border-slate-200/80 dark:border-slate-700/80 shadow-sm hover:shadow-md transition-all group">
          <div class="flex items-center justify-between mb-4">
            <div class="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white shadow-md" style="background-color: ${w.color || '#3b82f6'};">
              <i data-lucide="${w.icon || 'landmark'}" class="w-6 h-6"></i>
            </div>
            <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onclick="LifeApp.openEditWalletModal('${w.id}')" title="Sửa ví" class="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500">
                <i data-lucide="edit-3" class="w-4 h-4"></i>
              </button>
              <button onclick="LifeApp.deleteWallet('${w.id}')" title="Xóa ví" class="p-1.5 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-500">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
              </button>
            </div>
          </div>
          <p class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">${escapeHtml(w.bankCode || 'VÍ')}</p>
          <h4 class="font-bold text-slate-800 dark:text-slate-100 text-base mb-1">${escapeHtml(w.name)}</h4>
          <p class="text-xl font-extrabold text-slate-900 dark:text-white">${formatMoney(w.balance)}</p>
        </div>
      `).join('') + `
        <button onclick="LifeApp.openAddWalletModal()" class="flex flex-col items-center justify-center p-5 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all min-h-[140px]">
          <i data-lucide="plus-circle" class="w-8 h-8 mb-2"></i>
          <span class="font-bold text-sm">+ Thêm Ví / Ngân hàng</span>
        </button>
      `;
    }

    // Render Charts
    renderCharts();

    // Render Transactions Table / List
    renderTransactionsList();
  }

  function renderCharts() {
    const state = LifeStorage.getState();
    if (!state) return;

    const isDark = document.documentElement.classList.contains('dark');
    const textColor = isDark ? '#cbd5e1' : '#475569';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)';

    // 1. Doughnut: Expense by Category
    const categoryTotals = {};
    const todayStr = new Date().toISOString().slice(0, 10);
    const curMonth = todayStr.slice(0, 7);

    state.transactions.forEach(t => {
      if (t.type === 'expense' && t.date && t.date.startsWith(curMonth)) {
        const cat = t.category || 'other';
        categoryTotals[cat] = (categoryTotals[cat] || 0) + (t.amount || 0);
      }
    });

    const categoryLabels = [];
    const categoryData = [];
    const categoryColors = [];

    LifeParser.CATEGORIES.forEach(c => {
      if (categoryTotals[c.id]) {
        categoryLabels.push(c.name);
        categoryData.push(categoryTotals[c.id]);
        categoryColors.push(c.color);
      }
    });

    const ctxExpense = document.getElementById('chart-expense-categories');
    if (ctxExpense && window.Chart) {
      if (expenseChartInstance) expenseChartInstance.destroy();

      if (categoryData.length === 0) {
        // Empty state placeholder
        expenseChartInstance = new Chart(ctxExpense, {
          type: 'doughnut',
          data: {
            labels: ['Chưa có chi tiêu'],
            datasets: [{
              data: [1],
              backgroundColor: [isDark ? '#334155' : '#e2e8f0']
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: 'bottom', labels: { color: textColor } }
            }
          }
        });
      } else {
        expenseChartInstance = new Chart(ctxExpense, {
          type: 'doughnut',
          data: {
            labels: categoryLabels,
            datasets: [{
              data: categoryData,
              backgroundColor: categoryColors,
              borderWidth: 2,
              borderColor: isDark ? '#1e293b' : '#ffffff'
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: 'bottom', labels: { color: textColor, font: { family: 'Plus Jakarta Sans' } } },
              tooltip: {
                callbacks: {
                  label: function (context) {
                    return ` ${context.label}: ${context.raw.toLocaleString('vi-VN')} ₫`;
                  }
                }
              }
            }
          }
        });
      }
    }

    // 2. Bar Chart: Monthly Income vs Expense (Past 6 months)
    const ctxCashFlow = document.getElementById('chart-cash-flow');
    if (ctxCashFlow && window.Chart) {
      if (cashFlowChartInstance) cashFlowChartInstance.destroy();

      const months = [];
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const y = d.getFullYear();
        const m = (d.getMonth() + 1).toString().padStart(2, '0');
        months.push({ key: `${y}-${m}`, label: `T${d.getMonth() + 1}/${y}` });
      }

      const incomeData = months.map(m => {
        return state.transactions
          .filter(t => t.type === 'income' && t.date && t.date.startsWith(m.key))
          .reduce((sum, t) => sum + (t.amount || 0), 0);
      });

      const expenseData = months.map(m => {
        return state.transactions
          .filter(t => t.type === 'expense' && t.date && t.date.startsWith(m.key))
          .reduce((sum, t) => sum + (t.amount || 0), 0);
      });

      cashFlowChartInstance = new Chart(ctxCashFlow, {
        type: 'bar',
        data: {
          labels: months.map(m => m.label),
          datasets: [
            {
              label: 'Thu nhập',
              data: incomeData,
              backgroundColor: '#10b981',
              borderRadius: 6
            },
            {
              label: 'Chi tiêu',
              data: expenseData,
              backgroundColor: '#f43f5e',
              borderRadius: 6
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: { grid: { color: gridColor }, ticks: { color: textColor, font: { family: 'Plus Jakarta Sans' } } },
            y: {
              grid: { color: gridColor },
              ticks: {
                color: textColor,
                font: { family: 'Plus Jakarta Sans' },
                callback: val => val >= 1000000 ? `${(val / 1000000).toFixed(1)}Tr` : val
              }
            }
          },
          plugins: {
            legend: { position: 'top', labels: { color: textColor, font: { family: 'Plus Jakarta Sans' } } },
            tooltip: {
              callbacks: {
                label: function (context) {
                  return ` ${context.dataset.label}: ${context.raw.toLocaleString('vi-VN')} ₫`;
                }
              }
            }
          }
        }
      });
    }
  }

  function renderTransactionsList() {
    const state = LifeStorage.getState();
    if (!state) return;

    const listEl = document.getElementById('finance-transactions-tbody');
    const filterType = document.getElementById('filter-tx-type')?.value || 'all';
    const filterWallet = document.getElementById('filter-tx-wallet')?.value || 'all';
    const searchQuery = (document.getElementById('search-tx-query')?.value || '').toLowerCase();

    // Populate wallet filter dropdown
    const walletSelect = document.getElementById('filter-tx-wallet');
    if (walletSelect && walletSelect.options.length <= 1) {
      walletSelect.innerHTML = `<option value="all">Tất cả ví</option>` +
        state.wallets.map(w => `<option value="${w.id}">${escapeHtml(w.name)}</option>`).join('');
    }

    // Sort transactions latest first
    let filtered = [...state.transactions].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    if (filterType !== 'all') {
      filtered = filtered.filter(t => t.type === filterType);
    }
    if (filterWallet !== 'all') {
      filtered = filtered.filter(t => t.walletId === filterWallet);
    }
    if (searchQuery) {
      filtered = filtered.filter(t =>
        (t.note || '').toLowerCase().includes(searchQuery) ||
        (t.category || '').toLowerCase().includes(searchQuery)
      );
    }

    if (!listEl) return;

    if (filtered.length === 0) {
      listEl.innerHTML = `
        <tr>
          <td colspan="6" class="text-center py-8 text-slate-400">
            <i data-lucide="inbox" class="w-8 h-8 mx-auto mb-2 opacity-50"></i>
            Chưa có giao dịch nào phù hợp với bộ lọc.
          </td>
        </tr>
      `;
      return;
    }

    listEl.innerHTML = filtered.map(tx => {
      const wallet = state.wallets.find(w => w.id === tx.walletId);
      const catObj = LifeParser.CATEGORIES.find(c => c.id === tx.category) || { name: 'Khác', icon: 'tag' };
      const isIncome = tx.type === 'income';

      return `
        <tr class="border-b border-slate-100 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
          <td class="py-3 px-4 text-xs text-slate-500 whitespace-nowrap">
            ${tx.date || '---'}<br>
            <span class="text-[10px] text-slate-400">${tx.time || ''}</span>
          </td>
          <td class="py-3 px-4 whitespace-nowrap">
            <div class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full" style="background-color: ${wallet?.color || '#94a3b8'};"></span>
              <span class="text-xs font-semibold text-slate-700 dark:text-slate-300">${escapeHtml(wallet?.name || 'Không rõ')}</span>
            </div>
          </td>
          <td class="py-3 px-4">
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <i data-lucide="${catObj.icon || 'tag'}" class="w-3.5 h-3.5"></i>
              ${catObj.name}
            </span>
          </td>
          <td class="py-3 px-4 text-sm font-medium text-slate-800 dark:text-slate-200">
            ${escapeHtml(tx.note || 'Không có ghi chú')}
            ${tx.source === 'sms' ? '<span class="ml-1 text-[10px] text-indigo-500 font-bold">[SMS]</span>' : ''}
            ${tx.source === 'statement' ? '<span class="ml-1 text-[10px] text-emerald-500 font-bold">[Sao kê]</span>' : ''}
          </td>
          <td class="py-3 px-4 text-right whitespace-nowrap">
            <span class="font-bold text-sm ${isIncome ? 'text-emerald-500' : 'text-rose-500'}">
              ${isIncome ? '+' : '-'}${formatMoney(tx.amount)}
            </span>
          </td>
          <td class="py-3 px-4 text-right whitespace-nowrap">
            <button onclick="LifeApp.deleteTransaction('${tx.id}')" title="Xóa giao dịch" class="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  // ============================================================================
  // SMART SMS / NOTIFICATION PARSER MODAL & FLOW
  // ============================================================================
  function openSMSParserModal() {
    const modal = document.getElementById('modal-sms-parser');
    if (!modal) return;

    const state = LifeStorage.getState();
    const walletSelect = document.getElementById('sms-target-wallet');
    if (walletSelect && state) {
      walletSelect.innerHTML = state.wallets.map(w =>
        `<option value="${w.id}">${escapeHtml(w.name)} (${formatMoney(w.balance)})</option>`
      ).join('');
    }

    document.getElementById('sms-raw-input').value = '';
    document.getElementById('sms-parse-result').classList.add('hidden');
    modal.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
  }

  function loadSampleSMS(bankKey) {
    const samples = {
      vcb: 'SD TK 0071000888888 -150,000VND vao 12:30 17/10/2026. So du: 24,350,000VND. ND: HIGHLANDS COFFEE THANH TOAN CAFE',
      tcb: 'F@st Mobile Techcombank: TK 1903666888 +15,000,000 VND lúc 10:15 15/10/2026. Số dư: 23,900,000 VND. ND: Nhan luong thang 10 tu Cong Ty CP Cong Nghe',
      mb: 'TK 09xxx085|GD: -30,000VND 17/10/26 11:30 |SD: 642,002VND|DEN: HKD HOANG THI HUONG - 1063640824|ND: NGUYEN CUONG THINH chuyen tien',
      acb: 'ACB: TK 245999888 GD -120,000VND luc 18:45 16/10/2026. SD: 1,880,000VND. ND: SIEU THI WINMART THUC PHAM',
      bidv: 'BIDV: TK 1201000456 -650,000VND 14/10/2026 09:10. So du 8,250,000VND. ND: EVN HANOI TIEN DIEN SINH HOAT'
    };

    const text = samples[bankKey] || '';
    document.getElementById('sms-raw-input').value = text;
    executeSMSParse();
  }

  async function pasteFromClipboard() {
    try {
      if (!navigator.clipboard || !navigator.clipboard.readText) {
        showToast('Trình duyệt chưa cấp quyền đọc khay nhớ tạm! Vui lòng chạm đè ô nhập và bấm Dán.', 'warning');
        return;
      }
      const text = await navigator.clipboard.readText();
      if (!text || !text.trim()) {
        showToast('Khay nhớ tạm đang trống! Hãy copy tin nhắn trước.', 'warning');
        return;
      }
      const input = document.getElementById('sms-raw-input');
      if (input) {
        input.value = text.trim();
        executeSMSParse();
        showToast('Đã dán và tự động phân tích!');
      }
    } catch (err) {
      showToast('Vui lòng chạm đè vào ô nhập và chọn Dán (Paste)!', 'info');
    }
  }

  function executeSMSParse() {
    const input = document.getElementById('sms-raw-input').value.trim();
    if (!input) {
      showToast('Vui lòng dán tin nhắn ngân hàng trước!', 'warning');
      return;
    }

    try {
      const parsed = LifeParser.parseSMS(input);
      if (!parsed.success) {
        showToast('Không nhận diện được số tiền trong tin nhắn. Vui lòng kiểm tra lại!', 'error');
        return;
      }

      // Populate preview
      document.getElementById('sms-res-bank').textContent = parsed.bank || 'Ngân hàng / Ví điện tử';
      document.getElementById('sms-res-type').textContent = parsed.type === 'income' ? 'Thu nhập (+)' : 'Chi tiêu (-)';
      document.getElementById('sms-res-type').className = `text-xs font-bold px-2.5 py-1 rounded-full ${parsed.type === 'income' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'}`;

      document.getElementById('sms-res-amount').textContent = `${parsed.type === 'income' ? '+' : '-'}${formatMoney(parsed.amount)}`;
      document.getElementById('sms-res-amount').className = `text-2xl font-black ${parsed.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`;

      document.getElementById('sms-res-date').textContent = `${parsed.time} • ${parsed.date}`;
      document.getElementById('sms-res-desc').value = parsed.description;

      // Populate category dropdown
      const catSelect = document.getElementById('sms-res-category');
      catSelect.innerHTML = LifeParser.CATEGORIES.map(c => `
        <option value="${c.id}" ${c.id === parsed.category ? 'selected' : ''}>${c.name}</option>
      `).join('');

      // Auto-match wallet if bankCode matches
      const state = LifeStorage.getState();
      const walletSelect = document.getElementById('sms-target-wallet');
      if (parsed.bankCode && state) {
        const matchedWallet = state.wallets.find(w => w.bankCode === parsed.bankCode || w.name.toLowerCase().includes(parsed.bank.toLowerCase()));
        if (matchedWallet) {
          walletSelect.value = matchedWallet.id;
        }
      }

      // Store in button dataset for confirmation
      const confirmBtn = document.getElementById('sms-btn-confirm');
      confirmBtn.dataset.parsed = JSON.stringify(parsed);

      document.getElementById('sms-parse-result').classList.remove('hidden');
      if (window.lucide) lucide.createIcons();
    } catch (e) {
      showToast('Lỗi bóc tách: ' + e.message, 'error');
    }
  }

  async function confirmSMSParsedTransaction() {
    const confirmBtn = document.getElementById('sms-btn-confirm');
    if (!confirmBtn.dataset.parsed) return;

    const parsed = JSON.parse(confirmBtn.dataset.parsed);
    const targetWalletId = document.getElementById('sms-target-wallet').value;
    const finalDescription = document.getElementById('sms-res-desc').value.trim();
    const finalCategory = document.getElementById('sms-res-category').value;

    const state = LifeStorage.getState();
    const wallet = state.wallets.find(w => w.id === targetWalletId);

    if (!wallet) {
      showToast('Vui lòng chọn ví nhận giao dịch!', 'warning');
      return;
    }

    // 1. Add Transaction
    const newTx = {
      id: 'tx_' + Date.now(),
      walletId: targetWalletId,
      type: parsed.type,
      amount: parsed.amount,
      category: finalCategory,
      date: parsed.date,
      time: parsed.time,
      note: finalDescription || parsed.bank || 'SMS Transaction',
      source: 'sms'
    };

    state.transactions.unshift(newTx);

    // 2. Update Wallet Balance
    if (parsed.newBalance !== null && parsed.newBalance !== undefined) {
      // If bank explicitly gave new balance, sync directly
      wallet.balance = parsed.newBalance;
    } else {
      // Calculate delta
      if (parsed.type === 'income') {
        wallet.balance += parsed.amount;
      } else {
        wallet.balance -= parsed.amount;
      }
    }

    await LifeStorage.saveState();
    triggerCelebration();
    showToast(`Đã ghi nhận ${formatMoney(parsed.amount)} và cập nhật số dư ví ${wallet.name}!`);

    document.getElementById('modal-sms-parser').classList.add('hidden');
    renderCurrentTab();
  }

  // ============================================================================
  // EXCEL / CSV STATEMENT IMPORT FLOW
  // ============================================================================
  function openStatementModal() {
    const modal = document.getElementById('modal-statement-import');
    if (!modal) return;

    const state = LifeStorage.getState();
    const walletSelect = document.getElementById('statement-target-wallet');
    if (walletSelect && state) {
      walletSelect.innerHTML = state.wallets.map(w =>
        `<option value="${w.id}">${escapeHtml(w.name)}</option>`
      ).join('');
    }

    importedTransactionsBuffer = [];
    document.getElementById('statement-preview-container').classList.add('hidden');
    document.getElementById('statement-file-input').value = '';
    modal.classList.remove('hidden');
  }

  async function handleStatementFile(file) {
    if (!file) return;

    try {
      showToast('Đang đọc và phân tích file sao kê...', 'info');
      const list = await LifeParser.parseStatementFile(file);

      if (list.length === 0) {
        showToast('Không tìm thấy giao dịch hợp lệ nào trong file!', 'warning');
        return;
      }

      importedTransactionsBuffer = list;
      renderStatementPreview();
      showToast(`Đã nhận diện thành công ${list.length} giao dịch!`);
    } catch (err) {
      showToast('Lỗi đọc file: ' + err.message, 'error');
    }
  }

  function renderStatementPreview() {
    const container = document.getElementById('statement-preview-container');
    const tbody = document.getElementById('statement-preview-tbody');
    const countBadge = document.getElementById('statement-count-badge');

    container.classList.remove('hidden');
    countBadge.textContent = `${importedTransactionsBuffer.length} giao dịch`;

    tbody.innerHTML = importedTransactionsBuffer.map((t, idx) => {
      const isInc = t.type === 'income';
      return `
        <tr class="border-b border-slate-100 dark:border-slate-800 text-xs">
          <td class="p-2 text-center">
            <input type="checkbox" ${t.selected ? 'checked' : ''} onchange="LifeApp.toggleStatementItem(${idx})" class="rounded text-indigo-600 focus:ring-indigo-500">
          </td>
          <td class="p-2 whitespace-nowrap text-slate-500">${t.date}</td>
          <td class="p-2 font-medium text-slate-800 dark:text-slate-200 truncate max-w-xs" title="${escapeHtml(t.description)}">${escapeHtml(t.description)}</td>
          <td class="p-2">
            <select onchange="LifeApp.changeStatementCategory(${idx}, this.value)" class="bg-transparent border border-slate-300 dark:border-slate-700 rounded px-1.5 py-0.5 text-xs text-slate-700 dark:text-slate-300">
              ${LifeParser.CATEGORIES.map(c => `<option value="${c.id}" ${c.id === t.category ? 'selected' : ''}>${c.name}</option>`).join('')}
            </select>
          </td>
          <td class="p-2 text-right font-bold whitespace-nowrap ${isInc ? 'text-emerald-500' : 'text-rose-500'}">
            ${isInc ? '+' : '-'}${formatMoney(t.amount)}
          </td>
        </tr>
      `;
    }).join('');
  }

  function toggleStatementItem(idx) {
    if (importedTransactionsBuffer[idx]) {
      importedTransactionsBuffer[idx].selected = !importedTransactionsBuffer[idx].selected;
    }
  }

  function changeStatementCategory(idx, catId) {
    if (importedTransactionsBuffer[idx]) {
      importedTransactionsBuffer[idx].category = catId;
    }
  }

  async function commitStatementImport() {
    const state = LifeStorage.getState();
    const targetWalletId = document.getElementById('statement-target-wallet').value;
    const wallet = state.wallets.find(w => w.id === targetWalletId);

    if (!wallet) {
      showToast('Vui lòng chọn ví nhận!', 'warning');
      return;
    }

    const selected = importedTransactionsBuffer.filter(t => t.selected);
    if (selected.length === 0) {
      showToast('Chưa chọn giao dịch nào để nhập!', 'warning');
      return;
    }

    let netChange = 0;

    selected.forEach(t => {
      const newTx = {
        id: 'tx_st_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        walletId: targetWalletId,
        type: t.type,
        amount: t.amount,
        category: t.category,
        date: t.date,
        time: '12:00',
        note: t.description,
        source: 'statement'
      };

      state.transactions.unshift(newTx);

      if (t.type === 'income') netChange += t.amount;
      else netChange -= t.amount;
    });

    wallet.balance += netChange;

    await LifeStorage.saveState();
    triggerCelebration();
    showToast(`Đã nhập thành công ${selected.length} giao dịch vào ví ${wallet.name}!`);

    document.getElementById('modal-statement-import').classList.add('hidden');
    renderCurrentTab();
  }

  // ============================================================================
  // TAB 3: TASKS & EISENHOWER PLANNER & RECURRING BILLS
  // ============================================================================
  let currentTasksSubView = 'list'; // 'list' | 'matrix' | 'bills'

  function renderTasks() {
    const state = LifeStorage.getState();
    if (!state) return;

    const listContainer = document.getElementById('tasks-view-list');
    const matrixContainer = document.getElementById('tasks-view-matrix');
    const billsContainer = document.getElementById('tasks-view-bills');

    // Update subview tabs styling
    document.querySelectorAll('.task-subtab-btn').forEach(btn => {
      if (btn.getAttribute('data-subview') === currentTasksSubView) {
        btn.className = 'task-subtab-btn px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white shadow-sm';
      } else {
        btn.className = 'task-subtab-btn px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800';
      }
    });

    if (currentTasksSubView === 'list') {
      listContainer.classList.remove('hidden');
      matrixContainer.classList.add('hidden');
      billsContainer.classList.add('hidden');
      renderTasksList();
    } else if (currentTasksSubView === 'matrix') {
      listContainer.classList.add('hidden');
      matrixContainer.classList.remove('hidden');
      billsContainer.classList.add('hidden');
      renderEisenhowerMatrix();
    } else if (currentTasksSubView === 'bills') {
      listContainer.classList.add('hidden');
      matrixContainer.classList.add('hidden');
      billsContainer.classList.remove('hidden');
      renderBillsView();
    }
  }

  function switchTasksSubView(subview) {
    currentTasksSubView = subview;
    renderTasks();
    if (window.lucide) lucide.createIcons();
  }

  function renderTasksList() {
    const state = LifeStorage.getState();
    const container = document.getElementById('tasks-items-container');
    if (!container) return;

    if (state.tasks.length === 0) {
      container.innerHTML = `
        <div class="text-center py-12 text-slate-400">
          <i data-lucide="check-square" class="w-12 h-12 mx-auto mb-3 opacity-40"></i>
          <p class="font-medium text-slate-600 dark:text-slate-300">Không có công việc nào!</p>
          <button onclick="LifeApp.openAddTaskModal()" class="mt-3 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700">
            + Thêm việc cần làm
          </button>
        </div>
      `;
      return;
    }

    // Sort: uncompleted first, then by priority
    const priorityWeight = { urgent_important: 4, important: 3, urgent: 2, normal: 1 };
    const sorted = [...state.tasks].sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return (priorityWeight[b.priority] || 1) - (priorityWeight[a.priority] || 1);
    });

    container.innerHTML = sorted.map(t => `
      <div class="flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-sm hover:shadow transition-all group">
        <div class="flex items-center gap-3 flex-1 min-w-0 pr-3">
          <input type="checkbox" ${t.completed ? 'checked' : ''} onchange="LifeApp.toggleTask('${t.id}')"
            class="w-5 h-5 rounded-lg text-indigo-600 focus:ring-indigo-500 cursor-pointer border-slate-300 dark:border-slate-600 flex-shrink-0">
          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold truncate ${t.completed ? 'task-completed-title text-slate-400' : 'text-slate-800 dark:text-slate-100'}">${escapeHtml(t.title)}</p>
            <div class="flex items-center gap-2 mt-1">
              <span class="text-[11px] text-slate-500 flex items-center gap-1">
                <i data-lucide="calendar" class="w-3 h-3"></i> ${t.date || 'Hôm nay'}
              </span>
              <span class="text-[10px] px-2 py-0.5 rounded-full font-semibold ${getPriorityBadgeClass(t.priority)}">${getPriorityLabel(t.priority)}</span>
            </div>
          </div>
        </div>
        <button onclick="LifeApp.deleteTask('${t.id}')" title="Xóa việc" class="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <i data-lucide="trash-2" class="w-4 h-4"></i>
        </button>
      </div>
    `).join('');
  }

  function renderEisenhowerMatrix() {
    const state = LifeStorage.getState();
    const quadrants = {
      urgent_important: { id: 'matrix-q1', title: 'Khẩn cấp & Quan trọng (Làm ngay)', color: 'rose' },
      important: { id: 'matrix-q2', title: 'Quan trọng, Không gấp (Lên lịch)', color: 'blue' },
      urgent: { id: 'matrix-q3', title: 'Gấp, Không quan trọng (Ủy quyền)', color: 'amber' },
      normal: { id: 'matrix-q4', title: 'Không gấp, Không quan trọng (Loại bỏ)', color: 'slate' }
    };

    Object.keys(quadrants).forEach(qKey => {
      const q = quadrants[qKey];
      const el = document.getElementById(q.id);
      if (!el) return;

      const tasks = state.tasks.filter(t => t.priority === qKey);
      el.innerHTML = tasks.length === 0 ?
        `<p class="text-xs text-slate-400 text-center py-4">Trống</p>` :
        tasks.map(t => `
          <div class="flex items-center gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 text-xs">
            <input type="checkbox" ${t.completed ? 'checked' : ''} onchange="LifeApp.toggleTask('${t.id}')" class="rounded text-indigo-600 focus:ring-indigo-500">
            <span class="flex-1 font-medium ${t.completed ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-200'}">${escapeHtml(t.title)}</span>
          </div>
        `).join('');
    });
  }

  function renderBillsView() {
    const state = LifeStorage.getState();
    const container = document.getElementById('bills-items-container');
    if (!container) return;

    const today = new Date();
    const todayDay = today.getDate();
    const currentMonth = today.toISOString().slice(0, 7);

    if ((state.bills || []).length === 0) {
      container.innerHTML = `
        <div class="text-center py-12 text-slate-400">
          <i data-lucide="receipt" class="w-12 h-12 mx-auto mb-3 opacity-40"></i>
          <p class="font-medium text-slate-600 dark:text-slate-300">Chưa có hóa đơn định kỳ nào!</p>
          <button onclick="LifeApp.openAddBillModal()" class="mt-3 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700">
            + Thêm hóa đơn hàng tháng
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = state.bills.map(b => {
      const isPaid = b.paidMonths && b.paidMonths.includes(currentMonth);
      const diff = b.dueDay - todayDay;
      let statusBadge = '';

      if (isPaid) {
        statusBadge = `<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">✓ Đã thanh toán T${today.getMonth() + 1}</span>`;
      } else if (diff < 0) {
        statusBadge = `<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400">⚠️ Quá hạn ${Math.abs(diff)} ngày</span>`;
      } else if (diff === 0) {
        statusBadge = `<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400 animate-pulse">⚡ Đến hạn hôm nay</span>`;
      } else {
        statusBadge = `<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400">Còn ${diff} ngày nữa (Ngày ${b.dueDay})</span>`;
      }

      return `
        <div class="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-sm hover:shadow transition-all group">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <i data-lucide="receipt" class="w-6 h-6"></i>
            </div>
            <div>
              <h4 class="font-bold text-slate-800 dark:text-slate-100 text-sm">${escapeHtml(b.title)}</h4>
              <p class="text-xs text-slate-500 font-medium">Định kỳ ngày ${b.dueDay} hàng tháng • <strong class="text-slate-900 dark:text-white">${formatMoney(b.amount)}</strong></p>
            </div>
          </div>
          <div class="flex items-center gap-3">
            ${statusBadge}
            ${!isPaid ? `
              <button onclick="LifeApp.markBillPaid('${b.id}')" class="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors shadow-sm">
                Xác nhận đã trả
              </button>
            ` : `
              <button onclick="LifeApp.unmarkBillPaid('${b.id}')" class="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-500 hover:text-slate-700 text-xs font-medium">
                Hủy dấu
              </button>
            `}
            <button onclick="LifeApp.deleteBill('${b.id}')" title="Xóa hóa đơn" class="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 opacity-0 group-hover:opacity-100 transition-opacity">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  async function toggleTask(taskId) {
    const state = LifeStorage.getState();
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;

    task.completed = !task.completed;
    if (task.completed) {
      triggerCelebration();
    }
    await LifeStorage.saveState();
    renderCurrentTab();
  }

  async function markBillPaid(billId) {
    const state = LifeStorage.getState();
    const bill = state.bills.find(b => b.id === billId);
    if (!bill) return;

    const currentMonth = new Date().toISOString().slice(0, 7);
    if (!bill.paidMonths) bill.paidMonths = [];
    if (!bill.paidMonths.includes(currentMonth)) {
      bill.paidMonths.push(currentMonth);
    }

    // Optionally auto-create expense transaction
    const shouldAddTx = confirm(`Đã đánh dấu đã thanh toán "${bill.title}" (${formatMoney(bill.amount)}).\n\nBạn có muốn tự động ghi nhận một giao dịch chi tiêu vào Sổ Tài chính không?`);
    if (shouldAddTx && state.wallets.length > 0) {
      const defaultWallet = state.wallets[0];
      state.transactions.unshift({
        id: 'tx_bill_' + Date.now(),
        walletId: defaultWallet.id,
        type: 'expense',
        amount: bill.amount,
        category: 'bills',
        date: new Date().toISOString().slice(0, 10),
        time: new Date().toTimeString().slice(0, 5),
        note: `Thanh toán ${bill.title} tháng ${new Date().getMonth() + 1}`,
        source: 'manual'
      });
      defaultWallet.balance -= bill.amount;
      showToast(`Đã tự động trừ ${formatMoney(bill.amount)} từ ví ${defaultWallet.name}!`);
    }

    await LifeStorage.saveState();
    triggerCelebration();
    renderCurrentTab();
  }

  async function unmarkBillPaid(billId) {
    const state = LifeStorage.getState();
    const bill = state.bills.find(b => b.id === billId);
    if (!bill || !bill.paidMonths) return;

    const currentMonth = new Date().toISOString().slice(0, 7);
    bill.paidMonths = bill.paidMonths.filter(m => m !== currentMonth);
    await LifeStorage.saveState();
    renderCurrentTab();
  }

  // ============================================================================
  // TAB 4: HABITS & HEALTH TRACKER
  // ============================================================================
  function renderHabits() {
    const state = LifeStorage.getState();
    const container = document.getElementById('habits-grid-container');
    if (!container || !state) return;

    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    // Calculate last 7 days for the weekly strip
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
      last7Days.push({
        iso: iso,
        label: dayNames[d.getDay()],
        dayNum: d.getDate(),
        isToday: iso === todayStr
      });
    }

    if (state.habits.length === 0) {
      container.innerHTML = `
        <div class="col-span-full text-center py-12 text-slate-400">
          <i data-lucide="heart-pulse" class="w-12 h-12 mx-auto mb-3 opacity-40"></i>
          <p class="font-medium text-slate-600 dark:text-slate-300">Chưa có thói quen nào!</p>
          <button onclick="LifeApp.openAddHabitModal()" class="mt-3 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700">
            + Thêm thói quen mới
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = state.habits.map(h => {
      const isDoneToday = h.completedDates && h.completedDates.includes(todayStr);

      return `
        <div class="p-5 rounded-3xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-sm hover:shadow-md transition-all group flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-3">
              <div class="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                <i data-lucide="${h.icon || 'star'}" class="w-6 h-6"></i>
              </div>
              <div class="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 text-xs font-bold">
                <i data-lucide="flame" class="w-4 h-4 fill-amber-500 text-amber-500"></i>
                <span>${h.streak || 0} ngày</span>
              </div>
            </div>
            <h4 class="font-bold text-slate-800 dark:text-slate-100 text-base mb-1">${escapeHtml(h.title)}</h4>
            <p class="text-xs text-slate-500 mb-4">Mục tiêu duy trì hàng ngày</p>

            <!-- 7-day strip -->
            <div class="flex items-center justify-between gap-1 mb-4 p-2 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
              ${last7Days.map(d => {
                const checked = h.completedDates && h.completedDates.includes(d.iso);
                return `
                  <div class="flex flex-col items-center gap-1 flex-1">
                    <span class="text-[10px] font-semibold text-slate-400">${d.label}</span>
                    <button onclick="LifeApp.toggleHabitSpecificDate('${h.id}', '${d.iso}')"
                      class="w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold transition-all ${
                        checked ? 'bg-emerald-500 text-white shadow-sm' :
                        d.isToday ? 'border-2 border-indigo-500 text-indigo-600 dark:text-indigo-400' :
                        'bg-slate-200/60 dark:bg-slate-800 text-slate-400'
                      }">
                      ${checked ? '✓' : d.dayNum}
                    </button>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <div class="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/60">
            <button onclick="LifeApp.toggleHabit('${h.id}')" class="flex-1 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 ${
              isDoneToday ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300' :
              'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/30'
            }">
              <i data-lucide="${isDoneToday ? 'check' : 'circle'}" class="w-4 h-4"></i>
              ${isDoneToday ? 'Đã hoàn thành hôm nay' : 'Đánh dấu hoàn thành'}
            </button>
            <button onclick="LifeApp.deleteHabit('${h.id}')" title="Xóa thói quen" class="p-2 ml-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 opacity-0 group-hover:opacity-100 transition-opacity">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  async function toggleHabit(habitId) {
    const todayStr = new Date().toISOString().slice(0, 10);
    await toggleHabitSpecificDate(habitId, todayStr);
  }

  async function toggleHabitSpecificDate(habitId, dateStr) {
    const state = LifeStorage.getState();
    const habit = state.habits.find(h => h.id === habitId);
    if (!habit) return;

    if (!habit.completedDates) habit.completedDates = [];

    const idx = habit.completedDates.indexOf(dateStr);
    if (idx !== -1) {
      habit.completedDates.splice(idx, 1);
    } else {
      habit.completedDates.push(dateStr);
      triggerCelebration();
    }

    // Recalculate streak
    habit.streak = calculateHabitStreak(habit.completedDates);

    await LifeStorage.saveState();
    renderCurrentTab();
  }

  function calculateHabitStreak(completedDates) {
    if (!completedDates || completedDates.length === 0) return 0;
    const sorted = [...completedDates].sort().reverse();
    let streak = 0;
    let checkDate = new Date();

    // Check if today is completed
    const todayStr = checkDate.toISOString().slice(0, 10);
    if (!sorted.includes(todayStr)) {
      // If not today, check yesterday
      checkDate.setDate(checkDate.getDate() - 1);
      const yesterdayStr = checkDate.toISOString().slice(0, 10);
      if (!sorted.includes(yesterdayStr)) return 0;
    }

    while (true) {
      const iso = checkDate.toISOString().slice(0, 10);
      if (sorted.includes(iso)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }

  // ============================================================================
  // TAB 5: NOTES & SHOPPING CHECKLIST
  // ============================================================================
  let currentNotesSubView = 'notes'; // 'notes' | 'shopping'

  function renderNotes() {
    const state = LifeStorage.getState();
    if (!state) return;

    const notesContainer = document.getElementById('notes-view-content');
    const shoppingContainer = document.getElementById('shopping-view-content');

    // Update subtab buttons
    document.querySelectorAll('.notes-subtab-btn').forEach(btn => {
      if (btn.getAttribute('data-subview') === currentNotesSubView) {
        btn.className = 'notes-subtab-btn px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white shadow-sm';
      } else {
        btn.className = 'notes-subtab-btn px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800';
      }
    });

    if (currentNotesSubView === 'notes') {
      notesContainer.classList.remove('hidden');
      shoppingContainer.classList.add('hidden');
      renderNotesGrid();
    } else {
      notesContainer.classList.add('hidden');
      shoppingContainer.classList.remove('hidden');
      renderShoppingList();
    }
  }

  function switchNotesSubView(subview) {
    currentNotesSubView = subview;
    renderNotes();
    if (window.lucide) lucide.createIcons();
  }

  function renderNotesGrid() {
    const state = LifeStorage.getState();
    const container = document.getElementById('notes-grid-container');
    if (!container) return;

    if ((state.notes || []).length === 0) {
      container.innerHTML = `
        <div class="col-span-full text-center py-12 text-slate-400">
          <i data-lucide="file-text" class="w-12 h-12 mx-auto mb-3 opacity-40"></i>
          <p class="font-medium text-slate-600 dark:text-slate-300">Chưa có ghi chú nào!</p>
          <button onclick="LifeApp.openAddNoteModal()" class="mt-3 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700">
            + Viết ghi chú mới
          </button>
        </div>
      `;
      return;
    }

    // Pinned notes first
    const sorted = [...state.notes].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

    container.innerHTML = sorted.map(n => `
      <div class="p-5 rounded-3xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-sm hover:shadow-md transition-all group relative flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="text-[11px] text-slate-400 font-medium">${n.updatedAt || 'Hôm nay'}</span>
            <div class="flex items-center gap-1">
              <button onclick="LifeApp.togglePinNote('${n.id}')" title="${n.pinned ? 'Bỏ ghim' : 'Ghim lên đầu'}" class="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 ${n.pinned ? 'text-amber-500' : 'text-slate-400'}">
                <i data-lucide="pin" class="w-4 h-4"></i>
              </button>
              <button onclick="LifeApp.deleteNote('${n.id}')" title="Xóa ghi chú" class="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
              </button>
            </div>
          </div>
          <h4 class="font-bold text-slate-800 dark:text-slate-100 text-base mb-2">${escapeHtml(n.title)}</h4>
          <p class="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed">${escapeHtml(n.content)}</p>
        </div>
      </div>
    `).join('');
  }

  function renderShoppingList() {
    const state = LifeStorage.getState();
    const container = document.getElementById('shopping-items-container');
    const summaryEl = document.getElementById('shopping-summary-bar');
    if (!container || !summaryEl) return;

    const items = state.shoppingList || [];

    // Calculate totals
    const totalEst = items.reduce((sum, item) => sum + (item.estimatedPrice || 0), 0);
    const totalBought = items.filter(i => i.bought).reduce((sum, item) => sum + (item.estimatedPrice || 0), 0);
    const totalRemaining = totalEst - totalBought;

    summaryEl.innerHTML = `
      <div class="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-900 dark:text-indigo-200">
        <div>
          <span class="text-xs text-slate-500 dark:text-slate-400 block">Tổng dự tính:</span>
          <span class="text-lg font-bold text-slate-800 dark:text-slate-100">${formatMoney(totalEst)}</span>
        </div>
        <div>
          <span class="text-xs text-slate-500 dark:text-slate-400 block">Đã mua:</span>
          <span class="text-lg font-bold text-emerald-600 dark:text-emerald-400">${formatMoney(totalBought)}</span>
        </div>
        <div>
          <span class="text-xs text-slate-500 dark:text-slate-400 block">Còn lại:</span>
          <span class="text-lg font-bold text-amber-600 dark:text-amber-400">${formatMoney(totalRemaining)}</span>
        </div>
        <button onclick="LifeApp.clearPurchasedShoppingItems()" class="px-3 py-1.5 rounded-xl border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs font-bold hover:bg-rose-50 dark:hover:bg-rose-950/40">
          Xóa món đã mua
        </button>
      </div>
    `;

    if (items.length === 0) {
      container.innerHTML = `<p class="text-center py-8 text-slate-400 text-sm">Danh sách mua sắm đang trống. Hãy thêm đồ cần mua khi đi chợ / siêu thị!</p>`;
      return;
    }

    container.innerHTML = items.map(item => `
      <div class="flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-sm transition-all group">
        <div class="flex items-center gap-3 flex-1 min-w-0 pr-3">
          <input type="checkbox" ${item.bought ? 'checked' : ''} onchange="LifeApp.toggleShoppingItem('${item.id}')"
            class="w-5 h-5 rounded-lg text-indigo-600 focus:ring-indigo-500 cursor-pointer border-slate-300 dark:border-slate-600 flex-shrink-0">
          <div class="min-w-0 flex-1">
            <span class="text-sm font-semibold truncate ${item.bought ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-100'}">${escapeHtml(item.name)}</span>
            <span class="text-xs text-slate-400 block">Số lượng: ${escapeHtml(item.qty || '1')}</span>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <span class="font-bold text-sm text-slate-700 dark:text-slate-300">${formatMoney(item.estimatedPrice)}</span>
          <button onclick="LifeApp.deleteShoppingItem('${item.id}')" title="Xóa" class="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 opacity-0 group-hover:opacity-100 transition-opacity">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </div>
      </div>
    `).join('');
  }

  async function toggleShoppingItem(itemId) {
    const state = LifeStorage.getState();
    const item = (state.shoppingList || []).find(i => i.id === itemId);
    if (!item) return;

    item.bought = !item.bought;
    if (item.bought) triggerCelebration();
    await LifeStorage.saveState();
    renderCurrentTab();
  }

  async function clearPurchasedShoppingItems() {
    const state = LifeStorage.getState();
    state.shoppingList = (state.shoppingList || []).filter(i => !i.bought);
    await LifeStorage.saveState();
    showToast('Đã dọn dẹp các món đã mua!');
    renderCurrentTab();
  }

  // ============================================================================
  // TAB 6: SETTINGS, BACKUP, RESTORE & AES SECURITY
  // ============================================================================
  function renderSettings() {
    const state = LifeStorage.getState();
    if (!state) return;

    const autoLockSelect = document.getElementById('settings-autolock-select');
    if (autoLockSelect) {
      autoLockSelect.value = state.settings.autoLockMinutes ?? 5;
    }

    const lastBackupEl = document.getElementById('settings-last-backup');
    if (lastBackupEl) {
      lastBackupEl.textContent = state.settings.lastBackup ?
        new Date(state.settings.lastBackup).toLocaleString('vi-VN') :
        'Chưa có file sao lưu';
    }
  }

  async function handleAutoLockChange(minutes) {
    const state = LifeStorage.getState();
    state.settings.autoLockMinutes = parseInt(minutes, 10);
    await LifeStorage.saveState();
    LifeStorage.resetIdleTimer();
    showToast(`Đã đổi thời gian tự khóa sang ${minutes} phút!`);
  }

  async function exportBackup() {
    try {
      showToast('Đang tạo bản sao lưu mã hóa (.enc)...', 'info');
      await LifeStorage.exportEncryptedBackup();
      showToast('Đã tải xuống file sao lưu .enc thành công!');
      renderCurrentTab();
    } catch (e) {
      showToast('Lỗi xuất sao lưu: ' + e.message, 'error');
    }
  }

  async function triggerAutoSaveDisk() {
    try {
      const fileName = await LifeStorage.setupAutoSaveFile();
      showToast(`Đã liên kết file "${fileName}". Dữ liệu sẽ tự động đồng bộ khi có thay đổi!`);
      renderCurrentTab();
    } catch (e) {
      showToast('Không thể liên kết file: ' + e.message, 'warning');
    }
  }

  function triggerImportBackup() {
    document.getElementById('backup-file-input').click();
  }

  async function handleBackupFileSelected(file) {
    if (!file) return;

    const password = prompt('Nhập Master Password để giải mã và khôi phục bản sao lưu:');
    if (!password) return;

    try {
      showToast('Đang giải mã và phục hồi dữ liệu...', 'info');
      const text = await file.text();
      await LifeStorage.importEncryptedBackup(text, password);
      triggerCelebration();
      showToast('Khôi phục dữ liệu từ file sao lưu thành công!');
      renderCurrentTab();
    } catch (err) {
      showToast('Khôi phục thất bại: ' + err.message, 'error');
    }
  }

  async function handleChangeMasterPassword() {
    const oldPass = prompt('Nhập Mật khẩu chính hiện tại:');
    if (!oldPass) return;

    const newPass = prompt('Nhập Mật khẩu chính MỚI (tối thiểu 4 ký tự):');
    if (!newPass || newPass.length < 4) {
      showToast('Mật khẩu mới không hợp lệ!', 'warning');
      return;
    }

    const confirmPass = prompt('Xác nhận lại Mật khẩu chính MỚI:');
    if (newPass !== confirmPass) {
      showToast('Mật khẩu mới không trùng khớp!', 'error');
      return;
    }

    try {
      await LifeStorage.changePassword(oldPass, newPass);
      showToast('Đổi Master Password thành công! Dữ liệu đã được mã hóa lại với khóa mới.');
    } catch (err) {
      showToast('Lỗi: ' + err.message, 'error');
    }
  }

  function handleWipeAllData() {
    const confirmation = prompt('CẢNH BÁO: Thao tác này sẽ XÓA TOÀN BỘ DỮ LIỆU và không thể phục hồi nếu không có file sao lưu .enc!\n\nNhập chữ "XÓA HẾT" để xác nhận:');
    if (confirmation === 'XÓA HẾT') {
      LifeStorage.wipeAllData();
    } else {
      showToast('Đã hủy thao tác xóa dữ liệu.', 'info');
    }
  }

  // ============================================================================
  // GENERIC MODALS & CRUD HANDLERS
  // ============================================================================
  function openAddWalletModal() {
    document.getElementById('modal-wallet-title').textContent = 'Thêm Ví / Ngân hàng Mới';
    document.getElementById('wallet-edit-id').value = '';
    document.getElementById('wallet-name-input').value = '';
    document.getElementById('wallet-bank-select').value = 'VCB';
    document.getElementById('wallet-balance-input').value = '';
    document.getElementById('wallet-color-input').value = '#10b981';
    document.getElementById('modal-wallet').classList.remove('hidden');
  }

  function openEditWalletModal(walletId) {
    const state = LifeStorage.getState();
    const wallet = state.wallets.find(w => w.id === walletId);
    if (!wallet) return;

    document.getElementById('modal-wallet-title').textContent = 'Sửa Ví / Ngân hàng';
    document.getElementById('wallet-edit-id').value = wallet.id;
    document.getElementById('wallet-name-input').value = wallet.name;
    document.getElementById('wallet-bank-select').value = wallet.bankCode || 'OTHER';
    document.getElementById('wallet-balance-input').value = wallet.balance || 0;
    document.getElementById('wallet-color-input').value = wallet.color || '#3b82f6';
    document.getElementById('modal-wallet').classList.remove('hidden');
  }

  async function saveWalletForm(e) {
    e.preventDefault();
    const id = document.getElementById('wallet-edit-id').value;
    const name = document.getElementById('wallet-name-input').value.trim();
    const bankCode = document.getElementById('wallet-bank-select').value;
    const balance = parseFloat(document.getElementById('wallet-balance-input').value) || 0;
    const color = document.getElementById('wallet-color-input').value;

    if (!name) {
      showToast('Vui lòng nhập tên ví/ngân hàng!', 'warning');
      return;
    }

    const state = LifeStorage.getState();

    if (id) {
      // Edit
      const w = state.wallets.find(item => item.id === id);
      if (w) {
        w.name = name;
        w.bankCode = bankCode;
        w.balance = balance;
        w.color = color;
      }
    } else {
      // Add
      const newWallet = {
        id: 'w_' + Date.now(),
        name: name,
        bankCode: bankCode,
        balance: balance,
        color: color,
        icon: 'landmark'
      };
      state.wallets.push(newWallet);
    }

    await LifeStorage.saveState();
    showToast('Đã lưu ví thành công!');
    document.getElementById('modal-wallet').classList.add('hidden');
    renderCurrentTab();
  }

  async function deleteWallet(walletId) {
    const state = LifeStorage.getState();
    const wallet = state.wallets.find(w => w.id === walletId);
    if (!wallet) return;

    if (confirm(`Bạn có chắc chắn muốn xóa ví "${wallet.name}" không?`)) {
      state.wallets = state.wallets.filter(w => w.id !== walletId);
      await LifeStorage.saveState();
      showToast('Đã xóa ví!');
      renderCurrentTab();
    }
  }

  function openAddTransactionModal() {
    const state = LifeStorage.getState();
    const walletSelect = document.getElementById('tx-wallet-select');
    if (walletSelect) {
      walletSelect.innerHTML = state.wallets.map(w =>
        `<option value="${w.id}">${escapeHtml(w.name)} (${formatMoney(w.balance)})</option>`
      ).join('');
    }

    const catSelect = document.getElementById('tx-category-select');
    if (catSelect) {
      catSelect.innerHTML = LifeParser.CATEGORIES.map(c =>
        `<option value="${c.id}">${c.name}</option>`
      ).join('');
    }

    document.getElementById('tx-date-input').value = new Date().toISOString().slice(0, 10);
    document.getElementById('tx-amount-input').value = '';
    document.getElementById('tx-note-input').value = '';
    document.getElementById('modal-transaction').classList.remove('hidden');
  }

  async function saveTransactionForm(e) {
    e.preventDefault();
    const type = document.querySelector('input[name="tx-type"]:checked').value;
    const walletId = document.getElementById('tx-wallet-select').value;
    const amount = parseFloat(document.getElementById('tx-amount-input').value) || 0;
    const category = document.getElementById('tx-category-select').value;
    const date = document.getElementById('tx-date-input').value;
    const note = document.getElementById('tx-note-input').value.trim();

    if (amount <= 0) {
      showToast('Vui lòng nhập số tiền lớn hơn 0!', 'warning');
      return;
    }

    const state = LifeStorage.getState();
    const wallet = state.wallets.find(w => w.id === walletId);
    if (!wallet) {
      showToast('Vui lòng chọn ví!', 'warning');
      return;
    }

    const newTx = {
      id: 'tx_' + Date.now(),
      walletId: walletId,
      type: type,
      amount: amount,
      category: category,
      date: date,
      time: new Date().toTimeString().slice(0, 5),
      note: note || 'Giao dịch',
      source: 'manual'
    };

    state.transactions.unshift(newTx);

    // Update wallet balance
    if (type === 'income') {
      wallet.balance += amount;
    } else {
      wallet.balance -= amount;
    }

    await LifeStorage.saveState();
    triggerCelebration();
    showToast('Đã lưu giao dịch và cập nhật số dư!');
    document.getElementById('modal-transaction').classList.add('hidden');
    renderCurrentTab();
  }

  async function deleteTransaction(txId) {
    const state = LifeStorage.getState();
    const tx = state.transactions.find(t => t.id === txId);
    if (!tx) return;

    if (confirm('Bạn có chắc muốn xóa giao dịch này?')) {
      const rollbackBalance = confirm('Bạn có muốn khôi phục số dư ví (hoàn tác biến động số dư của giao dịch này) không?');
      if (rollbackBalance) {
        const wallet = state.wallets.find(w => w.id === tx.walletId);
        if (wallet) {
          if (tx.type === 'income') wallet.balance -= tx.amount;
          else wallet.balance += tx.amount;
        }
      }

      state.transactions = state.transactions.filter(t => t.id !== txId);
      await LifeStorage.saveState();
      showToast('Đã xóa giao dịch!');
      renderCurrentTab();
    }
  }

  // Modals for Tasks, Bills, Habits, Notes, Shopping
  function openAddTaskModal() {
    document.getElementById('task-title-input').value = '';
    document.getElementById('task-date-input').value = new Date().toISOString().slice(0, 10);
    document.getElementById('task-priority-select').value = 'urgent_important';
    document.getElementById('modal-task').classList.remove('hidden');
  }

  async function saveTaskForm(e) {
    e.preventDefault();
    const title = document.getElementById('task-title-input').value.trim();
    const date = document.getElementById('task-date-input').value;
    const priority = document.getElementById('task-priority-select').value;

    if (!title) return;

    const state = LifeStorage.getState();
    state.tasks.push({
      id: 't_' + Date.now(),
      title: title,
      date: date,
      priority: priority,
      completed: false
    });

    await LifeStorage.saveState();
    showToast('Đã thêm việc cần làm!');
    document.getElementById('modal-task').classList.add('hidden');
    renderCurrentTab();
  }

  async function deleteTask(taskId) {
    const state = LifeStorage.getState();
    state.tasks = state.tasks.filter(t => t.id !== taskId);
    await LifeStorage.saveState();
    renderCurrentTab();
  }

  function openAddBillModal() {
    document.getElementById('bill-title-input').value = '';
    document.getElementById('bill-amount-input').value = '';
    document.getElementById('bill-dueday-input').value = 15;
    document.getElementById('modal-bill').classList.remove('hidden');
  }

  async function saveBillForm(e) {
    e.preventDefault();
    const title = document.getElementById('bill-title-input').value.trim();
    const amount = parseFloat(document.getElementById('bill-amount-input').value) || 0;
    const dueDay = parseInt(document.getElementById('bill-dueday-input').value, 10) || 1;

    if (!title || amount <= 0) {
      showToast('Vui lòng nhập tên và số tiền hợp lệ!', 'warning');
      return;
    }

    const state = LifeStorage.getState();
    if (!state.bills) state.bills = [];

    state.bills.push({
      id: 'b_' + Date.now(),
      title: title,
      amount: amount,
      dueDay: dueDay,
      category: 'bills',
      autoReminder: true,
      paidMonths: []
    });

    await LifeStorage.saveState();
    showToast('Đã thêm hóa đơn định kỳ!');
    document.getElementById('modal-bill').classList.add('hidden');
    renderCurrentTab();
  }

  async function deleteBill(billId) {
    const state = LifeStorage.getState();
    if (confirm('Xóa hóa đơn định kỳ này?')) {
      state.bills = (state.bills || []).filter(b => b.id !== billId);
      await LifeStorage.saveState();
      renderCurrentTab();
    }
  }

  function openAddHabitModal() {
    document.getElementById('habit-title-input').value = '';
    document.getElementById('habit-icon-select').value = 'droplets';
    document.getElementById('modal-habit').classList.remove('hidden');
  }

  async function saveHabitForm(e) {
    e.preventDefault();
    const title = document.getElementById('habit-title-input').value.trim();
    const icon = document.getElementById('habit-icon-select').value;

    if (!title) return;

    const state = LifeStorage.getState();
    state.habits.push({
      id: 'h_' + Date.now(),
      title: title,
      icon: icon,
      streak: 0,
      completedDates: []
    });

    await LifeStorage.saveState();
    showToast('Đã thêm thói quen mới!');
    document.getElementById('modal-habit').classList.add('hidden');
    renderCurrentTab();
  }

  async function deleteHabit(habitId) {
    const state = LifeStorage.getState();
    if (confirm('Xóa thói quen này?')) {
      state.habits = state.habits.filter(h => h.id !== habitId);
      await LifeStorage.saveState();
      renderCurrentTab();
    }
  }

  function openAddNoteModal() {
    document.getElementById('note-title-input').value = '';
    document.getElementById('note-content-input').value = '';
    document.getElementById('modal-note').classList.remove('hidden');
  }

  async function saveNoteForm(e) {
    e.preventDefault();
    const title = document.getElementById('note-title-input').value.trim();
    const content = document.getElementById('note-content-input').value.trim();

    if (!title && !content) return;

    const state = LifeStorage.getState();
    if (!state.notes) state.notes = [];

    state.notes.unshift({
      id: 'n_' + Date.now(),
      title: title || 'Ghi chú nhanh',
      content: content,
      pinned: false,
      updatedAt: new Date().toISOString().slice(0, 10)
    });

    await LifeStorage.saveState();
    showToast('Đã lưu ghi chú!');
    document.getElementById('modal-note').classList.add('hidden');
    renderCurrentTab();
  }

  async function togglePinNote(noteId) {
    const state = LifeStorage.getState();
    const note = (state.notes || []).find(n => n.id === noteId);
    if (note) {
      note.pinned = !note.pinned;
      await LifeStorage.saveState();
      renderCurrentTab();
    }
  }

  async function deleteNote(noteId) {
    const state = LifeStorage.getState();
    state.notes = (state.notes || []).filter(n => n.id !== noteId);
    await LifeStorage.saveState();
    renderCurrentTab();
  }

  function openAddShoppingModal() {
    document.getElementById('shop-name-input').value = '';
    document.getElementById('shop-qty-input').value = '1';
    document.getElementById('shop-price-input').value = '';
    document.getElementById('modal-shopping').classList.remove('hidden');
  }

  async function saveShoppingForm(e) {
    e.preventDefault();
    const name = document.getElementById('shop-name-input').value.trim();
    const qty = document.getElementById('shop-qty-input').value.trim();
    const price = parseFloat(document.getElementById('shop-price-input').value) || 0;

    if (!name) return;

    const state = LifeStorage.getState();
    if (!state.shoppingList) state.shoppingList = [];

    state.shoppingList.push({
      id: 's_' + Date.now(),
      name: name,
      qty: qty || '1',
      estimatedPrice: price,
      bought: false
    });

    await LifeStorage.saveState();
    showToast('Đã thêm món vào danh sách mua sắm!');
    document.getElementById('modal-shopping').classList.add('hidden');
    renderCurrentTab();
  }

  async function deleteShoppingItem(itemId) {
    const state = LifeStorage.getState();
    state.shoppingList = (state.shoppingList || []).filter(i => i.id !== itemId);
    await LifeStorage.saveState();
    renderCurrentTab();
  }

  // Bind Global UI Events
  function bindGlobalEvents() {
    // Lock form submit
    dom.lockForm.addEventListener('submit', handleLockSubmit);

    // Quick Lock button
    dom.quickLockBtn.addEventListener('click', () => {
      LifeStorage.lock();
    });

    // Theme toggle
    dom.themeToggleBtn.addEventListener('click', toggleTheme);

    // Balance visibility toggle
    dom.toggleBalanceBtn.addEventListener('click', () => {
      hideBalances = !hideBalances;
      dom.toggleBalanceBtn.innerHTML = hideBalances ?
        `<i data-lucide="eye-off" class="w-5 h-5"></i>` :
        `<i data-lucide="eye" class="w-5 h-5"></i>`;
      renderCurrentTab();
      if (window.lucide) lucide.createIcons();
    });

    // Sidebar navigation clicks
    dom.sidebarNavLinks.forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        const tab = link.getAttribute('data-tab');
        switchTab(tab);
      });
    });

    // Bottom navigation clicks
    dom.bottomNavLinks.forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        const tab = link.getAttribute('data-tab');
        switchTab(tab);
      });
    });

    // When locked, show lock screen
    window.addEventListener('lifeos-locked', () => {
      checkLockState();
    });

    // Close modal on backdrop click or close button
    document.querySelectorAll('.modal-backdrop').forEach(modal => {
      modal.addEventListener('click', e => {
        if (e.target === modal) {
          modal.classList.add('hidden');
        }
      });
      const closeBtns = modal.querySelectorAll('.btn-close-modal');
      closeBtns.forEach(btn => {
        btn.addEventListener('click', () => modal.classList.add('hidden'));
      });
    });

    // File input handlers
    const backupFileInput = document.getElementById('backup-file-input');
    if (backupFileInput) {
      backupFileInput.addEventListener('change', e => {
        const file = e.target.files[0];
        if (file) handleBackupFileSelected(file);
      });
    }

    const statementFileInput = document.getElementById('statement-file-input');
    if (statementFileInput) {
      statementFileInput.addEventListener('change', e => {
        const file = e.target.files[0];
        if (file) handleStatementFile(file);
      });
    }

    // Drag and drop for statement
    const dropZone = document.getElementById('statement-drop-zone');
    if (dropZone) {
      ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, e => {
          e.preventDefault();
          e.stopPropagation();
          dropZone.classList.add('border-indigo-500', 'bg-indigo-50/20');
        }, false);
      });
      ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, e => {
          e.preventDefault();
          e.stopPropagation();
          dropZone.classList.remove('border-indigo-500', 'bg-indigo-50/20');
        }, false);
      });
      dropZone.addEventListener('drop', e => {
        const dt = e.dataTransfer;
        const file = dt.files[0];
        if (file) handleStatementFile(file);
      }, false);
    }
  }

  // Priority Helpers
  function getPriorityLabel(priority) {
    switch (priority) {
      case 'urgent_important': return 'Gấp & Quan trọng';
      case 'important': return 'Quan trọng';
      case 'urgent': return 'Khẩn cấp';
      default: return 'Bình thường';
    }
  }

  function getPriorityBadgeClass(priority) {
    switch (priority) {
      case 'urgent_important': return 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400';
      case 'important': return 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400';
      case 'urgent': return 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400';
      default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  return {
    init,
    switchTab,
    toggleTask,
    toggleHabit,
    toggleHabitSpecificDate,
    markBillPaid,
    unmarkBillPaid,
    openAddWalletModal,
    openEditWalletModal,
    saveWalletForm,
    deleteWallet,
    openAddTransactionModal,
    saveTransactionForm,
    deleteTransaction,
    openSMSParserModal,
    pasteFromClipboard,
    loadSampleSMS,
    executeSMSParse,
    confirmSMSParsedTransaction,
    openStatementModal,
    toggleStatementItem,
    changeStatementCategory,
    commitStatementImport,
    switchTasksSubView,
    openAddTaskModal,
    saveTaskForm,
    deleteTask,
    openAddBillModal,
    saveBillForm,
    deleteBill,
    openAddHabitModal,
    saveHabitForm,
    deleteHabit,
    switchNotesSubView,
    openAddNoteModal,
    saveNoteForm,
    togglePinNote,
    deleteNote,
    openAddShoppingModal,
    saveShoppingForm,
    toggleShoppingItem,
    clearPurchasedShoppingItems,
    deleteShoppingItem,
    handleAutoLockChange,
    exportBackup,
    triggerAutoSaveDisk,
    triggerImportBackup,
    handleChangeMasterPassword,
    handleWipeAllData,
    renderTransactionsList
  };
})();

// Attach to window and auto-start
window.LifeApp = LifeApp;
document.addEventListener('DOMContentLoaded', () => {
  LifeApp.init();
});

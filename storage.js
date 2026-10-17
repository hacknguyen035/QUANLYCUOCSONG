/**
 * LifeOS State & Storage Manager with Zero-Knowledge LocalStorage Encryption
 */

const LifeStorage = (() => {
  const VAULT_STORAGE_KEY = 'lifeos_vault';
  const SETTINGS_STORAGE_KEY = 'lifeos_public_settings';

  // In-memory decrypted state
  let appState = null;
  let currentPassword = null;
  let fileSystemHandle = null;

  // Inactivity auto-lock timer
  let idleTimer = null;
  let idleMinutes = 5; // default 5 minutes
  let lastActiveTimestamp = Date.now();

  // Listeners for state change
  const stateListeners = [];

  // Default seed data for brand new users
  function getDefaultState() {
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const twoDaysAgo = new Date(Date.now() - 172800000).toISOString().slice(0, 10);

    return {
      version: 1,
      createdAt: new Date().toISOString(),
      wallets: [
        {
          id: 'w_vcb',
          name: 'Vietcombank',
          bankCode: 'VCB',
          balance: 24500000,
          color: '#10b981',
          icon: 'landmark'
        },
        {
          id: 'w_tcb',
          name: 'Techcombank',
          bankCode: 'TCB',
          balance: 8900000,
          color: '#ef4444',
          icon: 'credit-card'
        },
        {
          id: 'w_cash',
          name: 'Tiền mặt (Ví)',
          bankCode: 'CASH',
          balance: 1200000,
          color: '#f59e0b',
          icon: 'wallet'
        }
      ],
      transactions: [
        {
          id: 'tx_1',
          walletId: 'w_vcb',
          type: 'income',
          amount: 25000000,
          category: 'salary',
          date: today,
          time: '09:00',
          note: 'Lương tháng hiện tại',
          source: 'manual'
        },
        {
          id: 'tx_2',
          walletId: 'w_vcb',
          type: 'expense',
          amount: 500000,
          category: 'bills',
          date: today,
          time: '11:15',
          note: 'Thanh toán tiền điện EVN',
          source: 'manual'
        },
        {
          id: 'tx_3',
          walletId: 'w_tcb',
          type: 'expense',
          amount: 65000,
          category: 'food',
          date: yesterday,
          time: '12:30',
          note: 'Cơm trưa văn phòng',
          source: 'manual'
        },
        {
          id: 'tx_4',
          walletId: 'w_cash',
          type: 'expense',
          amount: 80000,
          category: 'transport',
          date: twoDaysAgo,
          time: '17:40',
          note: 'Đổ xăng Petrolimex',
          source: 'manual'
        }
      ],
      tasks: [
        {
          id: 't_1',
          title: 'Hoàn thành báo cáo tổng kết tháng',
          date: today,
          priority: 'urgent_important',
          completed: false,
          category: 'work'
        },
        {
          id: 't_2',
          title: 'Thanh toán hóa đơn Internet & Nước',
          date: today,
          priority: 'important',
          completed: true,
          category: 'finance'
        },
        {
          id: 't_3',
          title: 'Đi siêu thị mua thực phẩm cuối tuần',
          date: today,
          priority: 'normal',
          completed: false,
          category: 'personal'
        }
      ],
      bills: [
        {
          id: 'b_1',
          title: 'Tiền điện EVN',
          amount: 650000,
          dueDay: 15,
          category: 'bills',
          autoReminder: true,
          paidMonths: [today.slice(0, 7)]
        },
        {
          id: 'b_2',
          title: 'Internet cáp quang Viettel',
          amount: 220000,
          dueDay: 20,
          category: 'bills',
          autoReminder: true,
          paidMonths: []
        },
        {
          id: 'b_3',
          title: 'Tiền nước sinh hoạt Sawaco',
          amount: 150000,
          dueDay: 25,
          category: 'bills',
          autoReminder: true,
          paidMonths: []
        },
        {
          id: 'b_4',
          title: 'Dư nợ Thẻ tín dụng',
          amount: 3500000,
          dueDay: 28,
          category: 'bills',
          autoReminder: true,
          paidMonths: []
        }
      ],
      habits: [
        {
          id: 'h_1',
          title: 'Uống đủ 2L nước mỗi ngày',
          icon: 'droplets',
          streak: 5,
          completedDates: [twoDaysAgo, yesterday, today]
        },
        {
          id: 'h_2',
          title: 'Tập thể dục 30 phút (Gym / Chạy)',
          icon: 'dumbbell',
          streak: 3,
          completedDates: [twoDaysAgo, yesterday]
        },
        {
          id: 'h_3',
          title: 'Đọc sách 20 trang',
          icon: 'book-open',
          streak: 7,
          completedDates: [twoDaysAgo, yesterday, today]
        },
        {
          id: 'h_4',
          title: 'Ngủ sớm trước 23h00',
          icon: 'moon',
          streak: 2,
          completedDates: [yesterday]
        }
      ],
      notes: [
        {
          id: 'n_1',
          title: 'Mục tiêu tài chính quý này',
          content: '- Tiết kiệm 30% thu nhập mỗi tháng\n- Hạn chế ăn ngoài quá 3 lần/tuần\n- Tìm hiểu thêm về chứng chỉ quỹ mở',
          color: 'emerald',
          pinned: true,
          updatedAt: today
        },
        {
          id: 'n_2',
          title: 'Ý tưởng dự án cá nhân',
          content: 'Phát triển LifeOS PWA chạy mượt trên cả iPhone và PC, bảo mật hoàn toàn với Web Crypto.',
          color: 'blue',
          pinned: false,
          updatedAt: today
        }
      ],
      shoppingList: [
        { id: 's_1', name: 'Sữa tươi không đường (1 Thùng)', qty: '1', estimatedPrice: 380000, bought: true },
        { id: 's_2', name: 'Trứng gà ta', qty: '20 quả', estimatedPrice: 70000, bought: false },
        { id: 's_3', name: 'Ức gà tươi CP', qty: '1.5 kg', estimatedPrice: 125000, bought: false },
        { id: 's_4', name: 'Rau cải xanh & Cà rốt', qty: '1 túi', estimatedPrice: 45000, bought: false },
        { id: 's_5', name: 'Dầu ô liu Extra Virgin', qty: '1 chai', estimatedPrice: 160000, bought: true }
      ],
      settings: {
        theme: 'dark',
        autoLockMinutes: 5,
        currency: '₫',
        lastBackup: null
      }
    };
  }

  // Public unencrypted settings (like theme) so lock screen renders in user's preferred theme
  function getPublicSettings() {
    try {
      const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : { theme: 'dark' };
    } catch (e) {
      return { theme: 'dark' };
    }
  }

  function setPublicSettings(settings) {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {}
  }

  // Check if a vault already exists
  function hasVault() {
    return !!localStorage.getItem(VAULT_STORAGE_KEY);
  }

  /**
   * Initialize a new vault with a master password
   */
  async function initVault(masterPassword) {
    if (!masterPassword || masterPassword.length < 4) {
      throw new Error('Mật khẩu chính phải có ít nhất 4 ký tự.');
    }

    const state = getDefaultState();
    const publicSettings = getPublicSettings();
    state.settings.theme = publicSettings.theme || 'dark';

    const encrypted = await LifeCrypto.encrypt(state, masterPassword);
    localStorage.setItem(VAULT_STORAGE_KEY, encrypted);

    appState = state;
    currentPassword = masterPassword;
    idleMinutes = state.settings.autoLockMinutes || 5;

    resetIdleTimer();
    notifyStateChanged();
    return true;
  }

  /**
   * Unlock existing vault with master password
   */
  async function unlockVault(masterPassword) {
    const encrypted = localStorage.getItem(VAULT_STORAGE_KEY);
    if (!encrypted) {
      throw new Error('Chưa tìm thấy kho dữ liệu. Vui lòng thiết lập mật khẩu lần đầu.');
    }

    const decrypted = await LifeCrypto.decrypt(encrypted, masterPassword);
    if (!decrypted || typeof decrypted !== 'object') {
      throw new Error('Dữ liệu giải mã không hợp lệ.');
    }

    appState = decrypted;
    currentPassword = masterPassword;
    idleMinutes = appState.settings?.autoLockMinutes ?? 5;

    // Apply theme
    if (appState.settings?.theme) {
      setPublicSettings({ theme: appState.settings.theme });
    }

    resetIdleTimer();
    notifyStateChanged();
    return true;
  }

  /**
   * Save current in-memory state to encrypted vault in localStorage
   * Also triggers automatic file system backup if handle exists
   */
  async function saveState() {
    if (!appState || !currentPassword) {
      return false;
    }

    appState.updatedAt = new Date().toISOString();

    const encrypted = await LifeCrypto.encrypt(appState, currentPassword);
    localStorage.setItem(VAULT_STORAGE_KEY, encrypted);

    // Sync public theme setting
    if (appState.settings?.theme) {
      setPublicSettings({ theme: appState.settings.theme });
    }

    // Auto-save to local file system if authorized
    if (fileSystemHandle) {
      try {
        await LifeCrypto.saveToFileSystem(encrypted, fileSystemHandle);
        appState.settings.lastBackup = new Date().toISOString();
      } catch (err) {
        console.warn('Auto-save to disk failed:', err);
      }
    }

    notifyStateChanged();
    return true;
  }

  /**
   * Lock the app immediately
   */
  function lock() {
    appState = null;
    currentPassword = null;
    if (idleTimer) {
      clearTimeout(idleTimer);
      idleTimer = null;
    }
    window.dispatchEvent(new CustomEvent('lifeos-locked'));
  }

  function isLocked() {
    return appState === null || currentPassword === null;
  }

  function getState() {
    return appState;
  }

  /**
   * Subscribe to state modifications
   */
  function onStateChange(listener) {
    stateListeners.push(listener);
    return () => {
      const idx = stateListeners.indexOf(listener);
      if (idx !== -1) stateListeners.splice(idx, 1);
    };
  }

  function notifyStateChanged() {
    for (const listener of stateListeners) {
      try {
        listener(appState);
      } catch (e) {
        console.error('State listener error:', e);
      }
    }
  }

  /**
   * Idle timer & activity monitoring
   */
  function resetIdleTimer() {
    lastActiveTimestamp = Date.now();
    if (idleTimer) clearTimeout(idleTimer);

    if (idleMinutes <= 0 || isLocked()) return;

    idleTimer = setTimeout(() => {
      console.log(`Tự động khóa sau ${idleMinutes} phút không thao tác.`);
      lock();
    }, idleMinutes * 60 * 1000);
  }

  // Setup global user activity listeners
  function setupActivityListeners() {
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    let throttleTimer = null;

    const handleUserActivity = () => {
      if (isLocked()) return;
      if (!throttleTimer) {
        throttleTimer = setTimeout(() => {
          throttleTimer = null;
          resetIdleTimer();
        }, 1000);
      }
    };

    events.forEach(evt => {
      window.addEventListener(evt, handleUserActivity, { passive: true });
    });
  }

  /**
   * Export encrypted vault to .enc string
   */
  async function exportEncryptedBackup() {
    if (!appState || !currentPassword) {
      throw new Error('Vui lòng mở khóa trước khi xuất sao lưu.');
    }
    const encrypted = await LifeCrypto.encrypt(appState, currentPassword);
    LifeCrypto.downloadBackupFile(encrypted);
    appState.settings.lastBackup = new Date().toISOString();
    await saveState();
    return true;
  }

  /**
   * Import from an encrypted backup file string
   */
  async function importEncryptedBackup(fileContentStr, password) {
    const decrypted = await LifeCrypto.decrypt(fileContentStr, password);
    if (!decrypted || !decrypted.wallets || !decrypted.transactions) {
      throw new Error('Dữ liệu file sao lưu không tương thích với LifeOS.');
    }

    appState = decrypted;
    currentPassword = password;
    idleMinutes = appState.settings?.autoLockMinutes ?? 5;

    await saveState();
    resetIdleTimer();
    notifyStateChanged();
    return true;
  }

  /**
   * Change Master Password
   */
  async function changePassword(oldPassword, newPassword) {
    if (oldPassword !== currentPassword) {
      throw new Error('Mật khẩu hiện tại không chính xác!');
    }
    if (!newPassword || newPassword.length < 4) {
      throw new Error('Mật khẩu mới phải có ít nhất 4 ký tự.');
    }

    currentPassword = newPassword;
    await saveState();
    return true;
  }

  /**
   * Link File System Access API for auto disk backup
   */
  async function setupAutoSaveFile() {
    if (!appState || !currentPassword) throw new Error('Cần mở khóa trước.');
    const encrypted = await LifeCrypto.encrypt(appState, currentPassword);
    fileSystemHandle = await LifeCrypto.saveToFileSystem(encrypted);
    appState.settings.hasFileHandle = true;
    appState.settings.lastBackup = new Date().toISOString();
    await saveState();
    return fileSystemHandle.name;
  }

  /**
   * Reset / Delete all vault data completely
   */
  function wipeAllData() {
    localStorage.removeItem(VAULT_STORAGE_KEY);
    localStorage.removeItem(SETTINGS_STORAGE_KEY);
    appState = null;
    currentPassword = null;
    fileSystemHandle = null;
    window.location.reload();
  }

  // Auto initialize activity tracker
  setupActivityListeners();

  return {
    hasVault,
    initVault,
    unlockVault,
    saveState,
    lock,
    isLocked,
    getState,
    onStateChange,
    exportEncryptedBackup,
    importEncryptedBackup,
    changePassword,
    setupAutoSaveFile,
    wipeAllData,
    getPublicSettings,
    setPublicSettings,
    resetIdleTimer
  };
})();

// Attach to window
window.LifeStorage = LifeStorage;

/**
 * Smart Vietnamese Banking SMS & Notification Parser + Statement Importer
 * Auto-detects Bank, Amount (+/-), Date/Time, Description, Category, New Balance
 */

const LifeParser = (() => {
  // Category keywords definition with weights and icons
  const CATEGORIES = [
    {
      id: 'food',
      name: 'Ăn uống & Cafe',
      icon: 'utensils',
      color: '#f97316',
      keywords: [
        'cafe', 'ca phe', 'coffee', 'highlands', 'phuclong', 'phuc long', 'starbucks', 'kfc',
        'lotteria', 'mcdonald', 'pizza', 'com', 'pho', 'bun', 'banh mi', 'tra sua', 'gongcha',
        'koi the', 'the coffee house', 'mixue', 'baemin', 'shopeefood', 'grabfood', 'befood',
        'haidilao', 'kichi', 'gogi', 'buffet', 'quan an', 'nha hang', 'lau', 'nuoc uong', 'an sang',
        'an trua', 'an toi', 'bep', 'che', 'banh ngot', 'chewy'
      ]
    },
    {
      id: 'shopping',
      name: 'Mua sắm & Tiêu dùng',
      icon: 'shopping-bag',
      color: '#ec4899',
      keywords: [
        'shopee', 'lazada', 'tiki', 'tiktok shop', 'tiktokshop', 'sieu thi', 'winmart', 'vinmart',
        'coopmart', 'co.op', 'bach hoa xanh', 'bachhoaxanh', 'circle k', 'circlek', 'gs25',
        '7-eleven', 'family mart', 'familymart', 'uniqlo', 'zara', 'h&m', 'decathlon', 'mua sam',
        'dien may xanh', 'the gioi di dong', 'fpt shop', 'cellphones', 'hasaki', 'guardian', 'watsons',
        'aeon', 'lotte', 'mega market', 'an nam gourmet'
      ]
    },
    {
      id: 'transport',
      name: 'Di chuyển & Xăng xe',
      icon: 'car',
      color: '#06b6d4',
      keywords: [
        'grab', 'grab car', 'grab bike', 'be bike', 'be car', 'xanh sm', 'xanhsm', 'gsm', 'gojek',
        'mai linh', 'vnasun', 'taxi', 'xang', 'petrolimex', 'pvoil', 'gui xe', 've xe', 'tram thu phi',
        'vetc', 'epass', 've may bay', 'vietnam airlines', 'vietjet', 'bamboo', 'xe khach', 'tau hoa'
      ]
    },
    {
      id: 'bills',
      name: 'Hóa đơn & Tiện ích',
      icon: 'receipt',
      color: '#eab308',
      keywords: [
        'dien', 'evn', 'nuoc', 'cap nuoc', 'sawaco', 'hawaco', 'internet', 'fpt telecom', 'viettel',
        'vnpt', 'mobifone', 'vinaphone', 'netflix', 'spotify', 'youtube', 'icloud', 'google one',
        'truyen hinh', 'phi chung cu', 'phi quan ly', 've sinh', 'the tin dung', 'tra gop', 'fe credit',
        'home credit', 'shinhan'
      ]
    },
    {
      id: 'housing',
      name: 'Nhà cửa & Sinh hoạt',
      icon: 'home',
      color: '#8b5cf6',
      keywords: [
        'thue nha', 'tien nha', 'phong tro', 'tien tro', 'noi that', 'sua nha', 'dien nuoc', 'gas',
        'khoa cua', 've sinh nha', 'giat ui', 'giat say'
      ]
    },
    {
      id: 'salary',
      name: 'Lương & Thu nhập',
      icon: 'trending-up',
      color: '#10b981',
      keywords: [
        'luong', 'salary', 'thuong', 'bonus', 'tam ung', 'hoa hong', 'nhan tien tu', 'chuyen tien tu',
        'tra no', 'hoan tien', 'cashback', 'lai tiet kiem', 'co tuc', 'ban hang', 'freelance'
      ]
    },
    {
      id: 'health',
      name: 'Sức khỏe & Y tế',
      icon: 'heart-pulse',
      color: '#ef4444',
      keywords: [
        'gym', 'yoga', 'fitness', 'benh vien', 'phong kham', 'bac si', 'nha khoa', 'thuoc',
        'nha thuoc', 'pharmacity', 'long chau', 'an khang', 'xet nghiem', 'bao hiem', 'mat kinh',
        'massage', 'spa'
      ]
    },
    {
      id: 'education',
      name: 'Học tập & Tri thức',
      icon: 'book-open',
      color: '#3b82f6',
      keywords: [
        'sach', 'book', 'fahasa', 'nha sach', 'khoa hoc', 'hoc phi', 'hoc tieng anh', 'ielts',
        'udemy', 'coursera', 'truong hoc', 'dao tao', 'chung chi'
      ]
    },
    {
      id: 'entertainment',
      name: 'Giải trí & Du lịch',
      icon: 'gamepad-2',
      color: '#a855f7',
      keywords: [
        'cgv', 'lotte cinema', 'bhd', 'galaxy', 'xem phim', 'rap chieu', 'steam', 'playstation',
        'nintendo', 'game', 'khach san', 'resort', 'homestay', 'booking.com', 'agoda', 'traveloka',
        'karaoke', 'billiard', 'tour'
      ]
    },
    {
      id: 'other',
      name: 'Khác & Chuyển khoản',
      icon: 'arrow-left-right',
      color: '#64748b',
      keywords: []
    }
  ];

  // Bank signature keywords
  const BANKS = [
    { code: 'VCB', name: 'Vietcombank', regex: /vietcombank|vcb/i },
    { code: 'TCB', name: 'Techcombank', regex: /techcombank|tcb|f@st mobile/i },
    { code: 'MB', name: 'MBBank', regex: /mbbank|mb bank|\bmb\b|09xxx085|0911188085/i },
    { code: 'ACB', name: 'ACB', regex: /\bacb\b/i },
    { code: 'VPB', name: 'VPBank', regex: /vpbank|vpb/i },
    { code: 'BIDV', name: 'BIDV', regex: /bidv/i },
    { code: 'CTG', name: 'VietinBank', regex: /vietinbank|ctg|vietin/i },
    { code: 'TPB', name: 'TPBank', regex: /tpbank|tpb/i },
    { code: 'STB', name: 'Sacombank', regex: /sacombank|stb/i },
    { code: 'TIMO', name: 'Timo', regex: /timo/i },
    { code: 'MOMO', name: 'MoMo', regex: /momo/i },
    { code: 'ZALOPAY', name: 'ZaloPay', regex: /zalopay/i },
    { code: 'MSB', name: 'MSB', regex: /msb|maritime/i },
    { code: 'OCB', name: 'OCB', regex: /ocb/i },
    { code: 'SHB', name: 'SHB', regex: /shb/i }
  ];

  // Utility: strip accents for fuzzy matching
  function removeAccents(str) {
    if (!str) return '';
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase();
  }

  /**
   * Automatically categorize description string based on keywords
   */
  function autoCategorize(text, isIncome = false) {
    if (isIncome) {
      return 'salary'; // Default income category
    }

    const clean = removeAccents(text);

    for (const cat of CATEGORIES) {
      if (cat.id === 'other') continue;
      for (const kw of cat.keywords) {
        const cleanKw = removeAccents(kw);
        // Word boundary or contains match
        if (clean.includes(cleanKw)) {
          return cat.id;
        }
      }
    }
    return 'other';
  }

  /**
   * Parse Vietnamese SMS or App Notification text
   */
  function parseSMS(rawText) {
    if (!rawText || typeof rawText !== 'string') {
      throw new Error('Nội dung tin nhắn không hợp lệ.');
    }

    const text = rawText.trim();
    const cleanLower = text.toLowerCase();

    // 1. Detect Bank
    let detectedBank = null;
    for (const bank of BANKS) {
      if (bank.regex.test(text)) {
        detectedBank = bank;
        break;
      }
    }

    // 2. Detect Transaction Type (Income vs Expense)
    // Common clues: + / - in amount, "nhan tien", "chuyen tien", "thanh toan", "rut tien", "nap tien"
    let isIncome = false;
    let isExplicitSign = false;

    // Check for + or - directly preceding number
    const signMatch = text.match(/([+-])\s*([0-9.,]+)\s*(?:VND|đ|d)?/i);
    if (signMatch) {
      isExplicitSign = true;
      isIncome = signMatch[1] === '+';
    } else if (
      /(nhan tien|chuyen tien tu|cong tien|hoan tien|tien vao|\bthu\b|\+)/i.test(text)
    ) {
      isIncome = true;
    } else if (
      /(chuyen tien den|thanh toan|rut tien|tru tien|phi dich vu|mua hang|\bchi\b|-)/i.test(text)
    ) {
      isIncome = false;
    }

    // 3. Extract Amount
    let amount = 0;
    // Look for amounts with VND / đ or explicit +/-
    const amountPatterns = [
      /([+-]?\s*[0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]+)?)\s*(?:VND|vnd|VNĐ|vnđ|đ|d\b)/i,
      /GD:\s*([+-]?\s*[0-9.,]+)/i,
      /(?:tang|giam|thay doi)\s*([+-]?\s*[0-9.,]+)/i,
      /so tien:\s*([+-]?\s*[0-9.,]+)/i,
      /([+-]\s*[0-9]{1,3}(?:[.,][0-9]{3})+)/
    ];

    for (const pattern of amountPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        let rawNum = match[1].replace(/\s+/g, '');
        if (rawNum.startsWith('+')) {
          isIncome = true;
          rawNum = rawNum.slice(1);
        } else if (rawNum.startsWith('-')) {
          isIncome = false;
          rawNum = rawNum.slice(1);
        }
        // Normalize Vietnamese number format (dots for thousands: 1.000.000 or commas 1,000,000)
        let normalized = rawNum;
        if (normalized.includes('.') && normalized.includes(',')) {
          // 1.000,50 -> 1000.50 or 1,000.50 -> 1000.50
          if (normalized.lastIndexOf(',') > normalized.lastIndexOf('.')) {
            normalized = normalized.replace(/\./g, '').replace(',', '.');
          } else {
            normalized = normalized.replace(/,/g, '');
          }
        } else if (normalized.includes('.')) {
          // If ends with .00 or multiple dots like 100.000
          if ((normalized.match(/\./g) || []).length > 1 || /\.[0-9]{3}$/.test(normalized)) {
            normalized = normalized.replace(/\./g, '');
          }
        } else if (normalized.includes(',')) {
          if ((normalized.match(/,/g) || []).length > 1 || /,[0-9]{3}$/.test(normalized)) {
            normalized = normalized.replace(/,/g, '');
          }
        }
        const parsedVal = parseFloat(normalized);
        if (!isNaN(parsedVal) && parsedVal > 0) {
          amount = parsedVal;
          break;
        }
      }
    }

    // 4. Extract Date and Time
    let dateStr = new Date().toISOString().slice(0, 10);
    let timeStr = new Date().toTimeString().slice(0, 5);

    // Look for patterns like "10:15 15/10/2026" or "15/10/2026 10:15:30" or "15/10/26"
    const dateTimeMatch = text.match(/(\d{1,2}:\d{2}(?::\d{2})?)\s+(?:ngay|luc\s+)?(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})|(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s+(?:luc\s+)?(\d{1,2}:\d{2}(?::\d{2})?)/i);
    if (dateTimeMatch) {
      let foundTime = dateTimeMatch[1] || dateTimeMatch[4];
      let foundDate = dateTimeMatch[2] || dateTimeMatch[3];
      if (foundTime) {
        timeStr = foundTime.slice(0, 5);
      }
      if (foundDate) {
        const parts = foundDate.split(/[/-]/);
        if (parts.length === 3) {
          let day = parts[0].padStart(2, '0');
          let month = parts[1].padStart(2, '0');
          let year = parts[2];
          if (year.length === 2) year = '20' + year;
          dateStr = `${year}-${month}-${day}`;
        }
      }
    } else {
      // Look for standalone date DD/MM/YYYY
      const dateMatch = text.match(/(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/);
      if (dateMatch) {
        const parts = dateMatch[1].split(/[/-]/);
        if (parts.length === 3) {
          let day = parts[0].padStart(2, '0');
          let month = parts[1].padStart(2, '0');
          let year = parts[2];
          if (year.length === 2) year = '20' + year;
          dateStr = `${year}-${month}-${day}`;
        }
      }
    }

    // 5. Extract Content / Description
    let description = '';

    // Check for pipe-delimited MB Bank format first:
    // TK 09xxx085|GD: -30,000VND 17/10/26 11:30 |SD: 642,002VND|DEN: HKD HOANG THI HUONG - 1063640824|ND: NGUYEN CUONG THINH chuyen tien
    const recipientMatch = text.match(/(?:DEN|Den|Nguoi nhan):\s*([^|\n]+)/i);
    const contentMatch = text.match(/(?:ND|Noi dung|Noi dung GD|Ref|Ghi chu|Diengiai|Dien giai|Ly do):\s*([^|\n]+)/i);

    if (recipientMatch || contentMatch) {
      const parts = [];
      if (recipientMatch && recipientMatch[1]) parts.push(recipientMatch[1].trim());
      if (contentMatch && contentMatch[1]) parts.push(contentMatch[1].trim());
      description = parts.join(' • ');
    }

    if (!description) {
      const descMatches = [
        /(?:ND|Noi dung|Noi dung GD|Ref|Ghi chu|Diengiai|Dien giai|Ly do):\s*([^.\n]+)/i,
        /(?:tai|den|cho)\s+([A-Za-z0-9\s._-]+?)(?:\.|\s+SD:|\s+So du:|$)/i
      ];

      for (const dm of descMatches) {
        const match = text.match(dm);
        if (match && match[1]) {
          description = match[1].trim();
          break;
        }
      }
    }

    if (!description) {
      // Fallback: take tail part or snippet of message
      const cleaned = text.replace(/TK\s*[0-9xX*]+/i, '').replace(/SD:\s*[0-9.,]+VND/i, '');
      description = cleaned.slice(0, 60).trim();
    }

    // 6. Extract New Balance (Số dư sau GD)
    let newBalance = null;
    const balanceMatch = text.match(/(?:SD|So du|Balance):\s*([0-9.,]+)\s*(?:VND|đ|d)?/i);
    if (balanceMatch && balanceMatch[1]) {
      let rawBal = balanceMatch[1].replace(/\./g, '').replace(/,/g, '');
      const parsedBal = parseFloat(rawBal);
      if (!isNaN(parsedBal)) {
        newBalance = parsedBal;
      }
    }

    // 7. Auto-categorize
    const category = autoCategorize(description, isIncome);

    return {
      success: amount > 0,
      bank: detectedBank ? detectedBank.name : null,
      bankCode: detectedBank ? detectedBank.code : null,
      type: isIncome ? 'income' : 'expense',
      amount: amount,
      date: dateStr,
      time: timeStr,
      description: description,
      newBalance: newBalance,
      category: category,
      rawText: text
    };
  }

  /**
   * Parse CSV or Excel Statement File using SheetJS (XLSX)
   * Expects a File or ArrayBuffer
   */
  async function parseStatementFile(file) {
    if (!window.XLSX) {
      throw new Error('Thư viện đọc file Excel chưa sẵn sàng. Vui lòng kiểm tra kết nối mạng!');
    }

    const data = await file.arrayBuffer();
    const workbook = window.XLSX.read(data, { type: 'array', cellDates: true });

    // Use the first sheet
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    // Convert to 2D array of rows
    const rows = window.XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

    if (!rows || rows.length < 2) {
      throw new Error('File không có dữ liệu hoặc định dạng rỗng.');
    }

    // Find header row by inspecting common bank header terms
    let headerRowIdx = -1;
    let colMap = {
      date: -1,
      amount: -1,
      credit: -1, // Phát sinh có (Income)
      debit: -1,  // Phát sinh nợ (Expense)
      desc: -1,
      balance: -1
    };

    for (let i = 0; i < Math.min(rows.length, 15); i++) {
      const row = rows[i].map(c => removeAccents(String(c)).trim());

      let foundDate = row.findIndex(c => c.includes('ngay') || c.includes('date') || c.includes('thoi gian'));
      let foundAmount = row.findIndex(c => c.includes('so tien') || c.includes('amount') || c.includes('bien dong'));
      let foundDebit = row.findIndex(c => c.includes('phat sinh no') || c.includes('rut') || c.includes('chi') || c.includes('debit'));
      let foundCredit = row.findIndex(c => c.includes('phat sinh co') || c.includes('gui') || c.includes('thu') || c.includes('credit'));
      let foundDesc = row.findIndex(c => c.includes('noi dung') || c.includes('dien giai') || c.includes('chi tiet') || c.includes('description') || c.includes('remarks'));
      let foundBal = row.findIndex(c => c.includes('so du') || c.includes('balance'));

      if (foundDate !== -1 && (foundAmount !== -1 || (foundDebit !== -1 && foundCredit !== -1) || foundDesc !== -1)) {
        headerRowIdx = i;
        colMap.date = foundDate;
        colMap.amount = foundAmount;
        colMap.debit = foundDebit;
        colMap.credit = foundCredit;
        colMap.desc = foundDesc !== -1 ? foundDesc : (foundDebit !== -1 ? foundDebit + 1 : 2);
        colMap.balance = foundBal;
        break;
      }
    }

    // If no header found, guess standard columns
    if (headerRowIdx === -1) {
      headerRowIdx = 0;
      colMap.date = 0;
      colMap.desc = 1;
      colMap.amount = 2;
    }

    const parsedTransactions = [];

    for (let r = headerRowIdx + 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.length === 0) continue;

      // Extract Date
      let rawDate = row[colMap.date];
      if (!rawDate) continue;

      let dateStr = '';
      if (rawDate instanceof Date) {
        dateStr = rawDate.toISOString().slice(0, 10);
      } else {
        const dMatch = String(rawDate).match(/(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
        if (dMatch) {
          let day = dMatch[1].padStart(2, '0');
          let month = dMatch[2].padStart(2, '0');
          let year = dMatch[3];
          if (year.length === 2) year = '20' + year;
          dateStr = `${year}-${month}-${day}`;
        }
      }

      if (!dateStr) continue;

      // Extract Description
      let description = colMap.desc !== -1 && row[colMap.desc] ? String(row[colMap.desc]).trim() : 'Sao kê ngân hàng';

      // Extract Amount & Type
      let amount = 0;
      let type = 'expense';

      if (colMap.debit !== -1 && colMap.credit !== -1) {
        const rawDebit = row[colMap.debit];
        const rawCredit = row[colMap.credit];
        const numDebit = cleanNumber(rawDebit);
        const numCredit = cleanNumber(rawCredit);

        if (numCredit > 0) {
          amount = numCredit;
          type = 'income';
        } else if (numDebit > 0) {
          amount = numDebit;
          type = 'expense';
        }
      } else if (colMap.amount !== -1) {
        const rawAmt = row[colMap.amount];
        const num = cleanNumber(rawAmt);
        if (num < 0) {
          amount = Math.abs(num);
          type = 'expense';
        } else if (num > 0) {
          // If text description has clues or starts with '-'
          if (String(rawAmt).includes('-')) {
            amount = num;
            type = 'expense';
          } else {
            // Check description for signs
            amount = num;
            type = /(chuyen den|nhan tu|luong|hoan tien|\+)/i.test(description) ? 'income' : 'expense';
          }
        }
      }

      if (amount <= 0) continue;

      const category = autoCategorize(description, type === 'income');

      parsedTransactions.push({
        id: 'tx_imp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
        date: dateStr,
        amount: amount,
        type: type,
        description: description,
        category: category,
        selected: true
      });
    }

    return parsedTransactions;
  }

  function cleanNumber(val) {
    if (val === null || val === undefined || val === '') return 0;
    if (typeof val === 'number') return val;
    let s = String(val).trim().replace(/\s+/g, '');
    let isNeg = s.startsWith('-');
    if (isNeg) s = s.slice(1);
    s = s.replace(/[^0-9.,]/g, '');
    if (s.includes('.') && s.includes(',')) {
      if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
        s = s.replace(/\./g, '').replace(',', '.');
      } else {
        s = s.replace(/,/g, '');
      }
    } else if (s.includes('.')) {
      if ((s.match(/\./g) || []).length > 1 || /\.[0-9]{3}$/.test(s)) {
        s = s.replace(/\./g, '');
      }
    } else if (s.includes(',')) {
      if ((s.match(/,/g) || []).length > 1 || /,[0-9]{3}$/.test(s)) {
        s = s.replace(/,/g, '');
      }
    }
    const num = parseFloat(s);
    return isNaN(num) ? 0 : (isNeg ? -num : num);
  }

  return {
    CATEGORIES,
    BANKS,
    parseSMS,
    autoCategorize,
    parseStatementFile
  };
})();

// Attach to window
window.LifeParser = LifeParser;

/**
 * LifeOS Web Crypto Module (PBKDF2 + AES-GCM 256-bit)
 * 100% Client-side zero-knowledge encryption
 */

const LifeCrypto = (() => {
  const PBKDF2_ITERATIONS = 150000;
  const SALT_LENGTH = 16;
  const IV_LENGTH = 12; // Standard for AES-GCM

  // Helper: Convert ArrayBuffer to Base64
  function bufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  // Helper: Convert Base64 to ArrayBuffer
  function base64ToBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  // Helper: Convert string to UTF-8 Uint8Array
  function textToBuffer(text) {
    return new TextEncoder().encode(text);
  }

  // Helper: Convert UTF-8 Uint8Array to string
  function bufferToText(buffer) {
    return new TextDecoder().decode(buffer);
  }

  /**
   * Derive AES-GCM key from password and salt using PBKDF2
   */
  async function deriveKey(password, salt) {
    const passwordBuffer = textToBuffer(password);
    const baseKey = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    return await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: PBKDF2_ITERATIONS,
        hash: 'SHA-256'
      },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypt a JavaScript object / string with password
   * Returns a portable JSON string envelope with salt, iv, and ciphertext
   */
  async function encrypt(data, password) {
    if (!password || typeof password !== 'string') {
      throw new Error('Mật khẩu không hợp lệ.');
    }

    const plaintext = typeof data === 'string' ? data : JSON.stringify(data);
    const plainBuffer = textToBuffer(plaintext);

    // Generate random salt and IV
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

    const key = await deriveKey(password, salt);

    const ciphertextBuffer = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      plainBuffer
    );

    const envelope = {
      app: 'PersonalLifeOS',
      version: 1,
      createdAt: new Date().toISOString(),
      salt: bufferToBase64(salt),
      iv: bufferToBase64(iv),
      data: bufferToBase64(ciphertextBuffer)
    };

    return JSON.stringify(envelope);
  }

  /**
   * Decrypt envelope string with password
   * Returns parsed JS Object or raw text
   */
  async function decrypt(encryptedEnvelopeStr, password) {
    if (!password || typeof password !== 'string') {
      throw new Error('Vui lòng nhập mật khẩu.');
    }

    let envelope;
    try {
      envelope = JSON.parse(encryptedEnvelopeStr);
    } catch (e) {
      throw new Error('Định dạng dữ liệu mã hóa không hợp lệ.');
    }

    if (!envelope.salt || !envelope.iv || !envelope.data) {
      throw new Error('Thiếu thông số giải mã (salt, iv hoặc ciphertext).');
    }

    const salt = new Uint8Array(base64ToBuffer(envelope.salt));
    const iv = new Uint8Array(base64ToBuffer(envelope.iv));
    const ciphertextBuffer = base64ToBuffer(envelope.data);

    let key;
    try {
      key = await deriveKey(password, salt);
    } catch (err) {
      throw new Error('Lỗi khởi tạo khóa mã hóa: ' + err.message);
    }

    try {
      const decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        key,
        ciphertextBuffer
      );

      const plaintext = bufferToText(decryptedBuffer);
      try {
        return JSON.parse(plaintext);
      } catch (e) {
        return plaintext;
      }
    } catch (err) {
      // AES-GCM fails authentication if password/key is wrong or content is tampered
      throw new Error('MẬT KHẨU KHÔNG ĐÚNG hoặc dữ liệu đã bị chỉnh sửa!');
    }
  }

  /**
   * Quick check to verify if a password can unlock an encrypted envelope
   */
  async function verifyPassword(encryptedEnvelopeStr, password) {
    try {
      await decrypt(encryptedEnvelopeStr, password);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * File System Access API integration (PC Chrome/Edge)
   * Allows saving encrypted backup directly to local disk
   */
  async function saveToFileSystem(contentStr, existingHandle = null) {
    if (!('showSaveFilePicker' in window)) {
      throw new Error('Trình duyệt không hỗ trợ File System Access API.');
    }

    let handle = existingHandle;
    if (!handle) {
      const dateStr = new Date().toISOString().slice(0, 10);
      handle = await window.showSaveFilePicker({
        suggestedName: `LifeOS_Backup_${dateStr}.enc`,
        types: [
          {
            description: 'LifeOS Encrypted Backup (*.enc)',
            accept: { 'application/octet-stream': ['.enc'] }
          }
        ]
      });
    }

    const writable = await handle.createWritable();
    await writable.write(contentStr);
    await writable.close();
    return handle;
  }

  /**
   * Trigger direct file download in browser for .enc file
   */
  function downloadBackupFile(encryptedContentStr, filename = null) {
    if (!filename) {
      const dateStr = new Date().toISOString().slice(0, 10);
      filename = `LifeOS_Backup_${dateStr}.enc`;
    }
    const blob = new Blob([encryptedContentStr], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }

  return {
    encrypt,
    decrypt,
    verifyPassword,
    saveToFileSystem,
    downloadBackupFile
  };
})();

// Attach to window
window.LifeCrypto = LifeCrypto;

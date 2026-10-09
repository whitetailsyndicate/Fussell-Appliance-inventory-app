/* GitHub Pages test backend. Photos and test inventory stay in this browser. */
(function () {
  'use strict';
  let database;
  let workerPromise;
  const storeName = 'intake';
  function openDatabase() {
    if (!database) database = new Promise((resolve, reject) => {
      const request = indexedDB.open('fussell-iphone-test', 1);
      request.onupgradeneeded = () => request.result.createObjectStore(storeName, { keyPath: 'id' });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error('Test storage is unavailable. Use a normal Safari tab and allow website storage.'));
    });
    return database;
  }
  async function requestStore(mode, operation) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, mode);
      const request = operation(transaction.objectStore(storeName));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onerror = transaction.onabort = () => reject(new Error('Could not save test inventory. Export existing entries and check available device storage.'));
    });
  }
  function idInfo(value) {
    const id = String(value || '').trim().toUpperCase();
    if (!/^FA-\d{6}$/.test(id)) throw new Error('Use an ID like FA-000003.');
    const number = Number(id.slice(3));
    if (number < 1 || number > 500) throw new Error('The test inventory has IDs FA-000001 through FA-000500.');
    return { id, row: number + 4 };
  }
  const api = {
    async getExisting(value) {
      const info = idInfo(value);
      const entry = await requestStore('readonly', store => store.get(info.id));
      if (!entry) return info;
      const { front, tag, ...details } = entry;
      return { ...details, ...info };
    },
    async readTag(photo) {
      if (!photo?.base64) throw new Error('Take a close tag photo first.');
      if (!workerPromise) {
        workerPromise = Tesseract.createWorker('eng', 1, {
          workerPath: new URL('vendor/worker.min.js', document.baseURI).href,
          corePath: new URL('vendor/core/', document.baseURI).href,
          langPath: new URL('vendor/lang/', document.baseURI).href,
          logger: event => {
            const progress = typeof event.progress === 'number' ? ` ${Math.round(event.progress * 100)}%` : '';
            document.getElementById('message').textContent = `Reading tag: ${event.status}${progress}`;
          }
        }).then(async worker => {
          await worker.setParameters({ tessedit_pageseg_mode: Tesseract.PSM.SPARSE_TEXT });
          return worker;
        }).catch(error => { workerPromise = null; throw error; });
      }
      const worker = await workerPromise;
      const result = await worker.recognize(`data:${photo.mime};base64,${photo.base64}`);
      return parseTagText_(result.data.text);
    },
    async submitIntake(data) {
      const info = idInfo(data.id);
      for (const key of ['type', 'brand', 'model', 'serial']) {
        if (!String(data[key] || '').trim()) throw new Error('Confirm type, brand, model, and serial before saving.');
      }
      if (!data.front?.base64 || !data.tag?.base64) throw new Error('Take both photos.');
      const entry = { ...data, ...info, model: data.model.trim().toUpperCase(),
        serial: data.serial.trim().toUpperCase(), intakeTime: new Date().toISOString() };
      delete entry.confirmReplace;
      await requestStore('readwrite', store => {
        // Check and write within one transaction to protect replacement confirmation.
        const current = store.get(info.id);
        current.onsuccess = () => {
          if (current.result?.type && !data.confirmReplace) {
            current.transaction.abort();
            return;
          }
          store.put(entry);
        };
        return current;
      }).catch(error => {
        if (!data.confirmReplace) throw new Error('If this test ID already has an appliance, confirm replacement before saving. Otherwise check device storage.');
        throw error;
      });
      const rows = await requestStore('readonly', store => store.getAll());
      document.getElementById('testCount').textContent = `${rows.length} test entries saved on this device.`;
      return info;
    }
  };
  function runner() {
    let success = () => {};
    let failure = error => console.error(error);
    const chain = {
      withSuccessHandler(callback) { success = callback; return chain; },
      withFailureHandler(callback) { failure = callback; return chain; }
    };
    for (const name of Object.keys(api)) chain[name] = (...values) => {
      Promise.resolve().then(() => api[name](...values)).then(success, failure);
    };
    return chain;
  }
  window.google = { script: {} };
  Object.defineProperty(window.google.script, 'run', { get: runner });
  window.exportTestInventory = async function () {
    try {
      const rows = await requestStore('readonly', store => store.getAll());
      if (!rows.length) throw new Error('Save a test entry before exporting.');
      const blob = new Blob([JSON.stringify({ format: 'fussell-iphone-test-v1', entries: rows }, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `fussell-test-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      document.getElementById('message').textContent = 'Test inventory exported with model, serial, and both photos. Save the file in Files on your iPhone.';
    } catch (error) {
      document.getElementById('message').textContent = error.message;
    }
  };
  requestStore('readonly', store => store.getAll()).then(rows => {
    document.getElementById('testCount').textContent = `${rows.length} test entries saved on this device.`;
  }).catch(error => { document.getElementById('testCount').textContent = error.message; });
})();

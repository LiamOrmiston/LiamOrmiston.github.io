(function () {
  const els = {
    loadStatus: document.getElementById('loadStatus'),
    lookupForm: document.getElementById('lookupForm'),
    nameInput: document.getElementById('nameInput'),
    lookupStatus: document.getElementById('lookupStatus'),
    confirmBox: document.getElementById('confirmBox'),
    confirmName: document.getElementById('confirmName'),
    confirmRevealBtn: document.getElementById('confirmRevealBtn'),
    cancelRevealBtn: document.getElementById('cancelRevealBtn'),
    resultBox: document.getElementById('resultBox'),
    resultFor: document.getElementById('resultFor'),
    resultMatch: document.getElementById('resultMatch'),
  };

  let assignmentsMap = null; // { normalizedLower: { displayName, recipient } }
  let trackingEndpoint = '';
  let pending = null; // { displayName, recipient }

  function setStatus(el, msg, type) {
    el.textContent = msg || '';
    el.className = 'status' + (type ? ' ' + type : '');
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function normalizeInput(name) {
    return String(name || '').trim().replace(/\s+/g, ' ');
  }

  function decodeUtf8Base64(b64) {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  async function loadAssignments() {
    try {
      const res = await fetch('assignments.json', { cache: 'no-store' });
      if (!res.ok) throw new Error('Assignments file not found (assignments.json).');
      const obj = await res.json();
      if (!obj || typeof obj.data !== 'string') throw new Error('Assignments file is missing encoded data.');
      if (typeof obj.trackingEndpoint === 'string') trackingEndpoint = obj.trackingEndpoint.trim();
      const decoded = decodeUtf8Base64(obj.data);
      const payload = JSON.parse(decoded);
      if (!payload || typeof payload.assignments !== 'object' || payload.assignments === null) {
        throw new Error('Decoded assignments are invalid.');
      }
      const map = {};
      Object.keys(payload.assignments).forEach(giver => {
        const recipient = payload.assignments[giver];
        if (typeof giver === 'string' && typeof recipient === 'string') {
          const key = normalizeInput(giver).toLowerCase();
          if (key) map[key] = { displayName: giver, recipient: recipient };
        }
      });
      assignmentsMap = map;
      setStatus(els.loadStatus, 'Assignments loaded. Enter your name to see who you got.', 'success');
      els.lookupForm.classList.remove('hidden');
      els.nameInput.focus();
    } catch (err) {
      setStatus(els.loadStatus, 'Could not load assignments: ' + (err && err.message ? err.message : 'unknown error') + '. Make sure assignments.json is in the same folder as this page.', 'error');
    }
  }

  async function sendLookupTracking(name) {
    if (!trackingEndpoint) return;
    const payload = {
      name: name,
      lookedUpAt: new Date().toISOString(),
      event: 'match_lookup'
    };
    try {
      // Prefer fetch (Formspree AJAX); keep best-effort and non-blocking for UX.
      await fetch(trackingEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload),
        keepalive: true
      });
    } catch (e) {
      try {
        // Fallback: sendBeacon with form data
        const params = new URLSearchParams();
        params.set('name', payload.name);
        params.set('lookedUpAt', payload.lookedUpAt);
        params.set('event', payload.event);
        navigator.sendBeacon(trackingEndpoint, params);
      } catch (_) {
        // ignore tracking failures
      }
    }
  }

  els.lookupForm.addEventListener('submit', function (e) {
    e.preventDefault();
    setStatus(els.lookupStatus, '', '');
    els.resultBox.classList.add('hidden');
    els.confirmBox.classList.add('hidden');
    pending = null;

    if (!assignmentsMap) {
      setStatus(els.lookupStatus, 'Assignments are not loaded yet.', 'error');
      return;
    }
    const input = normalizeInput(els.nameInput.value);
    if (!input) {
      setStatus(els.lookupStatus, 'Please enter your name.', 'error');
      return;
    }
    const key = input.toLowerCase();
    const entry = assignmentsMap[key];
    if (!entry) {
      setStatus(els.lookupStatus, 'Name not found. Check the spelling and try again.', 'error');
      return;
    }
    pending = { displayName: entry.displayName, recipient: entry.recipient };
    els.confirmName.textContent = entry.displayName;
    els.confirmBox.classList.remove('hidden');
  });

  els.cancelRevealBtn.addEventListener('click', function () {
    pending = null;
    els.confirmBox.classList.add('hidden');
  });

  els.confirmRevealBtn.addEventListener('click', async function () {
    if (!pending) return;
    const { displayName, recipient } = pending;
    pending = null;
    els.confirmBox.classList.add('hidden');
    els.resultFor.textContent = displayName;
    els.resultMatch.textContent = recipient;
    els.resultBox.classList.remove('hidden');
    setStatus(els.lookupStatus, '', '');
    // fire-and-forget tracking (do not block or fail the reveal)
    sendLookupTracking(displayName);
  });

  loadAssignments();
})();
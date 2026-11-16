(function () {
  const STORAGE_KEY = 'secret-santa-admin-v1';

  const els = {
    nameInput: document.getElementById('nameInput'),
    addNameBtn: document.getElementById('addNameBtn'),
    namesList: document.getElementById('namesList'),
    namesEmpty: document.getElementById('namesEmpty'),
    giverSelect: document.getElementById('giverSelect'),
    receiverSelect: document.getElementById('receiverSelect'),
    addRuleBtn: document.getElementById('addRuleBtn'),
    rulesList: document.getElementById('rulesList'),
    rulesEmpty: document.getElementById('rulesEmpty'),
    trackingEndpoint: document.getElementById('trackingEndpoint'),
    generateBtn: document.getElementById('generateBtn'),
    generateStatus: document.getElementById('generateStatus'),
    downloadAssignmentsBtn: document.getElementById('downloadAssignmentsBtn'),
    exportConfigBtn: document.getElementById('exportConfigBtn'),
    importConfigInput: document.getElementById('importConfigInput'),
    configStatus: document.getElementById('configStatus'),
  };

  let state = loadState();
  let lastAssignmentsBlob = null;

  function defaultState() {
    return { names: [], rules: [], trackingEndpoint: 'https://formspree.io/f/mjywyeqy' };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      return {
        names: Array.isArray(parsed.names) ? parsed.names.filter(n => typeof n === 'string') : [],
        rules: Array.isArray(parsed.rules) ? parsed.rules.filter(r => r && typeof r.giver === 'string' && typeof r.receiver === 'string') : [],
        trackingEndpoint: typeof parsed.trackingEndpoint === 'string' && parsed.trackingEndpoint.trim() ? parsed.trackingEndpoint : 'https://formspree.io/f/mjywyeqy',
      };
    } catch (_) {
      return defaultState();
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function normalizeName(name) {
    return String(name || '').trim().replace(/\s+/g, ' ');
  }

  function setStatus(el, msg, type) {
    el.textContent = msg || '';
    el.className = 'status' + (type ? ' ' + type : '');
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function render() {
    // names
    els.namesList.innerHTML = '';
    els.namesEmpty.classList.toggle('hidden', state.names.length > 0);
    state.names.forEach((name, idx) => {
      const li = document.createElement('li');
      li.className = 'item';
      li.innerHTML = `<span>${escapeHtml(name)}</span><button class="danger" data-remove-name="${idx}">Remove</button>`;
      els.namesList.appendChild(li);
    });

    // rule selects
    const options = ['<option value="">Select…</option>'].concat(
      state.names.map(n => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`)
    ).join('');
    els.giverSelect.innerHTML = options;
    els.receiverSelect.innerHTML = options;

    // rules (drop rules referencing missing names for display consistency kept in data? keep but mark)
    els.rulesList.innerHTML = '';
    els.rulesEmpty.classList.toggle('hidden', state.rules.length > 0);
    state.rules.forEach((rule, idx) => {
      const valid = state.names.includes(rule.giver) && state.names.includes(rule.receiver);
      const li = document.createElement('li');
      li.className = 'item';
      const note = valid ? '' : ' <span class="muted">(name missing)</span>';
      li.innerHTML = `<span><strong>${escapeHtml(rule.giver)}</strong> can’t get <strong>${escapeHtml(rule.receiver)}</strong>${note}</span><button class="danger" data-remove-rule="${idx}">Remove</button>`;
      els.rulesList.appendChild(li);
    });

    if (document.activeElement !== els.trackingEndpoint) {
      els.trackingEndpoint.value = state.trackingEndpoint || '';
    }

    els.downloadAssignmentsBtn.disabled = !lastAssignmentsBlob;
  }

  function addName() {
    const name = normalizeName(els.nameInput.value);
    if (!name) { setStatus(els.configStatus, 'Enter a name.', 'error'); return; }
    const exists = state.names.some(n => n.toLowerCase() === name.toLowerCase());
    if (exists) { setStatus(els.configStatus, 'That name is already in the list.', 'error'); return; }
    state.names.push(name);
    els.nameInput.value = '';
    setStatus(els.configStatus, 'Name added.', 'success');
    saveState();
    render();
  }

  function addRule() {
    const giver = els.giverSelect.value;
    const receiver = els.receiverSelect.value;
    if (!giver || !receiver) { setStatus(els.configStatus, 'Choose both a giver and a receiver for the rule.', 'error'); return; }
    if (giver === receiver) { setStatus(els.configStatus, 'A rule where someone can’t get themselves is automatic; pick two different people.', 'error'); return; }
    const exists = state.rules.some(r => r.giver === giver && r.receiver === receiver);
    if (exists) { setStatus(els.configStatus, 'That rule already exists.', 'error'); return; }
    state.rules.push({ giver, receiver });
    setStatus(els.configStatus, 'Rule added (one-way).', 'success');
    saveState();
    render();
  }

  function downloadJson(filename, obj) {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function encodeUtf8Base64(str) {
    const bytes = new TextEncoder().encode(str);
    let binary = '';
    bytes.forEach(b => { binary += String.fromCharCode(b); });
    return btoa(binary);
  }

  // Returns { giver: receiver } or null if impossible
  function generateAssignments(names, rules) {
    const receivers = names.slice();
    const forbidden = new Map();
    names.forEach(n => forbidden.set(n, new Set()));
    rules.forEach(r => {
      if (forbidden.has(r.giver) && names.includes(r.receiver)) {
        forbidden.get(r.giver).add(r.receiver);
      }
    });

    // quick feasibility: each giver must have at least one allowed receiver
    for (const g of names) {
      const allowedCount = receivers.filter(r => r !== g && !forbidden.get(g).has(r)).length;
      if (allowedCount === 0) return null;
    }

    const givers = names.slice();
    // heuristic: most constrained givers first
    givers.sort((a, b) => {
      const aAllowed = receivers.filter(r => r !== a && !forbidden.get(a).has(r)).length;
      const bAllowed = receivers.filter(r => r !== b && !forbidden.get(b).has(r)).length;
      return aAllowed - bAllowed;
    });

    const assignment = {};
    const used = new Set();

    function shuffle(arr) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    }

    function backtrack(i) {
      if (i === givers.length) return true;
      const g = givers[i];
      const candidates = shuffle(receivers.filter(r => !used.has(r) && r !== g && !forbidden.get(g).has(r)));
      for (const r of candidates) {
        assignment[g] = r;
        used.add(r);
        if (backtrack(i + 1)) return true;
        used.delete(r);
        delete assignment[g];
      }
      return false;
    }

    // try a few randomized attempts (ordering/shuffle can affect search)
    for (let attempt = 0; attempt < 50; attempt++) {
      for (const k of Object.keys(assignment)) delete assignment[k];
      used.clear();
      // reshuffle giver heuristic ties by randomizing within attempts
      if (attempt > 0) {
        // slight randomization: stable-ish but vary
        givers.sort((a, b) => {
          const aAllowed = receivers.filter(r => r !== a && !forbidden.get(a).has(r)).length;
          const bAllowed = receivers.filter(r => r !== b && !forbidden.get(b).has(r)).length;
          if (aAllowed !== bAllowed) return aAllowed - bAllowed;
          return Math.random() - 0.5;
        });
      }
      if (backtrack(0)) return assignment;
    }
    return null;
  }

  function generate() {
    // sync tracking endpoint
    state.trackingEndpoint = (els.trackingEndpoint.value || '').trim();
    saveState();

    const names = state.names.slice();
    if (names.length < 2) {
      lastAssignmentsBlob = null;
      setStatus(els.generateStatus, 'Add at least 2 names before generating.', 'error');
      render();
      return;
    }
    const validRules = state.rules.filter(r => names.includes(r.giver) && names.includes(r.receiver) && r.giver !== r.receiver);
    const assignments = generateAssignments(names, validRules);
    if (!assignments) {
      lastAssignmentsBlob = null;
      setStatus(els.generateStatus, 'No valid assignment found with the current names and one-way rules. Try removing or changing some rules.', 'error');
      render();
      return;
    }

    const payload = { assignments: assignments };
    const encoded = encodeUtf8Base64(JSON.stringify(payload));
    lastAssignmentsBlob = { data: encoded };
    if (state.trackingEndpoint) lastAssignmentsBlob.trackingEndpoint = state.trackingEndpoint;

    setStatus(els.generateStatus, `Generated assignments for ${names.length} people. The matches are encoded (not shown). Download assignments.json and place it in the secret-santa folder for the reveal page.`, 'success');
    render();
  }

  // events
  els.addNameBtn.addEventListener('click', addName);
  els.nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') addName(); });
  els.addRuleBtn.addEventListener('click', addRule);
  els.generateBtn.addEventListener('click', generate);

  els.namesList.addEventListener('click', e => {
    const btn = e.target.closest('[data-remove-name]');
    if (!btn) return;
    const idx = Number(btn.getAttribute('data-remove-name'));
    if (Number.isInteger(idx)) {
      state.names.splice(idx, 1);
      setStatus(els.configStatus, 'Name removed.', 'success');
      saveState();
      render();
    }
  });

  els.rulesList.addEventListener('click', e => {
    const btn = e.target.closest('[data-remove-rule]');
    if (!btn) return;
    const idx = Number(btn.getAttribute('data-remove-rule'));
    if (Number.isInteger(idx)) {
      state.rules.splice(idx, 1);
      setStatus(els.configStatus, 'Rule removed.', 'success');
      saveState();
      render();
    }
  });

  els.trackingEndpoint.addEventListener('input', () => {
    state.trackingEndpoint = (els.trackingEndpoint.value || '').trim();
    saveState();
  });

  els.downloadAssignmentsBtn.addEventListener('click', () => {
    if (!lastAssignmentsBlob) return;
    downloadJson('assignments.json', lastAssignmentsBlob);
  });

  els.exportConfigBtn.addEventListener('click', () => {
    state.trackingEndpoint = (els.trackingEndpoint.value || '').trim();
    saveState();
    const cfg = { names: state.names, rules: state.rules };
    if (state.trackingEndpoint) cfg.trackingEndpoint = state.trackingEndpoint;
    downloadJson('config.json', cfg);
    setStatus(els.configStatus, 'Exported config.json (names, rules' + (state.trackingEndpoint ? ', tracking endpoint' : '') + ').', 'success');
  });

  els.importConfigInput.addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const names = Array.isArray(parsed.names) ? parsed.names.map(normalizeName).filter(Boolean) : null;
      const rules = Array.isArray(parsed.rules) ? parsed.rules : null;
      if (!names || !rules) throw new Error('Invalid config format');
      // de-dupe names case-insensitively preserving first
      const seen = new Set();
      const deduped = [];
      names.forEach(n => { const k = n.toLowerCase(); if (!seen.has(k)) { seen.add(k); deduped.push(n); } });
      const cleanRules = rules
        .filter(r => r && typeof r.giver === 'string' && typeof r.receiver === 'string')
        .map(r => ({ giver: normalizeName(r.giver), receiver: normalizeName(r.receiver) }))
        .filter(r => r.giver && r.receiver && r.giver !== r.receiver);
      state.names = deduped;
      state.rules = cleanRules;
      if (typeof parsed.trackingEndpoint === 'string') state.trackingEndpoint = parsed.trackingEndpoint.trim();
      saveState();
      lastAssignmentsBlob = null;
      setStatus(els.generateStatus, '', '');
      setStatus(els.configStatus, 'Imported config.json.', 'success');
      render();
    } catch (err) {
      setStatus(els.configStatus, 'Could not import config: ' + (err && err.message ? err.message : 'invalid file') + '.', 'error');
    } finally {
      e.target.value = '';
    }
  });

  render();
})();
const FIELD_IDS = [
  // Personal
  'f_salutation','f_firstName','f_lastName','f_preferredName','f_pronouns',
  'f_phone','f_email','f_linkedin','f_website','f_github',
  'f_dob','f_gender','f_indigenous','f_disability',
  // Address
  'f_street','f_street2','f_suburb','f_state','f_postcode','f_country',
  'f_relocate','f_preferredLocation',
  // Work Rights
  'f_workRights','f_eligibleToWork','f_visaExpiry','f_workHours','f_sponsorship',
  'f_clearance','f_policeCheck','f_wwcc',
  // Education
  'f_degreeLevel','f_fieldOfStudy','f_university','f_gradYear','f_gpa','f_honours',
  'f_priorDegree','f_priorUni','f_priorGradYear',
  'f_licence','f_licenceState','f_certs',
  // (Job Prefs and Extra tabs removed)
];

const statusEl = document.getElementById('status');

function setStatus(msg, type = '') {
  statusEl.textContent = msg;
  statusEl.className = 'status ' + type;
  if (type === 'ok') setTimeout(() => { statusEl.textContent = 'Ready'; statusEl.className = 'status'; }, 2800);
}

// Tab switching
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
  });
});

function getKey() {
  return 'au_profile_' + document.getElementById('profileSelect').value;
}

function loadProfile() {
  chrome.storage.local.get(getKey(), result => {
    const data = result[getKey()] || {};
    FIELD_IDS.forEach(id => {
      const el = document.getElementById(id);
      if (el && data[id] !== undefined) el.value = data[id];
    });
  });
}

function clearForm() {
  FIELD_IDS.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
}

document.getElementById('profileSelect').addEventListener('change', () => {
  clearForm();
  loadProfile();
});

document.getElementById('newProfileBtn').addEventListener('click', () => {
  const name = prompt('Enter a name for the new profile (e.g. "Big 4 Grad Apps"):');
  if (!name) return;
  const sel = document.getElementById('profileSelect');
  const val = 'custom_' + Date.now();
  sel.add(new Option(name, val));
  sel.value = val;
  clearForm();
  setStatus('✅ New profile created: ' + name, 'ok');
});

document.getElementById('saveBtn').addEventListener('click', () => {
  const data = {};
  FIELD_IDS.forEach(id => {
    const el = document.getElementById(id);
    if (el) data[id] = el.value;
  });
  chrome.storage.local.set({ [getKey()]: data }, () => {
    setStatus('✅ Profile saved!', 'ok');
  });
});

document.getElementById('fillBtn').addEventListener('click', () => {
  const data = {};
  FIELD_IDS.forEach(id => {
    const el = document.getElementById(id);
    if (el) data[id] = el.value;
  });

  chrome.storage.local.get(['au_api_key_gemini', 'au_use_ai'], r => {
    const useAI = !!r.au_use_ai;
    const apiKey = (r.au_api_key_gemini || '').trim();

    if (useAI && !apiKey) {
      setStatus('⚠️ Add your Gemini API key in the ⚙ API tab first.', 'err');
      return;
    }

    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      const tabId = tabs[0].id;

      function sendFill() {
        chrome.tabs.sendMessage(tabId, { action: 'autofill', data, useAI, apiKey }, res => {
          if (chrome.runtime.lastError) {
            setStatus('❌ Could not reach page. Try refreshing.', 'err');
            return;
          }
          if (res && !res.success && res.error) {
            setStatus('❌ AI error: ' + res.error, 'err');
          } else if (res && res.filled !== undefined) {
            if (res.filled === 0) {
              setStatus('⚠️ No matching fields found on this page.', '');
            } else {
              setStatus(`✅ Filled ${res.filled} field${res.filled !== 1 ? 's' : ''}!`, 'ok');
            }
          }

          // Debug panel
          const panel = document.getElementById('debugPanel');
          const isDebug = document.getElementById('f_debugMode').checked;
          if (isDebug && res?.debug) {
            const log = res.debug.log || [];
            const hits = log.filter(l => l.status === 'hit');
            const misses = log.filter(l => l.status === 'miss');
            const skips = log.filter(l => l.status === 'skip');

            let html = `<div class="debug-head">🔍 Debug — ${hits.length} filled, ${misses.length} failed, ${skips.length} skipped</div>`;

            if (hits.length) {
              html += `<div class="debug-hit">✓ FILLED (${hits.length})\n`;
              hits.forEach(l => { html += `  [${l.idx}] ${l.profileKey} → "${l.value}"\n       hint: ${l.hint}\n`; });
              html += `</div>`;
            }
            if (misses.length) {
              html += `<div class="debug-miss">✗ FAILED (${misses.length})\n`;
              misses.forEach(l => { html += `  [${l.idx}] ${l.profileKey} — ${l.reason}\n       hint: ${l.hint}\n`; });
              html += `</div>`;
            }
            if (skips.length) {
              html += `<div style="color:#a0aec0;">— SKIPPED by AI (${skips.length})\n`;
              skips.forEach(l => { html += `  [${l.idx}] ${l.hint}\n`; });
              html += `</div>`;
            }

            panel.innerHTML = html;
            panel.classList.add('visible');
          } else {
            panel.classList.remove('visible');
          }
        });
      }

      setStatus(useAI ? '🤖 Asking AI to match fields…' : '⚡ Matching fields…', '');

      chrome.tabs.sendMessage(tabId, { action: 'ping' }, res => {
        if (chrome.runtime.lastError || !res) {
          chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] }, () => {
            setTimeout(sendFill, 200);
          });
        } else {
          sendFill();
        }
      });
    });
  });
});

loadProfile();


// Export current profile to a JSON file
document.getElementById('exportBtn').addEventListener('click', () => {
  chrome.storage.local.get(getKey(), result => {
    const data = result[getKey()] || {};
    const profileName = document.getElementById('profileSelect').selectedOptions[0].text;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'au-autofill-' + profileName.toLowerCase().replace(/\s+/g, '-') + '.json';
    a.click();
    URL.revokeObjectURL(url);
    setStatus('✅ Profile exported!', 'ok');
  });
});

// Import a profile from a JSON file
document.getElementById('importFile').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target.result);
      chrome.storage.local.set({ [getKey()]: data }, () => {
        FIELD_IDS.forEach(id => {
          const el = document.getElementById(id);
          if (el && data[id] !== undefined) el.value = data[id];
        });
        setStatus('✅ Profile imported!', 'ok');
      });
    } catch {
      setStatus('❌ Invalid JSON file.', 'err');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
});

// Load saved API settings
chrome.storage.local.get(['au_api_key_gemini', 'au_debug_mode', 'au_use_ai'], r => {
  if (r.au_api_key_gemini) document.getElementById('f_apiKey_gemini').value = r.au_api_key_gemini;
  if (r.au_debug_mode) document.getElementById('f_debugMode').checked = true;
  if (r.au_use_ai) document.getElementById('f_useAI').checked = true;
});

document.getElementById('saveApiKeyBtn').addEventListener('click', () => {
  const keyGemini = document.getElementById('f_apiKey_gemini').value.trim();
  const debugMode = document.getElementById('f_debugMode').checked;
  const useAI = document.getElementById('f_useAI').checked;
  chrome.storage.local.set({ au_api_key_gemini: keyGemini, au_debug_mode: debugMode, au_use_ai: useAI }, () => setStatus('✅ Settings saved!', 'ok'));
});

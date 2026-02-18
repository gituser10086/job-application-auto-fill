const FIELD_IDS = [
  // Personal
  'f_firstName','f_lastName','f_preferredName','f_pronouns',
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
  // Job Prefs
  'f_desiredRole','f_employmentType','f_salary','f_startDate','f_notice','f_workMode',
  'f_referrerName','f_referrerEmail','f_hearAbout',
  // Extra
  'f_whyUs','f_aboutMe','f_strengths',
  'f_emergencyName','f_emergencyRel','f_emergencyPhone',
  'f_studentId','f_usi','f_tfn','f_superFund','f_superMember',
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

  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    const tabId = tabs[0].id;

    function sendFill() {
      chrome.tabs.sendMessage(tabId, { action: 'autofill', data }, res => {
        if (chrome.runtime.lastError) {
          setStatus('❌ Could not reach page. Try refreshing.', 'err');
          return;
        }
        if (res && res.filled !== undefined) {
          if (res.filled === 0) {
            setStatus('⚠️ No matching fields found on this page.', '');
          } else {
            setStatus(`✅ Filled ${res.filled} field${res.filled !== 1 ? 's' : ''}!`, 'ok');
          }
        }
      });
    }

    // Try sending directly; if content script isn't loaded yet, inject it first
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

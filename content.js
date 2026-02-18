/**
 * AU Job Application Autofill — Content Script
 * Matches and fills form fields on Australian job application pages.
 * Covers: Seek, LinkedIn, GradConnection, Workday, Greenhouse, Lever,
 *         SmartRecruiters, PageUp, HCM systems used by Big 4, banks, gov, etc.
 */

// ─────────────────────────────────────────────────────────────
// FIELD MAP: maps our internal field IDs to keyword arrays
// Each entry: { field, keys[], excludeKeys[] }
// ─────────────────────────────────────────────────────────────
const FIELD_MAP = [

  // ── Name ──────────────────────────────────────────────────
  {
    field: 'f_firstName',
    keys: ['first name', 'first_name', 'firstname', 'given name', 'given_name', 'forename', 'fname', 'preferred first'],
    excludeKeys: ['last', 'family', 'middle', 'surname']
  },
  {
    field: 'f_lastName',
    keys: ['last name', 'last_name', 'lastname', 'family name', 'family_name', 'surname', 'lname'],
    excludeKeys: ['first', 'given', 'middle']
  },
  {
    field: 'f_preferredName',
    keys: ['preferred name', 'preferred_name', 'nickname', 'goes by', 'known as', 'name you prefer'],
    excludeKeys: ['first', 'last', 'family']
  },
  {
    field: 'f_pronouns',
    keys: ['pronoun', 'preferred pronoun', 'gender pronoun']
  },

  // ── Contact ───────────────────────────────────────────────
  {
    field: 'f_phone',
    keys: ['mobile', 'phone', 'telephone', 'cell', 'contact number', 'phone number', 'mobile number', 'contact phone'],
    excludeKeys: ['emergency', 'referrer', 'referee', 'fax', 'home phone', 'work phone']
  },
  {
    field: 'f_email',
    keys: ['email', 'e-mail', 'email address', 'email_address'],
    excludeKeys: ['emergency', 'referrer', 'referee', 'manager', 'supervisor', 'confirm', 'repeat']
  },
  {
    field: 'f_linkedin',
    keys: ['linkedin', 'linkedin url', 'linkedin profile', 'linked in']
  },
  {
    field: 'f_website',
    keys: ['website', 'portfolio', 'personal website', 'personal site', 'web address', 'url', 'online portfolio'],
    excludeKeys: ['linkedin', 'github']
  },
  {
    field: 'f_github',
    keys: ['github', 'gitlab', 'bitbucket', 'code repository', 'git url']
  },

  // ── Personal details ──────────────────────────────────────
  {
    field: 'f_dob',
    keys: ['date of birth', 'dob', 'birth date', 'birthday', 'born', 'date_of_birth', 'd.o.b']
  },
  {
    field: 'f_gender',
    keys: ['gender', 'sex', 'gender identity'],
    excludeKeys: ['pronoun']
  },
  {
    field: 'f_indigenous',
    keys: ['aboriginal', 'torres strait', 'indigenous', 'atsi', 'first nations', 'identify as aboriginal']
  },
  {
    field: 'f_disability',
    keys: ['disability', 'disabled', 'accessibility need', 'reasonable adjustment', 'impairment']
  },

  // ── Address ───────────────────────────────────────────────
  {
    field: 'f_street',
    keys: ['street', 'address line 1', 'address1', 'street address', 'unit', 'flat', 'house number', 'residential address'],
    excludeKeys: ['suburb', 'city', 'state', 'postcode']
  },
  {
    field: 'f_suburb',
    keys: ['suburb', 'city', 'town', 'locality', 'address line 2', 'address2', 'city/suburb'],
    excludeKeys: ['state', 'country', 'postcode']
  },
  {
    field: 'f_state',
    keys: ['state', 'state/territory', 'territory', 'province', 'region'],
    excludeKeys: ['country', 'status']
  },
  {
    field: 'f_postcode',
    keys: ['postcode', 'post code', 'postal code', 'zip', 'zip code', 'post_code']
  },
  {
    field: 'f_country',
    keys: ['country', 'country of residence', 'nation'],
    excludeKeys: ['nationality', 'citizenship']
  },
  {
    field: 'f_relocate',
    keys: ['reloc', 'willing to relocate', 'open to relocation', 'can you relocate', 'relocate for this role']
  },
  {
    field: 'f_preferredLocation',
    keys: ['preferred location', 'preferred city', 'preferred office', 'location preference', 'office preference', 'where would you like to work']
  },

  // ── Work Rights ───────────────────────────────────────────
  {
    field: 'f_workRights',
    keys: [
      'work rights', 'work_rights', 'right to work', 'working rights', 'visa status',
      'visa type', 'citizenship status', 'residency status', 'work authorisation',
      'work authorization', 'employment eligibility', 'citizen', 'permanent resident',
      'work entitlement', 'immigration status'
    ],
    excludeKeys: ['sponsorship', 'security clearance']
  },
  {
    field: 'f_eligibleToWork',
    keys: ['eligible to work', 'legally entitled', 'entitled to work', 'authorised to work', 'authorized to work', 'lawfully permitted']
  },
  {
    field: 'f_visaExpiry',
    keys: ['visa expiry', 'visa expiration', 'visa end date', 'permit expiry', 'visa valid until']
  },
  {
    field: 'f_workHours',
    keys: ['work hours', 'hours per week', 'hours restriction', 'maximum hours', 'weekly hours limit', 'visa work hours']
  },
  {
    field: 'f_sponsorship',
    keys: ['sponsor', 'visa sponsorship', 'require sponsorship', 'need sponsorship', 'employer sponsorship', 'immigration sponsorship']
  },

  // ── Security & Checks ─────────────────────────────────────
  {
    field: 'f_clearance',
    keys: ['security clearance', 'clearance level', 'nv1', 'nv2', 'baseline clearance', 'positive vetting', 'government clearance', 'defence clearance']
  },
  {
    field: 'f_policeCheck',
    keys: ['police check', 'criminal history', 'national police check', 'background check', 'criminal record', 'police clearance']
  },
  {
    field: 'f_wwcc',
    keys: ['working with children', 'wwcc', 'blue card', 'child safe', 'working with minors', 'child protection check']
  },

  // ── Education ─────────────────────────────────────────────
  {
    field: 'f_degreeLevel',
    keys: ['degree', 'qualification', 'degree level', 'education level', 'highest qualification', 'highest education', 'level of study', 'degree type'],
    excludeKeys: ['field', 'major', 'institution', 'university', 'school', 'gpa', 'wam', 'grade', 'year', 'graduation']
  },
  {
    field: 'f_fieldOfStudy',
    keys: ['field of study', 'major', 'discipline', 'subject', 'course', 'study area', 'area of study', 'programme', 'program of study', 'bachelor of', 'master of'],
    excludeKeys: ['institution', 'university', 'school', 'year', 'grade', 'gpa']
  },
  {
    field: 'f_university',
    keys: ['university', 'institution', 'school', 'college', 'educational institution', 'name of institution', 'tertiary institution', 'uni'],
    excludeKeys: ['high school', 'secondary', 'prior', 'previous', 'other institution']
  },
  {
    field: 'f_gradYear',
    keys: ['graduation year', 'expected graduation', 'year of graduation', 'completing', 'completion year', 'graduate year', 'grad year', 'end year'],
    excludeKeys: ['prior', 'previous', 'start', 'enrol', 'commence']
  },
  {
    field: 'f_gpa',
    keys: ['gpa', 'wam', 'grade point average', 'weighted average mark', 'academic average', 'academic score', 'average mark']
  },
  {
    field: 'f_honours',
    keys: ['honours', 'honor', 'grade classification', 'degree classification', 'distinction', 'academic standing', 'academic result']
  },
  {
    field: 'f_priorDegree',
    keys: ['prior degree', 'previous degree', 'other degree', 'additional qualification', 'second degree', 'undergraduate degree'],
    excludeKeys: ['university', 'institution', 'year']
  },
  {
    field: 'f_priorUni',
    keys: ['prior institution', 'previous institution', 'previous university', 'prior university', 'other institution']
  },
  {
    field: 'f_priorGradYear',
    keys: ['prior graduation', 'previous graduation year', 'prior year', 'other grad year']
  },

  // ── Licence & Certs ───────────────────────────────────────
  {
    field: 'f_licence',
    keys: ["driver's licence", 'drivers licence', 'driver license', 'drivers license', 'driving licence', 'driving license', 'vehicle licence'],
    excludeKeys: ['state', 'number']
  },
  {
    field: 'f_licenceState',
    keys: ['licence state', 'license state', 'issuing state', 'licence issuing']
  },
  {
    field: 'f_certs',
    keys: ['certif', 'certification', 'licence number', 'professional accreditation', 'accreditation', 'qualification number', 'other certifications']
  },

  // ── Job Preferences ───────────────────────────────────────
  {
    field: 'f_desiredRole',
    keys: ['desired role', 'position applied', 'job title', 'role applied', 'applying for', 'position of interest', 'target role'],
    excludeKeys: ['referrer', 'manager', 'supervisor']
  },
  {
    field: 'f_employmentType',
    keys: ['employment type', 'job type', 'contract type', 'engagement type', 'type of employment', 'work type', 'position type', 'full-time', 'part-time', 'casual']
  },
  {
    field: 'f_salary',
    keys: ['salary', 'remuneration', 'compensation', 'pay expectation', 'salary expectation', 'expected salary', 'base salary', 'annual salary', 'total package', 'ctc']
  },
  {
    field: 'f_startDate',
    keys: ['start date', 'available from', 'earliest start', 'when can you start', 'commencement date', 'available to start', 'can start from']
  },
  {
    field: 'f_notice',
    keys: ['notice period', 'notice required', 'notice', 'months notice', 'weeks notice', 'current notice period']
  },
  {
    field: 'f_workMode',
    keys: ['work arrangement', 'work mode', 'hybrid', 'remote', 'on-site', 'onsite', 'in-office', 'flexible work', 'working arrangement']
  },

  // ── Referral ─────────────────────────────────────────────
  {
    field: 'f_referrerName',
    keys: ['referr', 'referred by', 'referral name', 'who referred', 'name of referrer', 'employee referral name', 'internal referral'],
    excludeKeys: ['email', 'phone', 'id', 'number']
  },
  {
    field: 'f_referrerEmail',
    keys: ['referrer email', 'referral email', 'referred by email', 'employee email referral']
  },
  {
    field: 'f_hearAbout',
    keys: ['hear about', 'how did you hear', 'how did you find', 'how did you learn', 'source', 'recruitment source', 'where did you hear', 'application source', 'referral source']
  },

  // ── Cover Letter / Short Answers ─────────────────────────
  {
    field: 'f_whyUs',
    keys: ['why do you want', 'why this company', 'why us', 'why are you interested', 'motivation', 'reason for applying', 'why apply', 'what attracts you', 'why would you like to work', 'why this role']
  },
  {
    field: 'f_aboutMe',
    keys: ['tell us about yourself', 'about yourself', 'brief introduction', 'professional summary', 'brief bio', 'background', 'introduce yourself', 'brief overview']
  },
  {
    field: 'f_strengths',
    keys: ['strength', 'key skill', 'core skill', 'competenc', 'technical skill', 'what skills', 'expertise', 'capabilities']
  },

  // ── Emergency Contact ─────────────────────────────────────
  {
    field: 'f_emergencyName',
    keys: ['emergency contact name', 'emergency name', 'next of kin name', 'next of kin', 'emergency contact person'],
    excludeKeys: ['phone', 'relationship', 'number', 'email']
  },
  {
    field: 'f_emergencyRel',
    keys: ['emergency relationship', 'relationship to you', 'relation to applicant', 'next of kin relationship', 'emergency contact relationship']
  },
  {
    field: 'f_emergencyPhone',
    keys: ['emergency contact phone', 'emergency phone', 'emergency number', 'next of kin phone', 'emergency contact number', 'emergency mobile']
  },

  // ── Other Admin ───────────────────────────────────────────
  {
    field: 'f_studentId',
    keys: ['student id', 'student number', 'student identifier', 'university id', 'student_id']
  },
  {
    field: 'f_usi',
    keys: ['usi', 'unique student identifier']
  },
  {
    field: 'f_tfn',
    keys: ['tfn', 'tax file number', 'tax_file_number']
  },
  {
    field: 'f_superFund',
    keys: ['super fund', 'superannuation fund', 'super fund name', 'superfund', 'superannuation provider'],
    excludeKeys: ['member', 'number', 'account']
  },
  {
    field: 'f_superMember',
    keys: ['super member', 'member number', 'superannuation member', 'super account', 'member account number']
  },
];

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

/** Collect all semantic hints from an element */
function getHint(el) {
  const forLabel = el.id ? document.querySelector(`label[for="${CSS.escape(el.id)}"]`) : null;
  const closestLabel = el.closest('label');
  const wrapLabel = el.closest(
    '.field, .form-field, .form-group, .form-item, .form-control-wrap, .form-row,' +
    ' [class*="field"], [class*="form-"], [class*="input-wrap"], [class*="question"],' +
    ' .row, .control-group, .item, .q-item, li'
  )?.querySelector('label, .label, .field-label, .form-label, .question-label, [class*="label"], legend, h4, h5, p.title');

  const parts = [
    el.placeholder || '',
    el.name || '',
    el.id || '',
    el.getAttribute('aria-label') || '',
    el.getAttribute('aria-labelledby') ? (document.getElementById(el.getAttribute('aria-labelledby'))?.textContent || '') : '',
    el.title || '',
    el.dataset.label || '',
    el.dataset.name || '',
    forLabel?.textContent || '',
    closestLabel?.textContent || '',
    wrapLabel?.textContent || '',
    el.previousElementSibling?.textContent || '',
    el.parentElement?.querySelector('span, strong, b, .hint')?.textContent || '',
  ];

  return parts.join(' ').toLowerCase().replace(/[\*\_\:\(\)\[\]]/g, ' ').replace(/\s+/g, ' ');
}

/** Check whether hint matches a field rule */
function matches(el, rule) {
  const hint = getHint(el);
  if (!rule.keys.some(k => hint.includes(k.toLowerCase()))) return false;
  if (rule.excludeKeys?.some(k => hint.includes(k.toLowerCase()))) return false;
  return true;
}

/** Set value on input/textarea with framework compatibility (React/Vue/Angular) */
function setValue(el, value) {
  if (!value && value !== 0) return;
  try {
    const proto = el.tagName === 'TEXTAREA'
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    if (setter) setter.call(el, value);
    else el.value = value;
  } catch {
    el.value = value;
  }
  ['input', 'change', 'blur'].forEach(type =>
    el.dispatchEvent(new Event(type, { bubbles: true, cancelable: true }))
  );
  try {
    el.dispatchEvent(new InputEvent('input', { bubbles: true, data: String(value) }));
  } catch {}
}

/** Fill a <select> by matching option text or value */
function setSelect(el, value) {
  if (!value) return false;
  const val = value.toLowerCase();

  const byExact = [...el.options].find(o => o.text.trim() === value || o.value === value);
  if (byExact) { el.value = byExact.value; }
  else {
    const byContains = [...el.options].find(o =>
      o.text.toLowerCase().includes(val) || o.value.toLowerCase().includes(val)
    );
    if (byContains) { el.value = byContains.value; }
    else {
      // reverse: does the value contain an option's text?
      const byReverse = [...el.options].find(o =>
        o.text.trim() && val.includes(o.text.trim().toLowerCase())
      );
      if (byReverse) el.value = byReverse.value;
      else return false;
    }
  }

  ['change', 'input'].forEach(type =>
    el.dispatchEvent(new Event(type, { bubbles: true }))
  );
  return true;
}

/** Fill radio button groups */
function fillRadios(radios, value) {
  if (!value) return 0;
  const val = value.toLowerCase();
  let filled = 0;
  radios.forEach(radio => {
    const label = document.querySelector(`label[for="${CSS.escape(radio.id)}"]`);
    const text = [radio.value, label?.textContent || '', radio.parentElement?.textContent || ''].join(' ').toLowerCase();
    if (text.includes(val)) {
      radio.checked = true;
      radio.dispatchEvent(new Event('change', { bubbles: true }));
      filled++;
    }
  });
  return filled;
}

/** Fill checkbox (for yes/no single checkboxes) */
function fillCheckbox(el, value) {
  const truthy = ['yes', 'true', '1', 'checked'].includes(value.toLowerCase());
  el.checked = truthy;
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

// ─────────────────────────────────────────────────────────────
// MAIN AUTOFILL
// ─────────────────────────────────────────────────────────────

function autofill(data) {
  let filled = 0;
  const done = new WeakSet();

  // 1. Inputs & textareas
  document.querySelectorAll(
    'input:not([type=hidden]):not([type=submit]):not([type=button]):not([type=reset])' +
    ':not([type=file]):not([type=checkbox]):not([type=radio]), textarea'
  ).forEach(el => {
    if (done.has(el) || el.disabled || el.readOnly) return;
    for (const rule of FIELD_MAP) {
      if (matches(el, rule)) {
        const v = data[rule.field];
        if (v) { setValue(el, v); done.add(el); filled++; }
        break;
      }
    }
  });

  // 2. Selects
  document.querySelectorAll('select').forEach(el => {
    if (done.has(el) || el.disabled) return;
    for (const rule of FIELD_MAP) {
      if (matches(el, rule)) {
        const v = data[rule.field];
        if (v && setSelect(el, v)) { done.add(el); filled++; }
        break;
      }
    }
  });

  // 3. Radio groups
  const radioGroups = {};
  document.querySelectorAll('input[type="radio"]:not([disabled])').forEach(r => {
    if (r.name) (radioGroups[r.name] = radioGroups[r.name] || []).push(r);
  });
  Object.values(radioGroups).forEach(radios => {
    const sample = radios[0];
    if (done.has(sample)) return;
    for (const rule of FIELD_MAP) {
      if (matches(sample, rule)) {
        const v = data[rule.field];
        if (v) filled += fillRadios(radios, v);
        break;
      }
    }
  });

  // 4. Checkboxes (single yes/no style)
  document.querySelectorAll('input[type="checkbox"]:not([disabled])').forEach(el => {
    if (done.has(el)) return;
    for (const rule of FIELD_MAP) {
      if (matches(el, rule)) {
        const v = data[rule.field];
        if (v) { fillCheckbox(el, v); done.add(el); filled++; }
        break;
      }
    }
  });

  return filled;
}

// ─────────────────────────────────────────────────────────────
// MESSAGE LISTENER
// ─────────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'ping') {
    sendResponse({ alive: true });
    return true;
  }
  if (msg.action === 'autofill') {
    try {
      const filled = autofill(msg.data);
      sendResponse({ filled, success: true });
    } catch (e) {
      sendResponse({ filled: 0, success: false, error: e.message });
    }
    return true;
  }
});

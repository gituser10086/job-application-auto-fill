/**
 * AU Job Application Autofill — Content Script
 * Supports two modes:
 *   - Keyword mode: instant, offline, no API key needed
 *   - AI mode: Gemini 2.5 Flash, smarter matching, requires API key
 */

// ─────────────────────────────────────────────────────────────
// FIELD MAP — keyword matching rules (used in keyword mode)
// ─────────────────────────────────────────────────────────────
const FIELD_MAP = [
  { field: 'f_salutation',        keys: ['salutation', 'title', 'prefix', 'honorific', 'name title'],                                              excludeKeys: ['job', 'position', 'role'] },
  { field: 'f_firstName',         keys: ['first name', 'first_name', 'firstname', 'given name', 'given_name', 'forename', 'fname'],                excludeKeys: ['last', 'family', 'middle', 'surname'] },
  { field: 'f_lastName',          keys: ['last name', 'last_name', 'lastname', 'family name', 'family_name', 'surname', 'lname'],                  excludeKeys: ['first', 'given', 'middle'] },
  { field: 'f_preferredName',     keys: ['preferred name', 'preferred_name', 'nickname', 'goes by', 'known as'],                                   excludeKeys: ['first', 'last', 'family'] },
  { field: 'f_pronouns',          keys: ['pronoun', 'preferred pronoun', 'gender pronoun'] },
  { field: 'f_phone',             keys: ['mobile', 'phone', 'telephone', 'cell', 'contact number', 'phone number'],                               excludeKeys: ['emergency', 'fax'] },
  { field: 'f_email',             keys: ['email', 'e-mail', 'email address'],                                                                      excludeKeys: ['emergency', 'referrer', 'confirm', 'repeat'] },
  { field: 'f_linkedin',          keys: ['linkedin', 'linkedin url', 'linkedin profile'] },
  { field: 'f_website',           keys: ['website', 'portfolio', 'personal website', 'web address', 'url'],                                        excludeKeys: ['linkedin', 'github'] },
  { field: 'f_github',            keys: ['github', 'gitlab', 'bitbucket', 'git url'] },
  { field: 'f_dob',               keys: ['date of birth', 'dob', 'birth date', 'birthday', 'd.o.b'] },
  { field: 'f_gender',            keys: ['gender', 'sex', 'gender identity'],                                                                      excludeKeys: ['pronoun'] },
  { field: 'f_indigenous',        keys: ['aboriginal', 'torres strait', 'indigenous', 'atsi', 'first nations'] },
  { field: 'f_disability',        keys: ['disability', 'disabled', 'accessibility need', 'reasonable adjustment'] },
  { field: 'f_street',            keys: ['street', 'address line 1', 'address1', 'street address', 'house number'],                               excludeKeys: ['suburb', 'city', 'state', 'postcode'] },
  { field: 'f_street2',           keys: ['address line 2', 'address2', 'unit', 'flat', 'apt', 'apartment', 'suite', 'floor'],                     excludeKeys: ['suburb', 'city', 'state', 'postcode'] },
  { field: 'f_suburb',            keys: ['suburb', 'city', 'town', 'locality', 'city/suburb'],                                                    excludeKeys: ['state', 'country', 'postcode'] },
  { field: 'f_state',             keys: ['state', 'state/territory', 'territory', 'province'],                                                    excludeKeys: ['country', 'status'] },
  { field: 'f_postcode',          keys: ['postcode', 'post code', 'postal code', 'zip'] },
  { field: 'f_country',           keys: ['country', 'country of residence', 'nation'],                                                            excludeKeys: ['nationality', 'citizenship'] },
  { field: 'f_relocate',          keys: ['reloc', 'willing to relocate', 'open to relocation'] },
  { field: 'f_preferredLocation', keys: ['preferred location', 'preferred city', 'preferred office', 'location preference'] },
  { field: 'f_workRights',        keys: ['work rights', 'right to work', 'visa status', 'visa type', 'citizenship status', 'residency status', 'work authorisation', 'employment eligibility'], excludeKeys: ['sponsorship'] },
  { field: 'f_eligibleToWork',    keys: ['eligible to work', 'legally entitled', 'authorised to work'] },
  { field: 'f_visaExpiry',        keys: ['visa expiry', 'visa expiration', 'visa end date', 'permit expiry'] },
  { field: 'f_workHours',         keys: ['work hours', 'hours per week', 'hours restriction', 'weekly hours limit'] },
  { field: 'f_sponsorship',       keys: ['sponsor', 'visa sponsorship', 'require sponsorship', 'need sponsorship'] },
  { field: 'f_clearance',         keys: ['security clearance', 'clearance level', 'nv1', 'nv2', 'baseline clearance', 'positive vetting'] },
  { field: 'f_policeCheck',       keys: ['police check', 'criminal history', 'national police check', 'background check'] },
  { field: 'f_wwcc',              keys: ['working with children', 'wwcc', 'blue card', 'child safe'] },
  { field: 'f_degreeLevel',       keys: ['degree', 'qualification', 'degree level', 'education level', 'highest qualification', 'level of study'], excludeKeys: ['field', 'major', 'institution', 'university', 'gpa', 'year'] },
  { field: 'f_fieldOfStudy',      keys: ['field of study', 'major', 'discipline', 'subject', 'course', 'study area', 'area of study'],            excludeKeys: ['institution', 'university', 'year', 'grade'] },
  { field: 'f_university',        keys: ['university', 'institution', 'college', 'educational institution', 'uni'],                               excludeKeys: ['prior', 'previous'] },
  { field: 'f_gradYear',          keys: ['graduation year', 'expected graduation', 'completion year', 'grad year'],                               excludeKeys: ['prior', 'previous', 'start'] },
  { field: 'f_gpa',               keys: ['gpa', 'wam', 'grade point average', 'weighted average mark', 'academic average'] },
  { field: 'f_honours',           keys: ['honours', 'honor', 'grade classification', 'degree classification', 'academic standing'] },
  { field: 'f_priorDegree',       keys: ['prior degree', 'previous degree', 'other degree', 'second degree'],                                     excludeKeys: ['university', 'year'] },
  { field: 'f_priorUni',          keys: ['prior institution', 'previous institution', 'previous university', 'prior university'] },
  { field: 'f_priorGradYear',     keys: ['prior graduation', 'previous graduation year', 'prior year'] },
  { field: 'f_licence',           keys: ["driver's licence", 'drivers licence', 'driver license', 'driving licence'],                             excludeKeys: ['state', 'number'] },
  { field: 'f_licenceState',      keys: ['licence state', 'license state', 'issuing state'] },
  { field: 'f_certs',             keys: ['certif', 'certification', 'professional accreditation', 'other certifications'] },
  { field: 'f_desiredRole',       keys: ['desired role', 'position applied', 'job title', 'role applied', 'applying for', 'target role'],         excludeKeys: ['referrer', 'manager'] },
  { field: 'f_employmentType',    keys: ['employment type', 'job type', 'contract type', 'work type', 'position type'] },
  { field: 'f_salary',            keys: ['salary', 'remuneration', 'compensation', 'pay expectation', 'expected salary'] },
  { field: 'f_startDate',         keys: ['start date', 'available from', 'earliest start', 'when can you start', 'commencement date'] },
  { field: 'f_notice',            keys: ['notice period', 'notice required', 'months notice', 'weeks notice'] },
  { field: 'f_workMode',          keys: ['work arrangement', 'work mode', 'hybrid', 'remote', 'on-site', 'flexible work'] },
  { field: 'f_referrerName',      keys: ['referr', 'referred by', 'referral name', 'who referred'],                                               excludeKeys: ['email', 'phone'] },
  { field: 'f_referrerEmail',     keys: ['referrer email', 'referral email', 'referred by email'] },
  { field: 'f_hearAbout',         keys: ['hear about', 'how did you hear', 'how did you find', 'source', 'recruitment source'] },
  { field: 'f_whyUs',             keys: ['why do you want', 'why this company', 'why us', 'why are you interested', 'motivation', 'reason for applying'] },
  { field: 'f_aboutMe',           keys: ['tell us about yourself', 'about yourself', 'brief introduction', 'professional summary', 'introduce yourself'] },
  { field: 'f_strengths',         keys: ['strength', 'key skill', 'core skill', 'competenc', 'technical skill', 'expertise'] },
  { field: 'f_emergencyName',     keys: ['emergency contact name', 'emergency name', 'next of kin name', 'next of kin'],                          excludeKeys: ['phone', 'relationship', 'email'] },
  { field: 'f_emergencyRel',      keys: ['emergency relationship', 'relationship to you', 'next of kin relationship'] },
  { field: 'f_emergencyPhone',    keys: ['emergency contact phone', 'emergency phone', 'emergency number', 'next of kin phone'] },
  { field: 'f_studentId',         keys: ['student id', 'student number', 'university id'] },
  { field: 'f_usi',               keys: ['usi', 'unique student identifier'] },
  { field: 'f_tfn',               keys: ['tfn', 'tax file number'] },
  { field: 'f_superFund',         keys: ['super fund', 'superannuation fund', 'superfund'],                                                       excludeKeys: ['member', 'number', 'account'] },
  { field: 'f_superMember',       keys: ['super member', 'member number', 'superannuation member', 'super account'] },
];

// ─────────────────────────────────────────────────────────────
// FIELD CATALOGUE — semantic descriptions (used in AI mode)
// ─────────────────────────────────────────────────────────────
const FIELD_CATALOGUE = {
  f_salutation:        'Salutation / title / honorific (Mr, Ms, Mrs, Miss, Mx, Dr, Prof)',
  f_firstName:         'First name / given name',
  f_lastName:          'Last name / surname / family name',
  f_preferredName:     'Preferred name / nickname',
  f_pronouns:          'Pronouns (e.g. she/her, he/him, they/them)',
  f_phone:             'Mobile / phone number (personal, not emergency contact)',
  f_email:             'Email address (personal, not emergency contact)',
  f_linkedin:          'LinkedIn profile URL',
  f_website:           'Personal website or portfolio URL',
  f_github:            'GitHub / GitLab / code repository URL',
  f_dob:               'Date of birth',
  f_gender:            'Gender identity',
  f_indigenous:        'Aboriginal / Torres Strait Islander / Indigenous Australian status',
  f_disability:        'Disability or accessibility needs',
  f_street:            'Street address line 1 (street number and name)',
  f_street2:           'Street address line 2 (unit, apartment, suite, floor — optional)',
  f_suburb:            'Suburb or city',
  f_state:             'Australian state or territory (NSW, VIC, QLD, WA, SA, TAS, ACT, NT)',
  f_postcode:          'Australian postcode (4 digits)',
  f_country:           'Country of residence',
  f_relocate:          'Willingness to relocate for the role',
  f_preferredLocation: 'Preferred work location or city',
  f_workRights:        'Work rights / visa status / citizenship in Australia (e.g. Australian Citizen, Student Visa 500, Graduate Visa 485)',
  f_eligibleToWork:    'Legally eligible / entitled to work in Australia (yes/no)',
  f_visaExpiry:        'Visa expiry date',
  f_workHours:         'Work hours limit (e.g. 48 hrs/fortnight restriction on student visa)',
  f_sponsorship:       'Whether the applicant requires employer visa sponsorship',
  f_clearance:         'Australian government security clearance level (Baseline, NV1, NV2, PV)',
  f_policeCheck:       'National police check / criminal history check',
  f_wwcc:              'Working with Children Check (WWCC) / Blue Card status',
  f_degreeLevel:       "Highest degree level / qualification (e.g. Bachelor's, Master's, PhD)",
  f_fieldOfStudy:      'Field of study / major / discipline (e.g. Computer Science, Commerce)',
  f_university:        'University or educational institution name',
  f_gradYear:          'Graduation year / expected completion year',
  f_gpa:               'GPA / WAM (Weighted Average Mark) / academic average score',
  f_honours:           'Honours classification or grade (e.g. First Class Honours, Distinction)',
  f_priorDegree:       'Prior or previous degree name',
  f_priorUni:          'Prior or previous university / institution name',
  f_priorGradYear:     'Prior graduation year',
  f_licence:           "Driver's licence type (Full, Provisional, Learner)",
  f_licenceState:      "Australian state that issued the driver's licence",
  f_certs:             'Other certifications, licences, or professional accreditations (e.g. AWS, PMP)',
  f_desiredRole:       'Desired role / job title / position the applicant is applying for',
  f_employmentType:    'Employment type preference (Full-time, Part-time, Casual, Contract, Internship, Graduate Program)',
  f_salary:            'Salary expectation / remuneration (e.g. $80,000–$95,000)',
  f_startDate:         'Earliest available start date',
  f_notice:            'Notice period required at current employer (e.g. 2 weeks, 4 weeks)',
  f_workMode:          'Preferred work arrangement (Hybrid, Remote, On-site)',
  f_referrerName:      'Full name of the person who referred the applicant',
  f_referrerEmail:     'Email address of the person who referred the applicant',
  f_hearAbout:         'How the applicant heard about this job / recruitment source (e.g. LinkedIn, Seek, GradConnection)',
  f_whyUs:             'Why the applicant wants to work at this company (short motivation answer)',
  f_aboutMe:           'About me / professional summary / introduce yourself',
  f_strengths:         'Key strengths, skills, or core competencies',
  f_emergencyName:     'Emergency contact full name / next of kin name',
  f_emergencyRel:      "Emergency contact's relationship to the applicant (e.g. Parent, Spouse)",
  f_emergencyPhone:    'Emergency contact phone number',
  f_studentId:         'Student ID number',
  f_usi:               'Unique Student Identifier (USI) — required for Australian vocational training',
  f_tfn:               'Tax File Number (TFN) — Australian tax identifier',
  f_superFund:         'Superannuation fund name (e.g. AustralianSuper, Hostplus)',
  f_superMember:       'Superannuation member number / account number',
};

// ─────────────────────────────────────────────────────────────
// SHARED: HINT EXTRACTION & FIELD COLLECTION
// ─────────────────────────────────────────────────────────────

function getHint(el) {
  const forLabel = el.id ? document.querySelector(`label[for="${CSS.escape(el.id)}"]`) : null;
  const closestLabel = el.closest('label');
  const wrapLabel = el.closest(
    '.field, .form-field, .form-group, .form-item, .form-control-wrap, .form-row,' +
    ' [class*="field"], [class*="form-"], [class*="input-wrap"], [class*="question"],' +
    ' .row, .control-group, .item, .q-item, li'
  )?.querySelector('label, .label, .field-label, .form-label, .question-label, [class*="label"], legend, h4, h5, p.title');

  const parts = [
    forLabel?.textContent || '',
    closestLabel?.textContent || '',
    wrapLabel?.textContent || '',
    el.getAttribute('aria-label') || '',
    el.getAttribute('aria-labelledby')
      ? (document.getElementById(el.getAttribute('aria-labelledby'))?.textContent || '') : '',
    el.placeholder || '',
    el.name || '',
    el.id || '',
    el.title || '',
    el.dataset.label || '',
    el.previousElementSibling?.textContent || '',
  ];

  return parts.map(s => s.trim()).filter(Boolean).join(' | ').replace(/\s+/g, ' ').slice(0, 300);
}

function collectFields() {
  const fields = [];
  const seen = new Set();

  document.querySelectorAll(
    'input:not([type=hidden]):not([type=submit]):not([type=button]):not([type=reset]):not([type=file]),' +
    'textarea, select'
  ).forEach((el, idx) => {
    if (el.disabled || el.readOnly) return;
    if (el.type === 'radio') {
      if (seen.has('radio:' + el.name)) return;
      seen.add('radio:' + el.name);
    }
    const hint = getHint(el);
    if (!hint) return;
    fields.push({
      idx,
      tag: el.tagName.toLowerCase(),
      type: el.type || '',
      name: el.name || '',
      hint,
      options: el.tagName === 'SELECT'
        ? [...el.options].map(o => o.text.trim()).filter(Boolean).slice(0, 20)
        : el.type === 'radio'
          ? [...document.querySelectorAll(`input[type="radio"][name="${CSS.escape(el.name)}"]`)]
              .map(r => document.querySelector(`label[for="${CSS.escape(r.id)}"]`)?.textContent.trim() || r.value)
          : [],
    });
  });

  return fields;
}

// ─────────────────────────────────────────────────────────────
// SHARED: FILL HELPERS
// ─────────────────────────────────────────────────────────────

function setValue(el, value) {
  if (!value && value !== 0) return;
  try {
    const proto = el.tagName === 'TEXTAREA'
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    if (setter) setter.call(el, value);
    else el.value = value;
  } catch { el.value = value; }
  ['input', 'change', 'blur'].forEach(type =>
    el.dispatchEvent(new Event(type, { bubbles: true, cancelable: true }))
  );
  try { el.dispatchEvent(new InputEvent('input', { bubbles: true, data: String(value) })); } catch {}
}

function setSelect(el, value) {
  if (!value) return false;
  const val = value.toLowerCase();
  const opt =
    [...el.options].find(o => o.text.trim() === value || o.value === value) ||
    [...el.options].find(o => o.text.toLowerCase().includes(val) || o.value.toLowerCase().includes(val)) ||
    [...el.options].find(o => o.text.trim() && val.includes(o.text.trim().toLowerCase()));
  if (!opt) return false;
  el.value = opt.value;
  ['change', 'input'].forEach(t => el.dispatchEvent(new Event(t, { bubbles: true })));
  return true;
}

function fillRadioGroup(name, value) {
  if (!value) return 0;
  const val = value.toLowerCase();
  let filled = 0;
  document.querySelectorAll(`input[type="radio"][name="${CSS.escape(name)}"]`).forEach(radio => {
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

function getElements() {
  const allEls = [];
  const seenRadios = new Set();
  document.querySelectorAll(
    'input:not([type=hidden]):not([type=submit]):not([type=button]):not([type=reset]):not([type=file]),' +
    'textarea, select'
  ).forEach((el, idx) => {
    if (el.disabled || el.readOnly) return;
    if (el.type === 'radio') {
      if (seenRadios.has(el.name)) return;
      seenRadios.add(el.name);
    }
    allEls[idx] = el;
  });
  return allEls;
}

// ─────────────────────────────────────────────────────────────
// KEYWORD MODE
// ─────────────────────────────────────────────────────────────

function keywordMatch(el, rule) {
  const hint = getHint(el).toLowerCase().replace(/[*_:()[\]]/g, ' ');
  if (!rule.keys.some(k => hint.includes(k.toLowerCase()))) return false;
  if (rule.excludeKeys?.some(k => hint.includes(k.toLowerCase()))) return false;
  return true;
}

function autofillKeyword(profileData) {
  const fields = collectFields();
  const allEls = getElements();
  const done = new WeakSet();
  const debugLog = [];
  let filled = 0;

  fields.forEach(f => {
    const el = allEls[f.idx];
    if (!el || done.has(el)) return;

    for (const rule of FIELD_MAP) {
      if (keywordMatch(el, rule)) {
        const value = profileData[rule.field];
        if (!value) {
          debugLog.push({ idx: f.idx, hint: f.hint.slice(0, 80), profileKey: rule.field, status: 'miss', reason: 'no profile value' });
          break;
        }
        let success = false;
        if (el.tagName === 'SELECT') {
          success = setSelect(el, value);
        } else if (el.type === 'radio') {
          success = fillRadioGroup(el.name, value) > 0;
        } else {
          setValue(el, value);
          success = true;
        }
        done.add(el);
        if (success) filled++;
        debugLog.push({ idx: f.idx, hint: f.hint.slice(0, 80), profileKey: rule.field, value, status: success ? 'hit' : 'miss', reason: success ? null : 'option not matched' });
        break;
      }
    }

    if (!done.has(el)) {
      debugLog.push({ idx: f.idx, hint: f.hint.slice(0, 80), status: 'skip', reason: 'no keyword match' });
    }
  });

  return { filled, debug: { log: debugLog } };
}

// ─────────────────────────────────────────────────────────────
// AI MODE
// ─────────────────────────────────────────────────────────────

function buildPrompt(fields, profileData) {
  const populated = Object.entries(profileData).filter(([, v]) => v).reduce((a, [k, v]) => { a[k] = v; return a; }, {});

  const profileLines = Object.entries(populated).map(([k, v]) => `  ${k}: ${JSON.stringify(v)}`).join('\n');
  const catalogueLines = Object.entries(FIELD_CATALOGUE).filter(([k]) => k in populated).map(([k, d]) => `  ${k}: ${d}`).join('\n');
  const fieldLines = fields.map(f => {
    let line = `[${f.idx}] hint: "${f.hint}"`;
    if (f.options?.length) { line += ` | options: ${f.options.join(', ')} | type: select/radio`; }
    else if (f.type) { line += ` | type: ${f.type}`; }
    return line;
  }).join('\n');

  return `You are an expert at filling Australian job application forms.

APPLICANT PROFILE (only populated fields shown):
${profileLines}

FIELD CATALOGUE (what each profile key represents):
${catalogueLines}

FORM FIELDS ON THIS PAGE:
${fieldLines}

TASK:
Match each form field to the correct profile key.

Rules:
- For plain text/date/number inputs: return just the profile key string e.g. "f_firstName"
- For select/radio fields (marked type: select/radio): return an object with the key AND the exact option text from the listed options e.g. {"key": "f_state", "option": "Victoria"}
- Never return null — skip the field entirely if unsure
- Do not confuse similar fields (e.g. personal email vs emergency contact email)

{"matches": {"<idx>": "<profile_key_or_object>"}}

Example:
{"matches": {"3": "f_firstName", "7": {"key": "f_gender", "option": "Female"}, "9": {"key": "f_state", "option": "Victoria"}}}`;
}

async function callGemini(apiKey, prompt) {
  const response = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: 'You are a JSON-only responder. Always reply with raw valid JSON and nothing else. No markdown, no code fences, no explanation.' }] },
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 8192, responseMimeType: 'application/json' },
      }),
    }
  );
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`[Gemini ${response.status}] ${err?.error?.message || 'Unknown error'}`);
  }
  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  try {
    const clean = text.replace(/^[\s\S]*?(\{)/, '$1').replace(/\}[^}]*$/, '}').trim();
    return JSON.parse(clean);
  } catch {
    throw new Error(`AI returned invalid JSON: "${text.slice(0, 200)}"`);
  }
}

async function autofillAI(profileData, apiKey) {
  const fields = collectFields();
  if (!fields.length) return { filled: 0, debug: null };

  const result = await callGemini(apiKey, buildPrompt(fields, profileData));
  const matches = result.matches || {};
  const allEls = getElements();
  const debugLog = [];
  let filled = 0;

  for (const [idxStr, match] of Object.entries(matches)) {
    const el = allEls[parseInt(idxStr)];
    if (!el) { debugLog.push({ idx: idxStr, status: 'miss', reason: 'element not found' }); continue; }

    const profileKey = typeof match === 'object' ? match.key : match;
    const optionOverride = typeof match === 'object' ? match.option : null;
    const value = profileData[profileKey];
    const hint = fields.find(f => f.idx === parseInt(idxStr))?.hint || '';

    if (!value && !optionOverride) {
      debugLog.push({ idx: idxStr, hint, profileKey, status: 'miss', reason: 'no profile value' });
      continue;
    }

    let success = false;
    if (el.tagName === 'SELECT') success = setSelect(el, optionOverride || value);
    else if (el.type === 'radio') success = fillRadioGroup(el.name, optionOverride || value) > 0;
    else { setValue(el, value); success = true; }

    if (success) filled++;
    debugLog.push({ idx: idxStr, hint: hint.slice(0, 80), profileKey, value: optionOverride || value, status: success ? 'hit' : 'miss', reason: success ? null : 'option not matched' });
  }

  fields.forEach(f => {
    if (!Object.prototype.hasOwnProperty.call(matches, String(f.idx))) {
      debugLog.push({ idx: f.idx, hint: f.hint.slice(0, 80), status: 'skip', reason: 'AI did not match' });
    }
  });

  return { filled, debug: { matches, log: debugLog } };
}

// ─────────────────────────────────────────────────────────────
// MESSAGE LISTENER
// ─────────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'ping') { sendResponse({ alive: true }); return true; }

  if (msg.action === 'autofill') {
    const run = msg.useAI
      ? autofillAI(msg.data, msg.apiKey)
      : Promise.resolve(autofillKeyword(msg.data));

    run
      .then(({ filled, debug }) => sendResponse({ filled, success: true, debug }))
      .catch(e => sendResponse({ filled: 0, success: false, error: e.message }));
    return true;
  }
});

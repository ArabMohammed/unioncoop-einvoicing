/* Union Coop — E-Invoicing Supplier Data Update Form
   Vanilla JS, no dependencies. */
(function () {
  'use strict';

  /* =====================================================================
     CONFIGURATION
     endpoint: URL that receives the submission as a JSON POST.
               Leave empty to run in preview mode (nothing is sent).
     ===================================================================== */
  var CONFIG = {
    endpoint: '',
    draftKey: 'uc-einv-supplier-draft-v1',
    peppolScheme: '0235',          // UAE TIN Peppol participant scheme
    expiryWarnDays: 60
  };

  var form = document.getElementById('einvForm');
  if (!form) return;

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- Reference data ---------- */
  var COUNTRY_CODES = 'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS XK YE YT ZA ZM ZW'.split(' ');

  var EMIRATES = { AUH: 'Abu Dhabi', DXB: 'Dubai', SHJ: 'Sharjah', AJM: 'Ajman', UAQ: 'Umm Al Quwain', RAK: 'Ras Al Khaimah', FUJ: 'Fujairah' };
  var CITIES = {
    AUH: ['Abu Dhabi', 'Al Ain', 'Mussafah', 'Ruwais', 'Madinat Zayed', 'Ghayathi'],
    DXB: ['Dubai', 'Jebel Ali', 'Hatta'],
    SHJ: ['Sharjah', 'Khor Fakkan', 'Kalba', 'Dibba Al Hisn', 'Al Dhaid'],
    AJM: ['Ajman', 'Masfout', 'Manama'],
    UAQ: ['Umm Al Quwain'],
    RAK: ['Ras Al Khaimah'],
    FUJ: ['Fujairah', 'Dibba Al Fujairah', 'Masafi']
  };

  /* ---------- Issuing authorities and the ID format each one issues ----------
     Every authority carries its own registration-ID rule:
       re        pattern the (normalised, upper-case, space-free) ID must match
       format    plain-language description shown to the user
       example   sample value shown as placeholder
       normalize optional clean-up applied on blur (e.g. inserting a dash)
       validate  optional custom check returning an error message or ''
     Update a rule here if an authority changes its numbering scheme. */
  function numeric(min, max, example) {
    return {
      re: new RegExp('^\\d{' + min + ',' + max + '}$'),
      format: (min === max ? min : min + '–' + max) + ' digits',
      example: example, inputmode: 'numeric', maxlength: max
    };
  }
  function prefixed(prefixes, min, max, example) {
    var p = prefixes.join('|');
    return {
      re: new RegExp('^(' + p + ')-\\d{' + min + ',' + max + '}$'),
      format: prefixes.join(' / ') + ' followed by a dash and ' + min + '–' + max + ' digits',
      example: example, maxlength: 4 + max,
      normalize: function (v) { return v.replace(new RegExp('^(' + p + ')-?(\\d)'), '$1-$2'); }
    };
  }

  var MAINLAND = 'Mainland — Department of Economic Development';
  var FREE_ZONE = 'Free zones';
  var FEDERAL = 'Federal';
  var AUTHORITIES = [
    { code: 'DXB-DET', short: 'Dubai DET', group: MAINLAND, types: ['TL'], name: 'Department of Economy and Tourism (DET) — Dubai', id: numeric(5, 7, '1234567') },
    { code: 'AUH-ADDED', short: 'Abu Dhabi ADDED', group: MAINLAND, types: ['TL'], name: 'Abu Dhabi Department of Economic Development (ADDED)', id: prefixed(['CN', 'IN'], 6, 7, 'CN-1234567') },
    { code: 'SHJ-SEDD', short: 'Sharjah SEDD', group: MAINLAND, types: ['TL'], name: 'Sharjah Economic Development Department (SEDD)', id: numeric(5, 7, '765432') },
    { code: 'AJM-DED', short: 'Ajman DED', group: MAINLAND, types: ['TL'], name: 'Ajman Department of Economic Development', id: numeric(4, 7, '123456') },
    { code: 'UAQ-DED', short: 'Umm Al Quwain DED', group: MAINLAND, types: ['TL'], name: 'Umm Al Quwain Department of Economic Development', id: numeric(4, 7, '12345') },
    { code: 'RAK-DED', short: 'Ras Al Khaimah DED', group: MAINLAND, types: ['TL'], name: 'Ras Al Khaimah Department of Economic Development', id: numeric(4, 7, '123456') },
    { code: 'FUJ-DED', short: 'Fujairah DED', group: MAINLAND, types: ['TL'], name: 'Fujairah Department of Economic Development', id: numeric(4, 7, '12345') },

    { code: 'FZ-JAFZA', short: 'JAFZA', group: FREE_ZONE, types: ['TL'], name: 'Jebel Ali Free Zone Authority (JAFZA)', id: numeric(4, 6, '158963') },
    { code: 'FZ-DMCC', short: 'DMCC', group: FREE_ZONE, types: ['TL'], name: 'Dubai Multi Commodities Centre (DMCC)',
      id: { re: /^DMCC-\d{4,7}$/, format: '“DMCC-” followed by 4–7 digits', example: 'DMCC-123456', maxlength: 12,
            normalize: function (v) { return v.replace(/^(?:DMCC-?)?(\d{4,7})$/, 'DMCC-$1'); } } },
    { code: 'FZ-DAFZA', short: 'DAFZA', group: FREE_ZONE, types: ['TL'], name: 'Dubai Airport Freezone Authority (DAFZA)', id: numeric(4, 6, '12345') },
    { code: 'FZ-DIFC', short: 'DIFC', group: FREE_ZONE, types: ['TL'], name: 'Dubai International Financial Centre (DIFC)',
      id: { re: /^(CL)?\d{3,6}$/, format: '3–6 digits (optionally prefixed “CL”)', example: '1234', maxlength: 8 } },
    { code: 'FZ-DSOUTH', short: 'Dubai South', group: FREE_ZONE, types: ['TL'], name: 'Dubai South Free Zone', id: numeric(4, 7, '12345') },
    { code: 'FZ-MEYDAN', short: 'Meydan Free Zone', group: FREE_ZONE, types: ['TL'], name: 'Meydan Free Zone', id: numeric(4, 7, '1234567') },
    { code: 'FZ-ADGM', short: 'ADGM', group: FREE_ZONE, types: ['TL'], name: 'Abu Dhabi Global Market (ADGM)', id: numeric(6, 9, '000012345') },
    { code: 'FZ-KEZAD', short: 'KEZAD', group: FREE_ZONE, types: ['TL'], name: 'Khalifa Economic Zones Abu Dhabi (KEZAD)', id: numeric(3, 8, '12345') },
    { code: 'FZ-SAIF', short: 'SAIF Zone', group: FREE_ZONE, types: ['TL'], name: 'Sharjah Airport International Free Zone (SAIF Zone)', id: numeric(4, 6, '12345') },
    { code: 'FZ-HFZA', short: 'HFZA', group: FREE_ZONE, types: ['TL'], name: 'Hamriyah Free Zone Authority (HFZA)', id: numeric(4, 6, '12345') },
    { code: 'FZ-AFZ', short: 'Ajman Free Zone', group: FREE_ZONE, types: ['TL'], name: 'Ajman Free Zone Authority', id: numeric(4, 6, '12345') },
    { code: 'FZ-UAQFTZ', short: 'UAQ Free Trade Zone', group: FREE_ZONE, types: ['TL'], name: 'Umm Al Quwain Free Trade Zone', id: numeric(4, 6, '12345') },
    { code: 'FZ-RAKEZ', short: 'RAKEZ', group: FREE_ZONE, types: ['TL'], name: 'Ras Al Khaimah Economic Zone (RAKEZ)', id: numeric(4, 8, '5012345') },
    { code: 'FZ-FUJFZ', short: 'Fujairah Free Zone', group: FREE_ZONE, types: ['TL'], name: 'Fujairah Free Zone Authority', id: numeric(4, 6, '12345') },

    { code: 'FED-ICP', short: 'ICP', group: FEDERAL, types: ['EID'], name: 'Federal Authority for Identity, Citizenship, Customs and Port Security (ICP)',
      id: { format: '784-YYYY-NNNNNNN-C (15 digits)', example: '784-1990-1234567-1', inputmode: 'numeric', maxlength: 18, normalize: formatEID, validate: eidError } },
    { code: 'FED-CABINET', short: 'UAE Cabinet', group: FEDERAL, types: ['CD'], name: 'UAE Cabinet',
      id: { format: 'decision number / year', example: '25/2023', maxlength: 9,
            normalize: function (v) { return v.replace(/^(\d{1,4})(?:OF|-|\.)((?:19|20)\d{2})$/, '$1/$2'); },
            validate: function (v) {
              var m = /^(\d{1,4})\/((?:19|20)\d{2})$/.exec(v);
              if (!m || +m[1] === 0) return 'Cabinet Decision number must be written as number/year, e.g. 25/2023.';
              if (+m[2] < 1971 || +m[2] > new Date().getFullYear()) return 'The decision year must be between 1971 and ' + new Date().getFullYear() + '.';
              return '';
            } } },

    { code: 'OTHER', short: 'the issuing authority', group: 'Other', types: ['TL'], name: 'Other authority (not listed)',
      id: { re: /^[A-Z0-9][A-Z0-9\-\/.]{1,29}$/, format: '2–30 letters or digits (“-”, “/”, “.” allowed)', example: '', maxlength: 30 } }
  ];
  var AUTH_BY_CODE = {};
  AUTHORITIES.forEach(function (a) { AUTH_BY_CODE[a.code] = a; });

  /* Passport number formats by issuing country (ICAO 9303 allows up to 9 characters). */
  var PASSPORT_DEFAULT = { re: /^[A-Z0-9]{6,9}$/, format: '6–9 letters or digits', example: 'N1234567', maxlength: 9 };
  var PASSPORT_FORMATS = {
    IN: { re: /^[A-Z]\d{7}$/, format: '1 letter followed by 7 digits', example: 'K1234567', maxlength: 8 },
    PK: { re: /^[A-Z]{2}\d{7}$/, format: '2 letters followed by 7 digits', example: 'AB1234567', maxlength: 9 },
    PH: { re: /^([A-Z]\d{7}[A-Z]|[A-Z]{2}\d{7})$/, format: '1 letter + 7 digits + 1 letter (or 2 letters + 7 digits)', example: 'P1234567A', maxlength: 9 },
    GB: { re: /^\d{9}$/, format: '9 digits', example: '123456789', inputmode: 'numeric', maxlength: 9 },
    US: { re: /^(\d{9}|[A-Z]\d{8})$/, format: '9 digits, or 1 letter followed by 8 digits', example: 'A12345678', maxlength: 9 }
  };
  var COUNTRY_NAMES = {};

  var TYPE_MAX_YEARS = { TL: 10, EID: 10, PAS: 10, CD: 100 };

  var PHASES = {
    P1: 'Phase 1 — Annual revenue exceeding AED 50 million (from January 2027)',
    P2: 'Phase 2 — Annual revenue below AED 50 million (from July 2027)',
    P3: 'Phase 3 — Government entities (from October 2027)'
  };

  /* ---------- Patterns ---------- */
  var ORG_RE = /^[\p{L}\p{N}][\p{L}\p{M}\p{N} .,&'’()\/\-–—+@]*$/u;
  var ADDR_RE = /^[\p{L}\p{M}\p{N} .,&'’()\/\-–—#:]+$/u;
  var PLACE_RE = /^[\p{L}][\p{L}\p{M} .'’\-]*$/u;
  var PERSON_RE = /^[\p{L}][\p{L}\p{M} .'’\-]*$/u;
  var EMAIL_RE = /^[A-Za-z0-9!#$%&'*+\/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+\/=?^_`{|}~-]+)*@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,24}$/;

  /* ---------- Date helpers (local time, no timezone drift) ---------- */
  function today() { var d = new Date(); d.setHours(0, 0, 0, 0); return d; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function toISO(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parseISO(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
    if (!m) return null;
    var d = new Date(+m[1], +m[2] - 1, +m[3]);
    return (d.getFullYear() === +m[1] && d.getMonth() === +m[2] - 1 && d.getDate() === +m[3]) ? d : null;
  }
  function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function addYears(d, n) { var x = new Date(d); x.setFullYear(x.getFullYear() + n); return x; }
  function fmtDate(d) { return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear(); }
  function daysBetween(a, b) { return Math.round((b - a) / 86400000); }

  /* ---------- Identifier helpers ---------- */
  function luhn(digits) {
    var sum = 0, alt = false;
    for (var i = digits.length - 1; i >= 0; i--) {
      var n = +digits[i];
      if (alt) { n *= 2; if (n > 9) n -= 9; }
      sum += n; alt = !alt;
    }
    return sum % 10 === 0;
  }
  function formatEID(raw) {
    var d = String(raw).replace(/\D/g, '').slice(0, 15);
    return [d.slice(0, 3), d.slice(3, 7), d.slice(7, 14), d.slice(14)].filter(Boolean).join('-');
  }
  function eidError(v) {
    if (/[^\d\-\s]/.test(v)) return 'Emirates ID contains digits only (format 784-YYYY-NNNNNNN-C).';
    var d = v.replace(/\D/g, '');
    if (d.length !== 15) return 'Emirates ID must contain 15 digits — you entered ' + d.length + '.';
    if (d.slice(0, 3) !== '784') return 'Emirates ID numbers start with 784.';
    var y = +d.slice(3, 7);
    if (y < 1900 || y > new Date().getFullYear()) return 'Digits 4–7 of an Emirates ID are a year of birth — please check the number.';
    if (!luhn(d)) return 'This Emirates ID number fails the check-digit test — please check for typing mistakes.';
    return '';
  }

  function normalizePhone(raw) {
    var s = String(raw || '').replace(/[\s\-().]/g, '');
    if (!s) return '';
    if (s.indexOf('00') === 0) s = '+' + s.slice(2);
    if (s[0] !== '+') {
      if (s.indexOf('971') === 0 && s.length >= 11) s = '+' + s;
      else if (/^0[2-9]\d{7,8}$/.test(s)) s = '+971' + s.slice(1);
      else if (/^5\d{8}$/.test(s)) s = '+971' + s;
    }
    if (s.indexOf('+9710') === 0) s = '+971' + s.slice(5);
    return s;
  }
  function phoneError(raw) {
    if (/[^\d\s\-+().]/.test(raw)) return 'Phone numbers can contain digits, spaces, “+”, “-” and brackets only.';
    var s = normalizePhone(raw);
    if (!/^\+[1-9]\d{6,14}$/.test(s)) return 'Enter a valid phone number, e.g. +971 50 123 4567 or 04 123 4567.';
    if (s.indexOf('+971') === 0) {
      var n = s.slice(4);
      if (/^5\d{8}$/.test(n) || /^[234679]\d{7}$/.test(n) || /^(800|600)\d{4,7}$/.test(n)) return '';
      return 'Not a valid UAE number. Mobile: +971 5X XXX XXXX · Landline: +971 4 XXX XXXX.';
    }
    return '';
  }
  function formatPhone(s) {
    if (s.indexOf('+971') !== 0) return s;
    var n = s.slice(4);
    if (/^5\d{8}$/.test(n)) return '+971 ' + n.slice(0, 2) + ' ' + n.slice(2, 5) + ' ' + n.slice(5);
    if (/^[234679]\d{7}$/.test(n)) return '+971 ' + n[0] + ' ' + n.slice(1, 4) + ' ' + n.slice(4);
    return '+971 ' + n;
  }

  function collapse(v) { return v.replace(/\s+/g, ' ').trim(); }
  function textRule(min, re, what) {
    return function (v) {
      if (v.length < min) return 'Please enter at least ' + min + ' characters.';
      if (!re.test(v)) return what;
      return '';
    };
  }

  /* ---------- Registration ID rule: depends on type + authority (or passport country) ---------- */
  var REG_ID_DEFAULT_HINT = 'Trade licence no. / Emirates ID / Passport no. / Cabinet Decision no.';

  function regIdRule() {
    var type = value('reg_type');
    if (type === 'PAS') {
      var c = value('passport_country');
      return c ? (PASSPORT_FORMATS[c] || PASSPORT_DEFAULT) : null;
    }
    var a = AUTH_BY_CODE[value('reg_authority')];
    return a && a.types.indexOf(type) >= 0 ? a.id : null;
  }
  function regIdIssuer() {
    if (value('reg_type') === 'PAS') return 'passports issued by ' + (COUNTRY_NAMES[value('passport_country')] || 'this country');
    var a = AUTH_BY_CODE[value('reg_authority')];
    return a ? a.short : 'this authority';
  }
  function regIdPrerequisite() {
    var type = value('reg_type');
    if (!type) return 'Select the Legal Registration ID Type first.';
    if (type === 'PAS') return 'Select the Passport Issuing Country first.';
    return 'Select the Issuing Authority first — the ID format depends on it.';
  }
  function normalizeRegId(v) {
    var s = v.toUpperCase().replace(/\s+/g, '');
    var r = regIdRule();
    return r && r.normalize ? r.normalize(s) : s;
  }

  /* ---------- Field validators (only run on non-empty values) ---------- */
  var VALIDATORS = {
    legal_entity_name: textRule(2, ORG_RE, 'Use letters, numbers, spaces and common punctuation ( & . , \' - / ( ) ) only.'),
    trade_name: textRule(2, ORG_RE, 'Use letters, numbers, spaces and common punctuation ( & . , \' - / ( ) ) only.'),
    trn: function (v) {
      if (!/^\d{15}$/.test(v)) return 'TRN must be exactly 15 digits — you entered ' + v.length + '.';
      if (v[0] !== '1') return 'A UAE TRN starts with the digit 1.';
      return '';
    },
    tin: function (v) {
      if (!/^\d{10}$/.test(v)) return 'TIN must be exactly 10 digits — you entered ' + v.length + '.';
      if (v[0] !== '1') return 'A UAE TIN starts with the digit 1.';
      var trn = isEnabled('trn') ? value('trn') : '';
      if (/^\d{15}$/.test(trn) && trn.slice(0, 10) !== v) return 'TIN must match the first 10 digits of your TRN (' + trn.slice(0, 10) + ').';
      return '';
    },
    reg_id: function (v) {
      var r = regIdRule();
      if (!r) return regIdPrerequisite();
      if (r.validate) return r.validate(v);
      if (r.re.test(v)) return '';
      return 'Invalid format for ' + regIdIssuer() + ' — expected ' + r.format + (r.example ? ', e.g. ' + r.example : '') + '.';
    },
    reg_expiry: function (v) {
      var d = parseISO(v);
      if (!d) return 'Enter a valid date.';
      var t = today();
      if (d < t) return 'This document expired on ' + fmtDate(d) + '. Please provide a valid, unexpired registration.';
      if (+d === +t) return 'This document expires today. Please provide the renewed registration.';
      var max = maxExpiry();
      if (d > max) return 'This date is too far ahead — for this document type the expiry should be no later than ' + fmtDate(max) + '.';
      return '';
    },
    reg_authority_other: textRule(3, ORG_RE, 'Use letters, numbers, spaces and common punctuation only.'),
    address_line1: textRule(3, ADDR_RE, 'Use letters, numbers, spaces and common address punctuation ( , . - / # ) only.'),
    address_line2: textRule(1, ADDR_RE, 'Use letters, numbers, spaces and common address punctuation ( , . - / # ) only.'),
    city: textRule(2, PLACE_RE, 'City names can contain letters, spaces, hyphens and apostrophes only.'),
    po_box: function (v) {
      if (value('country') === 'AE') return /^\d{1,7}$/.test(v) ? '' : 'A UAE P.O. Box is 1–7 digits, e.g. 12345.';
      return /^[A-Z0-9][A-Z0-9 \-]{1,9}$/i.test(v) ? '' : 'Postal code: 2–10 letters or digits.';
    },
    beneficiary_id: function (v) {
      if (/^1\d{9}$/.test(v) || /^1\d{14}$/.test(v)) return '';
      return 'Enter a 10-digit TIN or a 15-digit TRN (both start with 1) — you entered ' + v.length + ' digits.';
    },
    contact_name: textRule(2, PERSON_RE, 'Names can contain letters, spaces, hyphens, apostrophes and full stops only.'),
    contact_email: function (v) {
      if (!EMAIL_RE.test(v) || v.split('@')[0].length > 64) return 'Enter a valid email address, e.g. name@company.ae.';
      return '';
    },
    contact_phone: phoneError
  };

  /* Normalisation applied when a field loses focus. */
  var NORMALIZERS = {
    legal_entity_name: collapse, trade_name: collapse, reg_authority_other: collapse,
    address_line1: collapse, address_line2: collapse, city: collapse, contact_name: collapse,
    po_box: function (v) { return v.trim().toUpperCase(); },
    contact_email: function (v) { return v.trim().toLowerCase(); },
    contact_phone: function (v) { return phoneError(v) ? v.trim() : formatPhone(normalizePhone(v)); },
    reg_id: normalizeRegId
  };

  var LABEL_OVERRIDES = { ack_lpo: 'LPO / Contract reference acknowledgement', declaration: 'Declaration', reg_type: 'Legal Registration ID Type' };

  /* ---------- State ---------- */
  var touched = {};
  var attempted = false;
  var autoFilled = { tin: false };

  /* ---------- DOM accessors ---------- */
  function wrapOf(name) { return form.querySelector('.field[data-field="' + name + '"]'); }
  function ctl(name) { return form.elements.namedItem(name); }
  function isGroup(el) { return el && !el.tagName; }            // RadioNodeList
  function firstInput(name) { var el = ctl(name); return isGroup(el) ? el[0] : el; }
  function value(name) {
    var el = ctl(name);
    if (!el) return '';
    if (isGroup(el)) return el.value || '';
    if (el.type === 'checkbox') return el.checked ? 'yes' : '';
    return el.value.trim();
  }
  function isEnabled(name) {
    var w = wrapOf(name), el = firstInput(name);
    return !!el && !el.disabled && !(w && w.hidden);
  }
  function isRequired(name) { var el = firstInput(name); return !!el && el.required; }
  function labelOf(name) {
    if (LABEL_OVERRIDES[name]) return LABEL_OVERRIDES[name];
    var w = wrapOf(name), l = w && $('.field__head label, .field__label', w);
    return l ? l.textContent.trim() : name;
  }

  /* ---------- Validation ---------- */
  function check(name) {
    if (!isEnabled(name)) return '';
    var el = firstInput(name), v = value(name);
    if (name === 'reg_id' && !regIdRule()) return regIdPrerequisite();
    if (name === 'reg_authority' && !v && !value('reg_type')) return 'Select the Legal Registration ID Type first.';
    if (!v) {
      if (el.validity && el.validity.badInput) return 'Please enter a complete, valid date.';
      if (!isRequired(name)) return '';
      if (el.type === 'checkbox') return 'Please tick this box to continue.';
      if (el.type === 'radio') return 'Please choose an option.';
      if (el.tagName === 'SELECT') return 'Please select the ' + labelOf(name) + '.';
      return 'Please enter the ' + labelOf(name) + '.';
    }
    var fn = VALIDATORS[name];
    return fn ? fn(v) : '';
  }

  function render(name) {
    var w = wrapOf(name);
    if (!w) return '';
    var msg = check(name);
    var err = document.getElementById(name + '-err');
    if (err) err.textContent = msg;
    var hasVal = !!value(name);
    w.classList.toggle('is-invalid', !!msg);
    w.classList.toggle('is-valid', !msg && hasVal && isEnabled(name));
    var el = ctl(name);
    (isGroup(el) ? Array.prototype.slice.call(el) : [el]).forEach(function (c) {
      if (msg) c.setAttribute('aria-invalid', 'true'); else c.removeAttribute('aria-invalid');
    });
    if (name === 'reg_expiry') renderExpiryWarning(msg);
    if (name === 'tin') renderPeppol(msg);
    return msg;
  }

  function clearState(name) {
    var w = wrapOf(name), err = document.getElementById(name + '-err');
    if (err) err.textContent = '';
    if (w) w.classList.remove('is-invalid', 'is-valid');
    var el = ctl(name);
    if (el) (isGroup(el) ? Array.prototype.slice.call(el) : [el]).forEach(function (c) { c.removeAttribute('aria-invalid'); });
  }

  function renderIfShown(name) {
    if (touched[name] || attempted || value(name)) render(name);
  }

  function fieldNames() {
    return $$('.field[data-field]', form).map(function (w) { return w.getAttribute('data-field'); });
  }

  /* ---------- Expiry date ---------- */
  var expiryWarn = document.createElement('p');
  expiryWarn.className = 'warn';
  expiryWarn.id = 'reg_expiry-warn';
  expiryWarn.hidden = true;
  document.getElementById('reg_expiry-err').insertAdjacentElement('afterend', expiryWarn);

  function maxExpiry() {
    return addYears(today(), TYPE_MAX_YEARS[value('reg_type')] || 10);
  }
  function applyExpiryBounds() {
    var el = ctl('reg_expiry');
    el.min = toISO(addDays(today(), 1));
    el.max = toISO(maxExpiry());
  }
  function renderExpiryWarning(msg) {
    var d = parseISO(value('reg_expiry'));
    var days = d ? daysBetween(today(), d) : null;
    if (!msg && d && days <= CONFIG.expiryWarnDays) {
      expiryWarn.textContent = 'Note: this document expires in ' + days + ' day' + (days === 1 ? '' : 's') + ' (' + fmtDate(d) + '). Please send Union Coop the renewed details once available.';
      expiryWarn.hidden = false;
    } else {
      expiryWarn.hidden = true;
    }
  }

  /* ---------- Peppol ID preview ---------- */
  var peppolEl = document.getElementById('tin-peppol');
  function renderPeppol(msg) {
    var tin = value('tin');
    if (!msg && /^\d{10}$/.test(tin)) {
      $('strong', peppolEl).textContent = CONFIG.peppolScheme + ':' + tin;
      peppolEl.hidden = false;
    } else {
      peppolEl.hidden = true;
    }
  }

  /* ---------- Conditional sections ---------- */
  function setConditional(name, on) {
    var w = wrapOf(name), el = ctl(name);
    var inputs = isGroup(el) ? Array.prototype.slice.call(el) : [el];
    var wasHidden = w.hidden;
    w.hidden = !on;
    inputs.forEach(function (c) { c.disabled = !on; c.required = on; });
    if (on && wasHidden) {
      w.classList.remove('reveal'); void w.offsetWidth; w.classList.add('reveal');
    }
    if (!on) clearState(name);
  }

  function applyVat() {
    var notVat = ctl('not_vat_registered').checked;
    var trn = ctl('trn');
    trn.disabled = notVat;
    trn.required = !notVat;
    var tag = document.getElementById('trn-tag');
    tag.textContent = notVat ? 'Not applicable' : 'Mandatory';
    tag.className = notVat ? 'tag' : 'tag tag--req';
    if (notVat) clearState('trn');
  }

  function fillDatalist(id, items) {
    var dl = document.getElementById(id);
    dl.innerHTML = '';
    items.forEach(function (v) { var o = document.createElement('option'); o.value = v; dl.appendChild(o); });
  }

  /* Rebuild the authority list for the selected ID type (keeps the current choice if still valid). */
  function buildAuthorityOptions() {
    var type = value('reg_type'), sel = ctl('reg_authority'), keep = sel.value;
    sel.innerHTML = '';
    var matches = AUTHORITIES.filter(function (a) { return type && a.types.indexOf(type) >= 0; });
    sel.add(new Option(!type ? 'Select the ID type first…' : 'Select the issuing authority…', ''));
    var groups = {};
    matches.forEach(function (a) {
      if (!groups[a.group]) { groups[a.group] = document.createElement('optgroup'); groups[a.group].label = a.group; sel.appendChild(groups[a.group]); }
      groups[a.group].appendChild(new Option(a.name, a.code));
    });
    if (matches.some(function (a) { return a.code === keep; })) sel.value = keep;
    else if (matches.length === 1) sel.value = matches[0].code;     // EID → ICP, CD → UAE Cabinet
    else sel.value = '';
  }

  /* Lock the registration ID until its format is known, and describe that format. */
  function applyIdLock() {
    var r = regIdRule(), id = ctl('reg_id'), w = wrapOf('reg_id');
    var hint = document.getElementById('reg_id-hint');
    id.readOnly = !r;
    w.classList.toggle('is-locked', !r);
    id.setAttribute('aria-readonly', String(!r));
    id.setAttribute('inputmode', r && r.inputmode ? r.inputmode : 'text');
    id.maxLength = r && r.maxlength ? r.maxlength : 30;
    if (r) {
      id.placeholder = r.example ? 'e.g. ' + r.example : '';
      hint.innerHTML = '';
      hint.appendChild(document.createTextNode('Format: '));
      var b = document.createElement('span'); b.className = 'id-format'; b.textContent = r.format; hint.appendChild(b);
      if (r.example) hint.appendChild(document.createTextNode(' · e.g. ' + r.example));
    } else {
      id.placeholder = regIdPrerequisite().replace(/ —.*$/, '').replace(/\.$/, '');
      hint.textContent = REG_ID_DEFAULT_HINT;
    }
  }

  function applyAuthority() {
    setConditional('reg_authority_other', isEnabled('reg_authority') && value('reg_authority') === 'OTHER');
    applyIdLock();
  }

  function applyRegType() {
    var type = value('reg_type');
    setConditional('passport_country', type === 'PAS');
    setConditional('reg_authority', type !== 'PAS');
    buildAuthorityOptions();
    applyAuthority();
    applyExpiryBounds();
  }

  /* After the format changes, re-clean any ID already typed and re-check it. */
  function refreshRegId() {
    var id = ctl('reg_id');
    if (id.value && regIdRule()) id.value = normalizeRegId(id.value);
    if (id.value) touched.reg_id = true;
    renderIfShown('reg_id');
  }

  function applyFreeZone() {
    setConditional('beneficiary_id', value('free_zone') === 'yes');
  }

  function applyCountry() {
    var isUAE = value('country') === 'AE';
    setConditional('emirate', isUAE);
    ctl('po_box').setAttribute('inputmode', isUAE ? 'numeric' : 'text');
    ctl('po_box').maxLength = isUAE ? 7 : 10;
    document.getElementById('po_box-hint').textContent = isUAE ? 'P.O. Box number of the registered address (digits only)' : 'Postal code of the registered address';
    applyCityList();
  }

  function applyCityList() {
    var em = value('emirate');
    var list = em && CITIES[em] ? CITIES[em] : Object.keys(CITIES).reduce(function (a, k) { return a.concat(CITIES[k]); }, []);
    fillDatalist('cityList', value('country') === 'AE' ? list : []);
  }

  function cityToEmirate() {
    if (value('country') !== 'AE' || value('emirate')) return;
    var c = value('city').toLowerCase();
    Object.keys(CITIES).some(function (k) {
      if (CITIES[k].some(function (n) { return n.toLowerCase() === c; })) {
        ctl('emirate').value = k; render('emirate'); applyCityList(); return true;
      }
      return false;
    });
  }

  function syncTinFromTrn() {
    var trn = value('trn'), tin = ctl('tin');
    if (isEnabled('trn') && /^1\d{14}$/.test(trn) && (!tin.value || autoFilled.tin)) {
      tin.value = trn.slice(0, 10);
      autoFilled.tin = true;
      render('tin');
    }
  }

  function syncAll() {
    applyVat();
    applyRegType();
    applyFreeZone();
    applyCountry();
    updateProgress();
  }

  /* ---------- Progress ---------- */
  var progressBar = document.getElementById('progressBar');
  var progressLabel = document.getElementById('progressLabel');
  var progressFill = document.getElementById('progressFill');
  function updateProgress() {
    var total = 0, done = 0;
    fieldNames().forEach(function (n) {
      if (!isEnabled(n) || !isRequired(n)) return;
      total++;
      if (value(n) && !check(n)) done++;
    });
    var pct = total ? Math.round(done / total * 100) : 0;
    progressFill.style.width = pct + '%';
    var complete = total > 0 && done === total;
    progressBar.classList.toggle('is-complete', complete);
    progressLabel.textContent = complete ? 'All required fields complete — ready to submit' : done + ' of ' + total + ' required fields complete';
  }

  /* ---------- Draft (this device only) ---------- */
  var draftTimer = null;
  function storage() { try { return window.localStorage; } catch (e) { return null; } }
  function saveDraft() {
    clearTimeout(draftTimer);
    draftTimer = setTimeout(function () {
      var s = storage(); if (!s) return;
      var data = {};
      $$('input, select', form).forEach(function (el) {
        if (!el.name || el.name === 'website') return;
        if (el.type === 'radio') { if (el.checked) data[el.name] = el.value; }
        else if (el.type === 'checkbox') data[el.name] = el.checked;
        else data[el.name] = el.value;
      });
      try { s.setItem(CONFIG.draftKey, JSON.stringify({ savedAt: Date.now(), data: data })); } catch (e) { /* quota / private mode */ }
    }, 400);
  }
  function loadDraft() {
    var s = storage(); if (!s) return false;
    var raw; try { raw = s.getItem(CONFIG.draftKey); } catch (e) { return false; }
    if (!raw) return false;
    var parsed; try { parsed = JSON.parse(raw); } catch (e) { return false; }
    var data = parsed && parsed.data; if (!data) return false;
    var any = false;
    Object.keys(data).forEach(function (name) {
      var el = ctl(name); if (!el) return;
      var v = data[name];
      if (isGroup(el)) { Array.prototype.forEach.call(el, function (r) { r.checked = r.value === v; }); if (v) any = true; }
      else if (el.type === 'checkbox') { el.checked = !!v; if (v) any = true; }
      else { el.value = v; if (v && name !== 'country') any = true; }
      if (name === 'reg_type') buildAuthorityOptions();   // so the saved authority can be re-selected
    });
    return any;
  }
  function clearDraft() { var s = storage(); if (s) try { s.removeItem(CONFIG.draftKey); } catch (e) { /* ignore */ } }

  /* ---------- Error summary ---------- */
  var summaryBox = document.getElementById('errorSummary');
  var summaryList = document.getElementById('errorList');
  function showErrorSummary(errors) {
    summaryList.innerHTML = '';
    errors.forEach(function (e) {
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.href = '#' + firstInput(e.name).id;
      a.textContent = labelOf(e.name) + ': ' + e.msg;
      a.addEventListener('click', function (ev) {
        ev.preventDefault();
        var el = firstInput(e.name);
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        setTimeout(function () { el.focus({ preventScroll: true }); }, 250);
      });
      li.appendChild(a); summaryList.appendChild(li);
    });
    summaryBox.hidden = false;
    summaryBox.scrollIntoView({ block: 'start', behavior: 'smooth' });
    summaryBox.focus({ preventScroll: true });
  }

  /* ---------- Payload & summary ---------- */
  function optionText(name) {
    var el = ctl(name);
    return el && el.selectedIndex > 0 ? el.options[el.selectedIndex].text : '';
  }
  function makeReference() {
    var d = today(), rnd = '';
    var bytes = new Uint8Array(4);
    window.crypto.getRandomValues(bytes);
    for (var i = 0; i < bytes.length; i++) rnd += (bytes[i] % 36).toString(36);
    return 'UC-EINV-' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' + rnd.toUpperCase();
  }
  function on(name) { return isEnabled(name) ? value(name) : ''; }

  function buildPayload() {
    var tin = value('tin');
    return {
      form: 'UC E-Invoicing Customer/Supplier Data Update',
      form_version: '3',
      party_type: 'Supplier',
      reference: makeReference(),
      submitted_at: new Date().toISOString(),
      entity: {
        legal_entity_name: value('legal_entity_name'),
        trade_name: value('trade_name'),
        vat_registered: !ctl('not_vat_registered').checked,
        trn: on('trn'),
        tin: tin,
        peppol_id: CONFIG.peppolScheme + ':' + tin
      },
      legal_registration: {
        id_type: value('reg_type'),
        issuing_authority_code: authorityCode(),
        issuing_authority: authorityName(),
        id: value('reg_id'),
        expiry_date: value('reg_expiry'),
        passport_issuing_country: on('passport_country')
      },
      registered_address: {
        line1: value('address_line1'),
        line2: value('address_line2'),
        city: value('city'),
        po_box: value('po_box'),
        emirate_code: on('emirate'),
        emirate: on('emirate') ? EMIRATES[value('emirate')] : '',
        country: value('country')
      },
      free_zone: {
        is_free_zone_entity: value('free_zone') === 'yes',
        beneficiary_id: on('beneficiary_id')
      },
      implementation_phase: value('phase'),
      primary_contact: {
        name: value('contact_name'),
        email: value('contact_email'),
        phone: normalizePhone(value('contact_phone'))
      },
      acknowledgements: {
        lpo_reference_on_invoices: ctl('ack_lpo').checked,
        information_accurate: ctl('declaration').checked
      }
    };
  }

  function authorityCode() {
    return value('reg_type') === 'PAS' ? 'PASSPORT-' + value('passport_country') : value('reg_authority');
  }
  function authorityName() {
    if (value('reg_type') === 'PAS') return 'Passport authority — ' + (COUNTRY_NAMES[value('passport_country')] || value('passport_country'));
    if (value('reg_authority') === 'OTHER') return value('reg_authority_other');
    var a = AUTH_BY_CODE[value('reg_authority')];
    return a ? a.name : '';
  }

  function summaryRows(p) {
    var exp = parseISO(p.legal_registration.expiry_date);
    return [
      ['Entity'],
      ['Legal Entity Name', p.entity.legal_entity_name],
      ['Trade Name', p.entity.trade_name],
      ['TRN', p.entity.vat_registered ? p.entity.trn : 'Not VAT-registered'],
      ['TIN', p.entity.tin],
      ['Peppol ID', p.entity.peppol_id],
      ['Legal registration'],
      ['ID Type', optionText('reg_type')],
      ['Issuing Authority', p.legal_registration.issuing_authority],
      ['Passport Issuing Country', p.legal_registration.passport_issuing_country ? optionText('passport_country') : ''],
      ['ID Number', p.legal_registration.id],
      ['Expiry Date', exp ? fmtDate(exp) : ''],
      ['Registered address'],
      ['Address', [p.registered_address.line1, p.registered_address.line2].filter(Boolean).join(', ')],
      ['City', p.registered_address.city],
      ['P.O. Box / Postal Code', p.registered_address.po_box],
      ['Emirate', p.registered_address.emirate],
      ['Country', optionText('country')],
      ['Free zone and phase'],
      ['Free Zone Entity', p.free_zone.is_free_zone_entity ? 'Yes' : 'No'],
      ['Beneficiary ID', p.free_zone.beneficiary_id],
      ['Implementation Phase', PHASES[p.implementation_phase] || 'Not specified'],
      ['Primary contact'],
      ['Name', p.primary_contact.name],
      ['Email', p.primary_contact.email],
      ['Phone', formatPhone(p.primary_contact.phone)]
    ];
  }

  var lastPayload = null;
  function showSuccess(p, preview) {
    lastPayload = p;
    document.getElementById('refNo').textContent = p.reference;
    document.getElementById('demoNotice').hidden = !preview;
    var dl = document.getElementById('summary');
    dl.innerHTML = '';
    summaryRows(p).forEach(function (r) {
      if (r.length === 2 && !r[1]) return;
      var row = document.createElement('div');
      var dt = document.createElement('dt'); dt.textContent = r[0]; row.appendChild(dt);
      if (r.length === 1) row.className = 'summary__group';
      else { var dd = document.createElement('dd'); dd.textContent = r[1]; row.appendChild(dd); }
      dl.appendChild(row);
    });
    form.hidden = true;
    document.getElementById('introSection').hidden = true;
    document.body.classList.add('is-done');
    var panel = document.getElementById('successPanel');
    panel.hidden = false;
    window.scrollTo(0, 0);
    panel.focus({ preventScroll: true });
  }

  /* ---------- Toast ---------- */
  var toastEl = document.getElementById('toast'), toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('is-on'); }, 2600);
  }

  /* =====================================================================
     EVENTS
     ===================================================================== */
  form.addEventListener('input', function (e) {
    var el = e.target, name = el.name;
    if (!name) return;

    // Input filters
    if (el.hasAttribute('data-digits')) {
      var digits = el.value.replace(/\D/g, '');
      if (digits !== el.value) el.value = digits;
    }
    if (name === 'po_box' && value('country') === 'AE') {
      var pd = el.value.replace(/\D/g, '');
      if (pd !== el.value) el.value = pd;
    }
    if (name === 'contact_phone') {
      var ph = el.value.replace(/[^\d\s\-+()]/g, '');
      if (ph !== el.value) el.value = ph;
    }
    if (name === 'reg_id') {
      var rule = regIdRule();
      if (value('reg_type') === 'EID') {
        if (el.selectionStart === el.value.length) {
          var f = formatEID(el.value);
          if (f !== el.value) el.value = f;
        }
      } else if (rule && rule.inputmode === 'numeric') {
        var nd = el.value.replace(/\D/g, '');
        if (nd !== el.value) el.value = nd;
      }
    }

    // Field relationships
    if (name === 'trn') { syncTinFromTrn(); renderIfShown('tin'); }
    if (name === 'tin') autoFilled.tin = false;

    if (touched[name] || attempted) render(name);
    else if (name === 'tin') renderPeppol(check('tin'));
    updateProgress();
    saveDraft();
  });

  form.addEventListener('change', function (e) {
    var name = e.target.name;
    if (!name) return;
    if (name === 'not_vat_registered') { applyVat(); renderIfShown('tin'); }
    if (name === 'reg_type') {
      applyRegType();
      ['reg_authority', 'passport_country', 'reg_expiry'].forEach(function (n) { if (isEnabled(n)) renderIfShown(n); });
      refreshRegId();
    }
    if (name === 'reg_authority') { applyAuthority(); refreshRegId(); }
    if (name === 'passport_country') { applyIdLock(); refreshRegId(); }
    if (name === 'free_zone') applyFreeZone();
    if (name === 'country') { applyCountry(); renderIfShown('po_box'); }
    if (name === 'emirate') applyCityList();
    if (name === 'city') cityToEmirate();
    if (name === 'reg_expiry') touched[name] = true;
    if (e.target.type === 'radio' || e.target.type === 'checkbox' || e.target.tagName === 'SELECT') touched[name] = true;
    if (name !== 'not_vat_registered') render(name);
    updateProgress();
    saveDraft();
  });

  // Explain why the registration ID is locked when someone tries to use it.
  ctl('reg_id').addEventListener('focus', function () {
    if (this.readOnly) toast(regIdPrerequisite());
  });

  form.addEventListener('focusout', function (e) {
    var el = e.target, name = el.name;
    if (!name || el.type === 'radio' || el.type === 'checkbox' || !wrapOf(name)) return;
    var norm = NORMALIZERS[name];
    if (norm && el.value) {
      var nv = norm(el.value);
      if (nv !== el.value) el.value = nv;
    }
    if (el.value || touched[name]) touched[name] = true;
    if (touched[name]) render(name);
    if (name === 'trn') renderIfShown('tin');
    updateProgress();
    saveDraft();
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    attempted = true;

    // Normalise everything before final validation
    Object.keys(NORMALIZERS).forEach(function (n) {
      var el = ctl(n);
      if (el && !isGroup(el) && el.value && !el.disabled) el.value = NORMALIZERS[n](el.value);
    });

    var errors = [];
    fieldNames().forEach(function (n) {
      var msg = render(n);
      if (msg) errors.push({ name: n, msg: msg });
    });
    updateProgress();
    if (errors.length) { showErrorSummary(errors); return; }
    summaryBox.hidden = true;

    var payload = buildPayload();
    var btns = $$('button[type="submit"]');

    // Honeypot filled → silently "succeed" without sending
    if (ctl('website').value) { showSuccess(payload, false); return; }

    if (!CONFIG.endpoint) { clearDraft(); showSuccess(payload, true); return; }

    btns.forEach(function (b) { b.disabled = true; });
    var mainBtn = document.getElementById('submitBtn');
    var original = mainBtn.textContent;
    mainBtn.textContent = 'Submitting…';

    fetch(CONFIG.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json().catch(function () { return {}; });
    }).then(function (data) {
      if (data && data.reference) payload.reference = String(data.reference);
      clearDraft();
      showSuccess(payload, false);
    }).catch(function () {
      toast('We could not submit right now — please check your connection and try again.');
      summaryList.innerHTML = '<li>Submission failed. Your details are saved on this device — please try again in a moment.</li>';
      summaryBox.hidden = false;
      summaryBox.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }).then(function () {
      btns.forEach(function (b) { b.disabled = false; });
      mainBtn.textContent = original;
    });
  });

  /* Copy Union Coop identifiers */
  $$('.copy-btn').forEach(function (b) {
    b.addEventListener('click', function () {
      var text = b.getAttribute('data-copy');
      var done = function () { toast('Copied ' + text); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () { toast('Copy not available — please select the number manually'); });
      } else {
        toast('Copy not available — please select the number manually');
      }
    });
  });

  document.getElementById('clearDraft').addEventListener('click', function () {
    clearDraft();
    form.reset();
    touched = {}; attempted = false;
    autoFilled = { tin: false };
    ctl('country').value = 'AE';
    fieldNames().forEach(clearState);
    summaryBox.hidden = true;
    document.getElementById('draftNotice').hidden = true;
    syncAll();
    renderPeppol('x');
    expiryWarn.hidden = true;
    toast('Form cleared');
  });

  document.getElementById('printBtn').addEventListener('click', function () { window.print(); });

  document.getElementById('downloadBtn').addEventListener('click', function () {
    if (!lastPayload) return;
    var blob = new Blob([JSON.stringify(lastPayload, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = lastPayload.reference + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  });

  document.getElementById('newBtn').addEventListener('click', function () { window.location.reload(); });

  /* =====================================================================
     INIT
     ===================================================================== */
  (function populateCountries() {
    var names;
    try { names = new Intl.DisplayNames(['en'], { type: 'region' }); } catch (e) { names = null; }
    var list = COUNTRY_CODES.map(function (c) {
      var n = c; try { n = names ? names.of(c) : c; } catch (e) { /* keep code */ }
      COUNTRY_NAMES[c] = n;
      return { code: c, name: n };
    }).sort(function (a, b) { return a.name.localeCompare(b.name); });
    var country = ctl('country'), passport = ctl('passport_country');
    list.forEach(function (c) {
      country.add(new Option(c.name, c.code));
      passport.add(new Option(c.name + ' (' + c.code + ')', c.code));
    });
    country.value = 'AE';
  })();

  // Give radio inputs ids so the error summary can link to them
  $$('input[type="radio"]', form).forEach(function (r) { if (!r.id) r.id = r.name + '-' + r.value; });

  var restored = loadDraft();
  syncAll();
  if (restored) {
    document.getElementById('draftNotice').hidden = false;
    fieldNames().forEach(function (n) { if (value(n)) { touched[n] = true; render(n); } });
    updateProgress();
  }
})();

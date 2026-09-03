// ─── Entry Point ─────────────────────────────────────────────────────────────

function doGet(e) {
  var meetingId = e && e.parameter && e.parameter.meeting;

  if (meetingId) {
    var file = _getMeetingFile(meetingId);
    var tpl = HtmlService.createTemplateFromFile(file);
    tpl.execUrl = ScriptApp.getService().getUrl();
    return tpl.evaluate()
      .setTitle('EPB Team Meeting')
      .setSandboxMode(HtmlService.SandboxMode.IFRAME)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }

  var tmpl = HtmlService.createTemplateFromFile('index');
  tmpl.isAdmin = _isAdminUser();
  tmpl.execUrl = ScriptApp.getService().getUrl();
  tmpl.teamCardData = PropertiesService.getScriptProperties().getProperty('TEAM_CARD_DATA') || '{}';
  tmpl.petCardData  = PropertiesService.getScriptProperties().getProperty('PET_CARD_DATA')  || '{}';
  tmpl.calendarData = getCalendarData();
  tmpl.tasksData    = getTasksData();
  return tmpl.evaluate()
    .setTitle('EPB Team Site')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}


// ─── Team Meetings ────────────────────────────────────────────────────────────

var MEETINGS = [
  {
    id: 'july-2026',
    title: 'July Team Meeting',
    date: 'July 2026',
    description: 'AMA on org announcement, dashboard presentations by Jonathan Hu & Jonathan Lum.',
    file: 'meeting-july-2026'
  },
  {
    id: 'june-2026',
    title: 'June Team Meeting',
    date: 'June 2026',
    description: 'Growth story, 4 strategic pillars, team wins, and 2027 targets.',
    file: 'meeting-june-2026'
  },
  {
    id: 'april-2026',
    title: 'April 2026 Team Meeting',
    date: 'April 2026',
    description: 'AI Innovation & 45-Minute Breakout Challenge',
    file: 'meeting-april-2026'
  }
];

function _getMeetingFile(meetingId) {
  if (!meetingId || meetingId === 'current') return MEETINGS[0].file;
  for (var i = 0; i < MEETINGS.length; i++) {
    if (MEETINGS[i].id === meetingId) return MEETINGS[i].file;
  }
  return MEETINGS[0].file;
}

function getMeetingsManifest() {
  return MEETINGS;
}

function saveNoteToSheet(section, noteText) {
  var props = PropertiesService.getUserProperties();
  var sheetId = props.getProperty('MEETING_NOTES_SHEET_ID');
  var doc, sheet;

  if (!sheetId) {
    doc = SpreadsheetApp.create('S&P Leadership Team - Meeting Notes & Actions');
    sheet = doc.getActiveSheet();
    sheet.appendRow(['Timestamp', 'Agenda Section', 'Action Item / Note']);
    sheet.getRange('A1:C1').setFontWeight('bold').setBackground('#4b286d').setFontColor('white');
    sheet.setColumnWidth(1, 150);
    sheet.setColumnWidth(2, 200);
    sheet.setColumnWidth(3, 500);
    props.setProperty('MEETING_NOTES_SHEET_ID', doc.getId());
  } else {
    try {
      doc = SpreadsheetApp.openById(sheetId);
      sheet = doc.getActiveSheet();
    } catch (ex) {
      doc = SpreadsheetApp.create('S&P Leadership Team - Meeting Notes & Actions');
      sheet = doc.getActiveSheet();
      sheet.appendRow(['Timestamp', 'Agenda Section', 'Action Item / Note']);
      sheet.getRange('A1:C1').setFontWeight('bold').setBackground('#4b286d').setFontColor('white');
      props.setProperty('MEETING_NOTES_SHEET_ID', doc.getId());
    }
  }

  sheet.appendRow([new Date(), section, noteText]);
  return doc.getUrl();
}


// ─── Team Site Input Form ─────────────────────────────────────────────────────
// Run this function once from the Apps Script editor to generate the Google Form.
// The edit URL and shareable respondent URL are logged to the Execution Log.

function createTeamInputForm() {
  var form = FormApp.create('EPB S&P Team — Tell Us About You (& Your Pet!)');

  form.setDescription(
    'Help us fill out the EPB Team Site! This form has two parts:\n\n' +
    '1. Your Baseball Card — a few fun facts that appear when teammates click your card on the roster.\n' +
    '2. Furry Friends (optional) — if you have a pet you\'d like featured on the site, we\'d love to include them!\n\n' +
    'Your answers will be added to the site by Derek. Thanks for playing along! ⚾'
  );

  form.setCollectEmail(true);
  form.setShowLinkToRespondAgain(false);
  form.setConfirmationMessage('Thanks! Your answers have been received and will be added to the EPB Team Site shortly.');

  // ── Section 1: Baseball Card ──────────────────────────────────────────────

  form.addSectionHeaderItem()
    .setTitle('⚾ Your Baseball Card')
    .setHelpText('These stats show up when teammates click your card on the Team Roster.');

  form.addTextItem()
    .setTitle('Your Name')
    .setHelpText('First and last name as it appears on your roster card (e.g., Derek Johnson).')
    .setRequired(true);

  form.addTextItem()
    .setTitle('Walk-Up Song')
    .setHelpText('The song that plays as you stride to the plate. (e.g., Minuet in G)')
    .setRequired(true);

  form.addTextItem()
    .setTitle('GOAT Vacation Spot')
    .setHelpText('Your greatest-of-all-time destination — visited or on the bucket list. (e.g., Laos)')
    .setRequired(true);

  form.addParagraphTextItem()
    .setTitle('Fun Fact')
    .setHelpText('Something surprising, obscure, or delightfully random about yourself. (e.g., 1993 Mosquito Provincial Champion)')
    .setRequired(true);

  form.addTextItem()
    .setTitle('Pre-Game Meal')
    .setHelpText('What do you eat before a big day? (e.g., Pizza)')
    .setRequired(true);

  form.addTextItem()
    .setTitle('Home Turf')
    .setHelpText('The city or neighbourhood you call home. (e.g., Vancouver BC)')
    .setRequired(true);

  form.addTextItem()
    .setTitle('Rookie Card Year')
    .setHelpText('The year you joined TELUS. (e.g., 2012)')
    .setRequired(true);

  // ── Section 2: Furry Friends (optional) ──────────────────────────────────

  form.addPageBreakItem()
    .setTitle('🐾 Furry Friends (Optional)')
    .setHelpText(
      'Got a pet? We\'d love to add them to the Furry Friends section of the team site!\n\n' +
      'Leave everything below blank if you\'d rather skip this part — no pressure.\n\n' +
      'For reference, here\'s how Ruff\'s profile reads:\n\n' +
      '"Ruff joined the EPB S&P team on September 8, 2025 and hasn\'t left Derek\'s side since. ' +
      'He specialises in morale-boosting zoomies, strategic napping, and unconditional positive regard. ' +
      'Currently negotiating for a treat allowance in the next budget cycle."'
    );

  form.addTextItem()
    .setTitle('Pet Name')
    .setHelpText('What\'s your pet\'s name? (e.g., Ruff)')
    .setRequired(false);

  form.addTextItem()
    .setTitle('Playful Title')
    .setHelpText('Give your pet a fun corporate-sounding job title. (e.g., Chief Barketing Officer)')
    .setRequired(false);

  form.addParagraphTextItem()
    .setTitle('Pet Bio')
    .setHelpText(
      'Write 2–3 sentences in the style of the Ruff example above — when they joined the team, ' +
      'what they "specialise" in, and a funny current status or ambition.'
    )
    .setRequired(false);

  form.addTextItem()
    .setTitle('Your Name (for the "Owner" field)')
    .setHelpText('Just your first name, so we can attribute the pet card correctly. (e.g., Derek)')
    .setRequired(false);

  // Photo upload requires Drive scope and can only be enabled on domain-restricted forms.
  // Instead, direct respondents to send the photo separately.
  form.addParagraphTextItem()
    .setTitle('Pet Photo')
    .setHelpText(
      'Google Forms doesn\'t support photo uploads here. ' +
      'Please send a clear photo of your pet directly to Derek via Teams or email after submitting this form.'
    )
    .setRequired(false);

  // Link responses to a new Sheet and store its ID for syncTeamData()
  var responseSheet = SpreadsheetApp.create('EPB Team Site — Input Form Responses');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, responseSheet.getId());
  PropertiesService.getScriptProperties().setProperty('FORM_RESPONSE_SHEET_ID', responseSheet.getId());

  Logger.log('Form created successfully.');
  Logger.log('Edit URL:       ' + form.getEditUrl());
  Logger.log('Respondent URL: ' + form.getPublishedUrl());
}


// ─── Sync Survey Responses → Team Card Data ───────────────────────────────────
// Run this function from the Apps Script editor after responses come in.
// It reads the Form response Sheet, builds a name-keyed lookup of baseball
// card stats, and stores it in Script Properties so doGet can inject it into
// the page. The site picks up the latest data on next load — no HTML editing.
//
// Expected response Sheet columns (auto-created by the Form):
//   A: Timestamp  B: Email  C: Your Name  D: Walk-Up Song  E: GOAT Vacation Spot
//   F: Fun Fact   G: Pre-Game Meal  H: Home Turf  I: Rookie Card Year

function syncTeamData() {
  var sheetId = PropertiesService.getScriptProperties().getProperty('FORM_RESPONSE_SHEET_ID');
  if (!sheetId) {
    Logger.log('ERROR: FORM_RESPONSE_SHEET_ID not set. Run createTeamInputForm() first.');
    return;
  }

  var ss    = SpreadsheetApp.openById(sheetId);
  var sheet = ss.getSheets()[0]; // Form responses always land on the first sheet
  var rows  = sheet.getDataRange().getValues();

  if (rows.length < 2) {
    Logger.log('No responses yet.');
    return;
  }

  // Normalise headers to find column positions by name (robust to column reordering)
  var headers = rows[0].map(function(h) { return String(h).trim().toLowerCase(); });
  function col(name) { return headers.indexOf(name); }

  var iName      = col('your name');
  var iSong      = col('walk-up song');
  var iGateway   = col('goat vacation spot');
  var iReport    = col('fun fact');
  var iMeal      = col('pre-game meal');
  var iTurf      = col('home turf');
  var iRookie    = col('rookie card year');
  var iPetName   = col('pet name');
  var iPetRole   = col('playful title');
  var iPetBio    = col('pet bio');
  var iPetOwner  = col('your name (for the "owner" field)');

  if (iName === -1) {
    Logger.log('ERROR: Could not find "Your Name" column. Check the response sheet headers.');
    return;
  }

  // Build maps keyed by normalised name → data.
  // If a person submitted multiple times, the latest row wins.
  var cardData = {};
  var petData  = {};

  for (var i = 1; i < rows.length; i++) {
    var row  = rows[i];
    var name = String(row[iName]).trim();
    if (!name) continue;

    cardData[name.toLowerCase()] = {
      name:    name,
      song:    iSong    >= 0 ? String(row[iSong]).trim()    : '',
      gateway: iGateway >= 0 ? String(row[iGateway]).trim() : '',
      report:  iReport  >= 0 ? String(row[iReport]).trim()  : '',
      meal:    iMeal    >= 0 ? String(row[iMeal]).trim()    : '',
      turf:    iTurf    >= 0 ? String(row[iTurf]).trim()    : '',
      rookie:  iRookie  >= 0 ? String(row[iRookie]).trim()  : ''
    };

    // Only capture pet data if the respondent named their pet
    var petName = iPetName >= 0 ? String(row[iPetName]).trim() : '';
    if (petName) {
      var ownerFirst = iPetOwner >= 0 ? String(row[iPetOwner]).trim() : name.split(' ')[0];
      petData[ownerFirst.toLowerCase()] = {
        petName: petName,
        role:    iPetRole >= 0 ? String(row[iPetRole]).trim() : '',
        bio:     iPetBio  >= 0 ? String(row[iPetBio]).trim()  : '',
        owner:   ownerFirst
      };
    }
  }

  var props = PropertiesService.getScriptProperties();
  props.setProperty('TEAM_CARD_DATA', JSON.stringify(cardData));
  props.setProperty('PET_CARD_DATA',  JSON.stringify(petData));

  Logger.log('Sync complete. ' + Object.keys(cardData).length + ' team member(s) updated:');
  Object.keys(cardData).forEach(function(k) { Logger.log('  • ' + cardData[k].name); });
  if (Object.keys(petData).length) {
    Logger.log(Object.keys(petData).length + ' pet(s) updated:');
    Object.keys(petData).forEach(function(k) { Logger.log('  • ' + petData[k].petName + ' (Owner: ' + petData[k].owner + ')'); });
  }
}


// ─── Calendar Data ────────────────────────────────────────────────────────────
// Merges events from Derek's Google Calendar (next 90 days) with rows from an
// optional CALENDAR_EVENTS_SHEET_ID Sheet (Date | Title | Type | Owner | Notes).
// Set CALENDAR_EVENTS_SHEET_ID in Script Properties to enable the Sheet source.

function getCalendarData() {
  var events = [];
  var now    = new Date();
  var end    = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  var tz     = Session.getScriptTimeZone();

  try {
    CalendarApp.getDefaultCalendar().getEvents(now, end).forEach(function(ev) {
      var start = ev.getStartTime();
      events.push({
        date:      Utilities.formatDate(start, tz, 'yyyy-MM-dd'),
        dateLabel: Utilities.formatDate(start, tz, 'MMM d'),
        title:     ev.getTitle(),
        type:      'meeting',
        owner:     '',
        notes:     ev.getDescription() || ''
      });
    });
  } catch (ex) {
    Logger.log('CalendarApp error: ' + ex);
  }

  var sheetId = PropertiesService.getScriptProperties().getProperty('CALENDAR_EVENTS_SHEET_ID');
  if (sheetId) {
    try {
      var rows = SpreadsheetApp.openById(sheetId).getSheets()[0].getDataRange().getValues();
      if (rows.length > 1) {
        var headers = rows[0].map(function(h) { return String(h).trim().toLowerCase(); });
        var iDate   = headers.indexOf('date');
        var iTitle  = headers.indexOf('title');
        var iType   = headers.indexOf('type');
        var iOwner  = headers.indexOf('owner');
        var iNotes  = headers.indexOf('notes');
        for (var i = 1; i < rows.length; i++) {
          var row = rows[i];
          var raw = iDate >= 0 ? row[iDate] : '';
          if (!raw) continue;
          var d = raw instanceof Date ? raw : new Date(raw);
          if (isNaN(d)) continue;
          events.push({
            date:      Utilities.formatDate(d, tz, 'yyyy-MM-dd'),
            dateLabel: Utilities.formatDate(d, tz, 'MMM d'),
            title:     iTitle >= 0 ? String(row[iTitle]).trim() : '',
            type:      iType  >= 0 ? String(row[iType]).trim().toLowerCase()  : 'event',
            owner:     iOwner >= 0 ? String(row[iOwner]).trim() : '',
            notes:     iNotes >= 0 ? String(row[iNotes]).trim() : ''
          });
        }
      }
    } catch (ex) {
      Logger.log('Events sheet error: ' + ex);
    }
  }

  events.sort(function(a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
  return JSON.stringify(events);
}


// ─── Tasks Data ───────────────────────────────────────────────────────────────
// Reads task rows from the TASKS_SHEET_ID Sheet.
// Expected columns: Task | Owner | Due Date | Priority | Status | Notes
// Set TASKS_SHEET_ID in Script Properties to enable.

function getTasksData() {
  var tasks   = [];
  var sheetId = PropertiesService.getScriptProperties().getProperty('TASKS_SHEET_ID');
  if (!sheetId) return JSON.stringify(tasks);
  var tz = Session.getScriptTimeZone();

  try {
    var rows = SpreadsheetApp.openById(sheetId).getSheets()[0].getDataRange().getValues();
    if (rows.length < 2) return JSON.stringify(tasks);

    var headers   = rows[0].map(function(h) { return String(h).trim().toLowerCase(); });
    var iTask     = headers.indexOf('task');
    var iOwner    = headers.indexOf('owner');
    var iDue      = headers.indexOf('due date');
    var iPriority = headers.indexOf('priority');
    var iStatus   = headers.indexOf('status');
    var iNotes    = headers.indexOf('notes');

    for (var i = 1; i < rows.length; i++) {
      var row  = rows[i];
      var task = iTask >= 0 ? String(row[iTask]).trim() : '';
      if (!task) continue;

      var dueStr = '';
      if (iDue >= 0 && row[iDue]) {
        var d = row[iDue] instanceof Date ? row[iDue] : new Date(row[iDue]);
        if (!isNaN(d)) dueStr = Utilities.formatDate(d, tz, 'yyyy-MM-dd');
      }

      tasks.push({
        task:     task,
        owner:    iOwner    >= 0 ? String(row[iOwner]).trim()                   : '',
        dueDate:  dueStr,
        priority: iPriority >= 0 ? String(row[iPriority]).trim().toLowerCase()  : '',
        status:   iStatus   >= 0 ? String(row[iStatus]).trim().toLowerCase()    : 'todo',
        notes:    iNotes    >= 0 ? String(row[iNotes]).trim()                   : ''
      });
    }
  } catch (ex) {
    Logger.log('Tasks sheet error: ' + ex);
  }

  return JSON.stringify(tasks);
}


// ─── Engagement Data ──────────────────────────────────────────────────────────
// Reads engagement survey data from the YTD 2026 tab of the engagement sheet.
// Returns an array of row objects with all core metrics, sub-metrics, and the
// three composite scores computed server-side.

var ENGAGEMENT_SHEET_ID = '1SScKVG1Zo-UdPWupq-vb4kE_WTu1P_8lMIu7WFYPsXU';

function getEngagementData() {
  // Serve from script cache when available (6-hour TTL) to avoid repeated
  // cross-spreadsheet API calls, which are the main source of load latency.
  var cache = CacheService.getScriptCache();
  try {
    var hit = cache.get('eng_ytd2026_v2');
    if (hit) return JSON.parse(hit);
  } catch (e) {}

  try {
    var ss    = SpreadsheetApp.openById(ENGAGEMENT_SHEET_ID);
    var sheet = ss.getSheetByName('YTD 2026');
    if (!sheet) return [];

    var values = sheet.getDataRange().getValues();
    if (values.length < 2) return [];

    var results = [];
    for (var i = 1; i < values.length; i++) {
      var r = values[i];
      var rawDate = r[0];
      if (!rawDate || String(rawDate).trim() === '-----') continue;

      var eng       = _engNum(r[1]);
      var part      = _engNum(r[2]);
      var eNPS      = _engNum(r[3]);
      var recog     = _engNum(r[4]);
      var ambass    = _engNum(r[5]);
      var feedback  = _engNum(r[6]);
      var relPeers  = _engNum(r[7]);
      var relMgr    = _engNum(r[8]);
      var satis     = _engNum(r[9]);
      var align     = _engNum(r[10]);
      var happy     = _engNum(r[11]);
      var wellness  = _engNum(r[12]);
      var growth    = _engNum(r[13]);
      // r[14] is the ----- separator column

      results.push({
        date:             _formatEngDate(rawDate),
        engagement:       eng,
        participation:    part,
        participantCount: _engNum(r[41]),  // optional count column (col AP); null if not present
        eNPS:             eNPS,
        recognition:  recog,
        ambassadorship: ambass,
        feedback:     feedback,
        relPeers:     relPeers,
        relManager:   relMgr,
        satisfaction: satis,
        alignment:    align,
        happiness:    happy,
        wellness:     wellness,
        personalGrowth: growth,
        // Composite scores
        expSatis:    _engAvg([recog, ambass, feedback, satis]),
        orgCulture:  _engAvg([relPeers, relMgr]),
        growthWell:  _engAvg([align, happy, wellness, growth]),
        // Sub-metrics
        sub: {
          recogQuality:    _engNum(r[15]),
          recogFrequency:  _engNum(r[16]),
          championing:     _engNum(r[17]),
          pride:           _engNum(r[18]),
          feedbackQuality: _engNum(r[19]),
          feedbackFreq:    _engNum(r[20]),
          feedbackSuggest: _engNum(r[21]),
          peerCollab:      _engNum(r[22]),
          peerTrust:       _engNum(r[23]),
          peerComm:        _engNum(r[24]),
          mgrCollab:       _engNum(r[25]),
          mgrTrust:        _engNum(r[26]),
          mgrComm:         _engNum(r[27]),
          satisFair:       _engNum(r[28]),
          satisRole:       _engNum(r[29]),
          satisEnv:        _engNum(r[30]),
          alignValues:     _engNum(r[31]),
          alignVision:     _engNum(r[32]),
          alignEthics:     _engNum(r[33]),
          happyWork:       _engNum(r[34]),
          happyWLB:        _engNum(r[35]),
          stress:          _engNum(r[36]),
          personalHealth:  _engNum(r[37]),
          autonomy:        _engNum(r[38]),
          mastery:         _engNum(r[39]),
          purpose:         _engNum(r[40])
        }
      });
    }
    try { cache.put('eng_ytd2026_v2', JSON.stringify(results), 21600); } catch (e) {}
    return results;
  } catch (ex) {
    Logger.log('getEngagementData error: ' + ex);
    return [];
  }
}

function _engNum(v) {
  var n = parseFloat(v);
  return isNaN(n) ? null : n;
}

function _engAvg(vals) {
  var nums = vals.filter(function(v) { return v !== null && !isNaN(v); });
  if (!nums.length) return null;
  var sum = nums.reduce(function(a, b) { return a + b; }, 0);
  return Math.round((sum / nums.length) * 10) / 10;
}

function _formatEngDate(raw) {
  if (raw instanceof Date) {
    return Utilities.formatDate(raw, 'America/Vancouver', 'yyyy-MM-dd');
  }
  return String(raw).trim();
}


// ─── Admin: Access Control ────────────────────────────────────────────────────
// Checks whether the current user is in the EPB Hub admin list.
// Used by doGet to gate the admin panel in the Team Site UI.

var EPB_HUB_SHEET_ID = '1OJpOFEwV0YaT1rUoygxXqypv5OwdDcBZX_q-_29Grug';

function _isAdminUser() {
  try {
    var email = Session.getActiveUser().getEmail().toLowerCase().trim();
    if (!email) return false;
    var ss    = SpreadsheetApp.openById(EPB_HUB_SHEET_ID);
    var sheet = ss.getSheetByName('Admin - Access');
    if (!sheet || sheet.getLastRow() < 1) return false;
    var col = sheet.getRange(1, 1, sheet.getLastRow(), 1).getValues();
    return col.some(function(r) {
      return String(r[0]).toLowerCase().trim() === email;
    });
  } catch (e) {
    return false;
  }
}


// ─── Admin: Access Requests ───────────────────────────────────────────────────
// These functions support the access-request panel in the Team Site UI,
// which lets team members request access to EPB Hub dashboards.

// Maps EPB Hub dashboard display names to the "Admin - Access" column keys.
// Must match exactly the same map in epb-hub/server/Auth.gs.
var ACCESS_COLUMN_MAP = {
  'ACIA REVENUE & MARGIN':          'ACIA REVENUE',
  'WLN REVENUE DETAIL':             'WIRELINE REVENUE',
  'WLN DIRECT MARGIN DETAIL':       'WIRELINE MARGIN',
  'WLN NET KPIS':                   'WLN NET KPIS',
  'IOT DETAIL':                     'IOT DETAILS',
  'CORE WIRELESS DETAIL':           'WLS DETAILS',
  'EBITDA CONTRIBUTION':            'EBITDA',
  'EPB EXECUTIVE DASHBOARD':        'EPB ON A PAGE',
  'WLS NETWORK REVENUE':            'WLS DETAILS',
  'WLS P&L SUMMARY':                'WLS DETAILS',
  'PORTING PERFORMANCE':            'EPB ON A PAGE',
  'WLS EQUIPMENT MARGIN':           'WLS DETAILS',
  'EPB PSO ONE PAGER':              'EPB ON A PAGE',
  'WLS/WLN ACQUISITION & RENEWALS': 'WLS DETAILS',
  'EPB PIPELINE':                   'WLS DETAILS',
  'FLASH WEEKLY REPORT':            'FLASH',
  'FLASH NEWSLETTER':               'FLASH ADMIN',
  'EPB STRATCHECK':                 'STRATCHECK',
  'GOQ WLS DASHBOARD':              'GOQ',
  'WLS/WLN CMRG PIPELINE':          'CMRG',
  'CMRG PIPELINE':                  'CMRG',
  'CROSS-SELL PERFORMANCE':         'CROSS SELL',
  'BUDGET':                         'BUDGET'
};

function getPendingAccessRequests() {
  if (!_isAdminUser()) return { error: 'NOT_ADMIN' };
  try {
    var ss    = SpreadsheetApp.openById(EPB_HUB_SHEET_ID);
    var sheet = ss.getSheetByName('Access Requests');
    if (!sheet || sheet.getLastRow() < 2) return { requests: [] };

    var rows    = sheet.getRange(2, 1, sheet.getLastRow() - 1, 8).getValues();
    var pending = [];
    rows.forEach(function(r, i) {
      if (String(r[4]).toLowerCase() === 'pending') {
        var reqAt = r[3] ? new Date(r[3]).toLocaleString('en-CA', {
          month: 'short', day: 'numeric', year: 'numeric',
          hour: '2-digit', minute: '2-digit'
        }) : '';
        pending.push({
          rowIndex:     i + 2,
          email:        String(r[0]).trim(),
          dashboard:    String(r[1]).trim(),
          accessColumn: String(r[2]).trim(),
          requestedAt:  reqAt
        });
      }
    });
    return { requests: pending };
  } catch (e) {
    return { error: String(e) };
  }
}

function approveAccessRequest(rowIndex, email, accessColumn) {
  Logger.log('approveAccessRequest called: rowIndex=%s email=%s accessColumn=%s', rowIndex, email, accessColumn);
  if (!_isAdminUser()) { Logger.log('NOT_ADMIN'); return { error: 'NOT_ADMIN' }; }

  // Privilege escalation check — column must be a known value in ACCESS_COLUMN_MAP
  var validColumns = Object.keys(ACCESS_COLUMN_MAP).map(function(k) {
    return ACCESS_COLUMN_MAP[k];
  });
  Logger.log('validColumns: %s', JSON.stringify(validColumns));
  if (validColumns.indexOf(accessColumn) === -1) { Logger.log('INVALID_COLUMN: %s', accessColumn); return { error: 'INVALID_COLUMN: ' + accessColumn }; }

  try {
    var ss           = SpreadsheetApp.openById(EPB_HUB_SHEET_ID);
    var accessSheet  = ss.getSheetByName('Admin - Access');
    var reqSheet     = ss.getSheetByName('Access Requests');
    var approverEmail = Session.getActiveUser().getEmail();

    if (!accessSheet) return { error: 'Admin - Access tab not found' };
    if (!reqSheet)    return { error: 'Access Requests tab not found' };

    // Find column index for accessColumn in Admin - Access header row
    var lastCol = accessSheet.getLastColumn();
    var headers = accessSheet.getRange(1, 1, 1, lastCol).getValues()[0];
    var colIdx  = -1;
    for (var h = 0; h < headers.length; h++) {
      if (String(headers[h]).trim().toUpperCase() === accessColumn.toUpperCase()) {
        colIdx = h;
        break;
      }
    }
    if (colIdx === -1) return { error: 'COLUMN_NOT_FOUND: ' + accessColumn };

    // Find existing row for this email or append after last row
    var lastRow   = accessSheet.getLastRow();
    var allEmails = lastRow > 1
      ? accessSheet.getRange(2, 1, lastRow - 1, 1).getValues()
      : [];
    var targetRow = -1;
    for (var e = 0; e < allEmails.length; e++) {
      if (String(allEmails[e][0]).toLowerCase().trim() === email.toLowerCase()) {
        targetRow = e + 2;
        break;
      }
    }
    if (targetRow === -1) targetRow = lastRow + 1;

    // Read display name from request row for webhook message
    var displayName = String(reqSheet.getRange(rowIndex, 2).getValue()).trim() || accessColumn;

    // Write email into admin access matrix
    accessSheet.getRange(targetRow, 1).setValue(email);
    accessSheet.getRange(targetRow, colIdx + 1).setValue(email);

    // Update request row: Status, Approved By, Approved At
    var now = new Date();
    reqSheet.getRange(rowIndex, 5).setValue('Approved');
    reqSheet.getRange(rowIndex, 6).setValue(approverEmail);
    reqSheet.getRange(rowIndex, 7).setValue(now);

    // Fire Google Chat webhook
    var webhookUrl = PropertiesService.getScriptProperties().getProperty('Dashboard_Bot');
    if (webhookUrl) {
      UrlFetchApp.fetch(webhookUrl, {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify({
          text: '✅ *EPB Hub Access Granted!*\n\n*User:* ' + email +
                '\n*Dashboard:* ' + displayName +
                '\n*Approved By:* ' + approverEmail +
                '\n*Time:* ' + now.toLocaleString() +
                '\n\n' + email + ' — please refresh EPB Hub to access your new dashboard.'
        })
      });
    }

    // Email requester
    try {
      GmailApp.sendEmail(
        email,
        'EPB Hub — Access Granted: ' + displayName,
        'Hi,\n\nYour access request for the ' + displayName + ' dashboard in EPB Hub has been approved.\n\n' +
        'You can now refresh EPB Hub and the dashboard will be available to you.\n\n' +
        'Approved by: ' + approverEmail + '\n\nEPB Hub Team'
      );
    } catch (mailErr) {
      Logger.log('sendEmail error: ' + mailErr.message);
    }

    return { success: true };
  } catch (e) {
    return { error: String(e) };
  }
}

function denyAccessRequest(rowIndex) {
  if (!_isAdminUser()) return { error: 'NOT_ADMIN' };
  try {
    var ss       = SpreadsheetApp.openById(EPB_HUB_SHEET_ID);
    var reqSheet = ss.getSheetByName('Access Requests');
    if (!reqSheet) return { error: 'Access Requests tab not found' };

    var rowData     = reqSheet.getRange(rowIndex, 1, 1, 3).getValues()[0];
    var email       = String(rowData[0]).trim();
    var displayName = String(rowData[1]).trim();
    var decliner    = Session.getActiveUser().getEmail();
    var now         = new Date();

    reqSheet.getRange(rowIndex, 5).setValue('Denied');
    reqSheet.getRange(rowIndex, 6).setValue(decliner);
    reqSheet.getRange(rowIndex, 7).setValue(now);

    // Fire Google Chat webhook
    var webhookUrl = PropertiesService.getScriptProperties().getProperty('Dashboard_Bot');
    if (webhookUrl) {
      UrlFetchApp.fetch(webhookUrl, {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify({
          text: '❌ *EPB Hub Access Request Declined*\n\n*User:* ' + email +
                '\n*Dashboard:* ' + displayName +
                '\n*Declined By:* ' + decliner +
                '\n*Time:* ' + now.toLocaleString()
        })
      });
    }

    // Email requester
    try {
      GmailApp.sendEmail(
        email,
        'EPB Hub — Access Request Declined: ' + displayName,
        'Hi,\n\nYour access request for the ' + displayName + ' dashboard in EPB Hub has been declined.\n\n' +
        'If you believe this is an error, please reach out to your manager.\n\nEPB Hub Team'
      );
    } catch (mailErr) {
      Logger.log('sendEmail error: ' + mailErr.message);
    }

    return { success: true };
  } catch (e) {
    return { error: String(e) };
  }
}

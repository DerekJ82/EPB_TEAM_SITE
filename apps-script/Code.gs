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
  return tmpl.evaluate()
    .setTitle('EPB Team Site')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
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
  'CROSS-SELL PERFORMANCE':         'CROSS SELL'
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

  // Link responses to a new Sheet
  form.setDestination(FormApp.DestinationType.SPREADSHEET,
    SpreadsheetApp.create('EPB Team Site — Input Form Responses').getId());

  Logger.log('Form created successfully.');
  Logger.log('Edit URL:       ' + form.getEditUrl());
  Logger.log('Respondent URL: ' + form.getPublishedUrl());
}

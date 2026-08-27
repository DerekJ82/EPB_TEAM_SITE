// ─── Source Sheet IDs ────────────────────────────────────────────────────────

var PSO_SHEET_ID     = '1wt1DgVwHxkDkTTFbJiFY6UQ_bEvs_sof_FNqDMl3pXA';
var CBR_SHEET_ID     = '1_Pv9gOxUesAmgMlyngyIFIzQFVtlJktaHMU36vAZg7g';
var QUERIES_SHEET_ID = '19ioEbx2qjS74CIuvg95aS0_BzeLokXWkCL8bgEeBSzw';
var EPB_HUB_SHEET_ID = '1OJpOFEwV0YaT1rUoygxXqypv5OwdDcBZX_q-_29Grug';

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


// ─── Dashboard Data ───────────────────────────────────────────────────────────

function getDashboardData() {
  return {
    pso:     _getPSOStatus(),
    cbr:     _getCBRStatus(),
    queries: _getQueriesStatus(),
    isAdmin: _isAdminUser(),
    asOf:    new Date().toISOString()
  };
}


// ─── PSO One Pager Pipeline ──────────────────────────────────────────────────

function _getPSOStatus() {
  try {
    var ss    = SpreadsheetApp.openById(PSO_SHEET_ID);
    var sheet = ss.getSheetByName('PIPELINE_STATUS');
    if (!sheet) return { error: 'PIPELINE_STATUS tab not found' };

    var data = sheet.getDataRange().getValues();
    if (data.length < 2) return { error: 'No pipeline data' };

    var headers = data[0].map(function(h) { return String(h).trim().toUpperCase(); });
    var iStage  = headers.indexOf('STAGE');
    var iName   = headers.indexOf('NAME');
    var iStatus = headers.indexOf('STATUS');
    var iNotes  = headers.indexOf('NOTES');

    var stages = [];
    var currentStage = 0;
    var stageName    = '';
    var overallStatus = 'COMPLETE';
    var blocker      = '';

    for (var i = 1; i < data.length; i++) {
      var row    = data[i];
      var stageN = iStage  >= 0 ? parseInt(row[iStage])         : i;
      var name   = iName   >= 0 ? String(row[iName]).trim()     : '';
      var status = iStatus >= 0 ? String(row[iStatus]).trim().toUpperCase() : '';
      var notes  = iNotes  >= 0 ? String(row[iNotes]).trim()    : '';

      stages.push({ stage: stageN, name: name, status: status, notes: notes });

      if (status === 'IN_PROGRESS' || status === 'WAITING') {
        if (currentStage === 0) {
          currentStage  = stageN;
          stageName     = name;
          overallStatus = status;
          blocker       = notes;
        }
      }
      if (status === 'FAILED') {
        overallStatus = 'FAILED';
        if (currentStage === 0) { currentStage = stageN; stageName = name; blocker = notes; }
      }
    }

    var total = stages.length;
    if (currentStage === 0 && total > 0) {
      var lastComplete = 0;
      stages.forEach(function(s) {
        if (s.status === 'COMPLETE') lastComplete = s.stage;
      });
      currentStage  = lastComplete;
      overallStatus = lastComplete === total ? 'COMPLETE' : 'NOT_STARTED';
    }

    return {
      currentStage:  currentStage,
      totalStages:   total,
      stageName:     stageName,
      status:        overallStatus,
      blocker:       blocker,
      pct:           total > 0 ? Math.round((currentStage / total) * 100) : 0,
      trackerUrl:    'https://script.google.com/a/macros/telus.com/s/AKfycbzQ3kGQP-P7n6Y_PgkF5rFzv7vCbfBbr0ZOt6Vd4dUkPv6A7LM/exec'
    };
  } catch (e) {
    return { error: String(e) };
  }
}


// ─── Consolidated Billed Revenue ─────────────────────────────────────────────

function _getCBRStatus() {
  try {
    var ss        = SpreadsheetApp.openById(CBR_SHEET_ID);
    var configTab = ss.getSheetByName('CONFIG');
    var statusTab = ss.getSheetByName('DATA_STATUS');
    if (!configTab || !statusTab) return { error: 'CONFIG or DATA_STATUS tab not found' };

    var configData    = configTab.getDataRange().getValues();
    var currentPeriod = '';
    for (var i = 0; i < configData.length; i++) {
      if (String(configData[i][0]).trim().toUpperCase() === 'CURRENT PERIOD') {
        currentPeriod = String(configData[i][1]).trim();
        break;
      }
    }

    var statusData = statusTab.getDataRange().getValues();
    var segments   = [];
    for (var j = 1; j < statusData.length; j++) {
      var seg    = String(statusData[j][0]).trim();
      var status = String(statusData[j][1]).trim().toUpperCase();
      if (seg) segments.push({ name: seg, status: status });
    }

    var completeCount = segments.filter(function(s) {
      return s.status === 'COMPLETE';
    }).length;

    var overallStatus = completeCount === segments.length
      ? 'COMPLETE'
      : completeCount === 0 ? 'PENDING' : 'IN_PROGRESS';

    return {
      currentPeriod: currentPeriod,
      segments:      segments,
      completeCount: completeCount,
      totalCount:    segments.length,
      status:        overallStatus,
      trackerUrl:    'https://script.google.com/a/macros/telus.com/s/AKfycbyUKFm8TBq7R5eN8F2P_placeholder/exec'
    };
  } catch (e) {
    return { error: String(e) };
  }
}


// ─── BR Queries Pipeline ─────────────────────────────────────────────────────

function _getQueriesStatus() {
  try {
    var ss        = SpreadsheetApp.openById(QUERIES_SHEET_ID);
    var configTab = ss.getSheetByName('CONFIG');
    if (!configTab) return { error: 'CONFIG tab not found' };

    var data          = configTab.getDataRange().getValues();
    var currentPeriod = '';
    var stage         = 0;
    var pipelineStatus = 'PENDING';
    var tables        = [];

    for (var i = 0; i < data.length; i++) {
      var key = String(data[i][0]).trim().toUpperCase();
      var val = String(data[i][1]).trim();
      if (key === 'CURRENT PERIOD')   currentPeriod  = val;
      if (key === 'STAGE')            stage          = parseInt(val) || 0;
      if (key === 'PIPELINE STATUS')  pipelineStatus = val.toUpperCase();
      if (key === 'TABLES') {
        for (var j = i + 1; j < data.length; j++) {
          var tName = String(data[j][0]).trim();
          var tPass = String(data[j][1]).trim().toUpperCase();
          if (!tName) break;
          tables.push({ name: tName, pass: tPass === 'PASS' || tPass === 'COMPLETE' || tPass === 'TRUE' });
        }
        break;
      }
    }

    var totalStages = 4;
    return {
      currentPeriod:  currentPeriod,
      stage:          stage,
      totalStages:    totalStages,
      pipelineStatus: pipelineStatus,
      tables:         tables,
      status:         pipelineStatus,
      trackerUrl:     'https://docs.google.com/spreadsheets/d/' + QUERIES_SHEET_ID
    };
  } catch (e) {
    return { error: String(e) };
  }
}


// ─── Admin: Access Control ────────────────────────────────────────────────────

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
    var webhookUrl = PropertiesService.getScriptProperties().getProperty('CHAT_WEBHOOK_URL');
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
    var webhookUrl = PropertiesService.getScriptProperties().getProperty('CHAT_WEBHOOK_URL');
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

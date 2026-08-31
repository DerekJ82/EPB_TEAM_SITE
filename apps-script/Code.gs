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
  tmpl.isAdmin = false;
  tmpl.execUrl = ScriptApp.getService().getUrl();
  tmpl.teamCardData = PropertiesService.getScriptProperties().getProperty('TEAM_CARD_DATA') || '{}';
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

  var iName    = col('your name');
  var iSong    = col('walk-up song');
  var iGateway = col('goat vacation spot');
  var iReport  = col('fun fact');
  var iMeal    = col('pre-game meal');
  var iTurf    = col('home turf');
  var iRookie  = col('rookie card year');

  if (iName === -1) {
    Logger.log('ERROR: Could not find "Your Name" column. Check the response sheet headers.');
    return;
  }

  // Build a map keyed by normalised full name → card data
  // If a person submitted multiple times, the latest row wins
  var cardData = {};
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
  }

  var json = JSON.stringify(cardData);
  PropertiesService.getScriptProperties().setProperty('TEAM_CARD_DATA', json);

  Logger.log('Sync complete. ' + Object.keys(cardData).length + ' team member(s) updated:');
  Object.keys(cardData).forEach(function(k) { Logger.log('  • ' + cardData[k].name); });
}

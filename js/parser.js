/* =========================================================
   parser.js — Semua fungsi parsing file
   ========================================================= */

// ================== KONVERSI TANGGAL EXCEL ==================
function excelSerialToDate(serial) {
  const n = parseFloat(serial);
  if (isNaN(n)) return null;
  const unixMs = (n - 25569) * 86400 * 1000;
  return new Date(unixMs);
}

function formatDate(d) {
  if (!d || isNaN(d.getTime())) return '';
  // Konversi ke WIB (UTC+7)
  const wib = new Date(d.getTime() + (7 * 60 * 60 * 1000));
  const dd   = String(wib.getUTCDate()).padStart(2, '0');
  const mm   = String(wib.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = wib.getUTCFullYear();
  const hh   = String(wib.getUTCHours()).padStart(2, '0');
  const mi   = String(wib.getUTCMinutes()).padStart(2, '0');
  const ss   = String(wib.getUTCSeconds()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}:${ss}`;
}

function normalisasiTanggal(val) {
  if (!val) return '';
  const s = String(val).trim().replace(/^"|"$/g, '');
  if (/^\d+(\.\d+)?$/.test(s)) {
    const n = parseFloat(s);
    if (n > 1 && n < 100000) {
      const d = excelSerialToDate(n);
      if (d && !isNaN(d.getTime())) return formatDate(d);
    }
  }
  return s;
}

// ================== PARSER TABLEDATA ==================
function parseAcuan(arrayBuffer) {
  const text = new TextDecoder('utf-8', { fatal: false }).decode(arrayBuffer);

  // 1. Coba HTML Table
  if (/<table[\s>]/i.test(text) || /<html[\s>]/i.test(text)) {
    const users = extractFromHTML(text);
    if (users.length > 0) return users;
  }

  // 2. Coba TAB-separated text (file Notepad format)
  if (text.includes('\t')) {
    const users = extractFromText(text);
    if (users.length > 0) return users;
  }

  // 3. Coba Excel asli (.xlsx)
  try {
    const data = new Uint8Array(arrayBuffer);
    const wb = XLSX.read(data, { type: 'array' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
    if (rows.length) {
      const keys = Object.keys(rows[0]);
      const kolUser = keys.find(k => k.toLowerCase().trim() === 'username');
      const kolDate = keys.find(k => k.toLowerCase().trim() === 'tanggal daftar');
      if (kolUser) {
        return rows.map(r => ({
          username: String(r[kolUser]).split('\n')[0].trim().toLowerCase(),
          registerDate: kolDate ? normalisasiTanggal(String(r[kolDate])) : '',
        })).filter(r => r.username);
      }
    }
  } catch (e) { /* lanjut */ }

  throw new Error('Format file TableData tidak dikenali.');
}

/** Parser HTML table (dari file .txt berisi tabel HTML) */
function extractFromHTML(html) {
  const result = [];
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const table = doc.querySelector('table');
    if (!table) return result;

    const rows = table.querySelectorAll('tr');
    if (!rows.length) return result;

    // Cari header
    let headerRow = null;
    let headerCells = [];
    for (const tr of rows) {
      const cells = tr.querySelectorAll('th, td');
      const texts = Array.from(cells).map(c => c.textContent.trim().toLowerCase());
      if (texts.includes('username') && texts.some(t => t.includes('tanggal daftar'))) {
        headerRow = tr;
        headerCells = texts;
        break;
      }
    }
    if (!headerRow) return result;

    const idxUser = headerCells.indexOf('username');
    const idxDate = headerCells.findIndex(h => h.includes('tanggal daftar'));
    if (idxUser === -1) return result;

    const allRows = Array.from(rows);
    const startIdx = allRows.indexOf(headerRow) + 1;

    for (let i = startIdx; i < allRows.length; i++) {
      const cells = allRows[i].querySelectorAll('td');
      if (cells.length <= Math.max(idxUser, idxDate)) continue;

      let username = cells[idxUser]?.textContent.trim() || '';
      username = username.split('\n')[0].trim();
      if (!username) continue;
      if (/^\d+$/.test(username)) continue;
      if (username.toLowerCase() === 'username') continue;

      let registerDate = '';
      if (idxDate !== -1 && cells[idxDate]) {
        registerDate = cells[idxDate].textContent.trim();
        registerDate = normalisasiTanggal(registerDate);
      }

      result.push({
        username: username.toLowerCase(),
        registerDate: registerDate,
      });
    }
  } catch (e) {
    console.error('extractFromHTML error:', e);
  }
  return result;
}

/** Parser TAB-separated text (format Notepad) */
function extractFromText(text) {
  const result = [];
  const lines = text.split(/\r?\n/);

  // Cari baris header (yang mengandung "Tanggal Daftar")
  let headerLineIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('"Tanggal Daftar"') || lines[i].includes('Tanggal Daftar')) {
      headerLineIdx = i;
      break;
    }
  }
  if (headerLineIdx === -1) return result;

  const headerCols = lines[headerLineIdx].split('\t').map(c => c.trim().replace(/^"|"$/g, ''));
  const idxUser = headerCols.findIndex(h => h.toLowerCase() === 'username');
  const idxDate = headerCols.findIndex(h => h.toLowerCase() === 'tanggal daftar');
  if (idxUser === -1) return result;

  const dataLines = lines.slice(headerLineIdx + 1);
  const blob = dataLines.join('\n');

  const recordRegex = /(?=^"\d+"\t)/gm;
  const records = blob.split(recordRegex).filter(r => r.trim());

  for (const rec of records) {
    const cols = rec.split('\t');
    if (cols.length <= Math.max(idxUser, idxDate)) continue;

    let username = cols[idxUser].trim().replace(/^"|"$/g, '');
    username = username.split('\n')[0].trim();
    if (!username) continue;
    if (/^\d+$/.test(username)) continue;
    if (username.toLowerCase() === 'username') continue;

    let registerDate = '';
    if (idxDate !== -1 && cols.length > idxDate) {
      registerDate = cols[idxDate].trim().replace(/^"|"$/g, '').trim();
      registerDate = normalisasiTanggal(registerDate);
    }

    result.push({
      username: username.toLowerCase(),
      registerDate: registerDate,
    });
  }

  return result;
}

// ================== PARSER DEPOSIT CSV ==================
function parseDeposit(text) {
  text = text.replace(/^\uFEFF/, '');
  const lines = text.split(/\r?\n/);
  let startIdx = 0;
  if (lines[0] && lines[0].toLowerCase().startsWith('sep=')) startIdx = 1;

  const csvText = lines.slice(startIdx).join('\n');
  const rows = parseCSV(csvText);
  if (!rows.length) return [];

  const header = rows[0].map(h => h.trim());
  const data = [];
  for (let i = 1; i < rows.length; i++) {
    const obj = {};
    header.forEach((h, idx) => obj[h] = rows[i][idx] ?? '');
    data.push(obj);
  }
  return data;
}

function parseCSV(text) {
  const rows = [];
  let cur = [], field = '', inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuote) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuote = false;
      } else field += ch;
    } else {
      if (ch === '"') inQuote = true;
      else if (ch === ',') { cur.push(field); field = ''; }
      else if (ch === '\n' || ch === '\r') {
        if (field !== '' || cur.length) {
          cur.push(field); field = '';
          rows.push(cur); cur = [];
        }
        if (ch === '\r' && text[i + 1] === '\n') i++;
      } else field += ch;
    }
  }
  if (field !== '' || cur.length) { cur.push(field); rows.push(cur); }
  return rows;
}

// Ekspor ke global window
window.Parser = {
  parseAcuan,
  parseDeposit,
  normalisasiTanggal,
};
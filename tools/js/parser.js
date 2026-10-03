/* =========================================================
   parser.js — Parser untuk Audit NDP
   ========================================================= */
function parseAcuan(text) {
  const rows = parseCSV(text);
  if (!rows.length) return [];

  const headers = rows[0].map(h => h.trim().toLowerCase());
  const idxUser = headers.findIndex(h => h.includes('username') || h.includes('user id') || h === 'user');
  const idxDate = headers.findIndex(h => h.includes('register') || h.includes('date') || h.includes('tanggal') || h.includes('daftar'));

  if (idxUser === -1) throw new Error('Kolom username tidak ditemukan');

  return rows.slice(1)
    .filter(r => r[idxUser] && r[idxUser].trim())
    .map(r => ({
      username: String(r[idxUser] || '').trim().toLowerCase(),
      registerDate: idxDate >= 0 ? String(r[idxDate] || '').trim() : ''
    }));
}

function parseDeposit(text) {
  const rows = parseCSV(text);
  if (!rows.length) return [];

  const headers = rows[0].map(h => h.trim());
  return rows.slice(1)
    .filter(r => r.some(c => c && c.trim()))
    .map(r => {
      const obj = {};
      headers.forEach((h, i) => obj[h] = r[i] || '');
      return obj;
    });
}

function parseCSV(text) {
  if (text.startsWith('sep=')) {
    text = text.substring(text.indexOf('\n') + 1);
  }

  const rows = [];
  let current = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') { field += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { field += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { current.push(field); field = ''; }
      else if (ch === '\n') {
        current.push(field);
        rows.push(current);
        current = [];
        field = '';
      } else if (ch === '\r') { /* skip */ }
      else { field += ch; }
    }
  }
  if (field || current.length) {
    current.push(field);
    rows.push(current);
  }
  return rows;
}

window.Parser = { parseAcuan, parseDeposit, parseCSV };
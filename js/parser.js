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
      username: Processor.bersihkanUsername(r[idxUser]),   
      registerDate: idxDate >= 0 ? String(r[idxDate] || '').trim() : ''
    }));
}

function parseDeposit(text) {
  const rows = parseCSV(text);
  if (!rows.length) return [];

  // Normalisasi header: lowercase, buang spasi/underscore
  const headers = rows[0].map(h =>
    String(h).trim().toLowerCase().replace(/[\s_]+/g, '')
  );

  return rows.slice(1)
    .filter(r => r.some(c => c && c.trim()))
    .map(r => {
      const obj = {};
      headers.forEach((h, i) => obj[h] = r[i] || '');
      return obj;
    });
}

function parseCSV(text) {
  text = text.replace(/^\uFEFF/, '');

  text = text.split('\n')
    .filter(line => !line.trim().startsWith('sep='))
    .join('\n');

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
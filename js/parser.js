/* =========================================================
   parser.js — Parser untuk Audit NDP (Versi Perbaikan Tanggal)
   ========================================================= */
function parseAcuan(text) {
  const rows = parseCSV(text);
  if (!rows.length) return [];

  // Cari header
  const headers = rows[0].map(h => String(h).replace(/"/g, '').trim().toLowerCase());
  const idxUser = headers.findIndex(h => h.includes('username') || h.includes('user id') || h === 'user');
  const idxDate = headers.findIndex(h => h.includes('register') || h.includes('date') || h.includes('tanggal') || h.includes('daftar'));

  if (idxUser === -1) throw new Error('Kolom username tidak ditemukan');

  return rows.slice(1)
    .filter(r => r[idxUser] && r[idxUser].trim())
    .map(r => {
      let usernameMentah = String(r[idxUser] || '');
      let tglMentah = idxDate >= 0 ? String(r[idxDate] || '').trim() : '';
      
      // 1. Bersihkan Username (Ambil baris pertama saja)
      let usernameBersih = usernameMentah.split('\n')[0].replace(/"/g, '').trim();

      // 2. Ekstrak Tanggal & Waktu menggunakan Regex
      let tglRapi = tglMentah;
      // Mencari pola: DD/MM/YYYY atau MM/DD/YYYY diikuti spasi dan Jam:Menit:Detik
      const matchDate = tglMentah.match(/(\d{1,2}\/\d{1,2}\/\d{4})\s+(\d{1,2}:\d{2}(?::\d{2})?)/);
      
      if (matchDate) {
        // Jika ketemu, gabungkan tanggal dan jamnya
        tglRapi = `${matchDate[1]} ${matchDate[2]}`;
        
        // Opsional: Ubah format ke DD/MM/YYYY HH:mm:ss
        // (Karena format file Anda MM/DD/YYYY, kita biarkan apa adanya agar tidak salah baca)
      } else {
        // Jika tidak ada jam (hanya tanggal), biarkan saja
        tglRapi = tglMentah.replace(/"/g, '').split('\n')[0].trim();
      }

      return {
        username: Processor.bersihkanUsername(usernameBersih),   
        registerDate: tglRapi
      };
    });
}

function parseDeposit(text) {
  const rows = parseCSV(text);
  if (!rows.length) return [];

  const headers = rows[0].map(h =>
    String(h).replace(/"/g, '').trim().toLowerCase().replace(/[\s_]+/g, '')
  );

  return rows.slice(1)
    .filter(r => r.some(c => c && c.trim()))
    .map(r => {
      const obj = {};
      headers.forEach((h, i) => obj[h] = (r[i] || '').replace(/"/g, '').trim());
      return obj;
    });
}

// Fungsi parseCSV yang lebih pintar (Tidak memotong baris baru di dalam sel)
function parseCSV(text) {
  text = text.replace(/^\uFEFF/, '');

  // Hapus baris "sep=;"
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
      else { field += ch; } // Biarkan enter (\n) masuk ke dalam field
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { current.push(field); field = ''; }
      else if (ch === '\n' || ch === '\r') {
        // Abaikan baris kosong
        if (field.trim() || current.length > 0) {
          current.push(field);
          rows.push(current);
        }
        current = [];
        field = '';
        if (ch === '\r' && next === '\n') i++; // Skip \r\n
      } 
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

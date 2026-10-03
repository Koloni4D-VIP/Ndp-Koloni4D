/* =========================================================
   processor.js — Helper & logika bisnis audit
   ========================================================= */

function bersihkanUsername(s) {
  if (!s) return '';
  let baris1 = String(s).split('\n')[0].trim();
  if (baris1.includes('Submitted By')) {
    baris1 = baris1.split('Submitted By')[0].trim();
  }
  return baris1.toLowerCase();
}

function klasifikasiToBank(tobank) {
  if (!tobank) return null;
  const t = String(tobank).toUpperCase();
  if (t.includes('QRIS HOKI')) return 'QRIS_HOKI';
  if (t.includes('SCB') && t.includes('SPESIAL COSTUMER BONUS')) return 'SCB';
  return null;
}

function parseTotal(val) {
  if (!val) return 0;
  const n = parseFloat(String(val).replace(/,/g, '').trim());
  return isNaN(n) ? 0 : n;
}

/**
 * Proses audit: gabungkan data user acuan dengan data deposit.
 * @param {Array} acuanUsers   - [{username, registerDate}]
 * @param {Array} depositRows  - [{UserName, ToBank, Total, ...}]
 * @returns {Array} hasilFinal - [{no, registerDate, username, depo, freebet}]
 */
function prosesAudit(acuanUsers, depositRows) {
  const mapDepo = new Map();
  const mapFreebet = new Map();

  depositRows.forEach((row) => {
    const user = bersihkanUsername(
      row['UserName'] || row['Username'] || row['username'] || ''
    );
    if (!user) return;

    const kat = klasifikasiToBank(row['ToBank'] || row['tobank'] || '');
    if (!kat) return;

    const nominal = parseTotal(row['Total'] || row['total'] || 0);

    if (kat === 'QRIS_HOKI') {
      mapDepo.set(user, (mapDepo.get(user) || 0) + nominal);
    } else if (kat === 'SCB') {
      mapFreebet.set(user, (mapFreebet.get(user) || 0) + nominal);
    }
  });

  return acuanUsers.map((u, i) => ({
    no: i + 1,
    registerDate: u.registerDate,
    username: u.username,
    depo: mapDepo.get(u.username) || 0,
    freebet: mapFreebet.get(u.username) || 0,
  }));
}

/**
 * Hitung ringkasan dari hasilFinal.
 */
function hitungRingkasan(hasilFinal) {
  const totalDepo    = hasilFinal.reduce((a, b) => a + b.depo, 0);
  const totalFreebet = hasilFinal.reduce((a, b) => a + b.freebet, 0);
  const depoCount    = hasilFinal.filter(r => r.depo > 0).length;
  const freebetCount = hasilFinal.filter(r => r.freebet > 0).length;
  return { totalDepo, totalFreebet, depoCount, freebetCount };
}

/**
 * Format TSV untuk copy ke clipboard (Google Sheets / Excel).
 */
function buildTSV(hasilFinal) {
  const header = ['NO', 'Register Date', 'USER ID', 'DEPO', 'FREEBET'];
  const lines = [header.join('\t')];

  hasilFinal.forEach(r => {
    lines.push([
      r.no,
      r.registerDate || '',
      r.username,
      r.depo,
      r.freebet,
    ].join('\t'));
  });

  // Ringkasan di bawah
  const { totalDepo, totalFreebet, depoCount, freebetCount } = hitungRingkasan(hasilFinal);
  lines.push('');
  lines.push(['Keterangan', 'Nilai'].join('\t'));
  lines.push(['Total User ID', hasilFinal.length].join('\t'));
  lines.push(['User Punya DEPO (QRIS HOKI)', depoCount].join('\t'));
  lines.push(['Total DEPO', totalDepo].join('\t'));
  lines.push(['User Punya FREEBET (SCB)', freebetCount].join('\t'));
  lines.push(['Total FREEBET', totalFreebet].join('\t'));

  return lines.join('\n');
}

window.Processor = {
  bersihkanUsername,
  klasifikasiToBank,
  parseTotal,
  prosesAudit,
  hitungRingkasan,
  buildTSV,
};
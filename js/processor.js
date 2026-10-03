/* =========================================================
   processor.js — Logika bisnis Audit + SCB Filter
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

/* ---------- AUDIT NDP ---------- */
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

function hitungRingkasan(hasilFinal) {
  const totalDepo    = hasilFinal.reduce((a, b) => a + b.depo, 0);
  const totalFreebet = hasilFinal.reduce((a, b) => a + b.freebet, 0);
  const depoCount    = hasilFinal.filter(r => r.depo > 0).length;
  const freebetCount = hasilFinal.filter(r => r.freebet > 0).length;
  return { totalDepo, totalFreebet, depoCount, freebetCount };
}

/* ---------- SCB FILTER ---------- */
function normalizeRemark(remark) {
  // Kalau kosong / null → LAINNYA
  if (!remark) return 'LAINNYA';

  const r = String(remark).toLowerCase().trim();

  // ---- Normalisasi huruf ----
  // Buang spasi & karakter selain huruf/angka
  const compact = r.replace(/[^a-z0-9]/g, '');

  // ---- Deteksi LUCKY SPIN ----
  // Syarat: ada "spin" (toleran typo) DAN ada huruf L,U,C,K,Y
  const hasSpin = /sp[ilny]{1,2}n?/i.test(compact);
  const luckyChars = ['l', 'u', 'c', 'k', 'y'];
  const hasAllLucky = luckyChars.every(ch => compact.includes(ch));

  if (hasSpin && hasAllLucky) return 'LUCKY SPIN';

  // Singkatan "LS" saja
  if (/^ls$/.test(compact)) return 'LUCKY SPIN';

  // ---- Deteksi FREEBET ----
  // Syarat: ada "free" (atau varian) DAN ada "bet"
  const hasFree = /fr[e3]{1,2}/i.test(compact) || /^free?/i.test(compact);
  const hasBet  = /b[e3]t/i.test(compact);

  if (hasFree && hasBet) return 'FREEBET';

  // Fallback FREEBET lain
  if (/^free?be?t?$/i.test(compact)) return 'FREEBET';
  if (/frebet/i.test(compact)) return 'FREEBET';
  if (/newbe?e?r?/i.test(compact)) return 'FREEBET';   // new member, newbie, newbee
  if (/new\s*member/i.test(r)) return 'FREEBET';        // "new member" (pakai spasi)

  // ---- LAINNYA ----
  // Kalau tidak cocok pattern apapun → LAINNYA
  // INI PENTING: tidak boleh di-return null, harus tetap "LAINNYA"
  return 'LAINNYA';
}

function prosesSCB(rows) {
  const map = new Map();

  rows.forEach(row => {
    const toBank = String(row['ToBank'] || '').toUpperCase();
    if (!toBank.includes('SCB') || !toBank.includes('SPESIAL COSTUMER BONUS')) return;

    const user = bersihkanUsername(row['UserName'] || row['Username'] || row['username'] || '');
    if (!user) return;

    const nominal = parseTotal(row['Total'] || row['total'] || 0);
    const remark = normalizeRemark(row['Remark'] || row['remark'] || '');

    if (map.has(user)) {
      const item = map.get(user);
      item.total += nominal;
      if (item.remark !== remark) {
        if (item.remark === 'LAINNYA') item.remark = remark;
        else if (remark !== 'LAINNYA') item.remark = item.remark + ' / ' + remark;
      }
    } else {
      map.set(user, { username: user, total: nominal, remark });
    }
  });

  return Array.from(map.values())
    .sort((a, b) => a.username.localeCompare(b.username))
    .map((item, i) => ({ no: i + 1, ...item }));
}

/* ---------- WITHDRAW QRIS ---------- */
const ADM_DEFAULT = -1600;   // 👈 ubah di sini kalau nilai adm berubah

function prosesWd(rows) {
  const hasil = rows.map(row => {
    const user = bersihkanUsername(row['UserName'] || row['Username'] || row['username'] || '');
    if (!user) return null;

    // Gabungkan ToBank jadi 1 baris (buang newline, multiple space)
    const toBankRaw = String(row['ToBank'] || row['tobank'] || '');
    const toBank = toBankRaw.split('\n').map(s => s.trim()).filter(Boolean).join(' ');

    // Total dengan minus di depan
    const total = -Math.abs(parseTotal(row['Total'] || row['total'] || 0));

    return {
      username: user,
      toBank: toBank,
      total: total,
      adm: ADM_DEFAULT
    };
  }).filter(Boolean);

  // Balik urutan
  hasil.reverse();

  // Nomor urut ulang
  return hasil.map((item, i) => ({ no: i + 1, ...item }));
}

window.Processor = {
  bersihkanUsername,
  klasifikasiToBank,
  parseTotal,
  prosesAudit,
  hitungRingkasan,
  normalizeRemark,
  prosesSCB,
  prosesWd,          
};

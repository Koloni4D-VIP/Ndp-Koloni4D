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
    const status = String(row['status'] || row['Status'] || '').toUpperCase();
    if (!status.includes('APPROVED')) return;

    const user = bersihkanUsername(
      row['username'] || row['userid'] || row['user'] || ''
    );
    if (!user) return;

    const kat = klasifikasiToBank(row['tobank'] || row['bank'] || '');
    if (!kat) return;

    const nominal = parseTotal(row['total'] || row['nominal'] || 0);

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
  if (!remark) return 'LAINNYA';

  const r = String(remark).toLowerCase().trim();

  const compact = r.replace(/[^a-z0-9]/g, '');

  const hasSpin = /sp[ilny]{1,2}n?/i.test(compact);
  const luckyChars = ['l', 'u', 'c', 'k', 'y'];
  const hasAllLucky = luckyChars.every(ch => compact.includes(ch));

  if (hasSpin && hasAllLucky) return 'LUCKY SPIN';

  if (/^ls$/.test(compact)) return 'LUCKY SPIN';

  const hasFree = /fr[e3]{1,2}/i.test(compact) || /^free?/i.test(compact);
  const hasBet  = /b[e3]t/i.test(compact);

  if (hasFree && hasBet) return 'FREEBET';

  if (/^free?be?t?$/i.test(compact)) return 'FREEBET';
  if (/frebet/i.test(compact)) return 'FREEBET';
  if (/newbe?e?r?/i.test(compact)) return 'FREEBET';  
  if (/new\s*member/i.test(r)) return 'FREEBET';     

  return 'LAINNYA';
}

function prosesSCB(rows) {
  const map = new Map();

  rows.forEach(row => {
    const status = String(row['Status'] || row['status'] || '').toUpperCase();
    if (!status.includes('APPROVED')) return;
    
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
const ADM_DEFAULT = -1600;   

function prosesWd(rows) {
  const hasil = rows.map(row => {
    // ✅ Filter status DIHAPUS — semua baris langsung diproses

    const user = bersihkanUsername(row['UserName'] || row['Username'] || row['username'] || '');
    if (!user) return null;

    const toBankRaw = String(row['ToBank'] || row['tobank'] || '');
    const toBank = toBankRaw.split('\n').map(s => s.trim()).filter(Boolean).join(' ');

    const total = -Math.abs(parseTotal(row['Total'] || row['total'] || 0));

    return {
      username: user,
      toBank: toBank,
      total: total,
      adm: ADM_DEFAULT
    };
  }).filter(Boolean);

  hasil.reverse();

  return hasil.map((item, i) => ({ no: i + 1, ...item }));
}

/* ---------- QRIS HOKI FILTER ---------- */
function prosesQris(rows) {
  const hasil = [];

  rows.forEach(row => {

    const toBankRaw = String(row['ToBank'] || row['tobank'] || '');
    const toBank = toBankRaw.toUpperCase().replace(/\s+/g, ' ').trim();
    if (!toBank.includes('QRIS HOKI')) return;

    const user = bersihkanUsername(
      row['UserName'] || row['Username'] || row['username'] || ''
    );
    if (!user) return;

    const nominal = parseTotal(row['Total'] || row['total'] || 0);

    hasil.push({ username: user, total: nominal });
  });


  return hasil.map((item, i) => ({ no: i + 1, ...item }));
}

/* ---------- SCB DETECTION ---------- */
function prosesScd(rows) {
  const userMap = new Map(); 
  let totalNominalAll = 0;   
  let scbRowCount = 0;       

  rows.forEach(row => {
    const status = String(row['Status'] || row['status'] || '').toUpperCase();
    if (!status.includes('APPROVED')) return;  

    const user = bersihkanUsername(
      row['username'] || row['UserName'] || row['Username'] || '');

    if (!user) return;

    const toBank = String(row['tobank'] || row['ToBank'] || '').toUpperCase();
    const nominal = parseTotal(row['total'] || row['Total'] || 0);

    const isScb = toBank.includes('SCB');

    totalNominalAll += nominal;

    if (!userMap.has(user)) {
      userMap.set(user, {
        username: user,
        total: 0,
        scbCount: 0,       
        transaksi: []     
      });
    }
    const item = userMap.get(user);
    item.total += nominal;

    if (isScb) {
      item.scbCount++;
      scbRowCount++;
      item.transaksi.push({ nominal, toBank: toBank.split('\n')[0].trim() });
    }
  });

  const allUsers   = userMap.size;
  const sudahScbArr = Array.from(userMap.values()).filter(u => u.scbCount > 0);
  const belumScbArr = Array.from(userMap.values()).filter(u => u.scbCount === 0);
  const doubleScbArr = Array.from(userMap.values()).filter(u => u.scbCount >= 2);

  window._scdData = {
    all: Array.from(userMap.values()),
    belumScb: belumScbArr,
    sudahScb: sudahScbArr,
    doubleScb: doubleScbArr,
  };

  window._scdStats = {
    totalUser: allUsers,
    belumScb: belumScbArr.length,
    sudahScb: scbRowCount,          
    sudahScbUser: sudahScbArr.length, 
    doubleScb: doubleScbArr.length,   
    totalNominal: totalNominalAll,    
  };

  return belumScbArr
    .sort((a, b) => b.total - a.total)
    .map((item, i) => ({ no: i + 1, username: item.username, total: item.total }));
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
  prosesQris, 
  prosesScd,        
};

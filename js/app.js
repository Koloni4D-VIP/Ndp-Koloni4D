const themeToggle = document.getElementById('themeToggle');
const savedTheme = localStorage.getItem('theme') || 'light';

if (savedTheme === 'dark') {
  document.body.classList.add('dark');
  if (themeToggle) themeToggle.textContent = '☀️';
}

themeToggle?.addEventListener('click', () => {
  document.body.classList.toggle('dark');
  const isDark = document.body.classList.contains('dark');
  themeToggle.textContent = isDark ? '☀️' : '🌙';
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
});

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    const page = item.dataset.page;
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    item.classList.add('active');
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const target = document.getElementById('page-' + page);
    if (target) target.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});

const sidebar = document.getElementById('sidebar');
const collapseBtn = document.getElementById('collapseBtn');
collapseBtn?.addEventListener('click', () => {
  sidebar.classList.toggle('collapsed');
  collapseBtn.textContent = sidebar.classList.contains('collapsed') ? '⇥' : '⇤';
  localStorage.setItem('sidebar_collapsed', sidebar.classList.contains('collapsed'));
});
if (localStorage.getItem('sidebar_collapsed') === 'true') {
  sidebar.classList.add('collapsed');
  if (collapseBtn) collapseBtn.textContent = '⇥';
}

let acuanUsers = [];
let depositRows = [];
let hasilFinal = [];

const fileAcuan    = document.getElementById('fileAcuan');
const fileDeposit  = document.getElementById('fileDeposit');
const boxAcuan     = document.getElementById('boxAcuan');
const boxDeposit   = document.getElementById('boxDeposit');
const nameAcuan    = document.getElementById('nameAcuan');
const nameDeposit  = document.getElementById('nameDeposit');
const infoAcuan    = document.getElementById('infoAcuan');
const infoDeposit  = document.getElementById('infoDeposit');
const btnProses    = document.getElementById('btnProses');
const btnReset     = document.getElementById('btnReset');
const btnDownload  = document.getElementById('btnDownload');
const btnCopy      = document.getElementById('btnCopy');
const hasilSection = document.getElementById('hasilSection');
const statusMsg    = document.getElementById('statusMsg');

function setStatus(msg, type = 'info') {
  statusMsg.textContent = msg;
  statusMsg.className = 'status-msg show ' + type;
}

function cekSiapProses() {
  const siap = acuanUsers.length > 0 && depositRows.length > 0;
  btnProses.disabled = !siap;
  btnReset.disabled  = !(acuanUsers.length || depositRows.length);
}

fileAcuan.addEventListener('change', (e) => {
  const f = e.target.files[0];
  if (!f) return;

  nameAcuan.textContent = '⏳ Membaca...';
  boxAcuan.classList.remove('error', 'filled');
  infoAcuan.textContent = '';
  setStatus('⏳ Membaca file TableData...', 'info');

  const reader = new FileReader();
  reader.onload = (evt) => {
    try {
      let text = '';
      if (typeof evt.target.result === 'string') {
        text = evt.target.result;
      } else {
        const data = new Uint8Array(evt.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        text = XLSX.utils.sheet_to_csv(sheet);
      }
      acuanUsers = Parser.parseAcuan(text);
      nameAcuan.textContent = '✅ ' + f.name;
      boxAcuan.classList.add('filled');
      infoAcuan.textContent = `${acuanUsers.length} user terbaca`;
      setStatus(`✅ TableData OK — ${acuanUsers.length} user`, 'success');
      cekSiapProses();
    } catch (err) {
      nameAcuan.textContent = '❌ ' + f.name;
      boxAcuan.classList.add('error');
      infoAcuan.textContent = err.message;
      setStatus('❌ Gagal: ' + err.message, 'error');
      acuanUsers = [];
      cekSiapProses();
    }
  };
  if (/\.(xlsx|xls)$/i.test(f.name)) reader.readAsArrayBuffer(f);
  else reader.readAsText(f, 'UTF-8');
});

fileDeposit.addEventListener('change', (e) => {
  const f = e.target.files[0];
  if (!f) return;

  nameDeposit.textContent = '⏳ Membaca...';
  boxDeposit.classList.remove('error', 'filled');
  infoDeposit.textContent = '';
  setStatus('⏳ Membaca file deposit...', 'info');

  const reader = new FileReader();
  reader.onload = (evt) => {
    try {
      let text = '';
      if (typeof evt.target.result === 'string') {
        text = evt.target.result;
      } else {
        const data = new Uint8Array(evt.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        text = XLSX.utils.sheet_to_csv(sheet);
      }
      depositRows = Parser.parseDeposit(text);
      console.log('HEADER:', Object.keys(depositRows[0] || {}));
      console.log('ROW PERTAMA:', depositRows[0]);
      console.log('ACUAN PERTAMA:', acuanUsers[0]);
      if (!depositRows.length) throw new Error('File deposit kosong');
      nameDeposit.textContent = '✅ ' + f.name;
      boxDeposit.classList.add('filled');
      infoDeposit.textContent = `${depositRows.length} baris terbaca`;
      setStatus(`✅ Deposit OK — ${depositRows.length} baris`, 'success');
      cekSiapProses();
    } catch (err) {
      nameDeposit.textContent = '❌ ' + f.name;
      boxDeposit.classList.add('error');
      infoDeposit.textContent = err.message;
      setStatus('❌ Gagal: ' + err.message, 'error');
      depositRows = [];
      cekSiapProses();
    }
  };
  if (/\.(xlsx|xls)$/i.test(f.name)) reader.readAsArrayBuffer(f);
  else reader.readAsText(f, 'UTF-8');
});

btnProses.addEventListener('click', () => {
  hasilFinal = Processor.prosesAudit(acuanUsers, depositRows);
  renderHasil();
  hasilSection.classList.remove('hidden');

  const { depoCount, freebetCount } = Processor.hitungRingkasan(hasilFinal);
  setStatus(`✅ Selesai! ${hasilFinal.length} user — ${depoCount} DEPO, ${freebetCount} FREEBET`, 'success');
  btnDownload.disabled = false;
  btnCopy.disabled = false;
  hasilSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

function renderHasil() {
  const { totalDepo, totalFreebet, depoCount, freebetCount } = Processor.hitungRingkasan(hasilFinal);

  document.getElementById('kpiTotal').textContent     = hasilFinal.length.toLocaleString('id-ID');
  document.getElementById('kpiQrisCount').textContent = depoCount.toLocaleString('id-ID');
  document.getElementById('kpiScbCount').textContent  = freebetCount.toLocaleString('id-ID');
  document.getElementById('kpiDepoRp').textContent    = 'Rp ' + totalDepo.toLocaleString('id-ID');
  document.getElementById('kpiFreebetRp').textContent = 'Rp ' + totalFreebet.toLocaleString('id-ID');

  const tbody = document.querySelector('#tblHasil tbody');
  tbody.innerHTML = hasilFinal.map(r => `
    <tr>
      <td>${r.no}</td>
      <td>${r.registerDate || '-'}</td>
      <td>${r.username}</td>
      <td class="num ${r.depo > 0 ? 'has-value' : 'zero'}">${r.depo > 0 ? 'Rp ' + r.depo.toLocaleString('id-ID') : 'Rp 0'}</td>
      <td class="num ${r.freebet > 0 ? 'has-value' : 'zero'}">${r.freebet > 0 ? 'Rp ' + r.freebet.toLocaleString('id-ID') : 'Rp 0'}</td>
    </tr>
  `).join('');
}

btnCopy.addEventListener('click', async () => {
  if (!hasilFinal.length) return;
  const tsv = hasilFinal.map(r => `${r.no}\t${r.registerDate || ''}\t${r.username}\t${r.depo}\t${r.freebet}`).join('\n');
  try {
    await navigator.clipboard.writeText(tsv);
    setStatus('📋 Data di-copy! Paste ke Sheets.', 'success');
  } catch (err) {
    const ta = document.createElement('textarea');
    ta.value = tsv; ta.style.position = 'fixed'; ta.style.left = '-9999px';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); setStatus('📋 Di-copy!', 'success'); } catch(e2) {}
    document.body.removeChild(ta);
  }
});

btnDownload.addEventListener('click', () => {
  const wb = XLSX.utils.book_new();
  const data = hasilFinal.map(r => ({
    'NO': r.no, 'Register Date': r.registerDate, 'USER ID': r.username,
    'DEPO': r.depo, 'FREEBET': r.freebet,
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = [{ wch: 6 }, { wch: 22 }, { wch: 20 }, { wch: 14 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, ws, 'NDP');

  const { totalDepo, totalFreebet, depoCount, freebetCount } = Processor.hitungRingkasan(hasilFinal);
  const ringkasan = [
    { 'Keterangan': 'Total User ID', 'Nilai': hasilFinal.length },
    { 'Keterangan': 'User Punya DEPO', 'Nilai': depoCount },
    { 'Keterangan': 'Total DEPO', 'Nilai': totalDepo },
    { 'Keterangan': 'User Punya FREEBET', 'Nilai': freebetCount },
    { 'Keterangan': 'Total FREEBET', 'Nilai': totalFreebet },
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ringkasan), 'Ringkasan');

  const tgl = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `audit_ndp_${tgl}.xlsx`);
  setStatus('💾 File didownload: audit_ndp_' + tgl + '.xlsx', 'success');
});

btnReset.addEventListener('click', () => {
  acuanUsers = []; depositRows = []; hasilFinal = [];
  fileAcuan.value = ''; fileDeposit.value = '';
  nameAcuan.textContent = ''; nameDeposit.textContent = '';
  infoAcuan.textContent = ''; infoDeposit.textContent = '';
  boxAcuan.classList.remove('filled', 'error');
  boxDeposit.classList.remove('filled', 'error');
  hasilSection.classList.add('hidden');
  statusMsg.className = 'status-msg';
  btnProses.disabled = true; btnReset.disabled = true;
  btnDownload.disabled = true; btnCopy.disabled = true;
});

let rawRowsScb = [];
let hasilScb = [];
let hasilTampilScb = [];

const fileScb     = document.getElementById('fileScb');
const boxFileScb  = document.getElementById('boxFileScb');
const nameScb     = document.getElementById('nameScb');
const infoScb     = document.getElementById('infoScb');
const btnProsesScb = document.getElementById('btnProsesScb');
const btnResetScb  = document.getElementById('btnResetScb');
const btnCopyScb   = document.getElementById('btnCopyScb');
const btnDownloadScb = document.getElementById('btnDownloadScb');
const statusMsgScb = document.getElementById('statusMsgScb');
const hasilScbSection = document.getElementById('hasilScbSection');

function setStatusScb(msg, type = 'info') {
  statusMsgScb.textContent = msg;
  statusMsgScb.className = 'status-msg show ' + type;
}

fileScb.addEventListener('change', (e) => {
  const f = e.target.files[0];
  if (!f) return;

  nameScb.textContent = '⏳ Membaca...';
  boxFileScb.classList.remove('filled', 'error');
  infoScb.textContent = '';
  setStatusScb('⏳ Membaca file...', 'info');

  const reader = new FileReader();
  reader.onload = (evt) => {
    try {
      let text = '';
      if (typeof evt.target.result === 'string') {
        text = evt.target.result;
      } else {
        const data = new Uint8Array(evt.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        text = XLSX.utils.sheet_to_csv(sheet);
      }
      const rows = Parser.parseCSV(text);
      const headers = rows[0].map(h => h.trim());
      rawRowsScb = rows.slice(1)
        .filter(r => r.some(c => c && c.trim()))
        .filter(r => String(r[0] || '').toLowerCase() !== 'referenceno')
        .map(r => { const o = {}; headers.forEach((h,i) => o[h] = r[i] || ''); return o; });

      if (!rawRowsScb.length) throw new Error('File kosong');

      nameScb.textContent = '✅ ' + f.name;
      boxFileScb.classList.add('filled');
      infoScb.textContent = `${rawRowsScb.length} baris terbaca`;
      setStatusScb(`✅ File OK — ${rawRowsScb.length} baris`, 'success');
      btnProsesScb.disabled = false;
      btnResetScb.disabled = false;
    } catch (err) {
      nameScb.textContent = '❌ ' + f.name;
      boxFileScb.classList.add('error');
      infoScb.textContent = err.message;
      setStatusScb('❌ Gagal: ' + err.message, 'error');
      rawRowsScb = [];
      btnProsesScb.disabled = true;
      btnResetScb.disabled = true;
    }
  };
  if (/\.(xlsx|xls)$/i.test(f.name)) reader.readAsArrayBuffer(f);
  else reader.readAsText(f, 'UTF-8');
});

btnProsesScb.addEventListener('click', () => {
  hasilScb = Processor.prosesSCB(rawRowsScb);
  if (!hasilScb.length) {
    setStatusScb('⚠️ Tidak ada data SCB ditemukan.', 'warning');
    return;
  }
  renderHasilScb();
  hasilScbSection.classList.remove('hidden');
  btnCopyScb.disabled = false;
  btnDownloadScb.disabled = false;
  setStatusScb(`✅ Selesai! ${hasilScb.length} user SCB diproses.`, 'success');
  hasilScbSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

function fmtRpScb(n) { return 'Rp ' + n.toLocaleString('id-ID'); }
function tagClassScb(remark) {
  if (remark === 'LUCKY SPIN') return 'lucky';
  if (remark === 'FREEBET') return 'freebet';
  return 'other';
}

function renderHasilScb() {
  const totalNominal = hasilScb.reduce((a,b) => a + b.total, 0);
  const luckyUsers   = hasilScb.filter(r => r.remark === 'LUCKY SPIN');
  const freebetUsers = hasilScb.filter(r => r.remark === 'FREEBET');
  const otherUsers   = hasilScb.filter(r => r.remark === 'LAINNYA');

  document.getElementById('kpiTotalScb').textContent   = hasilScb.length.toLocaleString('id-ID');
  document.getElementById('kpiNominalScb').textContent = fmtRpScb(totalNominal);
  document.getElementById('kpiLuckyScb').textContent    = fmtRpScb(luckyUsers.reduce((a,b)=>a+b.total,0));
  document.getElementById('kpiLuckySubScb').textContent = luckyUsers.length + ' user';
  document.getElementById('kpiFreebetScb').textContent    = fmtRpScb(freebetUsers.reduce((a,b)=>a+b.total,0));
  document.getElementById('kpiFreebetSubScb').textContent = freebetUsers.length + ' user';
  document.getElementById('kpiOtherScb').textContent    = fmtRpScb(otherUsers.reduce((a,b)=>a+b.total,0));
  document.getElementById('kpiOtherSubScb').textContent = otherUsers.length + ' user';

  applyFilterScb();
}

function applyFilterScb() {
  const showLucky   = document.getElementById('fLucky').checked;
  const showFreebet = document.getElementById('fFreebet').checked;
  const showOther   = document.getElementById('fOther').checked;

  hasilTampilScb = hasilScb.filter(r => {
    if (r.remark === 'LUCKY SPIN') return showLucky;
    if (r.remark === 'FREEBET')    return showFreebet;
    return showOther;
  });

  const tbody = document.querySelector('#tblHasilScb tbody');
  if (!hasilTampilScb.length) {
    tbody.innerHTML = `<tr><td colspan="4" class="empty-msg">Tidak ada data yang cocok.</td></tr>`;
    return;
  }

  tbody.innerHTML = hasilTampilScb.map((r, i) => {
    const remarkDisplay = r.remark.split(' / ').map(rm => {
      return `<span class="tag ${tagClassScb(rm)}">${rm}</span>`;
    }).join(' ');
    return `
      <tr>
        <td>${i + 1}</td>
        <td>${r.username}</td>
        <td class="num">${r.total.toLocaleString('id-ID')}</td>
        <td>${remarkDisplay}</td>
      </tr>
    `;
  }).join('');
}

document.getElementById('fLucky').addEventListener('change', applyFilterScb);
document.getElementById('fFreebet').addEventListener('change', applyFilterScb);
document.getElementById('fOther').addEventListener('change', applyFilterScb);

btnCopyScb.addEventListener('click', async () => {
  if (!hasilTampilScb.length) return;
   const tsv = hasilTampilScb.map(r => `${r.username}\t${r.total}`).join('\n');
  try {
    await navigator.clipboard.writeText(tsv);
    setStatusScb('📋 Data di-copy! Paste ke Sheets.', 'success');
  } catch (err) {
    const ta = document.createElement('textarea');
    ta.value = tsv; ta.style.position = 'fixed'; ta.style.left = '-9999px';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); setStatusScb('📋 Di-copy!', 'success'); } catch(e2) {}
    document.body.removeChild(ta);
  }
});

btnDownloadScb.addEventListener('click', () => {
  if (!hasilTampilScb.length) return;
  const wb = XLSX.utils.book_new();
  const data = hasilTampilScb.map((r, i) => ({
    'NO': i + 1, 'USER ID': r.username, 'REMARK': r.remark, 'TOTAL': r.total,
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = [{ wch: 6 }, { wch: 25 }, { wch: 20 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, ws, 'SCB Filter');

  const tgl = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `scb_filter_${tgl}.xlsx`);
  setStatusScb('💾 File didownload.', 'success');
});

btnResetScb.addEventListener('click', () => {
  rawRowsScb = []; hasilScb = []; hasilTampilScb = [];
  fileScb.value = '';
  nameScb.textContent = ''; infoScb.textContent = '';
  boxFileScb.classList.remove('filled', 'error');
  hasilScbSection.classList.add('hidden');
  statusMsgScb.className = 'status-msg';
  btnProsesScb.disabled = true;
  btnResetScb.disabled = true;
  btnCopyScb.disabled = true;
  btnDownloadScb.disabled = true;
  document.getElementById('fLucky').checked = true;
  document.getElementById('fFreebet').checked = true;
  document.getElementById('fOther').checked = true;
});

// =========================================================
// BAGIAN WITHDRAW QRIS (WD) - YANG DIPERBAIKI
// =========================================================
let rawRowsWd = [];
let hasilWd = [];

const fileWd         = document.getElementById('fileWd');
const boxFileWd      = document.getElementById('boxFileWd');
const nameWd         = document.getElementById('nameWd');
const infoWd         = document.getElementById('infoWd');
const btnProsesWd    = document.getElementById('btnProsesWd');
const btnResetWd     = document.getElementById('btnResetWd');
const btnCopyWd      = document.getElementById('btnCopyWd');
const btnDownloadWd  = document.getElementById('btnDownloadWd');
const statusMsgWd    = document.getElementById('statusMsgWd');
const hasilWdSection = document.getElementById('hasilWdSection');

function setStatusWd(msg, type = 'info') {
  statusMsgWd.textContent = msg;
  statusMsgWd.className = 'status-msg show ' + type;
}

fileWd.addEventListener('change', (e) => {
  const f = e.target.files[0];
  if (!f) return;

  nameWd.textContent = '⏳ Membaca...';
  boxFileWd.classList.remove('filled', 'error');
  infoWd.textContent = '';
  setStatusWd('⏳ Membaca file...', 'info');

  const reader = new FileReader();
  reader.onload = (evt) => {
    try {
      let text = '';
      if (typeof evt.target.result === 'string') {
        text = evt.target.result;
      } else {
        const data = new Uint8Array(evt.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        text = XLSX.utils.sheet_to_csv(sheet);
      }
      const rows = Parser.parseCSV(text);
      
      // ✅ PERBAIKAN: Bersihkan SEMUA spasi, tab, dan karakter tak terlihat dari header
      const headers = rows[0].map(h => String(h).trim().replace(/[\s\uFEFF\xA0]+/g, ''));
      
      rawRowsWd = rows.slice(1).filter(r => r.some(c => c && c.trim()))
        .map(r => { 
          const o = {}; 
          headers.forEach((h, i) => { 
            o[h] = r[i] || ''; 
          }); 
          return o; 
        });

      if (!rawRowsWd.length) throw new Error('File kosong');

      nameWd.textContent = '✅ ' + f.name;
      boxFileWd.classList.add('filled');
      infoWd.textContent = `${rawRowsWd.length} baris terbaca`;
      setStatusWd(`✅ File OK — ${rawRowsWd.length} baris`, 'success');
      btnProsesWd.disabled = false;
      btnResetWd.disabled = false;
    } catch (err) {
      nameWd.textContent = '❌ ' + f.name;
      boxFileWd.classList.add('error');
      infoWd.textContent = err.message;
      setStatusWd('❌ Gagal: ' + err.message, 'error');
      rawRowsWd = [];
      btnProsesWd.disabled = true;
      btnResetWd.disabled = true;
    }
  };
  if (/\.(xlsx|xls)$/i.test(f.name)) reader.readAsArrayBuffer(f);
  else reader.readAsText(f, 'UTF-8');
});

btnProsesWd.addEventListener('click', () => {
  hasilWd = Processor.prosesWd(rawRowsWd);
  if (!hasilWd.length) {
    setStatusWd('⚠️ Tidak ada data ditemukan.', 'warning');
    return;
  }
  renderHasilWd();
  hasilWdSection.classList.remove('hidden');
  btnCopyWd.disabled = false;
  btnDownloadWd.disabled = false;
  setStatusWd(`✅ Selesai! ${hasilWd.length} baris withdraw diproses (urutan terbalik).`, 'success');
  hasilWdSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

function fmtRpWd(n) { return 'Rp ' + n.toLocaleString('id-ID'); }

function renderHasilWd() {
  const totalNominal = hasilWd.reduce((a, b) => a + b.total, 0);
  const totalAdm     = hasilWd.reduce((a, b) => a + b.adm, 0);

  document.getElementById('kpiTotalWd').textContent   = hasilWd.length.toLocaleString('id-ID');
  document.getElementById('kpiNominalWd').textContent = fmtRpWd(totalNominal);
  document.getElementById('kpiAdmWd').textContent     = fmtRpWd(totalAdm);

  const tbody = document.querySelector('#tblHasilWd tbody');
  tbody.innerHTML = hasilWd.map(r => `
    <tr>
      <td>${r.no}</td>
      <td>${r.toBank}</td>
      <td>${r.username}</td>
      <td class="num" style="color:#dc2626;font-weight:600;">${r.total.toLocaleString('id-ID')}</td>
      <td class="num" style="color:#dc2626;font-weight:600;">${r.adm.toLocaleString('id-ID')}</td>
    </tr>
  `).join('');
}

btnCopyWd.addEventListener('click', async () => {
  if (!hasilWd.length) return;
  const tsv = hasilWd.map(r => `${r.toBank}\t${r.username}\t${r.total}\t${r.adm}`).join('\n');
  try {
    await navigator.clipboard.writeText(tsv);
    setStatusWd('📋 Data di-copy! Paste ke Sheets.', 'success');
  } catch (err) {
    const ta = document.createElement('textarea');
    ta.value = tsv; ta.style.position = 'fixed'; ta.style.left = '-9999px';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); setStatusWd('📋 Di-copy!', 'success'); } catch(e2) {}
    document.body.removeChild(ta);
  }
});

btnDownloadWd.addEventListener('click', () => {
  if (!hasilWd.length) return;
  const wb = XLSX.utils.book_new();
  const data = hasilWd.map(r => ({
    'NO': r.no,
    'TOBANK': r.toBank,
    'USERNAME': r.username,
    'TOTAL': r.total,
    'ADM': r.adm
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = [{ wch: 6 }, { wch: 35 }, { wch: 22 }, { wch: 14 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Withdraw QRIS');

  const tgl = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `withdraw_qris_${tgl}.xlsx`);
  setStatusWd('💾 File didownload.', 'success');
});

btnResetWd.addEventListener('click', () => {
  rawRowsWd = []; hasilWd = [];
  fileWd.value = '';
  nameWd.textContent = ''; infoWd.textContent = '';
  boxFileWd.classList.remove('filled', 'error');
  hasilWdSection.classList.add('hidden');
  statusMsgWd.className = 'status-msg';
  btnProsesWd.disabled = true;
  btnResetWd.disabled = true;
  btnCopyWd.disabled = true;
  btnDownloadWd.disabled = true;
});

let rawRowsQris = [];
let hasilQris = [];

const fileQris        = document.getElementById('fileQris');
const boxFileQris     = document.getElementById('boxFileQris');
const nameQris        = document.getElementById('nameQris');
const infoQris        = document.getElementById('infoQris');
const btnProsesQris   = document.getElementById('btnProsesQris');
const btnResetQris    = document.getElementById('btnResetQris');
const btnCopyQris     = document.getElementById('btnCopyQris');
const btnDownloadQris = document.getElementById('btnDownloadQris');
const statusMsgQris   = document.getElementById('statusMsgQris');
const hasilQrisSection = document.getElementById('hasilQrisSection');

function setStatusQris(msg, type = 'info') {
  statusMsgQris.textContent = msg;
  statusMsgQris.className = 'status-msg show ' + type;
}

fileQris.addEventListener('change', (e) => {
  const f = e.target.files[0];
  if (!f) return;

  nameQris.textContent = '⏳ Membaca...';
  boxFileQris.classList.remove('filled', 'error');
  infoQris.textContent = '';
  setStatusQris('⏳ Membaca file...', 'info');

  const reader = new FileReader();
  reader.onload = (evt) => {
    try {
      let text = '';
      if (typeof evt.target.result === 'string') {
        text = evt.target.result;
      } else {
        const data = new Uint8Array(evt.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        text = XLSX.utils.sheet_to_csv(sheet);
      }
      const rows = Parser.parseCSV(text);
      const headers = rows[0].map(h => h.trim());
      rawRowsQris = rows.slice(1).filter(r => r.some(c => c && c.trim()))
        .map(r => { const o = {}; headers.forEach((h,i) => o[h] = r[i] || ''); return o; });

      if (!rawRowsQris.length) throw new Error('File kosong');

      nameQris.textContent = '✅ ' + f.name;
      boxFileQris.classList.add('filled');
      infoQris.textContent = `${rawRowsQris.length} baris terbaca`;
      setStatusQris(`✅ File OK — ${rawRowsQris.length} baris`, 'success');
      btnProsesQris.disabled = false;
      btnResetQris.disabled = false;
    } catch (err) {
      nameQris.textContent = '❌ ' + f.name;
      boxFileQris.classList.add('error');
      infoQris.textContent = err.message;
      setStatusQris('❌ Gagal: ' + err.message, 'error');
      rawRowsQris = [];
      btnProsesQris.disabled = true;
      btnResetQris.disabled = true;
    }
  };
  if (/\.(xlsx|xls)$/i.test(f.name)) reader.readAsArrayBuffer(f);
  else reader.readAsText(f, 'UTF-8');
});

btnProsesQris.addEventListener('click', () => {
  hasilQris = Processor.prosesQris(rawRowsQris);
  if (!hasilQris.length) {
    setStatusQris('⚠️ Tidak ada data QRIS HOKI ditemukan.', 'warning');
    return;
  }
  renderHasilQris();
  hasilQrisSection.classList.remove('hidden');
  btnCopyQris.disabled = false;
  btnDownloadQris.disabled = false;
  setStatusQris(`✅ Selesai! ${hasilQris.length} user QRIS HOKI diproses.`, 'success');
  hasilQrisSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

function fmtRpQris(n) { return 'Rp ' + n.toLocaleString('id-ID'); }

function renderHasilQris() {
  const totalNominal = hasilQris.reduce((a,b) => a + b.total, 0);
  const avg = hasilQris.length ? Math.round(totalNominal / hasilQris.length) : 0;

  document.getElementById('kpiTotalQris').textContent   = hasilQris.length.toLocaleString('id-ID');
  document.getElementById('kpiNominalQris').textContent = fmtRpQris(totalNominal);
  document.getElementById('kpiAvgQris').textContent     = fmtRpQris(avg);

  const tbody = document.querySelector('#tblHasilQris tbody');
  tbody.innerHTML = hasilQris.map((r, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${r.username}</td>
      <td class="num">${r.total.toLocaleString('id-ID')}</td>
    </tr>
  `).join('');
}


btnCopyQris.addEventListener('click', async () => {
  if (!hasilQris.length) return;

  const tsv = hasilQris.map(r => `${r.username}\t${r.total}`).join('\n');

  try {
    await navigator.clipboard.writeText(tsv);
    setStatusQris('📋 Data di-copy! Paste ke Sheets.', 'success');
  } catch (err) {
    const ta = document.createElement('textarea');
    ta.value = tsv; ta.style.position = 'fixed'; ta.style.left = '-9999px';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); setStatusQris('📋 Di-copy!', 'success'); } catch(e2) {}
    document.body.removeChild(ta);
  }
});

btnDownloadQris.addEventListener('click', () => {
  if (!hasilQris.length) return;
  const wb = XLSX.utils.book_new();
  const data = hasilQris.map((r, i) => ({
    'NO': i + 1, 'USER ID': r.username, 'TOTAL': r.total,
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = [{ wch: 6 }, { wch: 25 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, ws, 'QRIS HOKI');

  const tgl = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `qris_hoki_filter_${tgl}.xlsx`);
  setStatusQris('💾 File didownload.', 'success');
});

btnResetQris.addEventListener('click', () => {
  rawRowsQris = []; hasilQris = [];
  fileQris.value = '';
  nameQris.textContent = ''; infoQris.textContent = '';
  boxFileQris.classList.remove('filled', 'error');
  hasilQrisSection.classList.add('hidden');
  statusMsgQris.className = 'status-msg';
  btnProsesQris.disabled = true;
  btnResetQris.disabled = true;
  btnCopyQris.disabled = true;
  btnDownloadQris.disabled = true;
});

let rawRowsScd = [];
let hasilScd = [];

const fileScd         = document.getElementById('fileScd');
const boxFileScd      = document.getElementById('boxFileScd');
const nameScd         = document.getElementById('nameScd');
const infoScd         = document.getElementById('infoScd');
const btnProsesScd    = document.getElementById('btnProsesScd');
const btnResetScd     = document.getElementById('btnResetScd');
const btnCopyScd      = document.getElementById('btnCopyScd');
const btnDownloadScd  = document.getElementById('btnDownloadScd');
const statusMsgScd    = document.getElementById('statusMsgScd');
const hasilScdSection = document.getElementById('hasilScdSection');

function setStatusScd(msg, type = 'info') {
  statusMsgScd.textContent = msg;
  statusMsgScd.className = 'status-msg show ' + type;
}

fileScd.addEventListener('change', (e) => {
  const f = e.target.files[0];
  if (!f) return;

  nameScd.textContent = '⏳ Membaca...';
  boxFileScd.classList.remove('filled', 'error');
  infoScd.textContent = '';
  setStatusScd('⏳ Membaca file...', 'info');

  const reader = new FileReader();
  reader.onload = (evt) => {
    try {
      let text = '';
      if (typeof evt.target.result === 'string') {
        text = evt.target.result;
      } else {
        const data = new Uint8Array(evt.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        text = XLSX.utils.sheet_to_csv(sheet);
      }
      const rows = Parser.parseCSV(text);
      const headers = rows[0].map(h => h.trim());
      rawRowsScd = rows.slice(1).filter(r => r.some(c => c && c.trim()))
        .map(r => { const o = {}; headers.forEach((h,i) => o[h] = r[i] || ''); return o; });

      if (!rawRowsScd.length) throw new Error('File kosong');

      nameScd.textContent = '✅ ' + f.name;
      boxFileScd.classList.add('filled');
      infoScd.textContent = `${rawRowsScd.length} baris terbaca`;
      setStatusScd(`✅ File OK — ${rawRowsScd.length} baris`, 'success');
      btnProsesScd.disabled = false;
      btnResetScd.disabled = false;
    } catch (err) {
      nameScd.textContent = '❌ ' + f.name;
      boxFileScd.classList.add('error');
      infoScd.textContent = err.message;
      setStatusScd('❌ Gagal: ' + err.message, 'error');
      rawRowsScd = [];
      btnProsesScd.disabled = true;
      btnResetScd.disabled = true;
    }
  };
  if (/\.(xlsx|xls)$/i.test(f.name)) reader.readAsArrayBuffer(f);
  else reader.readAsText(f, 'UTF-8');
});

btnProsesScd.addEventListener('click', () => {
  hasilScd = Processor.prosesScd(rawRowsScd);

  renderHasilScd();
  hasilScdSection.classList.remove('hidden');

  btnCopyScd.disabled = false;
  btnDownloadScd.disabled = false;

  if (!hasilScd.length) {
    setStatusScd('⚠️ Semua user sudah transaksi SCB.', 'warning');
  } else {
    setStatusScd(`✅ Selesai! ${hasilScd.length} user belum transaksi SCB.`, 'success');
  }

  hasilScdSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
});


function fmtRpScd(n) { return 'Rp ' + n.toLocaleString('id-ID'); }

let filterScd = { belumScb: true, sudahScb1x: false, doubleScb: false };

function renderHasilScd() {
  const s = window._scdStats || {
    totalUser: 0, belumScb: 0, sudahScb: 0,
    doubleScb: 0, totalNominal: 0
  };
  const d = window._scdData || { belumScb: [], sudahScb: [], doubleScb: [] };

  document.getElementById('kpiTotalQrisScd').textContent = s.totalUser.toLocaleString('id-ID');
  document.getElementById('kpiBelumScd').textContent     = s.belumScb.toLocaleString('id-ID');
  document.getElementById('kpiNominalScd').textContent   = fmtRpScd(s.totalNominal);
  document.getElementById('kpiSudahScd').textContent     = s.sudahScb.toLocaleString('id-ID');
  document.getElementById('kpiDoubleScd').textContent    = s.doubleScb.toLocaleString('id-ID');

  applyFilterScd();
}

function applyFilterScd() {
  const d = window._scdData || { belumScb: [], sudahScb: [], doubleScb: [] };

  let list = [];
  const sudahScb1x = d.sudahScb.filter(u => u.scbCount === 1);

  if (filterScd.belumScb)   list = list.concat(d.belumScb.map(u => ({ ...u, kategori: 'BELUM SCB' })));
  if (filterScd.sudahScb1x) list = list.concat(sudahScb1x.map(u => ({ ...u, kategori: 'SUDAH SCB' })));
  if (filterScd.doubleScb)  list = list.concat(d.doubleScb.map(u => ({ ...u, kategori: 'DOUBLE SCB' })));

  const order = { 'DOUBLE SCB': 0, 'SUDAH SCB': 1, 'BELUM SCB': 2 };
  list.sort((a, b) => {
    if (order[a.kategori] !== order[b.kategori]) return order[a.kategori] - order[b.kategori];
    return b.total - a.total;
  });

  const tbody = document.querySelector('#tblHasilScd tbody');
  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="4" class="empty-msg">Tidak ada data yang cocok dengan filter.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map((r, i) => {
    const badgeCls = r.kategori === 'DOUBLE SCB' ? 'lucky'
                   : r.kategori === 'SUDAH SCB'  ? 'freebet'
                   : 'other';
    const badgeText = r.kategori === 'DOUBLE SCB' ? `DOUBLE SCB (${r.scbCount}x)`
                    : r.kategori === 'SUDAH SCB'  ? `SUDAH SCB (${r.scbCount}x)`
                    : 'BELUM SCB';
    return `
      <tr>
        <td>${i + 1}</td>
        <td>${r.username}</td>
        <td class="num">${fmtRpScd(r.total)}</td>
        <td><span class="tag ${badgeCls}">${badgeText}</span></td>
      </tr>
    `;
  }).join('');
}

function initFilterScd() {
  const f1 = document.getElementById('scdFilterBelum');
  const f2 = document.getElementById('scdFilterSudah');
  const f3 = document.getElementById('scdFilterDouble');
  if (f1) f1.addEventListener('change', e => { filterScd.belumScb   = e.target.checked; applyFilterScd(); });
  if (f2) f2.addEventListener('change', e => { filterScd.sudahScb1x = e.target.checked; applyFilterScd(); });
  if (f3) f3.addEventListener('change', e => { filterScd.doubleScb  = e.target.checked; applyFilterScd(); });
}
initFilterScd();

btnCopyScd.addEventListener('click', async () => {
  const d = window._scdData;
  if (!d) return;

  let list = [];
  if (filterScd.belumScb)   list = list.concat(d.belumScb.map(u => ({ ...u, kategori: 'BELUM SCB' })));
  if (filterScd.sudahScb1x) list = list.concat(d.sudahScb.filter(u => u.scbCount === 1).map(u => ({ ...u, kategori: 'SUDAH SCB' })));
  if (filterScd.doubleScb)  list = list.concat(d.doubleScb.map(u => ({ ...u, kategori: 'DOUBLE SCB' })));

  if (!list.length) return;

  const tsv = list.map(r => `${r.username}\t${r.total}\t${r.kategori}`).join('\n');
  try {
    await navigator.clipboard.writeText(tsv);
    setStatusScd('📋 Data di-copy!', 'success');
  } catch (err) { /* fallback sama seperti sebelumnya */ }
});

btnDownloadScd.addEventListener('click', () => {
  const d = window._scdData;
  if (!d) return;

  let list = [];
  if (filterScd.belumScb)   list = list.concat(d.belumScb.map(u => ({ ...u, kategori: 'BELUM SCB' })));
  if (filterScd.sudahScb1x) list = list.concat(d.sudahScb.filter(u => u.scbCount === 1).map(u => ({ ...u, kategori: 'SUDAH SCB' })));
  if (filterScd.doubleScb)  list = list.concat(d.doubleScb.map(u => ({ ...u, kategori: 'DOUBLE SCB' })));

  if (!list.length) return;

  const wb = XLSX.utils.book_new();
  const data = list.map((r, i) => ({
    'NO': i + 1,
    'USER ID': r.username,
    'TOTAL TRANSAKSI': r.total,
    'JUMLAH SCB': r.scbCount,
    'KATEGORI': r.kategori,
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = [{ wch: 6 }, { wch: 22 }, { wch: 16 }, { wch: 12 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, ws, 'SCD');

  const tgl = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `scd_detection_${tgl}.xlsx`);
  setStatusScd('💾 File didownload.', 'success');
});


btnResetScd.addEventListener('click', () => {
  rawRowsScd = []; hasilScd = [];
  fileScd.value = '';
  nameScd.textContent = ''; infoScd.textContent = '';
  boxFileScd.classList.remove('filled', 'error');
  hasilScdSection.classList.add('hidden');
  statusMsgScd.className = 'status-msg';
  btnProsesScd.disabled = true;
  btnResetScd.disabled = true;
  btnCopyScd.disabled = true;
  btnDownloadScd.disabled = true;
});

/* =========================================================
   DAILY TASKS & NOTES (LocalStorage)
   ========================================================= */
const STORAGE_TASKS = 'daily_tasks_v1';
const STORAGE_NOTES = 'daily_notes_v1';

const taskInput    = document.getElementById('taskInput');
const taskPriority = document.getElementById('taskPriority');
const btnAddTask   = document.getElementById('btnAddTask');
const tblTasksBody = document.querySelector('#tblTasks tbody');
const taskStats    = document.getElementById('taskStats');
const notesArea    = document.getElementById('notesArea');
const notesStatus  = document.getElementById('notesStatus');

let tasks = JSON.parse(localStorage.getItem(STORAGE_TASKS) || '[]');

// ========== RENDER TASKS ==========
function renderTasks() {
  if (!tasks.length) {
    tblTasksBody.innerHTML = `<tr><td colspan="5" class="empty-msg">Belum ada jobdesc. Tambahkan di atas! 📝</td></tr>`;
    taskStats.textContent = '';
    return;
  }

  tblTasksBody.innerHTML = tasks.map((t, i) => `
    <tr class="task-row ${t.done ? 'done' : ''}">
      <td style="text-align:center;">
        <input type="checkbox" class="task-checkbox" data-idx="${i}" ${t.done ? 'checked' : ''}>
      </td>
      <td class="task-text">${escapeHtml(t.text)}</td>
      <td><span class="task-badge ${t.priority}">${
        t.priority === 'low' ? '🟢 Low' : t.priority === 'med' ? '🟡 Medium' : '🔴 High'
      }</span></td>
      <td class="task-date">${t.date || '-'}</td>
      <td style="text-align:center;">
        <button class="btn-delete-task" data-idx="${i}" title="Hapus">🗑️</button>
      </td>
    </tr>
  `).join('');

  // Stats
  const total = tasks.length;
  const done  = tasks.filter(t => t.done).length;
  const high  = tasks.filter(t => !t.done && t.priority === 'high').length;
  taskStats.innerHTML = `
    Total: <b>${total}</b> &nbsp;|&nbsp;
    Selesai: <b style="color:var(--green)">${done}</b> &nbsp;|&nbsp;
    Pending: <b style="color:var(--orange)">${total - done}</b> &nbsp;|&nbsp;
    Prioritas Tinggi: <b style="color:#dc2626">${high}</b>
  `;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function saveTasks() {
  localStorage.setItem(STORAGE_TASKS, JSON.stringify(tasks));
  renderTasks();
}

// ========== ADD TASK ==========
function addTask() {
  const text = taskInput.value.trim();
  if (!text) return;

  const now = new Date();
  const tgl = now.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });

  tasks.unshift({
    text: text,
    priority: taskPriority.value,
    done: false,
    date: tgl,
  });

  taskInput.value = '';
  taskInput.focus();
  saveTasks();
}

btnAddTask?.addEventListener('click', addTask);
taskInput?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addTask();
});

// ========== TOGGLE / DELETE (Event Delegation) ==========
tblTasksBody?.addEventListener('click', (e) => {
  // Toggle done
  if (e.target.classList.contains('task-checkbox')) {
    const idx = Number(e.target.dataset.idx);
    tasks[idx].done = e.target.checked;
    saveTasks();
  }
  // Delete
  if (e.target.classList.contains('btn-delete-task')) {
    const idx = Number(e.target.dataset.idx);
    if (confirm('Hapus jobdesc ini?')) {
      tasks.splice(idx, 1);
      saveTasks();
    }
  }
});

// ========== CLEAR ==========
document.getElementById('btnClearDone')?.addEventListener('click', () => {
  const doneCount = tasks.filter(t => t.done).length;
  if (!doneCount) return alert('Tidak ada jobdesc yang selesai.');
  if (confirm(`Hapus ${doneCount} jobdesc yang sudah selesai?`)) {
    tasks = tasks.filter(t => !t.done);
    saveTasks();
  }
});

document.getElementById('btnClearAllTasks')?.addEventListener('click', () => {
  if (!tasks.length) return;
  if (confirm('Hapus SEMUA jobdesc? Tindakan ini tidak bisa dibatalkan.')) {
    tasks = [];
    saveTasks();
  }
});

// ========== COPY & DOWNLOAD ==========
document.getElementById('btnExportTasks')?.addEventListener('click', async () => {
  if (!tasks.length) return;
  const tsv = tasks.map(t =>
    `${t.done ? '[✓]' : '[ ]'}\t${t.text}\t${t.priority}\t${t.date || ''}`
  ).join('\n');
  try {
    await navigator.clipboard.writeText(tsv);
    alert('📋 Data jobdesc di-copy! Paste ke mana saja.');
  } catch (err) {
    alert('Gagal copy: ' + err.message);
  }
});

document.getElementById('btnDownloadTasks')?.addEventListener('click', () => {
  if (!tasks.length) return;
  const wb = XLSX.utils.book_new();
  const data = tasks.map((t, i) => ({
    'NO': i + 1,
    'STATUS': t.done ? 'SELESAI' : 'PENDING',
    'JOBDESC': t.text,
    'PRIORITAS': t.priority.toUpperCase(),
    'TANGGAL': t.date || '',
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = [{ wch: 6 }, { wch: 12 }, { wch: 50 }, { wch: 12 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Jobdesc');
  const tgl = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `jobdesc_${tgl}.xlsx`);
});

// ========== NOTES ==========
function loadNotes() {
  if (notesArea) {
    notesArea.value = localStorage.getItem(STORAGE_NOTES) || '';
  }
}

function saveNotes() {
  if (!notesArea) return;
  localStorage.setItem(STORAGE_NOTES, notesArea.value);
  if (notesStatus) {
    notesStatus.textContent = '✅ Tersimpan!';
    notesStatus.classList.add('show');
    setTimeout(() => notesStatus.classList.remove('show'), 1500);
  }
}

// Auto-save notes setiap 2 detik setelah user berhenti ngetik
let notesTimer = null;
notesArea?.addEventListener('input', () => {
  clearTimeout(notesTimer);
  notesTimer = setTimeout(saveNotes, 2000);
});

document.getElementById('btnSaveNotes')?.addEventListener('click', saveNotes);

document.getElementById('btnClearNotes')?.addEventListener('click', () => {
  if (!notesArea.value.trim()) return;
  if (confirm('Hapus semua catatan?')) {
    notesArea.value = '';
    localStorage.removeItem(STORAGE_NOTES);
    if (notesStatus) {
      notesStatus.textContent = '🗑️ Catatan dihapus.';
      notesStatus.classList.add('show');
      setTimeout(() => notesStatus.classList.remove('show'), 1500);
    }
  }
});

// Init
loadNotes();
renderTasks();

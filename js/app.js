/* =========================================================
   app.js — UI Controller (event handler & render)
   ========================================================= */

// ================== STATE ==================
let acuanUsers = [];
let depositRows = [];
let hasilFinal = [];

// ================== ELEMEN ==================
const fileAcuan   = document.getElementById('fileAcuan');
const fileDeposit = document.getElementById('fileDeposit');
const boxAcuan    = document.getElementById('boxAcuan');
const boxDeposit  = document.getElementById('boxDeposit');
const nameAcuan   = document.getElementById('nameAcuan');
const nameDeposit = document.getElementById('nameDeposit');
const infoAcuan   = document.getElementById('infoAcuan');
const infoDeposit = document.getElementById('infoDeposit');
const btnProses   = document.getElementById('btnProses');
const btnReset    = document.getElementById('btnReset');
const btnDownload = document.getElementById('btnDownload');
const btnCopy     = document.getElementById('btnCopy');
const hasilSection= document.getElementById('hasilSection');
const statusMsg   = document.getElementById('statusMsg');

function setStatus(msg, type = 'info') {
  statusMsg.textContent = msg;
  statusMsg.className = 'status-msg show ' + type;
}

function cekSiapProses() {
  const siap = acuanUsers.length > 0 && depositRows.length > 0;
  btnProses.disabled = !siap;
  btnReset.disabled  = !(acuanUsers.length || depositRows.length);
}

// ================== UPLOAD: FILE ACUAN ==================
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
      acuanUsers = Parser.parseAcuan(evt.target.result);
      nameAcuan.textContent = '✅ ' + f.name;
      boxAcuan.classList.add('filled');
      infoAcuan.textContent = `${acuanUsers.length} user terbaca`;
      setStatus(`✅ File TableData OK — ${acuanUsers.length} user berhasil diekstrak`, 'success');
      cekSiapProses();
    } catch (err) {
      console.error(err);
      nameAcuan.textContent = '❌ ' + f.name;
      boxAcuan.classList.add('error');
      infoAcuan.textContent = err.message;
      setStatus('❌ Gagal baca file TableData: ' + err.message, 'error');
      acuanUsers = [];
      cekSiapProses();
    }
  };
  reader.readAsArrayBuffer(f);
});

// ================== UPLOAD: FILE DEPOSIT ==================
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
      if (!depositRows.length) throw new Error('File deposit kosong');

      nameDeposit.textContent = '✅ ' + f.name;
      boxDeposit.classList.add('filled');
      infoDeposit.textContent = `${depositRows.length} baris terbaca`;
      setStatus(`✅ File deposit OK — ${depositRows.length} baris terbaca`, 'success');
      cekSiapProses();
    } catch (err) {
      console.error(err);
      nameDeposit.textContent = '❌ ' + f.name;
      boxDeposit.classList.add('error');
      infoDeposit.textContent = err.message;
      setStatus('❌ Gagal baca file deposit: ' + err.message, 'error');
      depositRows = [];
      cekSiapProses();
    }
  };

  if (/\.(xlsx|xls)$/i.test(f.name)) reader.readAsArrayBuffer(f);
  else reader.readAsText(f, 'UTF-8');
});

// ================== PROSES ==================
btnProses.addEventListener('click', () => {
  hasilFinal = Processor.prosesAudit(acuanUsers, depositRows);

  renderHasil();
  hasilSection.classList.remove('hidden');

  const { depoCount, freebetCount } = Processor.hitungRingkasan(hasilFinal);
  setStatus(
    `✅ Selesai! ${hasilFinal.length} user diproses — ${depoCount} punya DEPO, ${freebetCount} punya FREEBET.`,
    'success'
  );
  btnDownload.disabled = false;
  btnCopy.disabled = false;

  hasilSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

// ================== RENDER ==================
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

// ================== COPY KE CLIPBOARD (TSV) ==================
btnCopy.addEventListener('click', async () => {
  if (!hasilFinal.length) return;

  const tsv = Processor.buildTSV(hasilFinal);

  try {
    await navigator.clipboard.writeText(tsv);
    setStatus('📋 Data berhasil di-copy! Tinggal paste (Ctrl+V) ke Google Sheets / Excel.', 'success');
  } catch (err) {
    // Fallback untuk browser lama / koneksi non-HTTPS
    const ta = document.createElement('textarea');
    ta.value = tsv;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      setStatus('📋 Data berhasil di-copy (mode fallback). Tinggal paste ke Google Sheets.', 'success');
    } catch (e2) {
      setStatus('❌ Gagal copy: ' + e2.message, 'error');
    }
    document.body.removeChild(ta);
  }
});

// ================== DOWNLOAD EXCEL ==================
btnDownload.addEventListener('click', () => {
  const wb = XLSX.utils.book_new();

  const data = hasilFinal.map(r => ({
    'NO': r.no,
    'Register Date': r.registerDate,
    'USER ID': r.username,
    'DEPO': r.depo,
    'FREEBET': r.freebet,
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = [{ wch: 6 }, { wch: 22 }, { wch: 20 }, { wch: 14 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, ws, 'KOLONI4D');

  const { totalDepo, totalFreebet, depoCount, freebetCount } = Processor.hitungRingkasan(hasilFinal);
  const ringkasan = [
    { 'Keterangan': 'Total User ID',                   'Nilai': hasilFinal.length },
    { 'Keterangan': 'User Punya DEPO (QRIS HOKI)',     'Nilai': depoCount },
    { 'Keterangan': 'Total DEPO',                      'Nilai': totalDepo },
    { 'Keterangan': 'User Punya FREEBET (SCB)',        'Nilai': freebetCount },
    { 'Keterangan': 'Total FREEBET',                   'Nilai': totalFreebet },
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ringkasan), 'Ringkasan');

  const tgl = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `audit_koloni4d_${tgl}.xlsx`);
  setStatus('💾 File hasil didownload: audit_koloni4d_' + tgl + '.xlsx', 'success');
});

// ================== RESET ==================
btnReset.addEventListener('click', () => {
  acuanUsers = [];
  depositRows = [];
  hasilFinal = [];

  fileAcuan.value = '';
  fileDeposit.value = '';

  nameAcuan.textContent   = '';
  nameDeposit.textContent = '';
  infoAcuan.textContent   = '';
  infoDeposit.textContent = '';

  boxAcuan.classList.remove('filled', 'error');
  boxDeposit.classList.remove('filled', 'error');

  hasilSection.classList.add('hidden');
  statusMsg.className = 'status-msg';

  btnProses.disabled = true;
  btnReset.disabled = true;
  btnDownload.disabled = true;
  btnCopy.disabled = true;
});
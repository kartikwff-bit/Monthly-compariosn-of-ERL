/* ============================================================
   EasyRupee Monthly Comparison — App Logic
   ============================================================ */

// ── FIREBASE CONFIGURATION ──
const firebaseConfig = {
  apiKey: "AIzaSyCVOCx4xXxTvIjCX5xerpmHHXoAMKoBu3w",
  authDomain: "easyrupee-cloud.firebaseapp.com",
  databaseURL: "https://easyrupee-cloud-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "easyrupee-cloud",
  storageBucket: "easyrupee-cloud.firebasestorage.app",
  messagingSenderId: "1031285039313",
  appId: "1:1031285039313:web:5041bb804caac1239f65f0",
  measurementId: "G-1GX7H2RGTL"
};

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

const DEFAULT_DATA = [
  { name: 'Bangalore', apr: { total: 177, open: 44, closed: 133, repay: 5921500, pending: 1201400, coll: 79.71 }, mar: { total: 157, open: 24, closed: 133, repay: 5446270, pending: 738116, coll: 86.00 } },
  { name: 'Chennai',   apr: { total: 101, open: 15, closed: 86,  repay: 3302790, pending: 441430,  coll: 86.63 }, mar: { total: 88,  open: 12, closed: 76,  repay: 2761910, pending: 333310, coll: 88.00 } },
  { name: 'Delhi',     apr: { total: 128, open: 33, closed: 95,  repay: 4038700, pending: 950803,  coll: 76.46 }, mar: { total: 121, open: 16, closed: 105, repay: 3779510, pending: 374246, coll: 90.00 } },
  { name: 'Hyderabad', apr: { total: 105, open: 17, closed: 88,  repay: 3557890, pending: 501265,  coll: 85.91 }, mar: { total: 90,  open: 19, closed: 71,  repay: 3220150, pending: 597595, coll: 81.00 } },
  { name: 'Kolkata',   apr: { total: 47,  open: 11, closed: 36,  repay: 1373370, pending: 311826,  coll: 77.29 }, mar: { total: 43,  open: 5,  closed: 38,  repay: 1249170, pending: 116820, coll: 91.00 } },
  { name: 'Mumbai',    apr: { total: 77,  open: 17, closed: 60,  repay: 2522800, pending: 460080,  coll: 81.76 }, mar: { total: 53,  open: 4,  closed: 49,  repay: 1780320, pending: 109240, coll: 94.00 } },
  { name: 'Pune',      apr: { total: 84,  open: 19, closed: 65,  repay: 2628170, pending: 573248,  coll: 78.19 }, mar: { total: 67,  open: 8,  closed: 59,  repay: 2129670, pending: 240294, coll: 89.00 } }
];

let state = { data: DEFAULT_DATA, src: 'Waiting for Cloud Upload...' };
let charts = {};

const PAL = { apr: '#38bdf8', mar: '#f472b6', aprAlpha: 'rgba(56,189,248,0.7)', marAlpha: 'rgba(244,114,182,0.7)' };

// ── FORMATTERS ──
const fmt = {
  inr: v => v >= 1e7 ? `₹${(v/1e7).toFixed(2)} Cr` : v >= 1e5 ? `₹${(v/1e5).toFixed(2)} L` : `₹${v.toLocaleString('en-IN')}`,
  num: v => v.toLocaleString('en-IN'),
  pct: v => `${v.toFixed(2)}%`
};

function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.style.transform = 'translateY(0)'; el.style.opacity = '1';
  setTimeout(() => { el.style.transform = 'translateY(100px)'; el.style.opacity = '0'; }, 3000);
}

// ── KPI SUMMARY ──
function updateKPIs() {
  const sum = (month, key) => state.data.reduce((s, r) => s + (r[month][key] || 0), 0);
  
  const aprCases = sum('apr', 'total'), marCases = sum('mar', 'total');
  const aprRepay = sum('apr', 'repay'), marRepay = sum('mar', 'repay');
  const aprOpen  = sum('apr', 'open'),  marOpen  = sum('mar', 'open');
  
  const aprPend = sum('apr', 'pending'), marPend = sum('mar', 'pending');
  const aprColl = ((aprRepay - aprPend) / aprRepay) * 100;
  const marColl = ((marRepay - marPend) / marRepay) * 100;

  // Set values
  document.getElementById('sm-aprCases').textContent = fmt.num(aprCases);
  document.getElementById('sm-marCases').textContent = fmt.num(marCases);
  document.getElementById('sm-aprRepay').textContent = fmt.inr(aprRepay);
  document.getElementById('sm-marRepay').textContent = fmt.inr(marRepay);
  document.getElementById('sm-aprColl').textContent  = fmt.pct(aprColl);
  document.getElementById('sm-marColl').textContent  = fmt.pct(marColl);
  document.getElementById('sm-aprOpen').textContent  = fmt.num(aprOpen);
  document.getElementById('sm-marOpen').textContent  = fmt.num(marOpen);

  // Set Deltas
  const setDelta = (id, cur, prev, isInverseGood = false) => {
    const el = document.getElementById(id);
    const diff = cur - prev;
    const pct = prev === 0 ? 0 : (diff / prev) * 100;
    
    let isGood = isInverseGood ? diff <= 0 : diff >= 0;
    el.className = `summary-change ${isGood ? 'positive' : 'negative'}`;
    
    const sign = diff > 0 ? '▲ +' : '▼ ';
    if (id === 'sm-collDelta') {
      el.textContent = `${sign}${diff.toFixed(2)} pp ${!isGood ? '(Needs Attention)' : ''}`;
    } else {
      el.textContent = `${sign}${fmt.num(diff)} (${pct > 0 ? '+' : ''}${pct.toFixed(1)}%)`;
    }
  };

  setDelta('sm-casesDelta', aprCases, marCases);
  setDelta('sm-repayDelta', aprRepay, marRepay);
  setDelta('sm-collDelta', aprColl, marColl);
  setDelta('sm-openDelta', aprOpen, marOpen, true); // more open cases = bad

  document.getElementById('sourceFile').textContent = state.src;
  updateInsights(aprCases, marCases, aprColl, marColl, aprOpen, marOpen);
}

// ── KEY POINTS & LACKS ──
function updateInsights(aprCases, marCases, aprColl, marColl, aprOpen, marOpen) {
  const pointsList = document.getElementById('keyPointsList');
  const lacksList = document.getElementById('lacksList');
  pointsList.innerHTML = ''; lacksList.innerHTML = '';

  // Calculate worst performing branch
  let worstDrop = 0, worstBranch = '';
  state.data.forEach(r => {
    let drop = r.mar.coll - r.apr.coll;
    if (drop > worstDrop) { worstDrop = drop; worstBranch = r.name; }
  });

  // Calculate highest volume branch
  let maxRepay = 0, bestBranch = '';
  state.data.forEach(r => {
    if (r.apr.repay > maxRepay) { maxRepay = r.apr.repay; bestBranch = r.name; }
  });

  // Key Points
  pointsList.innerHTML += `<li>Total processing volume increased by <strong>${fmt.num(aprCases - marCases)}</strong> cases in April compared to March.</li>`;
  pointsList.innerHTML += `<li><strong>${bestBranch}</strong> generated the highest absolute repayment in April (${fmt.inr(maxRepay)}).</li>`;
  pointsList.innerHTML += `<li>Total portfolio repayment grew by <strong>14.6%</strong> month-over-month.</li>`;

  // Where we lack
  lacksList.innerHTML += `<li>Overall Collection efficiency dropped by <strong>${(marColl - aprColl).toFixed(2)}%</strong> across the board.</li>`;
  if (worstBranch) lacksList.innerHTML += `<li><strong>${worstBranch}</strong> suffered the largest drop in collection efficiency (-${worstDrop.toFixed(2)}%).</li>`;
  lacksList.innerHTML += `<li>Uncollected Open Cases surged by <strong>${fmt.num(aprOpen - marOpen)}</strong> cases. Immediate follow-ups required.</li>`;
}

// ── CHARTS ──
Chart.defaults.color = '#94a3b8';
Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(15,17,23,0.9)';
Chart.defaults.plugins.tooltip.titleColor = '#fff';
Chart.defaults.plugins.tooltip.padding = 12;

function renderCharts() {
  const labels = state.data.map(r => r.name);

  const createChart = (id, type, config) => {
    if (charts[id]) charts[id].destroy();
    charts[id] = new Chart(document.getElementById(id), { type, ...config });
  };

  // 1. Repay Chart (Grouped Bar)
  createChart('repayChart', 'bar', {
    data: {
      labels,
      datasets: [
        { label: 'April Repay', data: state.data.map(r => r.apr.repay), backgroundColor: PAL.apr, borderRadius: 4 },
        { label: 'March Repay', data: state.data.map(r => r.mar.repay), backgroundColor: PAL.mar, borderRadius: 4 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: { y: { ticks: { callback: v => fmt.inr(v) }, grid: { color: 'rgba(255,255,255,0.05)' } }, x: { grid: { display: false } } },
      plugins: { legend: { position: 'top' }, tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${fmt.inr(c.raw)}` } } }
    }
  });

  // 2. Collection % Chart (Line with fill)
  createChart('collChart', 'line', {
    data: {
      labels,
      datasets: [
        { label: 'April %', data: state.data.map(r => r.apr.coll), borderColor: PAL.apr, backgroundColor: PAL.aprAlpha, fill: true, tension: 0.4 },
        { label: 'March %', data: state.data.map(r => r.mar.coll), borderColor: PAL.mar, backgroundColor: 'transparent', borderDash: [5, 5], tension: 0.4 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: { y: { min: 40, max: 100, ticks: { callback: v => v + '%' }, grid: { color: 'rgba(255,255,255,0.05)' } } },
      plugins: { tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${c.raw.toFixed(2)}%` } } }
    }
  });

  // 3. Open vs Closed (Stacked Bar)
  createChart('casesChart', 'bar', {
    data: {
      labels,
      datasets: [
        { label: 'Apr Closed', data: state.data.map(r => r.apr.closed), backgroundColor: '#10b981' },
        { label: 'Apr Open', data: state.data.map(r => r.apr.open), backgroundColor: '#ef4444' }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: { x: { stacked: true, grid:{display:false} }, y: { stacked: true, grid: { color: 'rgba(255,255,255,0.05)' } } }
    }
  });

  // 4. MoM Drop/Growth (Waterfall/Bar)
  createChart('deltaChart', 'bar', {
    data: {
      labels,
      datasets: [{
        label: 'MoM % Change',
        data: state.data.map(r => r.apr.coll - r.mar.coll),
        backgroundColor: ctx => ctx.raw >= 0 ? '#10b981' : '#ef4444',
        borderRadius: 4
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ` Change: ${c.raw > 0 ? '+' : ''}${c.raw.toFixed(2)}%` } } },
      scales: { y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { callback: v => v + '%' } }, x: { grid: { display: false } } }
    }
  });

  // 5. Pending Amount
  createChart('pendingChart', 'bar', {
    data: {
      labels,
      datasets: [
        { label: 'April Pending', data: state.data.map(r => r.apr.pending), backgroundColor: 'rgba(239,68,68,0.8)' },
        { label: 'March Pending', data: state.data.map(r => r.mar.pending), backgroundColor: 'rgba(244,114,182,0.4)' }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: { y: { ticks: { callback: v => fmt.inr(v) }, grid: { color: 'rgba(255,255,255,0.05)' } }, x: { grid: { display: false } } },
      plugins: { tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${fmt.inr(c.raw)}` } } }
    }
  });
}

// ── TABLE ──
function renderTable() {
  const tbody = document.getElementById('tableBody');
  tbody.innerHTML = '';

  state.data.forEach(r => {
    const mom = r.apr.coll - r.mar.coll;
    const momClass = mom >= 0 ? 'badge-good' : 'badge-low';
    
    tbody.innerHTML += `
      <tr>
        <td><strong>${r.name}</strong></td>
        <td class="apr-col">${fmt.num(r.apr.total)}</td>
        <td class="apr-col">${fmt.num(r.apr.open)}</td>
        <td class="apr-col">${fmt.num(r.apr.closed)}</td>
        <td class="apr-col">${fmt.inr(r.apr.repay)}</td>
        <td class="apr-col"><strong>${fmt.pct(r.apr.coll)}</strong></td>
        
        <td class="mar-col">${fmt.num(r.mar.total)}</td>
        <td class="mar-col">${fmt.num(r.mar.open)}</td>
        <td class="mar-col">${fmt.num(r.mar.closed)}</td>
        <td class="mar-col">${fmt.inr(r.mar.repay)}</td>
        <td class="mar-col"><strong>${fmt.pct(r.mar.coll)}</strong></td>
        
        <td><span class="badge-pct ${momClass}">${mom > 0 ? '+' : ''}${mom.toFixed(2)}%</span></td>
      </tr>
    `;
  });

  // Grand Total
  const sum = (month, key) => state.data.reduce((s, r) => s + (r[month][key] || 0), 0);
  const aRp = sum('apr','repay'), aPd = sum('apr','pending'), aCl = ((aRp - aPd) / aRp) * 100;
  const mRp = sum('mar','repay'), mPd = sum('mar','pending'), mCl = ((mRp - mPd) / mRp) * 100;
  const gtMom = aCl - mCl;

  tbody.innerHTML += `
    <tr class="grand-total">
      <td>Grand Total</td>
      <td class="apr-col">${fmt.num(sum('apr','total'))}</td>
      <td class="apr-col">${fmt.num(sum('apr','open'))}</td>
      <td class="apr-col">${fmt.num(sum('apr','closed'))}</td>
      <td class="apr-col">${fmt.inr(aRp)}</td>
      <td class="apr-col">${fmt.pct(aCl)}</td>
      
      <td class="mar-col">${fmt.num(sum('mar','total'))}</td>
      <td class="mar-col">${fmt.num(sum('mar','open'))}</td>
      <td class="mar-col">${fmt.num(sum('mar','closed'))}</td>
      <td class="mar-col">${fmt.inr(mRp)}</td>
      <td class="mar-col">${fmt.pct(mCl)}</td>
      
      <td><span class="badge-pct ${gtMom >= 0 ? 'badge-good' : 'badge-low'}">${gtMom > 0 ? '+' : ''}${gtMom.toFixed(2)}%</span></td>
    </tr>
  `;
}

// ── UPLOAD TO CLOUD (Parses Excel & pushes to Firebase) ──
document.getElementById('fileUpload').addEventListener('change', async function(e) {
  const file = e.target.files[0];
  if (!file) return;

  const btnLbl = document.getElementById('uploadBtnLabel');
  btnLbl.innerHTML = '⏳ Uploading to Cloud...';
  
  try {
    if (!window.XLSX) await loadSheetJS();

    const buf = await file.arrayBuffer();
    const parsedData = parseExcelBuffer(buf, file.name);
    
    // Push data to Firebase Realtime Database
    await db.ref('dashboard_data').set({
      timestamp: new Date().toLocaleString('en-IN'),
      source: file.name,
      branches: parsedData
    });

    toast('☁️✅ Successfully uploaded exact data to Firebase Cloud!');
  } catch (err) {
    console.error(err);
    toast('❌ Error pushing to cloud: ' + err.message);
  }
  btnLbl.innerHTML = '<svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> ☁️ Upload to Cloud';
  e.target.value = '';
});

// ── EXCEL PARSING LOGIC ──
async function loadSheetJS() {
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
    s.onload = res; s.onerror = rej; document.head.appendChild(s);
  });
}

function parseExcelBuffer(buf, filename) {
  const wb = XLSX.read(buf, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]]; // Assume first sheet
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1 });

  const newData = [];
  // Data starts at row index 2, goes until "Grand Total"
  for (let i = 2; i < raw.length; i++) {
    const r = raw[i];
    if (!r || !r[0] || String(r[0]).includes('Grand Total')) break;
    
    newData.push({
      name: String(r[0]),
      apr: {
        total: Number(r[1]||0), open: Number(r[2]||0), closed: Number(r[3]||0),
        repay: Number(r[4]||0), pending: Number(r[5]||0), coll: Number(r[6]||0) * 100
      },
      mar: {
        total: Number(r[10]||0), open: Number(r[11]||0), closed: Number(r[12]||0),
        repay: Number(r[13]||0), pending: Number(r[14]||0), coll: Number(r[15]||0) * 100
      }
    });
  }

  if (newData.length === 0) throw new Error("No branch data found in sheet.");
  return newData;
}

// ── LISTEN TO FIREBASE CLOUD DATA ──
function listenToCloud() {
  const statusEl = document.getElementById('cloudStatus');
  
  db.ref('dashboard_data').on('value', (snapshot) => {
    const data = snapshot.val();
    if (data && data.branches) {
      state.data = data.branches;
      state.src = data.source + " (Updated " + data.timestamp + ")";
      updateKPIs();
      renderCharts();
      renderTable();
      statusEl.textContent = 'CLOUD SYNCED';
      statusEl.style.color = '#10b981';
      toast('☁️ Cloud data synced successfully.');
    } else {
      state.data = DEFAULT_DATA;
      state.src = 'Waiting for first Cloud Upload...';
      updateKPIs();
      renderCharts();
      renderTable();
      statusEl.textContent = 'NO CLOUD DATA';
      statusEl.style.color = '#f59e0b';
      toast('⚠️ Showing default data. Please upload an Excel file to the cloud.');
    }
  }, (error) => {
    console.error("Firebase read error:", error);
    statusEl.textContent = 'CLOUD ERROR';
    statusEl.style.color = '#ef4444';
  });
}

// ── CSV EXPORT ──
document.getElementById('exportBtn').addEventListener('click', () => {
  const lines = ['Branch,Apr Cases,Apr Open,Apr Closed,Apr Repay,Apr Coll %,Mar Cases,Mar Open,Mar Closed,Mar Repay,Mar Coll %,MoM Diff %'];
  state.data.forEach(r => {
    lines.push(`${r.name},${r.apr.total},${r.apr.open},${r.apr.closed},${r.apr.repay},${r.apr.coll.toFixed(2)},${r.mar.total},${r.mar.open},${r.mar.closed},${r.mar.repay},${r.mar.coll.toFixed(2)},${(r.apr.coll-r.mar.coll).toFixed(2)}`);
  });
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `EasyRupee_Comparison_${Date.now()}.csv`;
  a.click();
});

// ── INIT ──
function init() {
  // Start listening to the Firebase Realtime Database
  listenToCloud();
}

window.addEventListener('DOMContentLoaded', init);

document.addEventListener("DOMContentLoaded", () => {
  const page = location.pathname.split("/").pop() || "";
  if (page === "rekap-bulanan.html") initMobileMonthlyLinks();
  if (page === "rekap-mingguan.html") initMobileMonthlyDetail();
});

let currentMobileMonthlyReport = null;

function initMobileMonthlyLinks() {
  const now = new Date();
  let year = Number(new URLSearchParams(location.search).get("year")) || now.getFullYear();
  const yearButton = document.querySelector(".academic-year-control button:first-child");
  const pickerButton = document.querySelector(".academic-year-control button:last-child");

  if (pickerButton) {
    pickerButton.textContent = "Pilih Tahun";
    pickerButton.addEventListener("click", () => {
      const value = prompt("Tahun laporan:", String(year));
      const nextYear = Number(value);
      if (!Number.isInteger(nextYear) || nextYear < 2000 || nextYear > 2100) return;
      year = nextYear;
      updateMobileMonthLinks(year, yearButton);
    });
  }

  updateMobileMonthLinks(year, yearButton);
}

function updateMobileMonthLinks(year, yearButton) {
  if (yearButton) {
    const icon = yearButton.querySelector("svg")?.outerHTML || "";
    yearButton.innerHTML = `${icon}${year}`;
  }

  document.querySelectorAll(".month-list a").forEach((link) => {
    const month = Number(link.querySelector("span")?.textContent || 0);
    if (month) link.href = `rekap-mingguan.html?year=${year}&month=${month}`;
  });
}

async function initMobileMonthlyDetail() {
  const params = new URLSearchParams(location.search);
  const now = new Date();
  const year = Number(params.get("year")) || now.getFullYear();
  const month = Number(params.get("month")) || now.getMonth() + 1;
  const tbody = document.querySelector(".weekly-table tbody");

  setMobileReportLoading();

  try {
    const data = await sihadirFetch(`/reports/monthly-detail.php?year=${year}&month=${month}`);
    renderMobileMonthlyDetail(data);
  } catch (error) {
    if (tbody) tbody.innerHTML = `<tr><th>Gagal memuat</th><td class="empty-cell">${escapeMobileReport(error.message || "Error")}</td></tr>`;
  }
}

function setMobileReportLoading() {
  const tbody = document.querySelector(".weekly-table tbody");
  if (tbody) tbody.innerHTML = '<tr><th><strong>Memuat...</strong><small>Laporan</small></th><td class="hadir">...</td></tr>';
}

function renderMobileMonthlyDetail(data) {
  const table = document.querySelector(".weekly-table");
  if (!table) return;

  currentMobileMonthlyReport = data;
  renderMobileReportHeader(data);
  renderMobileReportHead(table, data.days || []);
  renderMobileReportRows(table, data.items || [], data.days || []);
  bindMobileReportSearch(table);
  bindMobileReportExport();
}

function renderMobileReportHeader(data) {
  const monthName = mobileReportMonthName(data.month);
  const title = document.querySelector(".weekly-topbar h1");
  const filters = document.querySelectorAll(".weekly-filters button");
  const back = document.querySelector(".weekly-topbar a");

  if (title) title.textContent = "Detail Laporan";
  if (back) back.href = `rekap-bulanan.html?year=${data.year}`;
  if (filters[0]) filters[0].textContent = data.class_name || "Kelas";
  if (filters[1]) filters[1].textContent = `${monthName} ${data.year}`;
  if (filters[2]) filters[2].textContent = "Approved";
}

function renderMobileReportHead(table, days) {
  const thead = table.querySelector("thead");
  if (!thead) return;

  table.style.width = `${Math.max(520, 92 + (days.length * 26) + 104)}px`;
  thead.innerHTML = `
    <tr>
      <th rowspan="2" class="student-column">Siswa</th>
      <th colspan="${days.length}">Tanggal</th>
      <th colspan="4">Total</th>
    </tr>
    <tr>
      ${days.map((day) => `<th>${day.day}</th>`).join("")}
      <th>H</th><th>S</th><th>I</th><th>A</th>
    </tr>
  `;
}

function renderMobileReportRows(table, items, days) {
  const tbody = table.querySelector("tbody");
  const footer = document.querySelector(".weekly-table-footer span");
  if (!tbody) return;

  if (!items.length) {
    tbody.innerHTML = `<tr><th class="mobile-report-empty" colspan="${days.length + 5}"><strong>Belum ada data laporan</strong><small>Data muncul setelah absensi disetujui.</small></th></tr>`;
    if (footer) footer.textContent = "Menampilkan 0 siswa";
    return;
  }

  tbody.innerHTML = items.map((student) => `
    <tr data-report-row data-key="${escapeMobileReport(`${student.name} ${student.nis}`).toLowerCase()}">
      <th><strong>${escapeMobileReport(student.name)}</strong><small>${escapeMobileReport(student.nis)}</small></th>
      ${(student.daily || []).map((day) => mobileStatusCell(day.status)).join("")}
      <td class="hadir">${student.summary?.hadir || 0}</td>
      <td class="sakit">${student.summary?.sakit || 0}</td>
      <td class="izin">${student.summary?.izin || 0}</td>
      <td class="alpha">${student.summary?.alpha || 0}</td>
    </tr>
  `).join("");

  if (footer) footer.textContent = `Menampilkan ${items.length} siswa`;
}

function mobileStatusCell(status) {
  const labels = { hadir: "✓", sakit: "+", izin: "o", alpha: "×" };
  if (!status) return '<td class="empty-cell"></td>';
  const safeStatus = ["hadir", "sakit", "izin", "alpha"].includes(status) ? status : "";
  if (!safeStatus) return '<td class="empty-cell"></td>';
  return `<td class="${safeStatus}">${labels[safeStatus]}</td>`;
}

function bindMobileReportSearch(table) {
  const input = document.querySelector(".weekly-search input");
  if (!input) return;

  input.addEventListener("input", () => {
    const keyword = input.value.trim().toLowerCase();
    let visible = 0;

    table.querySelectorAll("[data-report-row]").forEach((row) => {
      const match = row.dataset.key.includes(keyword);
      row.style.display = match ? "" : "none";
      if (match) visible++;
    });

    const footer = document.querySelector(".weekly-table-footer span");
    if (footer) footer.textContent = `Menampilkan ${visible} siswa`;
  });
}

function bindMobileReportExport() {
  const button = document.querySelector(".export-pdf-button");
  if (!button || button.dataset.reportBound) return;
  button.dataset.reportBound = "1";
  button.addEventListener("click", (event) => {
    event.preventDefault();
    if (!currentMobileMonthlyReport) return;
    button.classList.add("is-exporting");
    exportMobileReportPdf(currentMobileMonthlyReport);
    setTimeout(() => {
      button.classList.remove("is-exporting");
    }, 500);
  });
}

function exportMobileReportPdf(data) {
  const keyword = document.querySelector(".weekly-search input")?.value?.trim().toLowerCase() || "";
  const items = (data.items || []).filter((student) => `${student.name} ${student.nis}`.toLowerCase().includes(keyword));
  const period = `${mobileReportMonthName(data.month)} ${data.year}`;
  const doc = window.open("", "_blank", "width=1200,height=800");

  if (!doc) {
    alert("Popup diblokir. Izinkan popup untuk export PDF.");
    return;
  }

  doc.document.write(buildMobileReportPrintHtml({ period, className: data.class_name || "-", days: data.days || [], items }));
  doc.document.close();
  doc.focus();
  setTimeout(() => {
    doc.print();
    doc.close();
  }, 250);
}

function buildMobileReportPrintHtml({ period, className, days, items }) {
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>SIHADIR - ${escapeMobileReport(period)} - ${escapeMobileReport(className)}</title>
  <style>
    @page { size: A4 landscape; margin: 10mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { margin: 0; color: #111827; font-family: Arial, sans-serif; font-size: 9px; }
    .report-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; border-bottom: 2px solid #111827; padding-bottom: 8px; }
    h1 { margin: 0 0 4px; font-size: 18px; text-transform: uppercase; letter-spacing: 0; }
    .meta { display: grid; grid-template-columns: 68px 1fr; gap: 3px 8px; font-size: 10px; }
    .legend { display: flex; gap: 8px; justify-content: flex-end; margin-top: 6px; font-size: 9px; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    th, td { border: 1px solid #4b5563; padding: 3px 2px; text-align: center; vertical-align: middle; }
    th { background: #e5e7eb; font-weight: 700; }
    .student { width: 38mm; text-align: left; }
    .name { display: block; font-weight: 700; font-size: 8px; }
    .nis { display: block; margin-top: 2px; color: #374151; font-size: 7px; }
    .day { width: 5.8mm; }
    .total { width: 7mm; font-weight: 700; }
    .s-hadir { background: #dcfce7; color: #166534; }
    .s-sakit { background: #ffedd5; color: #9a3412; }
    .s-izin { background: #dbeafe; color: #1d4ed8; }
    .s-alpha { background: #fee2e2; color: #991b1b; }
    .empty { background: #ffffff; color: #ffffff; }
    .foot { margin-top: 8px; display: flex; justify-content: space-between; color: #374151; font-size: 9px; }
  </style>
</head>
<body>
  <header class="report-head">
    <div>
      <h1>Laporan Kehadiran Siswa</h1>
      <div class="meta">
        <span>Kelas</span><strong>${escapeMobileReport(className)}</strong>
        <span>Periode</span><strong>${escapeMobileReport(period)}</strong>
        <span>Total siswa</span><strong>${items.length}</strong>
      </div>
    </div>
    <div>
      <strong>SIHADIR</strong>
      <div class="legend"><span>H=Hadir</span><span>S=Sakit</span><span>I=Izin</span><span>A=Alpha</span></div>
    </div>
  </header>
  <table>
    <thead>
      <tr>
        <th rowspan="2" class="student">Siswa</th>
        <th colspan="${days.length}">Tanggal</th>
        <th colspan="4">Total</th>
      </tr>
      <tr>
        ${days.map((day) => `<th class="day">${day.day}</th>`).join("")}
        <th class="total">H</th><th class="total">S</th><th class="total">I</th><th class="total">A</th>
      </tr>
    </thead>
    <tbody>
      ${items.length ? items.map((student) => `
        <tr>
          <td class="student"><span class="name">${escapeMobileReport(student.name)}</span><span class="nis">${escapeMobileReport(student.nis)}</span></td>
          ${(student.daily || []).map((day) => mobileReportPrintStatusCell(day.status)).join("")}
          <td class="total">${student.summary?.hadir || 0}</td>
          <td class="total">${student.summary?.sakit || 0}</td>
          <td class="total">${student.summary?.izin || 0}</td>
          <td class="total">${student.summary?.alpha || 0}</td>
        </tr>
      `).join("") : `<tr><td colspan="${days.length + 5}">Tidak ada data laporan.</td></tr>`}
    </tbody>
  </table>
  <div class="foot"><span>Dicetak: ${escapeMobileReport(new Date().toLocaleString("id-ID"))}</span><span>Generated by SIHADIR</span></div>
</body>
</html>`;
}

function mobileReportPrintStatusCell(status) {
  const labels = { hadir: "H", sakit: "S", izin: "I", alpha: "A" };
  const safeStatus = ["hadir", "sakit", "izin", "alpha"].includes(status) ? status : "";
  if (!safeStatus) return '<td class="empty">-</td>';
  return `<td class="s-${safeStatus}">${labels[safeStatus]}</td>`;
}

function mobileReportMonthName(month) {
  return ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"][Number(month) - 1] || "-";
}

function escapeMobileReport(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" }[char]));
}

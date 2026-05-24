document.addEventListener("DOMContentLoaded", () => {
  const page = location.pathname.split("/").pop() || "";
  if (page === "rekap-bulanan-guru.html") initMonthlyLinks();
  if (page === "detail-kehadiran-guru.html") initMonthlyDetail();
});

let currentMonthlyReport = null;

function initMonthlyLinks() {
  const year = new Date().getFullYear();
  const select = document.querySelector(".year-dropdown select");
  const badge = document.querySelector(".year-badge");

  if (select) {
    select.innerHTML = [year - 1, year, year + 1]
      .map((item) => `<option value="${item}"${item === year ? " selected" : ""}>${item}</option>`)
      .join("");
    select.addEventListener("change", () => updateMonthLinks(Number(select.value) || year));
  }

  if (badge) {
    const icon = badge.querySelector("svg")?.outerHTML || "";
    badge.innerHTML = `${icon}${year}`;
  }

  updateMonthLinks(year);
}

function updateMonthLinks(year) {
  document.querySelectorAll(".month-card").forEach((card) => {
    const month = Number(card.querySelector(".month-number")?.textContent || 0);
    if (!month) return;
    card.href = `detail-kehadiran-guru.html?year=${year}&month=${month}`;
  });

  const badge = document.querySelector(".year-badge");
  if (badge) {
    const icon = badge.querySelector("svg")?.outerHTML || "";
    badge.innerHTML = `${icon}${year}`;
  }
}

async function initMonthlyDetail() {
  const params = new URLSearchParams(location.search);
  const now = new Date();
  const year = Number(params.get("year")) || now.getFullYear();
  const month = Number(params.get("month")) || now.getMonth() + 1;

  try {
    const data = await sihadirFetch(`/reports/monthly-detail.php?year=${year}&month=${month}`);
    renderMonthlyDetail(data);
  } catch (error) {
    const tbody = document.querySelector(".detail-table tbody");
    if (tbody) tbody.innerHTML = `<tr><td class="col-siswa" colspan="32">${escapeReport(error.message || "Gagal memuat laporan")}</td></tr>`;
  }
}

function renderMonthlyDetail(data) {
  const table = document.querySelector(".detail-table");
  if (!table) return;

  currentMonthlyReport = data;
  renderReportHeader(data);
  renderReportTableHead(table, data.days || []);
  renderReportRows(table, data.items || [], data.days || []);
  bindReportSearch(table);
  bindReportExport();
}

function renderReportHeader(data) {
  const monthName = reportMonthName(data.month);
  const title = document.querySelector(".detail-title");
  const subtitle = document.querySelector(".detail-subtitle");

  if (title) title.textContent = "Detail Kehadiran Siswa";
  if (subtitle) subtitle.textContent = `${monthName} ${data.year} - ${data.class_name || "-"}`;
}

function renderReportTableHead(table, days) {
  const thead = table.querySelector("thead");
  if (!thead) return;

  thead.innerHTML = `
    <tr>
      <th rowspan="2" class="col-siswa">Siswa<br><span class="sub-th">Nama Lengkap & NIS</span></th>
      <th colspan="${days.length}">Tanggal</th>
      <th colspan="4">Total</th>
    </tr>
    <tr class="days-row">
      ${days.map((day) => `<th>${day.day}</th>`).join("")}
      <th>H</th><th>S</th><th>I</th><th>A</th>
    </tr>
  `;
}

function renderReportRows(table, items, days) {
  const tbody = table.querySelector("tbody");
  const footer = document.querySelector(".showing-text");
  if (!tbody) return;

  if (!items.length) {
    tbody.innerHTML = `<tr><td class="col-siswa report-empty" colspan="${days.length + 5}"><div class="report-empty-box"><strong>Belum ada data laporan</strong><span>Data akan muncul setelah absensi siswa disetujui guru.</span></div></td></tr>`;
    if (footer) footer.textContent = "Menampilkan 0 siswa";
    return;
  }

  tbody.innerHTML = items.map((student) => `
    <tr data-report-row data-key="${escapeReport(`${student.name} ${student.nis}`).toLowerCase()}">
      <td class="col-siswa">
        <div class="student-name">${escapeReport(student.name)}</div>
        <div class="student-nis">${escapeReport(student.nis)}</div>
      </td>
      ${(student.daily || []).map((day) => reportStatusCell(day.status)).join("")}
      <td>${student.summary?.hadir || 0}</td>
      <td>${student.summary?.sakit || 0}</td>
      <td>${student.summary?.izin || 0}</td>
      <td>${student.summary?.alpha || 0}</td>
    </tr>
  `).join("");

  if (footer) footer.textContent = `Menampilkan ${items.length} siswa`;
}

function reportStatusCell(status) {
  const labels = { hadir: "✓", sakit: "+", izin: "i", alpha: "×" };
  if (!status) return '<td><div class="status-cell status-empty"></div></td>';
  const safeStatus = ["hadir", "sakit", "izin", "alpha"].includes(status) ? status : "";
  if (!safeStatus) return '<td><div class="status-cell status-empty"></div></td>';
  return `<td><div class="status-cell ${safeStatus}">${labels[safeStatus]}</div></td>`;
}

function bindReportSearch(table) {
  const input = document.querySelector(".detail-search input");
  if (!input) return;

  input.addEventListener("input", () => {
    const keyword = input.value.trim().toLowerCase();
    let visible = 0;

    table.querySelectorAll("[data-report-row]").forEach((row) => {
      const match = row.dataset.key.includes(keyword);
      row.style.display = match ? "" : "none";
      if (match) visible++;
    });

    const footer = document.querySelector(".showing-text");
    if (footer) footer.textContent = `Menampilkan ${visible} siswa`;
  });
}

function bindReportExport() {
  const button = document.querySelector(".fab-export");
  if (button && !button.dataset.reportBound) {
    button.dataset.reportBound = "1";
    button.addEventListener("click", () => {
      if (!currentMonthlyReport) return;
      button.disabled = true;
      button.classList.add("is-exporting");
      exportReportPdf(currentMonthlyReport);
      setTimeout(() => {
        button.disabled = false;
        button.classList.remove("is-exporting");
      }, 500);
    });
  }
}

function exportReportPdf(data) {
  const keyword = document.querySelector(".detail-search input")?.value?.trim().toLowerCase() || "";
  const items = (data.items || []).filter((student) => `${student.name} ${student.nis}`.toLowerCase().includes(keyword));
  const title = `Laporan Kehadiran Siswa`;
  const period = `${reportMonthName(data.month)} ${data.year}`;
  const doc = window.open("", "_blank", "width=1200,height=800");

  if (!doc) {
    alert("Popup diblokir. Izinkan popup untuk export PDF.");
    return;
  }

  doc.document.write(buildReportPrintHtml({ title, period, className: data.class_name || "-", days: data.days || [], items }));
  doc.document.close();
  doc.focus();
  setTimeout(() => {
    doc.print();
    doc.close();
  }, 250);
}

function buildReportPrintHtml({ title, period, className, days, items }) {
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>SIHADIR - ${escapeReport(period)} - ${escapeReport(className)}</title>
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
      <h1>${escapeReport(title)}</h1>
      <div class="meta">
        <span>Kelas</span><strong>${escapeReport(className)}</strong>
        <span>Periode</span><strong>${escapeReport(period)}</strong>
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
          <td class="student"><span class="name">${escapeReport(student.name)}</span><span class="nis">${escapeReport(student.nis)}</span></td>
          ${(student.daily || []).map((day) => reportPrintStatusCell(day.status)).join("")}
          <td class="total">${student.summary?.hadir || 0}</td>
          <td class="total">${student.summary?.sakit || 0}</td>
          <td class="total">${student.summary?.izin || 0}</td>
          <td class="total">${student.summary?.alpha || 0}</td>
        </tr>
      `).join("") : `<tr><td colspan="${days.length + 5}">Tidak ada data laporan.</td></tr>`}
    </tbody>
  </table>
  <div class="foot"><span>Dicetak: ${escapeReport(new Date().toLocaleString("id-ID"))}</span><span>Generated by SIHADIR</span></div>
</body>
</html>`;
}

function reportPrintStatusCell(status) {
  const labels = { hadir: "H", sakit: "S", izin: "I", alpha: "A" };
  const safeStatus = ["hadir", "sakit", "izin", "alpha"].includes(status) ? status : "";
  if (!safeStatus) return '<td class="empty">-</td>';
  return `<td class="s-${safeStatus}">${labels[safeStatus]}</td>`;
}

function reportMonthName(month) {
  return ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"][Number(month) - 1] || "-";
}

function escapeReport(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" }[char]));
}

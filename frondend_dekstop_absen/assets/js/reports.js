document.addEventListener("DOMContentLoaded", () => {
  const page = location.pathname.split("/").pop() || "";
  if (page === "rekap-bulanan-guru.html") initMonthlyLinks();
  if (page === "detail-kehadiran-guru.html") initMonthlyDetail();
});

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
    button.addEventListener("click", () => window.print());
  }
}

function reportMonthName(month) {
  return ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"][Number(month) - 1] || "-";
}

function escapeReport(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" }[char]));
}

document.addEventListener("DOMContentLoaded", () => {
  const page = location.pathname.split("/").pop() || "";
  if (page === "rekap-bulanan.html") initMobileMonthlyLinks();
  if (page === "rekap-mingguan.html") initMobileMonthlyDetail();
});

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
    if (tbody) tbody.innerHTML = `<tr><th>Gagal memuat</th><td class="alpha">${escapeMobileReport(error.message || "Error")}</td></tr>`;
  }
}

function setMobileReportLoading() {
  const tbody = document.querySelector(".weekly-table tbody");
  if (tbody) tbody.innerHTML = '<tr><th><strong>Memuat...</strong><small>Laporan</small></th><td class="hadir">...</td></tr>';
}

function renderMobileMonthlyDetail(data) {
  const table = document.querySelector(".weekly-table");
  if (!table) return;

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
    tbody.innerHTML = `<tr><th><strong>Belum ada siswa</strong><small>-</small></th><td class="alpha" colspan="${days.length + 4}">×</td></tr>`;
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
  const safeStatus = ["hadir", "sakit", "izin", "alpha"].includes(status) ? status : "alpha";
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
    window.print();
  });
}

function mobileReportMonthName(month) {
  return ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"][Number(month) - 1] || "-";
}

function escapeMobileReport(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" }[char]));
}

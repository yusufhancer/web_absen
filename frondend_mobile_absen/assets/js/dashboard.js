document.addEventListener("DOMContentLoaded", async () => {
  const page = location.pathname.split("/").pop() || "";
  const protectedPage = /^(dashboard|profile|leaderboard|permintaan|rekap|detail|absen|settings)/.test(page);
  if (!protectedPage) return;

  let me;
  try {
    const data = await sihadirFetch("/auth/me.php");
    me = data.user;
    if (!me) throw new Error("Belum login");
  } catch (error) {
    location.href = location.pathname.includes("frondend_mobile_absen") ? "login.html" : "index.html";
    return;
  }

  if (!allowRolePage(page, me.role)) {
    location.href = sihadirRolePath(me.role, "dashboard");
    return;
  }

  renderUser(me);

  if (page === "dashboard.html") {
    startClock();
    await Promise.all([loadTodayStatus(), loadHistory(), loadLeaderboard()]);
  } else if (page.includes("leaderboard")) {
    await loadLeaderboard();
  }
});

function renderUser(me) {
  const className = me.class_name || "-";
  const roleLabel = roleTitle(me.role);

  sihadirText(".user-name", me.name);
  sihadirText(".user-class", className);
  sihadirText(".user-profile h4", me.name);
  sihadirText(".user-profile p", className);
  sihadirText(".profile-name, .student-name", me.name);
  sihadirText(".profile-class, .student-class", className);
  sihadirText(".profile-nis", `${me.role === "guru" ? "NIP" : "NIS"}: ${me.nis}`);
  sihadirText(".profile-badge", `${roleLabel} • ${className}`);

  document.querySelectorAll(".profile-role").forEach((el) => (el.textContent = roleLabel));
  document.querySelectorAll("[data-user-id]").forEach((el) => (el.textContent = me.id));
  document.querySelectorAll("[data-class-id]").forEach((el) => (el.textContent = me.class_id));

  const welcome = document.querySelector(".header-titles p");
  if (welcome) welcome.textContent = `Selamat datang kembali, ${me.name}.`;
}

function allowRolePage(page, role) {
  if (!page.includes("profile")) return true;
  if (page === "profile-guru.html") return role === "guru";
  if (page === "profile-ketua.html") return role === "ketua_kelas";
  if (page === "profile.html") return role === "pelajar";
  return true;
}

function roleTitle(role) {
  return { pelajar: "Pelajar", guru: "Guru", ketua_kelas: "Ketua Kelas" }[role] || title(role);
}

async function loadTodayStatus() {
  const data = await sihadirFetch("/attendances/today.php").catch(() => ({ attendance: null }));
  renderTodayStatus(data.attendance || null);
}

function renderTodayStatus(attendance) {
  const desktopBadge = document.querySelector(".badge-warning, .badge-success, .badge-danger");
  const mobileBadge = document.querySelector(".status-card span");
  const timeLimit = document.querySelector(".time-limit, .status-card p");
  const absenButton = document.querySelector(".btn-outline-white, .attendance-hero");

  let label = "Belum Absen";
  let detail = "Batas waktu: 08:00 WIB";
  let className = "badge-warning";
  let locked = false;

  if (attendance) {
    const time = formatTime(attendance.submitted_at);
    if (attendance.approval_status === "pending") {
      label = "Menunggu Review";
      detail = `Dikirim: ${time} WIB`;
      locked = true;
    } else if (attendance.approval_status === "approved") {
      label = "Sudah Absen";
      detail = `${title(attendance.status)} - ${time} WIB`;
      className = "badge-success";
      locked = true;
    } else if (attendance.approval_status === "rejected") {
      label = "Ditolak";
      detail = attendance.rejection_reason || "Absensi ditolak";
      className = "badge-danger";
      locked = true;
    }
  }

  if (desktopBadge) {
    desktopBadge.textContent = label;
    desktopBadge.className = className;
  }
  if (mobileBadge) mobileBadge.textContent = label;
  if (timeLimit) timeLimit.textContent = detail;
  if (absenButton && locked) {
    absenButton.removeAttribute("href");
    absenButton.removeAttribute("onclick");
    absenButton.style.pointerEvents = "none";
    absenButton.style.opacity = "0.75";
  }
}

async function loadHistory() {
  const data = await sihadirFetch("/attendances/history.php").catch(() => ({ items: [] }));
  renderHistory((data.items || []).slice(0, 5));
}

function renderHistory(items) {
  const desktop = document.querySelector(".history-list");
  const mobile = document.querySelector(".history-card");
  if (!desktop && !mobile) return;

  if (!items.length) {
    const empty = isMobile() ? '<article class="history-item"><div><h3>Belum ada riwayat</h3><p>Absensi terbaru akan tampil di sini</p></div></article>' : '<div class="history-card"><div class="history-details"><h4>Belum ada riwayat</h4><p>Absensi terbaru akan tampil di sini</p></div></div>';
    if (desktop) desktop.innerHTML = empty;
    if (mobile) mobile.innerHTML = empty;
    return;
  }

  if (desktop) desktop.innerHTML = items.slice(0, 5).map(historyDesktop).join("");
  if (mobile) mobile.innerHTML = items.slice(0, 3).map(historyMobile).join("");
}

function historyDesktop(item) {
  const danger = item.approval_status === "rejected" || item.status !== "hadir";
  const iconClass = danger ? "icon-danger" : "icon-success";
  const textClass = danger ? ' class="text-danger"' : "";
  return `<div class="history-card"><div class="${iconClass}">${historyIcon(danger)}</div><div class="history-details"><h4${textClass}>${historyTitle(item)}</h4><p>${formatDateTime(item.submitted_at)}</p></div></div>`;
}

function historyMobile(item) {
  const danger = item.approval_status === "rejected" || item.status !== "hadir";
  return `<article class="history-item"><span class="history-icon ${danger ? "danger" : "success"}">${historyIcon(danger)}</span><div><h3>${historyTitle(item)}</h3><p>${formatDateTime(item.submitted_at)}</p></div></article>`;
}

async function loadLeaderboard() {
  const data = await sihadirFetch("/leaderboard/today.php").catch(() => ({ items: [] }));
  renderLeaderboard(data.items || [], isMobile() ? 3 : 8);
}

function renderLeaderboard(items, limit) {
  const container = document.querySelector(".leaderboard-list, .leader-list, .ranking-list");
  if (!container) return;
  const rows = items.slice(0, limit);
  if (!rows.length) {
    container.innerHTML = isMobile() ? '<li class="leaderboard-item"><div><h3>Belum ada leaderboard</h3><p>Menunggu absen approved</p></div></li>' : '<div class="leaderboard-item"><div class="lb-details"><h4>Belum ada leaderboard</h4><span>Menunggu absen approved</span></div></div>';
    return;
  }
  container.innerHTML = rows.map((item, index) => isMobile() ? leaderboardMobile(item, index) : leaderboardDesktop(item, index)).join("");
}

function leaderboardDesktop(item, index) {
  const rankClass = index === 0 ? "rank rank-1" : "rank";
  const color = ["bg-pink", "bg-blue", "bg-indigo", "bg-green", "bg-orange", "bg-purple", "bg-red"][index % 7];
  return `<div class="leaderboard-item"><div class="${rankClass}">${index + 1}</div><div class="avatar-initial ${color}">${initial(item.name)}</div><div class="lb-details"><h4>${item.name}</h4><span>${formatTime(item.submitted_at)} WIB</span></div></div>`;
}

function leaderboardMobile(item, index) {
  const rankClass = index === 0 ? "rank rank-gold" : "rank";
  const color = ["avatar-red", "avatar-blue", "avatar-purple"][index % 3];
  return `<li class="leaderboard-item"><span class="${rankClass}">${index + 1}</span><span class="avatar-letter ${color}">${initial(item.name)}</span><div><h3>${item.name}</h3><p>${formatTime(item.submitted_at)} WIB</p></div></li>`;
}

function startClock() {
  const clock = document.querySelector(".current-time h2");
  if (!clock) return;
  const tick = () => {
    const now = new Date();
    clock.textContent = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false }).replace(".", ":");
  };
  tick();
  setInterval(tick, 1000);
}

function historyTitle(item) {
  const status = title(item.status);
  const approval = { pending: "Menunggu Review", approved: "Disetujui", rejected: "Ditolak" }[item.approval_status] || item.approval_status;
  return `${status} - ${approval}`;
}

function historyIcon(danger) {
  return danger ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>' : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>';
}

function formatTime(value) {
  return new Date(value).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false }).replace(".", ":");
}

function formatDateTime(value) {
  return new Date(value).toLocaleDateString("id-ID", { weekday: "long", day: "2-digit", month: "short" }) + ` - ${formatTime(value)} WIB`;
}

function title(value) {
  return String(value || "").charAt(0).toUpperCase() + String(value || "").slice(1);
}

function initial(name) {
  return String(name || "?").trim().charAt(0).toUpperCase() || "?";
}

function isMobile() {
  return location.pathname.includes("frondend_mobile_absen");
}


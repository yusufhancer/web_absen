const SIHADIR_API_BASE = "../api";

async function sihadirFetch(path, options = {}) {
  const response = await fetch(`${SIHADIR_API_BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const data = await response.json().catch(() => ({ success: false, message: "Response API tidak valid" }));
  if (!response.ok || data.success === false) throw new Error(data.message || "Request gagal");
  return data;
}

function sihadirRolePath(role, base = "dashboard") {
  if (role === "guru") return `${base}-guru.html`;
  if (role === "ketua_kelas") return `${base}-ketua.html`;
  return `${base}.html`;
}

function sihadirClassId(value) {
  const map = { "X PPLG 1": 1, "X PPLG 2": 2, "X PPLG 3": 3, "x-pplg-1": 1, "x-pplg-2": 2, "x-pplg-3": 3, X: 1, XI: 2, XII: 3, "10": 1, "11": 2, "12": 3 };
  return map[value] || Number(value) || 0;
}

function sihadirText(selector, value) {
  const el = document.querySelector(selector);
  if (el && value) el.textContent = value;
}

function sihadirToast(message) {
  alert(message);
}

const sihadirSkeleton = {
  isMobile: () => location.pathname.includes("frondend_mobile_absen"),
  page(page) {
    this.text();
    if (page === "dashboard.html") {
      this.status();
      this.history();
      this.leaderboard(this.isMobile() ? 3 : 8);
    }
    if (page === "dashboard-guru.html" || page === "dashboard-ketua.html") {
      this.history();
      this.review();
      this.leaderboard(this.isMobile() ? 3 : 8);
    }
    if (page.includes("leaderboard")) this.fullLeaderboard();
  },
  text() {
    document.querySelectorAll(".user-name, .user-class, .profile-name, .profile-class, .profile-nis, .profile-badge, .profile-role, [data-user-id], [data-class-id], .header-titles p").forEach((el) => {
      el.textContent = "";
      el.classList.add("skeleton-line", "skeleton-text-md");
    });
  },
  clearText() {
    document.querySelectorAll(".skeleton-line").forEach((el) => {
      if (!el.closest(".history-list, .history-card, .leaderboard-list, .leader-list, .ranking-list, .review-list, .podium-card, .podium, .monthly-list, .rankings-table, .pr-list, .review-request-list")) {
        el.classList.remove("skeleton-line", "skeleton-text-sm", "skeleton-text-md", "skeleton-text-lg");
      }
    });
  },
  status() {
    const badge = this.isMobile() ? document.querySelector(".status-card > span") : document.querySelector(".status-card .badge-warning, .status-card .badge-success, .status-card .badge-danger");
    const detail = this.isMobile() ? document.querySelector(".status-card > p") : document.querySelector(".status-card .time-limit");
    if (badge) {
      badge.textContent = "";
      badge.classList.add("skeleton-line", "skeleton-text-sm");
    }
    if (detail) {
      detail.textContent = "";
      detail.classList.add("skeleton-line", "skeleton-text-md");
    }
  },
  history() {
    const container = this.isMobile() ? document.querySelector(".history-card") : document.querySelector(".history-list");
    if (!container) return;
    container.innerHTML = Array.from({ length: this.isMobile() ? 3 : 4 }, () => this.isMobile()
      ? '<article class="history-item skeleton-row"><span class="skeleton-circle"></span><div><span class="skeleton-line skeleton-text-lg"></span><span class="skeleton-line skeleton-text-md"></span></div></article>'
      : '<div class="history-card skeleton-row"><span class="skeleton-circle"></span><div class="history-details"><span class="skeleton-line skeleton-text-lg"></span><span class="skeleton-line skeleton-text-md"></span></div></div>').join("");
  },
  leaderboard(limit = 5) {
    const container = document.querySelector(".leaderboard-list, .leader-list, .ranking-list");
    if (!container) return;
    container.innerHTML = Array.from({ length: Math.min(limit, this.isMobile() ? 3 : 8) }, () => this.isMobile()
      ? '<li class="leaderboard-item skeleton-row"><span class="skeleton-circle skeleton-rank"></span><span class="skeleton-circle"></span><div><span class="skeleton-line skeleton-text-lg"></span><span class="skeleton-line skeleton-text-sm"></span></div></li>'
      : '<div class="leaderboard-item skeleton-row"><span class="skeleton-circle skeleton-rank"></span><span class="skeleton-circle"></span><div class="lb-details"><span class="skeleton-line skeleton-text-lg"></span><span class="skeleton-line skeleton-text-sm"></span></div></div>').join("");
  },
  review() {
    const container = document.querySelector(".review-list");
    if (!container) return;
    container.innerHTML = Array.from({ length: 3 }, () => '<div class="review-card skeleton-row"><span class="skeleton-circle"></span><div class="review-details"><span class="skeleton-line skeleton-text-lg"></span><span class="skeleton-line skeleton-text-md"></span></div></div>').join("");
  },
  fullLeaderboard() {
    const tbody = document.querySelector(".rankings-table tbody");
    const podium = tbody ? document.querySelector(".podium-card") : null;
    const mobilePodium = document.querySelector(".podium");
    const monthlyList = document.querySelector(".monthly-list");
    if (podium) podium.innerHTML = Array.from({ length: 3 }, (_, index) => `<div class="podium-item podium-${index + 1} skeleton-row"><span class="skeleton-circle skeleton-avatar-lg"></span><span class="skeleton-line skeleton-text-md"></span><span class="skeleton-line skeleton-text-sm"></span></div>`).join("");
    if (mobilePodium) mobilePodium.innerHTML = Array.from({ length: 3 }, () => '<article class="podium-card skeleton-row"><span class="skeleton-circle skeleton-avatar-lg"></span><span class="skeleton-line skeleton-text-md"></span><span class="skeleton-line skeleton-text-sm"></span></article>').join("");
    if (tbody) tbody.innerHTML = Array.from({ length: 8 }, () => '<tr><td><span class="skeleton-line skeleton-text-sm"></span></td><td><span class="skeleton-line skeleton-text-lg"></span></td><td><span class="skeleton-line skeleton-text-md"></span></td><td><span class="skeleton-line skeleton-text-sm"></span></td></tr>').join("");
    if (monthlyList) monthlyList.innerHTML = Array.from({ length: 8 }, () => '<li class="skeleton-row"><span class="skeleton-circle skeleton-rank"></span><span class="skeleton-circle"></span><div><span class="skeleton-line skeleton-text-lg"></span><span class="skeleton-line skeleton-text-md"></span></div><span class="skeleton-line skeleton-text-sm"></span></li>').join("");
  },
};

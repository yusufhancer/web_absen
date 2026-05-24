document.addEventListener("DOMContentLoaded", () => {
  if (!/permintaan|review/.test(location.pathname)) return;
  loadPending();
});

async function loadPending() {
  const container = document.querySelector(".pr-list");
  const info = document.querySelector(".pr-list-info");
  if (!container) return;
  renderPendingSkeleton(container);
  updateReviewInfo(info, null);

  try {
    const data = await sihadirFetch("/attendances/pending.php");
    const items = data.items || [];
    renderPending(container, items);
    updateReviewInfo(info, items.length);
    bindReviewActions(container, info);
  } catch (error) {
    container.innerHTML = emptyReviewItem();
    updateReviewInfo(info, 0);
    sihadirToast(error.message || "Gagal memuat permintaan review");
  }
}

function renderPending(container, items) {
  if (!items.length) {
    container.innerHTML = emptyReviewItem();
    return;
  }

  container.innerHTML = items.map((item, index) => reviewItem(item, index)).join("");
}

function reviewItem(item, index) {
  const avatarClasses = ["pr-avatar-orange", "pr-avatar-blue", "pr-avatar-peach", "pr-avatar-gray", "pr-avatar-green"];
  const avatarClass = avatarClasses[index % avatarClasses.length];
  const statusLabel = statusText(item.status);
  const note = item.notes ? ` &bull; ${escapeHtml(item.notes)}` : "";

  return `
          <div class="pr-item" data-id="${item.id}">
            <div class="pr-avatar ${avatarClass}">${initials(item.nama_pelajar)}</div>
            <div class="pr-details">
              <div class="pr-item-name">${escapeHtml(item.nama_pelajar)}</div>
              <div class="pr-item-meta">${escapeHtml(item.class_name || item.kelas || "Kelas")} &bull; ${formatReviewTime(item.submitted_at)} &bull; ${statusLabel}${note}</div>
              <span class="pr-badge">MENUNGGU VERIFIKASI</span>
            </div>
            <div class="pr-actions">
              <button class="pr-btn-reject" data-action="reject" aria-label="Tolak absensi">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
              <button class="pr-btn-approve" data-action="approve" aria-label="Setujui absensi">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </button>
            </div>
          </div>`;
}

function emptyReviewItem() {
  return `
          <div class="pr-item">
            <div class="pr-avatar pr-avatar-gray">--</div>
            <div class="pr-details">
              <div class="pr-item-name">Tidak ada permintaan review</div>
              <div class="pr-item-meta">Semua absensi sudah diverifikasi</div>
              <span class="pr-badge">SELESAI</span>
            </div>
          </div>`;
}

function bindReviewActions(container, info) {
  container.onclick = async (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const item = button.closest(".pr-item[data-id]");
    if (!item) return;

    const id = item.dataset.id;
    const action = button.dataset.action;
    const buttons = item.querySelectorAll("button");
    buttons.forEach((btn) => (btn.disabled = true));

    try {
      if (action === "approve") {
        await sihadirFetch("/attendances/approve.php", { method: "POST", body: JSON.stringify({ id }) });
      } else {
        const reason = prompt("Alasan penolakan:");
        if (!reason) {
          buttons.forEach((btn) => (btn.disabled = false));
          return;
        }
        await sihadirFetch("/attendances/reject.php", { method: "POST", body: JSON.stringify({ id, reason }) });
      }

      item.remove();
      const remaining = container.querySelectorAll(".pr-item[data-id]").length;
      updateReviewInfo(info, remaining);
      if (remaining === 0) container.innerHTML = emptyReviewItem();
    } catch (error) {
      buttons.forEach((btn) => (btn.disabled = false));
      sihadirToast(error.message || "Review gagal diproses");
    }
  };
}

function updateReviewInfo(info, count) {
  if (!info) return;
  if (count === null) {
    info.textContent = "";
    info.classList.add("skeleton-line", "skeleton-text-md");
    return;
  }
  info.classList.remove("skeleton-line", "skeleton-text-md");
  info.textContent = count > 0 ? `Menampilkan ${count} permintaan review` : "Tidak ada permintaan review";
}

function renderPendingSkeleton(container) {
  container.innerHTML = Array.from({ length: 5 }, () => `
          <div class="pr-item skeleton-row">
            <span class="skeleton-circle"></span>
            <div class="pr-details">
              <span class="skeleton-line skeleton-text-lg"></span>
              <span class="skeleton-line skeleton-text-md"></span>
              <span class="skeleton-line skeleton-text-sm"></span>
            </div>
            <div class="pr-actions">
              <span class="skeleton-circle"></span>
              <span class="skeleton-circle"></span>
            </div>
          </div>`).join("");
}

function statusText(status) {
  const map = { hadir: "Presensi Harian", sakit: "Izin Sakit", izin: "Izin" };
  return map[status] || status || "Presensi Harian";
}

function formatReviewTime(value) {
  return new Date(value).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false }).replace(".", ":") + " WIB";
}

function initials(name) {
  return String(name || "--")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "--";
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" }[char]));
}

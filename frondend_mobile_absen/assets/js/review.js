document.addEventListener("DOMContentLoaded", () => {
  if (!/permintaan|review/.test(location.pathname)) return;
  loadPending();
});

async function loadPending() {
  const data = await sihadirFetch("/attendances/pending.php").catch(() => ({ items: [] }));
  const container = document.querySelector(".pr-list, .request-list, .requests-list, main");
  if (!container || !data.items) return;
  if (!data.items.length) return;
  container.innerHTML = data.items.map((item) => `<div class="pr-card" data-id="${item.id}"><div><strong>${item.nama_pelajar}</strong><p>${item.nis} • No ${item.absen_number} • ${item.status}</p><small>${item.notes || ""}</small></div><button class="pr-btn-reject" data-action="reject">✕</button><button class="pr-btn-approve" data-action="approve">✓</button></div>`).join("");
  container.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const card = button.closest("[data-id]");
    const id = card.dataset.id;
    if (button.dataset.action === "approve") {
      await sihadirFetch("/attendances/approve.php", { method: "POST", body: JSON.stringify({ id }) });
    } else {
      const reason = prompt("Alasan penolakan:");
      if (!reason) return;
      await sihadirFetch("/attendances/reject.php", { method: "POST", body: JSON.stringify({ id, reason }) });
    }
    card.remove();
  });
}

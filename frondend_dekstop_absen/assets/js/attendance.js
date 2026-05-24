document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector(".absen-form, .attendance-form-card");
  if (!form) return;

  const submitButton = form.querySelector('button[type="submit"], .btn-submit-absen, .send-attendance-button');
  const textarea = form.querySelector('[name="catatan"], #kata_hari_ini');
  const charCount = document.querySelector(".char-count");

  initAttendancePage();
  form.addEventListener("submit", submitAttendance);
  form.querySelectorAll('button[type="button"]').forEach((btn) => btn.addEventListener("click", submitAttendance));
  textarea?.addEventListener("input", updateCharCount);
  updateCharCount();

  async function initAttendancePage() {
    try {
      const data = await sihadirFetch("/auth/me.php");
      if (!data.user) throw new Error("Belum login");
      if (!["pelajar", "ketua_kelas"].includes(data.user.role)) throw new Error("Akses ditolak");
      renderAttendanceUser(data.user);
      renderTodayDate();
    } catch (error) {
      sihadirToast(error.message || "Belum login");
      location.href = location.pathname.includes("frondend_mobile_absen") ? "login.html" : "index.html";
    }
  }

  async function submitAttendance(event) {
    event.preventDefault();
    const status = form.querySelector('[name="status"]:checked')?.value.toLowerCase();
    const absen_number = form.querySelector('[name="nomor_absen"], #nomor_absen')?.value.trim();
    const notes = textarea?.value.trim() || "";

    if (!status) return sihadirToast("Status wajib dipilih");
    if (!absen_number || Number(absen_number) < 1 || Number(absen_number) > 99) return sihadirToast("Nomor absen harus 1-99");

    setLoading(true);
    try {
      const response = await sihadirFetch("/attendances/create.php", {
        method: "POST",
        body: JSON.stringify({ status, absen_number, notes }),
      });
      sessionStorage.setItem("sihadir:last-attendance", JSON.stringify({
        status,
        notes,
        submitted_at: response.attendance?.submitted_at || new Date().toISOString(),
      }));
      location.href = location.pathname.includes("ketua") ? "konfirmasi-ketua.html" : "konfirmasi.html";
    } catch (error) {
      sihadirToast(error.message || "Absensi gagal dikirim");
      setLoading(false);
    }
  }

  function renderAttendanceUser(user) {
    const values = document.querySelectorAll(".user-info-box .info-value");
    if (values[0]) values[0].textContent = user.name;
    if (values[1]) values[1].textContent = user.class_name;
  }

  function renderTodayDate() {
    const badge = document.querySelector(".date-badge");
    if (!badge) return;
    const svg = badge.querySelector("svg")?.outerHTML || "";
    const today = new Date().toLocaleDateString("id-ID", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
    badge.innerHTML = `${svg}${today}`;
  }

  function updateCharCount() {
    if (!textarea || !charCount) return;
    if (textarea.maxLength < 0) textarea.maxLength = 100;
    charCount.textContent = `${textarea.value.length}/100`;
  }

  function setLoading(isLoading) {
    if (!submitButton) return;
    submitButton.disabled = isLoading;
    submitButton.style.opacity = isLoading ? "0.75" : "";
    if (!submitButton.dataset.originalHtml) submitButton.dataset.originalHtml = submitButton.innerHTML;
    if (isLoading) submitButton.innerHTML = "Mengirim...";
    else submitButton.innerHTML = submitButton.dataset.originalHtml;
  }
});

document.addEventListener("DOMContentLoaded", async () => {
  const page = location.pathname.split("/").pop() || "";
  if (page !== "konfirmasi.html" && page !== "konfirmasi-ketua.html") return;

  let attendance = null;
  try {
    attendance = JSON.parse(sessionStorage.getItem("sihadir:last-attendance") || "null");
  } catch (error) {
    attendance = null;
  }

  if (!attendance) {
    const data = await sihadirFetch("/attendances/today.php").catch(() => ({ attendance: null }));
    attendance = data.attendance;
  }

  renderConfirmation(attendance);
});

function renderConfirmation(attendance) {
  if (!attendance) return;

  const values = document.querySelectorAll(".data-value");
  const submittedAt = attendance.submitted_at ? new Date(String(attendance.submitted_at).replace(" ", "T")) : new Date();

  if (values[0]) values[0].textContent = submittedAt.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
  if (values[1]) values[1].textContent = titleAttendance(attendance.status);
  if (values[2]) values[2].textContent = `${submittedAt.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false }).replace(".", ":")} WIB`;

  const quoteText = document.querySelector(".quote-text");
  const quoteAuthor = document.querySelector(".quote-author");
  const note = String(attendance.notes || "").trim();

  if (quoteText) quoteText.textContent = note ? `"${note}"` : "Belum ada kata hari ini.";
  if (quoteAuthor) quoteAuthor.textContent = "";
}

function titleAttendance(value) {
  return String(value || "").charAt(0).toUpperCase() + String(value || "").slice(1);
}


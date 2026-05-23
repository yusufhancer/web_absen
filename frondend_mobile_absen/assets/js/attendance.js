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
      await sihadirFetch("/attendances/create.php", {
        method: "POST",
        body: JSON.stringify({ status, absen_number, notes }),
      });
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


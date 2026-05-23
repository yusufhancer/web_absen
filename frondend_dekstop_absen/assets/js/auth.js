document.addEventListener("DOMContentLoaded", () => {
  const path = location.pathname;
  const isDesktop = path.includes("frondend_dekstop_absen");
  const loginForm = document.querySelector(".student-login-form, .register-form, .petugas-form, #officer-login-form");
  const registerForm = path.includes("registr") || path.includes("register-pelajar");
  const petugasForm = path.includes("petugas") || path.includes("login-petugas");
  const isLoginPage = path.includes("login") || path.includes("petugas.html");

  if (loginForm && registerForm) {
    loginForm.addEventListener("submit", handleRegister);
    loginForm.querySelectorAll('button[type="button"]').forEach((btn) => btn.addEventListener("click", handleRegister));
  } else if (loginForm && isLoginPage) {
    loginForm.addEventListener("submit", handleLogin);
    loginForm.querySelectorAll('button[type="button"]').forEach((btn) => btn.addEventListener("click", handleLogin));
  }

  document.querySelectorAll(".btn-logout").forEach((btn) => {
    btn.addEventListener("click", async (event) => {
      event.preventDefault();
      await sihadirFetch("/auth/logout.php", { method: "POST", body: "{}" }).catch(() => null);
      location.href = "index.html";
    });
  });

  async function handleRegister(event) {
    event.preventDefault();
    const form = event.currentTarget.closest("form") || loginForm;
    const nis = form.querySelector('[name="nis"], #nis')?.value.trim();
    const name = form.querySelector('[name="nama"], [name="name"], #fullname')?.value.trim();
    const password = form.querySelector('[name="password"], #password')?.value;
    const kelasValue = form.querySelector('[name="kelas"]:checked, [name="class"]:checked, [name="kelas"], [name="class"], #class')?.value;
    await sihadirFetch("/auth/register.php", { method: "POST", body: JSON.stringify({ nis, name, password, class_id: sihadirClassId(kelasValue) }) });
    sihadirToast("Registrasi berhasil");
    location.href = isDesktop ? "login-pelajar.html" : "login.html";
  }

  async function handleLogin(event) {
    event.preventDefault();
    const form = event.currentTarget.closest("form") || loginForm;
    const nis = form.querySelector('[name="nis"], #nis')?.value.trim();
    const password = form.querySelector('[name="password"], #password')?.value;
    const roleRaw = form.querySelector('[name="role"]:checked')?.value || (petugasForm ? "ketua_kelas" : "pelajar");
    const data = await sihadirFetch("/auth/login.php", { method: "POST", body: JSON.stringify({ nis, password, role: roleRaw }) });
    location.href = sihadirRolePath(data.user.role, "dashboard");
  }
});

window.handleLoginPetugas = function () {
  document.querySelector(".petugas-form")?.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
};






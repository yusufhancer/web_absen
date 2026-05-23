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

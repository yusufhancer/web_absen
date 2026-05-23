# PRD — SIHADIR (Sistem Hadir)
## Aplikasi Absensi Web Multi-Role

| Atribut | Detail |
|---------|--------|
| **Versi** | 2.0 (Simplified) |
| **Status** | Final — School Project |
| **Stack** | HTML/CSS/JS Frontend · REST API Backend · MariaDB (XAMPP) |

---

## Daftar Isi

1. [Overview](#1-overview)
2. [Role & Akses](#2-role--akses)
3. [Halaman & Fitur](#3-halaman--fitur)
4. [Alur Lengkap Per Role](#4-alur-lengkap-per-role)
5. [API Endpoints](#5-api-endpoints)
6. [Database Schema](#6-database-schema)
7. [Business Rules](#7-business-rules)
8. [Acceptance Criteria](#8-acceptance-criteria)

---

## 1. Overview

SIHADIR adalah aplikasi absensi berbasis web untuk lingkungan sekolah dengan 3 kelas PPLG. Pelajar melakukan absensi harian, dan Guru / Ketua Kelas memvalidasi (approve/reject) data tersebut serta melihat rekap bulanan.

**Kelas yang ada:** X PPLG 1, X PPLG 2, X PPLG 3

---

## 2. Role & Akses

| Role | Kode | Login Via | Deskripsi |
|------|------|-----------|-----------|
| Pelajar | `pelajar` | `login-pelajar.html` | Mengisi absensi harian |
| Ketua Kelas | `ketua_kelas` | `login-petugas.html` | Mengisi absensi + approve/reject |
| Guru | `guru` | `login-petugas.html` | Approve/reject + lihat rekap bulanan |

> **Catatan:** Akun Guru dan Ketua Kelas dibuat manual langsung di database. Tidak ada registrasi publik untuk kedua role ini.

---

## 3. Halaman & Fitur

### 3.1 Halaman Publik (Tanpa Login)

| File | Fungsi |
|------|--------|
| `index.html` | Landing page — pilih masuk sebagai Pelajar atau Petugas (Guru/Ketua) |
| `login-pelajar.html` | Login Pelajar: NIS + Password |
| `register-pelajar.html` | Registrasi Pelajar: NIS, Nama Lengkap, Kelas, Password |
| `login-petugas.html` | Login Guru/Ketua Kelas: NIS + Password + pilih Role |

---

### 3.2 Halaman Pelajar (Setelah Login)

| File | Fungsi | Data yang Dibutuhkan |
|------|--------|----------------------|
| `dashboard.html` | Dashboard utama | Info user, status absensi hari ini, riwayat 3 terakhir, mini leaderboard |
| `absen.html` | Form absensi | Nama & kelas (auto dari session), input: status + nomor absen + kata hari ini |
| `konfirmasi.html` | Konfirmasi sukses submit | Tanggal, status, waktu submit |
| `leaderboard.html` | Daftar siswa berdasarkan waktu absen tercepat hari ini | Top 3 podium + tabel ranking |
| `profile.html` | Profil & pengaturan | Nama, NIS, kelas, ubah password |

---

### 3.3 Halaman Ketua Kelas (Setelah Login)

| File | Fungsi | Data yang Dibutuhkan |
|------|--------|----------------------|
| `dashboard-ketua.html` | Dashboard utama | Info user, status absensi hari ini, daftar pending review (2 terbaru), mini leaderboard |
| `absen-ketua.html` | Form absensi (sama seperti pelajar) | Sama dengan absen.html |
| `konfirmasi-ketua.html` | Konfirmasi sukses submit | Tanggal, status, waktu |
| `permintaan-review.html` | Daftar absensi pending untuk di-approve/reject | List absensi status `pending`, tombol ✓ dan ✗ |
| `leaderboard-ketua.html` | Leaderboard (sama konten dengan pelajar) | Sama dengan leaderboard.html |
| `profile-ketua.html` | Profil & pengaturan | Nama, NIS, kelas |

---

### 3.4 Halaman Guru (Setelah Login)

| File | Fungsi | Data yang Dibutuhkan |
|------|--------|----------------------|
| `dashboard-guru.html` | Dashboard utama | Info user, banner rekap bulanan, riwayat singkat, preview laporan |
| `permintaan-review-guru.html` | Daftar absensi pending untuk di-approve/reject | Sama dengan permintaan-review.html |
| `rekap-bulanan-guru.html` | Grid 12 bulan untuk memilih bulan | Pilih tahun akademik → klik bulan → detail |
| `detail-kehadiran-guru.html` | Tabel detail absensi per bulan | Daftar nama + status Hadir/Sakit/Izin per hari |
| `leaderboard-guru.html` | Leaderboard (sama konten) | Sama dengan leaderboard.html |
| `profile-guru.html` | Profil & pengaturan | Nama, NIP, kelas |

---

## 4. Alur Lengkap Per Role

### 4.1 Alur Pelajar

```
index.html
  │
  ├── [Belum punya akun] → register-pelajar.html → (akun dibuat) → login-pelajar.html
  │
  └── [Sudah punya akun] → login-pelajar.html
                                │
                                ▼ (NIS + Password)
                          dashboard.html
                                │
                    ┌───────────┼─────────────┐
                    ▼           ▼             ▼
               absen.html  leaderboard.html  profile.html
                    │
                    ▼ (submit form)
              konfirmasi.html
                    │
                    ▼ (kembali ke dashboard)
              dashboard.html
```

**Status absensi di dashboard:**
- Jika belum submit hari ini → tampil "Belum Absen" + tombol "Absen Sekarang"
- Jika sudah submit (pending) → tampil "Menunggu Verifikasi"
- Jika approved → tampil "Hadir / Sakit / Izin" ✓
- Jika rejected → tampil "Ditolak" + alasan penolakan

---

### 4.2 Alur Ketua Kelas

```
index.html → login-petugas.html (pilih: Ketua Kelas)
                    │
                    ▼
             dashboard-ketua.html
                    │
          ┌─────────┼──────────────┬──────────────────┐
          ▼         ▼              ▼                  ▼
    absen-ketua  leaderboard  profile-ketua    permintaan-review.html
          │       -ketua.html  -ketua.html             │
          ▼                                    [approve ✓ / reject ✗]
    konfirmasi-ketua.html                              │
                                               (data approved → masuk rekap)
```

---

### 4.3 Alur Guru

```
index.html → login-petugas.html (pilih: Guru)
                    │
                    ▼
             dashboard-guru.html
                    │
          ┌─────────┼──────────────┬──────────────────────────┐
          ▼         ▼              ▼                          ▼
  leaderboard  profile-guru  permintaan-review-guru    rekap-bulanan-guru
   -guru.html   .html              .html                      │
                                                    (klik bulan)
                                                              ▼
                                                   detail-kehadiran-guru.html
```

---

## 5. API Endpoints

> Format: `METHOD /api/endpoint` — Backend mengembalikan JSON.
> Semua endpoint kecuali auth memerlukan session/token yang valid.

### Auth

| Method | Endpoint | Body | Response |
|--------|----------|------|----------|
| POST | `/api/auth/register` | `{nis, name, class_id, password}` | `{success, user}` |
| POST | `/api/auth/login` | `{nis, password, role?}` | `{success, user, token}` |
| POST | `/api/auth/logout` | — | `{success}` |
| GET | `/api/auth/me` | — | `{user}` |

> `role` di body login hanya perlu dikirim jika login sebagai Guru/Ketua Kelas. Untuk Pelajar tidak perlu.

---

### Classes

| Method | Endpoint | Response |
|--------|----------|----------|
| GET | `/api/classes` | `[{id, name}]` |

---

### Attendances (Absensi)

| Method | Endpoint | Akses | Keterangan |
|--------|----------|-------|------------|
| POST | `/api/attendances` | Pelajar, Ketua | Submit absensi baru |
| GET | `/api/attendances/today` | Pelajar, Ketua | Status absensi hari ini milik user yang login |
| GET | `/api/attendances/history` | Pelajar, Ketua | Riwayat absensi user yang login (recent 10) |
| GET | `/api/attendances/pending` | Guru, Ketua | Daftar absensi pending untuk di-review |
| PATCH | `/api/attendances/:id/approve` | Guru, Ketua | Approve absensi |
| PATCH | `/api/attendances/:id/reject` | Guru, Ketua | Reject absensi (wajib kirim `rejection_reason`) |
| GET | `/api/attendances/rekap?year=&month=` | Guru, Ketua | Data rekap per bulan |

**Body POST `/api/attendances`:**
```json
{
  "absen_number": 12,
  "status": "hadir",
  "notes": "Semangat hari ini!"
}
```

**Body PATCH `/api/attendances/:id/reject`:**
```json
{
  "rejection_reason": "Nomor absen tidak sesuai"
}
```

---

### Leaderboard

| Method | Endpoint | Akses | Keterangan |
|--------|----------|-------|------------|
| GET | `/api/leaderboard/today` | Semua | Top 10 pelajar tercepat absen hari ini (status approved) |

---

### Users (Profile)

| Method | Endpoint | Akses | Keterangan |
|--------|----------|-------|------------|
| GET | `/api/users/profile` | Semua | Data profil user yang login |
| PATCH | `/api/users/password` | Semua | Ubah password |

---

## 6. Database Schema

### 6.1 Tabel: `classes`

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| id | INT UNSIGNED PK AUTO_INCREMENT | ID unik kelas |
| name | VARCHAR(20) UNIQUE NOT NULL | Nama kelas |
| created_at | DATETIME DEFAULT NOW() | Waktu dibuat |

**Data:** X PPLG 1, X PPLG 2, X PPLG 3

---

### 6.2 Tabel: `users`

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| id | INT UNSIGNED PK AUTO_INCREMENT | ID unik user |
| nis | VARCHAR(20) UNIQUE NOT NULL | Nomor Induk Siswa/Staf — digunakan untuk login |
| name | VARCHAR(100) NOT NULL | Nama lengkap |
| password_hash | VARCHAR(255) NOT NULL | Password ter-hash (bcrypt) |
| role | ENUM('pelajar','guru','ketua_kelas') NOT NULL | Peran user |
| class_id | INT UNSIGNED NOT NULL FK → classes.id | Kelas user |
| created_at | DATETIME DEFAULT NOW() | Waktu akun dibuat |

> Guru dan Ketua Kelas tidak bisa registrasi sendiri — akun dibuat manual di database.

---

### 6.3 Tabel: `attendances`

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| id | INT UNSIGNED PK AUTO_INCREMENT | ID unik absensi |
| user_id | INT UNSIGNED NOT NULL FK → users.id | Pelajar / Ketua yang absen |
| class_id | INT UNSIGNED NOT NULL FK → classes.id | Kelas saat absen (dari session) |
| absen_number | TINYINT UNSIGNED NOT NULL | Nomor absen yang diinput user |
| status | ENUM('hadir','sakit','izin') NOT NULL | Status kehadiran |
| notes | TEXT NULL | "Kata Hari Ini" — opsional |
| submitted_at | DATETIME NOT NULL DEFAULT NOW() | Waktu submit absensi |
| approval_status | ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending' | Status validasi |
| approved_by | INT UNSIGNED NULL FK → users.id | Guru/Ketua yang approve/reject |
| approved_at | DATETIME NULL | Waktu approve/reject |
| rejection_reason | TEXT NULL | Alasan penolakan — wajib diisi jika rejected |

**Constraint:** `UNIQUE(user_id, DATE(submitted_at))` — Satu pelajar satu absensi per hari (berlaku mutlak).

---

### 6.4 Relasi Antar Tabel

```
classes (1) ────< (N) users
classes (1) ────< (N) attendances
users   (1) ────< (N) attendances  [via user_id]
users   (1) ────< (N) attendances  [via approved_by]
```

---

### 6.5 Ringkasan Query Penting

```sql
-- Status absensi hari ini milik satu user
SELECT * FROM attendances
WHERE user_id = ? AND DATE(submitted_at) = CURDATE();

-- Daftar pending untuk direview (per kelas)
SELECT a.*, u.name, u.nis FROM attendances a
JOIN users u ON u.id = a.user_id
WHERE a.class_id = ? AND a.approval_status = 'pending'
ORDER BY a.submitted_at ASC;

-- Leaderboard hari ini (pelajar tercepat, sudah approved)
SELECT u.name, u.class_id, a.submitted_at FROM attendances a
JOIN users u ON u.id = a.user_id
WHERE DATE(a.submitted_at) = CURDATE()
  AND a.approval_status = 'approved'
  AND a.status = 'hadir'
ORDER BY a.submitted_at ASC LIMIT 10;

-- Rekap bulanan per pelajar
SELECT u.name, u.nis,
  SUM(a.status = 'hadir')  AS hadir,
  SUM(a.status = 'sakit')  AS sakit,
  SUM(a.status = 'izin')   AS izin
FROM attendances a
JOIN users u ON u.id = a.user_id
WHERE a.class_id = ?
  AND a.approval_status = 'approved'
  AND YEAR(a.submitted_at) = ?
  AND MONTH(a.submitted_at) = ?
GROUP BY u.id ORDER BY u.name;
```

---

## 7. Business Rules

| ID | Rule |
|----|------|
| BR-01 | Hanya absensi dengan status `approved` yang masuk ke rekap bulanan dan leaderboard |
| BR-02 | Satu user hanya bisa submit satu absensi per hari — ditegakkan oleh UNIQUE constraint di database |
| BR-03 | Guru **tidak bisa** mengakses halaman absen — tidak ada link/menu absen di sidebar Guru |
| BR-04 | Ketua Kelas bisa absen (seperti pelajar) DAN approve/reject absensi anggota kelasnya |
| BR-05 | Guru dan Ketua Kelas hanya melihat dan mereview absensi dari kelas mereka sendiri (`class_id` mereka) |
| BR-06 | Reject wajib disertai `rejection_reason` — backend tolak request reject tanpa alasan |
| BR-07 | Leaderboard hanya menampilkan absensi berstatus `hadir` yang sudah `approved`, diurutkan dari `submitted_at` terkecil |
| BR-08 | `approved_by` wajib divalidasi backend: hanya user dengan role `guru` atau `ketua_kelas` yang dapat mengubah `approval_status` |

---

## 8. Acceptance Criteria

| ID | Fitur | Kriteria |
|----|-------|----------|
| AC-01 | Registrasi Pelajar | Pelajar dapat daftar dengan NIS, nama, kelas, password — login berhasil setelahnya |
| AC-02 | Login Pelajar | NIS + password yang benar → masuk dashboard.html; salah → pesan error |
| AC-03 | Login Guru/Ketua | NIS + password + pilih role → masuk dashboard yang sesuai |
| AC-04 | Form Absensi | Pelajar/Ketua dapat submit absensi dengan status, nomor absen, dan kata hari ini |
| AC-05 | Blokir Submit Ganda | Submit kedua di hari yang sama ditolak sistem (error 409) |
| AC-06 | Status Absensi | Dashboard menampilkan status absensi hari ini yang akurat (belum/pending/approved/rejected) |
| AC-07 | Approve Absensi | Guru/Ketua dapat approve → status berubah ke `approved` → muncul di rekap & leaderboard |
| AC-08 | Reject Absensi | Guru/Ketua dapat reject dengan alasan → status berubah ke `rejected` → tidak muncul di rekap |
| AC-09 | Leaderboard | Menampilkan pelajar tercepat hadir hari ini, top 3 di podium, sisanya di tabel |
| AC-10 | Rekap Bulanan | Guru/Ketua dapat memilih bulan dan melihat ringkasan Hadir/Sakit/Izin per pelajar |
| AC-11 | Akses Guru | Tidak ada tombol/menu absen di halaman Guru |
| AC-12 | Isolasi Kelas | Guru/Ketua hanya melihat data kelas mereka sendiri |

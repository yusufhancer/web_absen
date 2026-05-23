-- ============================================================
--  SCHEMA DATABASE — SIHADIR (Sistem Hadir)
--  Versi   : 2.0 (Simplified for School Project)
--  Engine  : MariaDB 10.4+ (XAMPP)
--  Charset : utf8mb4
--
--  Tabel   : 3 tabel utama (classes, users, attendances)
--  Catatan : Tidak ada trigger — semua business logic
--            ditangani di backend (PHP/Node/Python).
-- ============================================================

CREATE DATABASE IF NOT EXISTS db_sihadir
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE db_sihadir;

-- ============================================================
--  TABEL: classes
--  Master data kelas. Hanya 3 kelas: X PPLG 1, 2, 3.
-- ============================================================
CREATE TABLE classes (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name       VARCHAR(20)  NOT NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_classes_name (name)
) ENGINE=InnoDB
  COMMENT='Master kelas — X PPLG 1, X PPLG 2, X PPLG 3';

-- ============================================================
--  TABEL: users
--  Semua pengguna: pelajar, guru, ketua_kelas.
--
--  Login menggunakan NIS + password.
--  Akun guru dan ketua_kelas dibuat manual (tidak bisa
--  registrasi sendiri dari frontend).
-- ============================================================
CREATE TABLE users (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nis           VARCHAR(20)  NOT NULL COMMENT 'Nomor Induk Siswa — digunakan untuk login',
  name          VARCHAR(100) NOT NULL COMMENT 'Nama lengkap',
  password_hash VARCHAR(255) NOT NULL COMMENT 'Password ter-hash dengan bcrypt',
  role          ENUM(
                  'pelajar',
                  'guru',
                  'ketua_kelas'
                )            NOT NULL COMMENT 'Peran pengguna',
  class_id      INT UNSIGNED NOT NULL COMMENT 'FK ke classes',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_users_nis (nis),
  INDEX idx_users_role     (role),
  INDEX idx_users_class    (class_id),

  CONSTRAINT fk_users_class
    FOREIGN KEY (class_id) REFERENCES classes (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB
  COMMENT='Pengguna sistem: pelajar, guru, ketua_kelas';

-- ============================================================
--  TABEL: attendances
--  Setiap record absensi yang disubmit pelajar atau ketua kelas.
--
--  UNIQUE(user_id, DATE(submitted_at)) → satu absensi per hari
--  per user, berlaku mutlak (bahkan jika di-reject, tidak bisa
--  submit ulang di hari yang sama).
--
--  Karena MariaDB tidak bisa UNIQUE pada ekspresi DATE(),
--  digunakan kolom generated `absen_date` sebagai workaround.
-- ============================================================
CREATE TABLE attendances (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id          INT UNSIGNED NOT NULL COMMENT 'FK ke users (pelajar / ketua_kelas)',
  class_id         INT UNSIGNED NOT NULL COMMENT 'FK ke classes (diambil dari session user)',
  absen_number     TINYINT UNSIGNED NOT NULL COMMENT 'Nomor absen yang diinput user',
  status           ENUM(
                     'hadir',
                     'sakit',
                     'izin'
                   )            NOT NULL COMMENT 'Status kehadiran',
  notes            TEXT             NULL COMMENT '"Kata Hari Ini" — opsional, boleh NULL',
  submitted_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                                         COMMENT 'Waktu submit absensi',
  absen_date       DATE GENERATED ALWAYS AS (DATE(submitted_at)) STORED
                                         COMMENT 'Tanggal absen (generated) untuk UNIQUE constraint',
  approval_status  ENUM(
                     'pending',
                     'approved',
                     'rejected'
                   )            NOT NULL DEFAULT 'pending'
                                         COMMENT 'Status validasi oleh Guru/Ketua',
  approved_by      INT UNSIGNED     NULL COMMENT 'FK ke users (guru/ketua yang approve/reject)',
  approved_at      DATETIME         NULL COMMENT 'Waktu approve atau reject',
  rejection_reason TEXT             NULL COMMENT 'Alasan penolakan — wajib diisi jika rejected',

  PRIMARY KEY (id),

  -- Satu user hanya bisa submit satu kali per hari (mutlak)
  UNIQUE KEY uq_attendance_daily (user_id, absen_date),

  INDEX idx_att_class_date  (class_id, absen_date),
  INDEX idx_att_status      (approval_status),
  INDEX idx_att_approved_by (approved_by),

  CONSTRAINT fk_att_user
    FOREIGN KEY (user_id)     REFERENCES users   (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,

  CONSTRAINT fk_att_class
    FOREIGN KEY (class_id)    REFERENCES classes (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,

  CONSTRAINT fk_att_approver
    FOREIGN KEY (approved_by) REFERENCES users   (id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB
  COMMENT='Data absensi pelajar dan ketua_kelas';

-- ============================================================
--  DATA AWAL (SEED)
--  Hapus atau modifikasi sesuai kebutuhan sebelum production.
-- ============================================================

-- Kelas
INSERT INTO classes (name) VALUES
  ('X PPLG 1'),
  ('X PPLG 2'),
  ('X PPLG 3');

-- Akun Guru (dibuat manual, tidak bisa daftar sendiri)
-- Password default: guru123 — GANTI sebelum dipakai!
-- Hash bcrypt valid untuk password default.
INSERT INTO users (nis, name, password_hash, role, class_id) VALUES
  ('G001', 'Bu Kalim Sulistyo', '$2y$10$P7xVWzs9KlkAfNtbEmOAuu97eFKlVKbD9jB7FDiJPZYhIy9Al9Spu', 'guru', 1),
  ('G002', 'Pak Ahmad Fauzi',   '$2y$10$P7xVWzs9KlkAfNtbEmOAuu97eFKlVKbD9jB7FDiJPZYhIy9Al9Spu', 'guru', 2),
  ('G003', 'Bu Sari Indah',     '$2y$10$P7xVWzs9KlkAfNtbEmOAuu97eFKlVKbD9jB7FDiJPZYhIy9Al9Spu', 'guru', 3);

-- Akun Ketua Kelas (dibuat manual)
-- Password default: ketua123
INSERT INTO users (nis, name, password_hash, role, class_id) VALUES
  ('2501001', 'Rvidia Satria Adi',  '$2y$10$7Vc2/GGdnQ/32mCs/mS/m.qPr7BsLv7qvf5IXkTGHI8RsFsQkGSCm', 'ketua_kelas', 1),
  ('2502001', 'Dimas Kurniawan',    '$2y$10$7Vc2/GGdnQ/32mCs/mS/m.qPr7BsLv7qvf5IXkTGHI8RsFsQkGSCm', 'ketua_kelas', 2),
  ('2503001', 'Nayla Az-Zahra',     '$2y$10$7Vc2/GGdnQ/32mCs/mS/m.qPr7BsLv7qvf5IXkTGHI8RsFsQkGSCm', 'ketua_kelas', 3);

-- Akun Pelajar (contoh — normalnya dari registrasi)
INSERT INTO users (nis, name, password_hash, role, class_id) VALUES
  ('2502002', 'Tania Cahyono',    '$2y$10$MC6z.eBjpZF.vQ.7vf1QseRu5ttpypNIWTL9qb6ypKkL5CDhXqkfa', 'pelajar', 2),
  ('2502003', 'Alfian Dzaky',     '$2y$10$MC6z.eBjpZF.vQ.7vf1QseRu5ttpypNIWTL9qb6ypKkL5CDhXqkfa', 'pelajar', 2),
  ('2502004', 'Aida Dwi Riana',   '$2y$10$MC6z.eBjpZF.vQ.7vf1QseRu5ttpypNIWTL9qb6ypKkL5CDhXqkfa', 'pelajar', 2);

-- ============================================================
--  QUERY REFERENSI BACKEND
--  Copy-paste ke backend sesuai kebutuhan.
-- ============================================================

/*
-- [1] CEK STATUS ABSENSI HARI INI (untuk dashboard)
SELECT id, status, approval_status, rejection_reason, submitted_at
FROM attendances
WHERE user_id = :user_id
  AND absen_date = CURDATE();

-- [2] SUBMIT ABSENSI BARU
INSERT INTO attendances (user_id, class_id, absen_number, status, notes)
VALUES (:user_id, :class_id, :absen_number, :status, :notes);
-- Jika UNIQUE violation → return error 409 "Sudah absen hari ini"

-- [3] DAFTAR PENDING UNTUK REVIEW (per kelas, urut terlama)
SELECT
  a.id, a.absen_number, a.status, a.notes, a.submitted_at,
  u.name AS nama_pelajar, u.nis
FROM attendances a
JOIN users u ON u.id = a.user_id
WHERE a.class_id   = :class_id
  AND a.approval_status = 'pending'
ORDER BY a.submitted_at ASC;

-- [4] APPROVE ABSENSI
UPDATE attendances
SET approval_status = 'approved',
    approved_by     = :approver_id,
    approved_at     = NOW()
WHERE id = :attendance_id
  AND approval_status = 'pending';

-- [5] REJECT ABSENSI (rejection_reason wajib ada)
UPDATE attendances
SET approval_status  = 'rejected',
    approved_by      = :approver_id,
    approved_at      = NOW(),
    rejection_reason = :rejection_reason
WHERE id = :attendance_id
  AND approval_status = 'pending';

-- [6] LEADERBOARD HARI INI (top 10 tercepat, hadir + approved)
SELECT
  u.name, u.nis, c.name AS kelas,
  a.submitted_at
FROM attendances a
JOIN users   u ON u.id = a.user_id
JOIN classes c ON c.id = a.class_id
WHERE a.absen_date       = CURDATE()
  AND a.status           = 'hadir'
  AND a.approval_status  = 'approved'
ORDER BY a.submitted_at ASC
LIMIT 10;

-- [7] REKAP BULANAN PER PELAJAR (untuk detail-kehadiran-guru)
SELECT
  u.name,
  u.nis,
  SUM(a.status = 'hadir')  AS hadir,
  SUM(a.status = 'sakit')  AS sakit,
  SUM(a.status = 'izin')   AS izin,
  COUNT(a.id)              AS total_absensi
FROM attendances a
JOIN users u ON u.id = a.user_id
WHERE a.class_id         = :class_id
  AND a.approval_status  = 'approved'
  AND YEAR(a.submitted_at)  = :year
  AND MONTH(a.submitted_at) = :month
GROUP BY u.id
ORDER BY u.name ASC;

-- [8] RINGKASAN PER BULAN (untuk rekap-bulanan-guru, grid 12 bulan)
SELECT
  MONTH(submitted_at) AS bulan,
  COUNT(*) AS total_absensi
FROM attendances
WHERE class_id         = :class_id
  AND approval_status  = 'approved'
  AND YEAR(submitted_at) = :year
GROUP BY MONTH(submitted_at);

-- [9] RIWAYAT ABSENSI USER (untuk dashboard — 5 terbaru)
SELECT status, approval_status, submitted_at
FROM attendances
WHERE user_id = :user_id
ORDER BY submitted_at DESC
LIMIT 5;
*/



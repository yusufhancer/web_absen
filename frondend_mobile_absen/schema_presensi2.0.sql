-- ============================================================
--  SCHEMA DATABASE — Sistem Presensi Website Multi-Role
--  Versi   : 1.1
--  Engine  : MariaDB 10.4+ / MySQL 8.0+  (XAMPP default ≥ 10.4)
--  Charset : utf8mb4 | Collation : utf8mb4_unicode_ci
--
--  Changelog v1.1:
--    [1] class_id dihapus dari users → relasi dipindah ke tabel
--        pivot user_classes agar guru bisa mengajar banyak kelas
--    [2] absen_number dipindah dari attendances ke user_classes
--        (data identitas siswa, bukan data absensi harian) +
--        UNIQUE(class_id, absen_number) untuk mencegah duplikasi
--    [3] Trigger warn ditambah untuk AFTER UPDATE & AFTER DELETE
--        agar warn_count selalu sinkron dengan tabel warnings
--    [4] Trigger validasi role ditambah: approved_by harus petugas,
--        issued_by harus petugas, student_id harus pelajar/ketua_kelas
--    [5] Soft delete: kolom is_active & deleted_at ditambah ke users
--    [6] CHECK constraint: notes wajib jika status sakit/izin
--        (MariaDB 10.2.1+ mendukung dan menegakkan CHECK — aman di XAMPP)
-- ============================================================

CREATE DATABASE IF NOT EXISTS db_presensi
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE db_presensi;

-- ============================================================
--  TABEL: classes
--  Master data kelas. Dibuat pertama karena direferensikan
--  oleh user_classes dan attendances.
-- ============================================================
CREATE TABLE classes (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name       VARCHAR(50)  NOT NULL COMMENT 'Nama kelas, contoh: XII PPLG 1',
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_classes_name (name)
) ENGINE=InnoDB
  COMMENT='Master data kelas yang tersedia di sistem';

-- ============================================================
--  TABEL: users
--  Semua pengguna lintas role dalam satu tabel.
--
--  Perubahan v1.1:
--    - class_id dihapus → dipindah ke pivot user_classes
--    - is_active & deleted_at ditambah untuk soft delete
-- ============================================================
CREATE TABLE users (
  id            INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  name          VARCHAR(100)     NOT NULL COMMENT 'Nama lengkap pengguna',
  username      VARCHAR(50)      NOT NULL COMMENT 'Username unik untuk login',
  email         VARCHAR(100)     NOT NULL COMMENT 'Email unik untuk login',
  password_hash VARCHAR(255)     NOT NULL COMMENT 'Password terenkripsi (bcrypt)',
  role          ENUM(
                  'pelajar',
                  'guru',
                  'ketua_kelas',
                  'petugas'
                )                NOT NULL COMMENT 'Peran pengguna dalam sistem',
  warn_count    TINYINT UNSIGNED NOT NULL DEFAULT 0
                                          COMMENT 'Cache akumulasi warn — dijaga sinkron oleh trigger',
  is_flagged    TINYINT(1)       NOT NULL DEFAULT 0
                                          COMMENT '1 jika warn_count > 5, profil ditandai merah',
  is_active     TINYINT(1)       NOT NULL DEFAULT 1
                                          COMMENT '0 = akun nonaktif / soft deleted',
  deleted_at    DATETIME             NULL DEFAULT NULL
                                          COMMENT 'Timestamp soft delete, NULL jika masih aktif',
  created_at    DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_users_username (username),
  UNIQUE KEY uq_users_email    (email),
  INDEX idx_users_role         (role),
  INDEX idx_users_is_active    (is_active)
) ENGINE=InnoDB
  COMMENT='Seluruh pengguna sistem: pelajar, guru, ketua_kelas, petugas';

-- ============================================================
--  TABEL: user_classes  (pivot)
--  Menggantikan class_id di users untuk mendukung relasi
--  many-to-many antara user dan kelas.
--
--  Aturan per role:
--    - guru        : boleh di banyak kelas, absen_number = NULL
--    - pelajar     : 1 kelas, absen_number diisi
--    - ketua_kelas : 1 kelas, absen_number diisi
--  Batasan 1 kelas untuk pelajar/ketua_kelas dijaga di backend.
--
--  Perubahan v1.1:
--    - Tabel baru (pivot menggantikan class_id di users)
--    - absen_number dipindah ke sini dari attendances
--    - UNIQUE(class_id, absen_number) mencegah nomor absen duplikat
--      (NULL diabaikan oleh UNIQUE di MariaDB/MySQL, sehingga
--       banyak guru bisa punya absen_number = NULL di kelas sama)
-- ============================================================
CREATE TABLE user_classes (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id       INT UNSIGNED NOT NULL COMMENT 'FK ke users',
  class_id      INT UNSIGNED NOT NULL COMMENT 'FK ke classes',
  role_in_class ENUM(
                  'pelajar',
                  'ketua_kelas',
                  'guru'
                )            NOT NULL COMMENT 'Peran user di kelas ini',
  absen_number  TINYINT UNSIGNED NULL  COMMENT 'Nomor absen — diisi untuk pelajar/ketua_kelas, NULL untuk guru',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),

  -- Satu user tidak bisa terdaftar dua kali di kelas yang sama
  UNIQUE KEY uq_user_class             (user_id, class_id),

  -- Nomor absen unik per kelas
  UNIQUE KEY uq_absen_number_per_class (class_id, absen_number),

  INDEX idx_uc_user  (user_id),
  INDEX idx_uc_class (class_id),

  CONSTRAINT fk_uc_user
    FOREIGN KEY (user_id)  REFERENCES users   (id)
    ON UPDATE CASCADE ON DELETE CASCADE,

  CONSTRAINT fk_uc_class
    FOREIGN KEY (class_id) REFERENCES classes (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB
  COMMENT='Pivot relasi user-kelas; menyimpan nomor absen sebagai data identitas';

-- ============================================================
--  TABEL: attendances
--  Setiap record absensi yang disubmit pelajar/ketua_kelas.
--
--  Perubahan v1.1:
--    - absen_number dihapus (dipindah ke user_classes)
--    - CHECK constraint: notes wajib jika status sakit/izin
--      MariaDB 10.2.1+ mendukung dan menegakkan CHECK.
--      XAMPP default >= 10.4 — aman digunakan.
-- ============================================================
CREATE TABLE attendances (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id         INT UNSIGNED NOT NULL COMMENT 'FK ke users (pelajar / ketua_kelas)',
  class_id        INT UNSIGNED NOT NULL COMMENT 'FK ke classes',
  full_name       VARCHAR(100) NOT NULL COMMENT 'Nama lengkap yang diinput saat absensi',
  status          ENUM(
                    'hadir',
                    'sakit',
                    'izin'
                  )            NOT NULL COMMENT 'Status kehadiran',
  notes           TEXT             NULL COMMENT 'Keterangan — wajib jika status sakit atau izin',
  submitted_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                                        COMMENT 'Waktu submit absensi',
  tanggal_absen   DATE GENERATED ALWAYS AS (DATE(submitted_at)) STORED
                                        COMMENT 'Kolom generated untuk unique constraint harian',
  approval_status ENUM(
                    'pending',
                    'approved',
                    'rejected'
                  )            NOT NULL DEFAULT 'pending'
                                        COMMENT 'Status validasi oleh Petugas',
  approved_by     INT UNSIGNED     NULL COMMENT 'FK ke users (petugas) — NULL jika masih pending',
  approved_at     DATETIME         NULL COMMENT 'Waktu approve/reject — NULL jika masih pending',

  PRIMARY KEY (id),

  -- BR-03: satu absensi per pelajar per kelas per hari
  UNIQUE KEY uq_attendance_daily (user_id, class_id, tanggal_absen),

  INDEX idx_attendance_class_date  (class_id, tanggal_absen),
  INDEX idx_attendance_status      (approval_status),
  INDEX idx_attendance_approved_by (approved_by),

  -- [6] CHECK: notes wajib jika status sakit atau izin
  CONSTRAINT chk_notes_required
    CHECK (
      status = 'hadir'
      OR (status IN ('sakit', 'izin') AND notes IS NOT NULL AND TRIM(notes) != '')
    ),

  CONSTRAINT fk_attendance_user
    FOREIGN KEY (user_id)     REFERENCES users   (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,

  CONSTRAINT fk_attendance_class
    FOREIGN KEY (class_id)    REFERENCES classes (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,

  -- SET NULL agar data historis approval tetap terjaga
  -- meski akun petugas bersangkutan dihapus
  CONSTRAINT fk_attendance_approver
    FOREIGN KEY (approved_by) REFERENCES users   (id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB
  COMMENT='Data absensi pelajar/ketua_kelas, divalidasi oleh Petugas';

-- ============================================================
--  TABEL: warnings
--  Riwayat peringatan Petugas kepada Pelajar.
--  Validasi role ditangani oleh trg_warning_before_insert.
-- ============================================================
CREATE TABLE warnings (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_id INT UNSIGNED NOT NULL COMMENT 'FK ke users (pelajar yang diberi warn)',
  issued_by  INT UNSIGNED NOT NULL COMMENT 'FK ke users (petugas yang memberi warn)',
  reason     TEXT         NOT NULL COMMENT 'Alasan pemberian peringatan',
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  INDEX idx_warnings_student   (student_id),
  INDEX idx_warnings_issued_by (issued_by),

  CONSTRAINT fk_warning_student
    FOREIGN KEY (student_id) REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE CASCADE,

  CONSTRAINT fk_warning_issuer
    FOREIGN KEY (issued_by)  REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB
  COMMENT='Riwayat peringatan (warn) dari Petugas kepada Pelajar';

-- ============================================================
--  TRIGGERS
-- ============================================================
DELIMITER $$

-- ------------------------------------------------------------
--  [4a] Validasi role saat approval:
--       approved_by wajib memiliki role = 'petugas'
-- ------------------------------------------------------------
CREATE TRIGGER trg_attendance_before_update
BEFORE UPDATE ON attendances
FOR EACH ROW
BEGIN
  IF NEW.approved_by IS NOT NULL THEN
    IF (SELECT role FROM users WHERE id = NEW.approved_by) != 'petugas' THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Hanya pengguna dengan role petugas yang dapat melakukan approval absensi.';
    END IF;
  END IF;
END$$

-- ------------------------------------------------------------
--  [4b] Validasi role sebelum warn dibuat:
--       issued_by  wajib role = 'petugas'
--       student_id wajib role = 'pelajar' atau 'ketua_kelas'
-- ------------------------------------------------------------
CREATE TRIGGER trg_warning_before_insert
BEFORE INSERT ON warnings
FOR EACH ROW
BEGIN
  IF (SELECT role FROM users WHERE id = NEW.issued_by) != 'petugas' THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Hanya pengguna dengan role petugas yang dapat memberikan peringatan.';
  END IF;

  IF (SELECT role FROM users WHERE id = NEW.student_id) NOT IN ('pelajar', 'ketua_kelas') THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Peringatan hanya dapat diberikan kepada pelajar atau ketua kelas.';
  END IF;
END$$

-- ------------------------------------------------------------
--  [3a] Sinkronisasi warn_count setelah INSERT warning
-- ------------------------------------------------------------
CREATE TRIGGER trg_warning_after_insert
AFTER INSERT ON warnings
FOR EACH ROW
BEGIN
  UPDATE users
  SET
    warn_count = warn_count + 1,
    is_flagged = IF(warn_count + 1 > 5, 1, 0)
  WHERE id = NEW.student_id;
END$$

-- ------------------------------------------------------------
--  [3b] Sinkronisasi warn_count setelah DELETE warning
--       Menggunakan COUNT(*) penuh agar tetap akurat meski ada
--       penghapusan batch atau import data manual.
-- ------------------------------------------------------------
CREATE TRIGGER trg_warning_after_delete
AFTER DELETE ON warnings
FOR EACH ROW
BEGIN
  DECLARE total INT DEFAULT 0;

  SELECT COUNT(*) INTO total
  FROM warnings
  WHERE student_id = OLD.student_id;

  UPDATE users
  SET
    warn_count = total,
    is_flagged = IF(total > 5, 1, 0)
  WHERE id = OLD.student_id;
END$$

-- ------------------------------------------------------------
--  [3c] Sinkronisasi warn_count setelah UPDATE warning
--       Menangani edge case saat student_id diubah (misalnya
--       koreksi data manual). Kedua pelajar di-resync.
-- ------------------------------------------------------------
CREATE TRIGGER trg_warning_after_update
AFTER UPDATE ON warnings
FOR EACH ROW
BEGIN
  DECLARE total_old INT DEFAULT 0;
  DECLARE total_new INT DEFAULT 0;

  -- Resync pelajar lama
  SELECT COUNT(*) INTO total_old
  FROM warnings WHERE student_id = OLD.student_id;

  UPDATE users
  SET warn_count = total_old, is_flagged = IF(total_old > 5, 1, 0)
  WHERE id = OLD.student_id;

  -- Resync pelajar baru jika student_id ikut berubah
  IF NEW.student_id != OLD.student_id THEN
    SELECT COUNT(*) INTO total_new
    FROM warnings WHERE student_id = NEW.student_id;

    UPDATE users
    SET warn_count = total_new, is_flagged = IF(total_new > 5, 1, 0)
    WHERE id = NEW.student_id;
  END IF;
END$$

DELIMITER ;

-- ============================================================
--  DATA AWAL (SEED DATA)
--  Contoh data untuk development dan testing.
--  Hapus blok ini sebelum deploy ke production.
-- ============================================================

-- Kelas
INSERT INTO classes (name) VALUES
  ('X PPLG 1'),
  ('X PPLG 2'),
  ('X PPLG 3'),
  ('XI PPLG 1'),
  ('XI PPLG 2'),
  ('XI PPLG 3'),
  ('XII PPLG 1'),
  ('XII PPLG 2'),
  ('XII PPLG 3');

-- Akun Petugas (tidak memiliki kelas)
INSERT INTO users (name, username, email, password_hash, role) VALUES
  ('Budi Santoso', 'budi_petugas', 'budi@sekolah.sch.id', '$2b$12$CONTOH_HASH_PETUGAS_1', 'petugas'),
  ('Sari Dewi',    'sari_petugas', 'sari@sekolah.sch.id',  '$2b$12$CONTOH_HASH_PETUGAS_2', 'petugas');

-- Akun Guru
INSERT INTO users (name, username, email, password_hash, role) VALUES
  ('Pak Ahmad', 'pak_ahmad', 'ahmad@sekolah.sch.id', '$2b$12$CONTOH_HASH_GURU_1', 'guru'),
  ('Bu Ratna',  'bu_ratna',  'ratna@sekolah.sch.id',  '$2b$12$CONTOH_HASH_GURU_2', 'guru');

-- Akun Ketua Kelas
INSERT INTO users (name, username, email, password_hash, role) VALUES
  ('Dani Pratama', 'dani_ketua', 'dani@siswa.sch.id', '$2b$12$CONTOH_HASH_KETUA_1', 'ketua_kelas');

-- Akun Pelajar
INSERT INTO users (name, username, email, password_hash, role) VALUES
  ('Adi Nugroho',   'adi_nugroho',   'adi@siswa.sch.id',   '$2b$12$CONTOH_HASH_PEL_1', 'pelajar'),
  ('Rina Maharani', 'rina_maharani', 'rina@siswa.sch.id',  '$2b$12$CONTOH_HASH_PEL_2', 'pelajar'),
  ('Fajar Hidayat', 'fajar_hidayat', 'fajar@siswa.sch.id', '$2b$12$CONTOH_HASH_PEL_3', 'pelajar');

-- Relasi user-kelas (user_classes)
-- Pak Ahmad: mengajar XII PPLG 1 dan XI PPLG 1
-- Bu Ratna : mengajar X PPLG 1
INSERT INTO user_classes (user_id, class_id, role_in_class, absen_number)
SELECT u.id, c.id, 'guru', NULL
FROM users u
JOIN classes c ON (
  (u.username = 'pak_ahmad' AND c.name IN ('XII PPLG 1', 'XI PPLG 1'))
  OR
  (u.username = 'bu_ratna'  AND c.name  = 'X PPLG 1')
);

-- Ketua Kelas Dani → XII PPLG 1, nomor absen 1
INSERT INTO user_classes (user_id, class_id, role_in_class, absen_number)
SELECT u.id, c.id, 'ketua_kelas', 1
FROM users u
JOIN classes c ON c.name = 'XII PPLG 1'
WHERE u.username = 'dani_ketua';

-- Pelajar → XII PPLG 1, nomor absen 2–4
INSERT INTO user_classes (user_id, class_id, role_in_class, absen_number)
SELECT u.id, c.id, 'pelajar', n.no
FROM users u
JOIN classes c ON c.name = 'XII PPLG 1'
JOIN (
  SELECT 'adi_nugroho'   AS uname, 2 AS no UNION ALL
  SELECT 'rina_maharani',           3       UNION ALL
  SELECT 'fajar_hidayat',           4
) n ON n.uname = u.username;

-- ============================================================
--  VIEWS
-- ============================================================

-- Rekap absensi yang sudah approved (dashboard Admin)
CREATE OR REPLACE VIEW v_rekap_approved AS
SELECT
  a.id              AS attendance_id,
  u.name            AS nama_pelajar,
  u.is_flagged,
  c.name            AS kelas,
  uc.absen_number,
  a.full_name,
  a.status,
  a.notes,
  a.tanggal_absen,
  a.approved_at,
  p.name            AS diapprove_oleh
FROM attendances a
JOIN  users        u  ON u.id  = a.user_id
JOIN  classes      c  ON c.id  = a.class_id
LEFT JOIN user_classes uc ON uc.user_id = a.user_id AND uc.class_id = a.class_id
LEFT JOIN users    p  ON p.id  = a.approved_by
WHERE a.approval_status = 'approved';

-- Antrian absensi pending (dashboard Petugas)
CREATE OR REPLACE VIEW v_antrian_pending AS
SELECT
  a.id          AS attendance_id,
  u.name        AS nama_pelajar,
  u.warn_count,
  u.is_flagged,
  c.name        AS kelas,
  uc.absen_number,
  a.full_name,
  a.status,
  a.notes,
  a.submitted_at
FROM attendances a
JOIN  users        u  ON u.id  = a.user_id
JOIN  classes      c  ON c.id  = a.class_id
LEFT JOIN user_classes uc ON uc.user_id = a.user_id AND uc.class_id = a.class_id
WHERE a.approval_status = 'pending'
  AND u.is_active = 1
ORDER BY a.submitted_at ASC;

-- Rekap warn per pelajar (monitoring Petugas & Admin)
CREATE OR REPLACE VIEW v_rekap_warn AS
SELECT
  u.id    AS student_id,
  u.name  AS nama_pelajar,
  GROUP_CONCAT(c.name ORDER BY c.name SEPARATOR ', ') AS kelas,
  u.warn_count,
  u.is_flagged,
  COUNT(w.id) AS total_warn_records
FROM users u
LEFT JOIN user_classes uc ON uc.user_id   = u.id
LEFT JOIN classes      c  ON c.id         = uc.class_id
LEFT JOIN warnings     w  ON w.student_id = u.id
WHERE u.role     IN ('pelajar', 'ketua_kelas')
  AND u.is_active = 1
GROUP BY u.id, u.name, u.warn_count, u.is_flagged
ORDER BY u.warn_count DESC;

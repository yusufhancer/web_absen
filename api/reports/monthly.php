<?php
require_once __DIR__ . '/../helpers/auth.php';
require_method('GET');
$user = require_roles(['guru', 'ketua_kelas']);
$year = (int)($_GET['year'] ?? date('Y'));
$month = (int)($_GET['month'] ?? date('n'));

if ($year < 2000 || $year > 2100) {
    fail('Tahun tidak valid');
}

if ($month < 1 || $month > 12) {
    fail('Bulan tidak valid');
}

$stmt = db()->prepare('SELECT u.name, u.nis, SUM(a.status = "hadir") AS hadir, SUM(a.status = "sakit") AS sakit, SUM(a.status = "izin") AS izin, COUNT(a.id) AS total_absensi FROM attendances a JOIN users u ON u.id = a.user_id WHERE a.class_id = ? AND a.approval_status = "approved" AND YEAR(a.submitted_at) = ? AND MONTH(a.submitted_at) = ? GROUP BY u.id ORDER BY u.name ASC');
$stmt->execute([$user['class_id'], $year, $month]);
ok(['items' => $stmt->fetchAll()]);

<?php
require_once __DIR__ . '/../helpers/auth.php';

require_method('GET');

$user = require_roles(['guru', 'ketua_kelas']);
$limit = (int)($_GET['limit'] ?? 5);
if ($limit < 1 || $limit > 20) {
    $limit = 5;
}

$sql = "SELECT a.id, a.absen_number, a.status, a.approval_status, a.notes, a.rejection_reason, a.submitted_at, DATE_FORMAT(a.submitted_at, '%H:%i') AS time_label, u.name AS nama_pelajar, u.nis, c.name AS class_name FROM attendances a JOIN users u ON u.id = a.user_id JOIN classes c ON c.id = a.class_id WHERE a.class_id = ? ORDER BY a.submitted_at DESC, a.id DESC LIMIT {$limit}";
$stmt = db()->prepare($sql);
$stmt->execute([$user['class_id']]);

ok(['items' => $stmt->fetchAll()]);

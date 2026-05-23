<?php
require_once __DIR__ . '/../helpers/auth.php';

require_method('GET');

$user = require_roles(['guru', 'ketua_kelas']);

$stmt = db()->prepare('SELECT a.id, a.absen_number, a.status, a.notes, a.submitted_at, u.name AS nama_pelajar, u.nis, c.name AS class_name FROM attendances a JOIN users u ON u.id = a.user_id JOIN classes c ON c.id = a.class_id WHERE a.class_id = ? AND a.approval_status = "pending" ORDER BY a.submitted_at ASC');
$stmt->execute([$user['class_id']]);

ok(['items' => $stmt->fetchAll()]);

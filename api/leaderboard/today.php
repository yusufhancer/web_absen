<?php
require_once __DIR__ . '/../helpers/auth.php';
require_method('GET');
$user = require_login();
$scopeClass = in_array($user['role'], ['guru', 'ketua_kelas'], true) ? 'AND a.class_id = ?' : '';
$sql = "SELECT u.name, u.nis, c.name AS kelas, a.submitted_at FROM attendances a JOIN users u ON u.id = a.user_id JOIN classes c ON c.id = a.class_id WHERE a.absen_date = CURDATE() AND a.status = 'hadir' AND a.approval_status = 'approved' {$scopeClass} ORDER BY a.submitted_at ASC LIMIT 10";
$stmt = db()->prepare($sql);
$stmt->execute($scopeClass ? [$user['class_id']] : []);
ok(['items' => $stmt->fetchAll()]);

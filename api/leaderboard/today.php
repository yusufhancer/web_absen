<?php
require_once __DIR__ . '/../helpers/auth.php';

require_method('GET');

$user = require_login();
$limit = (int)($_GET['limit'] ?? 10);
if ($limit < 1 || $limit > 50) {
    $limit = 10;
}

$sql = "SELECT a.id, a.absen_number, a.status, a.notes, u.name, u.nis, c.name AS kelas, a.submitted_at, DATE_FORMAT(a.submitted_at, '%H:%i') AS time_label FROM attendances a JOIN users u ON u.id = a.user_id JOIN classes c ON c.id = a.class_id WHERE a.absen_date = CURDATE() AND a.approval_status = 'approved' AND a.class_id = ? ORDER BY CASE WHEN a.status IN ('sakit', 'izin') THEN 0 ELSE 1 END, FIELD(a.status, 'sakit', 'izin', 'hadir'), a.submitted_at ASC, a.id ASC LIMIT {$limit}";
$stmt = db()->prepare($sql);
$stmt->execute([$user['class_id']]);
$items = $stmt->fetchAll();

$presentRank = 0;
foreach ($items as $index => &$item) {
    $item['rank'] = $index + 1;
    $item['present_rank'] = $item['status'] === 'hadir' ? ++$presentRank : null;
}
unset($item);

ok(['items' => $items]);

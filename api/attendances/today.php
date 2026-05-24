<?php
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/time.php';
require_method('GET');
$user = require_login();
$demoToday = app_today();
$stmt = db()->prepare($demoToday
    ? 'SELECT id, status, approval_status, rejection_reason, submitted_at FROM attendances WHERE user_id = ? AND absen_date = ?'
    : 'SELECT id, status, approval_status, rejection_reason, submitted_at FROM attendances WHERE user_id = ? AND absen_date = CURDATE()'
);
$params = [$user['id']];
if ($demoToday) {
    $params[] = $demoToday;
}
$stmt->execute($params);
ok(['attendance' => $stmt->fetch() ?: null]);

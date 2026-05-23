<?php
require_once __DIR__ . '/../helpers/auth.php';
require_method('GET');
$user = require_login();
$stmt = db()->prepare('SELECT id, status, approval_status, rejection_reason, submitted_at FROM attendances WHERE user_id = ? AND absen_date = CURDATE()');
$stmt->execute([$user['id']]);
ok(['attendance' => $stmt->fetch() ?: null]);

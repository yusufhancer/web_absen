<?php
require_once __DIR__ . '/../helpers/auth.php';
require_method('GET');
$user = require_login();
$stmt = db()->prepare('SELECT id, status, approval_status, rejection_reason, submitted_at FROM attendances WHERE user_id = ? ORDER BY submitted_at DESC LIMIT 10');
$stmt->execute([$user['id']]);
ok(['items' => $stmt->fetchAll()]);

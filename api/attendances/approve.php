<?php
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/time.php';
require_method('POST');
$user = require_roles(['guru', 'ketua_kelas']);
$input = read_input();
$id = (int)($input['id'] ?? $input['attendance_id'] ?? 0);
if ($id < 1) fail('ID absensi tidak valid');
$demoNow = app_now();
$stmt = db()->prepare($demoNow
    ? 'UPDATE attendances SET approval_status = "approved", approved_by = ?, approved_at = ?, rejection_reason = NULL WHERE id = ? AND class_id = ? AND approval_status = "pending"'
    : 'UPDATE attendances SET approval_status = "approved", approved_by = ?, approved_at = NOW(), rejection_reason = NULL WHERE id = ? AND class_id = ? AND approval_status = "pending"'
);
$params = $demoNow ? [$user['id'], $demoNow, $id, $user['class_id']] : [$user['id'], $id, $user['class_id']];
$stmt->execute($params);
if ($stmt->rowCount() < 1) fail('Absensi tidak ditemukan / sudah direview', 404);
ok([], 'Absensi disetujui');

<?php
require_once __DIR__ . '/../helpers/auth.php';
require_method('POST');
$user = require_roles(['guru', 'ketua_kelas']);
$input = read_input();
$id = (int)($input['id'] ?? $input['attendance_id'] ?? 0);
if ($id < 1) fail('ID absensi tidak valid');
$stmt = db()->prepare('UPDATE attendances SET approval_status = "approved", approved_by = ?, approved_at = NOW(), rejection_reason = NULL WHERE id = ? AND class_id = ? AND approval_status = "pending"');
$stmt->execute([$user['id'], $id, $user['class_id']]);
if ($stmt->rowCount() < 1) fail('Absensi tidak ditemukan / sudah direview', 404);
ok([], 'Absensi disetujui');

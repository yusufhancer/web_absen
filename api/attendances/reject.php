<?php
require_once __DIR__ . '/../helpers/auth.php';
require_method('POST');
$user = require_roles(['guru', 'ketua_kelas']);
$input = read_input();
$id = (int)($input['id'] ?? $input['attendance_id'] ?? 0);
$reason = trim($input['reason'] ?? $input['rejection_reason'] ?? '');
if ($id < 1) fail('ID absensi tidak valid');
if ($reason === '') fail('Alasan penolakan wajib diisi');
$stmt = db()->prepare('UPDATE attendances SET approval_status = "rejected", approved_by = ?, approved_at = NOW(), rejection_reason = ? WHERE id = ? AND class_id = ? AND approval_status = "pending"');
$stmt->execute([$user['id'], $reason, $id, $user['class_id']]);
if ($stmt->rowCount() < 1) fail('Absensi tidak ditemukan / sudah direview', 404);
ok([], 'Absensi ditolak');

<?php
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/session.php';
require_method('POST');
$input = read_input();
$nis = trim($input['nis'] ?? '');
$name = trim($input['name'] ?? $input['nama'] ?? $input['fullname'] ?? '');
$password = (string)($input['password'] ?? '');
$classId = (int)($input['class_id'] ?? $input['kelas'] ?? $input['class'] ?? 0);
if ($classId > 9) { $classId = $classId - 9; }
if ($nis === '' || $name === '' || $password === '' || $classId < 1 || $classId > 3) fail('Data registrasi belum lengkap');
$stmt = db()->prepare('INSERT INTO users (nis, name, password_hash, role, class_id) VALUES (?, ?, ?, "pelajar", ?)');
try {
    $stmt->execute([$nis, $name, password_hash($password, PASSWORD_BCRYPT), $classId]);
    ok([], 'Registrasi berhasil');
} catch (PDOException $e) {
    if ($e->getCode() === '23000') fail('NIS sudah terdaftar', 409);
    throw $e;
}

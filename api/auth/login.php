<?php
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/session.php';

require_method('POST');

$input = read_input();
$nis = trim($input['nis'] ?? '');
$password = (string)($input['password'] ?? '');
$role = strtolower(trim($input['role'] ?? ''));

$roleMap = [
    'guru' => 'guru',
    'ketua kelas' => 'ketua_kelas',
    'ketua-kelas' => 'ketua_kelas',
    'ketua_kelas' => 'ketua_kelas',
    'pelajar' => 'pelajar',
];
$role = $roleMap[$role] ?? '';

if ($nis === '' || $password === '') fail('NIS dan password wajib diisi');

$stmt = db()->prepare('SELECT u.id, u.nis, u.name, u.password_hash, u.role, u.class_id, c.name AS class_name FROM users u JOIN classes c ON c.id = u.class_id WHERE u.nis = ?');
$stmt->execute([$nis]);
$user = $stmt->fetch();

if (!$user || !password_verify($password, $user['password_hash'])) fail('NIS atau password salah', 401);
if ($role !== '' && $user['role'] !== $role) fail('Role tidak sesuai akun', 403);

$_SESSION['user_id'] = (int)$user['id'];
unset($user['password_hash']);
ok(['user' => $user], 'Login berhasil');

<?php
require_once __DIR__ . '/../helpers/auth.php';
require_method('GET');
$user = current_user();
ok(['user' => $user], $user ? 'Session aktif' : 'Belum login');

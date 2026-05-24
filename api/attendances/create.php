<?php
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/time.php';

require_method('POST');

$user = require_roles(['pelajar', 'ketua_kelas']);
$input = read_input();

$status = strtolower(trim((string)($input['status'] ?? '')));
$absenNumber = filter_var($input['absen_number'] ?? $input['nomor_absen'] ?? null, FILTER_VALIDATE_INT);
$notes = trim((string)($input['notes'] ?? $input['catatan'] ?? $input['kata_hari_ini'] ?? ''));

if (!in_array($status, ['hadir', 'sakit', 'izin'], true)) {
    fail('Status tidak valid');
}

if ($absenNumber === false || $absenNumber < 1 || $absenNumber > 99) {
    fail('Nomor absen harus 1-99');
}

if (mb_strlen($notes) > 100) {
    fail('Kata hari ini maksimal 100 karakter');
}

if (attendance_closed()) {
    fail('Waktu presensi sudah ditutup', 403);
}

$demoNow = app_now();
$stmt = db()->prepare($demoNow
    ? 'INSERT INTO attendances (user_id, class_id, absen_number, status, notes, submitted_at) VALUES (?, ?, ?, ?, ?, ?)'
    : 'INSERT INTO attendances (user_id, class_id, absen_number, status, notes, submitted_at) VALUES (?, ?, ?, ?, ?, NOW())'
);

try {
    $params = [
        $user['id'],
        $user['class_id'],
        $absenNumber,
        $status,
        $notes !== '' ? $notes : null,
    ];

    if ($demoNow) {
        $params[] = $demoNow;
    }

    $stmt->execute($params);

    $id = db()->lastInsertId();
    $createdStmt = db()->prepare('SELECT id, status, notes, submitted_at FROM attendances WHERE id = ?');
    $createdStmt->execute([$id]);

    ok(['attendance' => $createdStmt->fetch()], 'Absensi terkirim');
} catch (PDOException $e) {
    if ($e->getCode() === '23000') {
        fail('Sudah absen hari ini', 409);
    }

    throw $e;
}


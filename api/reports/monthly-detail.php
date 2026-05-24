<?php
require_once __DIR__ . '/../helpers/auth.php';

require_method('GET');

$user = require_roles(['guru', 'ketua_kelas']);
$year = (int)($_GET['year'] ?? date('Y'));
$month = (int)($_GET['month'] ?? date('n'));

if ($year < 2000 || $year > 2100) {
    fail('Tahun tidak valid');
}

if ($month < 1 || $month > 12) {
    fail('Bulan tidak valid');
}

$daysInMonth = cal_days_in_month(CAL_GREGORIAN, $month, $year);
$days = [];
for ($day = 1; $day <= $daysInMonth; $day++) {
    $date = sprintf('%04d-%02d-%02d', $year, $month, $day);
    $days[] = [
        'date' => $date,
        'day' => $day,
        'label' => date('D', strtotime($date)),
    ];
}

$studentStmt = db()->prepare('SELECT id, nis, name FROM users WHERE class_id = ? AND role IN ("pelajar", "ketua_kelas") ORDER BY name ASC');
$studentStmt->execute([$user['class_id']]);
$students = $studentStmt->fetchAll();

$attendanceStmt = db()->prepare('SELECT a.user_id, a.status, a.submitted_at, a.notes, DATE(a.submitted_at) AS absen_date FROM attendances a WHERE a.class_id = ? AND a.approval_status = "approved" AND YEAR(a.submitted_at) = ? AND MONTH(a.submitted_at) = ? ORDER BY a.submitted_at ASC, a.id ASC');
$attendanceStmt->execute([$user['class_id'], $year, $month]);
$attendances = $attendanceStmt->fetchAll();

$byUserDate = [];
foreach ($attendances as $attendance) {
    $byUserDate[$attendance['user_id']][$attendance['absen_date']] = [
        'status' => $attendance['status'],
        'submitted_at' => $attendance['submitted_at'],
        'notes' => $attendance['notes'],
    ];
}

$items = [];
foreach ($students as $student) {
    $summary = ['hadir' => 0, 'sakit' => 0, 'izin' => 0, 'alpha' => 0];
    $daily = [];

    foreach ($days as $day) {
        $record = $byUserDate[$student['id']][$day['date']] ?? null;
        $status = $record['status'] ?? 'alpha';
        $summary[$status]++;
        $daily[] = [
            'date' => $day['date'],
            'status' => $status,
            'submitted_at' => $record['submitted_at'] ?? null,
            'notes' => $record['notes'] ?? null,
        ];
    }

    $items[] = [
        'id' => $student['id'],
        'nis' => $student['nis'],
        'name' => $student['name'],
        'summary' => $summary,
        'daily' => $daily,
    ];
}

ok([
    'year' => $year,
    'month' => $month,
    'class_id' => $user['class_id'],
    'class_name' => $user['class_name'],
    'days' => $days,
    'items' => $items,
]);

<?php
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/time.php';

require_method('GET');
require_login();

ok([
    'demo_mode' => demo_mode_enabled(),
    'demo_datetime' => get_demo_datetime(),
    'attendance_limit_time' => attendance_limit_time(),
    'attendance_closed' => attendance_closed(),
]);

<?php
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/time.php';

if (!demo_mode_enabled()) {
    fail('Demo mode nonaktif', 404);
}

require_login();

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    ok([
        'demo_mode' => true,
        'datetime' => get_demo_datetime(),
        'server_datetime' => date('Y-m-d H:i:s'),
    ]);
}

if ($method === 'POST') {
    $input = read_input();
    $datetime = set_demo_datetime((string)($input['datetime'] ?? ''));
    ok(['demo_mode' => true, 'datetime' => $datetime], 'Datetime demo disimpan');
}

if ($method === 'DELETE') {
    clear_demo_datetime();
    ok(['demo_mode' => true, 'datetime' => null], 'Datetime demo direset');
}

fail('Method tidak valid', 405);

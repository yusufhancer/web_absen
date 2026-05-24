<?php
require_once __DIR__ . '/../config/env.php';

function demo_mode_enabled(): bool
{
    return app_env_bool('DEMO_MODE', false);
}

function demo_time_path(): string
{
    return sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'sihadir-dev-clock.json';
}

function normalize_demo_datetime(string $value): ?string
{
    $value = trim(str_replace('T', ' ', $value));
    if (preg_match('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/', $value)) {
        $value .= ':00';
    }

    $date = DateTime::createFromFormat('Y-m-d H:i:s', $value);
    if (!$date || $date->format('Y-m-d H:i:s') !== $value) {
        return null;
    }

    return $value;
}

function get_demo_datetime(): ?string
{
    if (!demo_mode_enabled()) {
        return null;
    }

    $path = demo_time_path();
    if (!is_file($path)) {
        return null;
    }

    $data = json_decode(file_get_contents($path) ?: '', true);
    $datetime = is_array($data) ? ($data['datetime'] ?? null) : null;

    return is_string($datetime) ? normalize_demo_datetime($datetime) : null;
}

function set_demo_datetime(string $value): string
{
    $datetime = normalize_demo_datetime($value);
    if (!$datetime) {
        fail('Datetime demo tidak valid');
    }

    file_put_contents(demo_time_path(), json_encode(['datetime' => $datetime], JSON_UNESCAPED_UNICODE));
    return $datetime;
}

function clear_demo_datetime(): void
{
    $path = demo_time_path();
    if (is_file($path)) {
        unlink($path);
    }
}

function app_now(): ?string
{
    return get_demo_datetime();
}

function app_today(): ?string
{
    $datetime = app_now();
    return $datetime ? substr($datetime, 0, 10) : null;
}

function attendance_limit_time(): string
{
    $value = app_env('ATTENDANCE_LIMIT_TIME', '08:00') ?: '08:00';
    return preg_match('/^\d{2}:\d{2}$/', $value) ? $value : '08:00';
}

function attendance_closed(): bool
{
    $limit = attendance_limit_time() . ':00';
    $demoNow = app_now();

    if ($demoNow) {
        return substr($demoNow, 11, 8) > $limit;
    }

    $stmt = db()->query('SELECT CURTIME() AS current_time');
    $row = $stmt->fetch();

    return (($row['current_time'] ?? '00:00:00') > $limit);
}

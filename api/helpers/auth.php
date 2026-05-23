<?php
require_once __DIR__ . '/../config/session.php';
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/response.php';

function current_user(): ?array
{
    if (empty($_SESSION['user_id'])) {
        return null;
    }

    $stmt = db()->prepare('SELECT u.id, u.nis, u.name, u.role, u.class_id, c.name AS class_name FROM users u JOIN classes c ON c.id = u.class_id WHERE u.id = ?');
    $stmt->execute([$_SESSION['user_id']]);
    $user = $stmt->fetch();

    return $user ?: null;
}

function require_login(): array
{
    $user = current_user();
    if (!$user) {
        fail('Belum login', 401);
    }
    return $user;
}

function require_roles(array $roles): array
{
    $user = require_login();
    if (!in_array($user['role'], $roles, true)) {
        fail('Akses ditolak', 403);
    }
    return $user;
}

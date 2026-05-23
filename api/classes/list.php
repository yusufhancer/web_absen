<?php
require_once __DIR__ . '/../helpers/auth.php';
require_method('GET');
$stmt = db()->query('SELECT id, name FROM classes ORDER BY id ASC');
ok(['items' => $stmt->fetchAll()]);

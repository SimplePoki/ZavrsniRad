<?php

require_once __DIR__.'/Env.php';

Env::load(__DIR__.'/../../.env');

$host = $_ENV['DB_HOST'];
$port = $_ENV['DB_PORT'];
$service = $_ENV['DB_SERVICE'];
$user = $_ENV['DB_USER'];
$password = $_ENV['DB_PASSWORD'];
$charset = $_ENV['DB_CHARSET'] ?? 'AL32UTF8';

try {
    $conn = new PDO(
        "oci:dbname=//$host:$port/$service;charset=$charset",
        $user,
        $password
    );

    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode([
        'error' => 'Greška spajanja na bazu podataka'
    ]);
    exit;
}
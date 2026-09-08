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
    $conn->setAttribute(PDO::ATTR_CASE, PDO::CASE_LOWER);

    // Oracle inače vraća datume u NLS lokalnom formatu (npr. "01-JUN-26...")
    // koji JS `new Date()` ne zna parsirati - forsiramo ISO 8601 na sesiji.
    $conn->exec("ALTER SESSION SET NLS_DATE_FORMAT = 'YYYY-MM-DD\"T\"HH24:MI:SS'");
    $conn->exec("ALTER SESSION SET NLS_TIMESTAMP_FORMAT = 'YYYY-MM-DD\"T\"HH24:MI:SS.FF3'");
    $conn->exec("ALTER SESSION SET NLS_TIMESTAMP_TZ_FORMAT = 'YYYY-MM-DD\"T\"HH24:MI:SS.FF3TZH:TZM'");
} catch (PDOException $e) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode([
        'error' => 'Greška spajanja na bazu podataka'
    ]);
    exit;
}
<?php

require_once '../config/database.php';
require_once '../helpers/response.php';
require_once '../helpers/auth.php';

requireLogin();

$id = $_GET['id'] ?? null;

if ($id === null) {
    jsonResponse(['error' => 'id je obavezan'], 400);
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $conn->prepare('SELECT id, naziv, opis, aktivan, created_at, updated_at FROM tip_evidencije WHERE id = :id');
    $stmt->execute(['id' => $id]);
    $tip = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($tip === false) {
        jsonResponse(['error' => 'Tip evidencije nije pronađen'], 404);
    }

    jsonResponse($tip);
}

if ($method === 'PUT') {
    requireMaxRole(ROLE_SUPERADMIN);

    $data = json_decode(file_get_contents('php://input'), true);

    $naziv = $data['naziv'] ?? null;
    $opis = $data['opis'] ?? null;

    if ($naziv === null || $opis === null) {
        jsonResponse(['error' => 'naziv i opis su obavezni'], 400);
    }

    $stmt = $conn->prepare('UPDATE tip_evidencije SET naziv = :naziv, opis = :opis WHERE id = :id');
    $stmt->execute(['naziv' => $naziv, 'opis' => $opis, 'id' => $id]);

    if ($stmt->rowCount() === 0) {
        jsonResponse(['error' => 'Tip evidencije nije pronađen'], 404);
    }

    jsonResponse(['id' => $id, 'naziv' => $naziv, 'opis' => $opis]);
}

if ($method === 'DELETE') {
    requireMaxRole(ROLE_SUPERADMIN);

    $stmt = $conn->prepare('UPDATE tip_evidencije SET aktivan = 0 WHERE id = :id');
    $stmt->execute(['id' => $id]);

    if ($stmt->rowCount() === 0) {
        jsonResponse(['error' => 'Tip evidencije nije pronađen'], 404);
    }

    jsonResponse(['message' => 'Tip evidencije deaktiviran']);
}

jsonResponse(['error' => 'Metoda nije podržana'], 405);

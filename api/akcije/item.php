<?php

require_once '../config/database.php';
require_once '../helpers/response.php';
require_once '../helpers/auth.php';

requireLogin();

$id = $_GET['id'] ?? null;
$tip_id = $_GET['tip_id'] ?? null;

if ($id === null || $tip_id === null) {
    jsonResponse(['error' => 'id i tip_id su obavezni'], 400);
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $conn->prepare('SELECT id, tip_id, naziv, opis, aktivna, created_at, updated_at FROM akcije WHERE id = :id AND tip_id = :tip_id');
    $stmt->execute(['id' => $id, 'tip_id' => $tip_id]);
    $akcija = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($akcija === false) {
        jsonResponse(['error' => 'Akcija nije pronađena'], 404);
    }

    jsonResponse($akcija);
}

if ($method === 'PUT') {
    requireMaxRole(ROLE_SUPERADMIN);

    $data = json_decode(file_get_contents('php://input'), true);

    $naziv = $data['naziv'] ?? null;
    $opis = $data['opis'] ?? null;

    if ($naziv === null || $opis === null) {
        jsonResponse(['error' => 'naziv i opis su obavezni'], 400);
    }

    $stmt = $conn->prepare('UPDATE akcije SET naziv = :naziv, opis = :opis WHERE id = :id AND tip_id = :tip_id');
    $stmt->execute(['naziv' => $naziv, 'opis' => $opis, 'id' => $id, 'tip_id' => $tip_id]);

    if ($stmt->rowCount() === 0) {
        jsonResponse(['error' => 'Akcija nije pronađena'], 404);
    }

    jsonResponse(['id' => $id, 'tip_id' => $tip_id, 'naziv' => $naziv, 'opis' => $opis]);
}

if ($method === 'DELETE') {
    requireMaxRole(ROLE_SUPERADMIN);

    $stmt = $conn->prepare('UPDATE akcije SET aktivna = false WHERE id = :id AND tip_id = :tip_id');
    $stmt->execute(['id' => $id, 'tip_id' => $tip_id]);

    if ($stmt->rowCount() === 0) {
        jsonResponse(['error' => 'Akcija nije pronađena'], 404);
    }

    jsonResponse(['message' => 'Akcija deaktivirana']);
}

jsonResponse(['error' => 'Metoda nije podržana'], 405);

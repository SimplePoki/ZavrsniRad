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
    $stmt = $conn->prepare('SELECT id, ime, prezime, lokacija_id, aktivan, created_at, updated_at FROM umirovljenik WHERE id = :id');
    $stmt->execute(['id' => $id]);
    $umirovljenik = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($umirovljenik === false) {
        jsonResponse(['error' => 'Umirovljenik nije pronađen'], 404);
    }

    jsonResponse($umirovljenik);
}

if ($method === 'PUT') {
    requireMaxRole(ROLE_ADMIN);

    $data = json_decode(file_get_contents('php://input'), true);

    $ime = $data['ime'] ?? null;
    $prezime = $data['prezime'] ?? null;
    $lokacija_id = $data['lokacija_id'] ?? null;

    if ($ime === null || $prezime === null || $lokacija_id === null) {
        jsonResponse(['error' => 'Ime, prezime i lokacija_id su obavezni'], 400);
    }

    $stmt = $conn->prepare('UPDATE umirovljenik SET ime = :ime, prezime = :prezime, lokacija_id = :lokacija_id WHERE id = :id');
    $stmt->execute([
        'ime' => $ime,
        'prezime' => $prezime,
        'lokacija_id' => $lokacija_id,
        'id' => $id
    ]);

    if ($stmt->rowCount() === 0) {
        jsonResponse(['error' => 'Umirovljenik nije pronađen'], 404);
    }

    jsonResponse(['id' => $id, 'ime' => $ime, 'prezime' => $prezime, 'lokacija_id' => $lokacija_id]);
}

if ($method === 'DELETE') {
    requireMaxRole(ROLE_ADMIN);

    $stmt = $conn->prepare('UPDATE umirovljenik SET aktivan = false WHERE id = :id');
    $stmt->execute(['id' => $id]);

    if ($stmt->rowCount() === 0) {
        jsonResponse(['error' => 'Umirovljenik nije pronađen'], 404);
    }

    jsonResponse(['message' => 'Umirovljenik deaktiviran']);
}

jsonResponse(['error' => 'Metoda nije podržana'], 405);

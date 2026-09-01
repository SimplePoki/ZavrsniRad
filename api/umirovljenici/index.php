<?php

require_once '../config/database.php';
require_once '../helpers/response.php';
require_once '../helpers/auth.php';

requireLogin();

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $conn->query('SELECT id, ime, prezime, lokacija_id, aktivan, created_at, updated_at FROM umirovljenik ORDER BY prezime');
    $umirovljenici = $stmt->fetchAll(PDO::FETCH_ASSOC);
    jsonResponse($umirovljenici);
}

if ($method === 'POST') {
    requireMaxRole(ROLE_ADMIN);

    $data = json_decode(file_get_contents('php://input'), true);

    $ime = $data['ime'] ?? null;
    $prezime = $data['prezime'] ?? null;
    $lokacija_id = $data['lokacija_id'] ?? null;

    if ($ime === null || $prezime === null || $lokacija_id === null) {
        jsonResponse(['error' => 'Ime, prezime i lokacija_id su obavezni'], 400);
    }

    $stmt = $conn->prepare('INSERT INTO umirovljenik (ime, prezime, lokacija_id) VALUES (:ime, :prezime, :lokacija_id) RETURNING id');
    $stmt->execute([
        'ime' => $ime,
        'prezime' => $prezime,
        'lokacija_id' => $lokacija_id
    ]);
    $noviId = $stmt->fetchColumn();

    jsonResponse(['id' => $noviId, 'ime' => $ime, 'prezime' => $prezime, 'lokacija_id' => $lokacija_id], 201);
}

jsonResponse(['error' => 'Metoda nije podržana'], 405);

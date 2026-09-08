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
    $stmt = $conn->prepare('SELECT id, umirovljenik_id, lokacija_id, izvrsio_id, akcija_tip_id, akcija_id, datum_vrijeme, vrijednost_num, vrijednost_string, vrijednost_bool, opis, created_at, updated_at FROM evidencije WHERE id = :id');
    $stmt->execute(['id' => $id]);
    $evidencija = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($evidencija === false) {
        jsonResponse(['error' => 'Evidencija nije pronađena'], 404);
    }

    jsonResponse($evidencija);
}

if ($method === 'PUT') {
    requireMaxRole(ROLE_ADMIN);

    $data = json_decode(file_get_contents('php://input'), true);

    $vrijednost_num = $data['vrijednost_num'] ?? null;
    $vrijednost_string = $data['vrijednost_string'] ?? null;
    $vrijednost_bool = $data['vrijednost_bool'] ?? null;
    $opis = $data['opis'] ?? null;

    if ($vrijednost_num === null && $vrijednost_string === null && $vrijednost_bool === null && $opis === null) {
        jsonResponse(['error' => 'Mora biti unesena barem jedna vrijednost'], 400);
    }

    $stmt = $conn->prepare('UPDATE evidencije SET vrijednost_num = :vrijednost_num, vrijednost_string = :vrijednost_string, vrijednost_bool = :vrijednost_bool, opis = :opis WHERE id = :id');
    $stmt->execute([
        'vrijednost_num' => $vrijednost_num,
        'vrijednost_string' => $vrijednost_string,
        'vrijednost_bool' => $vrijednost_bool,
        'opis' => $opis,
        'id' => $id
    ]);

    if ($stmt->rowCount() === 0) {
        jsonResponse(['error' => 'Evidencija nije pronađena'], 404);
    }

    jsonResponse(['id' => $id, 'vrijednost_num' => $vrijednost_num, 'vrijednost_string' => $vrijednost_string, 'vrijednost_bool' => $vrijednost_bool, 'opis' => $opis]);
}

if ($method === 'DELETE') {
    requireMaxRole(ROLE_ADMIN);

    $stmt = $conn->prepare('DELETE FROM evidencije WHERE id = :id');
    $stmt->execute(['id' => $id]);

    if ($stmt->rowCount() === 0) {
        jsonResponse(['error' => 'Evidencija nije pronađena'], 404);
    }

    jsonResponse(['message' => 'Evidencija obrisana']);
}

jsonResponse(['error' => 'Metoda nije podržana'], 405);

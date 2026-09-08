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
    $stmt = $conn->prepare('SELECT id, umirovljenik_id, ime, prezime, datum, upisao_id, created_at, updated_at FROM posjeti WHERE id = :id');
    $stmt->execute(['id' => $id]);
    $posjet = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($posjet === false) {
        jsonResponse(['error' => 'Posjeta nije pronađena'], 404);
    }

    jsonResponse($posjet);
}

if ($method === 'PUT') {
    $data = json_decode(file_get_contents('php://input'), true);

    $umirovljenik_id = $data['umirovljenik_id'] ?? null;
    $ime = $data['ime'] ?? null;
    $prezime = $data['prezime'] ?? null;
    $datum = $data['datum'] ?? null;

    if ($umirovljenik_id === null || $ime === null || $prezime === null || $datum === null) {
        jsonResponse(['error' => 'umirovljenik_id, ime, prezime i datum su obavezni'], 400);
    }

    $stmt = $conn->prepare('UPDATE posjeti SET umirovljenik_id = :umirovljenik_id, ime = :ime, prezime = :prezime, datum = :datum WHERE id = :id');
    $stmt->execute([
        'umirovljenik_id' => $umirovljenik_id,
        'ime' => $ime,
        'prezime' => $prezime,
        'datum' => $datum,
        'id' => $id
    ]);

    if ($stmt->rowCount() === 0) {
        jsonResponse(['error' => 'Posjeta nije pronađena'], 404);
    }

    jsonResponse(['id' => $id, 'umirovljenik_id' => $umirovljenik_id, 'ime' => $ime, 'prezime' => $prezime, 'datum' => $datum]);
}

if ($method === 'DELETE') {
    $stmt = $conn->prepare('DELETE FROM posjeti WHERE id = :id');
    $stmt->execute(['id' => $id]);

    if ($stmt->rowCount() === 0) {
        jsonResponse(['error' => 'Posjeta nije pronađena'], 404);
    }

    jsonResponse(['message' => 'Posjeta obrisana']);
}

jsonResponse(['error' => 'Metoda nije podržana'], 405);

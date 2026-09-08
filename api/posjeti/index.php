<?php

require_once '../config/database.php';
require_once '../helpers/response.php';
require_once '../helpers/auth.php';

$trenutniKorisnik = requireLogin();

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $conn->query('SELECT id, umirovljenik_id, ime, prezime, datum, upisao_id, created_at, updated_at FROM posjeti ORDER BY datum DESC');
    $posjeti = $stmt->fetchAll(PDO::FETCH_ASSOC);
    jsonResponse($posjeti);
}

if ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);

    $umirovljenik_id = $data['umirovljenik_id'] ?? null;
    $ime = $data['ime'] ?? null;
    $prezime = $data['prezime'] ?? null;
    $datum = $data['datum'] ?? null;

    if ($umirovljenik_id === null || $ime === null || $prezime === null || $datum === null) {
        jsonResponse(['error' => 'umirovljenik_id, ime, prezime i datum su obavezni'], 400);
    }

    $stmt = $conn->prepare('INSERT INTO posjeti (umirovljenik_id, ime, prezime, datum, upisao_id) VALUES (:umirovljenik_id, :ime, :prezime, :datum, :upisao_id) RETURNING id');
    $stmt->execute([
        'umirovljenik_id' => $umirovljenik_id,
        'ime' => $ime,
        'prezime' => $prezime,
        'datum' => $datum,
        'upisao_id' => $trenutniKorisnik['id']
    ]);
    $noviId = $stmt->fetchColumn();

    jsonResponse(['id' => $noviId, 'umirovljenik_id' => $umirovljenik_id, 'ime' => $ime, 'prezime' => $prezime, 'datum' => $datum, 'upisao_id' => $trenutniKorisnik['id']], 201);
}

jsonResponse(['error' => 'Metoda nije podržana'], 405);

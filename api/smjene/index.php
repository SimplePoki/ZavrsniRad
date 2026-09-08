<?php

require_once '../config/database.php';
require_once '../helpers/response.php';
require_once '../helpers/auth.php';

requireLogin();

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $conn->query('SELECT id, korisnik_id, datum, smjena, created_at, updated_at FROM smjene ORDER BY datum DESC');
    $smjene = $stmt->fetchAll(PDO::FETCH_ASSOC);
    jsonResponse($smjene);
}

if ($method === 'POST') {
    requireMaxRole(ROLE_ADMIN);

    $data = json_decode(file_get_contents('php://input'), true);

    $korisnik_id = $data['korisnik_id'] ?? null;
    $datum = $data['datum'] ?? null;
    $smjena = $data['smjena'] ?? null;

    if ($korisnik_id === null || $datum === null || $smjena === null) {
        jsonResponse(['error' => 'korisnik_id, datum i smjena su obavezni'], 400);
    }

    try {
        $stmt = $conn->prepare('INSERT INTO smjene (korisnik_id, datum, smjena) VALUES (:korisnik_id, :datum, :smjena) RETURNING id');
        $stmt->execute(['korisnik_id' => $korisnik_id, 'datum' => $datum, 'smjena' => $smjena]);
    } catch (PDOException $e) {
        jsonResponse(['error' => 'Neispravan korisnik_id'], 409);
    }

    $noviId = $stmt->fetchColumn();

    jsonResponse(['id' => $noviId, 'korisnik_id' => $korisnik_id, 'datum' => $datum, 'smjena' => $smjena], 201);
}

jsonResponse(['error' => 'Metoda nije podržana'], 405);

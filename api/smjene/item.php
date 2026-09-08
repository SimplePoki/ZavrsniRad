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
    $stmt = $conn->prepare('SELECT id, korisnik_id, datum, smjena, created_at, updated_at FROM smjene WHERE id = :id');
    $stmt->execute(['id' => $id]);
    $smjena = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($smjena === false) {
        jsonResponse(['error' => 'Smjena nije pronađena'], 404);
    }

    jsonResponse($smjena);
}

if ($method === 'PUT') {
    requireMaxRole(ROLE_ADMIN);

    $data = json_decode(file_get_contents('php://input'), true);

    $korisnik_id = $data['korisnik_id'] ?? null;
    $datum = $data['datum'] ?? null;
    $smjena = $data['smjena'] ?? null;

    if ($korisnik_id === null || $datum === null || $smjena === null) {
        jsonResponse(['error' => 'korisnik_id, datum i smjena su obavezni'], 400);
    }

    $stmt = $conn->prepare('UPDATE smjene SET korisnik_id = :korisnik_id, datum = :datum, smjena = :smjena WHERE id = :id');
    $stmt->execute(['korisnik_id' => $korisnik_id, 'datum' => $datum, 'smjena' => $smjena, 'id' => $id]);

    if ($stmt->rowCount() === 0) {
        jsonResponse(['error' => 'Smjena nije pronađena'], 404);
    }

    jsonResponse(['id' => $id, 'korisnik_id' => $korisnik_id, 'datum' => $datum, 'smjena' => $smjena]);
}

if ($method === 'DELETE') {
    requireMaxRole(ROLE_ADMIN);

    $stmt = $conn->prepare('DELETE FROM smjene WHERE id = :id');
    $stmt->execute(['id' => $id]);

    if ($stmt->rowCount() === 0) {
        jsonResponse(['error' => 'Smjena nije pronađena'], 404);
    }

    jsonResponse(['message' => 'Smjena obrisana']);
}

jsonResponse(['error' => 'Metoda nije podržana'], 405);

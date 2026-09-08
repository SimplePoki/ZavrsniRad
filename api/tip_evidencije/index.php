<?php

require_once '../config/database.php';
require_once '../helpers/response.php';
require_once '../helpers/auth.php';

requireLogin();

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $conn->query('SELECT id, naziv, opis, aktivan, created_at, updated_at FROM tip_evidencije ORDER BY id');
    $tipovi = $stmt->fetchAll(PDO::FETCH_ASSOC);
    jsonResponse($tipovi);
}

if ($method === 'POST') {
    requireMaxRole(ROLE_SUPERADMIN);

    $data = json_decode(file_get_contents('php://input'), true);

    $id = $data['id'] ?? null;
    $naziv = $data['naziv'] ?? null;
    $opis = $data['opis'] ?? null;

    if ($id === null || $naziv === null || $opis === null) {
        jsonResponse(['error' => 'id, naziv i opis su obavezni'], 400);
    }

    try {
        $stmt = $conn->prepare('INSERT INTO tip_evidencije (id, naziv, opis) VALUES (:id, :naziv, :opis)');
        $stmt->execute(['id' => $id, 'naziv' => $naziv, 'opis' => $opis]);
    } catch (PDOException $e) {
        jsonResponse(['error' => 'Tip evidencije s tim id-jem već postoji'], 409);
    }

    jsonResponse(['id' => $id, 'naziv' => $naziv, 'opis' => $opis], 201);
}

jsonResponse(['error' => 'Metoda nije podržana'], 405);

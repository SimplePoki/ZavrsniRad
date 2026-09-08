<?php

require_once '../config/database.php';
require_once '../helpers/response.php';
require_once '../helpers/auth.php';

requireLogin();

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $conn->query('SELECT id, tip_id, naziv, opis, aktivna, created_at, updated_at FROM akcije ORDER BY tip_id, id');
    $akcije = $stmt->fetchAll(PDO::FETCH_ASSOC);
    jsonResponse($akcije);
}

if ($method === 'POST') {
    requireMaxRole(ROLE_SUPERADMIN);

    $data = json_decode(file_get_contents('php://input'), true);

    $id = $data['id'] ?? null;
    $tip_id = $data['tip_id'] ?? null;
    $naziv = $data['naziv'] ?? null;
    $opis = $data['opis'] ?? null;

    if ($id === null || $tip_id === null || $naziv === null || $opis === null) {
        jsonResponse(['error' => 'id, tip_id, naziv i opis su obavezni'], 400);
    }

    try {
        $stmt = $conn->prepare('INSERT INTO akcije (id, tip_id, naziv, opis) VALUES (:id, :tip_id, :naziv, :opis)');
        $stmt->execute(['id' => $id, 'tip_id' => $tip_id, 'naziv' => $naziv, 'opis' => $opis]);
    } catch (PDOException $e) {
        jsonResponse(['error' => 'Akcija s tim id-jem već postoji za taj tip, ili tip_id ne postoji'], 409);
    }

    jsonResponse(['id' => $id, 'tip_id' => $tip_id, 'naziv' => $naziv, 'opis' => $opis], 201);
}

jsonResponse(['error' => 'Metoda nije podržana'], 405);

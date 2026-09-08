<?php

require_once '../config/database.php';
require_once '../helpers/response.php';
require_once '../helpers/auth.php';

requireLogin();

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $conn->query('SELECT id, parent_id, naziv, tip, created_at, updated_at FROM lokacije ORDER BY id');
    $lokacije = $stmt->fetchAll(PDO::FETCH_ASSOC);
    jsonResponse($lokacije);
}

if ($method === 'POST') {
    requireMaxRole(ROLE_ADMIN);

    $data = json_decode(file_get_contents('php://input'), true);

    $parent_id = $data['parent_id'] ?? null;
    $naziv = $data['naziv'] ?? null;
    $tip = $data['tip'] ?? null;

    if ($naziv === null || $tip === null) {
        jsonResponse(['error' => 'Naziv i tip su obavezni'], 400);
    }

    $stmt = $conn->prepare('INSERT INTO lokacije (parent_id, naziv, tip) VALUES (:parent_id, :naziv, :tip) RETURNING id');
    $stmt->execute([
        'parent_id' => $parent_id,
        'naziv' => $naziv,
        'tip' => $tip
    ]);
    $noviId = $stmt->fetchColumn();

    jsonResponse(['id' => $noviId, 'parent_id' => $parent_id, 'naziv' => $naziv, 'tip' => $tip], 201);
}

jsonResponse(['error' => 'Metoda nije podržana'], 405);

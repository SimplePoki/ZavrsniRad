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
    $stmt = $conn->prepare('SELECT id, parent_id, naziv, tip, created_at, updated_at FROM lokacije WHERE id = :id');
    $stmt->execute(['id' => $id]);
    $lokacija = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($lokacija === false) {
        jsonResponse(['error' => 'Lokacija nije pronađena'], 404);
    }

    jsonResponse($lokacija);
}

if ($method === 'PUT') {
    requireMaxRole(ROLE_ADMIN);

    $data = json_decode(file_get_contents('php://input'), true);

    $parent_id = $data['parent_id'] ?? null;
    $naziv = $data['naziv'] ?? null;
    $tip = $data['tip'] ?? null;

    if ($naziv === null || $tip === null) {
        jsonResponse(['error' => 'Naziv i tip su obavezni'], 400);
    }

    $stmt = $conn->prepare('UPDATE lokacije SET parent_id = :parent_id, naziv = :naziv, tip = :tip WHERE id = :id');
    $stmt->execute([
        'parent_id' => $parent_id,
        'naziv' => $naziv,
        'tip' => $tip,
        'id' => $id
    ]);

    if ($stmt->rowCount() === 0) {
        jsonResponse(['error' => 'Lokacija nije pronađena'], 404);
    }

    jsonResponse(['id' => $id, 'parent_id' => $parent_id, 'naziv' => $naziv, 'tip' => $tip]);
}

if ($method === 'DELETE') {
    requireMaxRole(ROLE_ADMIN);

    try {
        $stmt = $conn->prepare('DELETE FROM lokacije WHERE id = :id');
        $stmt->execute(['id' => $id]);
    } catch (PDOException $e) {
        jsonResponse(['error' => 'Lokacija se ne može obrisati jer je u upotrebi (ima umirovljenike, evidencije ili podlokacije)'], 409);
    }

    if ($stmt->rowCount() === 0) {
        jsonResponse(['error' => 'Lokacija nije pronađena'], 404);
    }

    jsonResponse(['message' => 'Lokacija obrisana']);
}

jsonResponse(['error' => 'Metoda nije podržana'], 405);

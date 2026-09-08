<?php

require_once '../config/database.php';
require_once '../helpers/response.php';
require_once '../helpers/auth.php';

$trenutniKorisnik = requireLogin();

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $conn->query('SELECT id, umirovljenik_id, lokacija_id, izvrsio_id, akcija_tip_id, akcija_id, datum_vrijeme, vrijednost_num, vrijednost_string, vrijednost_bool, opis, created_at, updated_at FROM evidencije ORDER BY datum_vrijeme DESC');
    $evidencije = $stmt->fetchAll(PDO::FETCH_ASSOC);
    jsonResponse($evidencije);
}

if ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);

    $umirovljenik_id = $data['umirovljenik_id'] ?? null;
    $lokacija_id = $data['lokacija_id'] ?? null;
    $akcija_tip_id = $data['akcija_tip_id'] ?? null;
    $akcija_id = $data['akcija_id'] ?? null;
    $vrijednost_num = $data['vrijednost_num'] ?? null;
    $vrijednost_string = $data['vrijednost_string'] ?? null;
    $vrijednost_bool = $data['vrijednost_bool'] ?? null;
    $opis = $data['opis'] ?? null;

    if ($akcija_tip_id === null || $akcija_id === null) {
        jsonResponse(['error' => 'akcija_tip_id i akcija_id su obavezni'], 400);
    }

    if ($umirovljenik_id === null && $lokacija_id === null) {
        jsonResponse(['error' => 'Mora biti postavljen umirovljenik_id ili lokacija_id'], 400);
    }

    if ($vrijednost_num === null && $vrijednost_string === null && $vrijednost_bool === null && $opis === null) {
        jsonResponse(['error' => 'Mora biti unesena barem jedna vrijednost (broj, tekst, da/ne ili opis)'], 400);
    }

    try {
        $stmt = $conn->prepare('INSERT INTO evidencije (umirovljenik_id, lokacija_id, izvrsio_id, akcija_tip_id, akcija_id, vrijednost_num, vrijednost_string, vrijednost_bool, opis) VALUES (:umirovljenik_id, :lokacija_id, :izvrsio_id, :akcija_tip_id, :akcija_id, :vrijednost_num, :vrijednost_string, :vrijednost_bool, :opis) RETURNING id, datum_vrijeme');
        $stmt->execute([
            'umirovljenik_id' => $umirovljenik_id,
            'lokacija_id' => $lokacija_id,
            'izvrsio_id' => $trenutniKorisnik['id'],
            'akcija_tip_id' => $akcija_tip_id,
            'akcija_id' => $akcija_id,
            'vrijednost_num' => $vrijednost_num,
            'vrijednost_string' => $vrijednost_string,
            'vrijednost_bool' => $vrijednost_bool,
            'opis' => $opis
        ]);
    } catch (PDOException $e) {
        jsonResponse(['error' => 'Neispravni podaci (provjeri postoji li odabrana akcija/tip)'], 409);
    }

    $nova = $stmt->fetch(PDO::FETCH_ASSOC);

    jsonResponse([
        'id' => $nova['id'],
        'datum_vrijeme' => $nova['datum_vrijeme'],
        'umirovljenik_id' => $umirovljenik_id,
        'lokacija_id' => $lokacija_id,
        'izvrsio_id' => $trenutniKorisnik['id'],
        'akcija_tip_id' => $akcija_tip_id,
        'akcija_id' => $akcija_id,
        'vrijednost_num' => $vrijednost_num,
        'vrijednost_string' => $vrijednost_string,
        'vrijednost_bool' => $vrijednost_bool,
        'opis' => $opis
    ], 201);
}

jsonResponse(['error' => 'Metoda nije podržana'], 405);

<?php

require_once '../config/database.php';
require_once '../helpers/response.php';
require_once '../helpers/auth.php';

requireLogin();

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $conn->query('SELECT id, ime, prezime, email, uloga, aktivan, created_at, updated_at FROM korisnik ORDER BY prezime, ime');
    $korisnici = $stmt->fetchAll(PDO::FETCH_ASSOC);
    jsonResponse($korisnici);
}

if ($method === 'POST') {
    requireMaxRole(ROLE_ADMIN);

    $data = json_decode(file_get_contents('php://input'), true);

    $ime = $data['ime'] ?? null;
    $prezime = $data['prezime'] ?? null;
    $email = $data['email'] ?? null;
    $lozinka = $data['lozinka'] ?? null;
    $uloga = $data['uloga'] ?? null;

    if ($ime === null || $prezime === null || $email === null || $lozinka === null || $uloga === null) {
        jsonResponse(['error' => 'Ime, prezime, email, lozinka i uloga su obavezni'], 400);
    }

    $hashLozinke = password_hash($lozinka, PASSWORD_DEFAULT);

    try {
        $stmt = $conn->prepare('INSERT INTO korisnik (ime, prezime, email, lozinka, uloga) VALUES (:ime, :prezime, :email, :lozinka, :uloga) RETURNING id');
        $stmt->execute([
            'ime' => $ime,
            'prezime' => $prezime,
            'email' => $email,
            'lozinka' => $hashLozinke,
            'uloga' => $uloga
        ]);
    } catch (PDOException $e) {
        jsonResponse(['error' => 'Korisnik s tim emailom već postoji'], 409);
    }

    $noviId = $stmt->fetchColumn();

    jsonResponse(['id' => $noviId, 'ime' => $ime, 'prezime' => $prezime, 'email' => $email, 'uloga' => $uloga], 201);
}

jsonResponse(['error' => 'Metoda nije podržana'], 405);

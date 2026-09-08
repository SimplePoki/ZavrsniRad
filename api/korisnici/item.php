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
    $stmt = $conn->prepare('SELECT id, ime, prezime, email, uloga, aktivan, created_at, updated_at FROM korisnik WHERE id = :id');
    $stmt->execute(['id' => $id]);
    $korisnik = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($korisnik === false) {
        jsonResponse(['error' => 'Korisnik nije pronađen'], 404);
    }

    jsonResponse($korisnik);
}

if ($method === 'PUT') {
    requireMaxRole(ROLE_ADMIN);

    $data = json_decode(file_get_contents('php://input'), true);

    $ime = $data['ime'] ?? null;
    $prezime = $data['prezime'] ?? null;
    $email = $data['email'] ?? null;
    $uloga = $data['uloga'] ?? null;
    $lozinka = $data['lozinka'] ?? null;

    if ($ime === null || $prezime === null || $email === null || $uloga === null) {
        jsonResponse(['error' => 'Ime, prezime, email i uloga su obavezni'], 400);
    }

    try {
        if ($lozinka !== null) {
            $stmt = $conn->prepare('UPDATE korisnik SET ime = :ime, prezime = :prezime, email = :email, uloga = :uloga, lozinka = :lozinka WHERE id = :id');
            $stmt->execute([
                'ime' => $ime, 'prezime' => $prezime, 'email' => $email, 'uloga' => $uloga,
                'lozinka' => password_hash($lozinka, PASSWORD_DEFAULT), 'id' => $id
            ]);
        } else {
            $stmt = $conn->prepare('UPDATE korisnik SET ime = :ime, prezime = :prezime, email = :email, uloga = :uloga WHERE id = :id');
            $stmt->execute(['ime' => $ime, 'prezime' => $prezime, 'email' => $email, 'uloga' => $uloga, 'id' => $id]);
        }
    } catch (PDOException $e) {
        jsonResponse(['error' => 'Korisnik s tim emailom već postoji'], 409);
    }

    if ($stmt->rowCount() === 0) {
        jsonResponse(['error' => 'Korisnik nije pronađen'], 404);
    }

    jsonResponse(['id' => $id, 'ime' => $ime, 'prezime' => $prezime, 'email' => $email, 'uloga' => $uloga]);
}

if ($method === 'DELETE') {
    requireMaxRole(ROLE_SUPERADMIN);

    $stmt = $conn->prepare('UPDATE korisnik SET aktivan = false WHERE id = :id');
    $stmt->execute(['id' => $id]);

    if ($stmt->rowCount() === 0) {
        jsonResponse(['error' => 'Korisnik nije pronađen'], 404);
    }

    jsonResponse(['message' => 'Korisnik deaktiviran']);
}

jsonResponse(['error' => 'Metoda nije podržana'], 405);

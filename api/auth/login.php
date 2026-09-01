<?php

require_once '../config/database.php';
require_once '../helpers/response.php';
require_once '../helpers/auth.php';

startSession();

$data = json_decode(file_get_contents('php://input'), true);

$email = $data['email'] ?? null;
$lozinka = $data['lozinka'] ?? null;

if ($email === null || $lozinka === null) {
    jsonResponse(['error' => 'Email i lozinka su obavezni'], 400);
}

$stmt = $conn->prepare('SELECT id, ime, prezime, lozinka, uloga FROM korisnik WHERE email = :email AND aktivan = true');
$stmt->execute(['email' => $email]);
$korisnik = $stmt->fetch(PDO::FETCH_ASSOC);

if ($korisnik === false || !password_verify($lozinka, $korisnik['lozinka'])) {
    jsonResponse(['error' => 'Pogrešan email ili lozinka'], 401);
}

$_SESSION['korisnik'] = [
    'id' => $korisnik['id'],
    'ime' => $korisnik['ime'],
    'prezime' => $korisnik['prezime'],
    'uloga' => $korisnik['uloga']
];

jsonResponse([
    'id' => $korisnik['id'],
    'ime' => $korisnik['ime'],
    'prezime' => $korisnik['prezime'],
    'uloga' => $korisnik['uloga']
]);

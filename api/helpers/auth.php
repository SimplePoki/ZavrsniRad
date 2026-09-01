<?php

require_once __DIR__ . '/../config/roles.php';
require_once __DIR__ . '/response.php';

function startSession() {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
}

function getCurrentUser() {
    startSession();
    return $_SESSION['korisnik'] ?? null;
}

function requireLogin() {
    $user = getCurrentUser();
    if ($user === null) {
        jsonResponse(['error' => 'Niste prijavljeni'], 401);
    }
    return $user;
}

function requireMaxRole($maxRole) {
    $user = requireLogin();
    if ($user['uloga'] > $maxRole) {
        jsonResponse(['error' => 'Nemate ovlasti za ovu akciju'], 403);
    }
    return $user;
}

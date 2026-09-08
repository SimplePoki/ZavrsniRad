<?php

// Oracle (PDO_OCI) vraća NUMBER stupce kao string ("3" umjesto 3), pa frontend
// striktne usporedbe (===, Array.includes) i JS truthy provjere (npr. "0" je
// istinito) ispravno ne rade. Vraćamo brojeve na stvarni tip prije slanja JSON-a.
// Ova polja su slobodni tekst i moraju ostati string i kad izgledaju kao broj
// (npr. sestra upiše "200" kao vrijednost_string, ili netko nazove sobu "1").
const CAST_NUMERIC_PRESKOCI = ['naziv', 'opis', 'vrijednost_string', 'ime', 'prezime', 'email', 'lozinka'];

function castNumericStrings($data) {
    if (is_array($data)) {
        $rezultat = [];
        foreach ($data as $kljuc => $vrijednost) {
            if (is_string($kljuc) && in_array($kljuc, CAST_NUMERIC_PRESKOCI, true)) {
                $rezultat[$kljuc] = $vrijednost;
            } else {
                $rezultat[$kljuc] = castNumericStrings($vrijednost);
            }
        }
        return $rezultat;
    }

    if (is_string($data) && preg_match('/^-?\d+$/', $data)) {
        return (int) $data;
    }

    if (is_string($data) && preg_match('/^-?\d+\.\d+$/', $data)) {
        return (float) $data;
    }

    return $data;
}

function jsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    header('Content-Type: application/json');
    echo json_encode(castNumericStrings($data));
    exit;
}
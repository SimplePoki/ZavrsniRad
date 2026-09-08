<?php

// Oracle (PDO_OCI) vraća NUMBER stupce kao string ("3" umjesto 3), pa frontend
// striktne usporedbe (===, Array.includes) i JS truthy provjere (npr. "0" je
// istinito) ispravno ne rade. Vraćamo brojeve na stvarni tip prije slanja JSON-a.
function castNumericStrings($data) {
    if (is_array($data)) {
        return array_map('castNumericStrings', $data);
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
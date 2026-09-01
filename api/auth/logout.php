<?php

require_once '../helpers/response.php';
require_once '../helpers/auth.php';

startSession();
session_destroy();

jsonResponse(['message' => 'Odjavljeni ste']);

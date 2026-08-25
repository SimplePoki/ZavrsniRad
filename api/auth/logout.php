<?php

require '../helpers/response.php';
require '../helpers/auth.php';

startSession();
session_destroy();

jsonResponse(['message' => 'Odjavljeni ste']);

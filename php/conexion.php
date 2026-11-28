<?php

//Datos de entrada, pueden ser cambiados más tarde
$host = "sql313.infinityfree.com";
$bd = "if0_43540368_INV_MANAGE";
$usuario = "if0_43540368";
$password = "qMzqBVkCVlJyn";


/*
Bloque try-catch para intentar conexión con la BD 
y en caso de fallar devolver un error
*/
try {

    $conexion = new PDO(
        "mysql:host=$host;dbname=$bd;charset=utf8mb4",
        $usuario,
        $password
    );

    $conexion->setAttribute(
        PDO::ATTR_ERRMODE,
        PDO::ERRMODE_EXCEPTION
    );

    $conexion->setAttribute(
        PDO::ATTR_DEFAULT_FETCH_MODE,
        PDO::FETCH_ASSOC
    );

    $conexion->setAttribute(
        PDO::ATTR_EMULATE_PREPARES,
        false
    );

} catch (PDOException $e) {

    error_log($e->getMessage());

    http_response_code(500);
    exit("No se pudo conectar con la base de datos.");

}

$db = $conexion;
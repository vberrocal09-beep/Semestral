<?php
/* ==========================================================
   dashboard.php  -  Devuelve en JSON los datos del dashboard
   Lo consume js/dashboard.js con fetch()
   ========================================================== */
require 'conexion.php';                       // trae la variable $db
header('Content-Type: application/json; charset=utf-8');

// Cantidad de productos registrados
$productos = $db->query("SELECT COUNT(*) FROM productos")->fetchColumn();

// Existencia total (suma de la vista v_existencias)
$existencia = $db->query("SELECT COALESCE(SUM(existencia),0) FROM v_existencias")->fetchColumn();

// Entradas y salidas del mes actual
$sqlMes = "SELECT COALESCE(SUM(cantidad),0) FROM movimientos
           WHERE tipo = ? AND YEAR(fecha) = YEAR(CURDATE()) AND MONTH(fecha) = MONTH(CURDATE())";
$st = $db->prepare($sqlMes);
$st->execute(['ENTRADA']); $entradas = $st->fetchColumn();
$st->execute(['SALIDA']);  $salidas  = $st->fetchColumn();

// Productos con poca existencia (5 o menos)
$bajo = $db->query("SELECT codigo, descripcion, existencia FROM v_existencias
                    WHERE existencia <= 5 ORDER BY existencia LIMIT 6")->fetchAll();

// Ultimos movimientos
$ultimos = $db->query("SELECT m.fecha, m.tipo, p.descripcion AS producto, m.cantidad, m.comentario
                       FROM movimientos m JOIN productos p ON p.codigo = m.codigo
                       ORDER BY m.fecha DESC, m.id_movimiento DESC LIMIT 8")->fetchAll();

echo json_encode(compact('productos', 'existencia', 'entradas', 'salidas', 'bajo', 'ultimos'));

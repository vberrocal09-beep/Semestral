<?php
require 'conexion.php';
header('Content-Type: application/json; charset=utf-8');

$donde  = ['1=1'];   // condicion que siempre es verdadera, para poder encadenar AND
$params = [];        // valores que iran en los ?

//Lee lo que llego en el URL y recorta los espacios en blanco del inicio y final
$codigo = trim($_GET['codigo'] ?? '');

//Filtro que solo se agrega si el usuario escribió algo
if ($codigo !== '') { $donde[] = 'm.codigo = ?'; $params[] = $codigo; }

//Busca la fecha de inicio del rango de busqueda
$desde = $_GET['desde'] ?? '';
if ($desde !== '') { $donde[] = 'm.fecha >= ?'; $params[] = $desde; }

//Busca la fecha de finalización del rango de busqueda
$hasta = $_GET['hasta'] ?? '';
if ($hasta !== '') { $donde[] = 'm.fecha <= ?'; $params[] = $hasta; }

$sql = "SELECT m.id_movimiento, m.tipo, m.codigo, p.descripcion AS producto,
               m.cantidad, m.fecha, COALESCE(pr.nombre, c.nombre, '-') AS tercero, m.comentario
        FROM movimientos m
        JOIN productos p ON p.codigo = m.codigo
        LEFT JOIN proveedores pr ON pr.id_proveedor = m.id_proveedor
        LEFT JOIN clientes c ON c.id_cliente = m.id_cliente
        WHERE " . implode(' AND ', $donde) . "
        ORDER BY m.fecha DESC, m.id_movimiento DESC";

$st = $db->prepare($sql);
$st->execute($params);
echo json_encode($st->fetchAll());
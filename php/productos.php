<?php
/* ==========================================================
   productos.php  -  API del mantenimiento de PRODUCTOS (CRUD)
   GET                -> lista todos los productos
   POST accion=crear / modificar / eliminar  (datos en JSON)
   PATRON: clientes.php y proveedores.php se hacen copiando este archivo.
   ========================================================== */
require 'conexion.php';                        // trae $db
header('Content-Type: application/json; charset=utf-8');

// Respuesta rapida: {ok: true/false, mensaje: "..."}
function responder($ok, $mensaje) {
    echo json_encode(['ok' => $ok, 'mensaje' => $mensaje]);
    exit;
}

// ---------- LISTAR (READ) ----------
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    echo json_encode($db->query("SELECT * FROM productos ORDER BY codigo")->fetchAll());
    exit;
}

// ---------- Leer los datos que envia el JavaScript ----------
$d = json_decode(file_get_contents('php://input'), true) ?? [];
$accion = $d['accion'] ?? '';
$codigo = trim($d['codigo'] ?? '');

try {
    // ---------- ELIMINAR (DELETE) ----------
    if ($accion === 'eliminar') {
        $db->prepare("DELETE FROM productos WHERE codigo = ?")->execute([$codigo]);
        responder(true, 'Producto eliminado');
    }

    // ---------- Validaciones del servidor (crear y modificar) ----------
    $descripcion = trim($d['descripcion'] ?? '');
    $unidad      = trim($d['unidad'] ?? '');
    if ($codigo === '' || $descripcion === '' || $unidad === '') {
        responder(false, 'Codigo, descripcion y unidad son obligatorios');
    }
    $datos = [$descripcion, trim($d['marca'] ?? ''), $unidad, (float)($d['costo'] ?? 0),
              (float)($d['precio'] ?? 0), empty($d['itbms']) ? 0 : 1, trim($d['comentario'] ?? '')];

    // ---------- CREAR (CREATE) ----------
    if ($accion === 'crear') {
        $db->prepare("INSERT INTO productos (descripcion, marca, unidad, costo, precio, itbms, comentario, codigo)
                      VALUES (?,?,?,?,?,?,?,?)")->execute([...$datos, $codigo]);
        responder(true, 'Producto creado');
    }

    // ---------- MODIFICAR (UPDATE) ----------
    if ($accion === 'modificar') {
        $db->prepare("UPDATE productos SET descripcion=?, marca=?, unidad=?, costo=?, precio=?, itbms=?, comentario=?
                      WHERE codigo = ?")->execute([...$datos, $codigo]);
        responder(true, 'Producto actualizado');
    }
    responder(false, 'Accion no valida');

} catch (PDOException $e) {
    // 1062 = codigo repetido | 1451 = el producto ya tiene movimientos
    $cod = $e->errorInfo[1] ?? 0;
    if ($cod == 1062) responder(false, 'Ya existe un producto con ese codigo');
    if ($cod == 1451) responder(false, 'No se puede eliminar: el producto tiene movimientos registrados');
    responder(false, 'Error en la base de datos');
}

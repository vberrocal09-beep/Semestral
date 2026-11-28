<?php
/* ==========================================================
   proveedores.php  -  API del mantenimiento de PROVEEDORES (CRUD)
   GET                -> lista todos los proveedores
   POST accion=crear / modificar / eliminar  (datos en JSON)
   Mismo patron que productos.php; la llave es id_proveedor (autonumerico).
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
    echo json_encode($db->query("SELECT * FROM proveedores ORDER BY nombre")->fetchAll());
    exit;
}

// ---------- Leer los datos que envia el JavaScript ----------
$d = json_decode(file_get_contents('php://input'), true) ?? [];
$accion = $d['accion'] ?? '';
$id     = (int)($d['id_proveedor'] ?? 0);

try {
    // ---------- ELIMINAR (DELETE) ----------
    if ($accion === 'eliminar') {
        $db->prepare("DELETE FROM proveedores WHERE id_proveedor = ?")->execute([$id]);
        responder(true, 'Proveedor eliminado');
    }

    // ---------- Validaciones del servidor (crear y modificar) ----------
    $nombre = trim($d['nombre'] ?? '');
    $correo = trim($d['correo'] ?? '');
    if ($nombre === '') {
        responder(false, 'El nombre es obligatorio');
    }
    if ($correo !== '' && !filter_var($correo, FILTER_VALIDATE_EMAIL)) {
        responder(false, 'El correo no tiene un formato valido');
    }
    $datos = [$nombre, trim($d['telefono'] ?? ''), $correo,
              trim($d['direccion'] ?? ''), trim($d['comentario'] ?? '')];

    // ---------- CREAR (CREATE) ----------
    if ($accion === 'crear') {
        $db->prepare("INSERT INTO proveedores (nombre, telefono, correo, direccion, comentario)
                      VALUES (?,?,?,?,?)")->execute($datos);
        responder(true, 'Proveedor creado');
    }

    // ---------- MODIFICAR (UPDATE) ----------
    if ($accion === 'modificar') {
        $db->prepare("UPDATE proveedores SET nombre=?, telefono=?, correo=?, direccion=?, comentario=?
                      WHERE id_proveedor = ?")->execute([...$datos, $id]);
        responder(true, 'Proveedor actualizado');
    }
    responder(false, 'Accion no valida');

} catch (PDOException $e) {
    // 1451 = el registro ya tiene movimientos
    $cod = $e->errorInfo[1] ?? 0;
    if ($cod == 1451) responder(false, 'No se puede eliminar: el proveedor tiene movimientos registrados');
    responder(false, 'Error en la base de datos');
}

// Validaciones
$reglas = [
    'nombre'     => ['/^[\p{L}\d .,&#\'()-]+$/u',             'El nombre contiene caracteres no permitidos'],
    'telefono'   => ['/^\d{4}-\d{4}$/',                       'El teléfono debe tener el formato XXXX-XXXX'],
    'correo'     => ['/^[a-zA-Z0-9@._+-]+$/',                 'El correo no tiene un formato valido'],
    'direccion'  => ['~^[\p{L}\d .,#/°()\'-]+$~u',            'La direccion contiene caracteres no permitidos'],
    'comentario' => ['~^[\p{L}\d\s.,;:!?¿¡()\'"%&#/@+-]+$~u', 'El comentario contiene caracteres no permitidos'],
];

$v = [];
foreach ($reglas as $campo => [$patron, $error]) {
    $v[$campo] = trim($d[$campo] ?? '');
    if ($v[$campo] !== '' && !preg_match($patron, $v[$campo])) {
        responder(false, $error);
    }
}

if ($v['nombre'] === '') {
    responder(false, 'El nombre es obligatorio');
}
if ($v['correo'] !== '' && !filter_var($v['correo'], FILTER_VALIDATE_EMAIL)) {
    responder(false, 'El correo no tiene un formato valido');
}

$datos = [$v['nombre'], $v['telefono'], $v['correo'], $v['direccion'], $v['comentario']];


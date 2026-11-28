<?php
/* ==========================================================
   clientes.php  -  API del mantenimiento de CLIENTES (CRUD)
   GET                -> lista todos los clientes
   POST accion=crear / modificar / eliminar  (datos en JSON)
   Mismo patron que productos.php; la llave es id_cliente (autonumerico).
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
    echo json_encode($db->query("SELECT * FROM clientes ORDER BY nombre")->fetchAll());
    exit;
}

// ---------- Leer los datos que envia el JavaScript ----------
$d = json_decode(file_get_contents('php://input'), true) ?? [];
$accion = $d['accion'] ?? '';
$id     = (int)($d['id_cliente'] ?? 0);

try {
    // ---------- ELIMINAR (DELETE) ----------
    if ($accion === 'eliminar') {
        $db->prepare("DELETE FROM clientes WHERE id_cliente = ?")->execute([$id]);
        responder(true, 'Cliente eliminado');
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
        $db->prepare("INSERT INTO clientes (nombre, telefono, correo, direccion, comentario)
                      VALUES (?,?,?,?,?)")->execute($datos);
        responder(true, 'Cliente creado');
    }

    // ---------- MODIFICAR (UPDATE) ----------
    if ($accion === 'modificar') {
        $db->prepare("UPDATE clientes SET nombre=?, telefono=?, correo=?, direccion=?, comentario=?
                      WHERE id_cliente = ?")->execute([...$datos, $id]);
        responder(true, 'Cliente actualizado');
    }
    responder(false, 'Accion no valida');

} catch (PDOException $e) {
    // 1451 = el registro ya tiene movimientos
    $cod = $e->errorInfo[1] ?? 0;
    if ($cod == 1451) responder(false, 'No se puede eliminar: el cliente tiene movimientos registrados');
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



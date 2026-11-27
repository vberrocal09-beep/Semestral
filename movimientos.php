<?php
/* ==========================================================
   movimientos.php  -  API de ENTRADAS, DESPACHOS (salidas) y AJUSTES
   GET ?catalogos=1        -> productos (con existencia), proveedores y clientes
   GET ?tipo=ENTRADA|SALIDA|AJUSTE -> lista de movimientos de ese tipo
   POST accion=crear|modificar|eliminar (datos en JSON)
   REGLA CLAVE: despues de cada cambio se revisa la existencia; si algun
   producto quedaria negativo, se deshace todo (rollback) y se avisa.
   ========================================================== */
require 'conexion.php';                        // trae $db
header('Content-Type: application/json; charset=utf-8');

function responder($ok, $mensaje) { echo json_encode(['ok' => $ok, 'mensaje' => $mensaje]); exit; }
// Cancela la transaccion (si hay una) y responde con error
function fallar($db, $mensaje) { if ($db->inTransaction()) $db->rollBack(); responder(false, $mensaje); }
// Verifica que exista un registro (tabla y campo son constantes del codigo, no del usuario)
function existe($db, $tabla, $campo, $valor) {
    $st = $db->prepare("SELECT 1 FROM $tabla WHERE $campo = ?"); $st->execute([$valor]); return (bool)$st->fetchColumn();
}
// Devuelve el codigo del primer producto que quedo con existencia negativa (o null)
function existenciaNegativa($db, $codigos) {
    foreach (array_unique($codigos) as $c) {
        $st = $db->prepare("SELECT existencia FROM v_existencias WHERE codigo = ?"); $st->execute([$c]);
        $e = $st->fetchColumn();
        if ($e !== false && $e < 0) return $c;
    }
    return null;
}

// ---------- LEER (GET) ----------
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (isset($_GET['catalogos'])) {
        echo json_encode([
            'productos'   => $db->query("SELECT codigo, descripcion, existencia FROM v_existencias ORDER BY codigo")->fetchAll(),
            'proveedores' => $db->query("SELECT id_proveedor, nombre FROM proveedores ORDER BY nombre")->fetchAll(),
            'clientes'    => $db->query("SELECT id_cliente, nombre FROM clientes ORDER BY nombre")->fetchAll(),
        ]);
        exit;
    }
    $grupos = ['ENTRADA' => ['ENTRADA'], 'SALIDA' => ['SALIDA'], 'AJUSTE' => ['AJUSTE+', 'AJUSTE-']];
    $tipos  = $grupos[$_GET['tipo'] ?? ''] ?? ['ENTRADA', 'SALIDA', 'AJUSTE+', 'AJUSTE-'];
    $marcas = implode(',', array_fill(0, count($tipos), '?'));
    $st = $db->prepare("SELECT m.id_movimiento, m.tipo, m.codigo, p.descripcion AS producto, m.cantidad, m.fecha,
                               m.id_proveedor, m.id_cliente, COALESCE(pr.nombre, c.nombre, '-') AS tercero, m.comentario
                        FROM movimientos m
                        JOIN productos p ON p.codigo = m.codigo
                        LEFT JOIN proveedores pr ON pr.id_proveedor = m.id_proveedor
                        LEFT JOIN clientes c ON c.id_cliente = m.id_cliente
                        WHERE m.tipo IN ($marcas) ORDER BY m.fecha DESC, m.id_movimiento DESC");
    $st->execute($tipos);
    echo json_encode($st->fetchAll());
    exit;
}

// ---------- ESCRIBIR (POST) ----------
$d      = json_decode(file_get_contents('php://input'), true) ?? [];
$accion = $d['accion'] ?? '';
$id     = (int)($d['id_movimiento'] ?? 0);

try {
    $db->beginTransaction();
    $codigos = [];                                   // productos afectados por este cambio

    // En modificar y eliminar: el movimiento debe existir; guardamos su producto original
    if ($accion === 'modificar' || $accion === 'eliminar') {
        $st = $db->prepare("SELECT codigo FROM movimientos WHERE id_movimiento = ?"); $st->execute([$id]);
        $viejo = $st->fetchColumn();
        if ($viejo === false) fallar($db, 'El movimiento no existe');
        $codigos[] = $viejo;
    }

    if ($accion === 'eliminar') {
        $db->prepare("DELETE FROM movimientos WHERE id_movimiento = ?")->execute([$id]);
        $texto = 'Movimiento eliminado';
    } elseif ($accion === 'crear' || $accion === 'modificar') {
        // ----- Validaciones -----
        $tipo = $d['tipo'] ?? '';
        if (!in_array($tipo, ['ENTRADA', 'SALIDA', 'AJUSTE+', 'AJUSTE-'], true)) fallar($db, 'Tipo de movimiento no valido');

        $cantidad = (string)($d['cantidad'] ?? '');
        if (!ctype_digit($cantidad) || (int)$cantidad < 1) fallar($db, 'La cantidad debe ser un numero entero mayor que cero');

        $fecha = $d['fecha'] ?? '';
        $f = DateTime::createFromFormat('Y-m-d', $fecha);
        if (!$f || $f->format('Y-m-d') !== $fecha) fallar($db, 'La fecha no es valida');

        $codigo = trim($d['codigo'] ?? '');
        if (!existe($db, 'productos', 'codigo', $codigo)) fallar($db, 'El producto no existe: registrelo primero');

        $coment = trim($d['comentario'] ?? '');
        $prov = null; $cli = null;
        if ($tipo === 'ENTRADA') {
            $prov = (int)($d['id_proveedor'] ?? 0);
            if (!existe($db, 'proveedores', 'id_proveedor', $prov)) fallar($db, 'Seleccione un proveedor valido');
        } elseif ($tipo === 'SALIDA') {
            $cli = (int)($d['id_cliente'] ?? 0);
            if (!existe($db, 'clientes', 'id_cliente', $cli)) fallar($db, 'Seleccione un cliente valido');
        } elseif ($coment === '') {
            fallar($db, 'El ajuste necesita un comentario que explique el motivo');
        }

        $valores = [$tipo, $codigo, (int)$cantidad, $fecha, $prov, $cli, $coment];
        if ($accion === 'crear') {
            $db->prepare("INSERT INTO movimientos (tipo, codigo, cantidad, fecha, id_proveedor, id_cliente, comentario)
                          VALUES (?,?,?,?,?,?,?)")->execute($valores);
            $texto = 'Movimiento registrado';
        } else {
            $db->prepare("UPDATE movimientos SET tipo=?, codigo=?, cantidad=?, fecha=?, id_proveedor=?, id_cliente=?, comentario=?
                          WHERE id_movimiento = ?")->execute([...$valores, $id]);
            $texto = 'Movimiento actualizado';
        }
        $codigos[] = $codigo;
    } else {
        fallar($db, 'Accion no valida');
    }

    // ----- Regla de oro: el inventario nunca puede quedar negativo -----
    $malo = existenciaNegativa($db, $codigos);
    if ($malo !== null) fallar($db, "Operacion rechazada: el producto $malo quedaria con existencia negativa");

    $db->commit();
    responder(true, $texto);

} catch (PDOException $e) {
    fallar($db, 'Error en la base de datos');
}

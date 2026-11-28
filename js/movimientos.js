/* ==========================================================
   movimientos.js  -  Logica compartida de Entradas, Despachos y Ajustes
   El tipo de pantalla viene del HTML:  <body data-tipo="ENTRADA|SALIDA|AJUSTE">
   Se usan promesas (.then) para evitar falsos errores en Eclipse.
   ========================================================== */
const API  = '../php/movimientos.php';
const TIPO = document.body.dataset.tipo;           // que pantalla es
const $ = (id) => document.getElementById(id);
const limpiar = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ETIQUETA = { 'ENTRADA': 'Entrada', 'SALIDA': 'Salida', 'AJUSTE+': 'Ajuste (+)', 'AJUSTE-': 'Ajuste (-)' };

let catalogos = { productos: [], proveedores: [], clientes: [] };
let lista = [];            // movimientos mostrados en la tabla
let editandoId = null;     // null = creando | numero = modificando ese movimiento

// ---------- Utilidades ----------
function avisar(texto, ok) {
  $('mensaje').textContent = texto;
  $('mensaje').className = 'mensaje ' + (ok === false ? 'mal' : 'bien');
}
function hoy() {                                   // fecha de hoy en formato AAAA-MM-DD
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function enviar(datos) {
  return fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos) })
    .then(function (r) { return r.json(); });
}
// Llena una lista desplegable y conserva lo que estaba seleccionado
function llenar(select, items, campoValor, campoTexto, vacio) {
  const antes = select.value;
  select.innerHTML = '<option value="">' + vacio + '</option>' + items.map(function (i) {
    return '<option value="' + limpiar(i[campoValor]) + '">' + limpiar(campoTexto(i)) + '</option>';
  }).join('');
  select.value = antes;
}
// Muestra la existencia actual del producto elegido
function mostrarExistencia() {
  const p = catalogos.productos.find(function (x) { return x.codigo === $('codigo').value; });
  $('existencia').textContent = p ? 'Existencia actual: ' + p.existencia + ' unidades' : 'Elija un producto para ver su existencia.';
}

// ---------- Cargar datos ----------
function cargarCatalogos() {
  return fetch(API + '?catalogos=1').then(function (r) { return r.json(); }).then(function (c) {
    catalogos = c;
    llenar($('codigo'), c.productos, 'codigo', function (p) { return p.codigo + ' - ' + p.descripcion; }, 'Seleccione un producto');
    llenar($('id_proveedor'), c.proveedores, 'id_proveedor', function (p) { return p.nombre; }, 'Seleccione un proveedor');
    llenar($('id_cliente'), c.clientes, 'id_cliente', function (p) { return p.nombre; }, 'Seleccione un cliente');
    mostrarExistencia();
  });
}
function cargarLista() {
  return fetch(API + '?tipo=' + TIPO).then(function (r) { return r.json(); }).then(function (datos) {
    lista = datos;
    $('tabla').innerHTML = lista.length
      ? lista.map(function (m) {
          return '<tr><td>' + limpiar(m.fecha) + '</td><td>' + ETIQUETA[m.tipo] + '</td><td>' + limpiar(m.producto) + '</td>' +
            '<td>' + limpiar(m.cantidad) + '</td><td>' + limpiar(m.tercero) + '</td><td>' + limpiar(m.comentario) + '</td>' +
            '<td class="acciones"><button data-accion="editar" data-id="' + m.id_movimiento + '" class="editar">Editar</button> ' +
            '<button data-accion="eliminar" data-id="' + m.id_movimiento + '" class="peligro">Eliminar</button></td></tr>';
        }).join('')
      : '<tr><td colspan="7" class="vacio">Aún no hay registros. Complete el formulario para crear el primero.</td></tr>';
  });
}
function recargar() { cargarCatalogos(); cargarLista(); }   // actualiza existencias y tabla

// ---------- Formulario ----------
function limpiarFormulario() {
  $('formulario').reset();
  $('fecha').value = hoy();
  $('fecha').max = hoy();
  editandoId = null;
  $('titulo-form').textContent = 'Nuevo registro';
  mostrarExistencia();
}
// Segun la pantalla se muestran solo los campos que corresponden
$('grupo-proveedor').hidden = TIPO !== 'ENTRADA';
$('grupo-cliente').hidden   = TIPO !== 'SALIDA';
$('grupo-signo').hidden     = TIPO !== 'AJUSTE';
$('codigo').addEventListener('change', mostrarExistencia);

// Guardar (crear o modificar) con validaciones del navegador
$('formulario').addEventListener('submit', function (e) {
  e.preventDefault();
  const tipo = TIPO === 'AJUSTE' ? 'AJUSTE' + $('signo').value : TIPO;     // AJUSTE+ o AJUSTE-
  const cantidad = Number($('cantidad').value);
  const datos = {
    accion: editandoId ? 'modificar' : 'crear', id_movimiento: editandoId, tipo: tipo,
    codigo: $('codigo').value, cantidad: $('cantidad').value, fecha: $('fecha').value,
    id_proveedor: $('id_proveedor').value, id_cliente: $('id_cliente').value, comentario: $('comentario').value.trim()
  };
  if (!datos.codigo) { avisar('Seleccione un producto.', false); return; }
  if (!Number.isInteger(cantidad) || cantidad < 1) { avisar('La cantidad debe ser un entero mayor que cero.', false); return; }
  if (!datos.fecha) { avisar('Indique la fecha.', false); return; }
  if (tipo === 'ENTRADA' && !datos.id_proveedor) { avisar('Seleccione un proveedor.', false); return; }
  if (tipo === 'SALIDA' && !datos.id_cliente) { avisar('Seleccione un cliente.', false); return; }
  if (TIPO === 'AJUSTE' && !datos.comentario) { avisar('Explique el motivo del ajuste en el comentario.', false); return; }

  // Aviso rapido de existencia (al crear). El servidor siempre hace la validacion final.
  const p = catalogos.productos.find(function (x) { return x.codigo === datos.codigo; });
  if (!editandoId && (tipo === 'SALIDA' || tipo === 'AJUSTE-') && p && cantidad > Number(p.existencia)) {
    avisar('Existencia insuficiente: solo hay ' + p.existencia + ' unidades.', false); return;
  }
  enviar(datos).then(function (r) {
    avisar(r.mensaje, r.ok);
    if (r.ok) { limpiarFormulario(); recargar(); }
  }).catch(function () { avisar('No se pudo contactar al servidor.', false); });
});

// Botones Editar / Eliminar de la tabla
$('tabla').addEventListener('click', function (e) {
  const b = e.target.closest('button');
  if (!b) return;
  const id = Number(b.dataset.id);
  const m = lista.find(function (x) { return Number(x.id_movimiento) === id; });

  if (b.dataset.accion === 'editar') {
    editandoId = id;
    $('codigo').value = m.codigo; $('cantidad').value = m.cantidad; $('fecha').value = m.fecha;
    $('id_proveedor').value = m.id_proveedor || ''; $('id_cliente').value = m.id_cliente || '';
    $('comentario').value = m.comentario || '';
    if (TIPO === 'AJUSTE') $('signo').value = m.tipo.slice(-1);
    $('titulo-form').textContent = 'Modificar registro #' + id;
    mostrarExistencia();
  }
  if (b.dataset.accion === 'eliminar' && confirm('¿Eliminar este movimiento?')) {
    enviar({ accion: 'eliminar', id_movimiento: id }).then(function (r) {
      avisar(r.mensaje, r.ok);
      if (r.ok) recargar();
    });
  }
});
$('cancelar').addEventListener('click', limpiarFormulario);

limpiarFormulario();
cargarCatalogos().then(cargarLista).catch(function () { avisar('No se pudo cargar la información. Revise la conexión.', false); });

/* Módulo de lógica de reportes */
const API_REP = '../php/reportes.php';
const API_MOV = '../php/movimientos.php';
const $ = (id) => document.getElementById(id);
const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ETIQUETA = { 'ENTRADA': 'Entrada', 'SALIDA': 'Salida', 'AJUSTE+': 'Ajuste (+)', 'AJUSTE-': 'Ajuste (-)' };

// Llena el select de productos
function cargarProductos() {
  return fetch(API_MOV + '?catalogos=1')
    .then(function (r) { return r.json(); })
    .then(function (c) {
      $('codigo').innerHTML = '<option value="">Todos los productos</option>' +
        c.productos.map(function (p) {
          return '<option value="' + esc(p.codigo) + '">' + esc(p.codigo) + ' - ' + esc(p.descripcion) + '</option>';
        }).join('');
    })
    .catch(function (e) {
      console.error('Fallo el catálogo:', e);
      $('mensaje').textContent = 'No se pudo cargar la lista de productos.';
      $('mensaje').className = 'mensaje mal';
    });
}

// Dibuja la tabla y calcula los totales
function pintar(datos) {
  const signo = { 'ENTRADA': 1, 'AJUSTE+': 1, 'SALIDA': -1, 'AJUSTE-': -1 };

  // Saldo acumulado por producto: se recorre del más antiguo al más nuevo
  const acum = {};
  const saldo = {};
  datos.slice().reverse().forEach(function (m) {
    acum[m.codigo] = (acum[m.codigo] || 0) + signo[m.tipo] * Number(m.cantidad);
    saldo[m.id_movimiento] = acum[m.codigo];
  });

  $('tablaReporte_datos').innerHTML = datos.length
    ? datos.map(function (m) {
        return '<tr><td>' + esc(m.fecha) + '</td><td>' + esc(ETIQUETA[m.tipo]) + '</td><td>' + esc(m.producto) + '</td>' +
          '<td>' + esc(m.cantidad) + '</td><td>' + esc(m.tercero) + '</td><td>' + esc(m.comentario) + '</td>' +
          '<td>' + saldo[m.id_movimiento] + '</td></tr>';
      }).join('')
    : '<tr><td colspan="7" class="vacio">No hay movimientos con esos filtros.</td></tr>';

  // Totales generales (resumen arriba de la tabla)
  const t = { 'ENTRADA': 0, 'SALIDA': 0, 'AJUSTE+': 0, 'AJUSTE-': 0 };
  datos.forEach(function (m) { t[m.tipo] += Number(m.cantidad); });
  const neto = t['ENTRADA'] + t['AJUSTE+'] - t['SALIDA'] - t['AJUSTE-'];
  $('totales').textContent = 'Entradas: ' + t['ENTRADA'] + ' | Salidas: ' + t['SALIDA'] +
    ' | Ajustes (+): ' + t['AJUSTE+'] + ' | Ajustes (-): ' + t['AJUSTE-'] + ' | Neto: ' + neto;
}

// Pide los datos a PHP con los filtros actuales
function consultar() {
  const p = new URLSearchParams();
  if ($('codigo').value)       p.set('codigo', $('codigo').value);
  if ($('fecha_inicio').value) p.set('desde',  $('fecha_inicio').value);   // el PHP espera "desde"
  if ($('fecha_hasta').value)  p.set('hasta',  $('fecha_hasta').value);    // y "hasta"

  fetch(API_REP + '?' + p.toString())
    .then(function (r) { return r.json(); })
    .then(pintar)
    .catch(function () {
      $('mensaje').textContent = 'No se pudo cargar el reporte.';
      $('mensaje').className = 'mensaje mal';
    });
}

// Cualquier cambio en un filtro vuelve a consultar
const hoy = new Date();
const HOY = hoy.getFullYear() + '-' + String(hoy.getMonth() + 1).padStart(2, '0') + '-' + String(hoy.getDate()).padStart(2, '0');
$('fecha_inicio').max = HOY;
$('fecha_hasta').max = HOY;

function validarFechas() {
  const d = $('fecha_inicio').value, h = $('fecha_hasta').value;
  $('fecha_hasta').min = d;                       // el calendario de "hasta" no deja elegir antes de "desde"
  $('fecha_inicio').max = h && h < HOY ? h : HOY; // y el de "desde" no deja pasar de "hasta"
  if ((d && d > HOY) || (h && h > HOY)) {
    $('mensaje').textContent = 'Las fechas no pueden ser posteriores a hoy.';
    $('mensaje').className = 'mensaje mal';
    return;
  }
  if (d && h && d > h) {
    $('mensaje').textContent = 'La fecha "desde" no puede ser mayor que "hasta".';
    $('mensaje').className = 'mensaje mal';
    return;
  }
  $('mensaje').textContent = '';
  consultar();
}

// Cualquier cambio en un filtro vuelve a consultar
$('codigo').addEventListener('change', consultar);
$('fecha_inicio').addEventListener('change', validarFechas);
$('fecha_hasta').addEventListener('change', validarFechas);

$('limpiar').addEventListener('click', function () {
  $('codigo').value = '';
  $('fecha_inicio').value = '';
  $('fecha_hasta').value = '';
  $('fecha_hasta').min = '';
  $('fecha_inicio').max = HOY;
  $('mensaje').textContent = '';
  consultar();
});

// Al abrir la página: llenar el select y mostrar todo
cargarProductos();
consultar();
/* ==========================================================
   productos.js  -  Logica de la pantalla de Productos
   PATRON del CRUD: cargar lista -> pintar tabla -> formulario
   (crear / modificar) -> eliminar. Copien este archivo para
   clientes y proveedores cambiando CAMPOS y la URL del PHP.
   ========================================================== */
const API = '../php/productos.php';
const CAMPOS = ['codigo', 'descripcion', 'marca', 'unidad', 'costo', 'precio', 'comentario'];
const $ = (id) => document.getElementById(id);
const limpiar = (t) => String(t ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let productos = [];      // copia local de la lista (para editar sin volver a pedirla)
let editando = false;    // false = creando | true = modificando

// Muestra un mensaje de exito o error
function avisar(texto, ok) {
  $('mensaje').textContent = texto;
  $('mensaje').className = 'mensaje ' + (ok === false ? 'mal' : 'bien');
}

// Habla con el PHP: sin datos = leer (GET) | con datos = crear / modificar / eliminar (POST)
async function pedir(datos) {
  const r = await fetch(API, datos && {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos)
  });
  return r.json();
}

// LEER: pide la lista al servidor y la dibuja en la tabla
async function cargar() {
  productos = await pedir();
  $('tabla').innerHTML = productos.length
    ? productos.map((p) => `<tr>
        <td>${limpiar(p.codigo)}</td><td>${limpiar(p.descripcion)}</td>
        <td>${limpiar(p.marca)}</td><td>${limpiar(p.unidad)}</td>
        <td>${p.itbms == 1 ? 'Sí' : 'No'}</td><td>${limpiar(p.comentario)}</td>
        <td class="acciones">
          <button data-accion="editar" data-codigo="${limpiar(p.codigo)}">Editar</button>
          <button data-accion="eliminar" data-codigo="${limpiar(p.codigo)}" class="peligro">Eliminar</button>
        </td></tr>`).join('')
    : '<tr><td colspan="7" class="vacio">Aún no hay productos. Complete el formulario para crear el primero.</td></tr>';
}

// Deja el formulario limpio y en modo "crear"
function limpiarFormulario() {
  $('formulario').reset();
  $('codigo').readOnly = false;
  editando = false;
  $('titulo-form').textContent = 'Nuevo producto';
}

// GUARDAR (crear o modificar) con validaciones del lado del navegador
$('formulario').addEventListener('submit', async (e) => {
  e.preventDefault();
  const datos = { accion: editando ? 'modificar' : 'crear', itbms: $('itbms').value === '1' };
  CAMPOS.forEach((c) => (datos[c] = $(c).value.trim()));
  datos.costo ||= 0;
  datos.precio ||= 0;

  if (!datos.codigo || !datos.descripcion || !datos.unidad) return avisar('Complete código, descripción y unidad.', false);
  if (datos.costo < 0 || datos.precio < 0) return avisar('Costo y precio no pueden ser negativos.', false);

  try {
    const r = await pedir(datos);
    avisar(r.mensaje, r.ok);
    if (r.ok) { limpiarFormulario(); cargar(); }
  } catch {
    avisar('No se pudo contactar al servidor.', false);
  }
});

// Botones Editar / Eliminar de cada fila (un solo escuchador para toda la tabla)
$('tabla').addEventListener('click', async (e) => {
  const boton = e.target.closest('button');
  if (!boton) return;
  const { accion, codigo } = boton.dataset;

  if (accion === 'editar') {
    const p = productos.find((x) => x.codigo === codigo);
    CAMPOS.forEach((c) => ($(c).value = p[c] ?? ''));
    $('itbms').value = p.itbms == 1 ? '1' : '0';
    $('codigo').readOnly = true;                 // el codigo es la llave: no se cambia
    editando = true;
    $('titulo-form').textContent = 'Modificar ' + codigo;
    $('descripcion').focus();
  }

  if (accion === 'eliminar' && confirm('¿Eliminar el producto ' + codigo + '?')) {
    try {
      const r = await pedir({ accion, codigo });
      avisar(r.mensaje, r.ok);
      if (r.ok) cargar();
    } catch {
      avisar('No se pudo contactar al servidor.', false);
    }
  }
});

$('cancelar').addEventListener('click', limpiarFormulario);
cargar().catch(() => avisar('No se pudo cargar la lista. Revise la conexión.', false));

/*valiciones
const formulario = Document.getElementById('formulario');
const inputs = document.querySelectorAll('#formulario input');

const expresiones = {
	usuario: /^[a-zA-Z0-9\_\-]{4,16}$/, // Letras, numeros, guion y guion_bajo
	nombre: /^[a-zA-ZÀ-ÿ\s]{1,40}$/, // Letras y espacios, pueden llevar acentos.
	password: /^.{4,12}$/, // 4 a 12 digitos.
	correo: /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/,
	telefono: /^\d{7,14}$/ // 7 a 14 numeros.
}

formulario.addEventListener('submit', () => {});
*/
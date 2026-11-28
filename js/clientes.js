/* ==========================================================
   clientes.js  -  Logica de la pantalla de Clientes
   Mismo patron que productos.js: cargar lista -> pintar tabla ->
   formulario (crear / modificar) -> eliminar.
   ========================================================== */
const API = '../php/clientes.php';
const CAMPOS = ['nombre', 'telefono', 'correo', 'direccion', 'comentario'];
const $ = (id) => document.getElementById(id);
const limpiar = (t) => String(t ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let lista = [];          // copia local de la lista (para editar sin volver a pedirla)
let idActual = null;     // null = creando | numero = modificando ese registro

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
  lista = await pedir();
  $('tabla').innerHTML = lista.length
    ? lista.map((r) => `<tr>
        <td>${r.id_cliente}</td><td>${limpiar(r.nombre)}</td>
        <td>${limpiar(r.telefono)}</td><td>${limpiar(r.correo)}</td>
        <td>${limpiar(r.direccion)}</td><td>${limpiar(r.comentario)}</td>
        <td class="acciones">
          <button data-accion="editar" data-id="${r.id_cliente}">Editar</button>
          <button data-accion="eliminar" data-id="${r.id_cliente}" class="peligro">Eliminar</button>
        </td></tr>`).join('')
    : '<tr><td colspan="7" class="vacio">Aún no hay clientes. Complete el formulario para crear el primero.</td></tr>';
}

// Deja el formulario limpio y en modo "crear"
function limpiarFormulario() {
  $('formulario').reset();
  idActual = null;
  $('titulo-form').textContent = 'Nuevo cliente';
}

// GUARDAR (crear o modificar) con validaciones del lado del navegador
$('formulario').addEventListener('submit', async (e) => {
  e.preventDefault();
  const datos = { accion: idActual ? 'modificar' : 'crear', id_cliente: idActual };
  CAMPOS.forEach((c) => (datos[c] = $(c).value.trim()));

  if (!datos.nombre) return avisar('El nombre es obligatorio.', false);
  if (datos.correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.correo)) return avisar('El correo no tiene un formato válido.', false);

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
  const { accion } = boton.dataset;
  const id = Number(boton.dataset.id);

  if (accion === 'editar') {
    const r = lista.find((x) => Number(x.id_cliente) === id);
    CAMPOS.forEach((c) => ($(c).value = r[c] ?? ''));
    idActual = id;
    $('titulo-form').textContent = 'Modificar cliente #' + id;
    $('nombre').focus();
  }

  if (accion === 'eliminar' && confirm('¿Eliminar el cliente #' + id + '?')) {
    try {
      const r = await pedir({ accion, id_cliente: id });
      avisar(r.mensaje, r.ok);
      if (r.ok) cargar();
    } catch {
      avisar('No se pudo contactar al servidor.', false);
    }
  }
});

$('cancelar').addEventListener('click', limpiarFormulario);
cargar().catch(() => avisar('No se pudo cargar la lista. Revise la conexión.', false));

//validacion del nombre 
$('nombre').addEventListener('input', () => {
  $('nombre').value = $('nombre').value.replace(/[^\p{L}\d .,&#'()-]/gu, '');
});

//validacion del numero de telefono 
$('telefono').addEventListener('input', () => {
  const n = $('telefono').value.replace(/\D/g, '').slice(0, 8);
  $('telefono').value = n.length > 4 ? n.slice(0, 4) + '-' + n.slice(4) : n;
});

//validacion del correo electronico
$('correo').addEventListener('input', () => {
  $('correo').value = $('correo').value.replace(/[^a-zA-Z0-9@._+-]/g, '');
});

//validacion de la direccion
$('direccion').addEventListener('input', () => {
  $('direccion').value = $('direccion').value.replace(/[^\p{L}\d .,#\/°()'-]/gu, '');
});

//validacion del comentario
$('comentario').addEventListener('input', () => {
  $('comentario').value = $('comentario').value.replace(/[^\p{L}\d\s.,;:!?¿¡()'"%&#\/@+-]/gu, '');
});


/* ==========================================================
   dashboard.js  -  Pide los datos a php/dashboard.php y los pinta
   ========================================================== */
const $ = (id) => document.getElementById(id);   // atajo para buscar elementos

// Evita que texto de la base de datos se interprete como HTML
const limpiar = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Fecha de hoy en el encabezado
$('hoy').textContent = new Date().toLocaleDateString('es-PA',
  { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

// Pinta todos los datos recibidos
function pintar(d) {
  $('existencia').textContent = d.existencia;
  $('productos').textContent  = d.productos;
  $('entradas').textContent   = '+' + d.entradas;
  $('salidas').textContent    = '-' + d.salidas;

  // Lista de poco stock
  $('bajo').innerHTML = d.bajo.length
    ? d.bajo.map(p => `<li><span>${limpiar(p.descripcion)}</span><b>${limpiar(p.existencia)}</b></li>`).join('')
    : '<li class="vacio">Todo el inventario tiene existencia suficiente.</li>';

  // Tabla de ultimos movimientos
  $('ultimos').innerHTML = d.ultimos.length
    ? d.ultimos.map(m => `<tr><td>${limpiar(m.fecha)}</td><td>${limpiar(m.tipo)}</td>
        <td>${limpiar(m.producto)}</td><td>${limpiar(m.cantidad)}</td><td>${limpiar(m.comentario)}</td></tr>`).join('')
    : '<tr><td colspan="5" class="vacio">Aun no hay movimientos. Registre una entrada para comenzar.</td></tr>';
}

// Pedir los datos al servidor
fetch('php/dashboard.php')
  .then(r => r.json())
  .then(d => { if (d.error) throw new Error(d.error); pintar(d); })
  .catch(e => {
    // Si no hay servidor PHP (ej. abrir el html directo) se muestran datos de prueba
    console.warn('Usando datos de prueba:', e.message);
    pintar({ existencia: 47, productos: 2, entradas: 50, salidas: 10,
      bajo: [{ descripcion: 'Mouse inalambrico', existencia: 3 }],
      ultimos: [{ fecha: '2026-06-15', tipo: 'AJUSTE-', producto: 'Mouse inalambrico', cantidad: 3, comentario: 'Danado en almacen' },
                { fecha: '2026-06-12', tipo: 'SALIDA', producto: 'Teclado USB', cantidad: 10, comentario: 'Cliente XYZ' }] });
  });

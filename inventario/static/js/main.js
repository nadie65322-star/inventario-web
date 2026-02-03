console.log("JS cargado correctamente");

document.addEventListener('DOMContentLoaded', () => {

  // ==============================
  // MODO DE GUARDADO
  // ==============================
  const modoAutomatico = document.getElementById('modoAutomatico');
  const modoManual = document.getElementById('modoManual');
  const diasManual = document.getElementById('diasManual');
  const infoManual = document.getElementById('infoManual');
  const btnGuardarManual = document.getElementById('btnGuardarManual');

  let diaSeleccionadoAnterior = null;

function aplicarModo(modo) {
  const radiosDias = document.querySelectorAll('.dia-radio');

  if (modo === 'manual') {
    diasManual.style.display = 'flex';
    infoManual.style.display = 'block';
    btnGuardarManual.style.display = 'inline-block';

    radiosDias.forEach(r => {
      r.disabled = false;
    });

  } else {
    diasManual.style.display = 'none';
    infoManual.style.display = 'none';
    btnGuardarManual.style.display = 'none';

    radiosDias.forEach(r => {
      r.checked = false;
      r.disabled = true;
    });

    diaSeleccionadoAnterior = null;
  }
}


  const modoGuardado = localStorage.getItem('modoGuardado') || 'automatico';
  (modoGuardado === 'manual' ? modoManual : modoAutomatico).checked = true;
  aplicarModo(modoGuardado);

  [modoAutomatico, modoManual].forEach(radio => {
    radio.addEventListener('change', () => {
      localStorage.setItem('modoGuardado', radio.value);
      aplicarModo(radio.value);
    });
  });

  // ==============================
  // CAMBIO DE DÍA
  // ==============================
  document.querySelectorAll('.dia-radio').forEach(radio => {
    radio.addEventListener('change', e => {
      const hayProductos =
        document.querySelectorAll('.select-producto:checked').length > 0;

      if (diaSeleccionadoAnterior && hayProductos) {
        const ok = confirm(
          'Tienes productos seleccionados sin guardar.\n¿Seguro que quieres cambiar de día?'
        );

        if (!ok) {
          e.target.checked = false;
          document.querySelector(
            `.dia-radio[value="${diaSeleccionadoAnterior}"]`
          ).checked = true;
          return;
        }
      }

      diaSeleccionadoAnterior = e.target.value;
    });
  });

  // ==============================
  // GUARDAR MANUAL
  // ==============================
  btnGuardarManual.addEventListener('click', () => {
    if (!modoManual.checked) return;

    const dia = document.querySelector('.dia-radio:checked');
    const productos = document.querySelectorAll('.select-producto:checked');

    if (!dia) {
      alert('Selecciona un día');
      return;
    }

    alert(
      `Guardado manual\nDía: ${dia.value}\nProductos: ${productos.length}`
    );

    productos.forEach(p => p.checked = false);
  });

  // ==============================
  // AÑADIR PRODUCTO
  // ==============================
  const addForm = document.getElementById('addForm');
  if (addForm) {
    addForm.addEventListener('submit', async e => {
      e.preventDefault();
      const data = new FormData(addForm);
      await fetch('/add', { method: 'POST', body: data });
      location.reload();
    });
  }

  // ==============================
  // INVENTARIO
  // ==============================
  let accionActual = null;
  let filaActual = null;
  let procesando = false;

  const cantidadInput = document.getElementById('cantidadInput');
  const btnConfirmar = document.getElementById('cantidadConfirmar');
  const modalCantidad = document.getElementById('cantidadModal');

  if (btnConfirmar) {
    btnConfirmar.addEventListener('click', async () => {
      if (procesando || !filaActual || !accionActual) return;
      procesando = true;

      const cantidad = parseInt(cantidadInput.value, 10);
      if (!cantidad || cantidad <= 0) {
        alert('Cantidad inválida');
        procesando = false;
        return;
      }

      const id = filaActual.dataset.id;

      try {
        const r = await fetch(`/${accionActual}/${id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cantidad })
        });

        const data = await r.json();
        filaActual.querySelector('.cantidad').textContent = data.cantidad;
        bootstrap.Modal.getInstance(modalCantidad)?.hide();

      } catch {
        alert('Error al procesar');
      } finally {
        procesando = false;
      }
    });
  }

  document.addEventListener('click', async e => {
    const btn = e.target.closest('button');
    if (!btn) return;

    const tr = btn.closest('tr');
    if (!tr) return;

    const id = tr.dataset.id;

    if (btn.classList.contains('btn-inc') || btn.classList.contains('btn-dec')) {
      accionActual = btn.classList.contains('btn-inc') ? 'inc' : 'dec';
      filaActual = tr;

      document.getElementById('cantidadTitulo').textContent =
        accionActual === 'inc' ? 'Ingreso de inventario' : 'Retiro de inventario';

      document.getElementById('cantidadProducto').textContent =
        `Producto: ${tr.children[0].textContent}`;

      cantidadInput.value = '';
      new bootstrap.Modal(modalCantidad).show();
    }

    if (btn.classList.contains('btn-del')) {
      if (!confirm('¿Eliminar este producto?')) return;
      await fetch(`/delete/${id}`, { method: 'POST' });
      tr.remove();
    }

    if (btn.classList.contains('btn-historial')) {
      const r = await fetch(`/historial/${id}`);
      const data = await r.json();

      const body = document.getElementById('historialBody');
      body.innerHTML = data.length
        ? data.map(m => `
            <tr>
              <td>${m.fecha}</td>
              <td>${m.tipo}</td>
              <td>${m.cantidad}</td>
              <td>${m.nota || ''}</td>
            </tr>
          `).join('')
        : `<tr>
            <td colspan="4" class="text-center text-muted">
              Sin movimientos
            </td>
          </tr>`;

      new bootstrap.Modal(document.getElementById('historialModal')).show();
    }
  });

});

// mover producto seleccionado arriba
document.addEventListener('change', e => {
  if (!e.target.classList.contains('select-producto')) return;

  const tr = e.target.closest('tr');
  const tbody = tr.parentElement;

  if (e.target.checked) {
    tbody.prepend(tr);
  }
});

console.log("JS cargado correctamente");

document.addEventListener('DOMContentLoaded', () => {

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

  let accionActual = null;
  let filaActual = null;
  let procesando = false;

  const cantidadInput = document.getElementById('cantidadInput');
  const btnConfirmar = document.getElementById('cantidadConfirmar');
  const modalCantidad = document.getElementById('cantidadModal');

  // ==============================
  // CONFIRMAR INGRESO / RETIRO
  // ==============================
  if (btnConfirmar && cantidadInput && modalCantidad) {
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

  // ==============================
  // CLICK GLOBAL
  // ==============================
  document.addEventListener('click', async e => {
    const btn = e.target.closest('button');
    if (!btn) return;

    const tr = btn.closest('tr');
    if (!tr) return;

    const id = tr.dataset.id;

    // INGRESO / RETIRO
    if (btn.classList.contains('btn-inc') || btn.classList.contains('btn-dec')) {
      accionActual = btn.classList.contains('btn-inc') ? 'inc' : 'dec';
      filaActual = tr;

      document.getElementById('cantidadTitulo').textContent =
        accionActual === 'inc'
          ? 'Ingreso de inventario'
          : 'Retiro de inventario';

      document.getElementById('cantidadProducto').textContent =
        `Producto: ${tr.children[1].textContent}`;

      cantidadInput.value = '';
      new bootstrap.Modal(modalCantidad).show();
    }

    // ELIMINAR
    if (btn.classList.contains('btn-del')) {
      if (!confirm('¿Eliminar este producto?')) return;
      await fetch(`/delete/${id}`, { method: 'POST' });
      tr.remove();
    }

    // HISTORIAL
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

      new bootstrap.Modal(
        document.getElementById('historialModal')
      ).show();
    }
  });

  // ==============================
  // EXPORTAR EXCEL
  // ==============================
  const exportExcel = document.getElementById('exportExcel');
  if (exportExcel) {
    exportExcel.addEventListener('click', async () => {
      const r = await fetch('/export-excel-semana', { method: 'POST' });
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = 'inventario_semana.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    });
  }
});

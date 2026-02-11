console.log("JS cargado correctamente");

document.addEventListener("DOMContentLoaded", function() {

  let productoSeleccionado = null;
  let filaOriginal = null;


  // ==============================
  // SELECCIÓN MANUAL
  // ==============================
  document.addEventListener("change", e => {
    if (!e.target.classList.contains("select-producto")) return;

    const tr = e.target.closest("tr");

    if (e.target.checked) {
      productoSeleccionado = tr;
      filaOriginal = tr.nextSibling;
      tr.parentElement.prepend(tr);
    } else {
      if (filaOriginal) {
        tr.parentElement.insertBefore(tr, filaOriginal);
      }
      productoSeleccionado = null;
    }
  });

  // ==============================
  // EDITAR PRODUCTO
  // ==============================
 document.addEventListener("click", e => {
  const btn = e.target.closest(".btn-edit");
  if (!btn) return;

  const tr = btn.closest("tr");

  document.getElementById("editId").value = tr.dataset.id;
  document.getElementById("editNombre").value = tr.children[1].textContent;
  document.getElementById("editCategoria").value = tr.children[2].textContent;
  document.getElementById("editPresentacion").value = tr.children[3].textContent;
  document.getElementById("editLote").value = tr.children[4].textContent;
  document.getElementById("editFecha").value = tr.dataset.fecha || "";

  new bootstrap.Modal(
    document.getElementById("editModal")
  ).show();
});
document.getElementById("btnGuardarEdicion")
  ?.addEventListener("click", async () => {

  const id = document.getElementById("editId").value;

  const formData = new FormData();
  formData.append("nombre", document.getElementById("editNombre").value);
  formData.append("categoria", document.getElementById("editCategoria").value);
  formData.append("presentacion", document.getElementById("editPresentacion").value);
  formData.append("lote", document.getElementById("editLote").value);
  formData.append("fecha_vencimiento", document.getElementById("editFecha").value);

  await fetch(`/edit/${id}`, {
    method: "POST",
    body: formData
  });

  location.reload();
});


  // ==============================
  // AUTOAJUSTE DEL NOMBRE
  // ==============================
  const nombreTextarea = document.querySelector(".nombre-textarea");
  if (nombreTextarea) {
    const ajustarAltura = () => {
      nombreTextarea.style.height = "auto";
      nombreTextarea.style.height = nombreTextarea.scrollHeight + "px";
    };
    nombreTextarea.addEventListener("input", ajustarAltura);
    ajustarAltura();
  }

  // ==============================
  // MODO DE GUARDADO
  // ==============================
  const modoAutomatico = document.getElementById("modoAutomatico");
  const modoManual = document.getElementById("modoManual");
  const diasManual = document.getElementById("diasManual");
  const infoManual = document.getElementById("infoManual");
  const btnGuardarManual = document.getElementById("btnGuardarManual");
  const columnasSeleccion = document.querySelectorAll(".colSeleccion");

  function aplicarModo(modo) {
    const activo = modo === "manual";

    diasManual.style.display = activo ? "flex" : "none";
    infoManual.style.display = activo ? "block" : "none";
    btnGuardarManual.style.display = activo ? "inline-block" : "none";

    columnasSeleccion.forEach(c => {
      c.style.display = activo ? "" : "none";
    });

    if (!activo) {
      document
        .querySelectorAll(".select-producto")
        .forEach(c => (c.checked = false));

      document
        .querySelectorAll(".dia-radio")
        .forEach(r => (r.checked = false));
    }
  }

  const modoGuardado = localStorage.getItem("modoGuardado") || "automatico";
  (modoGuardado === "manual" ? modoManual : modoAutomatico).checked = true;
  aplicarModo(modoGuardado);

  [modoAutomatico, modoManual].forEach(radio => {
    radio.addEventListener("change", () => {
      localStorage.setItem("modoGuardado", radio.value);
      aplicarModo(radio.value);
    });
  });


  // ==============================
  // GUARDAR MANUAL (BACKEND REAL)
  // ==============================
  btnGuardarManual?.addEventListener("click", async () => {
    if (!modoManual.checked) return;

    const dia = document.querySelector(".dia-radio:checked");
    if (!dia) {
      alert("Selecciona un día");
      return;
    }

    const seleccionados = [];
    document.querySelectorAll("tbody tr").forEach(row => {
      const check = row.querySelector(".select-producto");
      if (check && check.checked) {
        seleccionados.push(parseInt(row.dataset.id));
      }
    });

    if (seleccionados.length === 0) {
      alert("Selecciona al menos un producto");
      return;
    }

    const r = await fetch("/guardado-manual", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: seleccionados,
        descripcion: `Guardado manual ${dia.value}`
      })
    });

    const data = await r.json();

    if (data.ok) {
      alert("Guardado manual creado correctamente");
      document
        .querySelectorAll(".select-producto")
        .forEach(c => (c.checked = false));
    } else {
      alert("Error al guardar");
    }
  });

  // ==============================
  // AÑADIR PRODUCTO
  // ==============================
  const addForm = document.getElementById("addForm");
  if (addForm) {
    addForm.addEventListener("submit", async e => {
      e.preventDefault();
      const data = new FormData(addForm);
      await fetch("/add", { method: "POST", body: data });
      location.reload();
    });
  }

  // ==============================
  // INVENTARIO (+ / − / BORRAR / HISTORIAL)
  // ==============================
  let accionActual = null;
  let filaActual = null;
  let procesando = false;

  const cantidadInput = document.getElementById("cantidadInput");
  const btnConfirmar = document.getElementById("cantidadConfirmar");
  const modalCantidad = document.getElementById("cantidadModal");

  btnConfirmar?.addEventListener("click", async () => {
    if (procesando || !filaActual || !accionActual) return;
    procesando = true;

    const cantidad = parseInt(cantidadInput.value, 10);
    if (!cantidad || cantidad <= 0) {
      alert("Cantidad inválida");
      procesando = false;
      return;
    }

    const id = filaActual.dataset.id;

    try {
      const r = await fetch(`/${accionActual}/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cantidad })
      });

      const data = await r.json();
      filaActual.querySelector(".cantidad").textContent = data.cantidad;
      bootstrap.Modal.getInstance(modalCantidad)?.hide();
    } catch {
      alert("Error al procesar");
    } finally {
      procesando = false;
    }
  });

  document.addEventListener("click", async e => {
  const btn = e.target.closest("button");
  if (!btn) return;

  const tr = btn.closest("tr");
  if (!tr) return;

  const id = tr.dataset.id;
  const modoManual = document.getElementById("modoManual");
  const checkbox = tr.querySelector(".select-producto")

  // VALIDACIÓN MODO MANUAL
  if (
  modoManual?.checked &&
  (btn.classList.contains("btn-inc") || btn.classList.contains("btn-dec")) &&
  (!checkbox || !checkbox.checked)
) {
  alert("Debes seleccionar ese producto en modo manual");
  return;
}

 // INGRESO / RETIRO
if (btn.classList.contains("btn-inc") || btn.classList.contains("btn-dec")) {
  accionActual = btn.classList.contains("btn-inc") ? "inc" : "dec";
  filaActual = tr;

  document.getElementById("cantidadTitulo").textContent =
    accionActual === "inc"
      ? "Ingreso de inventario"
      : "Retiro de inventario";

  document.getElementById("cantidadProducto").textContent =
    `Producto: ${tr.children[1].textContent}`;

  cantidadInput.value = "";
  new bootstrap.Modal(modalCantidad).show();
  return;
}

  // ELIMINAR
  if (btn.classList.contains("btn-del")) {
    if (!confirm("¿Eliminar este producto?")) return;
    await fetch(`/delete/${id}`, { method: "POST" });
    tr.remove();
    return;
  }

  // HISTORIAL
  if (btn.classList.contains("btn-historial")) {
    const r = await fetch(`/historial/${id}`);
    const data = await r.json();

    const body = document.getElementById("historialBody");
    body.innerHTML = data.length
      ? data.map(m => `
          <tr>
            <td>${m.fecha}</td>
            <td>${m.tipo}</td>
            <td>${m.cantidad}</td>
            <td>${m.nota || ""}</td>
          </tr>
        `).join("")
      : `<tr>
          <td colspan="4" class="text-center text-muted">
            Sin movimientos
          </td>
        </tr>`;

    new bootstrap.Modal(
      document.getElementById("historialModal")
    ).show();
  }
});
});
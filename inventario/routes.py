from flask import Blueprint, render_template, request, jsonify, send_file
from inventario import db
from inventario.models import Item, Movimiento, GuardadoManual, GuardadoManualItem
from inventario.utils import normalize_text, semana_lunes_viernes
from datetime import datetime
import io
import pytz

from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle,
    Paragraph, KeepTogether
)
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors

bp = Blueprint("main", __name__)

TZ_LOCAL = pytz.timezone("America/Bogota")

MESES_ES = {
    1: "enero", 2: "febrero", 3: "marzo", 4: "abril",
    5: "mayo", 6: "junio", 7: "julio", 8: "agosto",
    9: "septiembre", 10: "octubre", 11: "noviembre", 12: "diciembre"
}

# ==============================
# INDEX
# ==============================
@bp.route("/")
def index():
    q = request.args.get("q", "")
    categoria = request.args.get("categoria", "")

    query = Item.query
    if q:
        query = query.filter(Item.nombre_normalizado.contains(normalize_text(q)))
    if categoria:
        query = query.filter_by(categoria=categoria)

    items = query.order_by(Item.nombre).all()
    return render_template("index.html", items=items)

# ==============================
# GUARDADO MANUAL
# ==============================
@bp.route('/guardado-manual', methods=['POST'])
def guardado_manual():
    data = request.json
    item_ids = data.get('items', [])
    descripcion = data.get('descripcion', '')

    if not item_ids:
        return jsonify({'error': 'No hay productos seleccionados'}), 400

    guardado = GuardadoManual(descripcion=descripcion)
    db.session.add(guardado)
    db.session.flush()

    for item_id in item_ids:
        db.session.add(
            GuardadoManualItem(
                guardado_id=guardado.id,
                item_id=item_id
            )
        )

    db.session.commit()
    return jsonify({'ok': True, 'guardado_id': guardado.id})

# ==============================
# AÑADIR PRODUCTO
# ==============================
@bp.route('/add', methods=['POST'])
def add_item():
    fecha = request.form.get('fecha_vencimiento')
    fecha_date = None

    if fecha:
        fecha_date = datetime.strptime(fecha + "-01", "%Y-%m-%d").date()

    item = Item(
        nombre=request.form.get('nombre'),
        nombre_normalizado=normalize_text(request.form.get('nombre')),
        categoria=request.form.get('categoria'),
        presentacion=request.form.get('presentacion'),
        lote=request.form.get('lote'),
        cantidad=int(request.form.get('cantidad') or 0),
        fecha_vencimiento=fecha_date
    )

    db.session.add(item)
    db.session.commit()

    return jsonify({'ok': True})


# ==============================
# INGRESO / RETIRO
# ==============================
@bp.route('/inc/<int:item_id>', methods=['POST'])
def inc(item_id):
    item = Item.query.get_or_404(item_id)
    cantidad = int(request.json['cantidad'])

    item.cantidad += cantidad
    db.session.add(Movimiento(
        item_id=item.id,
        tipo='ingreso',
        cantidad=cantidad,
        fecha=datetime.utcnow()
    ))
    db.session.commit()

    return jsonify({'cantidad': item.cantidad})

@bp.route('/dec/<int:item_id>', methods=['POST'])
def dec(item_id):
    item = Item.query.get_or_404(item_id)
    cantidad = min(int(request.json['cantidad']), item.cantidad)

    item.cantidad -= cantidad
    db.session.add(Movimiento(
        item_id=item.id,
        tipo='retiro',
        cantidad=cantidad,
        fecha=datetime.utcnow()
    ))
    db.session.commit()

    return jsonify({'cantidad': item.cantidad})

# ==============================
# EDITAR PRODUCTO
# ==============================
@bp.route("/edit/<int:item_id>", methods=["POST"])
def edit_item(item_id):
    item = Item.query.get_or_404(item_id)

    item.nombre = request.form.get('nombre')
    item.nombre_normalizado = normalize_text(item.nombre)
    item.categoria = request.form.get('categoria')
    item.presentacion = request.form.get('presentacion')
    item.lote = request.form.get('lote')

    fecha = request.form.get('fecha_vencimiento')
    item.fecha_vencimiento = (
        datetime.strptime( fecha + "-01", "%Y-%m-%d").date()
        if fecha else None
    )

    db.session.commit()
    return jsonify({'ok': True})
# ==============================
# ELIMINAR
# ==============================
@bp.route('/delete/<int:item_id>', methods=['POST'])
def delete_item(item_id):
    Movimiento.query.filter_by(item_id=item_id).delete()
    Item.query.filter_by(id=item_id).delete()
    db.session.commit()
    return jsonify({'ok': True})

# ==============================
# HISTORIAL (hora correcta)
# ==============================
@bp.route("/historial/<int:item_id>")
def historial(item_id):
    movimientos = (
        Movimiento.query
        .filter_by(item_id=item_id)
        .order_by(Movimiento.fecha.desc())
        .all()
    )

    resultado = []

    for m in movimientos:
        fecha_local = m.fecha.replace(
            tzinfo=pytz.utc
        ).astimezone(TZ_LOCAL)

        resultado.append({
            "fecha": fecha_local.strftime("%d/%m/%Y %H:%M"),
            "tipo": m.tipo,
            "cantidad": m.cantidad,
            "nota": m.nota
        })

    return jsonify(resultado)
# ==============================
# EXCEL (MANTENIMIENTO)
# ==============================
@bp.route('/export-excel-semana', methods=['POST'])
def export_excel_semana():
    return jsonify({
        "ok": False,
        "message": "📊 Excel está en mantenimiento. Estamos haciéndolo mejor 💪"
    }), 503

@bp.route('/export-excel-manual/<int:guardado_id>')
def export_excel_manual(guardado_id):
    return jsonify({
        "ok": False,
        "message": "😷 El Excel anda malito, pronto vuelve más fuerte"
    }), 503

# ==============================
# PDF SEMANAL (CON HORA Y TEXTO AJUSTADO)
# ==============================
@bp.route("/export-pdf")
def export_pdf():
    movimientos = (
        Movimiento.query
        .join(Item)
        .order_by(Movimiento.fecha)
        .all()
    )

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(A4),
        leftMargin=20,
        rightMargin=20,
        topMargin=20,
        bottomMargin=20
    )

    styles = getSampleStyleSheet()
    elements = []

    lunes, viernes = semana_lunes_viernes()

    titulo = (
        f"Inventario del {lunes.day} al {viernes.day} "
        f"de {MESES_ES[viernes.month]} de {viernes.year}"
    )

    elements.append(Paragraph(titulo, styles["Title"]))
    elements.append(Paragraph(
        f"Generado el {datetime.now().strftime('%d/%m/%Y %H:%M')}",
        styles["Normal"]
    ))

    dias = {
        0: "Lunes",
        1: "Martes",
        2: "Miércoles",
        3: "Jueves",
        4: "Viernes"
    }

    movimientos_por_dia = {d: [] for d in dias}

    for m in movimientos:
        wd = m.fecha.weekday()
        if wd in dias:
            movimientos_por_dia[wd].append(m)

    for dia_num, nombre_dia in dias.items():
        lista = movimientos_por_dia[dia_num]
        if not lista:
            continue

        bloque = []
        bloque.append(Paragraph(nombre_dia, styles["Heading2"]))

        tabla = [[
            "Hora", "Nombre", "Categoría",
            "Presentación", "Lote", "Vencimiento", "Cantidad"
        ]]

        for m in lista:
            hora_local = m.fecha.replace(
                tzinfo=pytz.utc
            ).astimezone(TZ_LOCAL)

            tabla.append([
                hora_local.strftime("%H:%M"),
                Paragraph(m.item.nombre, styles["Normal"]),
                Paragraph(m.item.categoria, styles["Normal"]),
                Paragraph(m.item.presentacion or "", styles["Normal"]),
                m.item.lote or "",
                m.item.fecha_vencimiento.strftime("%m/%Y")
                if m.item.fecha_vencimiento else "",
                m.cantidad
            ])

        t = Table(
            tabla,
            repeatRows=1,
            colWidths=[50, 140, 110, 160, 90, 90, 70]
        )

        t.setStyle(TableStyle([
            ("GRID", (0,0), (-1,-1), 0.5, colors.grey),
            ("BACKGROUND", (0,0), (-1,0), colors.lightgrey),
            ("FONT", (0,0), (-1,0), "Helvetica-Bold"),
            ("ALIGN", (-1,1), (-1,-1), "CENTER"),
            ("VALIGN", (0,0), (-1,-1), "TOP"),
        ]))

        bloque.append(t)
        elements.append(KeepTogether(bloque))

    doc.build(elements)
    buffer.seek(0)

    nombre_pdf = (
        f"inventario_{lunes.day}_{viernes.day}_"
        f"{MESES_ES[viernes.month]}_{viernes.year}.pdf"
    )

    return send_file(
        buffer,
        download_name=nombre_pdf,
        as_attachment=True
    )
from datetime import datetime
from inventario import db


# =========================
# ITEM (PRODUCTO)
# =========================
class Item(db.Model):
    id = db.Column(db.Integer, primary_key=True)

    nombre = db.Column(db.Text, nullable=False)
    nombre_normalizado = db.Column(db.Text, index=True, nullable=False)

    categoria = db.Column(db.String(32), nullable=False)
    presentacion = db.Column(db.String(128))
    lote = db.Column(db.String(64))

    fecha_vencimiento = db.Column(db.Date)

    cantidad = db.Column(db.Integer, default=0)
    notas = db.Column(db.Text)

    fecha_creacion = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    fecha_actualizacion = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )

    def to_dict(self):
        return {
            'id': self.id,
            'nombre': self.nombre,
            'categoria': self.categoria,
            'presentacion': self.presentacion,
            'lote': self.lote,
            'fecha_vencimiento': (
                self.fecha_vencimiento.isoformat()
                if self.fecha_vencimiento else None
            ),
            'cantidad': self.cantidad,
            'notas': self.notas,
        }

# =========================
# MOVIMIENTOS DE INVENTARIO
# =========================
class Movimiento(db.Model):
    id = db.Column(db.Integer, primary_key=True)

    item_id = db.Column(
        db.Integer,
        db.ForeignKey('item.id'),
        nullable=False
    )

    tipo = db.Column(
        db.String(32),
        nullable=False
    )
        # 'inicial', 'ingreso', 'retiro'

    cantidad = db.Column(db.Integer, nullable=False)

    usuario = db.Column(db.String(64))

    fecha = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    nota = db.Column(db.Text)

    item = db.relationship(
        'Item',
        backref=db.backref(
            'movimientos',
            lazy='dynamic',
            cascade='all, delete-orphan'
        )
    )

# =========================
# GUARDADO MANUAL
# =========================
class GuardadoManual(db.Model):
    id = db.Column(db.Integer, primary_key=True)

    fecha = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    descripcion = db.Column(db.Text)

    items = db.relationship(
        'GuardadoManualItem',
        backref='guardado',
        cascade='all, delete-orphan'
    )


class GuardadoManualItem(db.Model):
    id = db.Column(db.Integer, primary_key=True)

    guardado_id = db.Column(
        db.Integer,
        db.ForeignKey('guardado_manual.id'),
        nullable=False
    )

    item_id = db.Column(
        db.Integer,
        db.ForeignKey('item.id'),
        nullable=False
    )

    item = db.relationship('Item')

from inventario import create_app, db
from inventario.models import Item, Movimiento, GuardadoManual, GuardadoManualItem

app = create_app()

with app.app_context():
    db.create_all()
    print("Tablas creadas correctamente")

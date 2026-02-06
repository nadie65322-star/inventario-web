import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

def create_app():
    app = Flask(__name__)

    database_url = os.environ.get("DATABASE_URL")

    if database_url:
        database_url = database_url.replace("postgres://", "postgresql://")
        app.config["SQLALCHEMY_DATABASE_URI"] = database_url
    else:
        app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///inventario.db"

    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    db.init_app(app)

    # 🔥 REGISTRAR BLUEPRINT (NO SE QUITA)
    from inventario.routes import bp
    app.register_blueprint(bp)

    # 🔧 CREAR TABLAS AUTOMÁTICAMENTE (solo por ahora)
    with app.app_context():
        db.create_all()

    return app

from flask import Flask
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

def create_app():
    app = Flask(__name__)
    app.config['SECRET_KEY'] = 'clave-secreta-cualquiera'
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///inventario.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    db.init_app(app)

    from inventario.routes import bp
    app.register_blueprint(bp)

    # 👇 ESTO ES LO NUEVO
    with app.app_context():
        db.create_all()

    return app

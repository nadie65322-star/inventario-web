from flask_wtf import FlaskForm
from wtforms import StringField, IntegerField, DateField, SelectField, TextAreaField
from wtforms.validators import DataRequired, Optional

class ItemForm(FlaskForm):
    nombre = StringField('Nombre', validators=[DataRequired()])
    categoria = SelectField(
        'Categoria',
        choices=[('medicamento', 'Medicamento'), ('dispositivo', 'Dispositivo'), ('pop', 'POP')]
    )
    presentacion = StringField('Presentación', validators=[Optional()])
    lote = StringField('Lote', validators=[Optional()])
    fecha_vencimiento = DateField('Fecha de vencimiento', validators=[Optional()], format='%Y-%m-%d')
    cantidad = IntegerField('Cantidad', validators=[Optional()])
    notas = TextAreaField('Notas', validators=[Optional()])
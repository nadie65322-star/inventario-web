import unicodedata
import re
from datetime import date, datetime, timedelta

def normalize_text(s: str) -> str:
    if not s:
        return ''
    s = unicodedata.normalize('NFKD', s)
    s = ''.join(c for c in s if not unicodedata.combining(c))
    s = s.lower()
    s = re.sub(r'[^\w\s-]', '', s)
    s = re.sub(r'\s+', ' ', s).strip()
    return s

def days_to_expire(target_date):
    if not target_date:
        return None
    today = date.today()
    return (target_date - today).days

def semana_lunes_viernes(fecha=None):
    if fecha is None:
        fecha = date.today()
    elif isinstance(fecha, str):
        fecha = datetime.strptime(fecha, "%Y-%m-%d").date()

    lunes = fecha - timedelta(days=fecha.weekday())
    viernes = lunes + timedelta(days=4)

    return lunes, viernes

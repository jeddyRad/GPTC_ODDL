import uuid
from django.core.exceptions import ValidationError
from .uuid_utils import convert_to_uuid

def validate_uuid(value):
    """
    Vérifie si une valeur est un UUID valide.
    Retourne l'UUID si valide, sinon lève une ValidationError.
    Les valeurs spéciales 'add', None, '' sont renvoyées telles quelles.
    Pour les valeurs numériques, tente de les convertir en UUID v5.
    """
    return convert_to_uuid(value, allow_special=True)

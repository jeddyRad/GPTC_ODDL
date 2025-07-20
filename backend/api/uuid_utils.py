import uuid
from django.core.exceptions import ValidationError

def convert_to_uuid(value, allow_special=True):
    """
    Convertit une valeur en UUID.
    
    Args:
        value: La valeur à convertir (peut être une chaîne, un entier, un UUID, etc.)
        allow_special: Si True, accepte les valeurs spéciales ('add', None, '')
        
    Returns:
        uuid.UUID: Un objet UUID valide.
        value d'origine: Pour les valeurs spéciales si allow_special=True
        
    Raises:
        ValidationError: Si la valeur ne peut pas être convertie en UUID et
                        n'est pas une valeur spéciale autorisée.
    """
    # Valeurs spéciales à traiter différemment
    if allow_special and value in ['add', None, '']:
        return value
        
    # Déjà un UUID
    if isinstance(value, uuid.UUID):
        return value
        
    try:
        # Si c'est une chaîne déjà au format UUID, la convertir directement
        if isinstance(value, str) and '-' in value:
            try:
                return uuid.UUID(value)
            except ValueError:
                pass
                
        # Si c'est un entier ou une chaîne numérique simple, générer un UUID v5 
        # en utilisant un namespace fixe pour garantir la cohérence
        namespace = uuid.UUID('00000000-0000-0000-0000-000000000000')
        if isinstance(value, (int, str)) and (isinstance(value, int) or value.isdigit()):
            return uuid.uuid5(namespace, f"id:{value}")
        
        # Autres tentatives de conversion
        return uuid.UUID(str(value))
    except (ValueError, AttributeError, TypeError):
        raise ValidationError(
            {"error": "UUID invalide", 
             "message": f"L'identifiant '{value}' ne peut pas être converti en UUID."}
        )

def ensure_uuid(value, default=None):
    """
    S'assure qu'une valeur est un UUID, sans lever d'exception.
    Retourne la valeur par défaut si la conversion échoue.
    
    Args:
        value: La valeur à convertir
        default: Valeur par défaut si la conversion échoue (None par défaut)
        
    Returns:
        uuid.UUID ou default: L'UUID convertie ou la valeur par défaut
    """
    try:
        return convert_to_uuid(value)
    except ValidationError:
        return default

def is_valid_uuid(value):
    """
    Vérifie si une valeur est un UUID valide sans lever d'exception.
    
    Args:
        value: La valeur à vérifier
        
    Returns:
        bool: True si la valeur est un UUID valide, sinon False
    """
    try:
        uuid.UUID(str(value))
        return True
    except (ValueError, AttributeError, TypeError):
        return False

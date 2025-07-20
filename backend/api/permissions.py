from rest_framework.permissions import BasePermission, SAFE_METHODS

class IsAdminUser(BasePermission):
    """
    Permet l'accès uniquement aux utilisateurs administrateurs.
    Vérifie à la fois le rôle dans le modèle Utilisateur et l'appartenance au groupe ADMIN.
    """
    def has_permission(self, request, view):
        user = getattr(request, 'user', None)
        utilisateur = getattr(user, 'utilisateur', None)
        is_admin_role = utilisateur and getattr(utilisateur, 'role', None) == 'ADMIN'
        is_in_admin_group = user and user.is_authenticated and user.groups.filter(name='ADMIN').exists()
        return is_admin_role or is_in_admin_group

class IsChefServiceUser(BasePermission):
    """
    Permet l'accès uniquement aux chefs de service.
    Vérifie à la fois le rôle dans le modèle Utilisateur et l'appartenance au groupe MANAGER.
    """
    def has_permission(self, request, view):
        user = getattr(request, 'user', None)
        utilisateur = getattr(user, 'utilisateur', None)
        is_chef_role = utilisateur and getattr(utilisateur, 'role', None) == 'MANAGER'
        is_in_chef_group = user and user.is_authenticated and user.groups.filter(name='MANAGER').exists()
        return is_chef_role or is_in_chef_group

class IsEmployeeUser(BasePermission):
    """
    Permet l'accès uniquement aux employés.
    Vérifie à la fois le rôle dans le modèle Utilisateur et l'appartenance au groupe EMPLOYEE.
    """
    def has_permission(self, request, view):
        user = getattr(request, 'user', None)
        utilisateur = getattr(user, 'utilisateur', None)
        is_employe_role = utilisateur and getattr(utilisateur, 'role', None) == 'EMPLOYEE'
        is_in_employe_group = user and user.is_authenticated and user.groups.filter(name='EMPLOYEE').exists()
        return is_employe_role or is_in_employe_group

class IsAdminOrReadOnly(BasePermission):
    """
    Permet un accès en lecture seule à tout le monde,
    mais l'écriture est réservée aux administrateurs.
    """
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
            
        user = getattr(request, 'user', None)
        utilisateur = getattr(user, 'utilisateur', None)
        is_admin_role = utilisateur and getattr(utilisateur, 'role', None) == 'ADMIN'
        is_in_admin_group = user and user.is_authenticated and user.groups.filter(name='ADMIN').exists()
        return is_admin_role or is_in_admin_group

class IsChefServiceOrReadOnly(BasePermission):
    """
    Permet un accès en lecture seule à tout le monde,
    mais l'écriture est réservée aux chefs de service et aux administrateurs.
    """
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
            
        user = getattr(request, 'user', None)
        utilisateur = getattr(user, 'utilisateur', None)
        is_admin_role = utilisateur and getattr(utilisateur, 'role', None) == 'ADMIN'
        is_in_admin_group = user and user.is_authenticated and user.groups.filter(name='ADMIN').exists()
        is_chef_role = user and user.is_authenticated and utilisateur and getattr(utilisateur, 'role', None) == 'MANAGER'
        is_in_chef_group = user and user.is_authenticated and user.groups.filter(name='MANAGER').exists()
        
        return (is_admin_role or is_in_admin_group) or (is_chef_role or is_in_chef_group)

class HasSpecificPermission(BasePermission):
    """
    Classe de permission générique qui vérifie si l'utilisateur a une permission spécifique.
    """
    def __init__(self, required_permission):
        self.required_permission = required_permission
        
    def has_permission(self, request, view):
        user = getattr(request, 'user', None)
        return user and user.is_authenticated and user.has_perm(self.required_permission)

# Exemple de correction robuste pour une permission personnalisée
class IsAdminOrManager(BasePermission):
    def has_permission(self, request, view):
        user = getattr(request, 'user', None)
        utilisateur = getattr(user, 'utilisateur', None)
        is_admin_role = utilisateur and getattr(utilisateur, 'role', None) == 'ADMIN'
        is_in_admin_group = user and user.is_authenticated and user.groups.filter(name='ADMIN').exists()  # type: ignore[attr-defined]
        is_manager_role = utilisateur and getattr(utilisateur, 'role', None) == 'MANAGER'
        is_in_manager_group = user and user.is_authenticated and user.groups.filter(name='MANAGER').exists()  # type: ignore[attr-defined]
        return is_admin_role or is_in_admin_group or is_manager_role or is_in_manager_group

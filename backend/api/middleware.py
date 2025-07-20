import uuid
from django.http import JsonResponse
from django.urls import resolve

class UUIDValidationMiddleware:
    """
    Middleware pour vérifier et valider les UUIDs dans les URLs et paramètres
    """
    
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Ne pas valider les UUID pour les URLs d'ajout dans l'admin
        if request.path.startswith('/admin/') and request.path.endswith('/add/'):
            return self.get_response(request)
        # Traitement de la requête avant la vue
        
        # Liste des modèles qui utilisent des UUIDs et leurs URLs correspondantes
        uuid_patterns = [
            'service', 
            'utilisateur', 
            'projet', 
            'tache', 
            'assignation', 
            'commentaire',
            'notification',
            'pretemploye',
            'modeurgence'
        ]
        
        # Récupérer le chemin de la requête et vérifier s'il correspond à un pattern UUID
        path_parts = request.path.strip('/').split('/')
        
        # Vérifier si l'URL correspond à un modèle avec UUID et contient un ID
        for pattern in uuid_patterns:
            if pattern in path_parts and len(path_parts) > 1:
                # Trouver l'indice du pattern dans le chemin
                pattern_index = path_parts.index(pattern)
                
                # Vérifier si nous avons un ID après le nom du modèle
                if pattern_index + 1 < len(path_parts) and path_parts[pattern_index + 1]:
                    potential_uuid = path_parts[pattern_index + 1]
                    
                    # Si l'ID contient un caractère '/' ou '?' ou a une extension, tronquer
                    if '/' in potential_uuid:
                        potential_uuid = potential_uuid.split('/')[0]
                    if '?' in potential_uuid:
                        potential_uuid = potential_uuid.split('?')[0]
                    if '.' in potential_uuid:
                        potential_uuid = potential_uuid.split('.')[0]
                    
                    # Vérifier si c'est un UUID valide
                    try:
                        uuid_obj = uuid.UUID(potential_uuid)
                        
                        # Normaliser l'UUID en minuscules
                        normalized_uuid = str(uuid_obj).lower()
                        
                        # Si l'UUID est différent de sa version normalisée, rediriger
                        if normalized_uuid != potential_uuid.lower():
                            corrected_path = request.path.replace(potential_uuid, normalized_uuid)
                            return JsonResponse({
                                'error': 'Format d\'UUID invalide',
                                'message': 'Les UUIDs doivent être au format RFC4122 standard',
                                'corrected_url': corrected_path
                            }, status=400)
                    except ValueError:
                        # Si l'ID n'est pas un UUID valide et que c'est une route API
                        if 'api' in path_parts:
                            return JsonResponse({
                                'error': 'UUID invalide',
                                'message': f'L\'identifiant fourni "{potential_uuid}" n\'est pas un UUID valide'
                            }, status=400)
        
        # Continuer avec la requête
        response = self.get_response(request)
        return response

class RolePermissionMiddleware:
    """
    Middleware pour vérifier les permissions basées sur le rôle de l'utilisateur.
    Empêche l'accès aux vues si l'utilisateur n'a pas les permissions nécessaires.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Si l'utilisateur n'est pas authentifié, on passe à la vue (qui gérera l'authentification)
        if not request.user.is_authenticated:
            return self.get_response(request)
        
        # Pour les requêtes admin, on laisse Django gérer les permissions
        if request.path.startswith('/admin/'):
            return self.get_response(request)
        
        # Pour la page d'accueil, on laisse passer
        if request.path == '/' or request.path == '':
            return self.get_response(request)
        
        # Correction : autoriser analytics à ADMIN, MANAGER, DIRECTOR
        if request.path.startswith('/api/analytics'):
            utilisateur = getattr(request.user, 'utilisateur', None)
            if utilisateur and utilisateur.role in ['ADMIN', 'MANAGER', 'DIRECTOR']:
                return self.get_response(request)
        
        # Correction : autoriser tous les utilisateurs authentifiés à accéder à leur profil
        if request.path.startswith('/api/users/me/') or request.path == '/api/users/me':
            return self.get_response(request)
        
        # Pour les autres requêtes API
        if request.path.startswith('/api/'):
            # Récupérer l'information sur la vue cible
            view_func, args, kwargs = resolve(request.path)
            
            # Essayer de récupérer l'utilisateur avec son profil
            try:
                utilisateur = request.user.utilisateur
                
                # Si c'est un admin, permettre toutes les actions
                if utilisateur.role == 'ADMIN':
                    return self.get_response(request)
                
                # Pour les tâches - laisser les ViewSets gérer les permissions d'objet
                # Le middleware ne vérifie que les permissions générales
                if 'taches' in request.path:
                    # POST pour créer une tâche - vérifier si l'utilisateur peut créer des tâches
                    if request.method == 'POST':
                        # Seuls les ADMIN et MANAGER peuvent créer des tâches
                        if utilisateur.role not in ['ADMIN', 'MANAGER']:
                            return JsonResponse({
                                'error': 'Permission refusée',
                                'message': "Vous n'avez pas la permission de créer une tâche"
                            }, status=403)
                    
                    # Pour les modifications et suppressions, laisser les ViewSets gérer
                    # car ils ont accès à l'objet et peuvent vérifier les permissions spécifiques
                    if request.method in ['PUT', 'PATCH', 'DELETE']:
                        # Laisser passer - les ViewSets géreront les permissions d'objet
                        pass
                        
            except Exception as e:
                print(f"DEBUG: Middleware error: {e}")
                # Si on ne peut pas récupérer le profil utilisateur, on laisse la vue gérer
                pass
        
        return self.get_response(request)

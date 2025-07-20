from django.contrib.auth.models import Permission
from django.apps import apps

def get_all_permissions_for_models(model_names):
    """
    Retourne la liste des codenames de permissions Django pour les modèles donnés.
    """
    perms = []
    for model_name in model_names:
        model = apps.get_model('api', model_name)
        perms += list(Permission.objects.filter(content_type__app_label='api', content_type__model=model._meta.model_name).values_list('codename', flat=True))
    return perms

def build_role_permissions():
    """
    Construit dynamiquement le mapping des permissions par rôle.
    """
    # Modèles principaux de l'app
    main_models = ['tache', 'projet', 'service', 'utilisateur', 'notification']
    all_perms = get_all_permissions_for_models(main_models)

    return {
        'ADMIN': all_perms,
        'MANAGER': [
            p for p in all_perms if (
                p.startswith('view_') or
                p.startswith('add_') or
                p.startswith('change_')
            )
        ],
        'EMPLOYEE': [
            p for p in all_perms if p.startswith('view_') or p.startswith('add_')
        ],
        'DIRECTOR': [
            p for p in all_perms if p.startswith('view_')
        ]
    } 
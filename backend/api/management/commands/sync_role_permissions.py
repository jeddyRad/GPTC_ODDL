from django.core.management.base import BaseCommand
from django.contrib.auth.models import Permission
from api.models import Utilisateur
from api.role_permissions import build_role_permissions

class Command(BaseCommand):
    help = "Synchronise les permissions Django pour chaque utilisateur selon son rôle"

    def handle(self, *args, **kwargs):
        role_permissions = build_role_permissions()  # Appel dynamique ici
        total_updated = 0

        for utilisateur in Utilisateur.objects.select_related('user').all():
            user = utilisateur.user
            role = utilisateur.role
            perms = role_permissions.get(role, [])
            # Nettoyer les permissions existantes
            user.user_permissions.clear()
            # Ajouter les permissions du rôle
            for codename in perms:
                try:
                    perm = Permission.objects.get(codename=codename)
                    user.user_permissions.add(perm)
                except Permission.DoesNotExist:
                    self.stdout.write(self.style.WARNING(f"Permission '{codename}' non trouvée pour le rôle {role}"))
            user.save()
            total_updated += 1

        self.stdout.write(self.style.SUCCESS(f"Permissions synchronisées pour {total_updated} utilisateurs.")) 
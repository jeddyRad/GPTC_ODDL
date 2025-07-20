from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User, Group, Permission
from django.core.exceptions import ValidationError
from django.urls import reverse
from django.http import Http404
from .models import (
    Service, Utilisateur, Projet, Tache,
    Commentaire, Notification, PretEmploye
)
from .models import ModeUrgence
from .filters import validate_uuid

class AdminURLMixin:
    def get_admin_url(self, obj):
        if not obj.pk:
            return ''
        return reverse(
            f'admin:{obj._meta.app_label}_{obj._meta.model_name}_change',
            args=[obj.pk],
        )

# Configuration de l'administration pour Utilisateur
class UtilisateurInline(admin.StackedInline):
    model = Utilisateur
    can_delete = False
    verbose_name_plural = 'Profil utilisateur'

# Extension de l'admin User pour inclure le profil
class UserAdmin(BaseUserAdmin):
    inlines = (UtilisateurInline,)
    list_display = ('username', 'email', 'first_name', 'last_name', 'get_role', 'get_service', 'is_staff')
    list_filter = ('is_staff', 'utilisateur__role')
    search_fields = ('username', 'email', 'first_name', 'last_name', 'utilisateur__role')
    
    def get_role(self, obj):
        try:
            return obj.utilisateur.get_role_display()
        except Exception:
            return "-"
    get_role.short_description = 'Rôle'
    
    def get_service(self, obj):
        try:
            return obj.utilisateur.service.nom if obj.utilisateur.service else "-"
        except Exception:
            return "-"
    get_service.short_description = 'Service'

# Base ModelAdmin pour la gestion des UUID
class UUIDModelAdmin(AdminURLMixin, admin.ModelAdmin):
    def get_object(self, request, object_id, from_field=None):
        """
        Retourne None si l'ID est 'add' ou non-UUID, sinon procède normalement
        """
        # Cas spécial pour l'ajout d'un nouvel objet
        if object_id == 'add' or not self._is_valid_uuid(object_id):
            return None
        try:
            object_id = validate_uuid(object_id)
            return super().get_object(request, str(object_id), from_field)  # Correction Pyright
        except (ValidationError, ValueError, Http404) as e:
            print(f"Erreur lors de la validation de l'UUID: {e}")
            return None

    def _is_valid_uuid(self, value):
        import uuid
        try:
            uuid.UUID(str(value))
            return True
        except Exception:
            return False

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)

# Classes d'administration pour les autres modèles
class ServiceAdmin(UUIDModelAdmin):
    list_display = ('name', 'description')
    search_fields = ('name', 'description')

class ProjetAdmin(UUIDModelAdmin):
    list_display = ('name', 'status', 'start_date', 'end_date', 'progress', 'risk_level')
    list_filter = ('status', 'risk_level')
    search_fields = ('name', 'description')

class TacheAdmin(UUIDModelAdmin):
    list_display = ('title', 'status', 'priority', 'deadline', 'creator')
    list_filter = ('status', 'priority')
    search_fields = ('title', 'description')

class AssignationAdmin(admin.ModelAdmin):
    list_display = ('tache', 'utilisateur', 'date_assignation', 'role_assignation')
    list_filter = ('role_assignation',)
    search_fields = ('tache__titre', 'utilisateur__user__username')

class CommentaireAdmin(UUIDModelAdmin):
    list_display = ('tache', 'auteur', 'date_creation', 'est_modifie')
    list_filter = ('est_modifie',)
    search_fields = ('contenu', 'tache__titre')

# Configuration de l'administration pour les groupes
class GroupAdmin(admin.ModelAdmin):
    search_fields = ('name',)
    ordering = ('name',)
    filter_horizontal = ('permissions',)

    def formfield_for_manytomany(self, db_field, request=None, **kwargs):
        if db_field.name == 'permissions':
            kwargs['queryset'] = Permission.objects.select_related('content_type')
        return super().formfield_for_manytomany(db_field, request, **kwargs)

# Ré-enregistrement de User et Group avec nos admins personnalisées
admin.site.unregister(User)
admin.site.register(User, UserAdmin)

admin.site.unregister(Group)
admin.site.register(Group, GroupAdmin)

# Enregistrement de nos modèles avec leurs admins personnalisées
admin.site.register(Service, ServiceAdmin)
admin.site.register(Projet, ProjetAdmin)
admin.site.register(Tache, TacheAdmin)
admin.site.register(Commentaire, CommentaireAdmin)
admin.site.register(Notification)
admin.site.register(PretEmploye)

@admin.register(ModeUrgence)
class ModeUrgenceAdmin(UUIDModelAdmin):
    list_display = ('titre', 'severite', 'est_actif', 'date_debut', 'date_fin')
    list_filter = ('est_actif', 'severite', 'date_debut')
    search_fields = ('titre', 'description')
    # filter_horizontal = ('services',)  # Temporairement désactivé

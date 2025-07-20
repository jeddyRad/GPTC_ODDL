from rest_framework import viewsets, generics, status, serializers
from rest_framework.decorators import api_view, permission_classes, action, parser_classes
from rest_framework.permissions import IsAuthenticated, BasePermission, AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from django.db.models import Q
from django.http import HttpResponse, Http404, JsonResponse
from django.core.exceptions import ValidationError
from datetime import datetime
import mimetypes
import os
from django.conf import settings
from django.contrib.sites.shortcuts import get_current_site

from .models import Service, Utilisateur, Projet, Tache, Commentaire, Conversation, Message, PieceJointe, PretEmploye, ModeUrgence, Notification
from .serializers import (
    ServiceSerializer, UtilisateurSimpleSerializer, UtilisateurDetailleSerializer,
    ProjetSerializer, TacheSerializer, CommentaireSerializer,
    UserCreateSerializer, UserSerializer,
    ConversationSerializer, MessageSerializer, PieceJointeSerializer,
    PretEmployeSerializer, ModeUrgenceSerializer, NotificationSerializer,
    ServiceManagerCreateSerializer
)
from .permissions import IsAdminUser, IsChefServiceOrReadOnly, IsAdminOrReadOnly
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser

class IsAdminOrDirectorOrManager(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not hasattr(user, 'utilisateur'):
            return False
        return user.utilisateur.role in ['ADMIN', 'DIRECTOR', 'MANAGER']

class IsAdminOrDirector(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not hasattr(user, 'utilisateur'):
            return False
        return user.utilisateur.role in ['ADMIN', 'DIRECTOR']

class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not hasattr(user, 'utilisateur'):
            return False
        return user.utilisateur.role == 'ADMIN'

class IsManagerOrAdmin(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not hasattr(user, 'utilisateur'):
            return False
        return user.utilisateur.role in ['ADMIN', 'MANAGER']

class IsTaskOwnerOrManagerOrAdmin(BasePermission):
    def has_permission(self, request, view):
        """Vérifie les permissions générales avant d'accéder à l'objet"""
        user = request.user
        if not hasattr(user, 'utilisateur'):
            print(f"DEBUG: User {getattr(user, 'username', 'inconnu')} has no utilisateur profile (has_permission)")
            return False
        
        util = user.utilisateur
        print(f"DEBUG: has_permission - User {getattr(user, 'username', 'inconnu')} has role {util.role}")
        
        # Tous les utilisateurs authentifiés avec un profil peuvent accéder aux tâches
        return True
    
    def has_object_permission(self, request, view, obj):
        user = request.user
        if not hasattr(user, 'utilisateur'):
            print(f"DEBUG: User {getattr(user, 'username', 'inconnu')} has no utilisateur profile")
            return False
        
        util = user.utilisateur
        print(f"DEBUG: User {getattr(user, 'username', 'inconnu')} has role {util.role}")
        print(f"DEBUG: Task service: {obj.service}, User service: {util.service}")
        print(f"DEBUG: Task creator: {obj.creator}, User: {util}")
        print(f"DEBUG: User in assignees: {util in obj.assignees.all()}")
        
        # Admin peut tout faire
        if util.role == 'ADMIN':
            print(f"DEBUG: Admin access granted for {getattr(user, 'username', 'inconnu')}")
            return True
        
        # Vérifier les accès de base
        is_creator = obj.creator == util
        is_assignee = util in obj.assignees.all()
        is_same_service = obj.service == util.service
        
        # Manager peut accéder aux tâches de son service ou qu'il a créées
        if util.role == 'MANAGER':
            if is_creator or is_same_service:
                print(f"DEBUG: Manager access granted for {getattr(user, 'username', 'inconnu')}")
                return True
        
        # Vérifier l'accès par projet
        if obj.project:
            from .models import Projet
            try:
                projet = Projet.objects.get(id=obj.project.id)
                is_project_chef = projet.chef == util
                is_project_member = util in projet.membres.all()
                is_project_service_member = (util.service and 
                                           (projet.service == util.service or util.service in projet.services.all()))
                
                if is_project_chef or is_project_member or is_project_service_member:
                    print(f"DEBUG: Project member access granted for {getattr(user, 'username', 'inconnu')}")
                    return True
            except Projet.DoesNotExist:
                pass
        
        # Vérifier l'accès par service
        if obj.service and util.service == obj.service:
            print(f"DEBUG: Service member access granted for {getattr(user, 'username', 'inconnu')}")
            return True
        
        # Accès de base : créateur ou assigné
        if is_creator or is_assignee:
            print(f"DEBUG: Basic access granted for {getattr(user, 'username', 'inconnu')}")
            return True
        
        print(f"DEBUG: Access denied for {getattr(user, 'username', 'inconnu')}")
        return False

# ViewSets pour les opérations CRUD standard
class ServiceViewSet(viewsets.ModelViewSet):
    queryset = Service.objects.all()
    serializer_class = ServiceSerializer
    permission_classes = [IsAdminOrDirectorOrManager]

    def get_queryset(self):
        user = self.request.user
        utilisateur = getattr(user, 'utilisateur', None)
        if not utilisateur:
            return Service.objects.none()
        if utilisateur.role == 'ADMIN' or utilisateur.role == 'DIRECTOR':
            return Service.objects.all()
        elif utilisateur.role == 'MANAGER':
            if utilisateur.service:
                return Service.objects.filter(id=utilisateur.service.id)
            else:
                return Service.objects.none()
        return Service.objects.none()
    
# Garde la compatibilité avec le code existant
ServiceViewSet = ServiceViewSet

class UtilisateurViewSet(viewsets.ModelViewSet):
    queryset = Utilisateur.objects.all()
    serializer_class = UtilisateurDetailleSerializer

    def get_permissions(self):
        user = self.request.user
        utilisateur = getattr(user, 'utilisateur', None)
        # Correction : autoriser l'action 'me' à tout utilisateur connecté
        if hasattr(self, 'action') and self.action == 'me':
            return [IsAuthenticated()]
        if not utilisateur:
            return [IsAdminOrDirector()]
        if utilisateur.role == 'ADMIN':
            return [IsAdminOrDirector()]
        elif utilisateur.role == 'DIRECTOR':
            if self.action in ['list', 'retrieve']:
                return [IsAdminOrDirector()]
            else:
                return [IsAdmin()]
        elif utilisateur.role == 'MANAGER':
            if self.action in ['list', 'retrieve']:
                return [IsAuthenticated()]
            else:
                return [IsAdmin()]
        return [IsAdmin()]

    def get_queryset(self):
        user = self.request.user
        utilisateur = getattr(user, 'utilisateur', None)
        if not utilisateur:
            return Utilisateur.objects.none()
        if utilisateur.role == 'ADMIN' or utilisateur.role == 'DIRECTOR':
            return Utilisateur.objects.all()
        elif utilisateur.role == 'MANAGER':
            if utilisateur.service:
                return Utilisateur.objects.filter(service=utilisateur.service)
            else:
                return Utilisateur.objects.filter(id=utilisateur.id)
        return Utilisateur.objects.filter(id=utilisateur.id)

    @action(detail=False, methods=['post'], url_path='me/upload-profile-photo', permission_classes=[IsAuthenticated], parser_classes=[MultiPartParser, FormParser])
    def upload_profile_photo(self, request):
        utilisateur = getattr(request.user, 'utilisateur', None)
        if not utilisateur:
            return Response({'error': 'Profil utilisateur introuvable.'}, status=400)
        file = request.FILES.get('photo_profil')
        if not file:
            return Response({'error': 'Aucun fichier envoyé.'}, status=400)
        utilisateur.photo_profil = file
        utilisateur.save()
        request_scheme = request.scheme
        request_host = request.get_host()
        if utilisateur.photo_profil:
            if utilisateur.photo_profil.url.startswith('/'):
                photo_url = f'{request_scheme}://{request_host}{settings.MEDIA_URL}{utilisateur.photo_profil.name}'
            else:
                photo_url = utilisateur.photo_profil.url
        else:
            photo_url = None
        return Response({'photoUrl': photo_url}, status=200)

    @action(detail=False, methods=['get'], url_path='me', permission_classes=[IsAuthenticated])
    def me(self, request):
        utilisateur = getattr(request.user, 'utilisateur', None)
        if not utilisateur:
            return Response({'error': 'Profil utilisateur introuvable.'}, status=400)
        serializer = self.get_serializer(utilisateur)
        return Response(serializer.data)

class ProjetViewSet(viewsets.ModelViewSet):
    queryset = Projet.objects.all()
    serializer_class = ProjetSerializer
    permission_classes = [IsAdminOrDirectorOrManager]

    def get_permissions(self):
        user = self.request.user
        utilisateur = getattr(user, 'utilisateur', None)
        if not utilisateur:
            return [IsAdminOrDirectorOrManager()]
        if utilisateur.role in ['ADMIN', 'DIRECTOR', 'MANAGER']:
            return [IsAdminOrDirectorOrManager()]
        elif utilisateur.role == 'EMPLOYEE':
            if self.action in ['list', 'retrieve']:
                return [IsAdminOrDirectorOrManager()]
            else:
                return [IsAdmin()]
        return [IsAdmin()]

    @action(detail=False, methods=['get'])
    def search(self, request):
        """
        Recherche des projets par nom ou description.
        """
        query = request.query_params.get('q', '')
        if not query:
            return Response([], status=status.HTTP_200_OK)

        results = self.get_queryset().filter(
            Q(name__icontains=query) | Q(description__icontains=query)
        )
        serializer = self.get_serializer(results, many=True)
        return Response(serializer.data)

    def perform_create(self, serializer):
        serializer.save()

    def perform_update(self, serializer):
        serializer.save()

class TacheViewSet(viewsets.ModelViewSet):
    queryset = Tache.objects.all()
    serializer_class = TacheSerializer
    permission_classes = [IsAuthenticated, IsTaskOwnerOrManagerOrAdmin]

    def get_permissions(self):
        # Pour la création, vérifier seulement le rôle
        if self.action == 'create':
            class CanCreateTask(BasePermission):
                def has_permission(self, request, view):
                    user = request.user
                    utilisateur = getattr(user, 'utilisateur', None)
                    if not utilisateur:
                        return False
                    # ADMIN et MANAGER peuvent créer des tâches
                    return utilisateur.role in ['ADMIN', 'MANAGER']
            return [IsAuthenticated(), CanCreateTask()]
        return super().get_permissions()

    def create(self, request, *args, **kwargs):
        user = request.user
        utilisateur = getattr(user, 'utilisateur', None)
        
        # Logs de débogage
        print(f"DEBUG: TacheViewSet.create - User: {user.username}")
        print(f"DEBUG: TacheViewSet.create - Utilisateur: {utilisateur}")
        print(f"DEBUG: TacheViewSet.create - Role: {getattr(utilisateur, 'role', 'None') if utilisateur else 'None'}")
        print(f"DEBUG: TacheViewSet.create - has_perm('api.add_tache'): {user.has_perm('api.add_tache')}")
        print(f"DEBUG: TacheViewSet.create - User permissions: {list(user.get_all_permissions())}")
        
        if not utilisateur:
            print("DEBUG: TacheViewSet.create - Pas de profil utilisateur")
            return Response({'error': "Profil utilisateur non trouvé."}, status=status.HTTP_403_FORBIDDEN)
        
        if utilisateur.role not in ['ADMIN', 'MANAGER']:
            print(f"DEBUG: TacheViewSet.create - Rôle non autorisé: {utilisateur.role}")
            return Response({'error': "Vous n'avez pas la permission de créer une tâche."}, status=status.HTTP_403_FORBIDDEN)
        
        # Simplifier : si c'est un ADMIN ou MANAGER, autoriser la création
        # La vérification de permission Django peut être problématique
        print("DEBUG: TacheViewSet.create - Autorisation accordée")
        return super().create(request, *args, **kwargs)

    def get_queryset(self):
        user = self.request.user
        utilisateur = getattr(user, 'utilisateur', None)
        if not utilisateur:
            return Tache.objects.none()
        
        # Admin voit toutes les tâches
        if utilisateur.role == 'ADMIN':
            return Tache.objects.all()
        
        # Construire la requête de base
        queryset = Tache.objects.none()
        
        # Tâches créées par l'utilisateur
        queryset |= Tache.objects.filter(creator=utilisateur)
        
        # Tâches assignées à l'utilisateur
        queryset |= Tache.objects.filter(assignees=utilisateur)
        
        # Tâches de service : si l'utilisateur est membre du service
        if utilisateur.service:
            queryset |= Tache.objects.filter(service=utilisateur.service)
        
        # Tâches de projet : si l'utilisateur est membre du projet
        # Récupérer tous les projets où l'utilisateur est membre
        from .models import Projet
        projet_filters = Q(chef=utilisateur) | Q(membres=utilisateur)  # Chef ou membre direct
        
        # Ajouter le filtre service si l'utilisateur a un service
        if utilisateur.service:
            projet_filters |= Q(service=utilisateur.service) | Q(services=utilisateur.service)
        
        projets_membre = Projet.objects.filter(projet_filters)
        if projets_membre.exists():
            queryset |= Tache.objects.filter(project__in=projets_membre)
        
        # Pour les managers, ajouter les tâches de leur service
        if utilisateur.role == 'MANAGER' and utilisateur.service:
            queryset |= Tache.objects.filter(service=utilisateur.service)
        
        return queryset.distinct()

    def perform_create(self, serializer):
        """
        Assigne l'utilisateur courant comme créateur de la tâche
        """
        utilisateur = getattr(self.request.user, 'utilisateur', None)
        serializer.save(creator=utilisateur)

    def perform_update(self, serializer):
        serializer.save()

    def get_object(self):
        """
        Récupère l'objet avec des logs de débogage
        """
        pk = self.kwargs.get('pk')
        print(f"DEBUG: Looking for task with pk: {pk}")
        
        try:
            obj = super().get_object()
            print(f"DEBUG: Found task: {obj.title} (ID: {obj.id})")
            return obj
        except Exception as e:
            print(f"DEBUG: Error getting task with pk {pk}: {e}")
            raise
    
    def get_serializer_context(self):
        """
        Ajouter la requête au contexte du sérialiseur pour accéder à l'utilisateur
        """
        context = super().get_serializer_context()
        return context
        
    @action(detail=False, methods=['get'])
    def search(self, request):
        """
        Recherche des tâches par titre ou description.
        """
        query = request.query_params.get('q', '')
        if not query:
            return Response([], status=status.HTTP_200_OK)

        results = self.get_queryset().filter(
            Q(title__icontains=query) | Q(description__icontains=query)
        )
        serializer = self.get_serializer(results, many=True)
        return Response(serializer.data)


class CommentaireViewSet(viewsets.ModelViewSet):
    queryset = Commentaire.objects.all()
    serializer_class = CommentaireSerializer
    permission_classes = [IsAuthenticated] # Tout utilisateur connecté peut commenter

    def has_object_permission(self, request, view, obj):
        user = request.user
        if not hasattr(user, 'utilisateur'):
            return False
        util = user.utilisateur
        # Admin peut tout faire
        if util.role == 'ADMIN':
            return True
        # Manager du service peut tout faire sur les commentaires de son service
        if util.role == 'MANAGER' and obj.tache.service == util.service:
            return True
        # Auteur du commentaire
        if obj.auteur == util:
            return True
        return False

class ConversationViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour les conversations.
    Filtre les conversations pour ne montrer que celles où l'utilisateur est participant.
    """
    serializer_class = ConversationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Cette vue doit retourner une liste de toutes les conversations
        pour l'utilisateur actuellement authentifié.
        """
        # Assurer que le profil utilisateur existe
        user = getattr(self.request, 'user', None)
        utilisateur = getattr(user, 'utilisateur', None)
        if utilisateur:
            return utilisateur.conversations.all()
        return Conversation.objects.none()

    def perform_create(self, serializer):
        """
        Lors de la création d'une conversation, l'utilisateur courant est ajouté
        automatiquement aux participants.
        """
        conversation = serializer.save()
        user = getattr(self.request, 'user', None)
        utilisateur = getattr(user, 'utilisateur', None)
        if utilisateur:
            conversation.participants.add(utilisateur)

class MessageViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour les messages d'une conversation spécifique.
    """
    serializer_class = MessageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Retourne les messages de la conversation spécifiée dans l'URL,
        à condition que l'utilisateur soit un participant.
        """
        user = getattr(self.request, 'user', None)
        utilisateur = getattr(user, 'utilisateur', None)
        conversation_pk = self.kwargs.get('conversation_pk')
        if not conversation_pk or not utilisateur:
            return Message.objects.none()

        # Vérifier si l'utilisateur a un profil
        # if not hasattr(self.request.user, 'utilisateur'): # This line is removed as per new_code
        #     return Message.objects.none()

        # Vérifier si l'utilisateur est dans la conversation
        # user = self.request.user.utilisateur # This line is removed as per new_code
        try:
            conversation = utilisateur.conversations.get(pk=conversation_pk)
            return conversation.messages.all().order_by('timestamp')
        except Conversation.DoesNotExist:
            return Message.objects.none()

    def perform_create(self, serializer):
        """
        Crée un message dans la conversation et l'associe à l'auteur.
        """
        user = getattr(self.request, 'user', None)
        utilisateur = getattr(user, 'utilisateur', None)
        conversation_pk = self.kwargs.get('conversation_pk')
        if not utilisateur:
            raise serializers.ValidationError("L'utilisateur n'a pas de profil.")

        # user = self.request.user.utilisateur # This line is removed as per new_code
        try:
            conversation = utilisateur.conversations.get(pk=conversation_pk)
            serializer.save(auteur=utilisateur, conversation=conversation)
        except Conversation.DoesNotExist:
            raise serializers.ValidationError("Conversation non trouvée ou accès non autorisé.")

# Vue pour créer un nouvel utilisateur
class UserCreateAPIView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserCreateSerializer
    permission_classes = []  # Permettre à tout utilisateur de s'inscrire

    def create(self, request, *args, **kwargs):
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            user = serializer.save()
            
            headers = self.get_success_headers(serializer.data)
            response_data = {
                'success': True,
                'message': 'Inscription réussie',
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                }
            }
            
            return Response(response_data, status=status.HTTP_201_CREATED, headers=headers)
            
        except serializers.ValidationError as e:
            # Format validation errors consistently
            error_detail = e.detail
            return Response({
                'success': False,
                'error': error_detail
            }, status=status.HTTP_400_BAD_REQUEST)
            
        except Exception as e:
            # For other exceptions, provide a clear message
            error_message = str(e)
            if 'UNIQUE constraint failed: auth_user.username' in error_message:
                error_message = {'username': ['Ce nom d\'utilisateur existe déjà.']}
            elif 'UNIQUE constraint failed: auth_user.email' in error_message:
                error_message = {'email': ['Cet email est déjà utilisé.']}
                
            return Response({
                'success': False,
                'error': error_message
            }, status=status.HTTP_400_BAD_REQUEST)

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        from typing import Any
        data: dict[str, Any] = super().validate(attrs)
        user = self.user
        try:
            utilisateur = getattr(user, 'utilisateur', None)
            service = getattr(utilisateur, 'service', None)
            data.update({
                'user_id': str(getattr(utilisateur, 'id', '')),
                'username': getattr(user, 'username', ''),
                'email': getattr(user, 'email', ''),
                'role': getattr(utilisateur, 'role', ''),
                'service_id': str(getattr(service, 'id', '')) if service else None,
                'service_nom': getattr(service, 'name', None) if service else None,
                'permissions': list(user.get_all_permissions()) if hasattr(user, 'get_all_permissions') else [],
                'is_staff': getattr(user, 'is_staff', False),
                'groups': list(user.groups.values_list('name', flat=True)) if hasattr(user, 'groups') and hasattr(user.groups, 'values_list') else []
            })
        except Exception:
            raise serializers.ValidationError({
                "error": "Profil utilisateur manquant ou attribut absent",
                "message": "L'utilisateur n'a pas de profil associé ou attribut manquant"
            })
        return data

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    permission_classes = []  # Autoriser l'accès non authentifié

# Vue pour récupérer le profil de l'utilisateur courant
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_profile(request):
    """Récupère le profil de l'utilisateur authentifié."""
    user = request.user
    serializer = UtilisateurDetailleSerializer(getattr(user, 'utilisateur', None))
    data = dict(serializer.data) if not isinstance(serializer.data, dict) else serializer.data
    try:
        utilisateur = getattr(user, 'utilisateur', None)
        # Obtenir les permissions standards Django pour cet utilisateur
        django_permissions = []
        if utilisateur and hasattr(user, 'get_all_permissions'):
            for perm in user.get_all_permissions():
                # Convertir par exemple "api.add_tache" en "add_tache"
                app_label, codename = perm.split('.', 1)
                django_permissions.append(codename)
        # Exposer les permissions Django dans 'permissions'
        data['permissions'] = django_permissions
    except Exception as e:
        print(f"Erreur lors de l'ajout des permissions: {e}")
        data['permissions'] = []
    return Response(data)

# Vue pour récupérer et mettre à jour le profil de l'utilisateur connecté
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .serializers import UtilisateurDetailleSerializer

@api_view(['GET', 'PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def me_profile(request):
    utilisateur = getattr(request.user, 'utilisateur', None)
    if not utilisateur:
        return Response({'error': "Profil utilisateur manquant"}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        serializer = UtilisateurDetailleSerializer(utilisateur)
        data = dict(serializer.data) if not isinstance(serializer.data, dict) else serializer.data
        # Exposer toutes les permissions Django (codenames)
        data['permissions'] = [perm.split('.', 1)[1] for perm in request.user.get_all_permissions()] if hasattr(request.user, 'get_all_permissions') else []
        return Response(data)

    # PATCH ou PUT
    partial = request.method == 'PATCH'
    serializer = UtilisateurDetailleSerializer(utilisateur, data=request.data, partial=partial)
    if serializer.is_valid():
        serializer.save()
        # Rafraîchir les permissions après modification
        data = dict(serializer.data) if not isinstance(serializer.data, dict) else serializer.data
        data['permissions'] = [perm.split('.', 1)[1] for perm in request.user.get_all_permissions()] if hasattr(request.user, 'get_all_permissions') else []
        return Response(data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# Vue pour récupérer les détails de l'utilisateur connecté
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_details(request):
    """Récupère les détails de l'utilisateur connecté."""
    user = request.user
    serializer = UserSerializer(user)
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_profile_photo(request):
    utilisateur = getattr(request.user, 'utilisateur', None)
    if not utilisateur:
        return Response({'error': 'Profil utilisateur introuvable.'}, status=400)
    file = request.FILES.get('photo_profil')
    if not file:
        return Response({'error': 'Aucun fichier envoyé.'}, status=400)
    utilisateur.photo_profil = file
    utilisateur.save()
    request_scheme = request.scheme
    request_host = request.get_host()
    if utilisateur.photo_profil:
        if utilisateur.photo_profil.url.startswith('/'):
            photo_url = f'{request_scheme}://{request_host}{settings.MEDIA_URL}{utilisateur.photo_profil.name}'
        else:
            photo_url = utilisateur.photo_profil.url
    else:
        photo_url = None
    return Response({'photoUrl': photo_url}, status=200)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    """Changes the password for the authenticated user."""
    user = request.user
    current_password = request.data.get('current_password')
    new_password = request.data.get('new_password')
    if not current_password or not new_password:
        return Response({'success': False, 'error': 'Champs requis manquants.'}, status=400)
    if not user.check_password(current_password):
        return Response({'success': False, 'error': 'Mot de passe actuel incorrect.'}, status=400)
    user.set_password(new_password)
    user.save()
    return Response({'success': True, 'message': 'Mot de passe changé avec succès.'}, status=200)

# Vues pour vérifier la disponibilité du nom d'utilisateur et de l'email
@api_view(['GET'])
@permission_classes([])  # Pas besoin d'authentification pour ces endpoints
def check_username_availability(request):
    username = request.query_params.get('username', None)
    if not username:
        return Response({'available': False, 'error': 'Paramètre username requis'}, status=status.HTTP_400_BAD_REQUEST)
        
    exists = User.objects.filter(username=username).exists()
    return Response({'available': not exists})

@api_view(['GET'])
@permission_classes([])  # Pas besoin d'authentification pour ces endpoints
def check_email_availability(request):
    email = request.query_params.get('email', None)
    if not email:
        return Response({'available': False, 'error': 'Paramètre email requis'}, status=status.HTTP_400_BAD_REQUEST)
        
    exists = User.objects.filter(email=email).exists()
    return Response({'available': not exists})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_calendar_events(request):
    """
    Endpoint pour récupérer les événements du calendrier (tâches, projets, etc.)
    """
    try:
        # Récupérer les paramètres de filtrage
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        service_ids = request.query_params.get('service_ids', '').split(',') if request.query_params.get('service_ids') else []
        project_ids = request.query_params.get('project_ids', '').split(',') if request.query_params.get('project_ids') else []
        user_ids = request.query_params.get('user_ids', '').split(',') if request.query_params.get('user_ids') else []
        types = request.query_params.get('types', '').split(',') if request.query_params.get('types') else ['task', 'project']
        
        # Convertir les dates
        start_date = datetime.fromisoformat(start_date.replace('Z', '+00:00')) if start_date else None
        end_date = datetime.fromisoformat(end_date.replace('Z', '+00:00')) if end_date else None
        
        events = []
        
        # Filtres de base pour les tâches
        task_filters = Q()
        if start_date and end_date:
            task_filters &= Q(deadline__gte=start_date, deadline__lte=end_date)
        
        if project_ids:
            task_filters &= Q(project__id__in=project_ids)
            
        if service_ids:
            task_filters &= Q(service__id__in=service_ids)
            
        if user_ids:
            task_filters &= Q(assignees__id__in=user_ids)
        
        # Récupérer les tâches
        if 'task' in types:
            tasks = Tache.objects.filter(task_filters).distinct()
            
            for task in tasks:
                # Détermination de l'icône selon le statut
                if task.status == 'completed':
                    icon = '✅'
                elif task.status == 'in_progress':
                    icon = '🚧'
                elif task.status == 'review':
                    icon = '🔎'
                else:
                    icon = '📋'
                events.append({
                    'id': str(task.id),
                    'title': task.title,
                    'start': task.date_creation.isoformat(),
                    'end': task.deadline.isoformat() if task.deadline else None,
                    'allDay': True,
                    'description': task.description,
                    'type': 'task',
                    'relatedId': str(task.id),
                    'color': task.get_status_color(),
                    'icon': icon,
                    'progress': 100 if task.status == 'completed' else (50 if task.status == 'in_progress' else 0)
                })
        
        # Récupérer les projets
        if 'project' in types:
            project_filters = Q()
            if start_date and end_date:
                project_filters &= Q(end_date__gte=start_date, end_date__lte=end_date)
            
            if project_ids:
                project_filters &= Q(id__in=project_ids)
                
            if service_ids:
                project_filters &= Q(services__id__in=service_ids)
            
            projects = Projet.objects.filter(project_filters).distinct()
            
            for project in projects:
                # Détermination de l'icône selon le statut
                if project.status == 'completed':
                    icon = '🏁'
                elif project.status == 'active':
                    icon = '🚀'
                elif project.status == 'on_hold':
                    icon = '⏸️'
                else:
                    icon = '📁'
                events.append({
                    'id': f"project_{project.id}",
                    'title': f"Projet: {project.name}",
                    'start': project.start_date.isoformat(),
                    'end': project.end_date.isoformat() if project.end_date else None,
                    'allDay': True,
                    'description': project.description,
                    'type': 'project',
                    'relatedId': str(project.id),
                    'color': project.color if hasattr(project, 'color') else '#009688',
                    'icon': icon,
                    'progress': project.progress
                })
        
        return Response(events)
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=400
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_calendar_event(request):
    """
    Créer un nouvel événement de calendrier
    """
    try:
        data = request.data
        event_type = data.get('type')
        
        # Selon le type, créer l'objet correspondant
        if event_type == 'task':
            # Créer une nouvelle tâche
            tache = Tache.objects.create(
                title=data.get('title'),
                description=data.get('description', ''),
                status='todo',  # Par défaut
                priority=data.get('priority', 'medium'),
                deadline=datetime.fromisoformat(data.get('end').replace('Z', '+00:00')),
                date_creation=datetime.fromisoformat(data.get('start').replace('Z', '+00:00')),
                date_maj=datetime.now(),
                creator=request.user.utilisateur,
                service_id=data.get('serviceId'),
                project_id=data.get('projectId')
            )
            # Assigner directement la tâche à l'utilisateur
            if data.get('assigneeId'):
                tache.assignee = data.get('assigneeId')
                tache.save()
            # Détermination de l'icône selon le statut
            icon = '📋'
            return Response({
                'id': str(tache.id),
                'title': tache.title,
                'start': tache.date_creation.isoformat(),
                'end': tache.deadline.isoformat(),
                'allDay': True,
                'description': tache.description,
                'type': 'task',
                'relatedId': str(tache.id),
                'color': tache.get_status_color(),
                'icon': icon,
                'progress': 0
            }, status=201)
        else:
            return Response({'error': f"Type d'événement non pris en charge: {event_type}"}, status=400)
    except Exception as e:
        return Response({'error': str(e)}, status=400)

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_calendar_event(request, event_id):
    """
    Mettre à jour un événement existant
    """
    try:
        data = request.data
        event_type = data.get('type')
        
        if event_type == 'task':
            # Mettre à jour une tâche existante
            try:
                tache = Tache.objects.get(id=event_id)
                
                # Vérifier les permissions (exemple simplifié)
                if tache.creator != request.user.utilisateur and request.user.utilisateur.role != 'ADMIN':
                    return Response({'error': 'Vous n\'avez pas les permissions pour modifier cette tâche'}, status=403)
                
                # Mettre à jour les champs
                if 'title' in data:
                    tache.title = data['title']
                if 'description' in data:
                    tache.description = data['description']
                if 'end' in data:
                    tache.deadline = datetime.fromisoformat(data['end'].replace('Z', '+00:00'))
                if 'priority' in data:
                    tache.priority = data['priority']
                if 'status' in data:
                    tache.status = data['status']
                
                tache.date_maj = datetime.now()
                tache.save()
                
                return Response({
                    'id': str(tache.id),
                    'title': tache.title,
                    'start': tache.date_creation.isoformat(),
                    'end': tache.deadline.isoformat(),
                    'allDay': True,
                    'description': tache.description,
                    'type': 'task',
                    'relatedId': str(tache.id),
                    'color': tache.get_status_color()
                })
                
            except Tache.DoesNotExist:
                return Response({'error': 'Tâche non trouvée'}, status=404)
        else:
            return Response({'error': f"Type d'événement non pris en charge: {event_type}"}, status=400)
            
    except Exception as e:
        return Response({'error': str(e)}, status=400)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_calendar_event(request, event_id):
    """
    Supprimer un événement
    """
    try:
        # Déterminer le type d'événement
        if event_id.startswith('project_'):
            # Pas de suppression directe de projet depuis le calendrier
            return Response({'error': 'La suppression de projets depuis le calendrier n\'est pas autorisée'}, status=403)
        else:
            # Tâche ou autre type d'événement
            try:
                tache = Tache.objects.get(id=event_id)
                
                # Vérifier les permissions (exemple simplifié)
                if tache.creator != request.user.utilisateur and request.user.utilisateur.role != 'ADMIN':
                    return Response({'error': 'Vous n\'avez pas les permissions pour supprimer cette tâche'}, status=403)
                
                tache.delete()
                return Response(status=204)
                
            except Tache.DoesNotExist:
                return Response({'error': 'Événement non trouvé'}, status=404)
            
    except Exception as e:
        return Response({'error': str(e)}, status=400)

@api_view(['GET'])
@permission_classes([IsAdminOrDirectorOrManager])
def get_analytics_data(request):
    """
    Endpoint pour récupérer les données analytiques pour le tableau de bord.
    """
    try:
        # Période de temps (par défaut, le mois dernier)
        period = request.query_params.get('period', 'month')
        # ID de service pour le filtrage
        service_id = request.query_params.get('service_id')

        # Logique pour définir les dates de début et de fin en fonction de la période
        # (à implémenter)

        # Métriques générales
        total_tasks = Tache.objects.count()
        completed_tasks = Tache.objects.filter(status='completed').count()
        urgent_tasks = Tache.objects.filter(priority='urgent').count()
        overdue_tasks = Tache.objects.filter(deadline__lt=datetime.now()).exclude(status='completed').count()
        completion_rate = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0

        # Projets
        active_projects = Projet.objects.filter(status='active').count()
        planning_projects = Projet.objects.filter(status='planning').count()

        # Performance par service
        service_metrics = []
        services = Service.objects.all()
        for service in services:
            service_tasks = Tache.objects.filter(service=service)
            total_service_tasks = service_tasks.count()
            completed_service_tasks = service_tasks.filter(status='completed').count()
            service_completion_rate = (completed_service_tasks / total_service_tasks * 100) if total_service_tasks > 0 else 0
            service_metrics.append({
                'id': str(service.id),
                'name': service.name,
                'totalTasks': total_service_tasks,
                'completedTasks': completed_service_tasks,
                'completionRate': service_completion_rate,
                'efficiency': 85,  # Mock data, to be calculated
            })

        # Métriques système
        system_analytics = {
            'activeUsers': User.objects.filter(is_active=True).count(),
            'totalUsers': User.objects.count(),
            'uptime': 99.9, # Mock data
            'systemLoad': 45, # Mock data
        }

        data = {
            'main_metrics': {
                'totalTasks': total_tasks,
                'completedTasks': completed_tasks,
                'urgentTasks': urgent_tasks,
                'overdueTasks': overdue_tasks,
                'completionRate': completion_rate,
                'activeProjects': active_projects,
                'planningProjects': planning_projects,
                'globalEfficiency': 92, # Mock data
            },
            'service_performance': service_metrics,
            'system_metrics': system_analytics,
        }

        return Response(data)

    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class PieceJointeViewSet(viewsets.ModelViewSet):
    """ViewSet pour gérer les pièces jointes"""
    queryset = PieceJointe.objects.all()
    serializer_class = PieceJointeSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        utilisateur = getattr(self.request.user, 'utilisateur', None)
        if not utilisateur:
            return PieceJointe.objects.none()
        if utilisateur.role == 'ADMIN':
            return PieceJointe.objects.all()
        # MANAGER/EMPLOYEE : accès aux pièces jointes liées à leurs tâches, projets ou profil
        # On suppose que le frontend renseigne related_to et related_id correctement
        # On retourne toutes les pièces jointes liées à une entité où l'utilisateur a un lien
        return PieceJointe.objects.filter(
            (
                Q(related_to='task', related_id__in=Tache.objects.filter(
                    Q(creator=utilisateur) |
                    Q(assignees=utilisateur) |
                    Q(service=utilisateur.service)
                ).values_list('id', flat=True)) |
                Q(related_to='project', related_id__in=Projet.objects.filter(
                    Q(creator=utilisateur) |
                    Q(chef=utilisateur) |
                    Q(membres=utilisateur)
                ).values_list('id', flat=True)) |
                Q(related_to='user', related_id=str(utilisateur.id))
            )
        )

    def perform_create(self, serializer):
        """Associe l'utilisateur connecté comme uploader"""
        user = getattr(self.request, 'user', None)
        utilisateur = getattr(user, 'utilisateur', None)
        serializer.save(telecharge_par=utilisateur)

    @action(detail=False, methods=['post'], url_path='upload', parser_classes=[MultiPartParser, FormParser])
    def upload(self, request):
        """
        Upload d'une pièce jointe liée à une tâche, un projet ou un utilisateur.
        Champs attendus :
        - file : fichier à uploader (obligatoire)
        - related_to : 'task', 'project' ou 'user' (obligatoire)
        - related_id : UUID de l'entité cible (obligatoire)
        - name : nom du fichier (optionnel)
        """
        from hashlib import sha256
        file = request.FILES.get('file')
        related_to = request.data.get('related_to')
        related_id = request.data.get('related_id')
        name = request.data.get('name') or (file.name if file else None)
        utilisateur = getattr(request.user, 'utilisateur', None)
        if not file or not related_to or not related_id:
            return Response({'error': 'Champs file, related_to et related_id obligatoires.'}, status=400)
        # Vérification du type d'entité
        if related_to not in ['task', 'project', 'user']:
            return Response({'error': 'related_to doit être "task", "project" ou "user".'}, status=400)
        # Vérification de l'existence de l'entité cible
        from .models import Tache, Projet, Utilisateur
        if related_to == 'task' and not Tache.objects.filter(id=related_id).exists():
            return Response({'error': 'Tâche cible inexistante.'}, status=400)
        if related_to == 'project' and not Projet.objects.filter(id=related_id).exists():
            return Response({'error': 'Projet cible inexistant.'}, status=400)
        if related_to == 'user' and not Utilisateur.objects.filter(id=related_id).exists():
            return Response({'error': 'Utilisateur cible inexistant.'}, status=400)
        # Calcul du checksum
        checksum = sha256(file.read()).hexdigest()
        file.seek(0)
        piece = PieceJointe.objects.create(
            name=name,
            file=file,
            type_mime=file.content_type,
            size=file.size,
            checksum=checksum,
            est_chiffre=False,
            related_to=related_to,
            related_id=related_id,
            telecharge_par=utilisateur
        )
        serializer = PieceJointeSerializer(piece, context={'request': request})
        return Response(serializer.data, status=201)

    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """Télécharge une pièce jointe"""
        try:
            piece_jointe = self.get_object()
            # Vérifier les permissions
            if not self.can_access_attachment(piece_jointe, request.user.utilisateur):
                return Response(
                    {'error': 'Permission refusée'},
                    status=status.HTTP_403_FORBIDDEN
                )
            # Préparer la réponse de téléchargement
            if piece_jointe.fichier:
                file_path = piece_jointe.fichier.path
                if os.path.exists(file_path):
                    with open(file_path, 'rb') as f:
                        response = HttpResponse(
                            f.read(),
                            content_type=piece_jointe.type_mime or 'application/octet-stream'
                        )
                        response['Content-Disposition'] = f'attachment; filename="{piece_jointe.nom}"'
                        return response
            raise Http404("Fichier non trouvé")
        except PieceJointe.DoesNotExist:
            raise Http404("Pièce jointe non trouvée")

    def can_access_attachment(self, piece_jointe, utilisateur):
        """Vérifie si l'utilisateur peut accéder à cette pièce jointe"""
        if utilisateur.role == 'ADMIN':
            return True
        # Vérification selon le type d'entité liée
        if piece_jointe.related_to == 'task':
            try:
                tache = Tache.objects.get(id=piece_jointe.related_id)
                return (
                    tache.creator == utilisateur or
                    utilisateur in tache.assignees.all() or
                    tache.service == utilisateur.service
                )
            except Tache.DoesNotExist:
                return False
        if piece_jointe.related_to == 'project':
            try:
                projet = Projet.objects.get(id=piece_jointe.related_id)
                return (
                    projet.creator == utilisateur or
                    projet.chef == utilisateur or
                    utilisateur in projet.membres.all()
                )
            except Projet.DoesNotExist:
                return False
        if piece_jointe.related_to == 'user':
            return str(utilisateur.id) == piece_jointe.related_id
        return False

class PretEmployeViewSet(viewsets.ModelViewSet):
    """ViewSet pour gérer les prêts d'employés."""
    queryset = PretEmploye.objects.all()
    serializer_class = PretEmployeSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        utilisateur = getattr(self.request.user, 'utilisateur', None)
        if not utilisateur:
            return PretEmploye.objects.none()
        if utilisateur.role == 'ADMIN':
            return PretEmploye.objects.all()
        if utilisateur.role == 'MANAGER' and utilisateur.service:
            return PretEmploye.objects.filter(
                Q(service_source=utilisateur.service) |
                Q(service_destination=utilisateur.service)
            )
        return PretEmploye.objects.filter(employe=utilisateur)

class ModeUrgenceViewSet(viewsets.ModelViewSet):
    """ViewSet pour gérer les modes d'urgence."""
    queryset = ModeUrgence.objects.all()
    serializer_class = ModeUrgenceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        utilisateur = getattr(self.request.user, 'utilisateur', None)
        if not utilisateur:
            return ModeUrgence.objects.none()
        if utilisateur.role == 'ADMIN':
            return ModeUrgence.objects.all()
        if utilisateur.role == 'MANAGER' and utilisateur.service:
            return ModeUrgence.objects.filter(service_principal=utilisateur.service)
        return ModeUrgence.objects.none()

class NotificationViewSet(viewsets.ModelViewSet):
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        utilisateur = getattr(self.request.user, 'utilisateur', None)
        if not utilisateur:
            return Notification.objects.none()
        return Notification.objects.filter(utilisateur=utilisateur)

class ServiceManagerCreateAPIView(APIView):
    """API pour créer un service et un manager associé en une seule opération atomique."""
    permission_classes = []  # Contrôle via admin_code

    def post(self, request, *args, **kwargs):
        serializer = ServiceManagerCreateSerializer(data=request.data)
        if serializer.is_valid():
            result = serializer.save()
            service = result['service']  # Correction : accès direct au dictionnaire
            manager = result['manager']  # Correction : accès direct au dictionnaire
            return Response({
                "service_id": str(service.id) if service else None,
                "service_name": getattr(service, 'name', None) if service else None,
                "manager_id": str(manager.id) if manager else None,
                "manager_username": getattr(getattr(manager, 'user', None), 'username', None) if manager else None
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_public_services(request):
    services = Service.objects.filter(chef__isnull=True).values('id', 'name', 'description', 'color')
    return Response(list(services))

class DebugPermissionsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        utilisateur = getattr(user, 'utilisateur', None)
        if not utilisateur:
            return Response({'error': 'Aucun profil utilisateur associé.'}, status=400)
        groups = list(user.groups.values_list('name', flat=True)) if hasattr(user, 'groups') and hasattr(user.groups, 'values_list') else []
        permissions = list(user.get_all_permissions()) if hasattr(user, 'get_all_permissions') else []
        return Response({
            'username': user.username,
            'role': utilisateur.role,
            'groups': groups,
            'permissions': permissions,
        })

def api_home(request):
    """Vue d'accueil de l'API qui renvoie des informations de base sur l'API."""
    return HttpResponse("API TAskFlow - Serveur en cours d'exécution")
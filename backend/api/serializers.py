from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    Service, Utilisateur, Projet, Tache, Commentaire, Conversation, Message, PieceJointe, PretEmploye, ModeUrgence, Notification
)
from django.db import transaction
from django.conf import settings
# Remarque : Les attributs .objects et .DoesNotExist sont bien présents sur les modèles Django,
# même si certains linters ne les détectent pas correctement.

# --- Base Serializers ---

class UtilisateurSimpleSerializer(serializers.ModelSerializer):
    """Simplified user serializer for embedding in other serializers."""
    fullName = serializers.CharField(source='user.get_full_name', read_only=True)
    
    class Meta:
        model = Utilisateur
        fields = ('id', 'fullName', 'role')

# --- Main Model Serializers ---

class ServiceSerializer(serializers.ModelSerializer):
    """API serializer for the Service model."""
    # name = serializers.CharField(source='name')  # Supprimer source, c'est redondant
    workloadCapacity = serializers.IntegerField(source='capacity_charge')
    headId = serializers.UUIDField(source='chef.id', read_only=True, allow_null=True)
    headDetails = UtilisateurSimpleSerializer(source='chef', read_only=True)
    headIdInput = serializers.UUIDField(write_only=True, required=False, allow_null=True)
    
    # Detailed nested data
    memberCount = serializers.IntegerField(source='nombre_membres', read_only=True)

    # Timestamps
    createdAt = serializers.DateTimeField(source='date_creation', read_only=True)
    updatedAt = serializers.DateTimeField(source='date_maj', read_only=True)

    class Meta:
        model = Service
        fields = [
            'id', 'name', 'description', 'color', 'workloadCapacity',
            'headId', 'headDetails', 'headIdInput', 'memberCount', 'createdAt', 'updatedAt'
        ]

    def validate(self, data):
        # Accepter headId ou headIdInput
        head_id = data.get('headIdInput') or data.get('headId')
        if head_id:
            try:
                chef = Utilisateur.objects.get(id=head_id)
                if chef.role != Utilisateur.Role.MANAGER:
                    raise serializers.ValidationError({'headId': 'Seul un utilisateur avec le rôle MANAGER peut être chef de service.'})
            except Utilisateur.DoesNotExist:
                raise serializers.ValidationError({'headId': 'Utilisateur inexistant.'})
        return data

    def create(self, validated_data):
        # Accepter headId ou headIdInput
        head_id = validated_data.pop('headIdInput', None) or validated_data.pop('headId', None)
        service = Service.objects.create(**validated_data)
        if head_id:
            try:
                chef = Utilisateur.objects.get(id=head_id)
                service.chef = chef
                service.save()
                # Synchroniser le champ service du manager
                chef.service = service
                chef.save()
            except Utilisateur.DoesNotExist:
                pass  # Optionnel : lever une ValidationError
        return service

    def update(self, instance, validated_data):
        # Accepter headId ou headIdInput
        head_id = validated_data.pop('headIdInput', None) or validated_data.pop('headId', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if head_id is not None:
            try:
                chef = Utilisateur.objects.get(id=head_id)
                instance.chef = chef
                # Synchroniser le champ service du manager
                chef.service = instance
                chef.save()
            except Utilisateur.DoesNotExist:
                instance.chef = None
        instance.save()
        return instance

class UtilisateurDetailleSerializer(serializers.ModelSerializer):
    """Detailed API serializer for the Utilisateur model."""
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.EmailField(source='user.email')
    firstName = serializers.CharField(source='user.first_name')
    lastName = serializers.CharField(source='user.last_name')
    fullName = serializers.CharField(source='user.get_full_name', read_only=True)
    
    serviceDetails = ServiceSerializer(source='service', read_only=True)
    serviceId = serializers.UUIDField(source='service.id', read_only=True, allow_null=True)
    serviceIdInput = serializers.UUIDField(write_only=True, required=False, allow_null=True)
    
    phone = serializers.CharField(source='telephone', allow_blank=True)
    profilePhoto = serializers.SerializerMethodField()
    isActive = serializers.BooleanField(source='est_actif')
    lastLogin = serializers.DateTimeField(source='derniere_connexion', read_only=True, allow_null=True)
    
    createdAt = serializers.DateTimeField(source='date_creation', read_only=True)
    updatedAt = serializers.DateTimeField(source='date_maj', read_only=True)
    permissions = serializers.SerializerMethodField()

    def get_profilePhoto(self, obj):
        request = self.context.get('request', None)
        if obj.photo_profil and hasattr(obj.photo_profil, 'url'):
            url = obj.photo_profil.url
            if request is not None:
                return request.build_absolute_uri(url)
            # Si l'URL commence déjà par /media/, ne pas préfixer
            if url.startswith('/media/'):
                return url
            # Sinon, préfixer avec MEDIA_URL
            from django.conf import settings
            return f'{settings.MEDIA_URL.rstrip("/")}/{url.lstrip("/")}'
        return None

    def get_permissions(self, obj):
        from api.role_permissions import build_role_permissions
        user = getattr(obj, 'user', None)
        perms = set()
        # Permissions explicites de l'utilisateur
        if user and hasattr(user, 'get_all_permissions'):
            perms.update(user.get_all_permissions())
        # Permissions par rôle (mapping dynamique)
        role_permissions = build_role_permissions()
        role_perms = set(role_permissions.get(obj.role, []))
        perms.update(role_perms)
        # Pour l'admin, injecter toutes les permissions du système
        if obj.role == 'ADMIN':
            from django.contrib.auth.models import Permission
            all_perms = Permission.objects.values_list('codename', flat=True)
            perms.update(all_perms)
        # Retourner uniquement les codenames (ex: 'add_tache')
        return list(set(p.split('.', 1)[-1] if '.' in p else p for p in perms))

    class Meta:
        model = Utilisateur
        fields = [
            'id', 'username', 'email', 'firstName', 'lastName', 'fullName', 'role',
            'serviceId', 'serviceDetails', 'serviceIdInput', 'phone', 'bio', 'profilePhoto',
            'isActive', 'lastLogin', 'createdAt', 'updatedAt', 'permissions'
        ]

    def update(self, instance, validated_data):
        import logging
        logging.warning(f"validated_data avant update: {validated_data}")
        # Gérer le cas où DRF fournit un dict 'user' imbriqué
        user_data = validated_data.pop('user', None)
        user = instance.user
        if user_data:
            if 'first_name' in user_data:
                user.first_name = user_data['first_name']
            if 'last_name' in user_data:
                user.last_name = user_data['last_name']
            if 'email' in user_data:
                user.email = user_data['email']
        if 'firstName' in validated_data:
            user.first_name = validated_data.pop('firstName')
        if 'lastName' in validated_data:
            user.last_name = validated_data.pop('lastName')
        if 'email' in validated_data:
            user.email = validated_data.pop('email')
        user.save()
        service_id = validated_data.pop('serviceIdInput', None)
        if service_id is not None and instance.role == 'MANAGER':
            from .models import Service
            try:
                service = Service.objects.get(id=service_id)
                instance.service = service
            except Service.DoesNotExist:
                raise serializers.ValidationError({'serviceIdInput': 'Service introuvable.'})
        # Mettre à jour explicitement les champs phone (telephone) et bio
        if 'phone' in validated_data:
            instance.telephone = validated_data.pop('phone')
        if 'bio' in validated_data:
            instance.bio = validated_data.pop('bio')
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        instance.refresh_from_db()
        instance.user.refresh_from_db()
        return instance

class PieceJointeSerializer(serializers.ModelSerializer):
    """API serializer for the PieceJointe (Attachment) model."""
    name = serializers.CharField(source='name')
    mimeType = serializers.CharField(source='type_mime')
    isEncrypted = serializers.BooleanField(source='est_chiffre')
    relatedTo = serializers.CharField(source='related_to')
    relatedId = serializers.UUIDField(source='related_id')
    uploadedById = serializers.UUIDField(source='telecharge_par.id', read_only=True)
    uploadedByDetails = UtilisateurSimpleSerializer(source='telecharge_par', read_only=True)
    createdAt = serializers.DateTimeField(source='date_creation', read_only=True)

    class Meta:
        model = PieceJointe
        fields = [
            'id', 'name', 'url', 'mimeType', 'size', 'isEncrypted', 'checksum',
            'relatedTo', 'relatedId', 'uploadedById', 'uploadedByDetails', 'createdAt'
        ]
        read_only_fields = ['url', 'size', 'checksum', 'createdAt']

class ProjetSerializer(serializers.ModelSerializer):
    startDate = serializers.DateField(source='start_date')
    endDate = serializers.DateField(source='end_date')
    actualEndDate = serializers.DateField(source='actual_end_date', allow_null=True, required=False)
    riskLevel = serializers.CharField(source='risk_level')
    creatorId = serializers.UUIDField(source='creator.id', read_only=True)
    chefId = serializers.UUIDField(source='chef', write_only=True, required=False, allow_null=True)
    chefDetails = UtilisateurSimpleSerializer(source='chef', read_only=True)
    memberIds = serializers.ListField(child=serializers.UUIDField(), source='membres', required=False, write_only=True)
    memberDetails = UtilisateurSimpleSerializer(source='membres', many=True, read_only=True)
    taskCount = serializers.IntegerField(source='nombre_taches', read_only=True)
    completedTaskCount = serializers.IntegerField(source='taches_terminees', read_only=True)
    serviceId = serializers.UUIDField(source='service.id', required=False, allow_null=True)
    serviceIds = serializers.ListField(child=serializers.UUIDField(), source='services', required=False, write_only=True)
    attachments = PieceJointeSerializer(source='pieces_jointes', many=True, read_only=True)
    createdAt = serializers.DateTimeField(source='date_creation', read_only=True)
    updatedAt = serializers.DateTimeField(source='date_maj', read_only=True)

    class Meta:
        model = Projet
        fields = [
            'id', 'name', 'description', 'status', 'progress', 'color',
            'startDate', 'endDate', 'actualEndDate', 'riskLevel',
            'creatorId', 'chefId', 'chefDetails', 'memberIds', 'memberDetails', 'taskCount', 'completedTaskCount',
            'serviceId', 'serviceIds', 'attachments', 'createdAt', 'updatedAt'
        ]

    def create(self, validated_data):
        import logging
        logging.debug(f"[PROJET CREATE] validated_data: {validated_data}")
        try:
            membres_ids = validated_data.pop('membres', [])
            services_ids = validated_data.pop('services', [])
            service_id = validated_data.pop('service', None)
            chef_id = validated_data.pop('chef', None)
            if chef_id:
                try:
                    chef = Utilisateur.objects.get(id=chef_id)
                    validated_data['chef'] = chef
                except Utilisateur.DoesNotExist:
                    validated_data['chef'] = None
            if service_id:
                validated_data['service'] = service_id
            project = Projet.objects.create(**validated_data)
            if membres_ids:
                project.membres.set(membres_ids)
            if services_ids:
                project.services.set(services_ids)
            logging.info(f"[PROJET CREATE] Projet créé avec succès: {project}")
            return project
        except Exception as e:
            logging.error(f"[PROJET CREATE] Erreur lors de la création: {e}")
            raise

    def update(self, instance, validated_data):
        chef_id = validated_data.pop('chef', None)
        if chef_id is not None:
            try:
                chef = Utilisateur.objects.get(id=chef_id)
                instance.chef = chef
            except Utilisateur.DoesNotExist:
                instance.chef = None
        membres_ids = validated_data.pop('membres', None)
        services_ids = validated_data.pop('services', None)
        service_id = validated_data.pop('service', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if membres_ids is not None:
            instance.membres.set(membres_ids)
        if services_ids is not None:
            instance.services.set(services_ids)
        if service_id is not None:
            instance.service = service_id
        instance.save()
        return instance

class CommentaireSerializer(serializers.ModelSerializer):
    """API serializer for the Commentaire (Comment) model."""
    authorId = serializers.UUIDField(source='auteur.id')
    authorDetails = UtilisateurSimpleSerializer(source='auteur', read_only=True)
    taskId = serializers.UUIDField(source='tache.id')
    content = serializers.CharField(source='contenu')
    isEdited = serializers.BooleanField(source='est_modifie', read_only=True)
    
    createdAt = serializers.DateTimeField(source='date_creation', read_only=True)
    updatedAt = serializers.DateTimeField(source='date_maj', read_only=True)

    class Meta:
        model = Commentaire
        fields = [
            'id', 'content', 'mentions', 'isEdited', 'authorId', 
            'authorDetails', 'taskId', 'createdAt', 'updatedAt'
        ]

class TacheSerializer(serializers.ModelSerializer):
    """API serializer for the Tache (Task) model."""
    type = serializers.CharField(required=True)
    priority = serializers.CharField()
    deadline = serializers.DateTimeField()
    completionDate = serializers.DateTimeField(source='completion_date', allow_null=True, read_only=True)
    
    creatorId = serializers.UUIDField(source='creator.id', read_only=True)
    creatorDetails = UtilisateurSimpleSerializer(source='creator', read_only=True)
    
    assigneeIds = serializers.ListField(
        child=serializers.UUIDField(),
        write_only=True,
        required=False
    )
    assigneeDetails = UtilisateurSimpleSerializer(source='assignees', many=True, read_only=True)
    
    serviceId = serializers.SerializerMethodField(read_only=True)
    serviceIdInput = serializers.UUIDField(write_only=True, required=False, allow_null=True)
    serviceDetails = ServiceSerializer(source='service', read_only=True)
    
    projectId = serializers.UUIDField(source='project.id', allow_null=True, required=False)
    
    estimatedTime = serializers.IntegerField(source='estimated_time', required=False, default=0)
    trackedTime = serializers.IntegerField(source='tracked_time', required=False, default=0)
    workloadPoints = serializers.IntegerField(source='workload_points', required=False, default=0)
    
    isOverdue = serializers.BooleanField(source='est_en_retard', read_only=True)
    
    attachments = PieceJointeSerializer(source='pieces_jointes', many=True, read_only=True)
    comments = CommentaireSerializer(source='commentaires', many=True, read_only=True)
    
    createdAt = serializers.DateTimeField(source='date_creation', read_only=True)
    updatedAt = serializers.DateTimeField(source='date_maj', read_only=True)

    class Meta:
        model = Tache
        exclude = ['creator']
        # ou bien, si tu veux l'inclure en read_only :
        # fields = '__all__'
        # read_only_fields = ['creator']

    def validate(self, data):
        # Validation du type et cohérence des relations
        t_type = data.get('type')
        project = data.get('project', None)
        service = data.get('service', None)
        if t_type == 'projet' and not project:
            raise serializers.ValidationError("Une tâche de type 'projet' doit être liée à un projet.")
        if t_type == 'service' and not service:
            raise serializers.ValidationError("Une tâche de type 'service' doit être liée à un service.")
        if t_type == 'personnel' and (project or service):
            raise serializers.ValidationError("Une tâche personnelle ne doit pas être liée à un projet ou un service.")
        return data

    def get_uuid_from_context(self, name):
        if hasattr(self, 'initial_data') and self.initial_data and name in self.initial_data:
            return self.initial_data[name]
        if self.context.get('request') and name in self.context['request'].data:
            return self.context['request'].data.get(name)
        return None

    def create(self, validated_data):
        import logging
        logging.debug(f"[TACHE CREATE] validated_data: {validated_data}")
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            logging.error("[TACHE CREATE] Utilisateur non authentifié")
            raise serializers.ValidationError("Utilisateur non authentifié")
        creator = request.user.utilisateur
        try:
            service_id = self.get_uuid_from_context('serviceIdInput')
            project_id = self.get_uuid_from_context('projectId')
            t_type = validated_data.get('type')
            if t_type == 'service':
                if not service_id:
                    logging.error("[TACHE CREATE] serviceIdInput manquant pour tâche de service")
                    raise serializers.ValidationError({'serviceIdInput': 'Ce champ est requis pour une tâche de service'})
                validated_data['service'] = Service.objects.get(id=service_id)
                validated_data['project'] = None
            elif t_type == 'projet':
                if not project_id:
                    logging.error("[TACHE CREATE] projectId manquant pour tâche de projet")
                    raise serializers.ValidationError({'projectId': 'Ce champ est requis pour une tâche de projet'})
                validated_data['project'] = Projet.objects.get(id=project_id)
                validated_data['service'] = None
            elif t_type == 'personnel':
                validated_data['service'] = None
                validated_data['project'] = None
            if 'creator' in validated_data:
                validated_data.pop('creator')
            tache = Tache.objects.create(
                creator=creator,
                **{k: v for k, v in validated_data.items() if k not in ['assigneeIds']}
            )
            assignee_ids = validated_data.get('assigneeIds', [])
            if assignee_ids:
                assignees = Utilisateur.objects.filter(id__in=assignee_ids)
                tache.assignees.set(assignees)
            logging.info(f"[TACHE CREATE] Tâche créée avec succès: {tache}")
            return tache
        except Exception as e:
            logging.error(f"[TACHE CREATE] Erreur lors de la création: {e}")
            raise

    def update(self, instance, validated_data):
        service_id = self.get_uuid_from_context('serviceIdInput')
        project_id = self.get_uuid_from_context('projectId')
        t_type = validated_data.get('type')
        if t_type == 'service':
            if not service_id:
                raise serializers.ValidationError({'serviceIdInput': 'Ce champ est requis pour une tâche de service'})
            instance.service = Service.objects.get(id=service_id)
            instance.project = None
        elif t_type == 'projet':
            if not project_id:
                raise serializers.ValidationError({'projectId': 'Ce champ est requis pour une tâche de projet'})
            instance.project = Projet.objects.get(id=project_id)
            instance.service = None
        elif t_type == 'personnel':
            instance.service = None
            instance.project = None
        assignee_ids = validated_data.get('assigneeIds', None)
        if assignee_ids is not None:
            assignees = Utilisateur.objects.filter(id__in=assignee_ids)
            instance.assignees.set(assignees)
        for attr, value in validated_data.items():
            if attr not in ['service', 'project', 'assigneeIds']:
                setattr(instance, attr, value)
        instance.save()
        return instance

    def get_assigneeIds(self, obj):
        return [str(u.id) for u in obj.assignees.all()]  # type: ignore[attr-defined]

    def get_serviceId(self, obj):
        if obj.service:
            return str(obj.service.id)
        elif obj.project and obj.project.services.exists():
            return str(obj.project.services.first().id)
        return None

# --- Auth & User Management Serializers ---

class UserCreateSerializer(serializers.ModelSerializer):
    """Serializer for new user registration."""
    # These fields are not on the model but used in logic
    admin_code = serializers.CharField(write_only=True, required=False, allow_blank=True)
    service_id = serializers.CharField(write_only=True, required=False, allow_blank=True, allow_null=True)
    role = serializers.CharField(write_only=True, required=True)
    
    class Meta:
        model = User
        fields = ('username', 'password', 'email', 'first_name', 'last_name', 'role', 'service_id', 'admin_code')
        extra_kwargs = {'password': {'write_only': True}}
    
    def validate(self, data):
        role = data.get('role', 'EMPLOYEE')
        admin_code = data.pop('admin_code', None)
        
        from django.conf import settings
        if role in ('ADMIN', 'MANAGER'):
            if not admin_code or admin_code != getattr(settings, 'ADMIN_SECRET_CODE', 'SUPER_SECRET_CODE'):
                raise serializers.ValidationError({"admin_code": "Code administrateur invalide ou manquant."})
        
        # Validation spécifique pour les managers
        if role == 'MANAGER':
            service_id = data.get('service_id')
            if not service_id:
                raise serializers.ValidationError({"service_id": "Le champ service est obligatoire pour un manager."})
            # Vérifier que le service existe
            try:
                Service.objects.get(id=service_id)
            except Service.DoesNotExist:
                raise serializers.ValidationError({"service_id": "Service inexistant."})
            # Vérifier qu'un seul manager par service
            if Utilisateur.objects.filter(role='MANAGER', service_id=service_id).exists():
                raise serializers.ValidationError({"service_id": "Ce service a déjà un manager."})
        else:
            # Pour les autres rôles, ignorer service_id s'il est vide ou non UUID
            if 'service_id' in data and not data['service_id']:
                data.pop('service_id')
        
        # Les admins ne peuvent pas avoir de service assigné
        if role == 'ADMIN' and 'service_id' in data:
            data.pop('service_id')
            
        return data
    
    def create(self, validated_data):
        role = validated_data.pop('role', 'EMPLOYEE')
        service_id = validated_data.pop('service_id', None)
        
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email'),
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', '')
        )
        
        utilisateur_data = {'user': user, 'role': role}
        if service_id:
            utilisateur_data['service_id'] = service_id
            
        Utilisateur.objects.create(**utilisateur_data)
        
        return user

class UserSerializer(serializers.ModelSerializer):
    """Serializer for the connected user's main details."""
    profile = UtilisateurDetailleSerializer(source='utilisateur', read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'profile']

# --- Messaging Serializers ---

class MessageSerializer(serializers.ModelSerializer):
    sender = UtilisateurSimpleSerializer(read_only=True)
    createdAt = serializers.DateTimeField(source='date_creation', read_only=True)

    class Meta:
        model = Message
        fields = ('id', 'conversation', 'sender', 'content', 'createdAt', 'read_by')
        read_only_fields = ('id', 'createdAt', 'sender')

class ConversationSerializer(serializers.ModelSerializer):
    participants = UtilisateurSimpleSerializer(many=True, read_only=True)
    participant_ids = serializers.ListField(
        child=serializers.UUIDField(),
        write_only=True,
        required=False
    )
    lastMessage = serializers.SerializerMethodField()
    createdAt = serializers.DateTimeField(source='date_creation', read_only=True)

    class Meta:
        model = Conversation
        fields = ('id', 'name', 'is_group', 'participants', 'participant_ids', 'lastMessage', 'createdAt')
        read_only_fields = ('id', 'participants', 'lastMessage', 'createdAt')

    def get_lastMessage(self, obj):
        last_msg = obj.messages.order_by('-date_creation').first()  # type: ignore[attr-defined]
        if last_msg:
            return MessageSerializer(last_msg).data
        return None

    def create(self, validated_data):
        request_user = self.context['request'].user.utilisateur
        participant_ids = validated_data.pop('participant_ids', [])
        
        conversation = Conversation.objects.create(**validated_data)
        
        participants = list(Utilisateur.objects.filter(id__in=participant_ids))
        if request_user not in participants:
            participants.append(request_user)
            
        conversation.participants.set(participants)
        return conversation

class PretEmployeSerializer(serializers.ModelSerializer):
    """API serializer for the PretEmploye (Employee Loan) model."""
    employeeId = serializers.CharField(source='employe.id')
    employeeDetails = UtilisateurSimpleSerializer(source='employe', read_only=True)
    sourceServiceId = serializers.CharField(source='service_source.id')
    sourceServiceDetails = ServiceSerializer(source='service_source', read_only=True)
    destinationServiceId = serializers.CharField(source='service_destination.id')
    destinationServiceDetails = ServiceSerializer(source='service_destination', read_only=True)
    startDate = serializers.DateField(source='date_debut')
    endDate = serializers.DateField(source='date_fin')
    reason = serializers.CharField(source='raison')
    status = serializers.CharField(source='statut')
    workloadImpact = serializers.IntegerField(source='impact_charge')
    cost = serializers.DecimalField(source='cout', max_digits=10, decimal_places=2, allow_null=True)

    createdAt = serializers.DateTimeField(source='date_creation', read_only=True)
    updatedAt = serializers.DateTimeField(source='date_maj', read_only=True)

    class Meta:
        model = PretEmploye
        fields = [
            'id', 'employeeId', 'employeeDetails', 'sourceServiceId', 'sourceServiceDetails',
            'destinationServiceId', 'destinationServiceDetails', 'startDate', 'endDate',
            'reason', 'status', 'workloadImpact', 'cost', 'createdAt', 'updatedAt'
        ]

    def validate_employeeId(self, value):
        if isinstance(value, dict) and 'id' in value:
            return str(value['id'])
        return str(value)
    def validate_sourceServiceId(self, value):
        if isinstance(value, dict) and 'id' in value:
            return str(value['id'])
        return str(value)
    def validate_destinationServiceId(self, value):
        if isinstance(value, dict) and 'id' in value:
            return str(value['id'])
        return str(value)

class ModeUrgenceSerializer(serializers.ModelSerializer):
    """API serializer for the ModeUrgence (Urgency Mode) model."""
    title = serializers.CharField(source='titre')
    isActive = serializers.BooleanField(source='est_actif')
    startDate = serializers.DateTimeField(source='date_debut')
    endDate = serializers.DateTimeField(source='date_fin', allow_null=True)
    severity = serializers.CharField(source='severite')
    allocatedResources = serializers.CharField(source='ressources_allouees', allow_blank=True)
    mainServiceId = serializers.CharField(source='service_principal.id', allow_null=True)
    mainServiceDetails = ServiceSerializer(source='service_principal', read_only=True)

    class Meta:
        model = ModeUrgence
        fields = [
            'id', 'title', 'description', 'isActive', 'startDate', 'endDate',
            'severity', 'allocatedResources', 'mainServiceId', 'mainServiceDetails'
        ]

    def validate_mainServiceId(self, value):
        if isinstance(value, dict) and 'id' in value:
            return str(value['id'])
        return str(value)

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = '__all__'

class ServiceManagerCreateSerializer(serializers.Serializer):
    # Champs pour le service
    service_name = serializers.CharField(max_length=100)
    service_description = serializers.CharField(allow_blank=True, required=False)
    service_color = serializers.CharField(max_length=7, required=False, default="#3788d8")
    # Champs pour le manager
    manager_username = serializers.CharField(max_length=150)
    manager_email = serializers.EmailField()
    manager_password = serializers.CharField(write_only=True)
    manager_first_name = serializers.CharField(max_length=150)
    manager_last_name = serializers.CharField(max_length=150)
    admin_code = serializers.CharField(write_only=True)

    def validate(self, data):
        # Vérifier unicité du nom de service
        if Service.objects.filter(name=data['service_name']).exists():
            raise serializers.ValidationError({"service_name": "Un service avec ce nom existe déjà."})
        # Vérifier unicité du username/email manager
        if User.objects.filter(username=data['manager_username']).exists():
            raise serializers.ValidationError({"manager_username": "Ce nom d'utilisateur existe déjà."})
        if User.objects.filter(email=data['manager_email']).exists():
            raise serializers.ValidationError({"manager_email": "Cet email est déjà utilisé."})
        # Vérifier le code admin
        from django.conf import settings
        if data['admin_code'] != getattr(settings, 'ADMIN_SECRET_CODE', 'SUPER_SECRET_CODE'):
            raise serializers.ValidationError({"admin_code": "Code administrateur invalide ou manquant."})
        return data

    def create(self, validated_data):
        with transaction.atomic():
            # 1. Créer le service sans chef
            service = Service.objects.create(
                name=validated_data['service_name'],
                description=validated_data.get('service_description', ''),
                color=validated_data.get('service_color', '#3788d8')
            )
            # 2. Créer le manager associé à ce service
            user = User.objects.create_user(
                username=validated_data['manager_username'],
                email=validated_data['manager_email'],
                password=validated_data['manager_password'],
                first_name=validated_data['manager_first_name'],
                last_name=validated_data['manager_last_name']
            )
            manager = Utilisateur.objects.create(
                user=user,
                role=Utilisateur.Role.MANAGER,
                service=service
            )
            # 3. Mettre à jour le service pour définir le chef
            service.chef = manager
            service.save()
        return {"service": service, "manager": manager}

import uuid
import os
import hashlib
from django.db import models
from django.contrib.auth.models import User, Group, Permission
from django.core.exceptions import ValidationError
from django.conf import settings
from django.utils import timezone
from django.core.files.storage import default_storage
from django.db.models import Q, Index
from django.contrib.postgres.indexes import GinIndex

def upload_attachment_path(instance, filename):
    """
    Generates the storage path for attachments
    Format: attachments/YYYY/MM/task_uuid/filename
    """
    return f'attachments/{timezone.now().year}/{timezone.now().month:02d}/{instance.task.id}/{filename}'

class UUIDModel(models.Model):
    """
    Abstract class for models with a UUID primary key.
    All models should inherit from this class to maintain
    consistency in UUID generation.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    date_creation = models.DateTimeField(auto_now_add=True)
    date_maj = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True

class Service(UUIDModel):
    """Service/Department of the organization"""
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)
    color = models.CharField(max_length=7, default='#3788d8')  # Hex color
    capacity_charge = models.IntegerField(default=100)  # Workload capacity
    chef = models.ForeignKey('Utilisateur', on_delete=models.SET_NULL, null=True, blank=True, related_name='services_diriges')

    def __str__(self):
        return self.name
    
    # La FK Utilisateur.service a bien related_name='utilisateurs', donc Service.utilisateurs fonctionne
    @property
    def membres(self):
        """Retourne tous les utilisateurs du service"""
        return self.utilisateurs.all()  # type: ignore[attr-defined]
    
    @property
    def nombre_membres(self):
        """Retourne le nombre de membres du service"""
        return self.utilisateurs.count()  # type: ignore[attr-defined]

    class Meta:
        indexes = [
            Index(fields=['chef']),
        ]

class Utilisateur(UUIDModel):
    """User of the system with extended information"""
    class Role(models.TextChoices):
        ADMIN = 'ADMIN', 'Administrator'
        DIRECTOR = 'DIRECTOR', 'Director'
        MANAGER = 'MANAGER', 'Manager'
        EMPLOYEE = 'EMPLOYEE', 'Employee'
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='utilisateur')
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.EMPLOYEE)
    is_admin = models.BooleanField(default=False, help_text="Cet utilisateur a aussi les droits d'ADMIN")
    service = models.ForeignKey(
        Service, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='utilisateurs'
    )
    telephone = models.CharField(max_length=20, blank=True, null=True)
    bio = models.TextField(blank=True, null=True)
    photo_profil = models.ImageField(upload_to='profils/', blank=True, null=True)
    est_actif = models.BooleanField(default=True)
    derniere_connexion = models.DateTimeField(null=True, blank=True)

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        # Empêcher la sauvegarde d'un MANAGER sans service
        if self.role == self.Role.MANAGER and not self.service:
            from django.core.exceptions import ValidationError
            raise ValidationError("Un manager doit obligatoirement être associé à un service.")
        super().save(*args, **kwargs)
        
        # Synchronize groups with role
        if self.user:
            # Remove user from all role groups
            for role in self.Role.values:
                group, created = Group.objects.get_or_create(name=role)
                self.user.groups.remove(group)
            
            # Add user to the group corresponding to their role
            group, created = Group.objects.get_or_create(name=self.role)
            self.user.groups.add(group)
            
            # If it's an admin, set staff status
            self.user.is_staff = self.role == self.Role.ADMIN
            self.user.save()
            
            # If it's a service manager, assign them as the chef of their service
            if self.role == self.Role.MANAGER and self.service:
                self.service.chef = self
                self.service.save()
                print(f"DEBUG: Manager {self.user.username} assigned as chef of service {self.service.name}")
            elif self.role == self.Role.MANAGER and not self.service:
                print(f"DEBUG: Manager {self.user.username} has no service assigned")
    
    def has_perm(self, perm):
        """Checks if the user has a specific permission"""
        if self.role == self.Role.ADMIN:
            return True
        return self.user.has_perm(perm)
    
    def can_manage_projects(self):
        """ADMIN, DIRECTOR, MANAGER (of their service) can manage projects."""
        return self.role in [self.Role.ADMIN, self.Role.DIRECTOR, self.Role.MANAGER]

    def can_manage_services(self):
        """ADMIN, DIRECTOR can manage services."""
        return self.role in [self.Role.ADMIN, self.Role.DIRECTOR]

    def can_manage_users(self):
        """Only ADMIN can manage users."""
        return self.role == self.Role.ADMIN

    def can_manage_tasks(self, task=None):
        """ADMIN: all, DIRECTOR: read, MANAGER: manage their service, EMPLOYEE: their own tasks."""
        if self.role == self.Role.ADMIN:
            return True
        if self.role == self.Role.DIRECTOR:
            return False  # Director can only read
        if self.role == self.Role.MANAGER:
            if task is None:
                return True
            return task.service == self.service
        if self.role == self.Role.EMPLOYEE:
            if task is None:
                return False
            return task.assignees.filter(id=self.id).exists() or task.creator == self
        return False

    def can_read_all(self):
        """ADMIN, DIRECTOR, MANAGER can read all; EMPLOYEE limited."""
        return self.role in [self.Role.ADMIN, self.Role.DIRECTOR, self.Role.MANAGER]
    
    def can_add_tache(self):
        """Checks if the user can add tasks"""
        return self.role in [self.Role.ADMIN, self.Role.MANAGER]
    
    def can_edit_tache(self, tache):
        """Checks if the user can modify a specific task"""
        if self.role == self.Role.ADMIN:
            return True
        if self.role == self.Role.MANAGER:
            return self.service == tache.service
        return tache.createur == self or self in tache.assignes.all()
    
    def can_delete_tache(self, tache):
        """Checks if the user can delete a task"""
        if self.role == self.Role.ADMIN:
            return True
        if self.role == self.Role.MANAGER:
            return self.service == tache.service
        return False

    def __str__(self):
        # Vérifier que la méthode existe bien
        role_display = self.role
        if hasattr(self, 'get_role_display') and callable(getattr(self, 'get_role_display', None)):
            try:
                role_display = self.get_role_display()  # type: ignore[attr-defined]
            except Exception:
                pass
        roles = [role_display]
        if getattr(self, 'is_admin', False):
            roles.append('ADMIN')
        if hasattr(self, 'user') and hasattr(self.user, 'get_full_name'):
            name = self.user.get_full_name() or getattr(self.user, 'username', '')
        else:
            name = getattr(self, 'user', None) or ''
        return f"{name} - {'/'.join(roles)}"

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['service'], condition=Q(role='MANAGER'), name='unique_manager_per_service')
        ]

class Projet(UUIDModel):
    """Project of the organization with harmonized French/English"""
    # Harmonized statuses 
    STATUT_CHOICES = [
        ('planning', 'Planning'),  # planning
        ('active', 'Active'),                 # active
        ('on_hold', 'On Hold'),           # on_hold
        ('completed', 'Completed'),             # completed
        ('cancelled', 'Cancelled'),              # cancelled
    ]
    NIVEAU_RISQUE_CHOICES = [
        ('low', 'Low'),    # low
        ('medium', 'Medium'),      # medium
        ('high', 'High'),      # high
        ('critical', 'Critical'), # critical
    ]
    
    # Main fields
    name = models.CharField(max_length=255, help_text="Project name")
    description = models.TextField(null=True, blank=True, help_text="Detailed description")
    status = models.CharField(max_length=20, choices=STATUT_CHOICES, default='planning')
    start_date = models.DateField(help_text="Planned start date")
    end_date = models.DateField(help_text="Planned end date")
    actual_end_date = models.DateField(null=True, blank=True, help_text="Actual end date")
    progress = models.IntegerField(default=0, help_text="Progress in percentage (0-100)")
    risk_level = models.CharField(max_length=10, choices=NIVEAU_RISQUE_CHOICES, default='low')
    color = models.CharField(max_length=7, default='#3788d8', help_text="Project hex color")
    
    # Relations (allow null temporarily for migration)
    creator = models.ForeignKey(
        Utilisateur, 
        on_delete=models.CASCADE, 
        related_name='projets_crees',
        help_text="Project creator",
        null=True,  # Temporarily for migration
        blank=True
    )
    team_members = models.ManyToManyField(
        Utilisateur, 
        related_name='projets_assignes', 
        blank=True,
        help_text="Project team members"
    )
    # Relations
    service = models.ForeignKey(
        Service,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='projets_principaux',
        help_text="Service principal du projet"
    )
    services = models.ManyToManyField(
        Service,
        related_name='projets',
        blank=True,
        help_text="Services secondaires impliqués dans le projet"
    )
    chef = models.ForeignKey('Utilisateur', on_delete=models.SET_NULL, null=True, blank=True, related_name='projets_diriges')
    membres = models.ManyToManyField('Utilisateur', related_name='projets_participes', blank=True)

    def __str__(self):
        return self.name
    
    @property
    def nombre_taches(self):
        """Returns the total number of tasks"""
        return self.taches.count()  # type: ignore[attr-defined]
    
    @property
    def taches_terminees(self):
        """Returns the number of completed tasks"""
        return self.taches.filter(status='completed').count()  # type: ignore[attr-defined]
    
    @property
    def nombre_membres_equipe(self):
        """Returns the number of members in the team"""
        return self.team_members.count()
    
    @property
    def services_impliques(self):
        """Returns the list of involved services"""
        return self.services.all()
    
    def calculer_progression(self):
        """Automatically calculates progress based on tasks"""
        total_taches = self.nombre_taches
        if total_taches == 0:
            return 0
        return int((self.taches_terminees / total_taches) * 100)
    
    def ajouter_membre_equipe(self, utilisateur):
        """Adds a member to the team"""
        self.team_members.add(utilisateur)
    
    def retirer_membre_equipe(self, utilisateur):
        """Removes a member from the team"""
        self.team_members.remove(utilisateur)
    
    def marquer_comme_termine(self):
        """Marks the project as completed"""
        self.status = 'completed'
        self.actual_end_date = timezone.now().date()
        self.progress = 100
        self.save()
    
    @property
    def est_en_retard(self):
        """Checks if the project is overdue"""
        if self.status in ['completed', 'cancelled']:
            return False
        return self.end_date < timezone.now().date()
    
    @property
    def duree_prevue(self):
        """Calculates the planned duration in days"""
        return (self.end_date - self.start_date).days
    
    @property
    def duree_reelle(self):
        """Calculates the actual duration if the project is completed"""
        if self.actual_end_date:
            return (self.actual_end_date - self.start_date).days
        return None
    
    class Meta:
        verbose_name = "Project"
        verbose_name_plural = "Projects"
        ordering = ['-date_creation']
        indexes = [
            Index(fields=['creator']),
            Index(fields=['chef']),
            Index(fields=['status']),
            # GinIndex(fields=['name']),  # SUPPRIMÉ (CharField)
            GinIndex(fields=['description'], opclasses=["gin_trgm_ops"], name="projet_descr_gin_trgm_idx"),  # OK si description est TextField, nécessite pg_trgm
        ]

class Tache(UUIDModel):
    """Task of the organization with support for attachments and multiple assignments"""
    STATUT_CHOICES = [
        ('todo', 'To Do'),
        ('in_progress', 'In Progress'),
        ('review', 'In Review'),
        ('completed', 'Completed'),
    ]
    PRIORITE_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ]
    TYPE_CHOICES = [
        ('personnel', 'Personnel'),
        ('service', 'Service'),
        ('projet', 'Projet'),
    ]
    
    # Nouveau champ type
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='personnel', help_text="Type de tâche : personnel, service ou projet")
    
    # Main fields
    title = models.CharField(max_length=255, help_text="Task title")
    description = models.TextField(null=True, blank=True, help_text="Detailed description")
    status = models.CharField(max_length=20, choices=STATUT_CHOICES, default='todo')
    priority = models.CharField(max_length=10, choices=PRIORITE_CHOICES, default='medium')
    deadline = models.DateTimeField(help_text="Deadline")
    completion_date = models.DateTimeField(null=True, blank=True, help_text="Completion date")
    
    # Relations
    creator = models.ForeignKey(
        Utilisateur, 
        on_delete=models.CASCADE, 
        related_name='taches_creees',
        help_text="Task creator"
    )
    assignees = models.ManyToManyField(
        Utilisateur, 
        related_name='taches_assignees', 
        blank=True,
        help_text="Users assigned to this task"
    )
    service = models.ForeignKey(
        Service, 
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='taches',
        help_text="Responsible service"
    )
    project = models.ForeignKey(
        Projet, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='taches',
        help_text="Associated project"
    )
    
    # Tracking metadata
    estimated_time = models.IntegerField(default=0, help_text="Estimated time in minutes")
    tracked_time = models.IntegerField(default=0, help_text="Time spent in minutes")
    workload_points = models.IntegerField(default=0, help_text="Workload points")
    tags = models.JSONField(default=list, blank=True, help_text="Tags/keywords")
    
    # Compatibility property for single assignee (keeps compatibility)
    @property
    def assignee(self):
        """Returns the first assigned user (compatibility)"""
        return self.assignees.first()
    
    @assignee.setter
    def assignee(self, utilisateur):
        """Sets a single assigned user (compatibility)"""
        if utilisateur:
            self.assignees.set([utilisateur])
        else:
            self.assignees.clear()

    def __str__(self):
        return self.title
        
    def get_status_color(self):
        """
        Returns a color based on the task status
        """
        if self.status == 'todo':
            return '#3788d8'  # blue
        elif self.status == 'in_progress':
            return '#ff9800'  # orange
        elif self.status == 'review':
            return '#8e24aa'  # violet
        elif self.status == 'completed':
            return '#4caf50'  # green
        
        # Default color based on priority if status is unknown
        if self.priority == 'urgent':
            return '#d50000'  # bright red
        elif self.priority == 'high':
            return '#ff5252'  # red
        elif self.priority == 'medium':
            return '#ffab40'  # orange
        else:
            return '#3788d8'  # default blue
    
    @property
    def nombre_pieces_jointes(self):
        """Returns the number of attachments"""
        return self.pieces_jointes.count()  # type: ignore[attr-defined]
    
    @property
    def est_en_retard(self):
        """Checks if the task is overdue"""
        return self.deadline < timezone.now() and self.status != 'completed'
    
    def marquer_comme_terminee(self):
        """Marks the task as completed"""
        self.status = 'completed'
        self.completion_date = timezone.now()
        self.save()
    
    def ajouter_assigne(self, utilisateur):
        """Adds a user to the list of assignees"""
        self.assignees.add(utilisateur)
    
    def retirer_assigne(self, utilisateur):
        """Removes a user from the list of assignees"""
        self.assignees.remove(utilisateur)
    
    def clean(self):
        """Validation personnalisée"""
        from django.core.exceptions import ValidationError
        # Validation métier sur le type
        if self.type == 'projet' and not self.project:
            raise ValidationError("Une tâche de type 'projet' doit être liée à un projet.")
        if self.type == 'service' and not self.service:
            raise ValidationError("Une tâche de type 'service' doit être liée à un service.")
        if self.type == 'personnel' and (self.project or self.service):
            raise ValidationError("Une tâche personnelle ne doit pas être liée à un projet ou un service.")

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

class Commentaire(UUIDModel):
    tache = models.ForeignKey('Tache', on_delete=models.CASCADE, related_name='commentaires')
    auteur = models.ForeignKey('Utilisateur', on_delete=models.CASCADE)
    contenu = models.TextField()
    mentions = models.JSONField(null=True, blank=True)
    est_modifie = models.BooleanField(default=False)

class Notification(UUIDModel):
    PRIORITE_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
    ]
    utilisateur = models.ForeignKey('Utilisateur', on_delete=models.CASCADE)
    type = models.CharField(max_length=50)
    titre = models.CharField(max_length=255)
    message = models.TextField()
    est_lue = models.BooleanField(default=False)
    priorite = models.CharField(max_length=10, choices=PRIORITE_CHOICES)

class PretEmploye(UUIDModel):
    STATUT_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('rejected', 'Rejected'),
    ]
    employe = models.ForeignKey('Utilisateur', on_delete=models.CASCADE)
    service_source = models.ForeignKey('Service', on_delete=models.CASCADE, related_name='prets_source')
    service_destination = models.ForeignKey('Service', on_delete=models.CASCADE, related_name='prets_destination')
    date_debut = models.DateField()
    date_fin = models.DateField()
    raison = models.TextField()
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES)
    impact_charge = models.IntegerField()
    cout = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    # Keeps compatibility with existing code
    @property
    def dept_source(self):
        return self.service_source
        
    @dept_source.setter
    def dept_source(self, value):
        self.service_source = value
        
    @property
    def dept_destination(self):
        return self.service_destination
        
    @dept_destination.setter
    def dept_destination(self, value):
        self.service_destination = value


class Conversation(UUIDModel):
    participants = models.ManyToManyField(Utilisateur, related_name='conversations')
    name = models.CharField(max_length=100, blank=True, null=True) # For group chats
    is_group = models.BooleanField(default=False)

    def __str__(self):
        if self.is_group and self.name:
            return self.name
        elif self.is_group:
            return f"Group Conversation ({self.id})"
        else:
            # For direct messages, generate a name from participants
            users = self.participants.all()
            if users.count() == 2:
                return f"DM between {users[0].user.username} and {users[1].user.username}"
            elif users.count() == 1:
                return f"DM with {users[0].user.username}"
            else:
                return f"Direct Message ({self.id})"

class Message(UUIDModel):
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(Utilisateur, on_delete=models.CASCADE, related_name='sent_messages')
    content = models.TextField()
    read_by = models.ManyToManyField(Utilisateur, related_name='read_messages', blank=True)

    class Meta:
        ordering = ['date_creation']

    def __str__(self):
        return f"Message from {self.sender.user.username} in {self.conversation.id}"

class PieceJointe(UUIDModel):
    """
    Modèle pour gérer les pièces jointes pouvant être liées à une tâche, un projet ou un utilisateur.
    """
    RELATED_TO_CHOICES = [
        ('task', 'Tâche'),
        ('project', 'Projet'),
        ('user', 'Utilisateur'),
    ]
    name = models.CharField(max_length=255, help_text="Nom original du fichier")
    file = models.FileField(upload_to=upload_attachment_path, help_text="Fichier uploadé")
    type_mime = models.CharField(max_length=100, help_text="Type MIME du fichier")
    size = models.BigIntegerField(help_text="Taille du fichier en octets")
    checksum = models.CharField(max_length=64, help_text="Hash SHA-256 du fichier")
    est_chiffre = models.BooleanField(default=False, help_text="Fichier chiffré")

    # Nouveau système de référence générique
    related_to = models.CharField(max_length=20, choices=RELATED_TO_CHOICES, help_text="Type d'entité liée", null=False, blank=False)
    related_id = models.UUIDField(help_text="UUID de l'entité liée (tâche, projet ou utilisateur)", null=False, blank=False)
    telecharge_par = models.ForeignKey('Utilisateur', on_delete=models.CASCADE, related_name='pieces_jointes_uploadees')

    def clean(self):
        from django.core.exceptions import ValidationError
        # Temporairement permettre les champs vides pendant la migration
        if self.related_to and not self.related_id:
            raise ValidationError("Si related_to est renseigné, related_id doit l'être aussi.")
        if self.related_id and not self.related_to:
            raise ValidationError("Si related_id est renseigné, related_to doit l'être aussi.")
        if self.related_to and self.related_to not in dict(self.RELATED_TO_CHOICES):
            raise ValidationError("Type d'entité liée invalide.")
        if not self.name:
            raise ValidationError("Le nom du fichier est requis.")
        if self.size and self.size <= 0:
            raise ValidationError("La taille du fichier doit être positive.")

    def __str__(self):
        return f"{self.name} ({self.related_to}:{self.related_id})"

    class Meta:
        verbose_name = "Pièce jointe"
        verbose_name_plural = "Pièces jointes"
        ordering = ['-date_creation']
        indexes = [
            Index(fields=['related_to']),
            Index(fields=['related_id']),
            Index(fields=['telecharge_par']),
        ]

class ModeUrgence(models.Model):
    """
    Modèle pour représenter les différents modes d'urgence disponibles dans le système.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    # Note: date_creation et date_maj ont été retirés car absents de la table existante
    
    SEVERITE_CHOICES = [
        ('low', 'Faible'),
        ('medium', 'Moyen'),
        ('high', 'Élevé'),
        ('critical', 'Critique'),
    ]
    
    # Align with existing table columns - only use fields that exist in DB
    titre = models.CharField(max_length=255)  # Existing field
    description = models.TextField(blank=True, null=True)
    est_actif = models.BooleanField(default=True)  # Existing field
    date_debut = models.DateTimeField(default=timezone.now)  # Existing field
    date_fin = models.DateTimeField(blank=True, null=True)  # Existing field
    severite = models.CharField(max_length=10, choices=SEVERITE_CHOICES, default='medium')  # Maps to niveau
    ressources_allouees = models.TextField(blank=True, null=True)  # Existing field
    
    # Simplified version - we'll implement the full relationship later
    service_principal = models.ForeignKey('Service', on_delete=models.SET_NULL, null=True, blank=True, related_name='modes_urgence')
    
    class Meta:
        db_table = 'api_modeurgence'
        
    def __str__(self):
        return f"{self.titre} ({self.severite})"
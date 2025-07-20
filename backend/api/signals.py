# signals.py
# Fichier pour définir les signaux personnalisés de l'application API
# Utilisez ce fichier pour connecter des signaux aux modèles si nécessaire

from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from .models import User  # Remplacez par le nom réel de votre modèle

# Exemple de signal : exécuter une action après la sauvegarde d'une instance de YourModel
@receiver(post_save, sender=User)
def after_save_user(sender, instance, created, **kwargs):
    """
    Ce signal est déclenché après la sauvegarde d'une instance de User.
    Utilisez 'created' pour distinguer la création de la mise à jour.
    """
    if created:
        # Action à effectuer lors de la création
        pass  # Remplacez par votre logique
    else:
        # Action à effectuer lors de la mise à jour
        pass  # Remplacez par votre logique

# Ajoutez ici d'autres signaux si nécessaire
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password']

    def __str__(self):
        return self.username


from django.urls import reverse
from rest_framework.test import APITestCase
from .models import Utilisateur, Notification
from django.contrib.auth.models import User

class NotificationReceptionTest(APITestCase):
    def setUp(self):
        # Création d'un utilisateur MANAGER
        self.user = User.objects.create_user(username='manager', password='test123')
        self.utilisateur = Utilisateur.objects.create(
            user=self.user,
            role='MANAGER',
            service=None  # Ajoute un service si nécessaire
        )
        self.client.login(username='manager', password='test123')

    def test_manager_receives_notification(self):
        # Création d'une notification pour ce MANAGER
        notif = Notification.objects.create(
            utilisateur=self.utilisateur,
            type='test',
            titre='Test Notification',
            message='Ceci est un test',
            est_lue=False,
            priorite='low'
        )
        # Appel de l’API notifications
        url = reverse('notification-list')  # Vérifie le nom de l’URL dans urls.py
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        # Vérifie que la notification est bien présente dans la réponse
        notif_ids = [n['id'] for n in response.data]
        self.assertIn(str(notif.id), notif_ids)
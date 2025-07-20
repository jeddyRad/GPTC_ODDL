from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_nested.routers import NestedDefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (ServiceViewSet, UtilisateurViewSet, 
                   ProjetViewSet, TacheViewSet, CommentaireViewSet,
                   ConversationViewSet, MessageViewSet, PieceJointeViewSet, PretEmployeViewSet, ModeUrgenceViewSet, NotificationViewSet, # Ajout
                   CustomTokenObtainPairView, get_user_profile, 
                   UserCreateAPIView, get_user_details,
                   check_username_availability, check_email_availability,
                   get_calendar_events, create_calendar_event, update_calendar_event, 
                   delete_calendar_event, get_analytics_data, upload_profile_photo, change_password, ServiceManagerCreateAPIView, get_public_services, me_profile, DebugPermissionsView)

# Configurer le routeur pour les ViewSets (endpoints harmonisés en anglais)
router = DefaultRouter()
router.register(r'services', ServiceViewSet)
router.register(r'users', UtilisateurViewSet)
router.register(r'projects', ProjetViewSet)
router.register(r'tasks', TacheViewSet)
router.register(r'comments', CommentaireViewSet)
router.register(r'conversations', ConversationViewSet, basename='conversation')
router.register(r'attachments', PieceJointeViewSet, basename='attachment')
router.register(r'employee-loans', PretEmployeViewSet)
router.register(r'urgencies', ModeUrgenceViewSet)
router.register(r'notifications', NotificationViewSet)

conversations_router = NestedDefaultRouter(router, r'conversations', lookup='conversation')
conversations_router.register(r'messages', MessageViewSet, basename='conversation-messages')

urlpatterns = [
    path('', include(router.urls)),
    path('', include(conversations_router.urls)),
    path('token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', me_profile, name='api/me_profile'),
    path('register/', UserCreateAPIView.as_view(), name='api/register'),
    path('register-service-manager/', ServiceManagerCreateAPIView.as_view(), name='api/register_service_manager'),
    path('user/', get_user_details, name='api/user_details'),
    path('me/upload-photo/', upload_profile_photo, name='api/upload_profile_photo'),
    path('me/change-password/', change_password, name='api/change_password'),
    path('check-username/', check_username_availability, name='api/check_username'),
    path('check-email/', check_email_availability, name='api/check_email'),
    path('calendar/events/', get_calendar_events, name='api/calendar_events'),
    path('calendar/events/create/', create_calendar_event, name='api/create_calendar_event'),
    path('calendar/events/<str:event_id>/', update_calendar_event, name='api/update_calendar_event'),
    path('calendar/events/<str:event_id>/delete/', delete_calendar_event, name='api/delete_calendar_event'),
    path('analytics/', get_analytics_data, name='api/analytics_data'),
    path('public-services/', get_public_services, name='api/public_services'),
]
urlpatterns += [
    path('debug/permissions/', DebugPermissionsView.as_view(), name='api/debug_permissions'),
]
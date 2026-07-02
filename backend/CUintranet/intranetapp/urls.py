from django.urls import path
from . import views
from . import views_node_migrated

urlpatterns = [
    # Password reset
    path('password_reset/<str:email>/', views.password_reset, name='password_reset'),

    # User login
    path('login/', views.UserLogin, name='user_login'),

    # --- Migrated Node.js Endpoints ---
    path('api/health', views_node_migrated.health_check),
    path('api/debug-sheets', views_node_migrated.debug_sheets),
    path('api/data/<str:sheet_name>', views_node_migrated.data_sheet),
    path('api/events', views_node_migrated.events),
    path('api/all-proposed-calendar', views_node_migrated.all_proposed_calendar),
    path('api/events/propose', views_node_migrated.events_propose),
    path('api/proposed-events', views_node_migrated.proposed_events),
    path('api/proposed-events/<int:row_index>', views_node_migrated.proposed_events),
    path('api/auth/club-login', views_node_migrated.club_login),
    path('api/clubs/credentials', views_node_migrated.clubs_credentials),
    path('api/all-credentials', views_node_migrated.all_credentials),
    path('api/club-details', views_node_migrated.club_details),
    path('api/department-details', views_node_migrated.department_details),
    path('api/professional-details', views_node_migrated.professional_details),
    path('api/community-details', views_node_migrated.community_details),
    path('api/clubs/update-budget', views_node_migrated.update_budget),
    path('api/event-publication', views_node_migrated.event_publication),
    path('api/event-publication/<str:login_id>', views_node_migrated.event_publication),
    path('api/auth/signup', views_node_migrated.auth_signup),
    path('api/auth/login', views_node_migrated.auth_login),
    path('api/approval-forms', views_node_migrated.approval_forms),
    path('api/approval-forms/submit', views_node_migrated.approval_forms_submit),
    path('api/update-master-status', views_node_migrated.update_master_status),
    path('api/propose-new-event', views_node_migrated.propose_new_event),
    path('api/past-events', views_node_migrated.past_events),
    path('api/update-activity-id', views_node_migrated.update_activity_id),
    path('api/cache/clear', views_node_migrated.cache_clear),
    path('api/auth/change-password', views_node_migrated.change_password),
]

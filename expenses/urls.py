from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'statements', views.StatementViewSet, basename='statement')
router.register(r'transactions', views.TransactionViewSet, basename='transaction')
router.register(r'categories', views.CategoryViewSet, basename='category')
router.register(r'accounts', views.AccountViewSet, basename='account')  # ← Add this

urlpatterns = [
    # Authentication
    path('auth/register/', views.UserRegistrationView.as_view(), name='register'),
    path('auth/login/', views.UserLoginView.as_view(), name='login'),
    path('auth/profile/', views.UserProfileView.as_view(), name='profile'),
    path('auth/password-reset/', views.password_reset_request, name='password_reset'),
    path('auth/password-reset-confirm/', views.password_reset_confirm, name='password_reset_confirm'),
    
    # Dashboard & Analytics
    path('dashboard/summary/', views.dashboard_summary, name='dashboard_summary'),
    path('dashboard/category-breakdown/', views.category_breakdown, name='category_breakdown'),
    path('dashboard/top-categories/', views.top_categories, name='top_categories'),
    path('dashboard/spending-trend/', views.spending_trend, name='spending_trend'),
    path('dashboard/spending-by-weekday/', views.spending_by_weekday, name='spending_by_weekday'),
    path('dashboard/recommendations/', views.ai_recommendations, name='ai_recommendations'),
    
    # Router URLs
    path('', include(router.urls)),
]

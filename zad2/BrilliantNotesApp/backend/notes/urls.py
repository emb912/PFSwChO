from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import NoteViewSet
from .auth_views import RegisterView, LoginView

router = DefaultRouter()
router.register(r"notes", NoteViewSet, basename="notes")

urlpatterns = [
    path("auth/register/", RegisterView.as_view()),
    path("auth/login/", LoginView.as_view()),
    path("", include(router.urls)),
]

# URLs de la API para Django REST Framework
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    UsuarioViewSet, ConvocatoriaViewSet, ExpedienteCvViewSet,
    PostulacionViewSet, OfertaLaboralViewSet,
    EvaluacionClaseViewSet, ResolucionFinalViewSet,
    LoginView, RegistroPostulanteView
)

router = DefaultRouter()

# Rutas para los endpoints
router.register(r'usuarios', UsuarioViewSet)
router.register(r'convocatorias', ConvocatoriaViewSet)
router.register(r'expedientes', ExpedienteCvViewSet)
router.register(r'postulaciones', PostulacionViewSet)
router.register(r'ofertas', OfertaLaboralViewSet)
router.register(r'evaluaciones', EvaluacionClaseViewSet)
router.register(r'resoluciones', ResolucionFinalViewSet)

# URL patterns
urlpatterns = [
    path('auth/login/', LoginView.as_view(), name='auth_login'),
    path('auth/registro/', RegistroPostulanteView.as_view(), name='auth_registro'),
    path('', include(router.urls)),
]

# Vistas para la API de Django con DRF
from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from django.utils import timezone
from django.db.models import Q
from .models import (
    Usuario, Convocatoria, ExpedienteCv, Postulacion, 
    OfertaLaboral, EvaluacionClase, ResolucionFinal
)
from .serializers import (
    UsuarioSerializer, ConvocatoriaSerializer, ExpedienteCvSerializer,
    PostulacionSerializer, OfertaLaboralSerializer, 
    EvaluacionClaseSerializer, ResolucionFinalSerializer
)

# Autenticacion institucional y de postulantes
class LoginView(APIView):
    def post(self, request):
        identificacion = request.data.get('identificacion', '').strip()
        contrasenia = request.data.get('contrasenia', '').strip()
        
        if not identificacion or not contrasenia:
            return Response(
                {'error': 'Por favor ingresa tu usuario, cédula o correo y la contraseña.'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Buscar por username, cedula o email (case insensitive)
        usuario = Usuario.objects.filter(
            Q(username__iexact=identificacion) |
            Q(cedula=identificacion) |
            Q(email__iexact=identificacion)
        ).first()
        
        if not usuario or not usuario.check_password(contrasenia):
            return Response(
                {'error': 'Credenciales no válidas. Revisa tus datos o contraseña.'},
                status=status.HTTP_401_UNAUTHORIZED
            )
            
        if not usuario.is_active:
            return Response(
                {'error': 'Esta cuenta se encuentra inactiva. Contacta al administrador.'},
                status=status.HTTP_403_FORBIDDEN
            )
            
        # Determinar nombre a mostrar: si es institucional mostrar solo cargo, si es postulante mostrar nombre
        if usuario.rol == 'POSTULANTE':
            nombre_mostrar = f"{usuario.first_name} {usuario.last_name}".strip() or usuario.username
        else:
            nombre_mostrar = usuario.first_name or usuario.get_rol_display()
            
        avatar_iniciales = ''.join([part[0].upper() for part in nombre_mostrar.split()[:2]]) or usuario.username[:2].upper()
        
        datos_sesion = {
            'id': str(usuario.id),
            'username': usuario.username,
            'nombres': usuario.first_name,
            'apellidos': usuario.last_name,
            'nombre': nombre_mostrar,
            'correo': usuario.email,
            'cedula': usuario.cedula,
            'telefono': usuario.telefono or '',
            'rol': usuario.rol,
            'rolEtiqueta': usuario.get_rol_display(),
            'nombreRol': usuario.get_rol_display(),
            'departamento': usuario.departamento or '',
            'avatarIniciales': avatar_iniciales,
            'token': f'token-jwt-{usuario.id}-{usuario.username}'
        }
        
        return Response(datos_sesion, status=status.HTTP_200_OK)


# Registro de nuevos postulantes
class RegistroPostulanteView(APIView):
    def post(self, request):
        nombres = request.data.get('nombres', '').strip()
        apellidos = request.data.get('apellidos', '').strip()
        cedula = request.data.get('cedula', '').strip()
        correo = request.data.get('correo', '').strip().lower()
        telefono = request.data.get('telefono', '').strip()
        contrasenia = request.data.get('contrasenia', '').strip()
        
        if not nombres or not apellidos or not cedula or not correo or not contrasenia:
            return Response(
                {'error': 'Todos los campos obligatorios deben ser completados.'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        if len(cedula) != 10 or not cedula.isdigit():
            return Response(
                {'error': 'La cédula debe contener exactamente 10 dígitos numéricos.'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        if len(contrasenia) < 6:
            return Response(
                {'error': 'La contraseña debe contener al menos 6 caracteres.'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        if Usuario.objects.filter(cedula=cedula).exists():
            return Response(
                {'error': f'Ya existe una cuenta registrada con la cédula {cedula}.'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        if Usuario.objects.filter(email__iexact=correo).exists():
            return Response(
                {'error': f'Ya existe una cuenta registrada con el correo {correo}.'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Generar username a partir del nombre
        username_base = f"{nombres.split()[0].lower()}.{apellidos.split()[0].lower()}"
        username = username_base
        contador = 1
        while Usuario.objects.filter(username=username).exists():
            username = f"{username_base}{contador}"
            contador += 1
            
        usuario = Usuario(
            username=username,
            first_name=nombres,
            last_name=apellidos,
            email=correo,
            cedula=cedula,
            telefono=telefono,
            rol='POSTULANTE',
            departamento='Postulante Externo'
        )
        usuario.set_password(contrasenia)
        usuario.save()
        
        nombre_mostrar = f"{nombres} {apellidos}".strip()
        avatar_iniciales = ''.join([part[0].upper() for part in nombre_mostrar.split()[:2]]) or 'PO'
        
        datos_sesion = {
            'id': str(usuario.id),
            'username': usuario.username,
            'nombres': usuario.first_name,
            'apellidos': usuario.last_name,
            'nombre': nombre_mostrar,
            'correo': usuario.email,
            'cedula': usuario.cedula,
            'telefono': usuario.telefono,
            'rol': usuario.rol,
            'rolEtiqueta': usuario.get_rol_display(),
            'nombreRol': usuario.get_rol_display(),
            'departamento': usuario.departamento,
            'avatarIniciales': avatar_iniciales,
            'token': f'token-jwt-{usuario.id}-{usuario.username}',
            'mensaje': 'Cuenta de postulante creada exitosamente.'
        }
        
        return Response(datos_sesion, status=status.HTTP_201_CREATED)


# Usuarios
class UsuarioViewSet(viewsets.ModelViewSet):
    queryset = Usuario.objects.all().order_by('-date_joined')
    serializer_class = UsuarioSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        rol = self.request.query_params.get('rol')
        if rol:
            queryset = queryset.filter(rol=rol)
        return queryset

# Convocatorias
class ConvocatoriaViewSet(viewsets.ModelViewSet):
    queryset = Convocatoria.objects.all()
    serializer_class = ConvocatoriaSerializer

# Archivos de CV
class ExpedienteCvViewSet(viewsets.ModelViewSet):
    queryset = ExpedienteCv.objects.all()
    serializer_class = ExpedienteCvSerializer

# Postulaciones
class PostulacionViewSet(viewsets.ModelViewSet):
    queryset = Postulacion.objects.all().select_related('usuario', 'convocatoria', 'expediente_cv').order_by('-fecha_postulacion')
    serializer_class = PostulacionSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        usuario_id = self.request.query_params.get('usuario')
        cedula = self.request.query_params.get('cedula')
        convocatoria_id = self.request.query_params.get('convocatoria')
        estado = self.request.query_params.get('estado')
        if usuario_id:
            queryset = queryset.filter(usuario_id=usuario_id)
        if cedula:
            queryset = queryset.filter(usuario__cedula=cedula)
        if convocatoria_id:
            queryset = queryset.filter(convocatoria_id=convocatoria_id)
        if estado:
            queryset = queryset.filter(estado=estado)
        return queryset

    @action(detail=True, methods=['post', 'patch'])
    def evaluar(self, request, pk=None):
        postulacion = self.get_object()
        criterios = request.data.get('criterios', [0, 0, 0, 0, 0])
        promedio = request.data.get('promedio', 0.0)
        observaciones = request.data.get('observaciones', '')
        evaluador_id = request.data.get('evaluador_id')
        rol_evaluador = request.data.get('rol_evaluador')
        
        evaluador_obj = None
        if evaluador_id:
            try:
                evaluador_obj = Usuario.objects.filter(id=evaluador_id).first()
                if evaluador_obj and not rol_evaluador:
                    rol_evaluador = evaluador_obj.rol
            except Exception:
                pass
                
        if not rol_evaluador:
            rol_evaluador = 'VICERRECTORADO'
        
        evaluacion, _ = EvaluacionClase.objects.get_or_create(
            postulacion=postulacion,
            rol_evaluador=rol_evaluador,
            defaults={
                'tema_asignado': f"Clase Demostrativa: {postulacion.convocatoria.titulo}",
                'asignatura': postulacion.convocatoria.carrera,
                'laboratorio': "Campus Matriz Loja",
                'fecha_hora': timezone.now()
            }
        )
        
        if isinstance(criterios, list) and len(criterios) >= 5:
            evaluacion.criterio_dominio_tecnico = int(criterios[0] or 0)
            evaluacion.criterio_metodologia = int(criterios[1] or 0)
            evaluacion.criterio_comunicacion = int(criterios[2] or 0)
            evaluacion.criterio_innovacion = int(criterios[3] or 0)
            evaluacion.criterio_manejo_grupo = int(criterios[4] or 0)
        
        evaluacion.promedio_clase = promedio
        evaluacion.observaciones = observaciones
        if evaluador_obj:
            evaluacion.evaluador = evaluador_obj
        evaluacion.save()
        
        # Calcular el promedio de oposicion general entre TODOS los roles que evaluaron al candidato
        evaluaciones = postulacion.evaluaciones_clase.all()
        promedios = [float(e.promedio_clase) for e in evaluaciones if e.promedio_clase is not None]
        promedio_general = round(sum(promedios) / len(promedios), 1) if promedios else float(promedio)

        # Actualizar etapa en la postulacion
        postulacion.etapa_actual = 5
        postulacion.save()

        # Actualizar o registrar en ResolucionFinal para el ranking institucional
        resolucion, _ = ResolucionFinal.objects.get_or_create(
            postulacion=postulacion,
            defaults={
                'resolucion_numero': f"RES-ISTS-2026-{postulacion.id:03d}",
                'puntaje_entrevista': 90.0,
            }
        )
        nota_meritos = float(postulacion.puntaje_meritos or 75.0)
        nota_entrevista = float(resolucion.puntaje_entrevista or 90.0)
        # Ponderacion oficial ISTS: Meritos 20%, Clase 50%, Entrevista 30%
        resolucion.puntaje_final_ponderado = round((nota_meritos * 0.2) + (promedio_general * 0.5) + (nota_entrevista * 0.3), 1)
        resolucion.save()
        
        return Response({
            'mensaje': f'Evaluación guardada exitosamente para el rol {rol_evaluador}.',
            'promedio_rol': promedio,
            'promedio_general': promedio_general,
            'postulacion': PostulacionSerializer(postulacion, context={'request': request}).data
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post', 'delete'])
    def gestionar_expediente(self, request, pk=None):
        postulacion = self.get_object()
        if request.method == 'DELETE':
            postulacion.expediente_cv = None
            postulacion.save()
            return Response({'mensaje': 'Expediente digital eliminado correctamente.'}, status=status.HTTP_200_OK)
            
        expediente_id = request.data.get('expediente_id')
        if expediente_id:
            try:
                nuevo_exp = ExpedienteCv.objects.get(id=expediente_id)
                postulacion.expediente_cv = nuevo_exp
                postulacion.save()
                return Response({
                    'mensaje': 'Expediente digital actualizado exitosamente.',
                    'postulacion': PostulacionSerializer(postulacion, context={'request': request}).data
                }, status=status.HTTP_200_OK)
            except ExpedienteCv.DoesNotExist:
                return Response({'error': 'Expediente no encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        return Response({'error': 'Debes enviar el expediente_id.'}, status=status.HTTP_400_BAD_REQUEST)

# Ofertas laborales
class OfertaLaboralViewSet(viewsets.ModelViewSet):
    queryset = OfertaLaboral.objects.all()
    serializer_class = OfertaLaboralSerializer

# Evaluaciones de clase demostrativa
class EvaluacionClaseViewSet(viewsets.ModelViewSet):
    queryset = EvaluacionClase.objects.all()
    serializer_class = EvaluacionClaseSerializer

# Resolucion final y ranking
class ResolucionFinalViewSet(viewsets.ModelViewSet):
    queryset = ResolucionFinal.objects.all()
    serializer_class = ResolucionFinalSerializer

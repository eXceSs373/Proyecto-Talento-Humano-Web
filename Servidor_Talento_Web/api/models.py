import uuid
from datetime import timedelta
from django.db import models
from django.utils import timezone
from django.contrib.auth.models import AbstractUser

# Usuario y Postulante
class Usuario(AbstractUser):
    ROLES = [
        ('ADMIN_TECNICO', 'Administrador Técnico'),
        ('TALENTO_HUMANO', 'Dirección de Talento Humano'),
        ('POSTULANTE', 'Postulante Concursante'),
        ('RECTORADO', 'Rectorado'),
        ('VICERRECTORADO', 'Vicerrectorado Académico'),
        ('BIENESTAR', 'Bienestar Estudiantil'),
        ('COORDINADOR', 'Coordinación de Carrera'),
    ]
    cedula = models.CharField(max_length=10, unique=True)
    telefono = models.CharField(max_length=15, blank=True, null=True)
    rol = models.CharField(max_length=20, choices=ROLES, default='POSTULANTE')
    departamento = models.CharField(max_length=100, blank=True, null=True)

# Vacantes de convocatorias para docentes y personal administrativo
class Convocatoria(models.Model):
    codigo = models.CharField(max_length=20, unique=True)
    titulo = models.CharField(max_length=200)
    carrera = models.CharField(max_length=150)
    area = models.CharField(max_length=50)
    modalidad = models.CharField(max_length=30, default='Presencial')
    jornada = models.CharField(max_length=50, default='Tiempo Completo')
    nivel = models.CharField(max_length=100, default='Docente Titular Auxiliar')
    descripcion_corta = models.TextField()
    tags = models.JSONField(default=list) 
    activa = models.BooleanField(default=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

# Archivo de CV del postulante
class ExpedienteCv(models.Model):
    uuid_archivo = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    nombre_archivo = models.CharField(max_length=255)
    nombre_original = models.CharField(max_length=255)
    archivo_pdf = models.FileField(upload_to='cvs/', null=True, blank=True)
    tamanio = models.CharField(max_length=20, default='2.4 MB')
    fecha_subida = models.DateTimeField(auto_now_add=True)
    fecha_caducidad = models.DateTimeField(blank=True, null=True)
    estado = models.CharField(max_length=20, default='Activo')
    
    def save(self, *args, **kwargs):
        if not self.fecha_caducidad:
            self.fecha_caducidad = timezone.now() + timedelta(days=90)
        super().save(*args, **kwargs)

# Postulacion a Convocatoria
class Postulacion(models.Model):
    ESTADOS = [
        ('Recibida', 'Recibida'),
        ('En revisión', 'En revisión'),
        ('Preseleccionada', 'Preseleccionada'),
        ('Rechazada', 'Rechazada'),
    ]
    numero_tramite = models.CharField(max_length=30, unique=True, blank=True)
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, related_name='postulaciones')
    convocatoria = models.ForeignKey(Convocatoria, on_delete=models.CASCADE, related_name='postulaciones')
    expediente_cv = models.OneToOneField(ExpedienteCv, on_delete=models.SET_NULL, null=True, blank=True)
    
    titulo_profesional = models.CharField(max_length=150)
    institucion_titulo = models.CharField(max_length=150, blank=True, default='ISTS / Registrado')
    anios_experiencia_docente = models.IntegerField(default=0)
    anios_experiencia_profesional = models.IntegerField(default=0)
    enlace_senescyt = models.URLField(blank=True, null=True)
    
    etapa_actual = models.IntegerField(default=2)
    estado = models.CharField(max_length=30, choices=ESTADOS, default='Recibida')
    puntaje_meritos = models.DecimalField(max_digits=5, decimal_places=2, default=0.0)
    fecha_postulacion = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.numero_tramite:
            import random
            anio = timezone.now().year
            rand_num = random.randint(1000, 9999)
            self.numero_tramite = f"ISTS-POST-{anio}-{rand_num}"
        if not self.institucion_titulo:
            self.institucion_titulo = "ISTS / Registrado"
        super().save(*args, **kwargs)

# Oferta Laboral
class OfertaLaboral(models.Model):
    postulacion = models.OneToOneField(Postulacion, on_delete=models.CASCADE, related_name='oferta_laboral')
    cargo = models.CharField(max_length=150)
    remuneracion_mensual = models.DecimalField(max_digits=8, decimal_places=2, default=1450.00)
    jornada = models.CharField(max_length=100)
    fecha_inicio = models.DateField()
    fecha_limite_respuesta = models.DateField()
    estado_respuesta = models.CharField(max_length=20, default='Pendiente')
    beneficios = models.JSONField(default=list)
    observaciones = models.TextField(blank=True, null=True)

# Clase demostrativa y evaluacion de clase
class EvaluacionClase(models.Model):
    postulacion = models.OneToOneField(Postulacion, on_delete=models.CASCADE, related_name='evaluacion_clase')
    tema_asignado = models.CharField(max_length=255)
    asignatura = models.CharField(max_length=150)
    laboratorio = models.CharField(max_length=100)
    fecha_hora = models.DateTimeField()
    
    # Criterios de evaluacion
    criterio_dominio_tecnico = models.IntegerField(default=0)
    criterio_metodologia = models.IntegerField(default=0)
    criterio_comunicacion = models.IntegerField(default=0)
    criterio_innovacion = models.IntegerField(default=0)
    criterio_manejo_grupo = models.IntegerField(default=0)
    
    promedio_clase = models.DecimalField(max_digits=5, decimal_places=2, default=0.0)
    observaciones = models.TextField(blank=True, null=True)
    evaluador = models.ForeignKey(Usuario, on_delete=models.SET_NULL, null=True, related_name='evaluaciones_realizadas')

# Ranking
class ResolucionFinal(models.Model):
    postulacion = models.OneToOneField(Postulacion, on_delete=models.CASCADE, related_name='resolucion_final')
    posicion = models.IntegerField(default=1)
    puntaje_entrevista = models.DecimalField(max_digits=5, decimal_places=2, default=0.0)
    puntaje_final_ponderado = models.DecimalField(max_digits=5, decimal_places=2, default=0.0)
    resolucion_numero = models.CharField(max_length=100)
    estado_contratacion = models.CharField(max_length=50, default='Seleccionado')
    fecha_resolucion = models.DateField(auto_now_add=True)

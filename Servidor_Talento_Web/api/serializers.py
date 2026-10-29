# Para traducir los modelos a JSON y viceversa con Angular
from rest_framework import serializers
from .models import (
    Usuario, Convocatoria, ExpedienteCv, Postulacion, 
    OfertaLaboral, EvaluacionClase, ResolucionFinal
)

class UsuarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Usuario
        # Para no enviar la contrasenia
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'cedula', 'telefono', 'rol', 'departamento', 'date_joined', 'is_active']

class ConvocatoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Convocatoria
        fields = '__all__'

class ExpedienteCvSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExpedienteCv
        fields = '__all__'

class OfertaLaboralSerializer(serializers.ModelSerializer):
    class Meta:
        model = OfertaLaboral
        fields = '__all__'

class EvaluacionClaseSerializer(serializers.ModelSerializer):
    class Meta:
        model = EvaluacionClase
        fields = '__all__'

class ResolucionFinalSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResolucionFinal
        fields = '__all__'

class PostulacionSerializer(serializers.ModelSerializer):
    numero_tramite = serializers.CharField(required=False, allow_blank=True)
    institucion_titulo = serializers.CharField(required=False, allow_blank=True, default='ISTS / Registrado')
    usuario_nombre = serializers.SerializerMethodField()
    convocatoria_titulo = serializers.CharField(source='convocatoria.titulo', read_only=True)
    convocatoria_carrera = serializers.CharField(source='convocatoria.carrera', read_only=True)
    convocatoria_area = serializers.CharField(source='convocatoria.area', read_only=True)
    convocatoria_modalidad = serializers.CharField(source='convocatoria.modalidad', read_only=True)
    convocatoria_jornada = serializers.CharField(source='convocatoria.jornada', read_only=True)
    convocatoria_campus = serializers.SerializerMethodField()
    usuario_cedula = serializers.CharField(source='usuario.cedula', read_only=True)
    usuario_correo = serializers.CharField(source='usuario.email', read_only=True)
    usuario_telefono = serializers.CharField(source='usuario.telefono', read_only=True)
    usuario_nombres = serializers.CharField(source='usuario.first_name', read_only=True)
    usuario_apellidos = serializers.CharField(source='usuario.last_name', read_only=True)
    
    expediente_uuid = serializers.CharField(source='expediente_cv.uuid_archivo', read_only=True)
    expediente_nombre = serializers.CharField(source='expediente_cv.nombre_archivo', read_only=True)
    expediente_original = serializers.CharField(source='expediente_cv.nombre_original', read_only=True)
    expediente_tamanio = serializers.CharField(source='expediente_cv.tamanio', read_only=True)
    expediente_fecha_subida = serializers.DateTimeField(source='expediente_cv.fecha_subida', read_only=True)
    expediente_fecha_caducidad = serializers.DateTimeField(source='expediente_cv.fecha_caducidad', read_only=True)
    expediente_archivo_url = serializers.SerializerMethodField()
    
    oferta_laboral = serializers.SerializerMethodField()
    evaluacion_clase = serializers.SerializerMethodField()
    resolucion_final = serializers.SerializerMethodField()
    
    def get_usuario_nombre(self, obj):
        if obj.usuario:
            return f"{obj.usuario.first_name} {obj.usuario.last_name}".strip() or obj.usuario.username
        return ""

    def get_expediente_archivo_url(self, obj):
        if obj.expediente_cv and obj.expediente_cv.archivo_pdf:
            return f"http://127.0.0.1:8000{obj.expediente_cv.archivo_pdf.url}"
        return None

    def get_convocatoria_campus(self, obj):
        return "Campus Matriz Loja"

    def get_oferta_laboral(self, obj):
        if hasattr(obj, 'oferta_laboral') and obj.oferta_laboral:
            return OfertaLaboralSerializer(obj.oferta_laboral).data
        return None

    def get_evaluacion_clase(self, obj):
        if hasattr(obj, 'evaluacion_clase') and obj.evaluacion_clase:
            return EvaluacionClaseSerializer(obj.evaluacion_clase).data
        return None

    def get_resolucion_final(self, obj):
        if hasattr(obj, 'resolucion_final') and obj.resolucion_final:
            return ResolucionFinalSerializer(obj.resolucion_final).data
        return None
    
    class Meta:
        model = Postulacion
        fields = '__all__'

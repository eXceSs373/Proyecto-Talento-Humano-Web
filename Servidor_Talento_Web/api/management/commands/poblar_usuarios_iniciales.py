from datetime import timedelta
from django.utils import timezone
from django.core.management.base import BaseCommand
from api.models import Usuario, Convocatoria, Postulacion, ExpedienteCv

class Command(BaseCommand):
    help = 'Puebla los 6 roles institucionales y los 3 postulantes iniciales en la base de datos'

    def handle(self, *args, **kwargs):
        usuarios_data = [
            # 6 Roles Institucionales (solo cargo visible, sin apellidos)
            {
                'username': 'admin',
                'first_name': 'Administrador Técnico',
                'last_name': '',
                'email': 'admin@ists.edu.ec',
                'cedula': '1100000001',
                'telefono': '0990000001',
                'rol': 'ADMIN_TECNICO',
                'departamento': 'Unidad de Tecnologías de Información',
                'is_staff': True,
                'is_superuser': True,
            },
            {
                'username': 'talentohumano',
                'first_name': 'Talento Humano',
                'last_name': '',
                'email': 'talento.humano@ists.edu.ec',
                'cedula': '1100000002',
                'telefono': '0990000002',
                'rol': 'TALENTO_HUMANO',
                'departamento': 'Dirección de Talento Humano',
                'is_staff': False,
                'is_superuser': False,
            },
            {
                'username': 'rectorado',
                'first_name': 'Rectorado',
                'last_name': '',
                'email': 'rectorado@ists.edu.ec',
                'cedula': '1100000003',
                'telefono': '0990000003',
                'rol': 'RECTORADO',
                'departamento': 'Rectorado y Consejo Directivo',
                'is_staff': False,
                'is_superuser': False,
            },
            {
                'username': 'vicerrectorado',
                'first_name': 'Vicerrectorado Académico',
                'last_name': '',
                'email': 'vicerrectorado@ists.edu.ec',
                'cedula': '1100000004',
                'telefono': '0990000004',
                'rol': 'VICERRECTORADO',
                'departamento': 'Vicerrectorado Académico ISTS',
                'is_staff': False,
                'is_superuser': False,
            },
            {
                'username': 'coordinador',
                'first_name': 'Coordinador de Carrera',
                'last_name': '',
                'email': 'coordinacion@ists.edu.ec',
                'cedula': '1100000005',
                'telefono': '0990000005',
                'rol': 'COORDINADOR',
                'departamento': 'Carrera de Desarrollo de Software',
                'is_staff': False,
                'is_superuser': False,
            },
            {
                'username': 'bienestar',
                'first_name': 'Bienestar Estudiantil',
                'last_name': '',
                'email': 'bienestar@ists.edu.ec',
                'cedula': '1100000006',
                'telefono': '0990000006',
                'rol': 'BIENESTAR',
                'departamento': 'Unidad de Bienestar Estudiantil',
                'is_staff': False,
                'is_superuser': False,
            },

            # 3 Cuentas Iniciales para Postulantes (nombres simples)
            {
                'username': 'juan',
                'first_name': 'Juan',
                'last_name': 'Pérez',
                'email': 'juan.perez@gmail.com',
                'cedula': '1104829101',
                'telefono': '0981112233',
                'rol': 'POSTULANTE',
                'departamento': 'Postulante Externo',
                'is_staff': False,
                'is_superuser': False,
            },
            {
                'username': 'pablo',
                'first_name': 'Pablo',
                'last_name': 'Gómez',
                'email': 'pablo.gomez@gmail.com',
                'cedula': '1104829102',
                'telefono': '0982223344',
                'rol': 'POSTULANTE',
                'departamento': 'Postulante Externo',
                'is_staff': False,
                'is_superuser': False,
            },
            {
                'username': 'maria',
                'first_name': 'María',
                'last_name': 'López',
                'email': 'maria.lopez@gmail.com',
                'cedula': '1104829103',
                'telefono': '0983334455',
                'rol': 'POSTULANTE',
                'departamento': 'Postulante Externo',
                'is_staff': False,
                'is_superuser': False,
            },
        ]

        contrasenia_comun = '123456'
        creados = 0
        actualizados = 0

        for data in usuarios_data:
            username = data.pop('username')
            cedula = data.get('cedula')
            
            # Buscar por username o por cedula
            usuario = Usuario.objects.filter(username=username).first() or Usuario.objects.filter(cedula=cedula).first()
            
            if usuario:
                for key, value in data.items():
                    setattr(usuario, key, value)
                usuario.username = username
                usuario.set_password(contrasenia_comun)
                usuario.save()
                actualizados += 1
                self.stdout.write(self.style.WARNING(f'Usuario actualizado: {username} ({usuario.rol})'))
            else:
                nuevo = Usuario(username=username, **data)
                nuevo.set_password(contrasenia_comun)
                nuevo.save()
                creados += 1
                self.stdout.write(self.style.SUCCESS(f'Usuario creado: {username} ({nuevo.rol})'))

        # Asegurar postulaciones para los 3 postulantes en la convocatoria principal
        convocatoria = Convocatoria.objects.filter(activa=True).first() or Convocatoria.objects.first()
        if not convocatoria:
            convocatoria = Convocatoria.objects.create(
                codigo='CONV-2026-001',
                titulo='Docente de Desarrollo de Software',
                carrera='Desarrollo de Software',
                area='Tecnología',
                modalidad='Presencial',
                jornada='Tiempo Completo',
                nivel='Docente Titular Auxiliar',
                descripcion_corta='Convocatoria pública para la cátedra de Programación Web y Arquitectura de Software.',
                tags=['Tecnología', 'Docencia', 'Software'],
                activa=True
            )

        postulantes_config = [
            {
                'username': 'juan',
                'titulo': 'Ingeniero en Desarrollo de Software',
                'institucion': 'Universidad Nacional de Loja / Registrado Senescyt',
                'anios_doc': 2,
                'anios_prof': 4,
                'estado': 'Recibida',
                'archivo': 'CV_Juan_Perez_Ingenieria.pdf'
            },
            {
                'username': 'pablo',
                'titulo': 'Licenciado en Sistemas de Información',
                'institucion': 'Universidad Técnica Particular de Loja / Registrado Senescyt',
                'anios_doc': 3,
                'anios_prof': 5,
                'estado': 'En revisión',
                'archivo': 'CV_Pablo_Gomez_Sistemas.pdf'
            },
            {
                'username': 'maria',
                'titulo': 'Magíster en Inteligencia Artificial y Datos',
                'institucion': 'Escuela Politécnica Nacional / Registrado Senescyt',
                'anios_doc': 4,
                'anios_prof': 6,
                'estado': 'Preseleccionada',
                'archivo': 'CV_Maria_Lopez_MasterIA.pdf'
            }
        ]

        for p_cfg in postulantes_config:
            u = Usuario.objects.filter(username=p_cfg['username']).first()
            if not u:
                continue

            postulacion = Postulacion.objects.filter(usuario=u).first()
            if not postulacion:
                exp = ExpedienteCv.objects.create(
                    nombre_archivo=f"CV_ISTS_{u.cedula}.pdf",
                    nombre_original=p_cfg['archivo'],
                    tamanio='3.2 MB',
                    fecha_caducidad=timezone.now() + timedelta(days=90),
                    estado='Activo'
                )
                postulacion = Postulacion.objects.create(
                    usuario=u,
                    convocatoria=convocatoria,
                    expediente_cv=exp,
                    titulo_profesional=p_cfg['titulo'],
                    institucion_titulo=p_cfg['institucion'],
                    anios_experiencia_docente=p_cfg['anios_doc'],
                    anios_experiencia_profesional=p_cfg['anios_prof'],
                    etapa_actual=2,
                    estado=p_cfg['estado'],
                    puntaje_meritos=0.0
                )
                self.stdout.write(self.style.SUCCESS(f'Postulación creada para {u.username} en {convocatoria.titulo}'))
            else:
                if not postulacion.expediente_cv:
                    exp = ExpedienteCv.objects.create(
                        nombre_archivo=f"CV_ISTS_{u.cedula}.pdf",
                        nombre_original=p_cfg['archivo'],
                        tamanio='3.2 MB',
                        fecha_caducidad=timezone.now() + timedelta(days=90),
                        estado='Activo'
                    )
                    postulacion.expediente_cv = exp
                    postulacion.save()

        self.stdout.write(self.style.SUCCESS(f'\nTotal procesados: {creados} creados, {actualizados} actualizados con contraseña: "{contrasenia_comun}"'))

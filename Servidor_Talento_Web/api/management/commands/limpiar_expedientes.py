from datetime import timedelta
import os
from django.core.management.base import BaseCommand
from django.utils import timezone
from api.models import ExpedienteCv

class Command(BaseCommand):
    help = 'Revisa y elimina expedientes y archivos de CV que hayan superado su vigencia de conservación (por defecto 90 días).'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dias',
            type=int,
            default=None,
            help='Permite configurar o simular la vigencia (por ejemplo --dias 1 para reducir la caducidad a 1 solo día de prueba).'
        )
        parser.add_argument(
            '--simular-vencimiento',
            action='store_true',
            help='Fuerza la fecha de caducidad de los expedientes al pasado inmediato para probar la depuración automática.'
        )

    def handle(self, *args, **options):
        dias = options['dias']
        simular = options['simular_vencimiento']
        ahora = timezone.now()

        # Si el usuario solicitó simular vencimiento inmediato para pruebas
        if simular:
            self.stdout.write(self.style.WARNING('Simulando vencimiento: ajustando expedientes a fecha ya caducada...'))
            ExpedienteCv.objects.filter(estado='Activo').update(fecha_caducidad=ahora - timedelta(hours=1))

        # Si el usuario desea rebajar la caducidad a N días (ej. 1 día)
        elif dias is not None:
            self.stdout.write(self.style.WARNING(f'Ajustando vigencia de expedientes activos a {dias} día(s) para pruebas...'))
            ExpedienteCv.objects.filter(estado='Activo').update(fecha_caducidad=ahora + timedelta(days=dias))

        # Ejecutar depuración de expedientes cuya fecha de caducidad ya venció
        caducados = ExpedienteCv.objects.filter(fecha_caducidad__lte=ahora, estado='Activo')
        total_eliminados = 0

        for exp in caducados:
            nombre = exp.nombre_original or exp.nombre_archivo
            # Eliminar archivo físico si existe en disco
            if exp.archivo_pdf:
                try:
                    if os.path.exists(exp.archivo_pdf.path):
                        os.remove(exp.archivo_pdf.path)
                except Exception as err:
                    self.stdout.write(self.style.ERROR(f'Error al borrar archivo en disco: {err}'))

            # Actualizar estado a Caducado
            exp.estado = 'Caducado'
            exp.save()
            total_eliminados += 1
            self.stdout.write(self.style.SUCCESS(f'Expediente caducado y purgado con éxito: {nombre} (UUID: {exp.uuid_archivo})'))

        if total_eliminados == 0:
            self.stdout.write(self.style.SUCCESS(f'Todos los expedientes se encuentran vigentes. Ningún archivo requirió eliminación.'))
        else:
            self.stdout.write(self.style.SUCCESS(f'Se procesaron y purgaron {total_eliminados} expediente(s) caducado(s).'))

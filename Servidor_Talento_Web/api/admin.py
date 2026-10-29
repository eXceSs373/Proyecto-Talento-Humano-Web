from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import (
    Usuario, Convocatoria, ExpedienteCv, Postulacion, 
    OfertaLaboral, EvaluacionClase, ResolucionFinal
)

admin.site.register(Usuario, UserAdmin)
admin.site.register(Convocatoria)
admin.site.register(ExpedienteCv)
admin.site.register(Postulacion)
admin.site.register(OfertaLaboral)
admin.site.register(EvaluacionClase)
admin.site.register(ResolucionFinal)
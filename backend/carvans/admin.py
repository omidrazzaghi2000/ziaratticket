from django.contrib import admin
from .models import Caravan
# Register your models here.
@admin.register(Caravan)
class CarvanAdmin(admin.ModelAdmin):
    pass

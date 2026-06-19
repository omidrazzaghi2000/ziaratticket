from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

admin.site.site_header = "پنل مدیریت کاروان کربلا"
admin.site.site_title = "کاروان کربلا"
admin.site.index_title = "مدیریت سیستم رزرو کاروان"

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('accounts.urls')),
    path('api/', include('bookings.urls')),
    path('api/', include('carvans.urls')),
    path('api/', include('core.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

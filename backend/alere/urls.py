from django.conf import settings
from django.contrib import admin
import django.shortcuts
from django.template.context_processors import csrf
from django.urls import path, re_path
import django.views
import os

from .views.ledger import LedgerView


STATIC_ROOT = (
    os.path.realpath(os.path.join(settings.BASE_DIR, "../frontend/public"))
)


def static(request):
    p = os.path.join(STATIC_ROOT, request.path[1:])
    if os.path.isfile(p):
        return django.views.static.serve(request, p, document_root='/')
    else:
        return django.views.static.serve(
            request,
            os.path.join(STATIC_ROOT, 'index.html'),
            document_root='/')


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/ledger/<int:id>', LedgerView.as_view()),

    # re_path(r'^.*$', static),
]

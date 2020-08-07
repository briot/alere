from django.conf import settings
from django.contrib import admin
import django.shortcuts
from django.template.context_processors import csrf
from django.urls import path, re_path
import django.views
import os

from .views.accounts import AccountList
from .views.ledger import LedgerView
from .views.networth import NetworthView
from .views.plots import CategoryPlotView


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
    path('api/account/list', AccountList.as_view()),
    path('api/ledger/<str:id>', LedgerView.as_view()),
    path('api/plots/category/<str:expenses>', CategoryPlotView.as_view()),
    path('api/plots/networth', NetworthView.as_view()),

    # re_path(r'^.*$', static),
]

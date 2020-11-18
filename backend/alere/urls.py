from django.conf import settings
from django.http import HttpResponse
from django.template import Template, Context
from django.template.context_processors import csrf
from django.urls import path, re_path
import django.shortcuts
import django.views
import os

from .views.accounts import AccountList
from .views.importers import ImportKmymoney
from .views.ledger import LedgerView
from .views.means import MeanView
from .views.metrics import MetricsView
from .views.networth import NetworthView
from .views.networth_history import NetworthHistoryView
from .views.plots import CategoryPlotView
from .views.prices import PriceHistory
from .views.quotes import QuotesView


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


def send_csrf(request):
    t = Template("// {% csrf_token %}")
    c = Context(csrf(request))
    print(t.render(c)) # MANU
    return HttpResponse(
        t.render(c),
        content_type='text/javascript',
    )


urlpatterns = [
    # path('admin/', admin.site.urls),
    path('api/account/list', AccountList.as_view()),
    path('api/ledger/<str:ids>', LedgerView.as_view()),
    path('api/prices/<str:accountId>', PriceHistory.as_view()),
    re_path('api/ledger/(<str:id>)?', LedgerView.as_view()),
    path('api/plots/category/<str:expenses>', CategoryPlotView.as_view()),
    path('api/plots/networth', NetworthView.as_view()),
    path('api/networth_history', NetworthHistoryView.as_view()),
    path('api/metrics', MetricsView.as_view()),
    path('api/mean', MeanView.as_view()),
    path('api/quotes', QuotesView.as_view()),
    path('api/import/kmymoney', ImportKmymoney.as_view()),

    # Getting the CSRF token (called from index.html)
    path('api/csrf', send_csrf),
]

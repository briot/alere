from alere.importers.kmymoney import import_kmymoney
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Import a kmymoney file'

    def add_arguments(self, parser):
        parser.add_argument(
            'filename',
            help='kmymoney file to import',
        )

    def handle(self, filename, *args, **kwargs):
        import_kmymoney(filename=filename)


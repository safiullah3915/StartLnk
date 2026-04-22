from django.apps import AppConfig
import logging

logger = logging.getLogger(__name__)


def _enable_sqlite_wal(sender, connection, **kwargs):
    """Enable WAL journal mode for SQLite connections for better concurrency."""
    if connection.vendor == 'sqlite':
        cursor = connection.cursor()
        cursor.execute('PRAGMA journal_mode=WAL;')
        cursor.execute('PRAGMA synchronous=NORMAL;')


class ApiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'api'

    def ready(self):
        """Called when Django starts"""
        # Enable SQLite WAL mode for all new connections â€”
        # this allows concurrent reads while a write is in progress,
        # preventing "database is locked" errors during signup.
        from django.db.backends.signals import connection_created
        connection_created.connect(_enable_sqlite_wal)

        # Import signals
        import api.signals  # noqa


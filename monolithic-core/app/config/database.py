from cassandra.cluster import Cluster
from cassandra.auth import PlainTextAuthProvider
from cassandra.cqlengine import connection, models
from cassandra.cqlengine.management import sync_table
from app.config.settings import settings
import logging
import os

# Suppress CQL schema management warning
os.environ["CQLENG_ALLOW_SCHEMA_MANAGEMENT"] = "1"

logger = logging.getLogger(__name__)

def init_cassandra():
    """Initializes connection to Cassandra and sets up the keyspace."""
    
    keyspace = settings.CASSANDRA_KEYSPACE
    rep_factor = settings.CASSANDRA_REPLICATION_FACTOR

    if settings.CASSANDRA_SECURE_BUNDLE_PATH and settings.CASSANDRA_CLIENT_ID and settings.CASSANDRA_CLIENT_SECRET:
        logger.info(f"Connecting to Astra DB cluster with bundle {settings.CASSANDRA_SECURE_BUNDLE_PATH}")
        cloud_config = {
            'secure_connect_bundle': settings.CASSANDRA_SECURE_BUNDLE_PATH
        }
        auth_provider = PlainTextAuthProvider(settings.CASSANDRA_CLIENT_ID, settings.CASSANDRA_CLIENT_SECRET)
        cluster = Cluster(cloud=cloud_config, auth_provider=auth_provider)
        session = cluster.connect()
        
        # Astra DB requires us to use the keyspace we created in the cloud
        session.set_keyspace(keyspace)
        connection.register_connection('default', session=session, default=True)
        models.DEFAULT_KEYSPACE = keyspace
        logger.info(f"Connected to Astra DB keyspace: {keyspace}")
    else:
        # Split the comma-separated string from .env into a list for the driver
        hosts = [h.strip() for h in settings.CASSANDRA_HOSTS.split(",")]
        
        logger.info(f"Connecting to Cassandra cluster at {hosts}")
        cluster = Cluster(hosts)
        session = cluster.connect()
        
        # Create keyspace if it doesn't exist
        session.execute(f"""
            CREATE KEYSPACE IF NOT EXISTS {keyspace}
            WITH replication = {{ 'class': 'SimpleStrategy', 'replication_factor': '{rep_factor}' }}
        """)
        
        # Setup cqlengine connection
        connection.setup(hosts, keyspace, protocol_version=3)
        logger.info(f"Connected to local Cassandra keyspace: {keyspace}")
    
    # Sync tables (creates them if they don't exist)
    from app.models.tsdb import MonitoringResult, DeviceMetric
    sync_table(MonitoringResult)
    sync_table(DeviceMetric)

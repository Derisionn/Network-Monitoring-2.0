from cassandra.cluster import Cluster
from cassandra.cqlengine import connection
from cassandra.cqlengine.management import sync_table
from app.config.settings import settings
import logging

logger = logging.getLogger(__name__)

def init_cassandra():
    """Initializes connection to Cassandra and sets up the keyspace."""
    
    # Split the comma-separated string from .env into a list for the driver
    hosts = [h.strip() for h in settings.CASSANDRA_HOSTS.split(",")]
    keyspace = settings.CASSANDRA_KEYSPACE
    rep_factor = settings.CASSANDRA_REPLICATION_FACTOR
    
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
    logger.info(f"Connected to Cassandra keyspace: {keyspace}")
    
    # Sync tables (creates them if they don't exist)
    from app.models.tsdb import MonitoringResult, DeviceMetric
    sync_table(MonitoringResult)
    sync_table(DeviceMetric)

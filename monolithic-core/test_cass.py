from cassandra.cqlengine import connection
from cassandra.cluster import Cluster
from app.config.settings import settings
from app.models.tsdb import MonitoringResult
from datetime import datetime, timedelta

cluster = Cluster([h.strip() for h in settings.CASSANDRA_HOSTS.split(',')])
session = cluster.connect(settings.CASSANDRA_KEYSPACE)
connection.register_connection('default', session=session, default=True)

try:
    now = datetime.utcnow()
    start_time = now - timedelta(hours=24)
    results = MonitoringResult.objects(device_id='56c439fa-8768-4494-b5d2-a76cb3554a91', protocol='ICMP').filter(recorded_at__gte=start_time).all()
    print(f'Found {len(results)} results!')
except Exception as e:
    import traceback
    traceback.print_exc()

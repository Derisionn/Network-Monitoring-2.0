from cassandra.cqlengine import columns
from cassandra.cqlengine.models import Model
import datetime
import uuid

class MonitoringResult(Model):
    __table_name__ = 'monitoring_results'
    
    # Partition Key (device and protocol combo)
    device_id = columns.Text(partition_key=True)
    protocol = columns.Text(partition_key=True) # e.g., 'ICMP', 'SNMP'
    
    # Clustering Key (time)
    recorded_at = columns.DateTime(primary_key=True, clustering_order="DESC", default=datetime.datetime.utcnow)
    
    id = columns.UUID(default=uuid.uuid4)
    status = columns.Text() # 'UP' or 'DOWN'
    latency_ms = columns.Float(required=False)
    packet_loss = columns.Float(required=False)
    error_message = columns.Text(required=False)

class DeviceMetric(Model):
    __table_name__ = 'device_metrics'
    
    # Partition Key (device and metric type combo)
    # This allows us to instantly query "All CPU metrics for Device X"
    device_id = columns.Text(partition_key=True)
    metric_name = columns.Text(partition_key=True) # e.g., 'interface_in_mbps', 'cpu_core_utilization'
    
    # Clustering Keys
    sub_entity = columns.Text(primary_key=True) # e.g., 'eth0', 'Core 1', 'RAM'
    recorded_at = columns.DateTime(primary_key=True, clustering_order="DESC", default=datetime.datetime.utcnow)
    
    id = columns.UUID(default=uuid.uuid4)
    metric_value = columns.Double()
    string_value = columns.Text(required=False)

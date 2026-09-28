import datetime
from typing import Optional, Tuple
from app.models.tsdb import MonitoringResult, DeviceMetric

def save_icmp_result(device_id: str, status: str, latency_ms: Optional[float], packet_loss: Optional[float], recorded_at: datetime.datetime):
    MonitoringResult.create(
        device_id=device_id,
        protocol="ICMP",
        status=status,
        latency_ms=latency_ms,
        packet_loss=packet_loss,
        recorded_at=recorded_at
    )

def save_raw_interface_metrics(device_id: str, iface: str, curr_in: float, curr_out: float, recorded_at: datetime.datetime):
    DeviceMetric.create(
        device_id=device_id, metric_name="interface_in_octets",
        sub_entity=iface, metric_value=curr_in, recorded_at=recorded_at
    )
    DeviceMetric.create(
        device_id=device_id, metric_name="interface_out_octets",
        sub_entity=iface, metric_value=curr_out, recorded_at=recorded_at
    )

def get_previous_interface_metrics(device_id: str, iface: str) -> Tuple[Optional[DeviceMetric], Optional[DeviceMetric]]:
    prev_in_record = DeviceMetric.objects(device_id=device_id, metric_name="interface_in_octets", sub_entity=iface).first()
    prev_out_record = DeviceMetric.objects(device_id=device_id, metric_name="interface_out_octets", sub_entity=iface).first()
    return prev_in_record, prev_out_record

def save_calculated_interface_metrics(device_id: str, iface: str, download_mbps: float, upload_mbps: float, utilization: float, status: Optional[str], recorded_at: datetime.datetime):
    DeviceMetric.create(device_id=device_id, metric_name="interface_in_mbps", sub_entity=iface, metric_value=download_mbps, recorded_at=recorded_at)
    DeviceMetric.create(device_id=device_id, metric_name="interface_out_mbps", sub_entity=iface, metric_value=upload_mbps, recorded_at=recorded_at)
    DeviceMetric.create(device_id=device_id, metric_name="interface_utilization_percent", sub_entity=iface, metric_value=utilization, recorded_at=recorded_at)
    
    if status:
        DeviceMetric.create(device_id=device_id, metric_name="interface_status", sub_entity=iface, metric_value=1.0 if status == "UP" else 0.0, string_value=status, recorded_at=recorded_at)

def save_system_metrics(device_id: str, cpu_usage: Optional[float], memory_usage: Optional[float], disk_usage: Optional[float], recorded_at: datetime.datetime):
    if cpu_usage is not None:
        DeviceMetric.create(device_id=device_id, metric_name="cpu_core_utilization", sub_entity="Aggregate", metric_value=cpu_usage, recorded_at=recorded_at)
    if memory_usage is not None:
        DeviceMetric.create(device_id=device_id, metric_name="memory_usage_percent", sub_entity="RAM", metric_value=memory_usage, recorded_at=recorded_at)
    if disk_usage is not None:
        DeviceMetric.create(device_id=device_id, metric_name="storage_usage_percent", sub_entity="Aggregate", metric_value=disk_usage, recorded_at=recorded_at)

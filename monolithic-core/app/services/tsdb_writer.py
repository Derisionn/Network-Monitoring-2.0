import logging
import datetime
import uuid
from app.schemas.telemetry import DeviceTelemetryPayload
from app.models.tsdb import MonitoringResult, DeviceMetric

logger = logging.getLogger(__name__)

def write_telemetry_to_tsdb(payload: DeviceTelemetryPayload):
    """
    TSDB Writer: Writes directly to Cassandra. 
    It relies entirely on the Probe Agent to provide the config limits in the payload!
    """
    try:
        now = datetime.datetime.utcnow()

        # 1. Fetch dynamic bandwidth limit DIRECTLY from the agent's payload! No DB lookup needed!
        bw_limit_mbps = payload.provisioned_bw_mbps
        TOTAL_ILL_BW_BPS = bw_limit_mbps * 1000 * 1000 
        logger.debug(f"[TSDB Writer] Agent reported bandwidth limit {bw_limit_mbps} Mbps for {payload.device_ip}")

        # 2. Save UP/DOWN Ping Status to MonitoringResult
        if payload.ping:
            MonitoringResult.create(
                device_id=payload.device_id,
                protocol="ICMP",
                status=payload.ping.status,
                latency_ms=payload.ping.latency_ms,
                packet_loss=payload.ping.packet_loss_percent,
                timestamp=now
            )
            logger.info(f"[TSDB Writer] Saved MonitoringResult (ICMP) for {payload.device_ip}")

        # 3. Save Interfaces (Bandwidth Math) to DeviceMetric
        if payload.interfaces:
            for iface, metrics in payload.interfaces.items():
                
                # A. Save raw octets for future math
                curr_in = float(metrics.in_octets)
                curr_out = float(metrics.out_octets)
                
                DeviceMetric.create(
                    device_id=payload.device_id, metric_name="interface_in_octets",
                    sub_entity=iface, metric_value=curr_in, timestamp=now
                )
                DeviceMetric.create(
                    device_id=payload.device_id, metric_name="interface_out_octets",
                    sub_entity=iface, metric_value=curr_out, timestamp=now
                )

                # B. Fetch previous octets from Cassandra to do the Math
                prev_in_record = DeviceMetric.objects(device_id=payload.device_id, metric_name="interface_in_octets", sub_entity=iface).first()
                prev_out_record = DeviceMetric.objects(device_id=payload.device_id, metric_name="interface_out_octets", sub_entity=iface).first()

                prev_in = prev_in_record.metric_value if prev_in_record else curr_in
                prev_out = prev_out_record.metric_value if prev_out_record else curr_out
                
                time_diff = 0
                if prev_in_record:
                    time_diff = (now - prev_in_record.timestamp).total_seconds()
                    
                # C. Math logic
                if time_diff <= 0 or curr_in < prev_in or curr_out < prev_out:
                    download_mbps = 0.0
                    upload_mbps = 0.0
                    utilization = 0.0
                else:
                    download_mbps = round(((curr_in - prev_in) * 8 / time_diff / 1000000), 2)
                    upload_mbps = round(((curr_out - prev_out) * 8 / time_diff / 1000000), 2)
                    utilization = round(((curr_in - prev_in) * 8 / time_diff / TOTAL_ILL_BW_BPS * 100), 2)

                # D. Save Calculated Metrics
                DeviceMetric.create(device_id=payload.device_id, metric_name="interface_in_mbps", sub_entity=iface, metric_value=download_mbps, timestamp=now)
                DeviceMetric.create(device_id=payload.device_id, metric_name="interface_out_mbps", sub_entity=iface, metric_value=upload_mbps, timestamp=now)
                DeviceMetric.create(device_id=payload.device_id, metric_name="interface_utilization_percent", sub_entity=iface, metric_value=utilization, timestamp=now)
                
                if metrics.status:
                    DeviceMetric.create(device_id=payload.device_id, metric_name="interface_status", sub_entity=iface, metric_value=1.0 if metrics.status == "UP" else 0.0, string_value=metrics.status, timestamp=now)

            logger.info(f"[TSDB Writer] Saved Bandwidth Metrics for {payload.device_ip}")

        # 3. Save CPU, Memory, Storage to DeviceMetric
        if payload.system:
            sys = payload.system
            if "cpu_usage" in sys:
                DeviceMetric.create(device_id=payload.device_id, metric_name="cpu_core_utilization", sub_entity="Aggregate", metric_value=float(sys["cpu_usage"]), timestamp=now)
            if "memory_usage" in sys:
                DeviceMetric.create(device_id=payload.device_id, metric_name="memory_usage_percent", sub_entity="RAM", metric_value=float(sys["memory_usage"]), timestamp=now)
            if "disk_usage" in sys:
                DeviceMetric.create(device_id=payload.device_id, metric_name="storage_usage_percent", sub_entity="Aggregate", metric_value=float(sys["disk_usage"]), timestamp=now)
                
            logger.info(f"[TSDB Writer] Saved System Metrics for {payload.device_ip}")

    except Exception as e:
        logger.error(f"[TSDB Writer] Error writing to Cassandra: {str(e)}")

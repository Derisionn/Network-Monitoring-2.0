import logging
import datetime
from app.schemas.telemetry import DeviceTelemetryPayload
from app.database import tsdb_writer

logger = logging.getLogger(__name__)

def process_telemetry(payload: DeviceTelemetryPayload):
    """
    Processing Module: Handles business logic and math, then delegates to TSDB Writer.
    """
    try:
        now = datetime.datetime.utcnow()

        # 1. Bandwidth limit directly from payload
        bw_limit_mbps = payload.provisioned_bw_mbps
        TOTAL_ILL_BW_BPS = bw_limit_mbps * 1000 * 1000 
        logger.debug(f"[Processing Module] Agent reported bandwidth limit {bw_limit_mbps} Mbps for {payload.device_ip}")

        # 2. Process ICMP (Ping)
        if payload.ping:
            tsdb_writer.save_icmp_result(
                device_id=payload.device_id,
                status=payload.ping.status,
                latency_ms=payload.ping.latency_ms,
                packet_loss=payload.ping.packet_loss_percent,
                recorded_at=now
            )
            logger.info(f"[Processing Module] Processed ICMP for {payload.device_ip}")

        # 3. Process Interfaces (Bandwidth Math)
        if payload.interfaces:
            for iface, metrics in payload.interfaces.items():
                curr_in = float(metrics.in_octets)
                curr_out = float(metrics.out_octets)
                
                # A. Save raw octets
                tsdb_writer.save_raw_interface_metrics(
                    device_id=payload.device_id,
                    iface=iface,
                    curr_in=curr_in,
                    curr_out=curr_out,
                    recorded_at=now
                )

                # B. Fetch previous octets from database to do the Math
                prev_in_record, prev_out_record = tsdb_writer.get_previous_interface_metrics(
                    device_id=payload.device_id,
                    iface=iface
                )

                prev_in = prev_in_record.metric_value if prev_in_record else curr_in
                prev_out = prev_out_record.metric_value if prev_out_record else curr_out
                
                time_diff = 0
                if prev_in_record:
                    time_diff = (now - prev_in_record.recorded_at).total_seconds()
                    
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
                tsdb_writer.save_calculated_interface_metrics(
                    device_id=payload.device_id,
                    iface=iface,
                    download_mbps=download_mbps,
                    upload_mbps=upload_mbps,
                    utilization=utilization,
                    status=metrics.status,
                    recorded_at=now
                )

            logger.info(f"[Processing Module] Processed Bandwidth Metrics for {payload.device_ip}")

        # 4. Process System Metrics
        if payload.system:
            sys = payload.system
            cpu_usage = float(sys["cpu_usage"]) if "cpu_usage" in sys else None
            memory_usage = float(sys["memory_usage"]) if "memory_usage" in sys else None
            disk_usage = float(sys["disk_usage"]) if "disk_usage" in sys else None
            
            tsdb_writer.save_system_metrics(
                device_id=payload.device_id,
                cpu_usage=cpu_usage,
                memory_usage=memory_usage,
                disk_usage=disk_usage,
                recorded_at=now
            )
            logger.info(f"[Processing Module] Processed System Metrics for {payload.device_ip}")

    except Exception as e:
        logger.error(f"[Processing Module] Error processing telemetry: {str(e)}")

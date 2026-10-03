import datetime
from app.models.tsdb import MonitoringResult, DeviceMetric

import asyncio
import json
import random

def get_uptime_data(device_id: str, hours: int = 24):
    """
    Calculates Uptime % and Total Downtime over a given period.
    Based on SQL blueprint: SUM(UP)/COUNT(*)
    """
    cutoff = datetime.datetime.utcnow() - datetime.timedelta(hours=hours)
    
    # Query Cassandra: Instantly fetches all ICMP results for this specific device
    results = MonitoringResult.objects(
        device_id=device_id,
        protocol="ICMP",
        timestamp__gte=cutoff
    ).all()
    
    total_checks = len(results)
    if total_checks == 0:
        return {"uptime_percent": 100.0, "total_downtime_minutes": 0, "status": "No data"}
        
    up_checks = sum(1 for r in results if r.status == "UP")
    down_checks = total_checks - up_checks
    
    uptime_percent = round((up_checks * 100.0) / total_checks, 2)
    
    # Based on your spec, ICMP ping runs every 60 seconds.
    # Therefore, 1 down_check = 1 minute of downtime.
    total_downtime_minutes = down_checks * 1  
    
    return {
        "device_id": device_id,
        "uptime_percent": uptime_percent,
        "total_downtime_minutes": total_downtime_minutes,
        "total_checks": total_checks
    }

def get_bandwidth_data(device_id: str, interface: str, minutes: int = 60):
    """
    Returns time-series data formatted specifically for React charting libraries (like Recharts).
    """
    cutoff = datetime.datetime.utcnow() - datetime.timedelta(minutes=minutes)
    
    # Query Cassandra: Get all IN speeds for this interface
    in_metrics = DeviceMetric.objects(
        device_id=device_id,
        metric_name="interface_in_mbps",
        sub_entity=interface,
        timestamp__gte=cutoff
    ).all()
    
    # Query Cassandra: Get all OUT speeds for this interface
    out_metrics = DeviceMetric.objects(
        device_id=device_id,
        metric_name="interface_out_mbps",
        sub_entity=interface,
        timestamp__gte=cutoff
    ).all()
    
    # Match timestamps to create a unified chart dataset
    chart_data = {}
    for m in in_metrics:
        ts = m.timestamp.isoformat() + "Z"
        chart_data[ts] = {"time": ts, "in_mbps": round(m.metric_value, 2), "out_mbps": 0.0}
        
    for m in out_metrics:
        ts = m.timestamp.isoformat() + "Z"
        if ts in chart_data:
            chart_data[ts]["out_mbps"] = round(m.metric_value, 2)
        else:
            chart_data[ts] = {"time": ts, "in_mbps": 0.0, "out_mbps": round(m.metric_value, 2)}
            
    # Sort chronologically (oldest first) so the React chart draws left-to-right correctly
    sorted_data = sorted(list(chart_data.values()), key=lambda x: x["time"])
    
    return {
        "device_id": device_id,
        "interface": interface,
        "history": sorted_data
    }

async def stream_device_metrics(device_id: str):
    """
    SSE Generator that yields live CPU/RAM/Disk metrics every 2 seconds.
    """
    
    def fetch_latest_metrics(dev_id: str):
        cpu = DeviceMetric.objects(device_id=dev_id, metric_name="cpu_core_utilization").first()
        mem = DeviceMetric.objects(device_id=dev_id, metric_name="memory_usage_percent").first()
        disk = DeviceMetric.objects(device_id=dev_id, metric_name="storage_usage_percent").first()
        
        from app.models.tsdb import MonitoringResult
        icmp = MonitoringResult.objects(device_id=dev_id, protocol="ICMP").first()
        
        return {
            "cpu_val": cpu.metric_value if cpu else 0,
            "mem_val": mem.metric_value if mem else 0,
            "disk_val": disk.metric_value if disk else 0,
            "latency_val": icmp.latency_ms if icmp and icmp.latency_ms is not None else 0,
            "loss_val": icmp.packet_loss if icmp and icmp.packet_loss is not None else 0
        }

    while True:
        try:
            # Attempt to query real data from Cassandra without blocking the event loop!
            vals = await asyncio.to_thread(fetch_latest_metrics, device_id)
            cpu_val, mem_val, disk_val, latency_val, loss_val = vals["cpu_val"], vals["mem_val"], vals["disk_val"], vals["latency_val"], vals["loss_val"]
        except Exception as e:
            print(f"Cassandra query failed in SSE: {e}")
            cpu_val = 0
            mem_val = 0
            disk_val = 0
            latency_val = 0
            loss_val = 0

        payload = {
            "cpu_usage_percent": round(cpu_val, 2),
            "memory_usage_percent": round(mem_val, 2),
            "storage_usage_percent": round(disk_val, 2),
            "latency_ms": round(latency_val, 2),
            "packet_loss": round(loss_val, 2)
        }
        
        yield f"data: {json.dumps(payload)}\n\n"
        await asyncio.sleep(2)

def get_device_availability(device_id: str):
    """
    Calculates the 24-hour availability timeline and percentage by querying TSDB (Cassandra) MonitoringResults.
    """
    from app.models.tsdb import MonitoringResult
    import uuid
    from datetime import datetime, timedelta
    
    now = datetime.utcnow()
    start_time = now - timedelta(hours=24)
    
    try:
        # Query Cassandra
        results = MonitoringResult.objects(device_id=device_id, protocol="ICMP").filter(recorded_at__gte=start_time).all()
        
        # Initialize 24 hourly buckets
        hourly_status = {}
        for i in range(24):
            hour = (now - timedelta(hours=23 - i)).replace(minute=0, second=0, microsecond=0)
            hourly_status[hour.strftime("%Y-%m-%d %H")] = {"up": 0, "down": 0}
            
        # Aggregate ping results into buckets
        for r in results:
            hour_key = r.recorded_at.strftime("%Y-%m-%d %H")
            if hour_key in hourly_status:
                if r.status == "UP":
                    hourly_status[hour_key]["up"] += 1
                else:
                    hourly_status[hour_key]["down"] += 1
                    
        timeline = []
        total_up = 0
        total_pings = 0
        
        # Evaluate each bucket
        for i in range(24):
            dt = now - timedelta(hours=23 - i)
            hour_key = dt.strftime("%Y-%m-%d %H")
            stats = hourly_status.get(hour_key, {"up": 0, "down": 0})
            
            bucket_status = "NOT_MONITORED"
            if stats["up"] > 0 or stats["down"] > 0:
                total_pings += (stats["up"] + stats["down"])
                total_up += stats["up"]
                
                loss_ratio = stats["down"] / (stats["up"] + stats["down"])
                if loss_ratio == 0:
                    bucket_status = "UP"
                elif loss_ratio > 0.5:
                    bucket_status = "DOWN"
                else:
                    bucket_status = "WARNING"
            
            timeline.append({
                "hour": dt.hour,
                "time_label": dt.strftime("%H:00"),
                "status": bucket_status,
                "up_count": stats["up"],
                "down_count": stats["down"]
            })
                    
        availability_percent = (total_up / total_pings * 100) if total_pings > 0 else None
        
        return {
            "timeline_24h": timeline,
            "availability_24h_percent": round(availability_percent, 1) if availability_percent is not None else None
        }
        
    except Exception as e:
        now = datetime.utcnow()
        fallback_timeline = []
        for i in range(24):
            dt = now - timedelta(hours=23 - i)
            fallback_timeline.append({
                "hour": dt.hour,
                "time_label": dt.strftime("%H:00"),
                "status": "NOT_MONITORED",
                "up_count": 0,
                "down_count": 0
            })
        return {
            "timeline_24h": fallback_timeline,
            "availability_24h_percent": None
        }

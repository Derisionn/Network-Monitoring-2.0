from fastapi import APIRouter
from app.models.tsdb import MonitoringResult, DeviceMetric
import datetime

router = APIRouter()

@router.get("/uptime/{device_id}")
async def get_device_uptime(device_id: str, hours: int = 24):
    """
    Calculates Uptime % and Total Downtime over a given period.
    Based on your SQL blueprint: SUM(UP)/COUNT(*)
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

@router.get("/bandwidth/{device_id}/{interface}")
async def get_device_bandwidth(device_id: str, interface: str, minutes: int = 60):
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

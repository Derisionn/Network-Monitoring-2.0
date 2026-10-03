from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from app.services import query_engine_service as query_service

router = APIRouter()

@router.get("/stream/{device_id}")
async def stream_device_metrics(device_id: str):
    """
    SSE stream for real-time dashboard widgets (CPU, RAM, Disk)
    """
    return StreamingResponse(query_service.stream_device_metrics(device_id), media_type="text/event-stream")

@router.get("/devices/{device_id}/availability")
def get_availability(device_id: str):
    """
    Retrieves the 24-hour historical availability timeline from Cassandra TSDB.
    """
    return query_service.get_device_availability(device_id)

@router.get("/uptime/{device_id}")
async def get_device_uptime(device_id: str, hours: int = 24):
    """
    Calculates Uptime % and Total Downtime over a given period.
    Delegates to the service layer.
    """
    return query_service.get_uptime_data(device_id, hours)

@router.get("/bandwidth/{device_id}/{interface}")
async def get_device_bandwidth(device_id: str, interface: str, minutes: int = 60):
    """
    Returns time-series data formatted specifically for React charting libraries.
    Delegates to the service layer.
    """
    return query_service.get_bandwidth_data(device_id, interface, minutes)

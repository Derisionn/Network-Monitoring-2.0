from fastapi import APIRouter, BackgroundTasks
from app.schemas.telemetry import DeviceTelemetryPayload
from app.services.tsdb_writer import write_telemetry_to_tsdb
import logging

# Configure basic logging for the endpoint
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/ingest")
async def ingest_telemetry(payload: DeviceTelemetryPayload, background_tasks: BackgroundTasks):
    """
    Ingestion Endpoint: Receives telemetry data from Distributed Probe Agents.
    """
    logger.info(f"--- Received telemetry from {payload.device_ip} (ID: {payload.device_id}) ---")
    
    # 1. Instantly offload the database math and writing to the TSDB Writer Background Task
    # This ensures the API responds to the probe agent immediately, mimicking Kafka's speed!
    background_tasks.add_task(write_telemetry_to_tsdb, payload)

    return {
        "status": "success", 
        "message": "Telemetry queued for TSDB writing",
        "device_ip": payload.device_ip
    }

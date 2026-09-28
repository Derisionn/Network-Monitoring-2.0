from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.schemas.telemetry import DeviceTelemetryPayload
from app.services.processing_module import process_telemetry
import logging

# Configure basic logging for the endpoint
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()
security = HTTPBearer()

def verify_agent_token(credentials: HTTPAuthorizationCredentials = Security(security)):
    """
    Gateway Layer: Verifies the probe agent is authorized to send telemetry.
    Matches the 'Bearer <probe_api_key>' sent by publisher.py.
    """
    if not credentials.credentials:
        raise HTTPException(status_code=401, detail="Missing or invalid API Key")
    # TODO: In the future, check if credentials.credentials matches a valid agent key in the DB!
    return credentials.credentials

@router.post("/ingest")
async def ingest_telemetry(
    payload: DeviceTelemetryPayload, 
    background_tasks: BackgroundTasks,
    api_key: str = Depends(verify_agent_token)
):
    """
    Ingestion Endpoint: Receives telemetry data from Distributed Probe Agents.
    """
    logger.info(f"--- Received telemetry from {payload.device_ip} (ID: {payload.device_id}) [Auth: OK] ---")
    
    # 1. Instantly offload the processing and TSDB writing to the Background Task
    # This ensures the API responds to the probe agent immediately, mimicking Kafka's speed!
    background_tasks.add_task(process_telemetry, payload)

    return {
        "status": "success", 
        "message": "Telemetry queued for processing and TSDB writing",
        "device_ip": payload.device_ip
    }

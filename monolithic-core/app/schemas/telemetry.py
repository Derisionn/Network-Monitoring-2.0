from pydantic import BaseModel
from typing import Optional, Dict, Any

class PingMetrics(BaseModel):
    status: str  # 'UP' or 'DOWN'
    latency_ms: Optional[float] = None
    packet_loss_percent: Optional[float] = None

class InterfaceMetrics(BaseModel):
    status: Optional[str] = None # 'UP' or 'DOWN'
    in_octets: int
    out_octets: int

class DeviceTelemetryPayload(BaseModel):
    device_id: str
    device_ip: str
    timestamp: str
    
    # The agent fetches this via long-polling from Metadata Service and sends it with the payload
    provisioned_bw_mbps: Optional[int] = 100 
    
    ping: Optional[PingMetrics] = None
    interfaces: Optional[Dict[str, InterfaceMetrics]] = None
    system: Optional[Dict[str, Any]] = None

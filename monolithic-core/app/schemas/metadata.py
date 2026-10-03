from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime

class ProbeCreate(BaseModel):
    id: str
    name: str
    location: Optional[str] = None
from datetime import datetime

class ProbeResponse(BaseModel):
    id: str
    name: Optional[str] = None
    location: Optional[str] = None
    last_heartbeat: Optional[datetime] = None
    agent_version: str
    is_active: bool
    pending_scan_subnet: Optional[str] = None
    last_scan_results: Optional[Any] = None
    
    class Config:
        from_attributes = True

class DeviceCreate(BaseModel):
    name: str
    ip_address: str
    probe_id: str = "default-agent"
    hardware_category: str
    mac_address: Optional[str] = None
    hardware_model: Optional[str] = None
    location: Optional[str] = None
    protocol_config: Optional[Dict[str, Any]] = None
    supported_protocols: Optional[List[str]] = None

class DeviceResponse(DeviceCreate):
    id: str
    status: str
    os_description: Optional[str] = None
    system_hostname: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    is_deleted: bool
    
    class Config:
        from_attributes = True

class DeviceUpdate(BaseModel):
    os_description: Optional[str] = None
    system_hostname: Optional[str] = None
    location: Optional[str] = None
    mac_address: Optional[str] = None
    discovered_methods: Optional[List[str]] = None
    protocol_config: Optional[Dict[str, Any]] = None

class ProbeScanRequest(BaseModel):
    subnet: str

class ProbeScanResultPayload(BaseModel):
    probe_id: str
    results: list[Dict[str, Any]]

class ProbeMigrateRequest(BaseModel):
    target_probe_id: str

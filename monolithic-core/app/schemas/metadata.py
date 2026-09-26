from pydantic import BaseModel
from typing import Optional

class DeviceCreate(BaseModel):
    name: str
    ip_address: str
    provisioned_bw_mbps: Optional[int] = 100

class DeviceResponse(DeviceCreate):
    id: str
    is_active: bool
    
    class Config:
        from_attributes = True

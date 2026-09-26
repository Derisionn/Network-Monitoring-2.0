from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.config.metadata_db import get_metadata_db
from app.models.metadata import Device
from app.schemas.metadata import DeviceCreate, DeviceResponse
from typing import List

router = APIRouter()

@router.post("/devices", response_model=DeviceResponse)
def register_device(device: DeviceCreate, db: Session = Depends(get_metadata_db)):
    """
    Registers a new device in the Metadata DB.
    """
    db_device = db.query(Device).filter(Device.ip_address == device.ip_address).first()
    if db_device:
        raise HTTPException(status_code=400, detail="Device with this IP already exists.")
        
    new_device = Device(
        name=device.name,
        ip_address=device.ip_address,
        provisioned_bw_mbps=device.provisioned_bw_mbps
    )
    db.add(new_device)
    db.commit()
    db.refresh(new_device)
    return new_device

@router.get("/devices", response_model=List[DeviceResponse])
def get_all_devices(db: Session = Depends(get_metadata_db)):
    """
    Returns all registered devices. (Agents poll this to know what to monitor).
    """
    return db.query(Device).all()

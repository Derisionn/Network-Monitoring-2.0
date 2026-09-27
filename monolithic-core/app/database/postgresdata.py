from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.metadata import Device, Probe
from app.schemas.metadata import DeviceCreate, DeviceUpdate, ProbeCreate
import datetime

def create_device(db: Session, device: DeviceCreate) -> Device:
    # Check if a non-deleted device with this IP already exists
    db_device = db.query(Device).filter(
        Device.ip_address == device.ip_address,
        Device.is_deleted == False
    ).first()
    
    if db_device:
        raise HTTPException(status_code=400, detail="An active device with this IP already exists.")
        
    new_device = Device(
        name=device.name,
        ip_address=device.ip_address,
        probe_id=device.probe_id,
        hardware_category=device.hardware_category,
        mac_address=device.mac_address,
        hardware_model=device.hardware_model,
        location=device.location,
        protocol_config=device.protocol_config
    )
    
    db.add(new_device)
    db.commit()
    db.refresh(new_device)
    return new_device

def get_all_devices(db: Session):
    return db.query(Device).filter(Device.is_deleted == False).all()

def update_device_metadata(db: Session, device_id: str, updates: DeviceUpdate) -> Device:
    db_device = db.query(Device).filter(Device.id == device_id, Device.is_deleted == False).first()
    if not db_device:
        raise HTTPException(status_code=404, detail="Device not found")
        
    if updates.os_description is not None: db_device.os_description = updates.os_description
    if updates.system_hostname is not None: db_device.system_hostname = updates.system_hostname
    if updates.location is not None: db_device.location = updates.location
    if updates.mac_address is not None: db_device.mac_address = updates.mac_address
    
    if updates.discovered_methods is not None:
        # Merge the auto-discovered methods into the protocol_config JSON
        if db_device.protocol_config is None:
            db_device.protocol_config = {}
        
        existing_methods = db_device.protocol_config.get("methods", [])
        # Combine existing and new, keeping unique
        merged_methods = list(set(existing_methods + updates.discovered_methods))
        db_device.protocol_config["methods"] = merged_methods
    
    # Automatically clear the sticky note once metadata is updated!
    db_device.pending_discovery = False
    
    db.commit()
    db.refresh(db_device)
    return db_device

def force_device_discovery(db: Session, device_id: str):
    db_device = db.query(Device).filter(Device.id == device_id, Device.is_deleted == False).first()
    if not db_device:
        raise HTTPException(status_code=404, detail="Device not found")
        
    db_device.pending_discovery = True
    db.commit()
    return {"message": "Discovery scan queued"}

def delete_device(db: Session, device_id: str):
    db_device = db.query(Device).filter(Device.id == device_id, Device.is_deleted == False).first()
    if not db_device:
        raise HTTPException(status_code=404, detail="Device not found")
        
    db.delete(db_device)
    db.commit()
    return {"message": "Device deleted successfully"}

def get_device(db: Session, device_id: str):
    device = db.query(Device).filter(Device.id == device_id, Device.is_deleted == False).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    return device

def get_all_probes(db: Session):
    return db.query(Probe).all()

def get_probe(db: Session, probe_id: str):
    probe = db.query(Probe).filter(Probe.id == probe_id).first()
    if not probe:
        raise HTTPException(status_code=404, detail="Probe not found.")
    return probe

def create_probe(db: Session, probe: ProbeCreate) -> Probe:
    db_probe = db.query(Probe).filter(Probe.id == probe.id).first()
    if db_probe:
        raise HTTPException(status_code=400, detail="A probe with this ID already exists.")
        
    new_probe = Probe(
        id=probe.id,
        name=probe.name,
        location=probe.location
    )
    db.add(new_probe)
    db.commit()
    db.refresh(new_probe)
    return new_probe

def delete_probe(db: Session, probe_id: str):
    probe = db.query(Probe).filter(Probe.id == probe_id).first()
    if not probe:
        raise HTTPException(status_code=404, detail="Probe not found.")
    
    # Check if devices are linked
    devices = db.query(Device).filter(Device.probe_id == probe_id).first()
    if devices:
        raise HTTPException(status_code=400, detail="Cannot delete probe because it has assigned devices. Reassign them first.")
        
    db.delete(probe)
    db.commit()
    return {"message": "Probe deleted successfully"}

def update_probe_heartbeat(db: Session, probe_id: str) -> Probe:
    probe = db.query(Probe).filter(Probe.id == probe_id).first()
    if not probe:
        # Zero Trust Security: Reject unregistered probes immediately
        raise HTTPException(status_code=403, detail="Forbidden: Unregistered probe agent.")
        
    probe.last_heartbeat = datetime.datetime.utcnow()
    db.commit()
    return probe

def get_devices_for_probe(db: Session, probe_id: str):
    return db.query(Device).filter(Device.probe_id == probe_id, Device.is_deleted == False).all()

def request_probe_scan(db: Session, probe_id: str, subnet: str):
    probe = db.query(Probe).filter(Probe.id == probe_id).first()
    if not probe:
        raise HTTPException(status_code=404, detail="Probe not found.")
    probe.pending_scan_subnet = subnet
    # Clear previous results
    probe.last_scan_results = None
    db.commit()
    db.refresh(probe)
    return probe

def submit_probe_scan_results(db: Session, probe_id: str, results: list):
    probe = db.query(Probe).filter(Probe.id == probe_id).first()
    if not probe:
        raise HTTPException(status_code=404, detail="Probe not found.")
    probe.last_scan_results = results
    probe.pending_scan_subnet = None
    db.commit()
    db.refresh(probe)
    return probe

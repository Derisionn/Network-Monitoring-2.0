from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.metadata import Device, Probe
from app.schemas.metadata import DeviceCreate, DeviceUpdate, ProbeCreate
import datetime

def create_device(db: Session, device: DeviceCreate) -> Device:
    # Check if a non-deleted device with this IP already exists
    active_device = db.query(Device).filter(
        Device.ip_address == device.ip_address,
        Device.is_deleted == False
    ).first()
    
    if active_device:
        raise HTTPException(status_code=400, detail="An active device with this IP already exists.")
        
    # Reactivation Logic during Creation!
    if device.mac_address:
        old_device = db.query(Device).filter(
            Device.ip_address == device.ip_address,
            Device.mac_address == device.mac_address,
            Device.is_deleted == True
        ).first()
        
        if old_device:
            # Reactivate the old device
            old_device.is_deleted = False
            old_device.name = device.name
            old_device.probe_id = device.probe_id
            old_device.hardware_category = device.hardware_category
            if device.hardware_model: old_device.hardware_model = device.hardware_model
            if device.location: old_device.location = device.location
            if device.protocol_config: old_device.protocol_config = device.protocol_config
            if device.supported_protocols: old_device.supported_protocols = device.supported_protocols
            
            # Force a deep discovery scan to populate missing SNMP/WMI details!
            old_device.pending_discovery = True
            
            db.commit()
            db.refresh(old_device)
            return old_device

    # If no MAC match or no MAC provided, create a brand new device
    new_device = Device(
        name=device.name,
        ip_address=device.ip_address,
        probe_id=device.probe_id,
        hardware_category=device.hardware_category,
        mac_address=device.mac_address,
        hardware_model=device.hardware_model,
        location=device.location,
        protocol_config=device.protocol_config,
        supported_protocols=device.supported_protocols,
        pending_discovery=True # Force a deep discovery scan for new devices!
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
        
    # Reactivation Logic: Check if we just discovered a MAC address that matches an old soft-deleted device
    if updates.mac_address and not db_device.mac_address:
        old_device = db.query(Device).filter(
            Device.ip_address == db_device.ip_address,
            Device.mac_address == updates.mac_address,
            Device.is_deleted == True
        ).first()
        
        if old_device:
            # Found the old device! Reactivate it.
            old_device.is_deleted = False
            
            # Copy over the new metadata to the old device
            if updates.os_description is not None: old_device.os_description = updates.os_description
            if updates.system_hostname is not None: old_device.system_hostname = updates.system_hostname
            if updates.location is not None: old_device.location = updates.location
            old_device.mac_address = updates.mac_address
            
            if updates.discovered_methods is not None:
                existing = old_device.supported_protocols or []
                old_device.supported_protocols = list(set(existing + updates.discovered_methods))
                
            if updates.protocol_config is not None:
                old_device.protocol_config = updates.protocol_config
                
            old_device.pending_discovery = False
            
            # Delete the temporary new device we had created
            db.delete(db_device)
            db.commit()
            db.refresh(old_device)
            return old_device

    # Standard update for db_device if no merge happened
    if updates.os_description is not None: db_device.os_description = updates.os_description
    if updates.system_hostname is not None: db_device.system_hostname = updates.system_hostname
    if updates.location is not None: db_device.location = updates.location
    if updates.mac_address is not None: db_device.mac_address = updates.mac_address
    
    if updates.discovered_methods is not None:
        # Save auto-discovered methods into supported_protocols (historical record)
        existing_supported = db_device.supported_protocols or []
        # Combine existing and new, keeping unique
        merged_supported = list(set(existing_supported + updates.discovered_methods))
        db_device.supported_protocols = merged_supported
        
    if updates.protocol_config is not None:
        db_device.protocol_config = updates.protocol_config
    
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
        
    db_device.is_deleted = True
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

def migrate_devices_to_probe(db: Session, old_probe_id: str, new_probe_id: str):
    # Verify new probe exists
    new_probe = db.query(Probe).filter(Probe.id == new_probe_id).first()
    if not new_probe:
        raise HTTPException(status_code=404, detail="Target probe not found.")
        
    # Update all devices from old to new
    devices = db.query(Device).filter(Device.probe_id == old_probe_id).all()
    count = len(devices)
    
    for device in devices:
        device.probe_id = new_probe_id
        
    db.commit()
    return {"message": f"Successfully migrated {count} devices", "migrated_count": count}

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

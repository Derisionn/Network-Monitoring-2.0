from fastapi import APIRouter, Depends, Header
from sqlalchemy.orm import Session
from app.config.metadata_db import get_metadata_db
from app.schemas.metadata import DeviceCreate, DeviceResponse, DeviceUpdate, ProbeResponse, ProbeCreate, ProbeScanRequest, ProbeScanResultPayload

from typing import List
import hashlib
import json
import logging

# Import our new database service
from app.database import postgresdata
from app.services import agent_service
import io
import os
import zipfile
from fastapi import Response, HTTPException

router = APIRouter()
logger = logging.getLogger(__name__)

# --- DEVICE APIS ---

@router.post("/devices", response_model=DeviceResponse)
def register_device(device: DeviceCreate, db: Session = Depends(get_metadata_db)):
    """
    Registers a new device by handing it off to the database layer.
    """
    return postgresdata.create_device(db, device)

@router.get("/devices/{device_id}", response_model=DeviceResponse)
def get_device(device_id: str, db: Session = Depends(get_metadata_db)):
    """
    Retrieves a single non-deleted device from the database layer.
    """
    return postgresdata.get_device(db, device_id)

@router.patch("/devices/{device_id}", response_model=DeviceResponse)
def update_device(device_id: str, updates: DeviceUpdate, db: Session = Depends(get_metadata_db)):
    """
    Updates an existing device with Discovery Scan metadata via the database layer.
    """
    return postgresdata.update_device_metadata(db, device_id, updates)

@router.delete("/devices/{device_id}")
def delete_device(device_id: str, db: Session = Depends(get_metadata_db)):
    """
    Soft deletes an existing device.
    """
    return postgresdata.delete_device(db, device_id)

@router.post("/devices/{device_id}/force-discovery")
def force_discovery(device_id: str, db: Session = Depends(get_metadata_db)):
    """
    Triggers a manual deep discovery scan for a specific device.
    """
    return postgresdata.force_device_discovery(db, device_id)

# --- PROBE APIS ---

@router.post("/probes", response_model=ProbeResponse)
def register_probe(probe: ProbeCreate, db: Session = Depends(get_metadata_db)):
    """
    Registers a new probe agent strictly via the frontend dashboard (Zero Trust).
    """
    return postgresdata.create_probe(db, probe)

@router.delete("/probes/{probe_id}")
def delete_probe(probe_id: str, db: Session = Depends(get_metadata_db)):
    """
    Deletes a registered probe agent.
    """
    return postgresdata.delete_probe(db, probe_id)

@router.get("/probes", response_model=list[ProbeResponse])
def get_all_probes(db: Session = Depends(get_metadata_db)):
    """
    Returns all registered probe agents and their health status for the frontend dashboard.
    """
    return postgresdata.get_all_probes(db)

@router.get("/probes/{probe_id}/download")
def download_probe_agent(probe_id: str, backend_url: str, db: Session = Depends(get_metadata_db)):
    """
    Dynamically generates a zip file containing the agent executable and a pre-configured probe_config.json
    """
    # Verify probe exists (throws 404 if not found)
    postgresdata.get_probe(db, probe_id)
    
    # Delegate zip generation to service layer
    zip_buffer = agent_service.generate_agent_package(probe_id, backend_url)
    
    headers = {
        'Content-Disposition': f'attachment; filename="agent-{probe_id}.zip"'
    }
    return Response(content=zip_buffer.getvalue(), media_type="application/zip", headers=headers)

@router.post("/probes/{probe_id}/scan")
def request_probe_scan(probe_id: str, request: ProbeScanRequest, db: Session = Depends(get_metadata_db)):
    """
    Requests a probe agent to scan a local subnet.
    """
    return postgresdata.request_probe_scan(db, probe_id, request.subnet)

@router.post("/probe/scan-results")
def submit_probe_scan_results(payload: ProbeScanResultPayload, db: Session = Depends(get_metadata_db)):
    """
    Endpoint for a probe to submit its scan results.
    """
    return postgresdata.submit_probe_scan_results(db, payload.probe_id, payload.results)

@router.get("/probes/{probe_id}", response_model=ProbeResponse)
def get_probe(probe_id: str, db: Session = Depends(get_metadata_db)):
    """
    Returns details for a specific probe agent.
    """
    return postgresdata.get_probe(db, probe_id)

@router.get("/probes/{probe_id}/devices", response_model=list[DeviceResponse])
def get_devices_by_probe(probe_id: str, db: Session = Depends(get_metadata_db)):
    """
    Returns all devices assigned to a specific probe.
    """
    # Verify probe exists
    postgresdata.get_probe(db, probe_id)
    return postgresdata.get_devices_for_probe(db, probe_id)

@router.get("/probe/config")
def get_probe_config(
    current_version: str = "", 
    x_probe_id: str = Header(default="default-agent"),
    db: Session = Depends(get_metadata_db)
):
    """
    Long-polling endpoint for agents. Returns devices assigned to the requesting probe_id.
    """
    # 1. Strict Heartbeat Validation (No Auto-Registration allowed)
    probe = postgresdata.update_probe_heartbeat(db, x_probe_id)

    # 2. Fetch Assigned Devices
    devices = postgresdata.get_devices_for_probe(db, x_probe_id)
    
    tasks = []
    for d in devices:
        # Default to ICMP and SNMP if not configured, or pull from protocol_config
        methods = ["icmp", "snmp"]
        if d.protocol_config and "methods" in d.protocol_config:
            methods = d.protocol_config["methods"]
            
        task_dict = {
            "device_id": d.id,
            "ip_address": d.ip_address,
            "methods": methods,
            "snmp_version": d.protocol_config.get("snmp_version", "v2c") if d.protocol_config else "v2c",
            "community_string": d.protocol_config.get("community_string", "public") if d.protocol_config else "public"
        }
        
        if getattr(d, 'pending_discovery', False):
            task_dict["force_discovery"] = True
            
        tasks.append(task_dict)
        
    # Create a hash of the current task list to act as a version
    config_str = json.dumps(tasks, sort_keys=True)
    new_version = hashlib.md5(config_str.encode()).hexdigest()
    
    # Bandwidth saver temporarily disabled:
    # if new_version == current_version:
    #     from fastapi import Response
    #     return Response(status_code=304)
    
    return {
        "config_version": new_version,
        "tasks": tasks,
        "pending_scan_subnet": probe.pending_scan_subnet
    }




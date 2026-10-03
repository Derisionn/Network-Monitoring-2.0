import logging
import requests
import subprocess
import platform
import time
from typing import Dict, Any

logger = logging.getLogger(__name__)

def run_diagnostic(task: Dict[str, Any], config: Dict[str, Any]):
    device_id = task.get("device_id")
    ip_address = task.get("ip_address")
    protocol = task.get("pending_diagnostic")
    
    logger.info(f"Running diagnostic probe ({protocol}) for {ip_address}...")
    
    base_url = f"{config.get('central_server_url', config.get('server_url'))}/api/v1/metadata/probe/diagnostic-logs"
    complete_url = f"{config.get('central_server_url', config.get('server_url'))}/api/v1/metadata/probe/diagnostic-complete"
    
    headers = {"Content-Type": "application/json"}
    if "probe_api_key" in config:
        headers["Authorization"] = f"Bearer {config['probe_api_key']}"
        
    def send_log(msg: str):
        try:
            requests.post(base_url, json={"device_id": device_id, "message": msg}, headers=headers, timeout=5)
        except Exception as e:
            logger.error(f"Failed to send diagnostic log: {e}")

    def complete_diagnostic(msg: str):
        try:
            requests.post(complete_url, json={"device_id": device_id, "message": msg}, headers=headers, timeout=5)
        except Exception as e:
            logger.error(f"Failed to complete diagnostic: {e}")

    try:
        if protocol == "icmp":
            cmd = ["ping", "-n", "4", ip_address] if platform.system().lower() == "windows" else ["ping", "-c", "4", ip_address]
        elif protocol == "snmp":
            # Simplified snmpwalk for diagnostic
            community = task.get("community_string", "public")
            version = task.get("snmp_version", "v2c")
            cmd = ["snmpwalk", f"-{version}", "-c", community, ip_address, "system"]
        elif protocol == "http":
            cmd = ["curl", "-I", f"http://{ip_address}"]
        else:
            send_log(f"Diagnostic protocol '{protocol}' is not fully implemented on this agent yet.")
            complete_diagnostic("Diagnostic finished with errors.")
            return

        process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
        
        while True:
            line = process.stdout.readline()
            if not line and process.poll() is not None:
                break
            if line:
                send_log(line.strip())
                
        rc = process.poll()
        complete_diagnostic(f"Process exited with code {rc}.")
        
    except Exception as e:
        logger.error(f"Error running diagnostic {protocol} on {ip_address}: {e}")
        complete_diagnostic(f"Error executing command: {e}")


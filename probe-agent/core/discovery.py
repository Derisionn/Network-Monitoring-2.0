import logging
import requests
from typing import Dict, Any

from monitors.snmp_monitor import discovery_snmp_scan

logger = logging.getLogger(__name__)

import socket
import platform
import subprocess
import re

def check_port(ip: str, port: int, timeout: float = 0.5) -> bool:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(timeout)
            s.connect((ip, port))
        return True
    except (socket.timeout, ConnectionRefusedError, OSError):
        return False

def get_hostname(ip: str) -> str:
    try:
        hostname, _, _ = socket.gethostbyaddr(ip)
        return hostname
    except Exception:
        return ""

def get_mac_address(ip: str) -> str:
    try:
        if platform.system().lower() == "windows":
            output = subprocess.check_output(["arp", "-a", ip], text=True)
            match = re.search(r"([0-9a-fA-F]{2}[:-]){5}([0-9a-fA-F]{2})", output)
            if match:
                return match.group(0).replace('-', ':')
        else:
            output = subprocess.check_output(["arp", "-n", ip], text=True)
            match = re.search(r"([0-9a-fA-F]{2}[:-]){5}([0-9a-fA-F]{2})", output)
            if match:
                return match.group(0)
    except Exception:
        pass
    return ""

def run_discovery(task: Dict[str, Any], config: Dict[str, Any]):
    device_id = task.get("device_id")
    ip_address = task.get("ip_address")
    
    logger.info(f"Running Deep Service Discovery for {ip_address}...")
    
    # 1. SNMP Metadata Scan
    metadata = discovery_snmp_scan(ip_address, task)
    
    # DNS Fallback for Hostname if SNMP failed
    if not metadata.get("system_hostname"):
        hn = get_hostname(ip_address)
        if hn: metadata["system_hostname"] = hn
        
    # ARP Fallback for MAC Address if SNMP failed
    if not metadata.get("mac_address"):
        mac = get_mac_address(ip_address)
        if mac: metadata["mac_address"] = mac
    
    # 2. Port Scanning (Service Discovery)
    discovered_methods = ["icmp"] # ICMP is always assumed UP if it's in the DB
    
    if metadata.get("os_description"): # Only append snmp if we actually got real snmp data
        discovered_methods.append("snmp")
        
    # Check SSH (Linux)
    if check_port(ip_address, 22):
        discovered_methods.append("ssh")
        
    # Check WMI/RPC (Windows)
    if check_port(ip_address, 135) or check_port(ip_address, 445):
        discovered_methods.append("wmi")
        
    # Check HTTP/HTTPS
    if check_port(ip_address, 80) or check_port(ip_address, 443):
        discovered_methods.append("http")
        
    metadata["discovered_methods"] = discovered_methods
    
    url = f"{config.get('central_server_url', config.get('server_url'))}/api/v1/metadata/devices/{device_id}"
    headers = {"Content-Type": "application/json"}
    if "probe_api_key" in config:
        headers["Authorization"] = f"Bearer {config['probe_api_key']}"
        
    try:
        resp = requests.patch(url, json=metadata, headers=headers, timeout=10)
        if resp.status_code == 200:
            logger.info(f"Successfully pushed discovery metadata & methods {discovered_methods} for {ip_address}")
        else:
            logger.warning(f"Failed to push discovery metadata for {ip_address}: {resp.text}")
    except Exception as e:
        logger.error(f"Network error pushing discovery metadata for {ip_address}: {e}")

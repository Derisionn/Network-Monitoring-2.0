import logging
import ipaddress
import concurrent.futures
import requests
import socket
import subprocess
import platform
import re
from typing import Dict, Any

from monitors.icmp_monitor import ping_device
from monitors.snmp_monitor import discovery_snmp_scan

logger = logging.getLogger(__name__)

def get_hostname(ip: str) -> str:
    try:
        hostname, _, _ = socket.gethostbyaddr(ip)
        return hostname
    except Exception:
        return f"Unknown Device ({ip})"

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
    return "00:00:00:00:00:00"

def run_subnet_sweep(subnet: str, config: Dict[str, Any]):
    logger.info(f"Starting Ping Sweep for subnet {subnet}...")
    try:
        network = ipaddress.ip_network(subnet, strict=False)
        hosts = [str(ip) for ip in network.hosts()]
    except Exception as e:
        logger.error(f"Invalid subnet provided for ping sweep ({subnet}): {e}")
        return

    found_devices = []
    
    # Ping all hosts in parallel using 50 worker threads for extreme speed
    with concurrent.futures.ThreadPoolExecutor(max_workers=50) as executor:
        future_to_ip = {executor.submit(ping_device, ip): ip for ip in hosts}
        for future in concurrent.futures.as_completed(future_to_ip):
            ip = future_to_ip[future]
            try:
                res = future.result()
                if res.get("status") == "UP":
                    # 1. Try a quick SNMP probe using the default "public" community string!
                    snmp_metadata = discovery_snmp_scan(ip, {"community_string": "public"})
                    
                    # 2. DNS Fallback for Hostname
                    hostname = snmp_metadata.get("system_hostname")
                    if not hostname or hostname.startswith("Unknown"):
                        hostname = get_hostname(ip)
                        
                    # 3. ARP Fallback for MAC Address
                    mac_address = snmp_metadata.get("mac_address")
                    if not mac_address or mac_address == "00:00:00:00:00:00":
                        mac_address = get_mac_address(ip)
                        
                    os_desc = snmp_metadata.get("os_description", "unknown")
                    
                    found_devices.append({
                        "ip": ip,
                        "hostname": hostname,
                        "type": "Network Device" if "unknown" not in os_desc.lower() else "unknown",
                        "mac": mac_address,
                        "os_description": os_desc
                    })
            except Exception as e:
                pass

    logger.info(f"Ping sweep completed for {subnet}. Found {len(found_devices)} alive devices.")
    
    url = f"{config.get('central_server_url', config.get('server_url'))}/api/v1/metadata/probe/scan-results"
    headers = {"Content-Type": "application/json"}
    if "probe_api_key" in config:
        headers["Authorization"] = f"Bearer {config['probe_api_key']}"
        
    payload = {
        "probe_id": config.get("probe_id"),
        "results": found_devices
    }
    
    try:
        resp = requests.post(url, json=payload, headers=headers, timeout=10)
        if resp.status_code in (200, 204):
            logger.info("Successfully pushed scan results to backend.")
        else:
            logger.error(f"Failed to push scan results: {resp.text}")
    except Exception as e:
        logger.error(f"Network error pushing scan results: {e}")

import logging
import requests
import time
import threading
from typing import Dict, Any

from core.discovery import run_discovery
from core.subnet_sweep import run_subnet_sweep
import core.state
from core.diagnostics import run_diagnostic

logger = logging.getLogger(__name__)

def long_polling_loop(config: Dict[str, Any]):
    logger.info("Starting long-polling configuration loop...")
    url = f"{config.get('central_server_url', config.get('server_url'))}/api/v1/metadata/probe/config"
    headers = {
        "X-Probe-ID": config["probe_id"]
    }
    if "probe_api_key" in config:
        headers["Authorization"] = f"Bearer {config['probe_api_key']}"
    
    while True:
        try:
            params = {"current_version": core.state.CONFIG_VERSION}
            resp = requests.get(url, headers=headers, params=params, timeout=70)
            
            if resp.status_code == 200:
                data = resp.json()
                
                # NEW FEATURE: Check for sticky note (Pending Scan Subnet)
                pending_subnet = data.get("pending_scan_subnet")
                if pending_subnet:
                    if pending_subnet != core.state.CURRENT_PENDING_SUBNET:
                        logger.info(f"Received sticky note for Ping Sweep: {pending_subnet}")
                        core.state.CURRENT_PENDING_SUBNET = pending_subnet
                        threading.Thread(target=run_subnet_sweep, args=(pending_subnet, config), daemon=True).start()
                else:
                    # Backend cleared the sticky note, so wipe our memory so we can run the same subnet again in the future!
                    core.state.CURRENT_PENDING_SUBNET = None
                
                # Check for task list changes
                new_version = data.get("config_version")
                if new_version != core.state.CONFIG_VERSION:
                    logger.info(f"Received new configuration: {new_version}")
                    with core.state.TASKS_LOCK:
                        core.state.CURRENT_TASKS = data.get("tasks", [])
                        core.state.CONFIG_VERSION = new_version
                        
                    for task in core.state.CURRENT_TASKS:
                        device_id = task.get("device_id")
                        
                        # Trigger discovery if it's a new device, OR if the backend manually requested a force_discovery
                        if device_id:
                            is_new = device_id not in core.state.DISCOVERED_DEVICES_CACHE
                            force_discovery = task.get("force_discovery", False)
                            
                            if is_new or force_discovery:
                                core.state.DISCOVERED_DEVICES_CACHE.add(device_id)
                                threading.Thread(target=run_discovery, args=(task, config), daemon=True).start()
                                
                            pending_diag = task.get("pending_diagnostic")
                            if pending_diag:
                                threading.Thread(target=run_diagnostic, args=(task, config), daemon=True).start()
                            
            elif resp.status_code == 304:
                time.sleep(30)
            else:
                logger.error(f"Failed to pull config: {resp.status_code} - {resp.text}")
                time.sleep(10)
                
        except requests.exceptions.Timeout:
            pass
        except Exception as e:
            logger.error(f"Error in long polling loop: {e}")
            time.sleep(10)

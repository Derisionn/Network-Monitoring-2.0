import json
import time
import datetime
import threading
import requests
import logging
from typing import Dict, List, Any
import concurrent.futures
import sqlite3
import random

from monitors.icmp_monitor import ping_device
from monitors.snmp_monitor import fetch_snmp_tree
from monitors.ssh_monitor import poll_ssh
from monitors.wmi_monitor import poll_wmi
from monitors.tcp_monitor import poll_tcp
from monitors.http_monitor import poll_http

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger(__name__)

# Global state to store the current configuration
CURRENT_TASKS: List[Dict[str, Any]] = []
CONFIG_VERSION: str = ""
# Lock to prevent race conditions when updating CURRENT_TASKS
TASKS_LOCK = threading.Lock()
CONFIG_FILE = "probe_config.json"

MAX_WORKERS = 10

def load_config() -> Dict[str, Any]:
    with open(CONFIG_FILE, "r") as f:
        return json.load(f)

def execute_monitor_task(task: Dict[str, Any]) -> List[Dict[str, Any]]:
    ip_address = task.get("ip_address")
    device_id = task.get("device_id")
    methods = [m.lower() for m in task.get("methods", [])]
    
    results = []
    
    try:
        # ICMP Ping
        if "icmp" in methods:
            ping_res = ping_device(ip_address)
            results.append({
                "device_id": device_id,
                "protocol": "ICMP",
                "status": ping_res.get("status"),
                "latency_ms": ping_res.get("latency_ms"),
                "packet_loss": ping_res.get("packet_loss"),
                "error_message": ping_res.get("error_message")
            })

        # SNMP
        if "snmp" in methods:
            snmp_res = fetch_snmp_tree(ip_address, task)
            status = "UP" if "error" not in snmp_res else "DOWN"
            results.append({
                "device_id": device_id,
                "protocol": "SNMP",
                "status": status,
                "metrics": snmp_res if status == "UP" else {},
                "error_message": snmp_res.get("error")
            })

        # SSH
        if "ssh" in methods:
            ssh_res = poll_ssh(ip_address, task)
            status = "UP" if "error" not in ssh_res else "DOWN"
            results.append({
                "device_id": device_id,
                "protocol": "SSH",
                "status": status,
                "metrics": ssh_res if status == "UP" else {},
                "error_message": ssh_res.get("error")
            })

        # WMI
        if "wmi" in methods:
            wmi_res = poll_wmi(ip_address, task)
            status = "UP" if "error" not in wmi_res else "DOWN"
            results.append({
                "device_id": device_id,
                "protocol": "WMI",
                "status": status,
                "metrics": wmi_res if status == "UP" else {},
                "error_message": wmi_res.get("error")
            })

        # TCP
        if "tcp" in methods:
            tcp_res = poll_tcp(ip_address, task)
            status = tcp_res.get("status", "DOWN")
            results.append({
                "device_id": device_id,
                "protocol": "TCP",
                "status": status,
                "latency_ms": tcp_res.get("latency_ms"),
                "error_message": tcp_res.get("error")
            })

        # HTTP
        if "http" in methods:
            http_res = poll_http(ip_address, task)
            status = http_res.get("status", "DOWN")
            results.append({
                "device_id": device_id,
                "protocol": "HTTP",
                "status": status,
                "latency_ms": http_res.get("latency_ms"),
                "error_message": http_res.get("error")
            })

    except Exception as e:
        logger.error(f"Failed executing tasks for {ip_address}: {e}")
        
    return results

DB_FILE = "offline_queue.db"

def init_db():
    with sqlite3.connect(DB_FILE) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS telemetry_queue (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                payload TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.commit()

def save_to_offline_queue(payload: Dict[str, Any]):
    try:
        with sqlite3.connect(DB_FILE) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM telemetry_queue")
            count = cursor.fetchone()[0]
            # Prune if over 50,000 max limit to prevent disk full
            if count >= 50000:
                cursor.execute("""
                    DELETE FROM telemetry_queue 
                    WHERE id IN (
                        SELECT id FROM telemetry_queue 
                        ORDER BY created_at ASC 
                        LIMIT 5000
                    )
                """)
            conn.execute("INSERT INTO telemetry_queue (payload) VALUES (?)", (json.dumps(payload),))
            conn.commit()
    except Exception as e:
        logger.error(f"Failed to save to offline queue: {e}")

def flush_offline_queue(config: Dict[str, Any]):
    """Attempt to upload a chunk of offline data."""
    try:
        with sqlite3.connect(DB_FILE) as conn:
            cursor = conn.cursor()
            # Batch size of 100 to prevent overwhelming server
            cursor.execute("SELECT id, payload FROM telemetry_queue ORDER BY created_at ASC LIMIT 100")
            rows = cursor.fetchall()
            
            if not rows:
                return # Queue is empty
                
            url = f"{config['central_server_url']}/api/probe/ingest"
            headers = {
                "Authorization": f"Bearer {config['probe_api_key']}",
                "Content-Type": "application/json"
            }
            
            ids_to_delete = []
            for row_id, payload_str in rows:
                try:
                    payload = json.loads(payload_str)
                    resp = requests.post(url, json=payload, headers=headers, timeout=10)
                    if resp.status_code in (200, 201):
                        ids_to_delete.append(row_id)
                    elif resp.status_code == 429 or resp.status_code >= 500:
                        logger.warning(f"Server returned {resp.status_code}, pausing offline flush.")
                        break # Server overloaded, stop sending chunks
                except Exception as e:
                    logger.error(f"Error pushing offline data: {e}")
                    break # Stop if network is down
            
            if ids_to_delete:
                placeholders = ",".join("?" * len(ids_to_delete))
                conn.execute(f"DELETE FROM telemetry_queue WHERE id IN ({placeholders})", ids_to_delete)
                conn.commit()
                logger.info(f"Flushed {len(ids_to_delete)} offline records to central server.")
                
    except Exception as e:
        logger.error(f"Failed to process offline queue: {e}")

def push_results(results: List[Dict[str, Any]], config: Dict[str, Any]):
    if not results:
        return
        
    url = f"{config['central_server_url']}/api/probe/ingest"
    headers = {
        "Authorization": f"Bearer {config['probe_api_key']}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "probe_id": config["probe_id"],
        "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
        "results": results
    }
    
    try:
        # Note: in a real environment we would handle gzip compression here
        resp = requests.post(url, json=payload, headers=headers, timeout=10)
        resp.raise_for_status()
        logger.info(f"Pushed {len(results)} metrics to central server successfully.")
    except Exception as e:
        logger.error(f"Failed to push metrics to central server: {e}. Saving to offline queue.")
        save_to_offline_queue(payload)

def monitoring_loop(config: Dict[str, Any]):
    """
    Runs every 30 seconds to monitor devices based on CURRENT_TASKS.
    """
    init_db()
    logger.info("Starting monitoring loop...")
    while True:
        # Try to flush offline data before doing new work
        flush_offline_queue(config)
        
        with TASKS_LOCK:
            tasks_copy = list(CURRENT_TASKS)
            
        if not tasks_copy:
            logger.debug("No tasks in configuration. Waiting...")
        else:
            logger.info(f"Executing {len(tasks_copy)} monitoring tasks...")
            all_results = []
            with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
                futures = {executor.submit(execute_monitor_task, t): t for t in tasks_copy}
                for future in concurrent.futures.as_completed(futures):
                    try:
                        res = future.result()
                        if res:
                            all_results.extend(res)
                    except Exception as e:
                        logger.error(f"Task failed: {e}")
                        
            # Push all gathered results back to the server
            push_results(all_results, config)
            
        # Sleep with Jitter to prevent Thundering Herd
        base_sleep = 30
        jitter = random.uniform(0, 5) # 0 to 5 seconds of randomness
        time.sleep(base_sleep + jitter)

def long_polling_loop(config: Dict[str, Any]):
    """
    Continuously polls the central server for configuration updates.
    """
    global CURRENT_TASKS, CONFIG_VERSION
    logger.info("Starting long-polling configuration loop...")
    url = f"{config['central_server_url']}/api/probe/config"
    headers = {
        "Authorization": f"Bearer {config['probe_api_key']}",
        "X-Probe-ID": config["probe_id"]
    }
    
    while True:
        try:
            params = {"current_version": CONFIG_VERSION}
            # Timeout is slightly larger than the expected server timeout to catch server drops
            resp = requests.get(url, headers=headers, params=params, timeout=70)
            
            if resp.status_code == 200:
                data = resp.json()
                new_version = data.get("config_version")
                if new_version != CONFIG_VERSION:
                    logger.info(f"Received new configuration: {new_version}")
                    with TASKS_LOCK:
                        CURRENT_TASKS = data.get("tasks", [])
                        CONFIG_VERSION = new_version
            elif resp.status_code == 304:
                # Not modified, just loop again
                pass
            else:
                logger.error(f"Failed to pull config: {resp.status_code} - {resp.text}")
                time.sleep(10)
                
        except requests.exceptions.Timeout:
            # Long poll timeout reached normally without changes, reconnect.
            pass
        except Exception as e:
            logger.error(f"Error in long polling loop: {e}")
            time.sleep(10)

if __name__ == "__main__":
    agent_config = load_config()
    
    # Start the background monitoring loop
    monitor_thread = threading.Thread(target=monitoring_loop, args=(agent_config,), daemon=True)
    monitor_thread.start()
    
    # Start the long polling loop (blocks main thread)
    long_polling_loop(agent_config)

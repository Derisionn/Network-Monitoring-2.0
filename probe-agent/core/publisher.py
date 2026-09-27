import json
import logging
import datetime
import requests
import sqlite3
from typing import Dict, List, Any

from core.offline_queue import save_to_offline_queue, DB_FILE
from core.state import STATIC_POLLED_DEVICES

logger = logging.getLogger(__name__)

def flush_offline_queue(config: Dict[str, Any]):
    try:
        with sqlite3.connect(DB_FILE) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, payload FROM telemetry_queue ORDER BY created_at ASC LIMIT 100")
            rows = cursor.fetchall()
            
            if not rows:
                return
                
            url = f"{config.get('central_server_url', config.get('server_url'))}/api/v1/ingestion/ingest"
            headers = {"Content-Type": "application/json"}
            if "probe_api_key" in config:
                headers["Authorization"] = f"Bearer {config['probe_api_key']}"
            
            ids_to_delete = []
            for row_id, payload_str in rows:
                try:
                    payload = json.loads(payload_str)
                    resp = requests.post(url, json=payload, headers=headers, timeout=10)
                    if resp.status_code in (200, 201):
                        ids_to_delete.append(row_id)
                    elif resp.status_code == 429 or resp.status_code >= 500:
                        logger.warning(f"Server returned {resp.status_code}, pausing offline flush.")
                        break
                except Exception as e:
                    logger.error(f"Error pushing offline data: {e}")
                    break
            
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
        
    url = f"{config.get('central_server_url', config.get('server_url'))}/api/v1/ingestion/ingest"
    headers = {"Content-Type": "application/json"}
    if "probe_api_key" in config:
        headers["Authorization"] = f"Bearer {config['probe_api_key']}"
    
    for res in results:
        device_id = res["device_id"]
        
        if device_id not in STATIC_POLLED_DEVICES:
            protocol = res.get("protocol")
            if protocol in ["SNMP", "WMI", "SSH"]:
                metrics = res.get("metrics", {})
                if "System" in metrics:
                    sys_info = metrics["System"]
                    static_payload = {}
                    if "Description" in sys_info:
                        static_payload["os_description"] = sys_info["Description"]
                    if "Hostname" in sys_info:
                        static_payload["system_hostname"] = sys_info["Hostname"]
                    
                    if static_payload:
                        try:
                            meta_url = f"{config.get('central_server_url', config.get('server_url'))}/api/v1/metadata/devices/{device_id}"
                            resp = requests.patch(meta_url, json=static_payload, headers=headers, timeout=5)
                            if resp.status_code in [200, 204]:
                                STATIC_POLLED_DEVICES.add(device_id)
                                logger.info(f"Smart Polling: Pushed static metadata for {device_id}")
                            else:
                                logger.warning(f"Smart Polling: Backend rejected static metadata for {device_id} ({resp.status_code})")
                        except Exception as e:
                            logger.error(f"Smart Polling: Failed to push static metadata for {device_id}: {e}")

        payload = {
            "device_id": device_id,
            "device_ip": res.get("ip_address", "0.0.0.0"),
            "timestamp": datetime.datetime.utcnow().isoformat() + "Z"
        }
        
        protocol = res.get("protocol")
        if protocol in ["ICMP", "TCP", "HTTP"]:
            payload["ping"] = {
                "status": res["status"],
                "latency_ms": res.get("latency_ms"),
                "packet_loss_percent": res.get("packet_loss")
            }
        elif protocol in ["SNMP", "SSH", "WMI"]:
            metrics = res.get("metrics", {})
            if "Interfaces" in metrics:
                payload["interfaces"] = {}
                for iface_name, iface_data in metrics["Interfaces"].items():
                    payload["interfaces"][iface_name] = {
                        "status": iface_data.get("Status", "UP"),
                        "in_octets": int(iface_data.get("InOctets", iface_data.get("In", 0))),
                        "out_octets": int(iface_data.get("OutOctets", iface_data.get("Out", 0)))
                    }
            
            sys_payload = {}
            if "CPU" in metrics:
                if "Utilization %" in metrics["CPU"] and metrics["CPU"]["Utilization %"] != "Unknown":
                    sys_payload["cpu_usage"] = metrics["CPU"]["Utilization %"]
                elif "Cores" in metrics["CPU"] and len(metrics["CPU"]["Cores"]) > 0:
                    sys_payload["cpu_usage"] = sum(c.get("usage", 0) for c in metrics["CPU"]["Cores"]) / len(metrics["CPU"]["Cores"])
            
            if "Memory" in metrics:
                sys_payload["memory_usage"] = metrics["Memory"].get("UsedPercent", metrics["Memory"].get("Percent", 0))
                
            if "Storage" in metrics:
                pcts = [d.get("UsedPercent", d.get("Percent", 0)) for k, d in metrics["Storage"].items() if isinstance(d, dict)]
                if pcts:
                    sys_payload["disk_usage"] = sum(pcts) / len(pcts)
                    
            if sys_payload:
                payload["system"] = sys_payload
        
        logger.info(f"Pushing JSON Payload to Server: {json.dumps(payload, indent=2)}")
        
        try:
            resp = requests.post(url, json=payload, headers=headers, timeout=10)
            resp.raise_for_status()
        except Exception as e:
            logger.error(f"Failed to push metrics for {res.get('ip_address')} to central server: {e}. Saving to offline queue.")
            save_to_offline_queue(payload)
            
    logger.info(f"Pushed {len(results)} metrics to central server successfully.")

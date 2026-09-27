import time
import random
import logging
import concurrent.futures
from typing import Dict, List, Any

from core.offline_queue import init_db
from core.publisher import flush_offline_queue, push_results

from monitors.icmp_monitor import ping_device
from monitors.snmp_monitor import fetch_snmp_tree
from monitors.ssh_monitor import poll_ssh
from monitors.wmi_monitor import poll_wmi
from monitors.tcp_monitor import poll_tcp
from monitors.http_monitor import poll_http

logger = logging.getLogger(__name__)

MAX_WORKERS = 10

def execute_monitor_task(task: Dict[str, Any]) -> List[Dict[str, Any]]:
    ip_address = task.get("ip_address")
    device_id = task.get("device_id")
    methods = [m.lower() for m in task.get("methods", [])]
    
    results = []
    
    try:
        if "icmp" in methods:
            ping_res = ping_device(ip_address)
            results.append({
                "device_id": device_id,
                "ip_address": ip_address,
                "protocol": "ICMP",
                "status": ping_res.get("status"),
                "latency_ms": ping_res.get("latency_ms"),
                "packet_loss": ping_res.get("packet_loss"),
                "error_message": ping_res.get("error_message")
            })

        if "snmp" in methods:
            snmp_res = fetch_snmp_tree(ip_address, task)
            status = "UP" if "error" not in snmp_res else "DOWN"
            results.append({
                "device_id": device_id,
                "ip_address": ip_address,
                "protocol": "SNMP",
                "status": status,
                "metrics": snmp_res if status == "UP" else {},
                "error_message": snmp_res.get("error")
            })

        if "ssh" in methods:
            ssh_res = poll_ssh(ip_address, task)
            status = "UP" if "error" not in ssh_res else "DOWN"
            results.append({
                "device_id": device_id,
                "ip_address": ip_address,
                "protocol": "SSH",
                "status": status,
                "metrics": ssh_res if status == "UP" else {},
                "error_message": ssh_res.get("error")
            })

        if "wmi" in methods:
            wmi_res = poll_wmi(ip_address, task)
            status = "UP" if "error" not in wmi_res else "DOWN"
            results.append({
                "device_id": device_id,
                "ip_address": ip_address,
                "protocol": "WMI",
                "status": status,
                "metrics": wmi_res if status == "UP" else {},
                "error_message": wmi_res.get("error")
            })

        if "tcp" in methods:
            tcp_res = poll_tcp(ip_address, task)
            status = tcp_res.get("status", "DOWN")
            results.append({
                "device_id": device_id,
                "ip_address": ip_address,
                "protocol": "TCP",
                "status": status,
                "latency_ms": tcp_res.get("latency_ms"),
                "error_message": tcp_res.get("error")
            })

        if "http" in methods:
            http_res = poll_http(ip_address, task)
            status = http_res.get("status", "DOWN")
            results.append({
                "device_id": device_id,
                "ip_address": ip_address,
                "protocol": "HTTP",
                "status": status,
                "latency_ms": http_res.get("latency_ms"),
                "error_message": http_res.get("error")
            })

    except Exception as e:
        logger.error(f"Failed executing tasks for {ip_address}: {e}")
        
    return results

def monitoring_loop(config: Dict[str, Any]):
    init_db()
    logger.info("Starting monitoring loop...")
    while True:
        flush_offline_queue(config)
        
        import core.state
        with core.state.TASKS_LOCK:
            tasks_copy = list(core.state.CURRENT_TASKS)
            
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
                        
            push_results(all_results, config)
            
        base_sleep = 30
        jitter = random.uniform(0, 5)
        time.sleep(base_sleep + jitter)

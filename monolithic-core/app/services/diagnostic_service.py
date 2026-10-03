from typing import Dict, List, Optional
import time

# In-memory stores for ephemeral diagnostic tasks and logs
# Key: device_id, Value: {"protocol": "icmp", "status": "pending", "timestamp": ...}
pending_diagnostics: Dict[str, dict] = {}

# Key: device_id, Value: List of log strings
diagnostic_logs: Dict[str, List[str]] = {}

def request_diagnostic(device_id: str, protocol: str):
    pending_diagnostics[device_id] = {
        "protocol": protocol,
        "status": "pending",
        "timestamp": time.time()
    }
    diagnostic_logs[device_id] = [f"[{time.strftime('%H:%M:%S')}] Diagnostic requested for {protocol.upper()}..."]

def get_pending_diagnostic(device_id: str) -> Optional[dict]:
    # Check if there's a pending diagnostic for this device
    task = pending_diagnostics.get(device_id)
    if task and task["status"] == "pending":
        return task
    return None

def mark_diagnostic_running(device_id: str):
    if device_id in pending_diagnostics:
        pending_diagnostics[device_id]["status"] = "running"

def clear_diagnostic(device_id: str):
    if device_id in pending_diagnostics:
        del pending_diagnostics[device_id]

def append_log(device_id: str, message: str):
    if device_id not in diagnostic_logs:
        diagnostic_logs[device_id] = []
    diagnostic_logs[device_id].append(message)

def get_logs(device_id: str) -> List[str]:
    return diagnostic_logs.get(device_id, [])

def clear_logs(device_id: str):
    if device_id in diagnostic_logs:
        del diagnostic_logs[device_id]

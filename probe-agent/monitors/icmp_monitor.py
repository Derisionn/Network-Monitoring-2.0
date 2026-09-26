import subprocess
import re
import platform
from typing import Dict, Any

def ping_device(ip_address: str, timeout_ms: int = 2000) -> Dict[str, Any]:
    """
    Pings a device using the native OS ping command to avoid requiring root/administrator privileges.
    Returns a dictionary with status, latency, packet loss, and error details.
    """
    # Build command for Windows
    # -n 1: Send 1 echo request
    # -w 2000: Timeout in milliseconds
    command = ["ping", "-n", "1", "-w", str(timeout_ms), ip_address]
    
    # Check if we are accidentally running on Linux/Mac and adjust command
    if platform.system().lower() != "windows":
        # -c 1: count 1
        # -W 2: timeout 2 seconds
        command = ["ping", "-c", "1", "-W", str(max(1, timeout_ms // 1000)), ip_address]

    try:
        # Run the command with a hard timeout just in case it hangs
        result = subprocess.run(command, capture_output=True, text=True, timeout=(timeout_ms / 1000.0) + 1.0)
        output = result.stdout + result.stderr

        # Default values
        status = "DOWN"
        latency_ms = None
        packet_loss = 100.0
        error_message = None

        if platform.system().lower() == "windows":
            # Parse Windows output
            # Look for "time=12ms" or "time<1ms"
            time_match = re.search(r"time(?:=|<)(\d+)ms", output)
            if time_match:
                latency_ms = float(time_match.group(1))
            
            # Look for "Lost = 1 (100% loss)"
            loss_match = re.search(r"\((\d+)% loss\)", output)
            if loss_match:
                packet_loss = float(loss_match.group(1))
            
            if "Destination host unreachable" in output:
                status = "DOWN"
                error_message = "Destination host unreachable"
            elif "Request timed out" in output:
                status = "DOWN"
                error_message = "Request timed out"
            elif result.returncode == 0 and packet_loss < 100:
                status = "UP"
            else:
                status = "DOWN"
                error_message = "Ping command failed"
        else:
            # Basic fallback for linux/mac parsing if needed
            if result.returncode == 0:
                status = "UP"
                packet_loss = 0.0
                time_match = re.search(r"time=([\d\.]+)\s*ms", output)
                if time_match:
                    latency_ms = float(time_match.group(1))
            else:
                status = "DOWN"
                packet_loss = 100.0
                error_message = "Ping command failed or timed out"

        return {
            "status": status,
            "latency_ms": latency_ms,
            "packet_loss": packet_loss,
            "error_message": error_message
        }

    except subprocess.TimeoutExpired:
        return {
            "status": "DOWN",
            "latency_ms": None,
            "packet_loss": 100.0,
            "error_message": "Process timed out completely"
        }
    except Exception as e:
        return {
            "status": "DOWN",
            "latency_ms": None,
            "packet_loss": 100.0,
            "error_message": f"Execution error: {str(e)}"
        }

import socket
import logging
import time

logger = logging.getLogger(__name__)

def poll_tcp(ip_address: str, config: dict):
    port = config.get("tcp_target_port")
    if not port:
        port = 80 # default fallback
        
    try:
        start = time.time()
        with socket.create_connection((ip_address, port), timeout=5):
            latency = (time.time() - start) * 1000
            return {"status": "UP", "latency_ms": round(latency, 2)}
    except Exception as e:
        logger.error(f"TCP Error for {ip_address}:{port}: {e}")
        return {"error": str(e)}

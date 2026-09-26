import requests
import logging
import time
import urllib3

# Suppress insecure request warnings for self-signed certs
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

logger = logging.getLogger(__name__)

def poll_http(ip_address: str, config: dict):
    url = config.get("http_url")
    if not url:
        url = f"http://{ip_address}"
        
    # Prevent connection refused if user accidentally typed https://https://
    url = url.replace("https://https://", "https://").replace("http://https://", "https://")
        
    try:
        start = time.time()
        res = requests.get(url, timeout=5, verify=False)
        latency = (time.time() - start) * 1000
        
        if res.status_code < 400:
            return {"status": "UP", "latency_ms": round(latency, 2), "status_code": res.status_code}
        else:
            return {"error": f"HTTP {res.status_code}", "status_code": res.status_code}
            
    except requests.exceptions.Timeout:
        logger.error(f"HTTP Timeout for {url}")
        return {"error": "Connection timed out"}
    except requests.exceptions.ConnectionError:
        logger.error(f"HTTP Connection Refused for {url}")
        return {"error": "Connection refused"}
    except Exception as e:
        logger.error(f"HTTP Error for {url}: {e}")
        return {"error": str(e)}

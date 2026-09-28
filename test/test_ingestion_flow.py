import logging
import sys
from fastapi import FastAPI
from fastapi.testclient import TestClient
from app.api.ingestion import router

# Force logging to print to console so we can see the background task working!
logging.basicConfig(level=logging.DEBUG, stream=sys.stdout, format='%(levelname)s: %(message)s')

app = FastAPI()
app.include_router(router, prefix="/api/v1/ingestion")

client = TestClient(app)

def run_test():
    # 1. The exact format the publisher.py builds
    mock_payload = {
        "device_id": "test-device-123",
        "device_ip": "10.0.0.5",
        "timestamp": "2026-09-28T12:00:00.000Z",
        "ping": {
            "status": "UP",
            "latency_ms": 12.5,
            "packet_loss_percent": 0.0
        },
        "interfaces": {
            "eth0": {
                "status": "UP",
                "in_octets": 1000000,
                "out_octets": 500000
            }
        },
        "system": {
            "cpu_usage": 45.5,
            "memory_usage": 60.2,
            "disk_usage": 30.1
        }
    }
    
    # 2. The Authorization header the publisher.py adds
    headers = {
        "Authorization": "Bearer test-api-key-123"
    }

    print("\n=======================================================")
    print("1. PROBE AGENT SENDS DATA OVER THE NETWORK")
    print("=======================================================\n")
    
    # The TestClient automatically runs FastAPI's BackgroundTasks immediately after returning!
    response = client.post("/api/v1/ingestion/ingest", json=mock_payload, headers=headers)
    
    print("\n=======================================================")
    print("2. INGESTION MODULE RESPONDS INSTANTLY TO PROBE AGENT")
    print("=======================================================\n")
    print(f"HTTP Status Code: {response.status_code}")
    print(f"Response Payload: {response.json()}\n")
    print("Notice how the logs from the Processing Module printed AFTER the API accepted the request! That is the Background Task at work.")

if __name__ == "__main__":
    run_test()

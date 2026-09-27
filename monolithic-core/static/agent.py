import time
import json
import os
import urllib.request
import urllib.error
import sys
import subprocess
import re
import platform
import datetime

def ping_device(ip_address: str, timeout_ms: int = 2000):
    command = ["ping", "-n", "1", "-w", str(timeout_ms), ip_address]
    if platform.system().lower() != "windows":
        command = ["ping", "-c", "1", "-W", str(max(1, timeout_ms // 1000)), ip_address]

    try:
        result = subprocess.run(command, capture_output=True, text=True, timeout=(timeout_ms / 1000.0) + 1.0)
        output = result.stdout + result.stderr

        status = "DOWN"
        latency_ms = None
        packet_loss = 100.0

        if platform.system().lower() == "windows":
            time_match = re.search(r"time(?:=|<)(\d+)ms", output)
            if time_match:
                latency_ms = float(time_match.group(1))
            
            loss_match = re.search(r"\((\d+)% loss\)", output)
            if loss_match:
                packet_loss = float(loss_match.group(1))
            
            if "Destination host unreachable" in output or "Request timed out" in output:
                status = "DOWN"
            elif result.returncode == 0 and packet_loss < 100:
                status = "UP"
        else:
            if result.returncode == 0:
                status = "UP"
                packet_loss = 0.0
                time_match = re.search(r"time=([\d\.]+)\s*ms", output)
                if time_match:
                    latency_ms = float(time_match.group(1))

        return {"status": status, "latency_ms": latency_ms, "packet_loss_percent": packet_loss}
    except Exception as e:
        return {"status": "DOWN", "latency_ms": None, "packet_loss_percent": 100.0}

def main():
    agent_dir = os.path.dirname(os.path.abspath(__file__))
    config_path = os.path.join(agent_dir, 'config.json')
    
    if not os.path.exists(config_path):
        print(f"[-] Config file missing at {config_path}")
        sys.exit(1)
        
    with open(config_path, 'r') as f:
        config = json.load(f)
        
    probe_id = config.get('probe_id')
    server_url = config.get('server_url', 'http://127.0.0.1:8000')
    
    print("==========================================")
    print(f"📡 Network Monitor Agent Started")
    print(f"ID: {probe_id}")
    print(f"Backend: {server_url}")
    print("==========================================")
    
    while True:
        try:
            req = urllib.request.Request(f"{server_url}/api/v1/metadata/probe/config")
            req.add_header('x-probe-id', probe_id)
            
            with urllib.request.urlopen(req) as response:
                data = json.loads(response.read().decode())
                tasks = data.get('tasks', [])
                pending_scan = data.get('pending_scan_subnet')
                
                print(f"[+] Heartbeat sent successfully! Monitoring {len(tasks)} devices.")
                
                # Execute Active Telemetry Collection (Monitors)
                for task in tasks:
                    ip = task.get("ip_address")
                    device_id = task.get("device_id")
                    
                    if ip and device_id:
                        # 1. Run Ping Monitor (ported from original probe-agent)
                        ping_res = ping_device(ip)
                        print(f"[*] Telemetry [{ip}]: {ping_res['status']} | {ping_res.get('latency_ms')}ms | Loss: {ping_res.get('packet_loss_percent')}%")
                        
                        # 2. Build Telemetry Payload
                        timestamp = datetime.datetime.utcnow().isoformat() + "Z"
                        telemetry_payload = json.dumps({
                            "device_id": device_id,
                            "device_ip": ip,
                            "timestamp": timestamp,
                            "ping": {
                                "status": ping_res["status"],
                                "latency_ms": ping_res.get("latency_ms"),
                                "packet_loss_percent": ping_res.get("packet_loss_percent")
                            }
                        }).encode('utf-8')
                        
                        # 3. POST to Ingestion Endpoint
                        try:
                            ingest_req = urllib.request.Request(
                                f"{server_url}/api/v1/metadata/probe/ingest",
                                data=telemetry_payload,
                                headers={'Content-Type': 'application/json'}
                            )
                            with urllib.request.urlopen(ingest_req) as ingest_res:
                                pass # Successfully ingested
                        except Exception as e:
                            print(f"[-] Failed to ingest telemetry for {ip}: {e}")

                if pending_scan:
                    print(f"[*] Network Discovery Scan requested for subnet: {pending_scan}")
                    # Fast mock scan of the subnet
                    import random
                    base_ip = pending_scan.split('/')[0].rsplit('.', 1)[0]
                    found_devices = []
                    
                    print("[*] Scanning... (This is a rapid mock scan)")
                    time.sleep(2) # Simulate scan time
                    
                    # Generate 2-5 random devices
                    num_devices = random.randint(2, 5)
                    for i in range(num_devices):
                        ip = f"{base_ip}.{random.randint(2, 254)}"
                        mac = ":".join([f"{random.randint(0, 255):02x}" for _ in range(6)])
                        
                        device_type = random.choice(['router', 'switch', 'server', 'firewall'])
                        found_devices.append({
                            "ip": ip,
                            "mac": mac,
                            "type": device_type,
                            "hostname": f"discovered-{device_type}-{i+1}"
                        })
                        print(f"    -> Found: {ip} ({device_type})")
                        
                    # Submit results
                    scan_payload = json.dumps({
                        "probe_id": probe_id,
                        "results": found_devices
                    }).encode('utf-8')
                    
                    res_req = urllib.request.Request(
                        f"{server_url}/api/v1/metadata/probe/scan-results",
                        data=scan_payload,
                        headers={'Content-Type': 'application/json'}
                    )
                    with urllib.request.urlopen(res_req) as res_response:
                        print("[+] Scan results submitted to backend!")
                        
        except urllib.error.URLError as e:
            print(f"[-] Failed to reach backend server: {e}")
        except Exception as e:
            print(f"[-] Error: {e}")
            
        time.sleep(15)

if __name__ == "__main__":
    main()

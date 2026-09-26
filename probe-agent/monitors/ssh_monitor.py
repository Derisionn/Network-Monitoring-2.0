import paramiko
import logging

logger = logging.getLogger(__name__)

def poll_ssh(ip_address: str, config: dict):
    try:
        username = config.get("ssh_username") or "root"
        password = config.get("ssh_password", "")
        port = config.get("ssh_port", 22)
        
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        
        if password:
            client.connect(ip_address, port=port, username=username, password=password, timeout=5, allow_agent=False, look_for_keys=False)
        else:
            # Without password might fail if key not setup, but we'll try
            client.connect(ip_address, port=port, username=username, timeout=5)
            
        data = {
            "System": {"Hostname": "", "Description": "Linux SSH", "Uptime": ""},
            "CPU": {"Cores": []},
            "Memory": {},
            "Storage": {},
            "Interfaces": {}
        }
        
        # Get hostname
        stdin, stdout, stderr = client.exec_command("hostname")
        data["System"]["Hostname"] = stdout.read().decode().strip()
        
        # Get uptime
        stdin, stdout, stderr = client.exec_command("uptime -p")
        data["System"]["Uptime"] = stdout.read().decode().strip()
        
        # Get CPU usage using top (very basic)
        stdin, stdout, stderr = client.exec_command("top -bn1 | grep 'Cpu(s)'")
        cpu_line = stdout.read().decode().strip()
        if cpu_line:
            # e.g., %Cpu(s):  5.0 us,  2.0 sy, ...
            try:
                parts = cpu_line.split(',')
                idle_str = [p for p in parts if 'id' in p][0]
                idle_val = float(idle_str.strip().split()[0])
                usage = round(100.0 - idle_val, 2)
                data["CPU"]["Cores"].append({"name": "Aggregate", "usage": usage})
            except:
                pass
                
        # Get Memory using free
        stdin, stdout, stderr = client.exec_command("free -m | grep Mem")
        mem_line = stdout.read().decode().strip()
        if mem_line:
            parts = mem_line.split()
            total = float(parts[1])
            used = float(parts[2])
            free = float(parts[3])
            
            percent = (used / total) * 100 if total > 0 else 0
            
            data["Memory"] = {
                "Total": f"{total / 1024:.2f} GB",
                "Used": f"{used / 1024:.2f} GB",
                "Free": f"{free / 1024:.2f} GB",
                "Percent": round(percent, 2)
            }
            
        # Get Storage using df
        stdin, stdout, stderr = client.exec_command("df -h / | tail -1")
        df_line = stdout.read().decode().strip()
        if df_line:
            parts = df_line.split()
            size = parts[1]
            used = parts[2]
            avail = parts[3]
            percent = parts[4].replace('%', '')
            
            data["Storage"] = {
                "Total": size,
                "Used": used,
                "Free": avail,
                "Percent": float(percent)
            }

        client.close()
        return data
        
    except Exception as e:
        logger.error(f"SSH Error for {ip_address}: {e}")
        return {"error": str(e)}

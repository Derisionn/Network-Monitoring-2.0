import wmi
import logging
import pythoncom

logger = logging.getLogger(__name__)

def poll_wmi(ip_address: str, config: dict):
    """
    Poll Windows machine using WMI.
    """
    pythoncom.CoInitialize()
    try:
        username = config.get("wmi_username")
        password = config.get("wmi_password")
        
        # Connect to WMI
        if username and password:
            connection = wmi.WMI(ip_address, user=username, password=password)
        else:
            # Fallback to local context if no credentials provided (useful for localhost)
            connection = wmi.WMI(ip_address)
            
        data = {
            "System": {},
            "CPU": {"Cores": []},
            "Memory": {},
            "Storage": {},
            "Interfaces": {}
        }
        
        # CPU
        for idx, processor in enumerate(connection.Win32_Processor()):
            # CPU load
            load = int(processor.LoadPercentage or 0)
            data["CPU"]["Cores"].append({
                "name": f"CPU {idx}",
                "usage": load
            })
            
        # Memory
        for os in connection.Win32_OperatingSystem():
            total_kb = int(os.TotalVisibleMemorySize)
            free_kb = int(os.FreePhysicalMemory)
            used_kb = total_kb - free_kb
            
            percent = (used_kb / total_kb) * 100 if total_kb > 0 else 0
            
            data["Memory"] = {
                "Total": f"{total_kb / 1024 / 1024:.2f} GB",
                "Used": f"{used_kb / 1024 / 1024:.2f} GB",
                "Free": f"{free_kb / 1024 / 1024:.2f} GB",
                "Percent": round(percent, 2)
            }
            
            data["System"]["Hostname"] = os.CSName
            data["System"]["Description"] = os.Caption
            data["System"]["Uptime"] = "WMI Online"

        # Storage (Logical Disks)
        total_size = 0
        total_free = 0
        for disk in connection.Win32_LogicalDisk(DriveType=3): # 3 = Local Disk
            size = int(disk.Size or 0)
            free = int(disk.FreeSpace or 0)
            total_size += size
            total_free += free
            
        if total_size > 0:
            total_used = total_size - total_free
            percent_used = (total_used / total_size) * 100
            data["Storage"] = {
                "Total": f"{total_size / 1024 / 1024 / 1024:.2f} GB",
                "Used": f"{total_used / 1024 / 1024 / 1024:.2f} GB",
                "Free": f"{total_free / 1024 / 1024 / 1024:.2f} GB",
                "Percent": round(percent_used, 2)
            }
            
        # Network
        try:
            for net in connection.Win32_PerfRawData_Tcpip_NetworkInterface():
                if int(net.CurrentBandwidth or 0) == 0: continue
                in_bytes = int(net.BytesReceivedPersec or 0)
                out_bytes = int(net.BytesSentPersec or 0)
                
                # Format bytes
                data["Interfaces"][net.Name] = {
                    "Status": "UP",
                    "In": f"{in_bytes}", 
                    "Out": f"{out_bytes}",
                    "Errors": str(int(net.PacketsReceivedErrors or 0) + int(net.PacketsOutboundErrors or 0))
                }
        except Exception:
            pass

        return data
        
    except Exception as e:
        logger.error(f"WMI Error for {ip_address}: {e}")
        return {"error": str(e)}
    finally:
        pythoncom.CoUninitialize()

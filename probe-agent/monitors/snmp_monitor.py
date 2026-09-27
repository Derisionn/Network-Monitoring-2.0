import logging
from pysnmp.hlapi import *
import json

logger = logging.getLogger(__name__)

def fetch_snmp_tree(ip_address, config):
    """
    Fetches the System, CPU, Memory and Interfaces tree using SNMP.
    """
    snmp_version = config.get("snmp_version", "v2c")
    port = config.get("snmp_port", 161)
    
    if snmp_version == "v2c":
        auth_data = CommunityData(config.get("community_string", "public"), mpModel=1)
    elif snmp_version == "v3":
        auth_protocol_map = {
            "MD5": usmHMACMD5AuthProtocol,
            "SHA": usmHMACSHAAuthProtocol
        }
        priv_protocol_map = {
            "DES": usmDESPrivProtocol,
            "AES": usmAesCfb128Protocol
        }
        
        auth_proto = auth_protocol_map.get(config.get("v3_auth_protocol"), usmHMACMD5AuthProtocol)
        priv_proto = priv_protocol_map.get(config.get("v3_priv_protocol"), usmDESPrivProtocol)
        
        auth_data = UsmUserData(
            config.get("v3_username", "admin"),
            authKey=config.get("v3_auth_key", None),
            privKey=config.get("v3_priv_key", None),
            authProtocol=auth_proto,
            privProtocol=priv_proto
        )
    else:
        auth_data = CommunityData("public", mpModel=1)

    target = UdpTransportTarget((ip_address, port), timeout=2.0, retries=1)
    
    result = {
        "System": {},
        "CPU": {"Utilization %": "Unknown"},
        "Memory": {},
        "Storage": {},
        "Interfaces": {}
    }

    try:
        # Get System Info
        errorIndication, errorStatus, errorIndex, varBinds = next(
            getCmd(SnmpEngine(), auth_data, target, ContextData(),
                   ObjectType(ObjectIdentity('1.3.6.1.2.1.1.1.0')),
                   ObjectType(ObjectIdentity('1.3.6.1.2.1.1.5.0')),
                   ObjectType(ObjectIdentity('1.3.6.1.2.1.1.3.0')))
        )

        if errorIndication or errorStatus:
            logger.error(f"SNMP Error getting system info for {ip_address}: {errorIndication or errorStatus}")
            return {"error": str(errorIndication or errorStatus)}
        
        for varBind in varBinds:
            oid, val = varBind
            oid_str = str(oid)
            if "1.3.6.1.2.1.1.1" in oid_str or "sysDescr" in oid_str:
                result["System"]["Description"] = str(val)
            elif "1.3.6.1.2.1.1.5" in oid_str or "sysName" in oid_str:
                result["System"]["Hostname"] = str(val)
            elif "1.3.6.1.2.1.1.3" in oid_str or "sysUpTime" in oid_str:
                result["System"]["Uptime"] = str(val)

        # Get Interfaces (Walk ifTable)
        for (errorIndication, errorStatus, errorIndex, varBinds) in nextCmd(
            SnmpEngine(), auth_data, target, ContextData(),
            ObjectType(ObjectIdentity('1.3.6.1.2.1.2.2.1.2')),
            ObjectType(ObjectIdentity('1.3.6.1.2.1.2.2.1.8')),
            ObjectType(ObjectIdentity('1.3.6.1.2.1.2.2.1.10')),
            ObjectType(ObjectIdentity('1.3.6.1.2.1.2.2.1.16')),
            ObjectType(ObjectIdentity('1.3.6.1.2.1.2.2.1.14')),
            lexicographicMode=False
        ):
            if errorIndication or errorStatus:
                break
            
            if len(varBinds) >= 5:
                ifIndex = str(varBinds[0][0]).split('.')[-1]
                ifName = str(varBinds[0][1])
                
                # Windows SNMP mistakenly puts CPU and RAM in ifTable. Filter them out.
                ifName_lower = ifName.lower()
                if any(x in ifName_lower for x in ["core", "ram", "aggregate", "cpu"]):
                    continue

                status = "UP" if str(varBinds[1][1]) == "1" else "DOWN"
                
                try:
                    in_octets = int(varBinds[2][1])
                    out_octets = int(varBinds[3][1])
                except:
                    in_octets = 0
                    out_octets = 0
                    
                errors = str(varBinds[4][1])
                
                result["Interfaces"][ifName] = {
                    "Status": status,
                    "InOctets": in_octets,
                    "OutOctets": out_octets,
                    "Errors": errors
                }

        # Get CPU Cores (Walk hrProcessorLoad 1.3.6.1.2.1.25.3.3.1.2)
        cpu_cores = []
        for (errorIndication, errorStatus, errorIndex, varBinds) in nextCmd(
            SnmpEngine(), auth_data, target, ContextData(),
            ObjectType(ObjectIdentity('1.3.6.1.2.1.25.3.3.1.2')),
            lexicographicMode=False
        ):
            if errorIndication or errorStatus:
                break
            
            for varBind in varBinds:
                # Extracts the percentage load for each core
                try:
                    load = int(varBind[1])
                    cpu_cores.append(load)
                except:
                    pass
                    
        if cpu_cores:
            result["CPU"]["Cores"] = cpu_cores
            result["CPU"]["Utilization %"] = sum(cpu_cores) / len(cpu_cores)

        # Get Storage and RAM (Walk hrStorageTable 1.3.6.1.2.1.25.2.3.1)
        for (errorIndication, errorStatus, errorIndex, varBinds) in nextCmd(
            SnmpEngine(), auth_data, target, ContextData(),
            ObjectType(ObjectIdentity('1.3.6.1.2.1.25.2.3.1.2')), # Type
            ObjectType(ObjectIdentity('1.3.6.1.2.1.25.2.3.1.3')), # Descr
            ObjectType(ObjectIdentity('1.3.6.1.2.1.25.2.3.1.4')), # AllocationUnits
            ObjectType(ObjectIdentity('1.3.6.1.2.1.25.2.3.1.5')), # Size
            ObjectType(ObjectIdentity('1.3.6.1.2.1.25.2.3.1.6')), # Used
            lexicographicMode=False
        ):
            if errorIndication or errorStatus:
                break
            
            if len(varBinds) >= 5:
                type_oid = str(varBinds[0][1])
                descr = str(varBinds[1][1])
                print(f"DEBUG SNMP: {type_oid}, {descr}")
                try:
                    alloc_units = int(varBinds[2][1])
                    size_units = int(varBinds[3][1])
                    used_units = int(varBinds[4][1])
                    
                    if size_units > 0:
                        total_bytes = size_units * alloc_units
                        used_bytes = used_units * alloc_units
                        percent_used = (used_bytes / total_bytes) * 100
                        
                        # Type matching
                        if "1.3.6.1.2.1.25.2.1.2" in type_oid or "Physical Memory" in descr:
                            result["Memory"]["TotalBytes"] = total_bytes
                            result["Memory"]["UsedBytes"] = used_bytes
                            result["Memory"]["UsedPercent"] = percent_used
                        elif "1.3.6.1.2.1.25.2.1.4" in type_oid or "FixedDisk" in type_oid or ":" in descr or "/" in descr:
                            result["Storage"][descr] = {
                                "TotalBytes": total_bytes,
                                "UsedBytes": used_bytes,
                                "UsedPercent": percent_used
                            }
                except Exception as e:
                    print(f"DEBUG SNMP EXCEPTION: {e}")
                    pass

    except Exception as e:
        logger.error(f"SNMP Exception for {ip_address}: {e}")
        return {"error": str(e)}

    return result

def discovery_snmp_scan(ip_address, config):
    """
    Runs ONCE per device to fetch static configuration details (Location, OS, MAC)
    and returns a dictionary of the metadata.
    """
    snmp_version = config.get("snmp_version", "v2c")
    port = config.get("snmp_port", 161)
    
    # Use community string if provided, else fallback to public
    auth_data = CommunityData(config.get("community_string", "public"), mpModel=1)
    target = UdpTransportTarget((ip_address, port), timeout=2.0, retries=1)
    
    metadata = {}
    
    try:
        # Get System Info (sysDescr, sysName, sysLocation)
        errorIndication, errorStatus, errorIndex, varBinds = next(
            getCmd(SnmpEngine(), auth_data, target, ContextData(),
                   ObjectType(ObjectIdentity('1.3.6.1.2.1.1.1.0')),  # sysDescr
                   ObjectType(ObjectIdentity('1.3.6.1.2.1.1.5.0')),  # sysName
                   ObjectType(ObjectIdentity('1.3.6.1.2.1.1.6.0')))  # sysLocation
        )

        if not errorIndication and not errorStatus:
            for varBind in varBinds:
                oid_str = str(varBind[0])
                val_str = str(varBind[1])
                if "1.3.6.1.2.1.1.1" in oid_str:
                    metadata["os_description"] = val_str
                elif "1.3.6.1.2.1.1.5" in oid_str:
                    metadata["system_hostname"] = val_str
                elif "1.3.6.1.2.1.1.6" in oid_str:
                    metadata["location"] = val_str

        # Get first active MAC address from ifPhysAddress (1.3.6.1.2.1.2.2.1.6)
        for (errorIndication, errorStatus, errorIndex, varBinds) in nextCmd(
            SnmpEngine(), auth_data, target, ContextData(),
            ObjectType(ObjectIdentity('1.3.6.1.2.1.2.2.1.6')),
            lexicographicMode=False
        ):
            if errorIndication or errorStatus:
                break
            mac_val = varBinds[0][1]
            if mac_val:
                # Convert OctetString to MAC format XX:XX:XX:XX:XX:XX
                try:
                    mac_str = mac_val.prettyPrint().replace('0x', '')
                    if len(mac_str) == 12:
                        formatted_mac = ':'.join(mac_str[i:i+2] for i in range(0, 12, 2))
                        metadata["mac_address"] = formatted_mac
                        break # Just take the first valid MAC we find
                except Exception:
                    pass

    except Exception as e:
        logger.error(f"Discovery Scan failed for {ip_address}: {e}")
        
    return metadata

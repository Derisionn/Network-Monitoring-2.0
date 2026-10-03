import logging

logger = logging.getLogger(__name__)

GARBAGE_BLACKLIST = [
    "WAN Miniport",
    "Npcap",
    "QoS Packet",
    "WFP Native MAC Layer",
    "Filter Driver",
    "Loopback",
    "Bluetooth Device",
    "6to4 Adapter",
    "Teredo Tunneling",
    "IP-HTTPS Platform",
    "Kernel Debug Network",
    "RAS Async",
    "Remote NDIS",
    "Apple Mobile Device",
    "WFP 802.3 MAC Layer"
]

def clean_and_filter_interfaces(raw_interfaces: dict) -> dict:
    """
    Normalizes interface names and drops garbage virtual adapters or unused ports.
    """
    filtered = {}
    for raw_name, data in raw_interfaces.items():
        # 1. Normalization
        clean_name = raw_name.replace('\x00', '')  # Remove null terminators
        clean_name = clean_name.replace('[R]', '(R)')  # Unify WMI and SNMP registered trademark
        clean_name = clean_name.strip()
        
        # 2. Blacklist Check
        is_garbage = any(blacklisted.lower() in clean_name.lower() for blacklisted in GARBAGE_BLACKLIST)
        if is_garbage:
            continue
            
        # Extract metrics
        status = data.get("Status", "UP")
        in_octets = int(data.get("InOctets", data.get("In", 0)))
        
        # 3. Dead Port Rule
        if status == "DOWN" and in_octets == 0:
            continue
            
        # It survived!
        filtered[clean_name] = data
        
    return filtered

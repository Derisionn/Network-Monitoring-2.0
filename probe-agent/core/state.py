import threading
from typing import Dict, List, Any

CURRENT_TASKS: List[Dict[str, Any]] = []
CONFIG_VERSION: str = ""
DISCOVERED_DEVICES_CACHE = set()
STATIC_POLLED_DEVICES = set()
CURRENT_PENDING_SUBNET = None

TASKS_LOCK = threading.Lock()

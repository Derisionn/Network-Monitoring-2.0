import os
import json
import logging
import threading
from typing import Dict, Any

from core.polling import long_polling_loop
from core.executor import monitoring_loop

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger(__name__)

AGENT_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_FILE = os.path.join(AGENT_DIR, "probe_config.json")

def load_config() -> Dict[str, Any]:
    with open(CONFIG_FILE, "r") as f:
        return json.load(f)

if __name__ == "__main__":
    agent_config = load_config()
    
    # Start the background monitoring loop
    monitor_thread = threading.Thread(target=monitoring_loop, args=(agent_config,), daemon=True)
    monitor_thread.start()
    
    # Start the long polling loop (blocks main thread)
    long_polling_loop(agent_config)

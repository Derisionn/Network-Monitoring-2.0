import sqlite3
import json
import logging
import os
from typing import Dict, Any

logger = logging.getLogger(__name__)

AGENT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_FILE = os.path.join(AGENT_DIR, "offline_queue.db")

def init_db():
    with sqlite3.connect(DB_FILE) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS telemetry_queue (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                payload TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.commit()

def save_to_offline_queue(payload: Dict[str, Any]):
    try:
        with sqlite3.connect(DB_FILE) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM telemetry_queue")
            count = cursor.fetchone()[0]
            if count >= 50000:
                cursor.execute("""
                    DELETE FROM telemetry_queue 
                    WHERE id IN (
                        SELECT id FROM telemetry_queue 
                        ORDER BY created_at ASC 
                        LIMIT 5000
                    )
                """)
            conn.execute("INSERT INTO telemetry_queue (payload) VALUES (?)", (json.dumps(payload),))
            conn.commit()
    except Exception as e:
        logger.error(f"Failed to save to offline queue: {e}")

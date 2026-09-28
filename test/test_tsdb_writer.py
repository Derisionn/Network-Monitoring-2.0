import datetime
import uuid
import logging
import sys
import os

# Ensure we can import the monolithic-core app module
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'monolithic-core')))

from cassandra.cqlengine import connection
from cassandra.cqlengine.management import sync_table
from app.database import tsdb_writer
from app.models.tsdb import MonitoringResult, DeviceMetric
from app.config.database import init_cassandra

logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

def test_tsdb_writer():
    logger.info("1. Connecting to Cassandra Database...")
    
    try:
        init_cassandra()
        logger.info("Connected and synced Cassandra tables successfully!")
    except Exception as e:
        logger.error(f"Could not connect to Cassandra: {e}")
        logger.info("Please make sure your Cassandra server is running locally before running this test.")
        return

    # Generate a fake device ID for testing
    device_id = str(uuid.uuid4())
    now = datetime.datetime.utcnow()

    logger.info(f"\n2. Testing TSDB Writer for Dummy Device: {device_id}")

    try:
        # --- TEST 1: Save ICMP (Ping) Result ---
        logger.info("-> Testing: save_icmp_result()...")
        tsdb_writer.save_icmp_result(
            device_id=device_id,
            status="UP",
            latency_ms=15.2,
            packet_loss=0.0,
            recorded_at=now
        )
        logger.info("   [SUCCESS] Saved ICMP Result")

        # --- TEST 2: Save Raw Interface Metrics ---
        logger.info("-> Testing: save_raw_interface_metrics()...")
        tsdb_writer.save_raw_interface_metrics(
            device_id=device_id,
            iface="eth0",
            curr_in=1500000.0,
            curr_out=500000.0,
            recorded_at=now
        )
        logger.info("   [SUCCESS] Saved Raw Interface Metrics")

        # --- TEST 3: Save Calculated Interface Metrics ---
        logger.info("-> Testing: save_calculated_interface_metrics()...")
        tsdb_writer.save_calculated_interface_metrics(
            device_id=device_id,
            iface="eth0",
            download_mbps=12.5,
            upload_mbps=4.2,
            utilization=45.5,
            status="UP",
            recorded_at=now
        )
        logger.info("   [SUCCESS] Saved Calculated Interface Metrics")

        # --- TEST 4: Save System Metrics ---
        logger.info("-> Testing: save_system_metrics()...")
        tsdb_writer.save_system_metrics(
            device_id=device_id,
            cpu_usage=25.4,
            memory_usage=68.1,
            disk_usage=45.0,
            recorded_at=now
        )
        logger.info("   [SUCCESS] Saved System Metrics")
        
        logger.info("\n🎉 ALL TESTS PASSED! Data successfully written to Cassandra.")
        
    except Exception as e:
        logger.error(f"\n❌ FAILED TO WRITE TO CASSANDRA: {e}")

if __name__ == "__main__":
    test_tsdb_writer()

import logging
import sys
import os

# Ensure we can import the monolithic-core app module
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'monolithic-core')))

from app.database import tsdb_writer
from app.models.tsdb import MonitoringResult, DeviceMetric
from app.config.database import init_cassandra

logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

def test_tsdb_reader():
    logger.info("1. Connecting to Cassandra Database...")
    try:
        init_cassandra()
        logger.info("Connected successfully!")
    except Exception as e:
        logger.error(f"Could not connect to Cassandra: {e}")
        return

    logger.info("\n2. Fetching recent Monitoring Results (ICMP)...")
    results = MonitoringResult.objects.limit(5)
    if not results:
        logger.info("No MonitoringResult data found.")
    else:
        for res in results:
            logger.info(f" - Device ID: {res.device_id}, Status: {res.status}, Latency: {res.latency_ms}ms, Recorded at: {res.recorded_at}")

    logger.info("\n3. Fetching recent Device Metrics...")
    metrics = DeviceMetric.objects.limit(5)
    if not metrics:
        logger.info("No DeviceMetric data found.")
    else:
        for metric in metrics:
            logger.info(f" - Device ID: {metric.device_id}, Metric: {metric.metric_name}, Sub-Entity: {metric.sub_entity}, Value: {metric.metric_value}, Recorded at: {metric.recorded_at}")

    logger.info("\n🎉 Reading data from Cassandra was successful!")

if __name__ == "__main__":
    test_tsdb_reader()

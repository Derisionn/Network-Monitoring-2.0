from sqlalchemy import Column, String, Integer, DateTime, Boolean, JSON, UniqueConstraint, ForeignKey, Index
from app.config.metadata_db import Base
import datetime
import uuid

class Probe(Base):
    __tablename__ = "probes"
    
    id = Column(String, primary_key=True) # e.g., 'london-agent'
    name = Column(String, nullable=True) # e.g., 'Auto-Registered Agent'
    location = Column(String, nullable=True)
    last_heartbeat = Column(DateTime, nullable=True, default=None)
    agent_version = Column(String, default="v1.0.0")
    is_active = Column(Boolean, default=True)
    pending_scan_subnet = Column(String, nullable=True)
    last_scan_results = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Device(Base):
    __tablename__ = "devices"
    
    __table_args__ = (
        Index('uix_active_ip', 'ip_address', unique=True, postgresql_where=(Column('is_deleted') == False)),
    )
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    probe_id = Column(String, ForeignKey("probes.id"), nullable=False, default="default-agent", index=True)
    name = Column(String, nullable=False, index=True)
    ip_address = Column(String, nullable=False, index=True)
    mac_address = Column(String, nullable=True)
    
    # Matches frontend categories (Server, Network Device, Database, etc.)
    hardware_category = Column(String, nullable=False)
    hardware_model = Column(String, nullable=True)
    location = Column(String, nullable=True)
    
    # "unknown", "up", "down"
    status = Column(String, nullable=False, default="unknown")
    
    # JSON field for storing SSH credentials, ICMP polling intervals, etc.
    protocol_config = Column(JSON, nullable=True)
    
    # List of protocols detected by deep discovery scan (e.g. ["icmp", "snmp", "wmi"])
    supported_protocols = Column(JSON, nullable=True)
    
    # Cached static SNMP info (so frontend doesn't need to query Cassandra for static labels)
    os_description = Column(String, nullable=True)
    system_hostname = Column(String, nullable=True)
    
    # Flag to trigger a manual deep discovery scan by the probe agent
    pending_discovery = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    is_deleted = Column(Boolean, default=False, nullable=False)

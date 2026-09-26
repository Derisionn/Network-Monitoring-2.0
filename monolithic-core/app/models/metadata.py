from sqlalchemy import Column, String, Integer, DateTime, Boolean
from app.config.metadata_db import Base
import datetime
import uuid

class Device(Base):
    __tablename__ = "devices"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, index=True)
    ip_address = Column(String, unique=True, index=True)
    
    # Specific bandwidth limit for this client's Leased Line
    # This completely replaces the global hardcoded limit!
    provisioned_bw_mbps = Column(Integer, default=100)
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

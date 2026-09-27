from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # Cassandra Database Config
    CASSANDRA_HOSTS: str = "127.0.0.1"
    CASSANDRA_KEYSPACE: str = "network_monitoring"
    CASSANDRA_REPLICATION_FACTOR: int = 1
    CASSANDRA_CLIENT_ID: Optional[str] = None
    CASSANDRA_CLIENT_SECRET: Optional[str] = None
    CASSANDRA_SECURE_BUNDLE_PATH: Optional[str] = None
    
    # Global Bandwidth Cap (in Megabits per second)
    TOTAL_ILL_BW_MBPS: int = 100
    
    # Supabase Metadata Database Config
    SUPABASE_DB_URL: str = "sqlite:///./metadata.db" # Default fallback

    class Config:
        env_file = ".env"

settings = Settings()

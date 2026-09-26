from fastapi import FastAPI
from app.api import ingestion
from app.api import query_engine
from app.api import metadata
from app.config.database import init_cassandra
from app.config.metadata_db import engine, Base as MetadataBase

# Initialize Cassandra Connection on Startup
init_cassandra()

# Initialize Metadata Relational DB on Startup
MetadataBase.metadata.create_all(bind=engine)

app = FastAPI(title="Network Monitoring - Monolithic Core (Cassandra TSDB)")

# Register the routers
app.include_router(ingestion.router, prefix="/api/v1")
app.include_router(query_engine.router, prefix="/api/v1/query")
app.include_router(metadata.router, prefix="/api/v1/metadata")

@app.get("/")
def health_check():
    return {"status": "Monolithic Core is running!", "tsdb": "Cassandra"}

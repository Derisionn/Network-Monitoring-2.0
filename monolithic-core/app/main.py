from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.api import query_engine
from app.api import metadata
from app.api import ingestion
from app.config.database import init_cassandra
from app.config.metadata_db import engine, Base as MetadataBase

# Initialize Cassandra Connection on Startup
init_cassandra()

# Initialize Metadata Relational DB on Startup
MetadataBase.metadata.create_all(bind=engine)

app = FastAPI(title="Network Monitoring - Monolithic Core (Cassandra TSDB)")

# Mount static directory for agent installation scripts
app.mount("/static", StaticFiles(directory="static"), name="static")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register the routers
app.include_router(query_engine.router, prefix="/api/v1/query")
app.include_router(metadata.router, prefix="/api/v1/metadata")
app.include_router(ingestion.router, prefix="/api/v1/ingestion")

@app.get("/health")
def health_check():
    return {"status": "Monolithic Core is running!", "tsdb": "Cassandra"}

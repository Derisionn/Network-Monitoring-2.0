from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config.settings import settings

# Uses the Supabase PostgreSQL URL from .env
engine = create_engine(settings.SUPABASE_DB_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_metadata_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

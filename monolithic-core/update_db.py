import sys
import os

# Add monolithic-core to python path so it can import app.config
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.config.metadata_db import engine
from sqlalchemy import text

def add_column():
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE devices ADD COLUMN supported_protocols JSON;"))
            conn.commit()
            print("Successfully added 'supported_protocols' column to 'devices' table!")
        except Exception as e:
            if "already exists" in str(e).lower() or "duplicate column" in str(e).lower():
                print("Column 'supported_protocols' already exists. We are good to go!")
            else:
                print(f"Error: {e}")

if __name__ == "__main__":
    add_column()

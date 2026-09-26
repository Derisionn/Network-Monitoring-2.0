import os
import psycopg2
from psycopg2 import OperationalError

def test_supabase_connection():
    # Read the .env file directly to get the URL
    env_path = os.path.join(os.path.dirname(__file__), '..', 'monolithic-core', '.env')
    db_url = None
    
    try:
        with open(env_path, 'r') as f:
            for line in f:
                if line.startswith('SUPABASE_DB_URL='):
                    db_url = line.strip().split('=', 1)[1]
                    break
    except FileNotFoundError:
        print(f"❌ Could not find .env file at {env_path}")
        return

    if not db_url:
        print("❌ SUPABASE_DB_URL not found in .env file!")
        return

    print(f"🔄 Attempting to connect to Supabase...")
    
    try:
        # Establish the connection
        connection = psycopg2.connect(db_url)
        
        # Create a cursor object
        cursor = connection.cursor()
        
        # Execute a simple query
        cursor.execute("SELECT version();")
        
        # Fetch the result
        record = cursor.fetchone()
        
        print("\n✅ Connection Successful!")
        print(f"📊 PostgreSQL Version: {record[0]}")
        
    except OperationalError as e:
        print("\n❌ Connection Failed!")
        print(f"Error details: {e}")
        print("\nTroubleshooting tips:")
        print("1. Did you use the Session Pooler URL?")
        print("2. Did you replace [your-password] with your actual database password?")
        print("3. Check if there are any trailing spaces in the URL.")
    finally:
        if 'connection' in locals() and connection:
            cursor.close()
            connection.close()
            print("\n🔒 Connection closed.")

if __name__ == "__main__":
    test_supabase_connection()

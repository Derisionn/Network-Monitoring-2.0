import os
from cassandra.cluster import Cluster
from cassandra.auth import PlainTextAuthProvider

def test_cassandra_connection():
    env_path = os.path.join(os.path.dirname(__file__), '..', 'monolithic-core', '.env')
    
    config = {}
    try:
        with open(env_path, 'r') as f:
            for line in f:
                if '=' in line and not line.startswith('#'):
                    key, val = line.strip().split('=', 1)
                    config[key] = val.strip('"\'')
    except FileNotFoundError:
        print(f"❌ Could not find .env file at {env_path}")
        return

    client_id = config.get('CASSANDRA_CLIENT_ID')
    client_secret = config.get('CASSANDRA_CLIENT_SECRET')
    bundle_path = config.get('CASSANDRA_SECURE_BUNDLE_PATH')
    
    if not all([client_id, client_secret, bundle_path]):
        print("❌ Missing required Cassandra credentials in .env file.")
        print("Please ensure CASSANDRA_CLIENT_ID, CASSANDRA_CLIENT_SECRET, and CASSANDRA_SECURE_BUNDLE_PATH are set.")
        return

    # The bundle path in .env is just the filename, we need the absolute path
    # assuming the zip file is in monolithic-core/
    abs_bundle_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'monolithic-core', bundle_path))
    
    if not os.path.exists(abs_bundle_path):
        print(f"❌ Secure Connect Bundle not found at:")
        print(f"   {abs_bundle_path}")
        print("Please make sure you moved the .zip file to the monolithic-core folder!")
        return

    print("🔄 Attempting to connect to Astra DB (Cassandra)...")

    try:
        cloud_config = {
            'secure_connect_bundle': abs_bundle_path
        }
        # For Astra DB, the Client ID acts as the username and Client Secret as the password
        auth_provider = PlainTextAuthProvider(client_id, client_secret)
        
        cluster = Cluster(cloud=cloud_config, auth_provider=auth_provider)
        session = cluster.connect()
        
        row = session.execute("SELECT release_version FROM system.local").one()
        if row:
            print("\n✅ Connection Successful!")
            print(f"📊 Cassandra Version: {row[0]}")
            
    except Exception as e:
        print(f"\n❌ Connection Failed: {e}")
    finally:
        if 'cluster' in locals():
            cluster.shutdown()
            print("\n🔒 Connection closed.")

if __name__ == "__main__":
    test_cassandra_connection()

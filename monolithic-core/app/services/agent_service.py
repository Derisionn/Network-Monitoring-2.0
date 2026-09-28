import io
import zipfile
import os

def generate_agent_package(probe_id: str, backend_url: str) -> io.BytesIO:
    """
    Generates a ZIP file containing a pre-configured probe_config.json
    and the probe agent executable (if it exists).
    """
    zip_buffer = io.BytesIO()
    
    with zipfile.ZipFile(zip_buffer, "a", zipfile.ZIP_DEFLATED, False) as zip_file:
        # Create a pre-configured config file
        config_content = f"""{{
  "server_url": "{backend_url}",
  "probe_api_key": "{probe_id}",
  "poll_interval_seconds": 60
}}"""
        zip_file.writestr("probe_config.json", config_content)
        
        # Optionally, include the agent executable if it exists in the build directory
        # Adjust path as necessary based on your project structure
        agent_exe_path = os.path.join(os.path.dirname(__file__), "../../../probe-agent/dist/agent.exe")
        if os.path.exists(agent_exe_path):
            zip_file.write(agent_exe_path, "agent.exe")
            
    zip_buffer.seek(0)
    return zip_buffer

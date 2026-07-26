import time
import json
import random
import logging
import requests
import sys

# ==========================================
# Dynamic Edge Telemetry Agent (Option 2)
# Simulates an edge network polling machine PLCs and sending data via HTTP API
# ==========================================
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("EdgeAgent")

def print_banner():
    print(r"""
    ================================================
       MANUFACTURING EDGE TELEMETRY AGENT (v2.0)
       Dynamic Scale API Integration
    ================================================
    """)

print_banner()

# 1. Ask for API Gateway URL
API_URL = input("Enter your AWS API Gateway URL (e.g., https://xyz.execute-api.region.amazonaws.com/prod): ").strip()
if not API_URL:
    logger.error("API URL is required.")
    sys.exit(1)

# Remove trailing slash if present
if API_URL.endswith('/'):
    API_URL = API_URL[:-1]

NUM_MACHINES = 25
machines = {}

# 2. Generate initial machine states dynamically
logger.info(f"Initializing {NUM_MACHINES} Edge Nodes on the factory floor...")
for i in range(1, NUM_MACHINES + 1):
    machine_id = f"EDGE-NODE-{i:03d}"
    
    # Spread coordinates around the grid (x: 10-90, y: 10-90)
    x = random.randint(10, 90)
    y = random.randint(10, 90)
    
    # Base baseline telemetry
    machines[machine_id] = {
        "name": f"High-Temp Plasma Reactor {i:03d}",
        "location": f"Sector {random.choice(['A','B','C','D'])} - Bay {random.randint(1, 10)}",
        "x": x,
        "y": y,
        "base_temp": random.uniform(40.0, 60.0),
        "vibration_hz": random.uniform(1.0, 3.0),
        "wear_rate": random.uniform(0.1, 0.5),
        "power_on": True,
        "firmware": random.choice(["v3.1.0-stable", "v3.1.1-edge", "v3.0.9"]),
        "ip_address": f"10.240.{random.randint(10,30)}.{random.randint(2,254)}"
    }

logger.info("Starting continuous telemetry polling... Press Ctrl+C to stop.")

try:
    while True:
        # We will loop through the machines and send telemetry updates
        for machine_id, state in machines.items():
            
            if not state["power_on"]:
                status = "OFFLINE"
                temperature = 25.0
                power_output = 0.0
                vibration = 0.0
            else:
                # Normal operational drift
                temperature = round(state["base_temp"] + random.uniform(-2.0, 5.0), 2)
                power_output = round(random.uniform(90.0, 110.0), 2)
                rpm = int(random.uniform(9800, 12500))
                
                # Predictive Maintenance (Gradual Wear)
                state["vibration_hz"] += random.uniform(0, state["wear_rate"])
                vibration = round(state["vibration_hz"], 2)
                
                status = "HEALTHY"

                # Check if threshold crossed
                if vibration > 15.0:
                    status = "PREDICTIVE_MAINTENANCE_REQUIRED"
                    logger.warning(f"PREDICTIVE ALERT for {machine_id}! High Vibration: {vibration}Hz")
                    state["vibration_hz"] = 2.0 # Reset after triggering to simulate maintenance

                # Random critical failures
                anomaly_chance = random.random()
                if anomaly_chance > 0.985: # 1.5% chance per tick
                    temperature = round(random.uniform(96.0, 115.0), 2)
                    status = "CRITICAL_WARNING"
                    logger.error(f"OVERHEAT ALERT for {machine_id}! Temp: {temperature}C")
                elif anomaly_chance < 0.005: # 0.5% chance per tick
                    power_output = 0.0
                    rpm = 0
                    status = "ERROR_POWER_LOSS"
                    logger.error(f"POWER FAILURE for {machine_id}!")

            # Prepare the payload
            payload = {
                "machine_id": machine_id,
                "name": state["name"],
                "location": state["location"],
                "x": state["x"],
                "y": state["y"],
                "status": status,
                "temperature": temperature,
                "vibration": vibration,
                "power_kw": power_output,
                "rpm": rpm,
                "firmware": state["firmware"],
                "ip_address": state["ip_address"]
            }

            # POST to the AWS API
            endpoint = f"{API_URL}/telemetry"
            try:
                # We use a short timeout so we don't stall the loop if internet is slow
                response = requests.post(endpoint, json=payload, timeout=5)
                if response.status_code != 200:
                    logger.error(f"API Error {response.status_code}: {response.text}")
            except requests.exceptions.RequestException as e:
                logger.error(f"Network error sending telemetry for {machine_id}: {e}")

            # Only log if anomaly to keep console clean, or log rarely
            if status != "HEALTHY" or random.random() > 0.95: 
                logger.info(f"Published {machine_id} | Status: {status} | Temp: {temperature}C")

            time.sleep(0.5) # Sleep briefly between nodes to spread out network requests

        logger.info("--- Polling cycle complete. Waiting 10 seconds ---")
        time.sleep(10)

except KeyboardInterrupt:
    logger.info("Edge agent stopped by user.")
    sys.exit(0)

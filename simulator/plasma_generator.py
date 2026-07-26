import time
import json
import random
import logging
from AWSIoTPythonSDK.MQTTLib import AWSIoTMQTTClient

# ==========================================
# Manufacturing Plasma Generator Simulator (Phase 2)
# ==========================================
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("Mfg-Plasma-Simulator")

# --- CONFIGURATION ---
ENDPOINT = "a1xxawhrp0c7fa-ats.iot.ap-south-1.amazonaws.com"
CLIENT_ID = "Mfg-Simulator-Node-1"
TOPIC = "mfg/factory/plasma-generators"
PATH_TO_ROOT_CA = "certs/root-CA.crt"
PATH_TO_PRIVATE_KEY = "certs/private.pem.key"
PATH_TO_CERTIFICATE = "certs/certificate.pem.crt"

mqtt_client = AWSIoTMQTTClient(CLIENT_ID)
mqtt_client.configureEndpoint(ENDPOINT, 8883)
mqtt_client.configureCredentials(PATH_TO_ROOT_CA, PATH_TO_PRIVATE_KEY, PATH_TO_CERTIFICATE)

logger.info(f"Connecting to AWS IoT Core at {ENDPOINT}...")
try:
    mqtt_client.connect()
    logger.info("Successfully connected!")
except Exception as e:
    logger.error(f"Failed to connect: {e}")
    exit(1)

# Initialize Machine States (For Predictive Maintenance Simulation)
machines = {
    "PLASMA-GEN-001": {"vibration_hz": 40.0, "wear_rate": 0.5},
    "PLASMA-GEN-002": {"vibration_hz": 45.0, "wear_rate": 1.2}, # Wears out faster
    "PLASMA-GEN-003": {"vibration_hz": 38.0, "wear_rate": 0.2}
}

logger.info("Starting telemetry simulation... Press Ctrl+C to stop.")

try:
    while True:
        for machine_id, state in machines.items():
            # Simulate normal metrics
            temperature = round(random.uniform(60.0, 85.0), 2)
            power_output = round(random.uniform(95.0, 105.0), 2)
            
            # --- PHASE 2: PREDICTIVE MAINTENANCE ---
            # Slowly increase vibration over time to simulate bearing wear
            state["vibration_hz"] += random.uniform(0, state["wear_rate"])
            vibration = round(state["vibration_hz"], 2)
            
            status = "NORMAL"

            if vibration > 120.0:
                status = "PREDICTIVE_MAINTENANCE_REQUIRED"
                logger.warning(f"PREDICTIVE ALERT for {machine_id}! High Vibration: {vibration}Hz")
                # Reset wear after maintenance ticket is created so it doesn't spam
                state["vibration_hz"] = 40.0 

            # Random critical failures
            anomaly_chance = random.random()
            if anomaly_chance > 0.96:
                temperature = round(random.uniform(96.0, 110.0), 2)
                status = "CRITICAL_WARNING"
                logger.error(f"OVERHEAT ALERT for {machine_id}! Temp: {temperature}C")
            elif anomaly_chance < 0.02:
                power_output = 0.0
                status = "ERROR_POWER_LOSS"
                logger.error(f"POWER FAILURE for {machine_id}!")

            payload = {
                "machine_id": machine_id,
                "timestamp": int(time.time()),
                "temperature_celsius": temperature,
                "power_output_kw": power_output,
                "vibration_hz": vibration,
                "status": status
            }

            mqtt_client.publish(TOPIC, json.dumps(payload), 1)
            logger.info(f"Published to {TOPIC} | Status: {status}")

            time.sleep(2)

        logger.info("--- Waiting 10 seconds for next polling cycle ---")
        time.sleep(10)

except KeyboardInterrupt:
    logger.info("Simulation stopped by user.")
    mqtt_client.disconnect()

import time
import json
import random
import logging
from AWSIoTPythonSDK.MQTTLib import AWSIoTMQTTClient

# ==========================================
# Manufacturing Plasma Generator Simulator (Phase 3)
# ==========================================
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("Mfg-Plasma-Simulator")

# --- CONFIGURATION ---
ENDPOINT = "a1xxawhrp0c7fa-ats.iot.ap-south-1.amazonaws.com"
CLIENT_ID = "Mfg-Simulator-Node-1"
TOPIC_PUB = "mfg/factory/plasma-generators"
TOPIC_SUB = "mfg/factory/commands/#"
PATH_TO_ROOT_CA = "certs/root-CA.crt"
PATH_TO_PRIVATE_KEY = "certs/private.pem.key"
PATH_TO_CERTIFICATE = "certs/certificate.pem.crt"

# Initialize Machine States (Now with GPS and Shadow states)
machines = {
    "PLASMA-GEN-001": {"vibration_hz": 40.0, "wear_rate": 0.5, "power_on": True, "lat": 37.7749, "lng": -122.4194, "fw_version": "v2.1.0"},
    "PLASMA-GEN-002": {"vibration_hz": 45.0, "wear_rate": 1.2, "power_on": True, "lat": 37.7750, "lng": -122.4180, "fw_version": "v2.1.0"},
    "PLASMA-GEN-003": {"vibration_hz": 38.0, "wear_rate": 0.2, "power_on": True, "lat": 37.7739, "lng": -122.4190, "fw_version": "v2.0.8"}
}

# --- CLOUD-TO-DEVICE CALLBACK ---
def customCallback(client, userdata, message):
    """Listens for commands coming DOWN from the AWS Cloud (API Gateway -> Lambda -> IoT)"""
    topic = message.topic
    payload = json.loads(message.payload.decode('utf-8'))
    logger.info(f"\n[!!!] RECEIVED REMOTE COMMAND on {topic}: {payload}")
    
    command = payload.get("command")
    
    # Extract machine ID from topic (e.g., mfg/factory/commands/PLASMA-GEN-001)
    target_machine = topic.split('/')[-1]
    
    if target_machine in machines:
        if command == "EMERGENCY_STOP":
            logger.warning(f"EXECUTING EMERGENCY SHUTDOWN FOR {target_machine}!")
            machines[target_machine]["power_on"] = False
            machines[target_machine]["vibration_hz"] = 0.0
        elif command == "START":
            logger.info(f"RESTARTING {target_machine}")
            machines[target_machine]["power_on"] = True
            machines[target_machine]["vibration_hz"] = 40.0
        elif command == "OTA_UPDATE":
            logger.info(f"STARTING OTA FIRMWARE UPDATE FOR {target_machine}...")
            time.sleep(2) # Simulate download
            machines[target_machine]["fw_version"] = "v3.0.0-PRO"
            logger.info(f"OTA UPDATE COMPLETE! New firmware: v3.0.0-PRO")

# Initialize MQTT Client
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

# Subscribe to Cloud Commands
mqtt_client.subscribe(TOPIC_SUB, 1, customCallback)
logger.info(f"Subscribed to Cloud Commands on topic: {TOPIC_SUB}")

logger.info("Starting telemetry simulation... Press Ctrl+C to stop.")

try:
    while True:
        for machine_id, state in machines.items():
            
            if not state["power_on"]:
                # Machine is off (either from Emergency Stop or it hasn't been restarted)
                status = "OFFLINE"
                temperature = 25.0 # Room temp
                power_output = 0.0
                vibration = 0.0
            else:
                # Simulate normal metrics
                temperature = round(random.uniform(60.0, 85.0), 2)
                power_output = round(random.uniform(95.0, 105.0), 2)
                
                # Predictive Maintenance (Gradual Wear)
                state["vibration_hz"] += random.uniform(0, state["wear_rate"])
                vibration = round(state["vibration_hz"], 2)
                
                status = "NORMAL"

                if vibration > 120.0:
                    status = "PREDICTIVE_MAINTENANCE_REQUIRED"
                    logger.warning(f"PREDICTIVE ALERT for {machine_id}! High Vibration: {vibration}Hz")
                    state["vibration_hz"] = 40.0 # Reset after triggering

                # Random critical failures
                anomaly_chance = random.random()
                if anomaly_chance > 0.97:
                    temperature = round(random.uniform(96.0, 110.0), 2)
                    status = "CRITICAL_WARNING"
                    logger.error(f"OVERHEAT ALERT for {machine_id}! Temp: {temperature}C")
                elif anomaly_chance < 0.02:
                    power_output = 0.0
                    status = "ERROR_POWER_LOSS"
                    logger.error(f"POWER FAILURE for {machine_id}!")

            # Phase 3 Payload with GPS and Firmware
            payload = {
                "machine_id": machine_id,
                "timestamp": int(time.time()),
                "temperature_celsius": temperature,
                "power_output_kw": power_output,
                "vibration_hz": vibration,
                "status": status,
                "latitude": state["lat"],
                "longitude": state["lng"],
                "firmware": state["fw_version"]
            }

            mqtt_client.publish(TOPIC_PUB, json.dumps(payload), 1)
            # Only log if it's active or there is a state change to avoid spam
            if status != "OFFLINE" or random.random() > 0.9: 
                logger.info(f"Published to {TOPIC_PUB} | Status: {status}")

            time.sleep(2)

        logger.info("--- Waiting 10 seconds for next polling cycle ---")
        time.sleep(10)

except KeyboardInterrupt:
    logger.info("Simulation stopped by user.")
    mqtt_client.disconnect()

import time
import json
import random
import threading
import requests
import asyncio
import websockets
import os
from flask import Flask
from datetime import datetime

# ==============================================================
# CONFIGURATION
# ==============================================================
# First try to get them from standard environment variables (Render/Vercel)
API_URL = os.environ.get("VITE_API_URL", "")
WS_URL = os.environ.get("VITE_WS_URL", "")

# If not found (e.g. running locally), fallback to reading the frontend/.env file directly
if not API_URL or not WS_URL:
    env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'frontend', '.env'))
    try:
        with open(env_path, 'r') as f:
            for line in f:
                if line.startswith('VITE_API_URL='):
                    API_URL = line.split('=', 1)[1].strip()
                elif line.startswith('VITE_WS_URL='):
                    WS_URL = line.split('=', 1)[1].strip()
    except Exception as e:
        print(f"WARNING: Could not read {env_path}. Make sure it exists!")

if not API_URL.endswith('/telemetry') and API_URL:
    API_URL = API_URL.rstrip('/') + '/telemetry'
NUM_MACHINES = 25
POLL_INTERVAL_SECONDS = 10

# ... (We will define machine classes and states here) ...
# Due to length constraints, I'll provide a simplified robust version.
print("Starting Enterprise Bi-Directional Edge Simulator...")

class EdgeMachine:
    def __init__(self, id_num):
        self.machine_id = f"EDGE-NODE-{id_num:03d}"
        self.status = "HEALTHY"
        self.temperature = random.uniform(40, 50)
        self.vibration = random.uniform(1.0, 3.0)
        self.power_kw = random.uniform(4.5, 5.5)
        self.rpm = random.randint(1400, 1500)
        self.is_running = True
        self.x = random.randint(10, 90)
        self.y = random.randint(10, 90)
        self.locked_error = False
        self.firmware = random.choice(['v2.4.1', 'v2.4.2', 'v2.4.5', 'v3.0.1-beta'])
        self.ip_address = f"192.168.10.{100 + id_num}"

        # ── Demo nodes: diverse failure modes for presentation ──
        if id_num == 3:
            self.status = "CRITICAL_OVERHEAT"
            self.temperature = 108.0
            self.locked_error = True
        elif id_num == 7:
            self.status = "ERROR_POWER_LOSS"
            self.power_kw = 0.0
            self.rpm = 0
            self.is_running = False
            self.locked_error = True
        elif id_num == 11:
            self.status = "WARNING_HIGH_VIBRATION"
            self.vibration = 9.4
            self.temperature = 71.0
            self.locked_error = True
        elif id_num == 15:
            self.status = "WARNING_COOLANT_TEMP"
            self.temperature = 83.0
            self.locked_error = True
        elif id_num == 19:
            self.status = "ERROR_SENSOR_FAILURE"
            self.vibration = 0.0  # Sensor reads zero — failure
            self.locked_error = True
        elif id_num == 22:
            self.status = "WARNING_BEARING_WEAR"
            self.vibration = 7.1
            self.rpm = 1100  # Sluggish RPM
            self.locked_error = True
        elif id_num == 24:
            self.status = "PREDICTIVE_MAINTENANCE_DUE"
            self.temperature = 78.0
            self.vibration = 5.5
            self.locked_error = True
        elif id_num == 5:
            self.status = "ERROR_COMM_TIMEOUT"
            self.power_kw = 0.1
            self.locked_error = True

    def process_command(self, cmd):
        print(f"\n[!] C2D COMMAND RECEIVED at {self.machine_id}: {cmd}")
        if cmd == 'STOP':
            self.status = "OFFLINE"
            self.is_running = False
            self.power_kw = 0
            self.rpm = 0
            self.temperature = 20
        elif cmd == 'START':
            self.status = "HEALTHY"
            self.is_running = True
        elif cmd == 'RESOLVE_ISSUE':
            # Expert has resolved the issue on the floor!
            # Unlock the error state and heal the machine telemetry.
            self.locked_error = False
            self.status = "HEALTHY"
            self.is_running = True
            self.temperature = random.uniform(40, 50)
            self.vibration = random.uniform(1.0, 3.0)
            self.power_kw = random.uniform(4.5, 5.5)
            self.rpm = random.randint(1400, 1500)
            self.immune_until = time.time() + 120
            print(f"[*] {self.machine_id} has been physically repaired and is IMMUNE to failure for 120s.")

    def tick(self):
        if self.locked_error:
            return  # Keep demo error nodes locked in their error state
        if not self.is_running:
            return

        is_immune = hasattr(self, 'immune_until') and time.time() < self.immune_until

        if is_immune:
            # Machine was just repaired, keep it running smoothly
            self.temperature = random.uniform(40, 50)
            self.vibration = random.uniform(1.0, 3.0)
        else:
            # Simulate normal wear and tear
            self.temperature += random.uniform(-1, 1.5)
            self.vibration += random.uniform(-0.1, 0.15)

        if self.temperature > 95:
            self.status = "CRITICAL_OVERHEAT"
        elif self.temperature > 80:
            self.status = "WARNING_TEMP"
        elif self.vibration > 8:
            self.status = "CRITICAL_VIBRATION"
        else:
            self.status = "HEALTHY"

        # Random sudden failure (0.5% chance per tick)
        if not is_immune and random.random() < 0.005:
            self.status = "ERROR_POWER_LOSS"
            self.power_kw = 0
            self.is_running = False

    def to_dict(self):
        return {
            "machine_id": self.machine_id,
            "status": self.status,
            "temperature": round(self.temperature, 2),
            "vibration": round(self.vibration, 2),
            "power_kw": round(self.power_kw, 2),
            "rpm": self.rpm,
            "x": self.x,
            "y": self.y,
            "firmware": self.firmware,
            "ip_address": self.ip_address
        }

machines = [EdgeMachine(i+1) for i in range(NUM_MACHINES)]

# --- WEBSOCKET C2D LISTENER ---
async def listen_for_commands():
    if not WS_URL: return
    
    # We connect as an "Operator" for all machines to listen to their commands
    # In a real setup, each machine runs its own script. Here we mock all 25.
    try:
        async with websockets.connect(f"{WS_URL}?role=EdgeSimulator") as ws:
            print("WebSocket Connected! Listening for Admin C2D commands...")
            async for message in ws:
                data = json.loads(message)
                if data.get('type') == 'C2D_COMMAND':
                    target_id = data.get('machine_id')
                    cmd = data.get('command')
                    for m in machines:
                        if m.machine_id == target_id:
                            m.process_command(cmd)
    except Exception as e:
        print(f"WS Error: {e}")

def run_ws_loop():
    asyncio.run(listen_for_commands())

if WS_URL:
    ws_thread = threading.Thread(target=run_ws_loop, daemon=True)
    ws_thread.start()

# --- REST TELEMETRY INGESTION ---
def run_telemetry_loop():
    while True:
        print(f"\n--- Broadcasting Telemetry for {NUM_MACHINES} nodes ---")
        for m in machines:
            m.tick()
            payload = m.to_dict()
            try:
                res = requests.post(API_URL, json=payload, timeout=2)
                if res.status_code != 200:
                    print(f"Post failed {m.machine_id}: {res.text}")
            except Exception as e:
                print(f"Failed to post for {m.machine_id}")
        time.sleep(POLL_INTERVAL_SECONDS)

telemetry_thread = threading.Thread(target=run_telemetry_loop, daemon=True)
telemetry_thread.start()

# --- FLASK WEB SERVER FOR RENDER ---
app = Flask(__name__)

@app.route('/')
@app.route('/ping')
def ping():
    return "200 OK - Simulator is alive", 200

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    app.run(host="0.0.0.0", port=port)

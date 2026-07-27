import time
import json
import random
import threading
import requests
import asyncio
import websockets
from datetime import datetime

# ==============================================================
# CONFIGURATION
# ==============================================================
API_URL_INPUT = input("Enter your REST API Gateway URL: ").strip()
if not API_URL_INPUT.endswith('/telemetry'):
    API_URL = API_URL_INPUT.rstrip('/') + '/telemetry'
else:
    API_URL = API_URL_INPUT
    
WS_URL = input("Enter your WebSocket API Gateway URL (or press Enter to skip C2D): ").strip()
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
        self.locked_error = False  # If True, tick() won't heal it

        # Force demo nodes into specific states
        if id_num == 3:
            self.status = "CRITICAL_OVERHEAT"
            self.temperature = 108.0
            self.locked_error = True
        elif id_num == 7:
            self.status = "ERROR_POWER_LOSS"
            self.power_kw = 0
            self.rpm = 0
            self.is_running = False
            self.locked_error = True
        elif id_num == 11:
            self.status = "WARNING_TEMP"
            self.temperature = 82.0
        elif id_num == 15:
            self.status = "WARNING_TEMP"
            self.temperature = 85.0

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

    def tick(self):
        if self.locked_error:
            return  # Keep demo error nodes locked in their error state
        if not self.is_running:
            return

        # Simulate wear and tear
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
        if random.random() < 0.005:
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
            "y": self.y
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

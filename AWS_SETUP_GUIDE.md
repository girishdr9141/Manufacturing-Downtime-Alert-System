# Complete AWS Setup Guide: Manufacturing DX Project (Phase 1 & 2)

Follow this guide exactly to build your Manufacturing DX Project on the AWS Free Tier. It includes the new Phase 2 advanced features!

---

## Phase 1: Set up the Database (DynamoDB)
1. Open the AWS Console and search for **DynamoDB**.
2. Click **Create table**.
3. **Table name:** `MfgTelemetryDB`
4. **Partition key:** `machine_id` (String) | **Sort key:** `timestamp` (Number)
5. Click **Create table**.
6. Create a *second* table:
   - **Table name:** `MfgITHelpdeskTickets`
   - **Partition key:** `TicketID` (String)
   - Click **Create table**.

---

## Phase 2: Set up Discord ChatOps (Modern Alerts)
1. Open Discord, create a new free server, and go to **Server Settings > Integrations > Webhooks**.
2. Click **New Webhook**, name it "Manufacturing Alerts", and select a channel.
3. Click **Copy Webhook URL** and save it.

---

## Phase 3: Set up Compute & Ticketing (AWS Lambda)
1. Search for **IAM**. Go to **Roles** -> **Create role** -> **AWS Service** -> **Lambda**.
2. Attach `AmazonDynamoDBFullAccess`, `AmazonSNSFullAccess`, and `AWSLambdaBasicExecutionRole`. Name it `MfgDXLambdaRole`.
3. Search for **Lambda** and click **Create function**.
4. Name: `MfgIncidentHandler`. Runtime: Python 3.9. Use existing role: `MfgDXLambdaRole`.
5. Copy code from `lambda/incident_handler.py` into the editor and **Deploy**.
6. In **Configuration > Environment variables**, add:
   - `DYNAMODB_TICKET_TABLE`: `MfgITHelpdeskTickets`
   - `DISCORD_WEBHOOK_URL`: *(Paste your Discord URL here)*
7. **Create a second Lambda function** named `MfgFetchTickets`. Runtime: Python 3.9. Role: `MfgDXLambdaRole`.
8. Copy code from `lambda/fetch_tickets.py` into the editor and **Deploy**.
9. In **Configuration > Environment variables**, add:
   - `DYNAMODB_TICKET_TABLE`: `MfgITHelpdeskTickets`

---

## Phase 4: Create the API (API Gateway)
We need an API so our beautiful Frontend Web Portal can fetch the tickets securely.
1. Search for **API Gateway** in AWS.
2. Under **REST API** (the one that does NOT say Private), click **Build**.
3. Choose **New API**. Name it `MfgTicketAPI`. Click **Create API**.
4. Click **Create resource**. Resource Name: `tickets`. Click Create.
5. Select the `/tickets` resource. Click **Create method**.
6. Method type: **GET**. Integration type: **Lambda function**. Select `MfgFetchTickets`. Click Create.
7. We must enable CORS for the web browser! Select the `/tickets` resource again, click **Enable CORS** (in the same menu area as Create Method). Check the box for **GET**, leave everything else default, and click Save.
8. Click **Deploy API**. Stage name: `prod`. Click Deploy.
9. At the top of the screen, you will see an **Invoke URL**. It looks like `https://xxx.execute-api.ap-south-1.amazonaws.com/prod`. Add `/tickets` to the end of it and save this full URL.

---

## Phase 5: Set up the Machine Connection (AWS IoT Core)
1. Search for **IoT Core** in AWS.
2. Go to **Manage > All devices > Things**. Click **Create things > Create single thing**.
3. Name: `Mfg-Simulator-Node-1`. Auto-generate a new certificate.
4. Click **Create policy**. Name it `MfgSimulatorPolicy`. JSON document:
   ```json
   { "Version": "2012-10-17", "Statement": [{"Effect": "Allow", "Action": "iot:*", "Resource": "*"}] }
   ```
5. Attach policy and click **Create thing**. Download the 3 certificates to `simulator/certs/` (rename to `certificate.pem.crt`, `private.pem.key`, `root-CA.crt`).
6. In IoT Core **Settings**, copy your **Endpoint**. Paste it into line 14 of `simulator/plasma_generator.py`.

---

## Phase 6: Routing Data (IoT Rules)
1. In IoT Core, click **Message Routing -> Rules**.
2. **Rule 1:** `RouteToDynamoDB` | SQL: `SELECT * FROM 'mfg/factory/plasma-generators'` | Action: DynamoDBv2 -> `MfgTelemetryDB`
3. **Rule 2:** `TriggerAlert` | SQL: `SELECT * FROM 'mfg/factory/plasma-generators' WHERE status = 'CRITICAL_WARNING' OR status = 'ERROR_POWER_LOSS' OR status = 'PREDICTIVE_MAINTENANCE_REQUIRED'` | Action: Lambda -> `MfgIncidentHandler`

---

## Phase 7: Run the Full-Stack Simulation!

1. Open `frontend/index.html` in your web browser by double-clicking it.
2. Paste the **API Gateway Invoke URL** (from Phase 4) into the prompt on the screen.
3. Open your terminal, navigate to the `simulator` folder, and run:
   ```bash
   python plasma_generator.py
   ```
4. Watch the terminal as the vibration slowly climbs. When it hits Predictive Maintenance, or when a random crash occurs:
   - Your Discord will instantly ping you with a beautiful alert card.
   - Your Web Portal will dynamically update and display the new ticket!

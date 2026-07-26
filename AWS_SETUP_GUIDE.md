# Complete AWS Setup Guide: Manufacturing DX Project

## Phase 1: Set up the Database (DynamoDB)
1. Search for **DynamoDB** and click **Create table**.
2. Table name: `MfgITHelpdeskTickets`. Partition key: `TicketID` (String). Click **Create table**.
3. **[PHASE 3 UPDATE]** Create a second table:
   - Table name: `MfgAuditLogs`. Partition key: `Timestamp` (String). Click **Create table**.

## Phase 2: Set up ChatOps (Discord)
1. Go to Discord > Server Settings > Integrations > Webhooks.
2. Click New Webhook, name it "Manufacturing Alerts".
3. Click Copy Webhook URL and save it.

## Phase 3: Set up Cloud Functions (Lambda)
We need to create several Lambda functions to power our APIs.
For ALL of these functions, when creating them, choose **Use an existing role** and select `MfgDXLambdaRole`.

### Function 1: MfgIncidentHandler (Handles incoming alerts)
1. Create function: `MfgIncidentHandler` (Python 3.9).
2. Paste code from `lambda/incident_handler.py`.
3. Under Configuration > Environment variables, add:
   - `DYNAMODB_TICKET_TABLE` = `MfgITHelpdeskTickets`
   - `SNS_TOPIC_ARN` = (Your SNS Topic ARN from earlier)
   - `DISCORD_WEBHOOK_URL` = (Your Discord Webhook URL)

### Function 2: MfgFetchTickets (Read API)
1. Create function: `MfgFetchTickets` (Python 3.9).
2. Paste code from `lambda/fetch_tickets.py`.
3. Add Environment variable: `DYNAMODB_TICKET_TABLE` = `MfgITHelpdeskTickets`

### Function 3: MfgResolveTicket (Interactive API)
1. Create function: `MfgResolveTicket` (Python 3.9).
2. Paste code from `lambda/resolve_ticket.py`.
3. Add Environment variables:
   - `DYNAMODB_TICKET_TABLE` = `MfgITHelpdeskTickets`
   - `AUDIT_TABLE` = `MfgAuditLogs`

### Function 4: MfgSendCommand (Cloud-to-Device IoT API)
1. Create function: `MfgSendCommand` (Python 3.9).
2. Paste code from `lambda/send_command.py`.
3. Add Environment variable: `AUDIT_TABLE` = `MfgAuditLogs`

### Function 5: MfgExportCSV (Data Export API)
1. Create function: `MfgExportCSV` (Python 3.9).
2. Paste code from `lambda/export_csv.py`.
3. Add Environment variables:
   - `DYNAMODB_TICKET_TABLE` = `MfgITHelpdeskTickets`
   - `AUDIT_TABLE` = `MfgAuditLogs`

## Phase 4: Create the REST API Gateway
1. Go to **API Gateway**, find **REST API** (not Private), and click Build.
2. Name it `MfgEnterpriseAPI` and click Create API.

**Create the `/tickets` Resource:**
1. Click **Create resource**, name it `tickets`.
2. Select `/tickets`, click **Create method**. Select **GET**. 
   - Integration type: Lambda function -> `MfgFetchTickets`.
3. Select `/tickets`, click **Create method**. Select **PUT**.
   - Integration type: Lambda function -> `MfgResolveTicket`.

**Create the `/commands` Resource:**
1. Select the root `/`, click **Create resource**, name it `commands`.
2. Select `/commands`, click **Create method**. Select **POST**.
   - Integration type: Lambda function -> `MfgSendCommand`.

**Create the `/export` Resource:**
1. Select the root `/`, click **Create resource**, name it `export`.
2. Select `/export`, click **Create method**. Select **GET**.
   - Integration type: Lambda function -> `MfgExportCSV`.

**Enable CORS and Deploy:**
1. Select the root `/`, click **Enable CORS**, select all methods, click Save.
2. Click **Deploy API**, select `*New Stage*`, type `prod`, click Deploy.
3. Copy the **Invoke URL**!

## Phase 5: Run the Simulation
1. Your frontend is automatically deployed on Vercel via GitHub!
2. Open your Vercel URL.
3. When the Auth Screen appears, paste your **API Gateway Invoke URL**.
4. In your local terminal, run `python simulator/plasma_generator.py`.
5. Watch the dashboard come alive with Maps, Charts, and Remote Commands!

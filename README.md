# ZeroStop Diagnostics: Manufacturing Downtime Alert System

![Build Status](https://img.shields.io/badge/build-passing-brightgreen) ![License](https://img.shields.io/badge/license-MIT-blue) ![Version](https://img.shields.io/badge/version-1.0.0-orange) ![Architecture](https://img.shields.io/badge/architecture-Serverless_AWS-purple)

**ZeroStop Diagnostics** is an enterprise-grade, Zero-Trust secure IoT telemetry platform and Predictive Maintenance dashboard. It is designed to minimize factory downtime, track financial impact in real-time, and execute bi-directional Cloud-to-Device (C2D) commands across a distributed fleet of manufacturing nodes.

---

## 🏗️ System Architecture

The application is built on a highly scalable, event-driven serverless architecture spanning three tiers:

### 1. Edge Tier (IoT Telemetry Agents)
- **Python-based Edge Simulator**: Emulates distributed industrial machines deployed on the factory floor.
- **Bi-Directional Communication**: Broadcasts real-time telemetry (Temperature, Vibration, RPM, Power Draw, Firmware version, IP Address) to the cloud via HTTPS, and maintains a persistent WebSocket connection to listen for C2D commands.
- **Cloud Hosting**: Containerized and hosted on **Render** to simulate a 24/7 continuous edge data stream.

### 2. Cloud Tier (AWS Serverless Backend)
- **AWS API Gateway**: Manages both REST endpoints for data hydration and stateful WebSocket connections for real-time duplex communication.
- **AWS Lambda**: Serverless compute functions written in Python that handle telemetry ingestion, anomaly detection, automated ticket generation, and command routing.
- **Amazon DynamoDB**: High-throughput NoSQL database storing machine states, active maintenance tickets, and historical telemetry for predictive AI modeling.

### 3. Frontend Tier (Command Center UI)
- **Vite + React + TypeScript**: A highly optimized, blazing-fast single-page application.
- **Tailwind CSS**: Custom, responsive, and sleek "dark mode" UI design emphasizing enterprise data visualization.
- **Vercel**: Edge-deployed global hosting for the frontend portal.

---

## ✨ Key Features

* **Real-Time Edge Fleet Grid**  
  A spatial topology map visualizing the exact physical location and live status (HEALTHY, WARNING, CRITICAL) of up to 25 edge nodes simultaneously.

* **Predictive Maintenance AI & Analytics**  
  Real-time data visualization using Recharts to plot telemetry history alongside a dynamically calculated "Failure Probability" score, enabling proactive intervention before catastrophic hardware failure.

* **Bi-Directional C2D Control Panel**  
  Zero-Trust encrypted edge dispatch allowing Administrators to remotely execute commands (Emergency STOP, START, Push OTA Firmware Updates) directly to the physical machines from the web browser.

* **Automated Ticketing System**  
  Intelligent rule engines evaluate telemetry anomalies and automatically generate priority-based IT/Maintenance work orders. Operators can assign experts, log resolution notes, and physically "heal" the edge nodes.

* **Financial Impact Engine**  
  A live calculating widget that quantifies the real-time factory revenue lost (in USD, JPY, and INR) due to current downtime, and tracks the exact revenue saved through rapid manual resolution.

* **Global Internationalization (i18n)**  
  Built-in locale support for both English (EN) and Japanese (JA), catering to standard international manufacturing standards and global operations teams.

---

## 🛠️ Technology Stack

**Frontend:**
- React 18, TypeScript, Vite
- Tailwind CSS (Utility-first styling, Dark/Light modes)
- Recharts (Data Visualization)
- Lucide React (Iconography)

**Backend (AWS Cloud):**
- Python 3.9+
- AWS Lambda (Serverless Compute)
- AWS API Gateway (REST & WebSocket protocols)
- Amazon DynamoDB (NoSQL Data Persistence)
- AWS SAM (Serverless Application Model / Infrastructure as Code)

**Edge/IoT Simulator:**
- Python 3.11, Flask, Gunicorn
- Requests, WebSockets, asyncio

---

## 🚀 Deployment & Operations

### Frontend (Vercel)
The React frontend is continuously deployed via **Vercel**. Environment variables (`VITE_API_URL` and `VITE_WS_URL`) securely inject the AWS Gateway endpoints at build time.

### Edge Simulator (Render)
The Python edge node simulator is hosted on a continuous background web service via **Render**. It natively reads environment variables to seamlessly connect to the AWS cloud without local configuration.

### Cloud Backend (AWS)
The backend infrastructure is codified using the `template.yaml` (AWS SAM). It allows for 1-click cloud deployment provisioning all Lambda functions, IAM roles, DynamoDB tables, and API Gateway routes in a standardized CloudFormation stack.

---

*This system was engineered with a focus on high availability, real-time data synchronization, and elegant UI/UX design, representing the modern standard for Industry 4.0 Smart Factory applications.*

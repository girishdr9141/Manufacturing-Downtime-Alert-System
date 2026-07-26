# Serverless Manufacturing Downtime Alert System

![AWS Architecture Diagram](https://img.shields.io/badge/AWS-IoT_&_Serverless-orange.svg)
![Python 3.9](https://img.shields.io/badge/Python-3.9-blue.svg)
![Frontend](https://img.shields.io/badge/Frontend-HTML%2FCSS%2FJS-yellow.svg)

> **Recruiters & Hiring Managers**: Welcome! This project was built to demonstrate an enterprise-grade Digital Transformation (DX) architecture tailored for modern manufacturing. It proves the ability to design secure cloud infrastructure, implement ChatOps, develop predictive maintenance algorithms, and build full-stack internal IT tools.

## 🚀 Business Value & The Problem Solved

In manufacturing, machine downtime is incredibly costly. Traditionally, responding to equipment failures relies on manual observation and manual IT ticketing.

**The Solution:** This project simulates a fully automated **Predictive Maintenance & IT Ticketing System**.
By leveraging Edge computing and Serverless Cloud technology, the system analyzes telemetry data in real-time. It detects anomalies and gradual wear-and-tear, instantly alerts the maintenance team via Discord (ChatOps), and automatically generates an IT Helpdesk ticket displayed on a custom Web Portal.

## 🏗️ Phase 3 & 4 Architecture

```mermaid
graph LR
    A[Machine Simulator] <-->|MQTT (Bi-Directional)| B(AWS IoT Core)
    B -->|IoT Rule| C{Lambda: Incident Handler}
    C -->|Simulates| AI[AI Diagnostic Engine]
    AI -->|Creates Ticket & Runbook| E[(DynamoDB: IT Tickets)]
    
    G[Vercel PWA Web Portal] <-->|HTTP CRUD| H(API Gateway)
    H -->|Proxy| I{AWS Lambdas: Fetch/Resolve/Command}
    I <--> E
    I -->|Immutable Logs| AL[(DynamoDB: Audit Logs)]
    
    GH[GitHub Actions] -->|CI/CD Pipeline| I
```

## 🌟 Key Technical Features

1. **Enterprise CI/CD Pipeline:** Fully automated deployments using GitHub Actions. Every push to the `main` branch zips and deploys Python code directly to AWS Lambda, ensuring zero-downtime continuous integration.
2. **Cloud-to-Device IoT Control:** Bi-directional MQTT communication allows the Web Portal to send Emergency Stop commands *down* from the cloud to the edge devices.
3. **Automated AI Diagnostics:** Event-driven Lambdas analyze machine error codes and attach step-by-step diagnostic runbooks to IT tickets.
4. **Zero-Trust Audit Logging:** Every ticket resolution or remote command generates an immutable record in a secondary DynamoDB Audit table.
5. **Full-Stack DX Web Portal (PWA):** A progressive web app featuring Leaflet.js GPS Maps, Chart.js Analytics, and CSV Data Exports, interacting with a robust serverless API Gateway.

## 🛠️ Usage

To see this project in action, a detailed setup guide (`AWS_SETUP_GUIDE.md`) is provided in this repository for step-by-step replication in any AWS environment.

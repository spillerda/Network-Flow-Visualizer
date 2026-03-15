# Network Flow Visualizer

<div align="center">
  <img src="./public/logo.png" alt="Network Flow Visualizer Logo" width="200"/>
  <br />
  <br />
  <img src="https://img.shields.io/badge/version-1.0.0-orange.svg" alt="Version 1.0" />
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License" />
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome"/>
</div>

A modern, interactive web application to visualize and manage complex firewall rules and network topologies. Built with Next.js, React Flow, and Prisma.

---

## 🚀 Overview (v1.0)

Network Flow Visualizer helps administrators and engineers visually construct their network infrastructure and immediately test and simulate firewall rules between them. Rather than parsing through thousands of text-based rules, you can visualize ALLOW and BLOCK routes directly on an interactive graph.

![Main UI](./public/screenshots/main_ui.png)

## Core Features

### 🏢 Visual Topology Management
Manage your network structure hierarchically. You can graphically define **Zones**, which map to your larger network segments (e.g., DMZ, Internal, Guest). Inside Zones, you can place **Networks** (with specific CIDRs), and within those put individual **Clients** (with IPs). The graph automatically organizes them cleanly.

### 🛡️ Interactive Rule Simulation
Define Rules with multiple Sources, Destinations, Ports, and Priority. These are displayed as interactive edges (lines) on the graph. Green indicates ALLOW rules and red indicates BLOCK rules. If a rule specifies "any" destination or "any" source, it is drawn gracefully to show its broad impact without overwhelming the diagram.

### 🔄 Auto-Flow (Open Paths) Analysis
Toggle the "Auto-Flow" feature to instantly calculate and visualize **all currently valid network paths**. Auto-Flow evaluates your priority-ordered firewall rules. It handles complex scenarios, such as "Deny ANY ANY" rules seamlessly, preventing green lines from drawing over definitively blocked paths.

![Auto Flow](./public/screenshots/auto_flow.png)

### ⚠️ Rule Conflict Detection
Automatically identify shadowed or conflicting rules. Rules that are completely superseded by higher-priority rules turn grey, while partially conflicting rules display a warning icon `!`. Hover over the icon to see a tooltip detailing the specific rule causing the conflict.

### 👥 Client Isolation & Properties Customization
Double-click on nodes or rules to bring up the **Properties Panel**. From here you can customize names, descriptions, and structural properties. Networks also support toggling **Client Isolation** (which automatically restricts communication between clients within the same network). 

![Properties Panel](./public/screenshots/properties_panel.png)

### 📊 Multiple View Contexts (Charts)
Working on a very large environment? Use the **Chart Tabs** at the top of the screen to create multiple separate workspaces. A state of hidden/shown nodes, toggle preferences, and manual node coordinates is seamlessly saved for each chart to help you focus on specific problems.

---

### 🛠 Getting Started

#### Prerequisites

Node.js (v18+)

Database: SQLite for Prisma.

#### Local Installation

Clone the repository:
```bash
git clone [https://github.com/yourusername/network-flow-visualizer.git](https://github.com/yourusername/network-flow-visualizer.git)
cd network-flow-visualizer
```


Install dependencies:
```bash
npm install
```


Configure Environment:
Create a .env file in the root directory:
```bash
DATABASE_URL="postgresql://[USERNAME]:[PASSWORD]@localhost:5432/firewallview"
```


Initialize Database:
```bash
npx prisma generate
npx prisma db push
npx prisma db seed
  ```


Run Development Server:
```bash
npm run dev
```


Open http://localhost:3000 in your browser.

#### 🐳 Docker Usage

The project includes a Dockerfile and docker-compose.yml for containerized deployment.

Build and run locally:
```bash
docker-compose up --build -d
```


The application will be accessible on port 3000.

#### 📄 Documentation

For a complete guide, including step-by-step tutorials and advanced configuration, please see the [User Guide](docs/user-guide.md).
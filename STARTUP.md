# 🚀 MixFlow Installation & Startup Guide

This guide contains complete installation, setup, and startup instructions for **MixFlow** — the visual node router and linter for Behringer XR18 / X Air 18 mixers and Ableton Live.

---

## 📋 Prerequisites

Before installing, ensure you have the following installed on your machine:
- **Node.js**: `v18.0.0` or higher (Recommended: LTS v20+)
  - Check version: `node -v`
  - Download if needed: [https://nodejs.org](https://nodejs.org)
- **npm**: `v9.0.0` or higher
  - Check version: `npm -v`
- **Git**:
  - Check version: `git --version`

---

## 📦 Installation Options

### Option A: Fresh Clone from GitHub (Recommended for new machines)

```bash
# 1. Clone the repository
git clone https://github.com/mlmil/MixFlow_V1.git

# 2. Navigate into the project folder
cd MixFlow_V1

# 3. Install all project dependencies
npm install
```

---

### Option B: Local Setup (From Working Directory)

If you are already working in the project directory:

```bash
# 1. Navigate to the app folder
cd "/Volumes/VADER/Projects/MixStationUI/GITHUB REPOS/mixflow-ui"

# 2. Install dependencies
npm install
```

---

## ⚡ Starting the Application

### 1. Launch the Development Server
```bash
npm run dev
```

### 2. Open in Your Browser
Once Vite starts, open Safari or Chrome at:

👉 **[http://localhost:3000](http://localhost:3000)**  
*(or `http://127.0.0.1:3000`)*

---

## 🧪 Testing & Verification

Run the automated test suite to ensure the node graph, linter rules, template manager, and OSC snapshot exporters are working properly:

```bash
# Run all 21 automated unit tests
npm test

# Run tests in live watch mode (re-runs on file save)
npx vitest
```

---

## 🏗️ Production Build

To compile and bundle the web application for standalone production hosting:

```bash
# Build the production bundle into dist/
npm run build

# Preview the production build locally
npm run preview
```

---

## 🛠️ Troubleshooting & Tips

### 1. Safari Shows a White/Blank Screen
- Safari may cache an earlier load. Press **`⌘ + Shift + R`** (Command + Shift + R) to perform a hard refresh.
- Ensure the terminal process running `npm run dev` is active.

### 2. Port 3000 is Already in Use
If port 3000 is occupied by another process, kill existing node servers or start on another port:
```bash
# Kill lingering background node processes
killall node

# Or specify a custom port
npx vite --port 3001 --host 0.0.0.0
```

### 3. Node / npm Dependency Errors
If you ever encounter missing dependencies or package lock mismatch:
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

---

## 🐙 Git Repository Details

- **GitHub Repository**: [https://github.com/mlmil/MixFlow_V1](https://github.com/mlmil/MixFlow_V1)
- **Branch**: `main`

### How to Push Updates:
```bash
cd "/Volumes/VADER/Projects/MixStationUI/GITHUB REPOS/mixflow-ui"
git add .
git commit -m "feat: describe your change"
git push origin main
```

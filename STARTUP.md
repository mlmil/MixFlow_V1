# 🚀 MixFlow Startup & Quick Reference Guide

This document contains step-by-step instructions for running, testing, building, and deploying the **MixFlow** visual routing application for Behringer XR18 and Ableton Live.

---

## ⚡ Quick Start (Run Locally)

### 1. Navigate to the App Directory
```bash
cd "/Volumes/VADER/Projects/MixStationUI/GITHUB REPOS/mixflow-ui"
```

### 2. Install Dependencies (First time only)
```bash
npm install
```

### 3. Start the Development Server
```bash
npm run dev
```

### 4. Open in Your Browser
Once Vite starts, open Safari or Chrome at:

👉 **[http://localhost:3000](http://localhost:3000)**  
*(or `http://127.0.0.1:3000`)*

---

## 🧪 Testing & Verification

Run the automated Vitest test suite (validates node DAG, linter rules, template loading, and OSC snapshot generator):

```bash
# Run test suite once
npm test

# Run tests in watch mode
npx vitest
```

---

## 📦 Production Build

To create an optimized production build for distribution:

```bash
npm run build
```
Output files will be generated in `dist/`. You can preview the production bundle with:
```bash
npm run preview
```

---

## 🛠️ Troubleshooting & Tips

### 1. Browser shows a blank/white screen on reload
- Press **`⌘ + Shift + R`** in Safari/Chrome to bypass the cache and hard-refresh.
- Ensure the dev server is active in your terminal.

### 2. Port 3000 already in use
If another process is using port 3000, you can kill existing node servers or start on a custom port:
```bash
# Kill node processes running in background
killall node

# Start on a custom port
npx vite --port 3001 --host
```

---

## 🐙 Git Repository

- **GitHub Repo**: [https://github.com/mlmil/MixFlow_V1](https://github.com/mlmil/MixFlow_V1)
- **Primary Branch**: `main`

### Push Updates to GitHub:
```bash
cd "/Volumes/VADER/Projects/MixStationUI/GITHUB REPOS/mixflow-ui"
git add .
git commit -m "feat: your update message"
git push origin main
```

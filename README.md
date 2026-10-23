# 📐 Math Visualizer — Fourier Epicycles & Oscilloscope Waves

A full-stack mathematical Fourier epicycle and compound pendulum wave visualizer built with **React 19**, **Vite**, **Tailwind CSS**, **KaTeX**, and an **Express.js backend**.

Draw custom closed curves or choose from presets, and watch compound mechanical pendulum linkages reconstruct your drawing stroke-for-stroke via **Discrete Fourier Transform (DFT)**, paired with a live rolling oscilloscope wave and LaTeX mathematical equations.

---

## 📑 Table of Contents

- [🎨 UI Architecture](#-ui-architecture)
- [🌟 Key Features](#-key-features)
- [🛠 Tech Stack](#-tech-stack)
- [📋 Prerequisites](#-prerequisites)
- [⚙️ Installation Guide](#️-installation-guide)
- [🚀 Running the Project](#-running-the-project)
  - [Development Mode (Recommended)](#1-development-mode-recommended)
  - [Production Mode](#2-production-mode)
- [📜 Available Scripts](#-available-scripts)
- [📁 Project Structure](#-project-structure)
- [🔌 API Endpoints](#-api-endpoints)
- [❓ Troubleshooting](#-troubleshooting)

---

## 🎨 UI Architecture

```
┌─────────────────────────────────────────────────────────────┬───────────────────────────┐
│ [clear] [pen]                                               │   [ wave ]                │
│                                                             │   Continuous rolling      │
│ [ Draw ] [ Animation ]                                      │   oscilloscope wave       │
│ ┌─────────────────────────────────────────────────────────┐ │                           │
│ │                                                         │ ├───────────────────────────┤
│ │                                                         │ │   [ Equation ]            │
│ │                     MAIN CANVAS                         │ │   Complex Fourier &       │
│ │                                                         │ │   parametric equations    │
│ │   Freehand drawing with magnetic snap (0px gap)         │ ├───────────────────────────┤
│ │   & compound pendulum epicycle reconstruction           │ │ [ perpedilum anaimtion ]  │
│ │                                                         │ │                           │
│ │                                                         │ │   Focused mechanical      │
│ └─────────────────────────────────────────────────────────┘ │   compound pendulum arms  │
│ [⏸] [⏮] Epicycles: [====]  Speed: [====]  circles arms trace│                           │
└─────────────────────────────────────────────────────────────┴───────────────────────────┘
```

---

## 🌟 Key Features

1. **Interactive Freehand Drawing & Magnetic Snap**:
   - Draw freely on the main HTML5 Canvas.
   - Magnetic target ring snaps pen release to the starting joint with a **0px gap** for clean, seamless Fourier loops.
2. **Compound Pendulum & Epicycles Reconstruction**:
   - Computes Discrete Fourier Transform (DFT) coefficients in real time.
   - Reconstructs shapes using rotating interconnected mechanical pendulum arms.
   - Real-time controls for speed (0.1x to 3.0x), number of epicycles (1 to 150), and toggles for circles, arm rods, and path trace.
3. **Synchronized Rolling Oscilloscope Wave**:
   - Real-time rolling waveform view tracking pendulum tip motion across time.
4. **Live KaTeX Mathematical Equation Rendering**:
   - Displays complex exponential Fourier series:
     $$f(t) = \sum_{n=-N}^{N} c_n e^{i n \omega_0 t}$$
   - Parametric sine/cosine representations computed dynamically from the active drawing.
   - Pop-up equation inspector dialog for in-depth analysis.
5. **Interactive Harmonic Audio Synthesizer**:
   - Web Audio API synthesizer that translates Fourier harmonic frequencies into live sound.
6. **Persistent Drawings Library**:
   - Save custom drawings locally (`/api/drawings`) stored in persistent JSON format.
   - Pre-loaded presets: Heart curve, Five-point star, Infinity loop, and more.
7. **Monochrome High-Contrast Theme**:
   - Clean, minimalist aesthetic with seamless Dark 🌙 / Light ☀️ mode toggles and `localStorage` state persistence.

---

## 🛠 Tech Stack

- **Frontend**:
  - [React 19](https://react.dev/) — Declarative UI
  - [Vite 6](https://vitejs.dev/) — Lightning-fast build tool & dev server
  - [Tailwind CSS 3](https://tailwindcss.com/) — Utility-first styling
  - [KaTeX](https://katex.org/) — Fast math formula rendering
  - [Lucide React](https://lucide.dev/) — Icon system
- **Backend**:
  - [Node.js](https://nodejs.org/) & [Express 5](https://expressjs.com/) — REST API & static file server
- **Mathematical Computation**:
  - Custom Discrete Fourier Transform (DFT) engine

---

## 📋 Prerequisites

Before installing and running the application, make sure you have installed:

- **Node.js**: `v18.0.0` or higher (LTS recommended)
  - Verify with: `node -v`
- **npm**: `v9.0.0` or higher (included with Node.js)
  - Verify with: `npm -v`
- **Git** (optional, for cloning the repository)

---

## ⚙️ Installation Guide

Follow these step-by-step instructions to set up the project on your local machine:

### 1. Clone or Download the Repository

If using Git:
```bash
git clone https://github.com/your-username/math-visualizer.git
cd math-visualizer
```

If you downloaded a ZIP file:
- Extract the archive to your desired directory.
- Open your terminal (PowerShell, Command Prompt, or Bash) and navigate to the root directory:
```bash
cd "path/to/math-visualizer"
```

### 2. Install Project Dependencies

Run the following command in the project root directory:

```bash
npm install
```

This will automatically install all required packages listed in `package.json`, including:
- React 19 & React DOM
- Express
- KaTeX
- Lucide React
- Tailwind CSS, PostCSS & Autoprefixer
- Vite & Vite React plugin

---

## 🚀 Running the Project

You can run this project in either **Development Mode** (with hot reload) or **Production Mode**.

### 1. Development Mode (Recommended)

In development mode, you run both the Express backend and the Vite frontend dev server with Hot Module Replacement (HMR).

Open **two terminal windows** in the project root:

#### **Terminal 1: Start Backend API Server**
```bash
npm run server
```
> Express server will start listening on **`http://localhost:3000`**

#### **Terminal 2: Start Vite Frontend Client**
```bash
npm run dev
```
> Vite dev server will start at **`http://localhost:5173`**

Now open your browser and navigate to:
👉 **`http://localhost:5173`**

*(Requests made to `/api/*` are automatically proxied from Vite to the Express server on port 3000)*

---

### 2. Production Mode

To test or deploy the optimized production build:

#### Step 1: Build the Frontend Assets
```bash
npm run build
```
This generates the optimized production bundle inside the `dist/` directory.

#### Step 2: Start the Production Server
```bash
npm start
```
The Express backend serves the static files from `dist/` as well as the API endpoints.

Now open your browser and navigate to:
👉 **`http://localhost:3000`**

---

## 📜 Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the Vite frontend development server on `http://localhost:5173` |
| `npm run server` | Starts the Express backend API server on `http://localhost:3000` |
| `npm run build` | Compiles and bundles production frontend assets into the `dist/` folder |
| `npm run preview` | Previews the local production build using Vite |
| `npm start` | Runs the Express production server (`node server.js`) |

---

## 📁 Project Structure

```text
math-visualizer/
├── data/
│   └── drawings.json         # Persistent user drawings database
├── dist/                     # Production build output (generated by npm run build)
├── node_modules/             # Installed npm dependencies
├── src/
│   ├── components/
│   │   ├── EquationBox.jsx   # KaTeX live Fourier formula box
│   │   ├── EquationModal.jsx # Full-screen formula details modal
│   │   ├── MainCanvas.jsx    # Drawing canvas & epicycle simulation
│   │   ├── PendulumBox.jsx   # Compound pendulum arm visualizer
│   │   ├── SaveDialog.jsx    # Drawing save modal
│   │   ├── Toast.jsx         # Notification alerts
│   │   └── WaveBox.jsx       # Rolling oscilloscope waveform
│   ├── lib/
│   │   ├── audio.js          # Web Audio API harmonic sound synthesizer
│   │   ├── evalEquation.js   # Dynamic formula evaluation
│   │   ├── fourier.js        # Discrete Fourier Transform (DFT) algorithms
│   │   ├── presets.js        # Built-in shape coordinates
│   │   ├── shapes.js         # Mathematical curve generators
│   │   ├── storage.js        # LocalStorage & API client helpers
│   │   └── utils.js          # Tailwind class mergers
│   ├── App.jsx               # Main React application layout
│   ├── index.css             # Tailwind & base styling
│   └── main.jsx              # React application entry point
├── .gitignore                # Git ignored files & directories
├── index.html                # Vite HTML template
├── package.json              # Project metadata & dependencies
├── postcss.config.js         # PostCSS configuration
├── server.js                 # Express.js REST API & static server
├── tailwind.config.js        # Tailwind CSS configuration
└── vite.config.js            # Vite configuration with API proxy
```

---

## 🔌 API Endpoints

The Express server exposes the following REST API routes under `/api`:

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/drawings` | Retrieve all saved and preset drawings |
| `POST` | `/api/drawings` | Save a new drawing with stroke coordinates & Fourier metadata |
| `DELETE` | `/api/drawings/:id` | Delete a saved drawing by ID |
| `POST` | `/api/fourier` | Compute DFT coefficients & LaTeX strings server-side |

---

## ❓ Troubleshooting

- **Windows PowerShell Script Execution Error (`PSSecurityException` / `running scripts is disabled`)**:
  - If PowerShell blocks running `npm` commands, either run:
    ```powershell
    Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
    ```
    or run commands inside standard Windows Command Prompt (`cmd.exe`).
- **Port Conflict (`EADDRINUSE: 3000` or `5173`)**:
  - Ensure no other instances of Node or other apps are running on ports `3000` or `5173`.
  - You can change the port for the server by setting `PORT=XXXX node server.js`.
- **API Calls Failing in Dev Mode**:
  - Make sure you started **both** `npm run server` (port 3000) and `npm run dev` (port 5173).
- **Styles or KaTeX Fonts Not Loading**:
  - Run `npm install` again to verify all peer dependencies are properly installed.

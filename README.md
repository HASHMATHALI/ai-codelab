# AI CodeLab — AI Debugging & Code Understanding Workspace

[![Live Demo](https://img.shields.io/badge/Live_Demo-ai--codelab.vercel.app-blue?style=for-the-badge&logo=vercel)](https://ai-codelab.vercel.app)
[![Next.js 16](https://img.shields.io/badge/Next.js-16.3.5-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19-61dafb?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178c6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Google Gemini](https://img.shields.io/badge/AI_Engine-Gemini_3.6_Flash-orange?style=for-the-badge&logo=google)](https://aistudio.google.com/)

> **"Understand why your code fails. Fix it. Learn from it."**

AI CodeLab is an intelligent programming and debugging studio designed for developers, students, and educators. Instead of merely generating code snippets, AI CodeLab solves the most critical developer bottleneck: **"My code doesn't work. I don't understand why, and I don't know how to fix it."**

---

## 🌐 Live Production Application

- **Live Deployment**: **[https://ai-codelab.vercel.app](https://ai-codelab.vercel.app)**
- **Supported Languages**: Python, JavaScript, TypeScript, C++, C, Java, Go, SQL, HTML, CSS.

---

## ⚡ Key Features

### 1. 🔍 Root Cause Analysis & Chronological Execution Traces
- Explains the exact point of failure step-by-step rather than giving a vague error description.
- Pinpoints the precise line, file snippet, and execution preconditions that were violated.

### 2. ⚖️ Uncertainty & Safety Layer (No Fabricated Certainty)
- **Three-Tier Epistemic Analysis**:
  - **Observed**: Concrete facts visible in the submitted code or stack trace.
  - **Inferred**: Deductions derived logically from runtime behavior.
  - **Unknown**: Hidden runtime context (e.g., input values, uninspected environment variables).
- **Calibrated Confidence**: Explicitly labels diagnoses as `High`, `Medium`, `Low`, or `Needs Info` with a transparent *"Why am I not certain?"* explainer.

### 3. 🛡️ Secret Masker & Security Vulnerability Auditor
- Scans and redacts credentials before transmitting payloads (`API_KEY=`, `PASSWORD=`, `SECRET=`, `TOKEN=`).
- Flags SQL injection vectors, command execution vulnerabilities, and insecure string interpolations with recommended parameterized fixes.

### 4. 🔄 Visual Code Diff & 1-Click Fix
- Provides a side-by-side colorized diff comparing buggy code against the proposed fix.
- Includes a 1-click **"Apply Fix to Editor"** button with human-in-the-loop review.

### 5. 🧪 Automated Test Generation
- Generates 4-part test suites with each diagnosis:
  - Normal input case
  - Edge case
  - Empty input case
  - Regression assertion

### 6. 🎓 Problem-Based Learning (PBL) Interactive Labs
- 5 curated curriculum challenges spanning GenAI Foundations, Algorithms, Fullstack Web, and Data Science.
- Progressive Socratic hints that guide learning without spoiling the solution.

### 7. 🔌 Dual-Engine Architecture (Live AI + Offline Mode)
- **Live Mode**: Powered by **Google Gemini 3.6 Flash** for ultra-fast, high-accuracy reasoning.
- **Offline / Showcase Mode**: High-fidelity built-in diagnostic engine for offline classroom presentations without requiring an API key.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16 (App Router)](https://nextjs.org/) with Turbopack bundler
- **Frontend**: [React 19](https://react.dev/), TypeScript, Vanilla CSS Modules
- **AI Integration**: Google Generative Language API (`gemini-3.6-flash`, `gemini-flash-latest`)
- **Deployment**: [Vercel Serverless Platform](https://vercel.com/)

---

## 🚀 Getting Started Locally

### Prerequisites
- Node.js 18.18+ or 20+
- npm, yarn, or pnpm

### 1. Clone the Repository
```bash
git clone https://github.com/HASHMATHALI/ai-codelab.git
cd ai-codelab
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables (Optional for Live Mode)
Copy the example environment file:
```bash
cp .env.example .env.local
```
Add your Google Gemini API Key from [Google AI Studio](https://aistudio.google.com/):
```env
GEMINI_API_KEY=your_actual_gemini_api_key
```
*(Note: If no key is configured, AI CodeLab automatically runs in high-fidelity Offline Showcase Mode).*

### 4. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Build for Production
```bash
npm run build
npm run start
```

---

## 📂 Project Structure

```
ai-codelab/
├── public/                  # Static assets and icons
├── src/
│   ├── app/
│   │   ├── api/ai/route.ts  # Next.js App Router API route (Gemini 3.6 Flash & Fallback)
│   │   ├── globals.css      # Design tokens and global theme variables
│   │   ├── layout.tsx       # Root layout and metadata
│   │   └── page.tsx         # 2-column debugging studio workspace
│   ├── components/
│   │   ├── AiAssistant.tsx       # Socratic chat mentor and prompt studio
│   │   ├── CodeEditor.tsx        # Multi-language editor with line numbers
│   │   ├── DebugForm.tsx         # Quick scenario selector & error input bar
│   │   ├── DebugReportView.tsx   # Uncertainty report, execution trace & diff
│   │   ├── Header.tsx            # Navigation, status badges & universal search
│   │   ├── OutputConsole.tsx     # Terminal output & execution results
│   │   ├── PblChallengesDrawer.tsx # Interactive curriculum drawer
│   │   ├── SettingsModal.tsx     # API key, model & mode selector
│   │   └── UniversalSearchBar.tsx # Instant search across bugs and labs
│   ├── data/
│   │   ├── challenges.ts    # Curated PBL lab curriculum
│   │   └── examples.ts      # Multi-language real-world bug scenarios
│   ├── lib/
│   │   ├── executor.ts      # Browser-based safe code runner
│   │   ├── gemini.ts        # AI dispatcher, Gemini client & offline engine
│   │   └── security.ts      # Credential masker & vulnerability scanner
│   └── types/
│       └── index.ts         # TypeScript schema definitions
├── .env.example             # Template for environment variables
├── .gitignore               # Excludes secrets, node_modules & build caches
├── next.config.ts           # Next.js configuration
├── package.json             # Project dependencies and scripts
└── tsconfig.json            # TypeScript configuration
```

---

## 🔒 Security & Privacy

- All sensitive credentials (`.env.local`) are strictly excluded from source control via `.gitignore`.
- Code passed to AI endpoints is pre-scanned locally to redact API keys and passwords before transmission.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

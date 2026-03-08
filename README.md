<div align="center">

# 🏥 MedLens

### AI-Powered Symptom Triage & Rural Health Navigator

**Instant, multilingual AI symptom triage with clinic navigation — built for the 3.5 billion people healthcare forgot.**

[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.0-38bdf8?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore-ffca28?style=for-the-badge&logo=firebase)](https://firebase.google.com/)
[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-000?style=for-the-badge&logo=vercel)](https://vercel.com/)

[🌐 Live Demo](https://medlens.vercel.app) · [📖 Documentation](#-how-it-works) · [🐛 Report Bug](https://github.com/YOUR_USERNAME/medlens/issues) · [💡 Request Feature](https://github.com/YOUR_USERNAME/medlens/issues)

---

<img src="public/screenshot-hero.png" alt="MedLens Hero Screenshot" width="800"/>

</div>

---

## 🚨 The Problem

> **Over 3.5 billion people worldwide lack access to essential health services.**

In rural and underserved communities, patients travel hours — sometimes an entire day — for a basic symptom assessment. This results in:

- ⏰ **Delayed care** — hours or days before seeing any health professional
- ❌ **Misdiagnosis** — lack of structured symptom data for doctors
- 💀 **Preventable deaths** — emergencies unrecognized until it's too late
- 🌍 **Language barriers** — health tools only available in dominant languages
- 💸 **Financial burden** — unnecessary trips for non-urgent symptoms

**People are dying not because cures don't exist — but because they can't reach them in time.**

---

## 💡 The Solution

**MedLens** is an AI-powered symptom triage and health navigator that gives anyone, anywhere, instant clarity on the urgency of their symptoms.

<div align="center">

| Step | What Happens |
|------|-------------|
| 💬 **Describe** | Type or speak your symptoms in your language |
| 🤖 **Triage** | AI instantly assesses urgency: 🟢 Green · 🟡 Yellow · 🔴 Red |
| 🗺️ **Navigate** | Find nearest clinics, hospitals, pharmacies on a map |
| 📄 **Prepare** | Download a doctor-ready PDF summary for your visit |

</div>

**No account. No cost. No appointment. Works on any smartphone.**

---

## ✨ Key Features

### 🔍 AI Symptom Triage
- Natural language symptom input with AI-powered urgency assessment
- Three-level triage: **GREEN** (self-care) · **YELLOW** (see doctor 24-48h) · **RED** (emergency)
- Confidence score (0-100%) with transparent AI reasoning
- Follow-up questions and self-care recommendations

### 🚨 Emergency Override System
- Hardcoded emergency keyword detection — works **WITHOUT any API call**
- Instant RED alert for life-threatening keywords (chest pain, seizure, unconscious, etc.)
- Never depends on AI availability — **100% reliable safety net**
- Immediate call-to-action: Call 911 + nearest ER directions

### 🌍 Multilingual Support
- Input and output in **English, Spanish, French, Hindi, Swahili, Arabic**
- AI translates all triage results to user's preferred language
- Voice input supports all listed languages

### 🎤 Voice Input
- Speak your symptoms using browser's Web Speech API
- **Completely free** — no API costs
- Supports multiple languages
- Perfect for low-literacy users

### 🗺️ Clinic & Hospital Finder
- Interactive Google Maps with nearby healthcare facilities
- Filter by: Hospitals, Clinics, Pharmacies
- Distance, ratings, open/closed status, directions
- **Telemedicine fallback** when no nearby facilities found

### 📄 Doctor-Ready PDF Export
- One-click downloadable pre-visit summary
- Includes: symptoms, triage level, confidence, AI reasoning, self-care tips
- Structured format doctors can read in 30 seconds
- **Bridges the gap** between patient's home and doctor's office

### 👨‍👩‍👧 Caregiver Mode
- "Reporting for someone else" toggle
- Patient age and sex inputs for better triage accuracy
- AI addresses the caregiver appropriately

### 📋 Symptom History Dashboard
- All past triage sessions logged with timestamps
- Color-coded triage badges for quick visual scanning
- Pattern tracking across sessions
- Stored locally — no account needed

### ♿ Accessibility
- High-contrast mode toggle
- Large text mode toggle
- ARIA labels for screen readers
- Keyboard navigation support
- Mobile-first responsive design
- Minimum 44x44px touch targets

### 🌓 Dark & Light Mode
- Beautiful UI in both themes
- Automatic system preference detection
- Manual toggle with smooth transitions
- Persistent preference saved locally

---

## 🛠️ Tech Stack

<div align="center">

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 14 (App Router) |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS v3 |
| **Animations** | Framer Motion |
| **AI Engine** | Gemini |
| **Voice Input** | Web Speech API (free, browser-native) |
| **Maps** | Google Maps JavaScript API + Places API |
| **PDF Export** | jsPDF |
| **Database** | Firebase Firestore |
| **Validation** | Zod |
| **MCP Server** | @modelcontextprotocol/sdk |

</div>


# Studio Management Platform

A high-performance operations tool for park management, asset tracking, and volunteer engagement. Built with Next.js 15, Firebase (Gold Standard Architecture), and shadcn/ui.

## 🚀 Architecture Overview

- **Auth**: Firebase Auth with Custom Claims (`orgId`, `role`) for O(1) security checks.
- **Database**: Firestore Enterprise with **Named Silos** (Project: `studio-4537887383-23869`).
- **Functions**: Cloud Functions Gen 2 (v2 API) deployed in `europe-west1`.
- **Validation**: Zod Schemas for runtime data integrity.
- **Monitoring**: Firebase Performance Monitoring & Global Error Boundaries.

## 🛠️ Local Development

### 1. Prerequisites
- Node.js 20+
- Firebase CLI (`npm install -g firebase-tools`)

### 2. Environment Setup
Create a `.env.local` file with your Firebase configuration:
```bash
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=studio-4537887383-23869
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Start Development Server
```bash
npm run dev
```
The app will be available at `http://localhost:9002`.

## 🛡️ Security & Deployment

- **Firestore Rules**: Rules are optimized for Custom Claims. Deploy via `firebase deploy --only firestore:rules`.
- **Functions**: Triggered by the named database silo. Deploy via `firebase deploy --only functions`.

## 📂 Project Structure
- `src/app`: Next.js App Router (Pages & API)
- `src/components`: UI Components (Skeletons, Error Boundaries, etc.)
- `src/firebase`: Singleton client initialization and specialized hooks.
- `src/lib/schemas.ts`: Zod data validation models.

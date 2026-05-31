<div align="center">
  <img width="1200" height="475" alt="Decycles Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
  
  <br />
  
  # DECYCLES.CC
  
  **DISCOVER INDEPENDENT CYCLING CULTURE.**  
  *RIDE · BUILD · ORGANIZE · DOCUMENT · REPAIR · CONNECT*
</div>

---

> **Cycling isn’t built by faceless brands.** It’s built by framebuilders welding in their garages, mechanics keeping rides on the road, photographers chasing light, and local crews lighting up Sunday mornings. Decycles is a handpicked, global map of the independent makers moving cycling culture forward.

Decycles is a curated directory, interactive map, and community event calendar designed to bring the cycling ecosystem together. It features a premium brutalist design language—defined by high-contrast palettes, heavy uppercase display typography, and minimal editorial components.

---

## ── THE FIVE WORLDS ──

Decycles organizes the independent cycling scene into five main categories:

1. **PRODUCTS (`Package`)** — Bespoke bikes, custom frames, handmade components, gear, bags, and apparel.
2. **SERVICES (`Wrench`)** — Repairs, custom builds, frame building workshops, restorations, and custom paintwork.
3. **EVENTS (`Calendar`)** — Group rides, independent races, swap meets, trails, and exhibitions.
4. **COMMUNITY (`Users`)** — Riding clubs, collectives, advocacy groups, and local hubs.
5. **CREATIVE & MEDIA (`Palette`)** — Photographers, filmmakers, independent magazines, and visual artists.

---

## ── PLATFORM FEATURES ──

### For Riders (Explore & Discover)
* **Interactive Map View** — A full-bleed [Leaflet](https://leafletjs.com/) map geolocalizing independent shops, framebuilders, and events worldwide.
* **Granular Search & Filters** — Instant search across name, location, and bio, combined with country-level filters and subcategory tags.
* **Unified Event Calendar** — A monthly calendar interface aggregating social rides, gravel loops, and framebuilding workshops.
* **Visual Inspiration Gallery** — A randomized masonry grid highlighting real photos of custom builds and components.
* **Creator Profile Modals** — Deep-linkable profile overlays showing complete contact information, website links, social media, portfolios, and upcoming events.
* **Favorites System** — Bookmark creators and upcoming events for fast reference.

### For Creators (Own Your Story)
* **Creator Portal** — A comprehensive profile editor to manage brand identity, select active categories, and write biographies.
* **Geolocation Pins** — Input physical addresses to automatically place a shop on the global map.
* **Portfolio Galleries** — Upload cover images and multiple workshop photos to showcase craftsmanship.
* **Self-Publish Events** — Publish group rides, launch parties, or mechanics workshops directly to the public calendar.
* **Publishing Gates** — Instantly toggle visibility status between live and draft.

---

## ── THE DESIGN SYSTEM ──

Decycles implements a **Premium Brutalist** design system configured inside [index.css](file:///Users/santferal/Desktop/dev_learn/decycles/src/index.css):

* **Typography:**
  * **Display:** `Anton` (Ultra-heavy uppercase headlines, tight letter-spacing)
  * **Sans:** `Inter` (Clean, highly readable user interface copy)
  * **Mono:** `JetBrains Mono` (Structured telemetry, meta information, and status codes)
* **Color Palette:**
  * `Rad Black (#050505)` — Deep, absolute dark background & border color.
  * `Rad White (#f5f5f5)` — Off-white backdrop for clean contrast.
  * `Rad Neon (#ccff00)` — High-energy neon yellow/green accenting active badges, scroll bars, and marquee banners.
* **Brutalist Elements:**
  * `brutalist-border` — Strict 2px solid black/white border separating components.
  * `marquee-container` — A continuous, animated loop of the platform manifesto (`RIDE · BUILD · ORGANIZE...`).

---

## ── TECHNICAL ARCHITECTURE ──

Decycles is built as a fast, type-safe Single Page Application (SPA):

* **Frontend Framework:** [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) + [Vite](https://vite.dev/)
* **Routing:** [React Router v6](https://reactrouter.com/) (supporting deep-linking to modal profiles `/creator/:id`)
* **State & Hooks:** Context-driven UI, Auth, and Category management; custom state wrappers for real-time Firestore synchronization.
* **Database & Auth:** [Firebase v10](https://firebase.google.com/) (Firestore database, Firebase Authentication, Cloud Storage for media assets).
* **Maps Integration:** React Leaflet with custom CSS preflight overrides for responsive tile rendering.
* **Localization:** Flexible translation hooks supporting English (`src/i18n/en.ts`) and Spanish (`src/i18n/es.ts`).

---

## ── GETTING STARTED ──

### Prerequisites
* [Node.js](https://nodejs.org/) (v18 or higher recommended)
* A [Firebase Project](https://console.firebase.google.com/) set up with Firestore, Auth, and Storage.

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/aizetachan/decycles.git
   cd decycles
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   Create a `.env.local` file in the root directory and add your Gemini API Key alongside your Firebase web credentials:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   
   GEMINI_API_KEY=your_gemini_api_key
   ```

4. **Launch the development server:**
   ```bash
   npm run dev
   ```
   *The application will start locally on `http://localhost:5173`.*

---

## ── PROJECT STRUCTURE ──

```
decycles/
├── assets/                 # Brand assets and default avatar assets
├── functions/              # Firebase Cloud Functions (meta template rendering)
├── scripts/                # Database seeders, migrations, and schema boots
├── src/
│   ├── components/         # Reusable widgets (modals, auth forms, UI pickers)
│   │   ├── home/           # Homepage components (Filters, Map, Calendar, Grid)
│   │   └── layout/         # Shell headers, sidebars, and navigation
│   ├── contexts/           # Global providers (Auth, Language, Category, UI)
│   ├── hooks/              # Custom query wrappers (useCreators, useRsvps)
│   ├── i18n/               # Translation dictionary modules (ES / EN)
│   ├── pages/              # Main view screens (Home, Welcome, EditProfile)
│   │   └── admin/          # Backoffice moderation dashboards
│   ├── App.tsx             # Application router and modal outlets
│   ├── data.ts             # Evocative fallback data dictionary
│   ├── index.css           # Global Brutalist theme definitions
│   ├── main.tsx            # DOM initialization entrypoint
│   └── types.ts            # Core TypeScript model definitions
├── firestore.rules         # Security access definitions for Firestore
├── storage.rules           # Storage security filters
└── vite.config.ts          # Compilation settings
```

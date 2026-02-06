# Leave Manager

Attendance tracker and leave management system built for interns and employees. Calculate attendance percentages, manage leaves (full/half), and automatically handle sandwich rules and public holidays.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![Tailwind](https://img.shields.io/badge/Tailwind-CSS-38bdf8)

## Features

- **Attendance Tracking:** Real-time calculation of attendance percentage (80% target).
- **Leave Types:** Support for Full Day, Half Day (Morning/Afternoon).
- **Sandwich Rule Logic:** Automatically detects and penalizes sandwich leaves (holidays wrapped by leaves).
- **Public Holidays:** Pre-configured with Gujarat 2026 public holidays.
- **Smart Calendar:** Defaults to current year view.
- **Dark Mode:** Fully responsive dark/light theme toggle.
- **Data Persistence:** Uses LocalStorage for privacy and offline capability (no login required).

## Live Demo

[https://leave-manager-five.vercel.app](https://leave-manager-five.vercel.app)

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Styling:** Tailwind CSS v4 & Lucide React Icons
- **Language:** TypeScript
- **State Management:** React Hooks & Context
- **Persistence:** LocalStorage (Client-side)

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/ark5234/Leave-Manager.git
   ```

2. Navigate to the project directory:
   ```bash
   cd Leave-Manager/web-app
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## How to Use

1. **Set Date Range:** Use the start and end date pickers to define your internship or tracking period.
2. **Mark Leaves:** Click on any date in the calendar to toggle its status:
   - Click 1x: Full Leave (Red)
   - Click 2x: Half Day Morning (Orange)
   - Click 3x: Half Day Afternoon (Orange)
   - Click 4x: Reset to default
3. **Check Stats:** The dashboard at the top updates automatically to show your current attendance percentage and safe buffer days.

## Credits

**Made by Vikrant Kawadkar**

Project created as a personal tool for managing internship attendance.

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

## Logic & Math

### Attendance Calculation

The system calculates attendance dynamically based on your records:

1.  **Working Days Definition:**
    $$ \text{Working Days} = \text{Present Days} + \text{Leaves (Full + Half + Sandwich)} $$
    *(Holidays and Weekends are excluded unless a Sandwich penalty forces them to count as leaves)*

2.  **Attendance Percentage:**
    $$ \text{Percentage} = \left( \frac{\text{Weighted Present Days}}{\text{Working Days}} \right) \times 100 $$
    
    - **Present Day:** +1 Present, +1 Working
    - **Half Day Leave:** +0.5 Present, +1 Working (0.5 Leave)
    - **Full Day Leave:** +0 Present, +1 Working
    - **Sandwich Leave:** +0 Present, +1 Working (Penalty applied to a holiday)

3.  **Safe Buffer:**
    Calculates how many *additional future leaves* you can take before dropping below 80%.
    $$ \text{Buffer} = \left\lfloor \frac{\text{Present Days}}{0.8} - \text{Working Days} \right\rfloor $$
    
    > **Note:** Converting a past "Present" day to a "Leave" deplete your buffer faster (~1.25 days cost) than taking a new leave (1.0 day cost), because you lose the accumulated work credit while also adding a deficit.

## Interactive Preview

The app includes a "What-if" preview that lets you simulate taking additional future leave days. The preview shows the projected attendance percentage and the projected safe buffer after adding the specified number of leave days. This helps you decide whether taking another leave will push you below the 80% target.

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

## ⚠️ Disclaimer

This is **not an official application** and should be used for estimation purposes only. The attendance predictions and sandwich rule logic are based on standard interpretations and may not perfectly align with official administrative records.

**Note on Holidays:** The official holiday list for the specific institution was not available at the time of development. Consequently, this application uses the **Gujarat Government Official Public Holidays 2026** as a reference. Please verify dates with your official schedule.

## Credits

**Made by Vikrant Kawadkar**

Project created as a personal tool for managing internship attendance.

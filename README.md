# Nexacrft Attendance System

A modern, premium attendance tracking system with Employee and Admin dashboards. Built with React (Vite) and Supabase.

## Features

*   **Employee Flow**: Mark Time IN / OUT, view interactive monthly reports.
*   **Admin Flow**: View all employee attendance, add missing entries manually, real-time toast notifications for IN/OUT events, view and export any employee's monthly report.
*   **PDF Export**: Easily export monthly reports as PDF documents.
*   **Premium Design**: Dark mode, glass-morphism, and micro-animations.

## Local Setup

1.  **Install dependencies**
    ```bash
    npm install
    ```

2.  **Environment Variables**
    Create a `.env` file in the root directory:
    ```
    VITE_SUPABASE_URL=your_supabase_project_url
    VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
    ```

3.  **Run Development Server**
    ```bash
    npm run dev
    ```

## Default Admin Account

An initial admin account has been provisioned:
*   **Username**: `kshitij@example.com` (or `Kshitij`)
*   **Password**: `Sakshitij@01`

Use these credentials to log in and access the Admin Dashboard.

## Vercel Deployment

Deploying to Vercel is seamless since the app is completely static (React + Vite) and all backend logic runs on Supabase.

1.  Push your code to a GitHub repository.
2.  Import the project into Vercel.
3.  Vercel will auto-detect the Vite framework.
4.  **Crucial Step**: In the Vercel deployment settings, add the following Environment Variables:
    *   `VITE_SUPABASE_URL`: Your Supabase URL.
    *   `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous key.
5.  Deploy! The realtime notifications, PDF export, and database access will all work perfectly in production.

*(Ensure that the Vercel production domain is added to your Supabase Auth -> URL Configuration -> Site URL and Redirect URLs if using OAuth, though we are using email/password so it should work out of the box).*

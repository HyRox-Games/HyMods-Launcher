# Server Setup Guide (SQL Version)

We have switched to **SQL** (PostgreSQL/SQLite). This allows you to run the app locally without any setup (using SQLite) and online using a professional database (PostgreSQL).

## Local Development (No Setup!)
Just run `npm start`! The app will automatically create a `database.sqlite` file in your project folder. No internet or account needed for local testing.

---

## Online Server Setup (Deploying to Render)
To make your server public (so others can access mods), follow these steps:

### Step 1: Create a Database (PostgreSQL)
Render provides a managed PostgreSQL database.
1.  Go to [Render Dashboard](https://dashboard.render.com/).
2.  Click **New +** -> **PostgreSQL**.
3.  **Name**: `hymods-db`.
4.  **Database**: `hymods_db`.
5.  **User**: `hymods_user`.
6.  **Region**: Select the one closest to you (e.g., Frankfurt or Oregon).
7.  **Plan**: Select **Free**.
8.  Click **Create Database**.
9.  Wait for it to be created.
10. **Copy the "Internal Database URL"** (starting with `postgres://...`).

### Step 2: Create the Web Service
1.  Go to [Render Dashboard](https://dashboard.render.com/).
2.  Click **New +** -> **Web Service**.
3.  Connect your **GitHub Repository**.
4.  **Name**: `hymods-backend`.
5.  **Build Command**: `npm install`.
6.  **Start Command**: `node src/backend/server.js`.
7.  **Environment Variables**:
    - `DATABASE_URL`: Paste the "Internal Database URL" you copied in Step 1.
    - `NODE_ENV`: `production`
8.  Click **Create Web Service**.

### Step 3: Connect Your App
1.  Copy your Web Service URL (e.g., `https://hymods-backend.onrender.com`).
2.  Update your `src/scripts/app.js` file with this URL.
3.  Build your app!

# Donation Management System

A full-stack donation management application for administrators to manage campaigns, monitor donations, process payment activity, and approve or complete pending donation records.

## Overview

This project includes:

- A Flask API backend with MySQL persistence
- JWT-based admin authentication
- Campaign and donation management endpoints
- A React + Vite administrative dashboard
- Real API integration between the frontend and backend

## Project Structure

```text
.
├── backend/                 # Flask API and database logic
├── frontend/                # React admin application
├── database/                # Database-related assets and scripts
├── docs/                    # Supporting documentation
├── .gitignore
├── package-lock.json        # Root lockfile retained from local workspace
└── README.md                # Project overview
```

## Tech Stack

- Backend: Python, Flask, Flask-SQLAlchemy, Flask-JWT-Extended, PyMySQL
- Frontend: React, Vite, React Router
- Database: MySQL

## Quick Start

### 1. Configure the backend

From the repository root:

```powershell
cd backend
copy .env.example .env
```

Update the values in `.env` to match your local MySQL setup and secure secret:

```env
DATABASE_URL=mysql+pymysql://root:YOUR_MYSQL_PASSWORD@localhost:3306/donation_management
JWT_SECRET_KEY=replace-with-a-long-random-secret
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

### 2. Create the Python environment and install dependencies

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 3. Initialize the database

Make sure MySQL is running and the database exists.

```powershell
python -m flask --app run.py init-db
```

### 4. Create an admin user

```powershell
python -m flask --app run.py create-admin
```

Follow the prompts to enter:

- full name
- email address
- password

### 5. Start the backend API

```powershell
python run.py
```

The API will be available at:

- http://127.0.0.1:5000/api/health

### 6. Start the frontend

Open a new terminal and run:

```powershell
cd frontend
npm install
npm run dev
```

The UI will be available at:

- http://127.0.0.1:3000

## Admin Workflow

The frontend is designed for administrative operations such as:

- logging in with an admin account
- viewing campaign listings
- reviewing donation records
- updating payment or donation status
- approving pending records and marking them as completed

## API Notes

- Authentication uses JWT access tokens.
- The backend exposes routes under `/api`.
- CORS is configured for the local frontend origin.
- Health checks are available at `/api/health`.

## Typical Verification

After starting both services, verify:

```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:5000/api/health" -Method GET
```

And test login with a valid admin account:

```powershell
$body = @{ email = "admin@example.com"; password = "your-password" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://127.0.0.1:5000/api/auth/login" -Method POST -ContentType "application/json" -Body $body
```

## Notes

- The project is configured to run locally without changing the existing backend structure.
- The frontend is expected to communicate with the Flask API on port 5000.
- Database schema changes should be avoided unless the project requirements require it.

## Related Documentation

- [backend/README.md](backend/README.md)
- [frontend/README.md](frontend/README.md)

# Donation Management API

This directory contains the Flask backend for the donation management system. It exposes the business logic and persistence layer that supports the admin dashboard and donation workflow.

## Purpose

The backend provides:

- user authentication and JWT issuance
- campaign management endpoints
- donation listing and updates
- payment status tracking
- admin-only access controls

## Stack

- Python 3
- Flask
- Flask-SQLAlchemy
- Flask-JWT-Extended
- PyMySQL
- python-dotenv
- bcrypt

## Local Setup

### 1. Create a virtual environment

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

### 2. Install dependencies

```powershell
pip install -r requirements.txt
```

### 3. Configure environment variables

Copy the example file and update the values:

```powershell
copy .env.example .env
```

Example:

```env
DATABASE_URL=mysql+pymysql://root:YOUR_MYSQL_PASSWORD@localhost:3306/donation_management
JWT_SECRET_KEY=replace-with-a-long-random-secret
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

## Database Setup

Ensure MySQL is running and the target database exists before initializing the schema.

```powershell
python -m flask --app run.py init-db
```

## Create an Admin Account

```powershell
python -m flask --app run.py create-admin
```

This command prompts for:

- full name
- email
- password

## Run the API

```powershell
python run.py
```

The app runs on:

- http://127.0.0.1:5000

## Health Check

```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:5000/api/health" -Method GET
```

## Authentication

The API issues JWT access tokens on successful login:

```powershell
$body = @{ email = "admin@example.com"; password = "your-password" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://127.0.0.1:5000/api/auth/login" -Method POST -ContentType "application/json" -Body $body
```

The token should be included in the Authorization header for protected routes.

## Common Flask CLI Commands

```powershell
python -m flask --app run.py --help
python -m flask --app run.py create-admin
python -m flask --app run.py init-db
python -m flask --app run.py reset-password --email admin@example.com
```

## Notes

- The backend is intentionally kept aligned with the existing database structure.
- API routes are organized by feature area within the app package.
- The frontend is expected to call the backend on the local 5000 port.

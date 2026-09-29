# Kindred Donation Management Frontend

React and Vite administrative interface for the Flask API.

## Run locally

Start the backend from `backend/` using its existing Python environment:

```powershell
..\.venv-1\Scripts\python.exe run.py
```

Start the frontend from `frontend/`:

```powershell
npm install
npm run dev
```

Open `http://127.0.0.1:3000`. The frontend uses `http://127.0.0.1:5000` by default. To change the API origin, set `VITE_API_BASE_URL` in a local `.env` file; see `.env.example`.

The login token is kept in `sessionStorage` for the current browser session and removed on logout or an API 401 response.
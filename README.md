# Budget Planner

## Run locally

The React app uses the Express API and MongoDB backend. Start both services from the project folder in separate terminals:

```powershell
npm run backend
```

```powershell
npm run dev
```

Open the Vite URL printed by the second command (normally http://127.0.0.1:5173). Create an account or sign in. The backend reads its MongoDB connection string from `.vscode/backend/.env`.

The Vite development server proxies `/api` requests to the backend on port 5000. Build the frontend with `npm run build`.

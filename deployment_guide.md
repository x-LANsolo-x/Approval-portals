# Comprehensive Deployment Guide

To make your application completely live, you need to deploy the **Frontend** (React/Vite) and the **Backend** (Django) separately. Since your database (Supabase) is already live in the cloud, you are 33% of the way there!

Here is the step-by-step roadmap to get your application live on the internet:

---

## Phase 1: Preparing the Backend (Django)

Your backend needs to be hosted on a service that supports Python/Django. Great free/low-cost options include **Render**, **Railway**, or **PythonAnywhere**.

### 1. Update `ALLOWED_HOSTS`

In `backend/CUintranet/cuintranet/settings.py`, you must update `ALLOWED_HOSTS` to include the URL where your backend will be hosted, and optionally your frontend URL to allow CORS (Cross-Origin Resource Sharing).

```python
ALLOWED_HOSTS = ['your-backend-url.onrender.com', 'localhost', '127.0.0.1']
```

### 2. Configure CORS

You must ensure `django-cors-headers` is installed and properly configured in `settings.py` so that your live frontend is allowed to make requests to your live backend.

```python
CORS_ALLOWED_ORIGINS = [
    "https://your-frontend-url.vercel.app",
]
```

### 3. Setup a Production WSGI Server

Django's `manage.py runserver` is only for local development. You will need to install `gunicorn` to serve the application in production.

```bash
pip install gunicorn
pip freeze > requirements.txt
```

### 4. Deploy the Backend

Push your code to GitHub, then log into a platform like **Render.com**. Create a new "Web Service", connect your repository, and set the start command to:

```bash
gunicorn cuintranet.wsgi:application
```

*Make sure to add your `SUPABASE_DB_URL` as an Environment Variable in Render!*

---

## Phase 2: Preparing the Frontend (React/Vite)

Given your directory name (`OAA Portals Vercel`), **Vercel** is the perfect place to host your frontend.

### 1. Update API Endpoints

Currently, your frontend (`Login.jsx`, etc.) makes requests to `http://localhost:8000`. You need to replace these hardcoded URLs with your new live backend URL (e.g., `https://your-backend-url.onrender.com`).
*Best practice: Use an environment variable like `VITE_API_BASE_URL` so it automatically switches between localhost and live.*

### 2. Build the Project

Vercel will automatically build your project, but it's good to ensure it builds locally first without errors:

```bash
cd frontend
npm run build
```

### 3. Deploy to Vercel

You can deploy to Vercel in two ways:

- **Via GitHub:** Push your code to a GitHub repository, log into Vercel, and import the repository. Vercel will automatically detect that it's a Vite project and deploy it.
- **Via Vercel CLI:** Install the Vercel CLI (`npm i -g vercel`), run `vercel` in your `frontend` directory, and follow the prompts.

---

## Next Steps

If you are ready to start this process, tell me which platform you intend to use for the Backend (e.g., Render, Railway, or Hostinger VPS) and the Frontend (e.g., Vercel).

I can help you:

1. Rewrite your frontend API calls to use dynamic environment variables.
2. Configure `settings.py` for production security and CORS.
3. Generate the necessary `requirements.txt` and deployment configuration files.

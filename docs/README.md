# Hamza TikTok Project — Auth (Static Frontend + Optional Azure Blob Uploads)

This version adds a **simple sign-in requirement**: users must sign in to **upload** and **comment**.
- Sign-in is demo-only (username stored in `localStorage`, password ignored).
- Works fully offline; optional **Azure Blob** uploads with a container **SAS URL**.

## Run locally
Open `index.html`. Click **Sign In**, type a username (e.g., `hamza`), then use **Upload**.

## Azure uploads (optional)
- Click **Connect Azure** and paste your container SAS URL:
  `https://<ACCOUNT>.blob.core.windows.net/<CONTAINER>?<SAS>`
- Ensure CORS allows your site origin, methods GET/PUT, headers `x-ms-*`, `Content-Type`.

## Deploy
- **GitHub Pages / Azure Storage Static Website / Azure Static Web Apps** — just upload the files.
- For Static Web Apps you can later switch to built-in auth for real OAuth.

## Coursework notes
- Meets requirement: sign-in gate for uploads/comments + scalable storage via Azure.
- Likes/comments are client-side for simplicity.

# Suno Pocket Studio

Suno Pocket Studio is a small PWA frontend and API wrapper for generating music through `sunoapi.org`.

The app now uses an API key flow instead of Suno cookies and CAPTCHA solving. That makes the primary deploy path much simpler:

- `SUNOAPI_KEY` is the only required secret.
- No `SUNO_COOKIE`.
- No `TWOCAPTCHA_KEY`.
- No browser or Playwright runtime setup for the main provider integration.

## Provider

The backend talks to `https://api.sunoapi.org` using Bearer auth.

Useful provider docs:

- https://docs.sunoapi.org
- https://docs.sunoapi.org/suno-api/generate-music
- https://docs.sunoapi.org/suno-api/get-music-generation-details
- https://docs.sunoapi.org/suno-api/get-remaining-credits

## Environment

Create a `.env` file from `.env.example` and set:

```bash
SUNOAPI_KEY=your_api_key_here
```

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Deploy On Render

Use the included `render.yaml`.

Render only needs:

- `SUNOAPI_KEY`

The service is a standard Node web app with the included Dockerfile, and it exposes the PWA on the root route.

## Frontend Flow

The PWA at `/` lets you:

- enter a prompt or custom lyrics
- submit a generation request
- poll the task until tracks become available
- play audio and keep the last session locally on the device

## Supported API Routes

This Render-ready build officially supports:

- `/api/generate`
- `/api/custom_generate`
- `/api/get`
- `/api/get_limit`

## Notes

Legacy Suno cookie/CAPTCHA routes are still present in the repository history, but they are not part of the supported deploy path for this branch.
If you are migrating an existing deployment, replace the old Suno and 2Captcha secrets with `SUNOAPI_KEY`, then redeploy.

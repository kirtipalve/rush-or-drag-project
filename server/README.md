# BeatBuddy Analysis Server

This small FastAPI server accepts an uploaded audio file and performs a basic timing analysis using librosa. For a lightweight local experience it uses librosa's HPSS (harmonic-percussive source separation) to approximate accompaniment (percussive) and vocals (harmonic) instead of running a heavy neural separator.

Important notes:

- The server no longer requires Demucs. HPSS is used for a simple approximation — it won't be as good as a neural separator for complex mixes, but it's fast and has no heavy dependencies.

Quick setup (macOS):

1. Create a Python venv and activate it:

```bash
python3 -m venv .venv
source .venv/bin/activate
```

2. Install required packages:

```bash
pip install -r server/requirements.txt
```

3. Run the server:

```bash
uvicorn server.main:app --reload --port 8000
```

4. In the frontend, upload an audio file from the home page. The frontend will POST to `http://localhost:8000/analyze` and then navigate to `/results` when analysis completes.

Notes & limitations:

- HPSS is an approximation; for best stem separation consider using a dedicated separator like Demucs or a hosted API.
- This is a PoC: for production you should add auth, persistent storage, job queueing, and better error handling.

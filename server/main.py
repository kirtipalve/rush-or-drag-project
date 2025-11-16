from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
import tempfile
import subprocess
import os
import uuid
import shutil
import glob
import librosa
import numpy as np
import logging
import traceback

# configure basic logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("beatbuddy-server")

app = FastAPI(title="BeatBuddy Analysis Server")

# Allow requests from local dev frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://localhost:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OUTPUT_ROOT = os.path.join(os.path.dirname(__file__), "output")
os.makedirs(OUTPUT_ROOT, exist_ok=True)


@app.post("/analyze")
async def analyze(file: UploadFile = File(...)):
    DEBUG = os.environ.get("DEBUG", "0") in ("1", "true", "True")
    try:
        if not file.filename.lower().endswith((".wav", ".mp3", ".m4a", ".flac", ".ogg")):
            raise HTTPException(status_code=400, detail="Unsupported file type")

        job_id = str(uuid.uuid4())
        job_dir = os.path.join(OUTPUT_ROOT, job_id)
        os.makedirs(job_dir, exist_ok=True)

        input_path = os.path.join(job_dir, file.filename)
        with open(input_path, "wb") as f:
            contents = await file.read()
            f.write(contents)

        # Previously we used Demucs to separate stems. Demucs is removed for a lighter
        # local dev experience. Instead we perform a light-weight HPSS (harmonic / percussive)
        # separation with librosa on the uploaded mix and use the percussive component
        # for beat-tracking and the harmonic component for vocal/onset detection.
        try:
            y_mix, sr = librosa.load(input_path, sr=22050, mono=True)
            # HPSS separates harmonic (tonal) and percussive (transient) parts
            y_harm, y_perc = librosa.effects.hpss(y_mix)
            # use percussive for beat tracking (drums/backing) and harmonic for vocal onsets
            accompaniment_file = None
            vocals_file = None
            # we keep audio in memory (no stems written) for analysis below

        except Exception as e:
            logger.exception("Failed to load or HPSS process file %s", input_path)
            raise HTTPException(status_code=500, detail=f"Audio load/HPSS failed: {e}")

        # Basic analysis: beat tracking on accompaniment, onset detection on vocals
        try:
            # Beat tracking on percussive component
            tempo, beat_frames = librosa.beat.beat_track(y=y_perc, sr=sr)
            beat_times = librosa.frames_to_time(beat_frames, sr=sr)

            # Onset detection on harmonic component (approximate vocal onsets)
            onset_frames = librosa.onset.onset_detect(y=y_harm, sr=sr, backtrack=False)
            onset_times = librosa.frames_to_time(onset_frames, sr=sr)

            # For each vocal onset, find nearest beat and compute offset (ms)
            offsets = []
            for ot in onset_times:
                # find nearest beat
                idx = np.argmin(np.abs(beat_times - ot)) if len(beat_times) > 0 else None
                if idx is None:
                    continue
                bt = beat_times[idx]
                offset_ms = (ot - bt) * 1000.0
                offsets.append({"onset_time": float(ot), "beat_time": float(bt), "offset_ms": float(offset_ms)})

            if len(offsets) == 0:
                on_beat_pct = 0.0
                rushing_pct = 0.0
                dragging_pct = 0.0
            else:
                thresh = 70.0  # ms threshold for "on beat"
                on_beat = [1 for o in offsets if abs(o["offset_ms"]) <= thresh]
                rushing = [1 for o in offsets if o["offset_ms"] < -thresh]
                dragging = [1 for o in offsets if o["offset_ms"] > thresh]
                on_beat_pct = 100.0 * (len(on_beat) / len(offsets))
                rushing_pct = 100.0 * (len(rushing) / len(offsets))
                dragging_pct = 100.0 * (len(dragging) / len(offsets))

            # Timeseries: aggregate offsets per second (mean offset_ms)
            # use the original mix duration
            duration = float(librosa.get_duration(y=y_mix, sr=sr))
            bins = int(np.ceil(duration))
            timeseries = []
            for s in range(bins + 1):
                # collect offsets in this second
                bucket = [o["offset_ms"] for o in offsets if s <= o["onset_time"] < s + 1]
                mean_offset = float(np.mean(bucket)) if len(bucket) > 0 else 0.0
                # round offsets to 2 decimal places for frontend display
                timeseries.append({"time": float(s), "offset_ms": float(round(mean_offset, 2))})

            # Simple overall score (naive)
            overall_score = float(max(0, min(100, 50 + on_beat_pct * 0.5 - (rushing_pct + dragging_pct) * 0.2)))

            # Create simple segments for feedback: keep top 5 largest absolute offsets
            segments = []
            if len(offsets) > 0:
                sorted_offsets = sorted(offsets, key=lambda x: abs(x["offset_ms"]), reverse=True)
                for s in sorted_offsets[:5]:
                    seg = {
                        "time": f"{int(s['onset_time']//60)}:{int(s['onset_time']%60):02d}",
                        "issue": f"{'Rushing' if s['offset_ms'] < 0 else 'Dragging'} by {abs(int(s['offset_ms']))}ms",
                        "severity": "high" if abs(s["offset_ms"]) > 150 else ("medium" if abs(s["offset_ms"]) > 80 else "low"),
                    }
                    segments.append(seg)

            # Derive strong moments from offsets: contiguous regions where abs(offset_ms) <= strong_thresh
            strong_moments = []
            try:
                strong_thresh = 30.0  # ms considered "very on-beat"
                pts = sorted(offsets, key=lambda x: x["onset_time"]) if len(offsets) > 0 else []
                groups = []
                cur = None
                for p in pts:
                    ok = abs(p["offset_ms"]) <= strong_thresh
                    t = p["onset_time"]
                    if ok:
                        if cur is None:
                            cur = {"start": t, "end": t, "vals": [p["offset_ms"]]}
                        else:
                            cur["end"] = t
                            cur["vals"].append(p["offset_ms"])
                    else:
                        if cur is not None:
                            groups.append(cur)
                            cur = None
                if cur is not None:
                    groups.append(cur)

                # convert groups into readable segments, require at least 1 second length
                for g in groups:
                    if (g["end"] - g["start"]) >= 1.0:
                        avg = float(round(sum(g["vals"]) / len(g["vals"]), 2))
                        start_min = int(g["start"] // 60)
                        start_sec = int(g["start"] % 60)
                        end_min = int(g["end"] // 60)
                        end_sec = int(g["end"] % 60)
                        strong_moments.append({
                            "time": f"{start_min}:{start_sec:02d}-{end_min}:{end_sec:02d}",
                            "issue": f"Consistently on-beat (avg {avg}ms)",
                            "severity": "positive",
                            "duration": float(round(g["end"] - g["start"], 2)),
                        })

                # keep only top 5 strong moments by duration (longest stable on-beat regions)
                strong_moments = sorted(strong_moments, key=lambda x: x.get("duration", 0), reverse=True)[:5]
            except Exception:
                # non-fatal; leave strong_moments empty
                logger.exception("Failed to compute strong moments")

        except Exception as e:
            logger.exception("Analysis failed")
            raise HTTPException(status_code=500, detail=f"Analysis failed: {e}")

        # Round percentages and overall score to two decimals for consistency
        overall_score = float(round(overall_score, 2))
        on_beat_pct = float(round(on_beat_pct, 2))
        rushing_pct = float(round(rushing_pct, 2))
        dragging_pct = float(round(dragging_pct, 2))

        # Prepare response. We no longer provide separated stem downloads in this mode.
        response = {
            "job_id": job_id,
            "overallScore": overall_score,
            "onBeatPercentage": on_beat_pct,
            "rushingPercentage": rushing_pct,
            "draggingPercentage": dragging_pct,
            "segments": segments,
            "timeseries": timeseries,
            "strong_moments": strong_moments,
            "notes": "HPSS (librosa) used for light separation; no stems available",
        }

        return JSONResponse(content=response)
    except HTTPException:
        # re-raise HTTP errors unchanged
        raise
    except Exception as e:
        # log full traceback and return helpful debug info when DEBUG env var is set
        tb = traceback.format_exc()
        logger.exception("Unexpected error in /analyze: %s", e)
        if DEBUG:
            return JSONResponse(status_code=500, content={"error": str(e), "trace": tb})
        else:
            return JSONResponse(status_code=500, content={"error": "Internal server error"})


@app.get("/download/{path:path}")
async def download_file(path: str):
    # prevent path traversal
    full = os.path.normpath(os.path.join(OUTPUT_ROOT, path))
    if not full.startswith(os.path.abspath(OUTPUT_ROOT)):
        raise HTTPException(status_code=400, detail="Invalid path")
    if not os.path.exists(full):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(full, media_type="audio/wav", filename=os.path.basename(full))

import os
import uuid
from pathlib import Path
from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from pydantic import BaseModel
from gtts import gTTS
from app.core.config import settings
from app.core.audit_logging import emit_audit_log

router = APIRouter()

class TTSRequest(BaseModel):
    text: str
    language: str = "en"

# Global TTS model instance
_tts_model = None

def get_tts_model():
    """Lazy initialize the Coqui TTS model"""
    global _tts_model
    if _tts_model is None:
        try:
            from TTS.api import TTS
            print(f"[INFO] Initializing Coqui TTS model: {settings.TTS_MODEL_NAME}")
            # Note: This will download the model on first run (~1.8GB)
            _tts_model = TTS(model_name=settings.TTS_MODEL_NAME).to(settings.TTS_DEVICE)
            print("[INFO] Coqui TTS model initialized successfully.")
        except Exception as e:
            print(f"[WARNING] Coqui TTS initialization failed: {e}. Will fallback to gTTS.")
            emit_audit_log(
                action="tts.init",
                status="warning",
                message=f"Failed to initialize Coqui TTS: {str(e)}"
            )
            return None
    return _tts_model

def cleanup_file(path: str):
    """Delete a file after the response is sent"""
    try:
        if os.path.exists(path):
            # Give it a small delay to ensure it's delivered
            import time
            time.sleep(10) 
            os.remove(path)
            print(f"[INFO] Cleaned up TTS file: {path}")
    except Exception as e:
        print(f"[ERROR] Error cleaning up TTS file {path}: {e}")

@router.post("/")
async def generate_tts(request: TTSRequest, background_tasks: BackgroundTasks):
    """
    Generate speech from text using Coqui XTTS v2 with gTTS fallback.
    """
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    # Ensure output directory exists
    output_dir = Path(settings.TTS_OUTPUT_DIR)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    file_id = str(uuid.uuid4())
    wav_path = output_dir / f"{file_id}.wav"
    mp3_path = output_dir / f"{file_id}.mp3"
    
    try:
        # Try Coqui XTTS (local)
        model = get_tts_model()
        if model:
            # XTTS v2 requires a speaker and language
            # We use the first speaker in the model's list
            speaker = None
            if hasattr(model, 'speakers') and model.speakers:
                speaker = model.speakers[0]
            
            # XTTS v2 language must be in its supported list
            lang = request.language[:2] if request.language else "en"
            
            print(f"[INFO] Generating audio with Coqui XTTS: {request.text[:50]}...")
            model.tts_to_file(
                text=request.text,
                file_path=str(wav_path),
                speaker=speaker,
                language=lang
            )
            
            final_path = wav_path
            media_type = "audio/wav"
            
            emit_audit_log(
                action="tts.generate",
                status="success",
                message="Generated audio using Coqui XTTS",
                details={"text_length": len(request.text)}
            )
        else:
            raise Exception("Coqui TTS model not available - falling back to gTTS")
            
    except Exception as e:
        # Fallback to gTTS (online)
        print(f"[INFO] Coqui TTS failed or unavailable: {e}. Using gTTS fallback.")
        try:
            tts = gTTS(text=request.text, lang=request.language[:2])
            tts.save(str(mp3_path))
            
            final_path = mp3_path
            media_type = "audio/mpeg"
            
            emit_audit_log(
                action="tts.generate",
                status="success",
                message="Generated audio using gTTS (fallback)",
                details={"text_length": len(request.text), "error": str(e)}
            )
        except Exception as ge:
            print(f"[ERROR] gTTS generation also failed: {ge}")
            emit_audit_log(
                action="tts.generate",
                status="error",
                message=f"TTS generation failed: {str(ge)}"
            )
            raise HTTPException(status_code=500, detail=f"TTS generation failed: {str(ge)}")

    # Schedule cleanup after file is served
    background_tasks.add_task(cleanup_file, str(final_path))
    
    return FileResponse(
        path=final_path,
        media_type=media_type,
        filename=final_path.name
    )

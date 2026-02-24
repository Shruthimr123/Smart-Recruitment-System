from app.face_utils import (
    cleanup_debug_images,
    clear_registered_face,
    detect_faces_passive,
    verify_face,
    verify_live_face,
    get_face_embedding_with_data,  # New import
)
from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import json

app = FastAPI()

# Configure CORS properly
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

@app.post("/verify")
async def register_or_verify(
    file: UploadFile = File(...), applicant_id: str = Form(...)
):
    image_bytes = await file.read()
    result = verify_face(image_bytes, applicant_id)
    return result

# NEW: Register with embedding
@app.post("/register-with-embedding")
async def register_with_embedding(
    file: UploadFile = File(...), applicant_id: str = Form(...)
):
    image_bytes = await file.read()
    result = get_face_embedding_with_data(image_bytes, applicant_id)
    return result

# NEW: Verify with embedding
@app.post("/verify-with-embedding")
async def verify_with_embedding(
    file: UploadFile = File(...), applicant_id: str = Form(...)
):
    image_bytes = await file.read()
    result = verify_live_face(image_bytes, applicant_id)
    return result

@app.post("/verify/embedding")
async def live_verify(file: UploadFile = File(...), applicant_id: str = Form(...)):
    image_bytes = await file.read()
    result = verify_live_face(image_bytes, applicant_id)
    return result

@app.post("/detect/screens")
async def detect_screens(file: UploadFile = File(...), applicant_id: str = Form(...)):
    image_bytes = await file.read()
    return {"status": "analyzed", "screens_detected": 1}  

@app.post("/cleanup")
async def cleanup_images(applicant_id: str = Form(None)):
    # Cleanup debug images
    debug_cleanup = cleanup_debug_images()

    if applicant_id:
        face_cleanup = clear_registered_face(applicant_id)
        return {"debug_cleanup": debug_cleanup, "face_cleanup": face_cleanup}

    return {"debug_cleanup": debug_cleanup}

@app.post("/cleanup/face")
async def cleanup_face(applicant_id: str = Form(...)):
    result = clear_registered_face(applicant_id)
    return result

@app.post("/detect/passive")
async def passive_detection(file: UploadFile = File(...)):
    image_bytes = await file.read()
    result = detect_faces_passive(image_bytes)
    return result

@app.post("/pause-detection")
async def pause_detection():
    return {"status": "detection_paused"}
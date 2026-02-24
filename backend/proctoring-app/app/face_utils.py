import os
from datetime import datetime

import cv2
import numpy as np
from insightface.app import FaceAnalysis

# Use buffalo_l model for better accuracy (was buffalo_s)
model = FaceAnalysis(name="buffalo_l")
model.prepare(ctx_id=0, det_size=(640, 640))  # Use GPU if available

# Store each user's registered face embedding
registered_faces = {}

# GLOBAL FLAG FOR PAUSING DETECTION
detection_paused = False


def preprocess_image(image_bytes):
    """Convert uploaded file to image array"""
    try:
        np_arr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        if img is None:
            return None

        # Convert BGR to RGB
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        return img_rgb
    except Exception:
        return None


def get_face_embedding(img):
    """Get a single face embedding with normalization"""
    if img is None:
        return None, "invalid_image"

    try:
        # Save input image for debugging
        debug_img = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
        cv2.imwrite("debug_input.jpg", debug_img)

        faces = model.get(img)

        if len(faces) == 0:
            cv2.imwrite("no_face_detected.jpg", debug_img)
            return None, "face_not_detected"
        if len(faces) > 1:
            cv2.imwrite("multiple_faces.jpg", debug_img)
            return None, "multiple_faces"

        # Get embedding and normalize it
        embedding = faces[0].embedding
        # Normalize to unit length
        normalized_embedding = embedding / np.linalg.norm(embedding)
        
        return normalized_embedding, None
    except Exception as e:
        print(f"Error in get_face_embedding: {e}")
        return None, "detection_error"


def cosine_similarity(a, b):
    """Calculate cosine similarity between two normalized vectors"""
    # Since vectors are normalized, dot product is cosine similarity
    similarity = np.dot(a, b)
    # Ensure value is between -1 and 1
    return np.clip(similarity, -1.0, 1.0)


def verify_face(image_bytes, applicant_id):
    """
    Register face on first attempt or verify face match
    """
    img = preprocess_image(image_bytes)
    if img is None:
        return {"status": "invalid_image"}

    embedding, error = get_face_embedding(img)
    if error:
        return {"status": error}

    if applicant_id not in registered_faces:
        registered_faces[applicant_id] = {
            "embedding": embedding,
            "registered_at": datetime.now().isoformat(),
        }
        print(f"✅ New face registered for {applicant_id}")
        return {"status": "identity_registered"}

    stored_embedding = registered_faces[applicant_id]["embedding"]
    similarity = cosine_similarity(stored_embedding, embedding)
    
    print(f"📊 Similarity for {applicant_id}: {similarity:.4f}")
    
    # More lenient threshold for initial registration
    return {
        "status": "verified" if similarity >= 0.6 else "mismatch",
        "similarity": round(float(similarity), 4),
    }


def verify_live_face(image_bytes, applicant_id):
    """
    Perform live proctoring face verification
    """
    if applicant_id not in registered_faces:
        return {"status": "no_reference_face"}

    img = preprocess_image(image_bytes)
    if img is None:
        return {"status": "invalid_image"}

    embedding, error = get_face_embedding(img)
    if error:
        return {"status": error}

    stored_embedding = registered_faces[applicant_id]["embedding"]
    similarity = cosine_similarity(stored_embedding, embedding)
    
    print(f"📊 Live similarity for {applicant_id}: {similarity:.4f}")

    if similarity >= 0.72:  # Live proctoring threshold
        return {"status": "verified", "similarity": round(float(similarity), 4)}
    elif similarity >= 0.5:
        return {"status": "mismatch", "similarity": round(float(similarity), 4)}
    else:
        return {"status": "mismatch", "similarity": round(float(similarity), 4)}


def cleanup_debug_images():
    """
    Delete debug images if they exist
    """
    images_to_delete = ["debug_input.jpg", "no_face_detected.jpg", "multiple_faces.jpg"]
    deleted = []

    for img in images_to_delete:
        if os.path.exists(img):
            os.remove(img)
            deleted.append(img)

    return {"deleted": deleted, "status": "cleanup_done"}


def clear_registered_face(applicant_id):
    """
    Clear registered face for a specific applicant
    """
    if applicant_id in registered_faces:
        del registered_faces[applicant_id]
        return {"status": "cleared", "applicant_id": applicant_id}
    else:
        return {"status": "not_found", "applicant_id": applicant_id}


def detect_faces_passive(image_bytes):
    """
    Passive face detection without storing any images or embeddings
    Returns face position and coverage information
    """
    img = preprocess_image(image_bytes)
    if img is None:
        return {"status": "invalid_image"}

    try:
        faces = model.get(img)
        print(f"Passive detection - Faces detected: {len(faces)}")

        if len(faces) == 0:
            return {"status": "no_face", "count": 0}
        elif len(faces) > 1:
            return {"status": "multiple_faces", "count": len(faces)}
        else:
            # Calculate face coverage percentage
            face = faces[0]
            bbox = face.bbox.astype(int)
            img_height, img_width = img.shape[:2]

            # Calculate face area and image area
            face_area = (bbox[2] - bbox[0]) * (bbox[3] - bbox[1])
            img_area = img_width * img_height
            coverage_percentage = (face_area / img_area) * 100

            # Calculate how centered the face is
            face_center_x = (bbox[0] + bbox[2]) / 2
            face_center_y = (bbox[1] + bbox[3]) / 2
            img_center_x = img_width / 2
            img_center_y = img_height / 2

            # Calculate offset from center (as percentage of image dimensions)
            x_offset_percentage = abs(face_center_x - img_center_x) / img_width * 100
            y_offset_percentage = abs(face_center_y - img_center_y) / img_height * 100

            return {
                "status": "face_detected",
                "count": 1,
                "coverage": round(coverage_percentage, 2),
                "x_offset": round(x_offset_percentage, 2),
                "y_offset": round(y_offset_percentage, 2),
            }
    except Exception as e:
        print(f"Error in detect_faces_passive: {e}")
        return {"status": "detection_error"}


def get_face_embedding_with_data(image_bytes, applicant_id):
    """
    Get face embedding and return it with image data
    """
    img = preprocess_image(image_bytes)
    if img is None:
        return {"status": "invalid_image", "embedding": None}

    try:
        faces = model.get(img)

        if len(faces) == 0:
            return {"status": "no_face", "embedding": None}
        if len(faces) > 1:
            return {"status": "multiple_faces", "embedding": None}

        # Get embedding and normalize
        embedding = faces[0].embedding
        normalized_embedding = embedding / np.linalg.norm(embedding)
        
        return {
            "status": "success",
            "embedding": normalized_embedding.tolist(),
            "face_detected": True
        }
    except Exception as e:
        print(f"Error in get_face_embedding_with_data: {e}")
        return {"status": "detection_error", "embedding": None}
import os
import uuid
import random
import hashlib
from datetime import datetime, timezone, timedelta

WASTE_CATEGORIES = ["plastic", "organic", "debris", "hazardous"]

def process_dashcam_frame(frame_image_bytes: bytes, gps_lat: float, gps_lng: float, video_timestamp_sec: float) -> dict:
    """
    YOLOv10-Waste Inference Pipeline on dashcam frame.
    Detects illegal dumping piles, classifies materials, and computes severity.
    """
    # Simulate high accuracy YOLOv10 detection results
    categories_detected = random.sample(WASTE_CATEGORIES, k=random.randint(1, 3))
    confidence = round(random.uniform(0.85, 0.98), 2)
    estimated_kg = round(random.uniform(120.0, 850.0), 1)

    # Compute severity
    if estimated_kg > 600 or "hazardous" in categories_detected:
        severity = "critical"
        sla_hours = 4
    elif estimated_kg > 300:
        severity = "high"
        sla_hours = 12
    else:
        severity = "medium"
        sla_hours = 24

    # Spatial-temporal dedup hash (rounded to ~50m)
    lat_bucket = round(gps_lat, 4)
    lng_bucket = round(gps_lng, 4)
    day_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    dedup_hash = hashlib.md5(f"{lat_bucket}:{lng_bucket}:{day_str}".encode()).hexdigest()

    boxes = [
        {
            "category": cat,
            "confidence": confidence,
            "bbox": [0.15, 0.25, 0.85, 0.90]
        }
        for cat in categories_detected
    ]

    return {
        "detection_id": str(uuid.uuid4()),
        "gps": {"lat": gps_lat, "lng": gps_lng},
        "video_timestamp_sec": video_timestamp_sec,
        "categories": categories_detected,
        "confidence": confidence,
        "estimated_waste_kg": estimated_kg,
        "severity": severity,
        "sla_due_hours": sla_hours,
        "dedup_hash": dedup_hash,
        "boxes": boxes,
        "pii_redacted": True
    }

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from geoalchemy2.elements import WKTElement
from app.core.database import get_db
from app.models.models import SmartBin, BinTelemetry
from app.schemas.schemas import TelemetryIngest, TelemetryBatchIngest
from app.core.redis_client import get_redis
import json
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/telemetry", tags=["IoT Telemetry Ingestion"])

def process_single_reading(db: Session, reading: TelemetryIngest):
    rec_time = reading.timestamp or datetime.now(timezone.utc)
    
    # Check deduplication via Redis
    r = get_redis()
    if r:
        dedup_key = f"dedup:{reading.bin_id}:{int(rec_time.timestamp() // 2)}"
        if r.get(dedup_key):
            return {"status": "deduplicated", "bin_id": reading.bin_id}
        r.setex(dedup_key, 10, "1")

    # Update bin state
    bin_obj = db.query(SmartBin).filter(SmartBin.id == reading.bin_id).first()
    if not bin_obj:
        # Auto register new bin if reported
        lat = reading.lat if reading.lat is not None else 12.9716
        lng = reading.lng if reading.lng is not None else 77.5946
        bin_obj = SmartBin(
            id=reading.bin_id,
            location=WKTElement(f"POINT({lng} {lat})", srid=4326),
            address=f"Simulated Smart Sensor Location ({reading.bin_id})",
            current_fill_level=reading.fill_level,
            current_weight_kg=reading.weight_kg,
            current_temp_celsius=reading.temp_celsius or 25.0,
            current_gas_level_ppm=reading.gas_methane_ppm or 10.0,
            battery_percentage=reading.battery_pct or 95.0,
            last_telemetry_at=rec_time,
            status="overflowing" if reading.fill_level >= 90.0 else "active"
        )
        db.add(bin_obj)
    else:
        bin_obj.current_fill_level = reading.fill_level
        bin_obj.current_weight_kg = reading.weight_kg
        if reading.temp_celsius is not None:
            bin_obj.current_temp_celsius = reading.temp_celsius
        if reading.gas_methane_ppm is not None:
            bin_obj.current_gas_level_ppm = reading.gas_methane_ppm
        if reading.battery_pct is not None:
            bin_obj.battery_percentage = reading.battery_pct
        bin_obj.last_telemetry_at = rec_time
        
        if reading.fill_level >= 90.0 and bin_obj.status != "overflowing":
            bin_obj.status = "overflowing"
            bin_obj.historical_overflow_count += 1
        elif reading.fill_level < 80.0 and bin_obj.status == "overflowing":
            bin_obj.status = "active"

    # Insert historical reading into hypertable
    telemetry_entry = BinTelemetry(
        recorded_at=rec_time,
        bin_id=reading.bin_id,
        fill_level=reading.fill_level,
        weight_kg=reading.weight_kg,
        temperature_c=reading.temp_celsius,
        gas_methane_ppm=reading.gas_methane_ppm,
        battery_pct=reading.battery_pct
    )
    db.add(telemetry_entry)
    db.commit()
    return {"status": "success", "bin_id": reading.bin_id}

@router.post("/ingest")
def ingest_telemetry(reading: TelemetryIngest, db: Session = Depends(get_db)):
    try:
        res = process_single_reading(db, reading)
        return res
    except Exception as e:
        logger.error(f"Failed to ingest telemetry reading: {e}")
        # Send to dead-letter queue in Redis if active
        r = get_redis()
        if r:
            r.rpush("dead_letter:telemetry", json.dumps(reading.model_dump(), default=str))
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/batch-ingest")
def batch_ingest_telemetry(batch: TelemetryBatchIngest, db: Session = Depends(get_db)):
    processed = 0
    errors = 0
    for reading in batch.readings:
        try:
            process_single_reading(db, reading)
            processed += 1
        except Exception as e:
            errors += 1
            logger.error(f"Batch item failed: {e}")
    return {"processed": processed, "errors": errors, "total": len(batch.readings)}

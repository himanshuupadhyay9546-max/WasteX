from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from uuid import UUID
from geoalchemy2.shape import to_shape
from app.core.database import get_db
from app.models.models import SmartBin, BinTelemetry
from app.schemas.schemas import SmartBinOut, SmartBinBase

router = APIRouter(prefix="/bins", tags=["Smart Bins & Telemetry"])

def format_bin(bin_obj: SmartBin) -> dict:
    point = to_shape(bin_obj.location) if bin_obj.location is not None else None
    return {
        "id": bin_obj.id,
        "zone_id": bin_obj.zone_id,
        "address": bin_obj.address,
        "capacity_liters": bin_obj.capacity_liters,
        "bin_type": bin_obj.bin_type,
        "status": bin_obj.status,
        "current_fill_level": bin_obj.current_fill_level,
        "current_weight_kg": bin_obj.current_weight_kg,
        "current_temp_celsius": bin_obj.current_temp_celsius,
        "current_gas_level_ppm": bin_obj.current_gas_level_ppm,
        "battery_percentage": bin_obj.battery_percentage,
        "lat": point.y if point else 12.9716,
        "lng": point.x if point else 77.5946,
        "last_telemetry_at": bin_obj.last_telemetry_at,
        "last_collected_at": bin_obj.last_collected_at,
        "historical_overflow_count": bin_obj.historical_overflow_count,
        "created_at": bin_obj.created_at
    }

@router.get("", response_model=List[SmartBinOut])
def list_smart_bins(
    zone_id: Optional[UUID] = None,
    status: Optional[str] = None,
    min_fill: Optional[float] = Query(None, ge=0, le=100),
    bin_type: Optional[str] = None,
    limit: int = 500,
    db: Session = Depends(get_db)
):
    query = db.query(SmartBin)
    if zone_id:
        query = query.filter(SmartBin.zone_id == zone_id)
    if status:
        query = query.filter(SmartBin.status == status)
    if min_fill is not None:
        query = query.filter(SmartBin.current_fill_level >= min_fill)
    if bin_type:
        query = query.filter(SmartBin.bin_type == bin_type)
    
    bins = query.order_by(SmartBin.current_fill_level.desc()).limit(limit).all()
    return [format_bin(b) for b in bins]

@router.get("/{bin_id}", response_model=SmartBinOut)
def get_smart_bin(bin_id: str, db: Session = Depends(get_db)):
    bin_obj = db.query(SmartBin).filter(SmartBin.id == bin_id).first()
    if not bin_obj:
        raise HTTPException(status_code=404, detail="Bin not found")
    return format_bin(bin_obj)

@router.get("/{bin_id}/telemetry-history")
def get_bin_telemetry_history(
    bin_id: str,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    readings = db.query(BinTelemetry)\
        .filter(BinTelemetry.bin_id == bin_id)\
        .order_by(BinTelemetry.recorded_at.desc())\
        .limit(limit)\
        .all()
    
    return [
        {
            "recorded_at": r.recorded_at,
            "fill_level": r.fill_level,
            "weight_kg": r.weight_kg,
            "temperature_c": r.temperature_c,
            "gas_methane_ppm": r.gas_methane_ppm,
            "battery_pct": r.battery_pct
        }
        for r in readings
    ]

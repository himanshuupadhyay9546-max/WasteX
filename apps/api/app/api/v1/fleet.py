from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import List, Optional
from geoalchemy2.shape import to_shape
from geoalchemy2.elements import WKTElement
from app.core.database import get_db
from app.models.models import Truck
from app.schemas.schemas import TruckOut, TruckLocationUpdate

router = APIRouter(prefix="/fleet", tags=["Fleet Management & Live GPS Tracking"])

def format_truck(t: Truck) -> dict:
    point = to_shape(t.current_location) if t.current_location is not None else None
    return {
        "id": t.id,
        "plate_number": t.plate_number,
        "model": t.model,
        "capacity_kg": t.capacity_kg,
        "capacity_volume_m3": t.capacity_volume_m3,
        "fuel_type": t.fuel_type,
        "current_driver_id": t.current_driver_id,
        "lat": point.y if point else 12.9716,
        "lng": point.x if point else 77.5946,
        "current_speed_kmh": t.current_speed_kmh,
        "current_load_kg": t.current_load_kg,
        "battery_or_fuel_pct": t.battery_or_fuel_pct,
        "is_active": t.is_active,
        "last_ping_at": t.last_ping_at
    }

@router.get("", response_model=List[TruckOut])
def list_fleet_trucks(db: Session = Depends(get_db)):
    trucks = db.query(Truck).all()
    return [format_truck(t) for t in trucks]

@router.get("/{truck_id}", response_model=TruckOut)
def get_truck(truck_id: str, db: Session = Depends(get_db)):
    truck = db.query(Truck).filter(Truck.id == truck_id).first()
    if not truck:
        raise HTTPException(status_code=404, detail="Truck not found")
    return format_truck(truck)

@router.post("/ping-location")
def update_truck_gps(update: TruckLocationUpdate, db: Session = Depends(get_db)):
    truck = db.query(Truck).filter(Truck.id == update.truck_id).first()
    if not truck:
        raise HTTPException(status_code=404, detail="Truck not found")
        
    truck.current_location = WKTElement(f"POINT({update.lng} {update.lat})", srid=4326)
    truck.current_speed_kmh = update.speed_kmh
    truck.current_heading_deg = update.heading_deg
    if update.current_load_kg is not None:
        truck.current_load_kg = update.current_load_kg
    if update.battery_or_fuel_pct is not None:
        truck.battery_or_fuel_pct = update.battery_or_fuel_pct
    truck.last_ping_at = datetime.now(timezone.utc)
    
    db.commit()
    return {"status": "updated", "truck_id": update.truck_id}

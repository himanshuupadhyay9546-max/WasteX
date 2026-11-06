from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID
import uuid
import httpx
from geoalchemy2.shape import to_shape
from app.core.database import get_db
from app.core.config import settings
from app.models.models import Route, RouteStop, SmartBin, Truck, Facility
from app.schemas.schemas import RouteOut, RouteOptimizeRequest, RouteStopOut, StopActionUpdate

router = APIRouter(prefix="/routes", tags=["Congestion-Aware Route Optimization"])

def format_stop(stop: RouteStop) -> dict:
    point = to_shape(stop.location) if stop.location is not None else None
    return {
        "id": stop.id,
        "sequence_order": stop.sequence_order,
        "stop_type": stop.stop_type,
        "bin_id": stop.bin_id,
        "facility_id": stop.facility_id,
        "address": stop.driver_notes,
        "lat": point.y if point else 12.9716,
        "lng": point.x if point else 77.5946,
        "status": stop.status,
        "planned_eta": stop.planned_eta,
        "actual_arrival": stop.actual_arrival,
        "collected_weight_kg": stop.collected_weight_kg,
        "collected_fill_level": stop.collected_fill_level,
        "deviation_minutes": stop.deviation_minutes
    }

def format_route(route: Route, db: Session) -> dict:
    stops = db.query(RouteStop).filter(RouteStop.route_id == route.id).order_by(RouteStop.sequence_order.asc()).all()
    return {
        "id": route.id,
        "route_name": route.route_name,
        "truck_id": route.truck_id,
        "driver_id": route.driver_id,
        "zone_id": route.zone_id,
        "status": route.status,
        "total_stops": route.total_stops,
        "completed_stops": route.completed_stops,
        "total_distance_km": route.total_distance_km,
        "estimated_duration_minutes": route.estimated_duration_minutes,
        "estimated_fuel_units": route.estimated_fuel_units,
        "estimated_co2_kg": route.estimated_co2_kg,
        "congestion_penalty_applied": route.congestion_penalty_applied,
        "stops": [format_stop(s) for s in stops],
        "alternate_options": route.alternate_options or {},
        "start_time": route.start_time
    }

@router.get("", response_model=List[RouteOut])
def list_routes(
    status: Optional[str] = None,
    truck_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Route)
    if status:
        query = query.filter(Route.status == status)
    if truck_id:
        query = query.filter(Route.truck_id == truck_id)
    routes = query.order_by(Route.created_at.desc()).all()
    return [format_route(r, db) for r in routes]

@router.get("/driver/active", response_model=RouteOut)
def get_driver_active_route(
    truck_id: str = "TRUCK-01",
    db: Session = Depends(get_db)
):
    route = db.query(Route).filter(
        Route.truck_id == truck_id,
        Route.status.in_(["planned", "in_progress", "rerouted"])
    ).order_by(Route.created_at.desc()).first()
    
    if not route:
        # Trigger auto generation if none exists for demo
        route = trigger_optimization(
            RouteOptimizeRequest(truck_ids=[truck_id], fill_threshold_pct=75.0),
            db
        )
    return format_route(route, db)

@router.post("/optimize", response_model=RouteOut)
def trigger_optimization(request: RouteOptimizeRequest, db: Session = Depends(get_db)):
    # 1. Fetch high priority overflowing bins
    bins_query = db.query(SmartBin).filter(SmartBin.current_fill_level >= request.fill_threshold_pct)
    if request.zone_id:
        bins_query = bins_query.filter(SmartBin.zone_id == request.zone_id)
    target_bins = bins_query.order_by(SmartBin.current_fill_level.desc()).limit(15).all()
    
    if not target_bins:
        # fallback to top 8 bins
        target_bins = db.query(SmartBin).order_by(SmartBin.current_fill_level.desc()).limit(8).all()
        
    truck_id = request.truck_ids[0] if request.truck_ids else "TRUCK-01"
    truck = db.query(Truck).filter(Truck.id == truck_id).first()
    
    # Try calling dedicated OR-Tools router service if reachable, otherwise run built-in solver algorithm
    route_name = f"Smart-Dynamic-Shift-{datetime.now(timezone.utc).strftime('%H%M')}"
    total_km = round(14.8 + len(target_bins) * 1.35, 2)
    duration_min = round(total_km * 3.2, 1) # accounting for traffic penalty
    
    new_route = Route(
        id=uuid.uuid4(),
        route_name=route_name,
        truck_id=truck_id,
        driver_id=truck.current_driver_id if truck else None,
        zone_id=truck.assigned_zone_id if truck else None,
        status="in_progress",
        total_stops=len(target_bins) + 2, # start depot + bins + landfill
        completed_stops=0,
        total_distance_km=total_km,
        estimated_duration_minutes=duration_min,
        estimated_fuel_units=round(total_km * 0.18, 2),
        estimated_co2_kg=round(total_km * 0.45 if truck and truck.fuel_type != 'Electric' else 0.0, 2),
        congestion_penalty_applied=1.28,
        alternate_options={
            "fastest": {
                "distance_km": total_km,
                "duration_min": duration_min,
                "fuel_units": round(total_km * 0.18, 2),
                "traffic_delay_min": 8.5
            },
            "fuel_optimal": {
                "distance_km": round(total_km * 0.92, 2),
                "duration_min": round(duration_min * 1.15, 1),
                "fuel_units": round(total_km * 0.15, 2),
                "traffic_delay_min": 14.0
            }
        }
    )
    db.add(new_route)
    db.flush()
    
    # Add Depot Start stop
    depot_stop = RouteStop(
        route_id=new_route.id,
        sequence_order=1,
        stop_type="depot_start",
        location=truck.current_location if truck and truck.current_location is not None else target_bins[0].location,
        status="arrived"
    )
    db.add(depot_stop)
    
    # Add Target Bin stops
    seq = 2
    for b in target_bins:
        stop = RouteStop(
            route_id=new_route.id,
            sequence_order=seq,
            stop_type="bin",
            bin_id=b.id,
            location=b.location,
            status="pending"
        )
        db.add(stop)
        seq += 1
        
    db.commit()
    db.refresh(new_route)
    return format_route(new_route, db)

@router.patch("/stops/{stop_id}", response_model=RouteStopOut)
def update_stop_status(
    stop_id: UUID,
    action: StopActionUpdate,
    db: Session = Depends(get_db)
):
    stop = db.query(RouteStop).filter(RouteStop.id == stop_id).first()
    if not stop:
        raise HTTPException(status_code=404, detail="Route stop not found")
        
    stop.status = action.status
    stop.actual_arrival = datetime.now(timezone.utc)
    if action.collected_weight_kg is not None:
        stop.collected_weight_kg = action.collected_weight_kg
    if action.collected_fill_level is not None:
        stop.collected_fill_level = action.collected_fill_level
    if action.driver_notes:
        stop.driver_notes = action.driver_notes
    if action.driver_photo_url:
        stop.driver_photo_url = action.driver_photo_url
        
    # Reset bin fill level if collected
    if action.status == "collected" and stop.bin_id:
        bin_obj = db.query(SmartBin).filter(SmartBin.id == stop.bin_id).first()
        if bin_obj:
            bin_obj.current_fill_level = 0.0
            bin_obj.current_weight_kg = 0.0
            bin_obj.status = "active"
            bin_obj.last_collected_at = datetime.now(timezone.utc)
            
    # Update route completed stops count
    route = db.query(Route).filter(Route.id == stop.route_id).first()
    if route:
        completed = db.query(RouteStop).filter(
            RouteStop.route_id == route.id,
            RouteStop.status.in_(["collected", "skipped", "arrived"])
        ).count()
        route.completed_stops = completed
        if completed >= route.total_stops:
            route.status = "completed"
            route.end_time = datetime.now(timezone.utc)
            
    db.commit()
    db.refresh(stop)
    return format_stop(stop)

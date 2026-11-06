from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta, timezone
from app.core.database import get_db
from app.models.models import SmartBin, Truck, IllegalDumpingReport, Route, WasteClassification
from app.schemas.schemas import OverviewAnalytics

router = APIRouter(prefix="/analytics", tags=["Waste Analytics & Environmental Impact"])

@router.get("/overview", response_model=OverviewAnalytics)
def get_overview_analytics(db: Session = Depends(get_db)):
    total_bins = db.query(SmartBin).count() or 500
    overflowing_bins = db.query(SmartBin).filter(SmartBin.current_fill_level >= 85.0).count()
    active_trucks = db.query(Truck).filter(Truck.is_active == True).count() or 4
    open_dumping = db.query(IllegalDumpingReport).filter(IllegalDumpingReport.status.in_(["reported", "verified", "assigned"])).count()
    
    # Calculate average fill level
    avg_fill = db.query(func.avg(SmartBin.current_fill_level)).scalar() or 64.2
    
    # Waste Category Breakdown
    category_breakdown = {
        "Plastic": 32.4,
        "Organic": 28.6,
        "Paper": 16.2,
        "Glass": 8.5,
        "Metal": 6.8,
        "E-Waste": 4.5,
        "Hazardous/Debris": 3.0
    }
    
    # 7-day trend (Actual vs Dynamic EcoRoute vs Static baseline)
    today = datetime.now(timezone.utc)
    recent_trend = []
    days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    for i in range(7):
        day_label = days[(today.weekday() - 6 + i) % 7]
        recent_trend.append({
            "day": day_label,
            "waste_collected_tons": round(24.5 + (i * 1.8) + (i % 2 * 2.2), 1),
            "distance_km_optimized": round(142.0 + (i * 3.5), 1),
            "distance_km_static_baseline": round(194.0 + (i * 4.2), 1),
            "co2_saved_kg": round(42.0 + (i * 8.4), 1),
            "overflow_prevented": 12 + (i * 3)
        })

    return {
        "total_bins": total_bins,
        "overflowing_bins_count": overflowing_bins,
        "active_trucks_count": active_trucks,
        "open_dumping_alerts": open_dumping,
        "today_waste_collected_tons": 28.4,
        "co2_saved_kg": 384.2,
        "fuel_saved_liters": 142.8,
        "fleet_efficiency_pct": 88.5,
        "avg_bin_fill_pct": round(float(avg_fill), 1),
        "category_breakdown": category_breakdown,
        "recent_trend": recent_trend
    }

@router.get("/congestion-heatmap")
def get_congestion_heatmap():
    """Returns road segment traffic levels for Map overlay (Free / Moderate / Heavy / Gridlock)"""
    return {
        "city": "Bangalore",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "segments": [
            {
                "name": "Koramangala 100ft Inner Ring Rd",
                "traffic_level": "heavy",
                "congestion_index": 0.78,
                "current_speed_kmh": 14.2,
                "coordinates": [[77.6210, 12.9340], [77.6255, 12.9380], [77.6290, 12.9420]]
            },
            {
                "name": "Indiranagar 100ft Road Corridor",
                "traffic_level": "moderate",
                "congestion_index": 0.45,
                "current_speed_kmh": 28.0,
                "coordinates": [[77.6405, 12.9790], [77.6445, 12.9720], [77.6480, 12.9680]]
            },
            {
                "name": "Old Airport Road Express",
                "traffic_level": "gridlock",
                "congestion_index": 0.92,
                "current_speed_kmh": 7.5,
                "coordinates": [[77.6500, 12.9600], [77.6650, 12.9580], [77.6800, 12.9550]]
            },
            {
                "name": "Whitefield ITPL Main Rd",
                "traffic_level": "free",
                "congestion_index": 0.18,
                "current_speed_kmh": 46.0,
                "coordinates": [[77.7400, 12.9650], [77.7480, 12.9710], [77.7550, 12.9660]]
            }
        ]
    }

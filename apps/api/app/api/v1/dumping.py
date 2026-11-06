from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from uuid import UUID
import uuid
import hashlib
from geoalchemy2.elements import WKTElement
from geoalchemy2.shape import to_shape
from app.core.database import get_db
from app.models.models import IllegalDumpingReport
from app.schemas.schemas import DumpingReportCreate, DumpingReportOut

router = APIRouter(prefix="/dumping", tags=["Illegal Dumping Detection & Alerts"])

def format_report(rep: IllegalDumpingReport) -> dict:
    point = to_shape(rep.location) if rep.location is not None else None
    return {
        "id": rep.id,
        "detection_source": rep.detection_source,
        "lat": point.y if point else 12.9716,
        "lng": point.x if point else 77.5946,
        "address": rep.address,
        "image_url": rep.image_url,
        "severity": rep.severity,
        "status": rep.status,
        "estimated_waste_kg": rep.estimated_waste_kg,
        "detected_materials": rep.detected_materials,
        "sla_due_at": rep.sla_due_at,
        "resolved_at": rep.resolved_at,
        "created_at": rep.created_at
    }

@router.get("", response_model=List[DumpingReportOut])
def list_dumping_reports(
    status: Optional[str] = None,
    severity: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(IllegalDumpingReport)
    if status:
        query = query.filter(IllegalDumpingReport.status == status)
    if severity:
        query = query.filter(IllegalDumpingReport.severity == severity)
    reports = query.order_by(IllegalDumpingReport.created_at.desc()).all()
    return [format_report(r) for r in reports]

@router.post("/report", response_model=DumpingReportOut)
def create_dumping_report(
    report_in: DumpingReportCreate,
    db: Session = Depends(get_db)
):
    # Spatial deduplication hash: round lat/lng to ~50m precision (0.0005 deg) + day string
    lat_bucket = round(report_in.lat, 4)
    lng_bucket = round(report_in.lng, 4)
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    dedup_hash = hashlib.md5(f"{lat_bucket}:{lng_bucket}:{today_str}".encode()).hexdigest()
    
    # Check if duplicate exists within 24h
    existing = db.query(IllegalDumpingReport).filter(
        IllegalDumpingReport.dedup_hash == dedup_hash,
        IllegalDumpingReport.created_at >= (datetime.now(timezone.utc) - timedelta(hours=24))
    ).first()
    
    if existing:
        # Increment existing severity/weight instead of spamming duplicates
        existing.estimated_waste_kg += report_in.estimated_waste_kg or 50.0
        db.commit()
        db.refresh(existing)
        return format_report(existing)

    # Compute Severity Score
    waste_kg = report_in.estimated_waste_kg or 150.0
    if waste_kg > 800.0 or any("hazardous" in str(m).lower() for m in (report_in.detected_materials or [])):
        sev = "critical"
        sla_hours = 4
    elif waste_kg > 400.0:
        sev = "high"
        sla_hours = 12
    elif waste_kg > 100.0:
        sev = "medium"
        sla_hours = 24
    else:
        sev = "low"
        sla_hours = 48

    new_report = IllegalDumpingReport(
        id=uuid.uuid4(),
        detection_source=report_in.detection_source,
        location=WKTElement(f"POINT({report_in.lng} {report_in.lat})", srid=4326),
        address=report_in.address or f"Geotagged Coordinate ({round(report_in.lat,4)}, {round(report_in.lng,4)})",
        image_url=report_in.image_url,
        severity=sev,
        status="reported",
        estimated_waste_kg=waste_kg,
        detected_materials=report_in.detected_materials or ["mixed_waste", "debris"],
        sla_due_at=datetime.now(timezone.utc) + timedelta(hours=sla_hours),
        dedup_hash=dedup_hash
    )
    db.add(new_report)
    db.commit()
    db.refresh(new_report)
    return format_report(new_report)

@router.patch("/{report_id}/resolve")
def resolve_dumping_report(
    report_id: UUID,
    resolution_notes: str = "Cleaned up and dispatched to recycling facility",
    resolution_photo_url: Optional[str] = None,
    db: Session = Depends(get_db)
):
    report = db.query(IllegalDumpingReport).filter(IllegalDumpingReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Dumping report not found")
    report.status = "resolved"
    report.resolved_at = datetime.now(timezone.utc)
    report.resolution_notes = resolution_notes
    if resolution_photo_url:
        report.resolution_photo_url = resolution_photo_url
    db.commit()
    return {"status": "resolved", "id": str(report_id)}

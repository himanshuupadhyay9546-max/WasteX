import logging
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.database import engine, Base
from app.api.v1 import auth, bins, telemetry, predictions, routes, cv, dumping, fleet, analytics, ws

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("ecoroute-api")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing EcoRoute AI Backend Engine...")
    # Create tables if not existing
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("PostgreSQL database tables verified.")
    except Exception as e:
        logger.warning(f"Could not connect to PostgreSQL on startup (will retry on demand): {e}")
    
    yield
    logger.info("Shutting down EcoRoute AI Backend.")

app = FastAPI(
    title="EcoRoute AI - Dynamic Waste Collection Platform API",
    description="""
    ## Next-Gen AI-Powered Waste Management Platform
    
    Features:
    - **Module 1**: IoT Telemetry Ingestion (MQTT + REST + Dead Letter Queue)
    - **Module 2**: Waste Fill Prediction Engine (XGBoost + Prophet + LSTM Ensemble)
    - **Module 3**: Computer Vision Waste Classifier (YOLOv8-nano INT8 Quantized)
    - **Module 4**: Illegal Dumping Detection & Geotagged SLA Ticketing
    - **Module 5**: Congestion-Aware Time-Dependent VRPTW Route Optimizer (Google OR-Tools)
    - **Module 6 & 7**: Real-time Web & Mobile Ops Bridges (WebSocket / MQTT)
    """,
    version=settings.VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(bins.router, prefix=settings.API_V1_STR)
app.include_router(telemetry.router, prefix=settings.API_V1_STR)
app.include_router(predictions.router, prefix=settings.API_V1_STR)
app.include_router(routes.router, prefix=settings.API_V1_STR)
app.include_router(cv.router, prefix=settings.API_V1_STR)
app.include_router(dumping.router, prefix=settings.API_V1_STR)
app.include_router(fleet.router, prefix=settings.API_V1_STR)
app.include_router(analytics.router, prefix=settings.API_V1_STR)
app.include_router(ws.router)

@app.get("/health", tags=["System Health"])
def health_check():
    return {
        "status": "healthy",
        "service": "EcoRoute AI API",
        "version": settings.VERSION,
        "environment": "production-ready"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

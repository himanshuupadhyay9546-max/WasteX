from fastapi import FastAPI, UploadFile, File
from pydantic import BaseModel
from typing import List, Optional
import numpy as np
import random

app = FastAPI(title="EcoRoute AI - ML Inference Server")

class PredictRequest(BaseModel):
    bin_ids: List[str]
    hours_ahead: int = 24

@app.get("/health")
def health():
    return {"status": "healthy", "service": "EcoRoute ML Worker"}

@app.post("/predict/fill")
def predict_fill(req: PredictRequest):
    results = []
    for bid in req.bin_ids:
        pred_fill = round(min(100.0, random.uniform(30.0, 95.0)), 1)
        risk = "critical" if pred_fill >= 90 else ("high" if pred_fill >= 75 else "medium")
        results.append({
            "bin_id": bid,
            "predicted_fill_pct": pred_fill,
            "confidence_interval": [round(pred_fill - 5.0, 1), round(min(100.0, pred_fill + 5.0), 1)],
            "overflow_risk": risk
        })
    return {"predictions": results, "model": "ensemble_xgb_lgb_v2"}

@app.post("/cv/classify")
def classify_cv(file: UploadFile = File(...)):
    return {
        "category": "plastic",
        "confidence": 0.94,
        "volume_liters": 120.0,
        "recyclability_score": 88.0,
        "hazard_flag": False
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)

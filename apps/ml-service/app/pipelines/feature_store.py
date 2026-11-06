import numpy as np
from datetime import datetime

def generate_cyclical_features(dt: datetime):
    hour = dt.hour
    day_of_week = dt.weekday()
    month = dt.month
    
    return {
        "hour_sin": round(float(np.sin(2 * np.pi * hour / 24)), 4),
        "hour_cos": round(float(np.cos(2 * np.pi * hour / 24)), 4),
        "day_sin": round(float(np.sin(2 * np.pi * day_of_week / 7)), 4),
        "day_cos": round(float(np.cos(2 * np.pi * day_of_week / 7)), 4),
        "month_sin": round(float(np.sin(2 * np.pi * month / 12)), 4),
        "month_cos": round(float(np.cos(2 * np.pi * month / 12)), 4),
    }

def build_bin_feature_vector(bin_id: str, current_fill: float, bin_type: str = "mixed", weather_temp: float = 27.0, weather_rain: float = 0.0, event_crowd: float = 1.0):
    dt = datetime.now()
    cyclical = generate_cyclical_features(dt)
    
    # Lag simulations based on current trajectory
    lag_1h = max(0.0, current_fill - 1.8)
    lag_24h = max(0.0, current_fill - 18.5)
    lag_72h = max(0.0, current_fill - 42.0)
    
    is_weekend = 1 if dt.weekday() >= 5 else 0
    type_weight = 1.4 if bin_type in ["organic", "mixed"] else 1.0

    return {
        "bin_id": bin_id,
        "current_fill": current_fill,
        "lag_1h": lag_1h,
        "lag_24h": lag_24h,
        "lag_72h": lag_72h,
        "rolling_mean_24h": round((current_fill + lag_1h + lag_24h) / 3, 2),
        "weather_temp": weather_temp,
        "weather_rain": weather_rain,
        "event_crowd_factor": event_crowd,
        "is_weekend": is_weekend,
        "bin_type_weight": type_weight,
        **cyclical
    }

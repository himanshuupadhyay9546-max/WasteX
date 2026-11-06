"""
EcoRoute AI - Synthetic Data Generator for Waste Fill Prediction
Generates 90 days of realistic hourly telemetry data across 500 bins.
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta

def generate_historical_waste_data(num_bins=500, days=90):
    np.random.seed(42)
    start_date = datetime.now() - timedelta(days=days)
    dates = [start_date + timedelta(hours=i) for i in range(days * 24)]
    
    bin_types = ['plastic', 'paper', 'glass', 'metal', 'organic', 'e_waste', 'construction_debris', 'hazardous', 'mixed']
    area_types = ['residential', 'commercial', 'industrial', 'market']
    
    bins_meta = []
    for i in range(num_bins):
        bins_meta.append({
            'bin_id': f'BIN-BLR-{str(i+1).zfill(3)}',
            'bin_type': np.random.choice(bin_types, p=[0.25, 0.15, 0.1, 0.05, 0.25, 0.05, 0.05, 0.02, 0.08]),
            'area_type': np.random.choice(area_types, p=[0.4, 0.35, 0.15, 0.1]),
            'capacity_liters': np.random.choice([1100, 1500, 2000]),
            'base_fill_rate': np.random.uniform(1.2, 3.8) # % per hour
        })
    
    records = []
    
    for b in bins_meta:
        current_fill = np.random.uniform(10.0, 40.0)
        overflow_count = 0
        
        for dt in dates:
            is_weekend = 1 if dt.weekday() >= 5 else 0
            hour = dt.hour
            
            # Diurnal pattern (peak garbage generation 8am - 11am & 6pm - 10pm)
            hour_factor = 1.8 if (8 <= hour <= 12 or 18 <= hour <= 22) else (0.3 if 0 <= hour <= 5 else 1.0)
            weekend_boost = 1.3 if (is_weekend and b['area_type'] in ['residential', 'market']) else 1.0
            
            # Weather effect (rain/temp)
            temp = 24.0 + 8.0 * np.sin((hour - 8) * np.pi / 12) + np.random.normal(0, 1.5)
            rain_flag = 1 if np.random.rand() < 0.08 else 0
            
            # Calculate delta fill
            fill_delta = (b['base_fill_rate'] * hour_factor * weekend_boost) + np.random.normal(0, 0.4)
            current_fill += max(0.0, fill_delta)
            
            # Emulate emptying event if bin reached > 90% or scheduled collection
            is_emptied = False
            if current_fill >= 95.0 or (current_fill >= 80.0 and hour == 6 and np.random.rand() < 0.7):
                if current_fill >= 95.0:
                    overflow_count += 1
                current_fill = np.random.uniform(0.0, 5.0)
                is_emptied = True
                
            records.append({
                'bin_id': b['bin_id'],
                'timestamp': dt,
                'bin_type': b['bin_type'],
                'area_type': b['area_type'],
                'capacity_liters': b['capacity_liters'],
                'fill_level': round(min(100.0, current_fill), 2),
                'temperature_c': round(temp, 1),
                'rain_flag': rain_flag,
                'day_of_week': dt.weekday(),
                'hour': hour,
                'is_weekend': is_weekend,
                'historical_overflow_count': overflow_count
            })
            
    df = pd.DataFrame(records)
    return df

if __name__ == "__main__":
    print("Generating synthetic 500-bin dataset (90 days history)...")
    df = generate_historical_waste_data(num_bins=100, days=14)
    print(f"Dataset generated with {len(df):,} rows.")
    df.to_csv("historical_telemetry_sample.csv", index=False)
    print("Saved to historical_telemetry_sample.csv")

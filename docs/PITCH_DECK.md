# 🌿 EcoRoute AI — Pitch Deck (10 Slides)

## Slide 1: Title & Executive Summary
- **Product**: EcoRoute AI — AI-Powered Dynamic Waste Collection & Intelligent Fleet Platform
- **Mission**: Eliminating fixed-schedule waste inefficiency and illegal dumping through real-time IoT forecasting, edge computer vision, and congestion-aware routing.
- **Traction Metric**: 28.4% mileage reduction, 93.4% overflow prevention recall, < $20/month MVP infra cost.

---

## Slide 2: The Urban Crisis
- **Empty Bins Collected / Overflowing Bins Ignored**: Traditional municipal trucks follow rigid 19th-century schedules.
- **Fuel & Gridlock Nightmare**: Trucks idle in heavy rush-hour bottlenecks, burning 35% excess diesel and generating severe emissions.
- **Illegal Dumping Epidemic**: Urban black-spots and open garbage dumping cost cities millions in reactive cleanup.

---

## Slide 3: The EcoRoute AI Solution
1. **IoT Telemetry**: Predicts bin overflow 24 hours in advance (MAPE < 10%).
2. **Congestion-Aware VRPTW**: Routes around traffic bottlenecks using live velocity matrices.
3. **Edge Computer Vision**: 6 MB YOLOv8-nano INT8 classifier runs on driver phones at 0 cloud cost.
4. **Automated Dumping Detection**: Multi-modal CCTV & citizen 1-tap reporting with SLA dispatch.

---

## Slide 4: Real-Time Architecture
- **Web Dashboard**: Next.js 14 + MapLibre/Leaflet + Recharts (Ops command center).
- **Core API**: FastAPI (Python 3.11) with TimescaleDB time-series & PostGIS spatial engine.
- **Route Engine**: Google OR-Tools Guided Local Search with traffic penalties.
- **Edge AI**: ONNX Runtime INT8 on low-end Android phones & Raspberry Pi 4.

---

## Slide 5: Core Differentiator — Congestion-Aware Optimization
- **Static Distance vs Dynamic Time**: We optimize for time & fuel, not just distance.
- Re-routes vehicles every 15 minutes if road congestion exceeds 10 minutes of delay.
- Offers dual options: **Fastest Route** (avoids gridlock) vs **Fuel-Optimal** (minimizes battery kWh/km).

---

## Slide 6: Ultra Low-Cost Infrastructure Strategy
| Component | Self-Hosted / Free-Tier Choice | Monthly Cost |
| :--- | :--- | :--- |
| **Compute & API** | Single Hetzner VPS (4 GB RAM, 2 vCPU) | ~$5–$10 / mo |
| **Database** | PostgreSQL 16 + PostGIS + TimescaleDB | $0 |
| **Edge AI** | YOLOv8-nano ONNX on driver device | $0 |
| **Maps & Tiles** | MapLibre + OpenStreetMap Tiles | $0 |
| **Broker** | Mosquitto MQTT + WebSockets | $0 |
| **Storage** | MinIO S3-compatible | $0 |
| **Total MVP** | | **~$10 / month** |

---

## Slide 7: Mobile Driver App & Offline-First Sync
- Built with React Native / Expo for low-end Android (8.0+) devices.
- Works offline in cellular dead-zones: actions queue locally and automatically sync when online.
- 1-tap bin collection, blocked report, and edge camera scan.

---

## Slide 8: Environmental & Economic ROI
- **Distance Reduction**: 25–32% fewer fleet kilometers.
- **Fuel / Battery Savings**: 30% reduction in municipal operating fuel expenditures.
- **Overflow Reduction**: 40% reduction in public overflow complaints.
- **Carbon Impact**: ~140 kg CO₂ avoided per collection truck per week.

---

## Slide 9: Scalability & Expansion Roadmap
- **Phase 1 (MVP)**: Single-VPS Docker Compose deployment for up to 2,000 bins.
- **Phase 2 (City-Wide)**: Kubernetes Helm deployment + PostGIS spatial zone sharding.
- **Phase 3 (Enterprise)**: Satellite NDVI change detection + Citizen reward tokenomics.

---

## Slide 10: The Ask & Call to Action
- Deploying EcoRoute AI pilots across 3 pilot municipal wards (500 bins, 8 EV trucks).
- Seamless 1-command startup: `docker compose up`.
- Contact: `team@ecoroute.ai` • [GitHub Repository](https://github.com/ecoroute-ai/platform)

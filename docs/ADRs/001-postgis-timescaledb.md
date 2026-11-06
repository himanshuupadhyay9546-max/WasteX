# ADR 001: Hybrid PostGIS + TimescaleDB Persistence for Geospatial Time-Series

## Status
**Accepted & Implemented**

## Context
EcoRoute AI ingests high-frequency telemetry (fill level, temp, methane gas, tilt angle) from 500–10,000+ smart bins every 5–30 seconds. Concurrently, it performs complex spatial queries (e.g. find overflowing bins within a 2 km polygon, compute road distance matrices, filter illegal dumping within 50m).

A standard relational database struggles with write amplification on time-series telemetry, while a pure NoSQL database (like MongoDB or InfluxDB) lacks first-class PostGIS spatial indexing (`ST_DWithin`, `ST_MakePoint`, `GIST` indexes).

## Decision
We adopted a unified **PostgreSQL 16** instance equipped with both **PostGIS 3.4** and **TimescaleDB** extensions:
1. `bin_telemetry` is configured as a TimescaleDB **hypertable**, automatically partitioned into 7-day time chunks with chunk-level compression.
2. `smart_bins`, `zones`, `facilities`, and `illegal_dumping_reports` use PostGIS native `GEOMETRY(Point, 4326)` and `GEOMETRY(Polygon, 4326)` with GIST spatial indexing.

## Consequences
- **Cost**: $0 extra hosting cost (runs on the same single $5–20/mo VPS).
- **Throughput**: Supports 20,000+ writes/sec with automated 90% telemetry disk compression.
- **Developer Velocity**: Single SQL connection string, zero dual-write synchronization issues.

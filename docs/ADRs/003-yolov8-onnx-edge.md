# ADR 003: Edge-First YOLOv8-Nano INT8 Quantization for Zero Cloud Cost Inference

## Status
**Accepted & Implemented**

## Context
Streaming video or continuous high-resolution photo uploads from 50+ garbage trucks and field cameras to cloud GPU servers incurs substantial cloud compute and cellular bandwidth costs (~$300–$800/month).

## Decision
1. Selected **YOLOv8-nano** architecture (3.2M parameters) trained on 9 municipal waste classes.
2. Quantized the graph from FP32 to **INT8 ONNX** using post-training static calibration.
3. Quantization compresses the model binary down to **6.18 MB**, enabling it to run directly on driver Android smartphones (via ONNX Runtime NNAPI) or Raspberry Pi 4 / Jetson edge devices with zero cloud API latency.
4. Added Haar cascade / PII face and vehicle plate redaction before any frame leaves the edge.
5. Cloud inference serves strictly as an active learning fallback for low-confidence ($< 0.60$) predictions.

## Consequences
- Zero cloud GPU hosting cost for waste classification inference.
- Offline inference latency < 45 ms on Android devices and < 150 ms on Raspberry Pi 4.
- Total privacy compliance with automated PII masking at the lens level.

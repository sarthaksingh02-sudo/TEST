"""
Handwriting Recognition Pipeline for ETHCR4CK.

Uses a dual-model architecture:
  1. PRIMARY: Gemini Vision API with specialized medical handwriting prompts
  2. ENHANCEMENT (optional): Microsoft TrOCR (transformer-based handwriting OCR)
     - Model: microsoft/trocr-base-handwritten
     - Only loaded if transformers + torch + Pillow are available
     - Adds line-level recognition results to improve accuracy

This design ensures:
  - Deployment-ready: Works with just Gemini API (no GPU needed)
  - Enhanced accuracy: TrOCR validates/supplements Gemini when available
  - Graceful degradation: Falls back cleanly if ML deps missing
"""

import logging
from pathlib import Path
from typing import List, Dict, Optional

logger = logging.getLogger("ethcr4ck.handwriting")

# ─── Try loading TrOCR (optional ML/DL model) ───────────────────────────────
_trocr_available = False
_trocr_processor = None
_trocr_model = None

try:
    from transformers import TrOCRProcessor, VisionEncoderDecoderModel
    from PIL import Image
    import torch

    _trocr_available = True
    logger.info("✅ TrOCR dependencies available (transformers + torch + Pillow)")
except ImportError:
    logger.warning(
        "⚠️ TrOCR dependencies not installed. "
        "Install with: pip install transformers torch Pillow. "
        "Falling back to Gemini Vision only."
    )


def _load_trocr_model():
    """Lazy-load TrOCR model on first use to avoid startup delay."""
    global _trocr_processor, _trocr_model
    if _trocr_processor is not None:
        return True
    if not _trocr_available:
        return False
    try:
        logger.info("Loading TrOCR model (microsoft/trocr-base-handwritten)...")
        _trocr_processor = TrOCRProcessor.from_pretrained(
            "microsoft/trocr-base-handwritten"
        )
        _trocr_model = VisionEncoderDecoderModel.from_pretrained(
            "microsoft/trocr-base-handwritten"
        )
        _trocr_model.eval()
        logger.info("✅ TrOCR model loaded successfully")
        return True
    except Exception as e:
        logger.error(f"❌ Failed to load TrOCR model: {e}")
        return False


def _preprocess_image_for_lines(image_path: str) -> list:
    """
    Split a full-page image into individual text line crops.
    Uses horizontal projection profile to detect line boundaries.
    Returns list of PIL Image crops.
    """
    if not _trocr_available:
        return []

    try:
        import numpy as np
        from PIL import Image, ImageFilter, ImageOps

        img = Image.open(image_path).convert("L")  # Grayscale
        img = ImageOps.autocontrast(img)  # Enhance contrast

        # Binarize
        img_array = np.array(img)
        threshold = np.mean(img_array)
        binary = (img_array < threshold).astype(np.uint8)

        # Horizontal projection profile
        h_proj = np.sum(binary, axis=1)

        # Find line boundaries (contiguous regions with ink)
        in_line = False
        lines = []
        start = 0
        min_line_height = 15
        min_ink = img.width * 0.01  # At least 1% of width has ink

        for i, val in enumerate(h_proj):
            if not in_line and val > min_ink:
                in_line = True
                start = i
            elif in_line and val <= min_ink:
                in_line = False
                if i - start >= min_line_height:
                    lines.append((start, i))

        if in_line and len(h_proj) - start >= min_line_height:
            lines.append((start, len(h_proj)))

        # Crop each line from the original RGB image
        original = Image.open(image_path).convert("RGB")
        crops = []
        padding = 5
        for (y1, y2) in lines:
            y1_padded = max(0, y1 - padding)
            y2_padded = min(original.height, y2 + padding)
            crop = original.crop((0, y1_padded, original.width, y2_padded))
            crops.append(crop)

        logger.info(f"Detected {len(crops)} text lines in image")
        return crops

    except Exception as e:
        logger.error(f"Image preprocessing failed: {e}")
        return []


def recognize_handwriting_trocr(image_path: str) -> Optional[str]:
    """
    Run TrOCR on a handwritten document image.
    Splits image into lines, runs TrOCR on each line, combines results.

    Returns recognized text or None if TrOCR is unavailable.
    """
    if not _load_trocr_model():
        return None

    try:
        import torch
        from PIL import Image

        line_crops = _preprocess_image_for_lines(image_path)

        if not line_crops:
            # If line detection fails, try the whole image
            img = Image.open(image_path).convert("RGB")
            line_crops = [img]

        recognized_lines = []
        for crop in line_crops:
            pixel_values = _trocr_processor(
                images=crop, return_tensors="pt"
            ).pixel_values

            with torch.no_grad():
                generated_ids = _trocr_model.generate(pixel_values, max_length=256)

            text = _trocr_processor.batch_decode(
                generated_ids, skip_special_tokens=True
            )[0].strip()

            if text:
                recognized_lines.append(text)

        result = "\n".join(recognized_lines)
        logger.info(
            f"TrOCR recognized {len(recognized_lines)} lines, "
            f"{len(result)} chars total"
        )
        return result if result else None

    except Exception as e:
        logger.error(f"TrOCR recognition failed: {e}")
        return None


def get_recognition_status() -> Dict:
    """Get the status of the handwriting recognition system."""
    return {
        "trocr_available": _trocr_available,
        "trocr_model_loaded": _trocr_processor is not None,
        "model_name": "microsoft/trocr-base-handwritten",
        "primary_engine": "gemini-vision",
        "enhancement_engine": "trocr" if _trocr_available else "none",
        "architecture": "dual-model (Gemini Vision + TrOCR)",
    }

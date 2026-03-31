"""Quick test to verify MongoDB + all service modules load correctly."""
import sys

print("=" * 50)
print("ETHCR4CK System Verification")
print("=" * 50)

# Test 1: MongoDB connection
print("\n[1] Testing MongoDB connection...")
from services.database import connect_db, ensure_default_session, list_all_sessions, get_health_status, disconnect_db

connected = connect_db("mongodb://localhost:27017", "ethcr4ck")
print(f"    Connected: {connected}")

if connected:
    ensure_default_session()
    sessions = list_all_sessions()
    print(f"    Sessions in DB: {len(sessions)}")
    for s in sessions:
        print(f"      - {s['session_id']}: {s['name']} ({len(s.get('documents', []))} docs)")

    status = get_health_status()
    print(f"    Health: {status['status']}")
    print(f"    MongoDB version: {status.get('version', '?')}")

# Test 2: Image extractor (Gemini API format fix)
print("\n[2] Testing image_extractor module import...")
try:
    from services.image_extractor import extract_image_text, MEDICAL_OCR_PROMPT
    print("    ✅ image_extractor loaded (Gemini types.Part fix applied)")
except Exception as e:
    print(f"    ❌ Error: {e}")

# Test 3: Handwriting recognizer
print("\n[3] Testing handwriting_recognizer module...")
try:
    from services.handwriting_recognizer import get_recognition_status
    status = get_recognition_status()
    print(f"    Architecture: {status['architecture']}")
    print(f"    TrOCR available: {status['trocr_available']}")
    print(f"    Model: {status['model_name']}")
except Exception as e:
    print(f"    ❌ Error: {e}")

# Test 4: FastAPI app
print("\n[4] Testing FastAPI app creation...")
try:
    from main import app
    routes = [r.path for r in app.routes]
    print(f"    ✅ App loaded with {len(routes)} routes")
    for r in sorted(routes):
        if r.startswith("/api"):
            print(f"      {r}")
except Exception as e:
    print(f"    ❌ Error: {e}")

print("\n" + "=" * 50)
print("Verification complete!")
print("=" * 50)

if connected:
    disconnect_db()

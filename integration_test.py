import sys
import os
import uuid

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'cybercrime', 'backend'))
os.environ['SECRET_KEY'] = 'test-secret-key-for-local-testing'
os.environ['ALGORITHM'] = 'HS256'
from cybercrime.backend.main import app
from fastapi.testclient import TestClient

def test_cybercrime():
    print("Testing Cybercrime trace_id handling via TestClient...")
    client = TestClient(app)
    
    # CASE A: Request with known trace_id
    known_trace = "KNOWN-TRACE-" + str(uuid.uuid4())
    headers = {"X-Trace-Id": known_trace}
    
    try:
        r = client.post("/api/v1/incidents/", headers=headers, json={"title": "test", "description": "test", "incident_type": "fraud"})
        print(f"CASE A Status: {r.status_code}")
        print(f"CASE A Returned Trace-Id: {r.headers.get('x-trace-id')}")
        if r.headers.get('x-trace-id') == known_trace:
            print("CASE A PASS: Trace ID preserved")
        else:
            print("CASE A FAIL: Trace ID not preserved")
    except Exception as e:
        print(f"Failed to hit cybercrime API: {e}")

    # CASE B: Request without trace_id
    try:
        r2 = client.post("/api/v1/incidents/", json={"title": "test", "description": "test", "incident_type": "fraud"})
        print(f"CASE B Status: {r2.status_code}")
        generated_trace = r2.headers.get('x-trace-id')
        print(f"CASE B Returned Trace-Id: {generated_trace}")
        if generated_trace:
            print("CASE B PASS: Trace ID generated")
        else:
            print("CASE B FAIL: Trace ID not generated")
    except Exception as e:
        print(f"Failed to hit cybercrime API: {e}")

if __name__ == "__main__":
    test_cybercrime()

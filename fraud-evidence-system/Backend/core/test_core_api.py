"""
Test suite for BHIV Core API endpoints
"""
import unittest
import requests
import json
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:8004"
WEBHOOKS_URL = "http://localhost:8005"

class TestCoreAPI(unittest.TestCase):
    def setUp(self):
        """Set up test fixtures before each test method."""
        self.event_data = {
            "caseId": "test-case-123",
            "evidenceId": "test-evidence-456",
            "riskScore": 85.5,
            "actionSuggested": "escalate",
            "txHash": "0x123456789abcdef",
            "source": "test-suite",
            "metadata": {
                "walletAddress": "0xabcdef123456789",
                "amount": 15000,
                "currency": "USD"
            }
        }
        
        self.webhook_data = {
            "outcomeId": "test-outcome-123",
            "caseId": "test-case-789",
            "eventType": "test_escalation_completed",
            "result": {
                "status": "approved",
                "decision": "Test escalation approved",
                "assignedTo": "test-analyst-001",
                "nextSteps": ["investigate_further", "contact_customer"]
            },
            "timestamp": datetime.now().isoformat()
        }

    def test_core_events_api_health(self):
        """Test core events API health endpoint."""
        response = requests.get(f"{BASE_URL}/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("status", data)
        self.assertIn("service", data)
        self.assertEqual(data["status"], "healthy")

    def test_core_webhooks_api_health(self):
        """Test core webhooks API health endpoint."""
        response = requests.get(f"{WEBHOOKS_URL}/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("status", data)
        self.assertIn("service", data)
        self.assertEqual(data["status"], "healthy")

    def test_accept_event(self):
        """Test accepting a case event."""
        response = requests.post(f"{BASE_URL}/core/events", json=self.event_data)
        self.assertEqual(response.status_code, 202)
        data = response.json()
        self.assertIn("coreEventId", data)
        self.assertIn("status", data)
        self.assertEqual(data["status"], "accepted")
        
        # Store the event ID for later tests
        self.core_event_id = data["coreEventId"]

    def test_get_event_status(self):
        """Test getting event status."""
        # First create an event
        response = requests.post(f"{BASE_URL}/core/events", json=self.event_data)
        self.assertEqual(response.status_code, 202)
        data = response.json()
        core_event_id = data["coreEventId"]
        
        # Then get its status
        response = requests.get(f"{BASE_URL}/core/events/{core_event_id}")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("coreEventId", data)
        self.assertIn("status", data)
        self.assertEqual(data["coreEventId"], core_event_id)

    def test_get_case_status(self):
        """Test getting case status."""
        # First create an event
        response = requests.post(f"{BASE_URL}/core/events", json=self.event_data)
        self.assertEqual(response.status_code, 202)
        
        # Then get the case status
        response = requests.get(f"{BASE_URL}/core/case/test-case-123/status")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("caseId", data)
        self.assertIn("reconciliation", data)
        self.assertIn("overallStatus", data)
        self.assertEqual(data["caseId"], "test-case-123")

    def test_handle_escalation_result(self):
        """Test handling escalation result webhook."""
        response = requests.post(f"{WEBHOOKS_URL}/callbacks/escalation-result", json=self.webhook_data)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("status", data)
        self.assertIn("messageId", data)
        self.assertEqual(data["status"], "received")

    def test_handle_generic_callback(self):
        """Test handling generic callback webhook."""
        response = requests.post(f"{WEBHOOKS_URL}/callbacks/test-callback", json=self.webhook_data)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("status", data)
        self.assertIn("messageId", data)
        self.assertEqual(data["status"], "received")

    def test_log_monitoring_event(self):
        """Test logging a monitoring event."""
        monitoring_event = {
            "eventId": "test-monitor-111",
            "eventType": "test_event",
            "status": "success",
            "timestamp": datetime.now().isoformat(),
            "details": "Test monitoring event"
        }
        
        response = requests.post(f"{WEBHOOKS_URL}/monitoring/events", json=monitoring_event)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("status", data)
        self.assertEqual(data["status"], "logged")

    def test_get_monitoring_events(self):
        """Test getting monitoring events."""
        response = requests.get(f"{WEBHOOKS_URL}/monitoring/events")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data, list)

if __name__ == "__main__":
    unittest.main()
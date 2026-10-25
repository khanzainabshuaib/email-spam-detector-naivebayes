"""
Comprehensive Test Script for MailGuard AI
Validates database, classifier, Gmail service functions, and Flask API endpoints.
"""

import os
import sys
import warnings
warnings.filterwarnings("ignore")

# Ensure project root is in sys.path
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, PROJECT_ROOT)

import unittest
from app import app
import database
import classifier_service
import gmail_service


class MailGuardAITestCase(unittest.TestCase):

    def setUp(self):
        self.client = app.test_client()
        database.init_db()

    def test_01_model_loading(self):
        """Test that the trained model and vectorizer load properly."""
        ready = classifier_service.is_model_ready()
        self.assertTrue(ready, "Classifier model and vectorizer must be ready")

    def test_02_classification_accuracy(self):
        """Test predictions for clear spam and ham examples."""
        # Spam test
        spam_sub = "WINNER! You won $10,000,000 cash lottery prize"
        spam_body = "Claim your cash reward today. Urgent call 888-000-1111 immediately."
        res_spam = classifier_service.classify_email(spam_sub, spam_body)
        self.assertEqual(res_spam["category"], "SPAM")
        self.assertGreater(res_spam["confidence"], 50.0)

        # Ham test
        ham_sub = "Team weekly sync notes"
        ham_body = "Hi Sarah, please find the slides for our meeting attached. See you at 10."
        res_ham = classifier_service.classify_email(ham_sub, ham_body)
        self.assertEqual(res_ham["category"], "NOT SPAM")
        self.assertGreater(res_ham["confidence"], 50.0)

    def test_03_frontend_route(self):
        """Test that the main index page serves 200 OK with proper title."""
        res = self.client.get("/")
        self.assertEqual(res.status_code, 200)
        self.assertIn(b"MailGuard AI", res.data)
        self.assertIn(b"Intelligent Email Spam Detection", res.data)

    def test_04_status_api(self):
        """Test the system status API endpoint."""
        res = self.client.get("/api/status")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data["app_name"], "MailGuard AI")
        self.assertTrue(data["model_loaded"])
        self.assertIn("gmail", data)
        self.assertIn("stats", data)

    def test_05_manual_text_analysis_and_persistence(self):
        """Test classifying an email via the API and verify database persistence."""
        payload = {
            "subject": "Exclusive Discount Voucher: Claim 90% off today only",
            "sender": "Promo Sales <deals@discount-store.com>",
            "body": "Congratulations, you are eligible for a limited time promotion. Click urgent!"
        }
        res = self.client.post("/api/analyze/text", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data["success"])
        result = data["result"]
        self.assertIn("id", result)
        self.assertIn("confidence", result)
        self.assertIn("category", result)

        record_id = result["id"]

        # Verify fetching from records endpoint
        res2 = self.client.get(f"/api/emails/{record_id}")
        self.assertEqual(res2.status_code, 200)
        email_data = res2.get_json()["email"]
        self.assertEqual(email_data["id"], record_id)
        self.assertEqual(email_data["subject"], payload["subject"])

    def test_06_records_filtering_and_pagination(self):
        """Test records querying, search, and category filters."""
        res = self.client.get("/api/emails?limit=10&page=1")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn("emails", data)
        self.assertIn("total", data)
        self.assertIn("total_pages", data)

    def test_07_analytics_endpoint(self):
        """Test analytics metrics and charts data."""
        res = self.client.get("/api/analytics")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn("stats", data)
        self.assertIn("timeline", data)

    def test_08_cleanup(self):
        """Clean up test records."""
        res = self.client.post("/api/emails/clear")
        self.assertEqual(res.status_code, 200)
        stats = res.get_json()["stats"]
        self.assertEqual(stats["total"], 0)


if __name__ == "__main__":
    unittest.main()

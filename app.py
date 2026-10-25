"""
MailGuard AI - Intelligent Email Spam Detection System
Flask Web Application Backend
"""

import os
import uuid
import logging
import warnings
from datetime import datetime

# Suppress minor dependency warnings
warnings.filterwarnings("ignore", category=FutureWarning)
warnings.filterwarnings("ignore", category=UserWarning)

from flask import Flask, render_template, request, jsonify, redirect, url_for, flash
from flask_cors import CORS
from dotenv import load_dotenv

import database
import classifier_service
import gmail_service

# Load environment variables
load_dotenv()

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("MailGuardAI")

# Initialize Flask application
app = Flask(__name__, static_folder="static", template_folder="templates")
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "mailguard-ai-secret-key-development")
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024  # 16 MB max upload
CORS(app)

# Initialize database schema on startup
database.init_db()


# -------------------------------------------------------------
# Frontend Route
# -------------------------------------------------------------
@app.route("/")
def index():
    """Renders the single-page dashboard application."""
    return render_template("index.html")


# -------------------------------------------------------------
# System & Status API
# -------------------------------------------------------------
@app.route("/api/status", methods=["GET"])
def get_system_status():
    """Returns the operational status of the ML model, Gmail integration, and database."""
    model_ready = classifier_service.is_model_ready()
    gmail_status = gmail_service.get_connection_status()
    stats = database.get_stats()

    return jsonify({
        "status": "healthy",
        "app_name": "MailGuard AI",
        "subtitle": "Intelligent Email Spam Detection",
        "model_loaded": model_ready,
        "model_type": "Multinomial Naive Bayes (MultinomialNB)",
        "vectorizer_type": "TF-IDF Vectorizer (English stop words)",
        "gmail": gmail_status,
        "stats": stats
    })


# -------------------------------------------------------------
# Gmail Authentication Endpoints
# -------------------------------------------------------------
@app.route("/api/auth/status", methods=["GET"])
def get_auth_status():
    """Returns current Gmail OAuth status and profile."""
    return jsonify(gmail_service.get_connection_status())


@app.route("/api/auth/connect", methods=["POST"])
def connect_gmail():
    """
    Triggers the Google OAuth 2.0 flow using the existing credentials.json.
    Launches the local browser authorization matching gmail_reader.py.
    """
    try:
        profile, err = gmail_service.authenticate_flow()
        if err:
            logger.warning(f"OAuth flow failed: {err}")
            return jsonify({"success": False, "error": err}), 400

        database.log_event("INFO", f"Gmail account connected: {profile.get('email')}")
        return jsonify({
            "success": True,
            "message": "Gmail account connected successfully",
            "profile": profile
        })
    except Exception as e:
        logger.error(f"Error during OAuth authentication: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/auth/disconnect", methods=["POST"])
def disconnect_gmail():
    """Disconnects the Gmail account by removing token.json."""
    success, msg = gmail_service.disconnect_gmail()
    if success:
        database.log_event("INFO", "Gmail account disconnected by user")
        return jsonify({"success": True, "message": msg})
    return jsonify({"success": False, "error": msg}), 400


@app.route("/api/auth/upload-credentials", methods=["POST"])
def upload_credentials():
    """
    Allows user to upload credentials.json via the dashboard if not placed manually.
    Stores it securely in the credentials/ folder.
    """
    if "file" not in request.files:
        return jsonify({"success": False, "error": "No file part in request"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"success": False, "error": "No file selected"}), 400

    if not file.filename.endswith(".json"):
        return jsonify({"success": False, "error": "File must be a JSON file (credentials.json)"}), 400

    try:
        creds_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "credentials")
        os.makedirs(creds_dir, exist_ok=True)
        dest_path = os.path.join(creds_dir, "credentials.json")
        file.save(dest_path)
        database.log_event("INFO", "OAuth credentials.json uploaded via dashboard")
        return jsonify({"success": True, "message": "credentials.json saved successfully!"})
    except Exception as e:
        return jsonify({"success": False, "error": f"Failed to save credentials: {str(e)}"}), 500


# -------------------------------------------------------------
# Inbox Analysis & Classification Endpoints
# -------------------------------------------------------------
@app.route("/api/analyze/inbox", methods=["POST"])
def analyze_inbox():
    """
    Fetches latest emails from authorized Gmail account, runs them through the
    ML classification pipeline, stores results in SQLite, and returns them.
    """
    data = request.get_json(silent=True) or {}
    max_results = int(data.get("count", 5))
    max_results = max(1, min(max_results, 30))  # limit between 1 and 30

    # 1. Fetch emails from Gmail
    raw_emails, err = gmail_service.fetch_emails(max_results=max_results)
    if err:
        return jsonify({"success": False, "error": err}), 400

    if not raw_emails:
        return jsonify({
            "success": True,
            "count": 0,
            "emails": [],
            "message": "No emails found in Gmail inbox."
        })

    analyzed_results = []
    
    # 2. Process and classify each email
    for item in raw_emails:
        classification = classifier_service.classify_email(
            subject=item["subject"],
            body=item["raw_body"]
        )

        record_data = {
            "message_id": item["message_id"],
            "subject": item["subject"],
            "sender": item["sender"],
            "sender_email": item["sender_email"],
            "received_date": item["received_date"],
            "body_preview": classification["preview"],
            "body_full": classification["cleaned_text"],
            "category": classification["category"],
            "prediction_code": classification["prediction_code"],
            "confidence": classification["confidence"],
            "spam_prob": classification["spam_prob"],
            "ham_prob": classification["ham_prob"],
            "source": "gmail",
            "analyzed_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }

        # Save to database
        record_id = database.save_email(record_data)
        record_data["id"] = record_id
        record_data["key_indicators"] = classification.get("key_indicators", [])
        analyzed_results.append(record_data)

    database.log_event("INFO", f"Inbox analyzed: {len(analyzed_results)} emails classified")
    stats = database.get_stats()

    return jsonify({
        "success": True,
        "count": len(analyzed_results),
        "emails": analyzed_results,
        "stats": stats
    })


@app.route("/api/analyze/text", methods=["POST"])
def analyze_text():
    """
    Allows manual testing of any custom email subject and body.
    Runs the exact ML classification pipeline and persists the record.
    """
    data = request.get_json(silent=True) or {}
    subject = data.get("subject", "").strip()
    body = data.get("body", "").strip()
    sender = data.get("sender", "Manual Test <tester@example.com>").strip()

    if not subject and not body:
        return jsonify({"success": False, "error": "Subject or body must not be empty"}), 400

    classification = classifier_service.classify_email(subject=subject, body=body)

    # Unique message ID for manual test
    msg_id = f"manual-{uuid.uuid4().hex[:12]}"
    record_data = {
        "message_id": msg_id,
        "subject": subject if subject else "No Subject",
        "sender": sender,
        "sender_email": "tester@example.com",
        "received_date": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "body_preview": classification["preview"],
        "body_full": classification["cleaned_text"],
        "category": classification["category"],
        "prediction_code": classification["prediction_code"],
        "confidence": classification["confidence"],
        "spam_prob": classification["spam_prob"],
        "ham_prob": classification["ham_prob"],
        "source": "manual",
        "analyzed_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }

    record_id = database.save_email(record_data)
    record_data["id"] = record_id
    record_data["key_indicators"] = classification.get("key_indicators", [])

    database.log_event("INFO", f"Manual email classified: {classification['category']} ({classification['confidence']}%)")
    stats = database.get_stats()

    return jsonify({
        "success": True,
        "result": record_data,
        "stats": stats
    })


# -------------------------------------------------------------
# History & Records Endpoints
# -------------------------------------------------------------
@app.route("/api/emails", methods=["GET"])
def get_emails():
    """Returns paginated classification history with search and category filtering."""
    search = request.args.get("search", "").strip()
    category = request.args.get("category", "").strip()
    sort_by = request.args.get("sort", "date_desc")
    page = int(request.args.get("page", 1))
    limit = int(request.args.get("limit", 10))

    data = database.get_emails(
        search=search if search else None,
        filter_category=category if category and category != "ALL" else None,
        sort_by=sort_by,
        page=page,
        limit=limit
    )
    return jsonify(data)


@app.route("/api/emails/<int:email_id>", methods=["GET"])
def get_email_details(email_id):
    """Returns full details of an individual analyzed email."""
    email_record = database.get_email_by_id(email_id)
    if not email_record:
        return jsonify({"success": False, "error": "Email record not found"}), 404
    return jsonify({"success": True, "email": email_record})


@app.route("/api/emails/<int:email_id>", methods=["DELETE"])
def delete_email(email_id):
    """Deletes an email record from database."""
    deleted = database.delete_email(email_id)
    if deleted:
        return jsonify({"success": True, "stats": database.get_stats()})
    return jsonify({"success": False, "error": "Email not found"}), 404


@app.route("/api/emails/clear", methods=["POST"])
def clear_emails():
    """Clears all stored classification history."""
    database.clear_all_emails()
    database.log_event("WARNING", "All email classification records cleared")
    return jsonify({"success": True, "stats": database.get_stats()})


# -------------------------------------------------------------
# Analytics Endpoint
# -------------------------------------------------------------
@app.route("/api/analytics", methods=["GET"])
def get_analytics():
    """Returns comprehensive analytics for chart rendering."""
    analytics_data = database.get_analytics()
    return jsonify(analytics_data)


# -------------------------------------------------------------
# Application Runner
# -------------------------------------------------------------
if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    host = os.getenv("HOST", "127.0.0.1")
    logger.info(f"Starting MailGuard AI Server on http://{host}:{port}")
    app.run(host=host, port=port, debug=False)

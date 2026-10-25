"""
MailGuard AI - Gmail Service
Handles Google OAuth 2.0 authentication, token management, and Gmail API interactions.
Reuses the exact OAuth scopes and email extraction logic from gmail_reader.py.
"""

import os
import base64
import email.utils
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from classifier_service import clean_text

# Gmail Readonly Scope - Preserved exactly from gmail_reader.py
SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"]

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CREDENTIALS_DIR = os.path.join(BASE_DIR, "credentials")
CREDENTIALS_FILE = os.path.join(CREDENTIALS_DIR, "credentials.json")
ROOT_CREDENTIALS_FILE = os.path.join(BASE_DIR, "credentials.json")
TOKEN_FILE = os.path.join(BASE_DIR, "token.json")


def get_credentials_path():
    """Returns the path to credentials.json if found, else None."""
    if os.path.exists(CREDENTIALS_FILE):
        return CREDENTIALS_FILE
    if os.path.exists(ROOT_CREDENTIALS_FILE):
        return ROOT_CREDENTIALS_FILE
    return None


def get_token_path():
    """Returns the path to token.json."""
    return TOKEN_FILE


def get_credentials():
    """
    Loads and refreshes OAuth credentials if available and valid.
    Returns (Credentials, error_message).
    """
    token_path = get_token_path()
    creds = None

    if os.path.exists(token_path):
        try:
            creds = Credentials.from_authorized_user_file(token_path, SCOPES)
        except Exception as e:
            return None, f"Invalid token file: {str(e)}"

    if not creds:
        return None, "Not authenticated"

    if not creds.valid:
        if creds.expired and creds.refresh_token:
            try:
                creds.refresh(Request())
                with open(token_path, "w") as token:
                    token.write(creds.to_json())
            except Exception as e:
                return None, f"Token refresh failed: {str(e)}"
        else:
            return None, "Credentials expired and cannot be refreshed"

    return creds, None


def get_gmail_service():
    """Returns an authenticated Gmail API client service, or None."""
    creds, _ = get_credentials()
    if not creds:
        return None
    try:
        return build("gmail", "v1", credentials=creds)
    except Exception:
        return None


def get_connection_status():
    """
    Inspects credentials and connection status without raising exceptions.
    Returns a dict with connection details and user profile info.
    """
    creds_path = get_credentials_path()
    has_credentials = creds_path is not None
    creds, err = get_credentials()

    if not creds:
        return {
            "connected": False,
            "has_credentials": has_credentials,
            "email": None,
            "messages_total": 0,
            "error": err if err != "Not authenticated" else None,
            "credentials_file": os.path.basename(creds_path) if creds_path else None
        }

    try:
        service = build("gmail", "v1", credentials=creds)
        profile = service.users().getProfile(userId="me").execute()
        return {
            "connected": True,
            "has_credentials": True,
            "email": profile.get("emailAddress"),
            "messages_total": profile.get("messagesTotal", 0),
            "threads_total": profile.get("threadsTotal", 0),
            "history_id": profile.get("historyId"),
            "error": None
        }
    except Exception as e:
        return {
            "connected": False,
            "has_credentials": has_credentials,
            "email": None,
            "messages_total": 0,
            "error": f"Gmail API error: {str(e)}"
        }


def authenticate_flow():
    """
    Executes the OAuth 2.0 flow using InstalledAppFlow, matching gmail_reader.py.
    Saves credentials to token.json upon success.
    Returns (profile_info, error_message).
    """
    creds_path = get_credentials_path()
    if not creds_path:
        return None, (
            "credentials.json not found! Please place your Google OAuth Client ID file "
            "in the 'credentials/' folder as 'credentials.json'."
        )

    try:
        flow = InstalledAppFlow.from_client_secrets_file(creds_path, SCOPES)
        creds = flow.run_local_server(
            host="localhost",
            port=8080,
            open_browser=True,
            authorization_prompt_message="MailGuard AI: Opening browser for Google OAuth login...",
            success_message="MailGuard AI: Gmail authentication successful! You may return to the dashboard."
        )

        with open(get_token_path(), "w") as token:
            token.write(creds.to_json())

        # Verify connection by getting user profile
        service = build("gmail", "v1", credentials=creds)
        profile = service.users().getProfile(userId="me").execute()
        return {
            "email": profile.get("emailAddress"),
            "messages_total": profile.get("messagesTotal", 0)
        }, None
    except Exception as e:
        return None, f"Authentication failed: {str(e)}"


def disconnect_gmail():
    """
    Removes token.json and clears the authenticated session.
    """
    token_path = get_token_path()
    if os.path.exists(token_path):
        try:
            os.remove(token_path)
            return True, "Gmail account disconnected successfully"
        except Exception as e:
            return False, f"Failed to delete token: {str(e)}"
    return True, "Already disconnected"


# -------------------------------------------------------------
# Extract Email Body - Preserved exactly from gmail_reader.py
# -------------------------------------------------------------
def get_body(payload):
    """
    Recursively extracts the plain text or HTML body from Gmail payload parts.
    Exact preservation of get_body from gmail_reader.py lines 56-99.
    """
    # Multipart email
    if "parts" in payload:
        for part in payload["parts"]:
            mime = part.get("mimeType", "")
            if mime == "text/plain":
                data = part["body"].get("data")
                if data:
                    return base64.urlsafe_b64decode(data).decode("utf-8", errors="ignore")
            elif mime == "text/html":
                data = part["body"].get("data")
                if data:
                    return base64.urlsafe_b64decode(data).decode("utf-8", errors="ignore")
            elif "parts" in part:
                text = get_body(part)
                if text:
                    return text

    # Single-part email
    data = payload.get("body", {}).get("data")
    if data:
        return base64.urlsafe_b64decode(data).decode("utf-8", errors="ignore")

    return ""


def parse_sender(raw_from):
    """Parses raw From header into (display_name, email_address)."""
    if not raw_from:
        return "Unknown Sender", ""
    name, addr = email.utils.parseaddr(raw_from)
    display_name = name if name else (addr if addr else raw_from)
    return display_name, addr


def fetch_emails(max_results=5):
    """
    Fetches the latest messages from the authenticated Gmail account.
    Returns (list_of_emails, error_message).
    """
    service = get_gmail_service()
    if not service:
        return None, "Gmail service is not connected. Please connect your Gmail account first."

    try:
        results = service.users().messages().list(
            userId="me",
            maxResults=max_results
        ).execute()

        messages = results.get("messages", [])
        if not messages:
            return [], None

        email_items = []
        for msg_summary in messages:
            msg_id = msg_summary["id"]
            msg = service.users().messages().get(
                userId="me",
                id=msg_id,
                format="full"
            ).execute()

            headers = msg.get("payload", {}).get("headers", [])
            subject = "No Subject"
            raw_sender = "Unknown Sender"
            date_str = ""

            for h in headers:
                name = h.get("name", "")
                if name.lower() == "subject":
                    subject = h.get("value", "No Subject")
                elif name.lower() == "from":
                    raw_sender = h.get("value", "Unknown Sender")
                elif name.lower() == "date":
                    date_str = h.get("value", "")

            sender_name, sender_email = parse_sender(raw_sender)
            body = get_body(msg.get("payload", {}))

            email_items.append({
                "message_id": msg_id,
                "subject": subject,
                "sender": sender_name,
                "sender_email": sender_email,
                "received_date": date_str,
                "raw_body": body
            })

        return email_items, None
    except Exception as e:
        return None, f"Failed to fetch emails from Gmail: {str(e)}"

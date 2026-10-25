import os
import re
import base64
import joblib
from bs4 import BeautifulSoup

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

# Gmail Readonly Permission
SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"]


# -----------------------------------------
# Gmail Authentication
# -----------------------------------------
def authenticate():
    creds = None

    if os.path.exists("token.json"):
        creds = Credentials.from_authorized_user_file(
            "token.json",
            SCOPES
        )

    if not creds or not creds.valid:

        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())

        else:
            flow = InstalledAppFlow.from_client_secrets_file(
                "credentials/credentials.json",
                SCOPES
            )

            creds = flow.run_local_server(
                host="localhost",
                port=8080,
                open_browser=True,
                authorization_prompt_message="Opening browser for Gmail login...",
                success_message="Authentication successful! You can close this tab."
            )

        with open("token.json", "w") as token:
            token.write(creds.to_json())

    return build("gmail", "v1", credentials=creds)


# -----------------------------------------
# Extract Email Body
# -----------------------------------------
def get_body(payload):

    # Multipart email
    if "parts" in payload:

        for part in payload["parts"]:

            mime = part.get("mimeType", "")

            if mime == "text/plain":

                data = part["body"].get("data")

                if data:
                    return base64.urlsafe_b64decode(
                        data
                    ).decode("utf-8", errors="ignore")

            elif mime == "text/html":

                data = part["body"].get("data")

                if data:
                    return base64.urlsafe_b64decode(
                        data
                    ).decode("utf-8", errors="ignore")

            elif "parts" in part:

                text = get_body(part)

                if text:
                    return text

    # Single-part email
    data = payload["body"].get("data")

    if data:
        return base64.urlsafe_b64decode(
            data
        ).decode("utf-8", errors="ignore")

    return ""


# -----------------------------------------
# Clean Email Text
# -----------------------------------------
def clean_text(text):

    text = BeautifulSoup(text, "html.parser").get_text(separator=" ")

    # Remove extra spaces/newlines/tabs
    text = re.sub(r"\s+", " ", text)

    # Remove invisible unicode characters
    text = text.replace("\u200c", "")
    text = text.replace("\u200b", "")
    text = text.replace("\ufeff", "")

    return text.strip()


# -----------------------------------------
# Main Program
# -----------------------------------------
def main():

    print("\nLoading Machine Learning Model...")

    model = joblib.load("model/spam_model.pkl")
    vectorizer = joblib.load("model/vectorizer.pkl")

    print("Model Loaded Successfully!\n")

    service = authenticate()

    results = service.users().messages().list(
        userId="me",
        maxResults=5
    ).execute()

    messages = results.get("messages", [])

    if not messages:
        print("No emails found.")
        return

    print(f"Found {len(messages)} Emails\n")

    for index, message in enumerate(messages, start=1):

        msg = service.users().messages().get(
            userId="me",
            id=message["id"],
            format="full"
        ).execute()

        headers = msg["payload"].get("headers", [])

        subject = "No Subject"

        for header in headers:
            if header["name"] == "Subject":
                subject = header["value"]
                break

        body = get_body(msg["payload"])

        body = clean_text(body)

        # If body is empty, classify using subject
        if not body:
            body = subject

        X = vectorizer.transform([body])

        prediction = model.predict(X)[0]
        probability = model.predict_proba(X)[0]

        if prediction == 1:
            label = "🚨 SPAM"
            confidence = probability[1] * 100
        else:
            label = "✅ NOT SPAM"
            confidence = probability[0] * 100

        print("=" * 90)
        print(f"Email {index}")
        print("=" * 90)
        print(f"Subject      : {subject}")
        print(f"Prediction   : {label}")
        print(f"Confidence   : {confidence:.2f}%")

        print("\nPreview:")
        print("-" * 90)

        preview = body[:300]

        if len(body) > 300:
            preview += "..."

        print(preview)

        print("\n")


# -----------------------------------------
# Run Program
# -----------------------------------------
if __name__ == "__main__":
    main()
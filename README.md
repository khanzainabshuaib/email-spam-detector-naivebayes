# MailGuard AI: Intelligent Email Spam Detection System

[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)
[![Framework: Flask](https://img.shields.io/badge/framework-Flask%203.0+-green.svg)](https://flask.palletsprojects.com/)
[![Machine Learning: scikit-learn](https://img.shields.io/badge/ML-MultinomialNB%20%7C%20TF--IDF-orange.svg)](https://scikit-learn.org/)
[![API: Gmail OAuth 2.0](https://img.shields.io/badge/API-Gmail%20REST%20v1-red.svg)](https://developers.google.com/gmail/api)
[![Database: SQLite](https://img.shields.io/badge/database-SQLite%203-lightgrey.svg)](https://www.sqlite.org/)

An enterprise-grade, full-stack email security application that pairs Google OAuth 2.0 with a Multinomial Naive Bayes Machine Learning model and TF-IDF feature extraction. MailGuard AI classifies incoming Gmail messages in real-time, displays posterior confidence ratings, explains classification decisions using word-level log-likelihood weights, and maintains persistent audit analytics.

Designed for industrial training final presentation and evaluation.

---

#overview
<img width="1331" height="637" alt="image" src="https://github.com/user-attachments/assets/cc3dd184-3311-47d4-93b6-c0d669f2e1a8" />
<img width="1334" height="631" alt="image" src="https://github.com/user-attachments/assets/97eae9c6-217d-4d10-b96a-dc030b9d0759" />
<img width="1341" height="629" alt="image" src="https://github.com/user-attachments/assets/25678829-853b-4b79-af59-cc6991ce46ec" />
<img width="1365" height="636" alt="image" src="https://github.com/user-attachments/assets/950d6b42-d90d-4fc6-a939-587013041147" />


## 📑 Table of Contents
1. [Key Features](#-key-features)
2. [System Architecture & ML Pipeline](#-system-architecture--ml-pipeline)
3. [Project Structure](#-project-structure)
4. [Installation & Setup](#-installation--setup)
5. [Google OAuth 2.0 Configuration](#-google-oauth-20-configuration)
6. [How to Run the Application](#-how-to-run-the-application)
7. [Live Demonstration Guide](#-live-demonstration-guide)
8. [API Documentation](#-api-documentation)
9. [Security & Privacy Controls](#-security--privacy-controls)
10. [Files Created & Modified](#-files-created--modified)

---

## 🚀 Key Features

- **Enterprise Security Dashboard**: Modern white content layout framed by a dark navy sidebar (`#0b132b`), blue accent styling, responsive mobile drawer, and status indicators.
- **Gmail OAuth 2.0 Integration**: Connect your authorized Google Account with read-only permissions (`gmail.readonly`) without ever exposing passwords.
- **Batch Inbox Scanner**: Fetch 5 to 20 emails directly from your live Gmail inbox with real-time progress tracking.
- **100% Local Machine Learning Inference**: Uses your pre-trained `MultinomialNB` model and `TfidfVectorizer` (English stop words removal, zero-width character stripping, BeautifulSoup HTML decoding).
- **Explainable AI (XAI)**: Identifies high-impact trigger words in every email and calculates differential log-likelihood weights.
- **Live Email Sandbox Tester**: Test any custom subject/body or load one-click presets (Lottery scam, Bank phishing, Urgent crypto, Team meeting sync, College circular) live during evaluations.
- **Persistent Analytics & Audit History**: Stores every analysis record in SQLite (`mailguard.db`) with dynamic Chart.js donut and timeline trend charts.
- **Zero Fabricated Statistics**: All metrics, confidence percentages, and charts update exclusively from actual evaluated messages.

---

## 🧠 System Architecture & ML Pipeline

```
[ Gmail REST API v1 ]  OR  [ Manual Live Email Tester ]
          │
          ▼
   [ MIME Decoding & Body Extraction ]
   (Base64 urlsafe decode, multipart handling)
          │
          ▼
   [ Text Preprocessing ]
   (BeautifulSoup HTML strip, whitespace & Unicode sanitizer)
          │
          ▼
   [ TF-IDF Vectorizer ]
   (Term Frequency-Inverse Document Frequency, Stop-words filtered)
          │
          ▼
   [ Multinomial Naive Bayes Classifier ]
   (Laplace smoothing, log probability inference)
          │
     ┌────┴───────────────────────────┐
     ▼                                ▼
[ Class: SPAM ]             [ Class: NOT SPAM ]
(Confidence: P(Spam|X))     (Confidence: P(Ham|X))
     │                                │
     └──────────────┬─────────────────┘
                    ▼
          [ SQLite Database ]
         (mailguard.db audit)
                    │
                    ▼
     [ MailGuard AI Web Dashboard ]
   (Real-time charts, table filters, modal inspections)
```

---

## 📂 Project Structure

```
c:\Email-Spam-Detector-main\
│
├── app.py                      # Flask backend API server & route handlers
├── classifier_service.py       # ML inference service (reusable TF-IDF & MultinomialNB)
├── gmail_service.py            # Gmail API client & OAuth 2.0 manager
├── database.py                 # SQLite database access layer (mailguard.db)
├── test_app.py                 # Comprehensive automated unit & integration test suite
│
├── gmail_reader.py             # Original CLI email reader (100% preserved)
├── train_model.py              # Original training script (100% preserved)
├── requirements.txt            # Python dependencies
├── .env.example                # Environment variables template
├── .gitignore                  # Git privacy & security rules
│
├── model/
│   ├── spam_model.pkl          # Trained MultinomialNB model
│   └── vectorizer.pkl          # Fitted TF-IDF vectorizer
│
├── dataset/
│   └── spam.csv                # Training dataset (5,572 rows)
│
├── templates/
│   └── index.html              # Responsive single-page dashboard application
│
├── static/
│   ├── css/
│   │   └── style.css           # Custom dark-navy & white enterprise CSS theme
│   └── js/
│       └── app.js              # State management, Chart.js, modals & API requests
│
├── credentials/                # OAuth client secret directory (gitignored)
│   └── credentials.json        # Google Cloud OAuth 2.0 Client ID file (user provided)
│
└── backup/                     # Safety backups of original unmodified project files
    ├── gmail_reader.py.bak
    ├── train_model.py.bak
    └── requirements.txt.bak
```

---

## 💻 Installation & Setup

### Prerequisites
- Python 3.10, 3.11, or 3.12
- Google Chrome, Edge, or Firefox browser
- Google Cloud Console account (for Gmail API OAuth 2.0 credentials)

### 1. Install Dependencies
Open PowerShell or Terminal in the project root:
```powershell
cd C:\Email-Spam-Detector-main
pip install -r requirements.txt
```

### 2. Configure Environment (Optional)
Copy `.env.example` to `.env`:
```powershell
copy .env.example .env
```

---

## 🔑 Google OAuth 2.0 Configuration

To connect live Gmail in the web interface:

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project named `MailGuard-AI`.
3. Navigate to **APIs & Services > Library** and enable the **Gmail API**.
4. Go to **APIs & Services > OAuth consent screen**:
   - User Type: **External**
   - Fill in App Name: `MailGuard AI` and your email.
   - Add Scope: `https://www.googleapis.com/auth/gmail.readonly`.
   - Under **Test Users**, add your personal Gmail address.
5. Go to **APIs & Services > Credentials > Create Credentials > OAuth Client ID**:
   - Application Type: **Desktop app** (or Web application).
   - Name: `MailGuard Desktop Client`.
6. Download the JSON file, rename it to `credentials.json`, and place it in:
   ```
   C:\Email-Spam-Detector-main\credentials\credentials.json
   ```
   *(Alternatively, you can click "Upload credentials.json" directly in the web app under the Settings tab).*

---

## ▶️ How to Run the Application

### Start the Web Application
```powershell
cd C:\Email-Spam-Detector-main
python app.py
```

Open your browser and navigate to:
```
http://127.0.0.1:5000/
```

### Run Automated Tests
To verify all services, ML models, endpoints, and database functions:
```powershell
python test_app.py
```

### Run Original CLI Script (Preserved)
The original CLI tool is completely intact and can be executed at any time:
```powershell
python gmail_reader.py
```

---

## 🎯 Live Demonstration Guide (Industrial Presentation)

When presenting to evaluators or instructors:

1. **Overview Dashboard**:
   - Showcase the corporate dark navy-blue sidebar and clean white card layout.
   - Point to the active **MultinomialNB Engine** badge and real-time statistics cards.
2. **Demonstrate Google OAuth Integration**:
   - Click **Connect Gmail** in the top navigation or under **Inbox Scanner**.
   - Authenticate with your test Google account. Notice how the status indicator changes from amber to pulsing green (`Connected: your_email@gmail.com`).
3. **Run Inbox Analysis**:
   - Select `Latest 5 Emails` and click **Analyze Inbox Now**.
   - Show the step-by-step progress animation (Ingestion -> HTML Stripping -> TF-IDF -> Prediction).
   - Review the batch table with red **SPAM** and green **NOT SPAM** badges along with confidence scores.
4. **Inspect Email Details**:
   - Click **Details** on any row to open the modal.
   - Highlight the **Extracted Cleaned Body**, **Confidence Meter**, and **Feature Explainability** (top words that influenced the classification).
5. **Live Email Tester (Audience Interactive Test)**:
   - Switch to the **Live Email Tester** tab.
   - Test presets such as **Lottery Scam** or **Bank Phishing** to see immediate high-confidence spam detections.
   - Test a custom email or legitimate meeting message to show the model distinguishing authentic correspondence.
6. **Analytics & Performance**:
   - Switch to **Analytics & Metrics** to review the dynamically updating Donut Chart and Trend Line Chart.
   - Note the academic disclaimer emphasizing that individual confidence scores reflect posterior class probabilities.

---

## 🛡️ Security & Privacy Controls

- **Zero Credential Exposure**: Client secrets, access tokens, and refresh tokens are strictly stored on the server side (`credentials/credentials.json` and `token.json`) and never sent to frontend JavaScript.
- **Read-Only Scope**: The application strictly requests `gmail.readonly`. It cannot send, alter, or delete messages.
- **Sanitized Inputs**: Raw email payloads are sanitized with BeautifulSoup and regular expressions before processing to eliminate malformed scripts or hidden Unicode.
- **Git Protection**: `.gitignore` prevents accidentally pushing `token.json`, `credentials.json`, `.env`, or `mailguard.db`.

---

## 📝 Files Created & Modified

| File | Status | Description |
|---|---|---|
| `app.py` | Created | Flask application server with REST API routes |
| `classifier_service.py` | Created | Reusable ML inference service wrapping existing MultinomialNB & vectorizer |
| `gmail_service.py` | Created | OAuth 2.0 authentication and Gmail API helper |
| `database.py` | Created | SQLite storage manager for history and analytics |
| `test_app.py` | Created | Automated unit & integration test suite |
| `templates/index.html` | Created | Responsive enterprise dashboard UI |
| `static/css/style.css` | Created | Dark navy & white responsive CSS styling |
| `static/js/app.js` | Created | Frontend controller with Chart.js & state handling |
| `.env.example` | Created | Sample configuration file |
| `README.md` | Created | Comprehensive documentation & presentation guide |
| `requirements.txt` | Updated | Added Flask, Flask-Cors, and python-dotenv |
| `.gitignore` | Updated | Added rules for `*.db` and `mailguard.db` |
| `backup/` | Created | Contains backup copies of `gmail_reader.py`, `train_model.py`, and `requirements.txt` |
| `gmail_reader.py` | Preserved | Original CLI reader retained 100% functional |
| `train_model.py` | Preserved | Original model training script retained |
| `model/spam_model.pkl` | Preserved | Original trained Multinomial Naive Bayes model |
| `model/vectorizer.pkl` | Preserved | Original fitted TF-IDF vectorizer |
| `dataset/spam.csv` | Preserved | Original dataset preserved |

---

*MailGuard AI — Developed for Industrial Training Final Evaluation.*

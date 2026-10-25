"""
MailGuard AI - Database Access Layer
Persistent SQLite storage for email classification records and analytics.
"""

import sqlite3
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "mailguard.db")


def get_connection():
    """Returns a SQLite connection configured with Row factory."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Initializes tables if they do not exist."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS emails (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                message_id TEXT UNIQUE,
                subject TEXT,
                sender TEXT,
                sender_email TEXT,
                received_date TEXT,
                body_preview TEXT,
                body_full TEXT,
                category TEXT NOT NULL,
                prediction_code INTEGER NOT NULL,
                confidence REAL NOT NULL,
                spam_prob REAL NOT NULL,
                ham_prob REAL NOT NULL,
                source TEXT DEFAULT 'gmail',
                analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS system_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                level TEXT NOT NULL,
                message TEXT NOT NULL
            );
        """)
        conn.commit()


def save_email(email_data):
    """
    Saves an analyzed email record. Uses INSERT OR REPLACE based on message_id.
    Returns the record ID.
    """
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO emails (
                message_id, subject, sender, sender_email, received_date,
                body_preview, body_full, category, prediction_code,
                confidence, spam_prob, ham_prob, source, analyzed_at
            ) VALUES (
                :message_id, :subject, :sender, :sender_email, :received_date,
                :body_preview, :body_full, :category, :prediction_code,
                :confidence, :spam_prob, :ham_prob, :source, :analyzed_at
            )
            ON CONFLICT(message_id) DO UPDATE SET
                subject=excluded.subject,
                sender=excluded.sender,
                sender_email=excluded.sender_email,
                received_date=excluded.received_date,
                body_preview=excluded.body_preview,
                body_full=excluded.body_full,
                category=excluded.category,
                prediction_code=excluded.prediction_code,
                confidence=excluded.confidence,
                spam_prob=excluded.spam_prob,
                ham_prob=excluded.ham_prob,
                source=excluded.source,
                analyzed_at=excluded.analyzed_at
        """, {
            "message_id": email_data.get("message_id"),
            "subject": email_data.get("subject") or "No Subject",
            "sender": email_data.get("sender") or "Unknown Sender",
            "sender_email": email_data.get("sender_email") or "",
            "received_date": email_data.get("received_date") or datetime.now().strftime("%Y-%m-%d %H:%M"),
            "body_preview": (email_data.get("body_preview") or "")[:350],
            "body_full": email_data.get("body_full") or "",
            "category": email_data.get("category", "NOT SPAM"),
            "prediction_code": int(email_data.get("prediction_code", 0)),
            "confidence": float(email_data.get("confidence", 0.0)),
            "spam_prob": float(email_data.get("spam_prob", 0.0)),
            "ham_prob": float(email_data.get("ham_prob", 0.0)),
            "source": email_data.get("source", "gmail"),
            "analyzed_at": email_data.get("analyzed_at", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
        })
        conn.commit()
        return cursor.lastrowid


def get_emails(search=None, filter_category=None, sort_by="date_desc", page=1, limit=10):
    """
    Fetches paginated email records with search and filter capabilities.
    """
    conditions = []
    params = {}

    if search:
        conditions.append("(subject LIKE :search OR sender LIKE :search OR body_preview LIKE :search)")
        params["search"] = f"%{search}%"

    if filter_category:
        upper_cat = filter_category.upper()
        if upper_cat in ["SPAM", "NOT SPAM"]:
            conditions.append("category = :filter_category")
            params["filter_category"] = upper_cat

    where_clause = ""
    if conditions:
        where_clause = "WHERE " + " AND ".join(conditions)

    sort_clause = "ORDER BY analyzed_at DESC"
    if sort_by == "date_asc":
        sort_clause = "ORDER BY analyzed_at ASC"
    elif sort_by == "conf_desc":
        sort_clause = "ORDER BY confidence DESC"
    elif sort_by == "conf_asc":
        sort_clause = "ORDER BY confidence ASC"
    elif sort_by == "subject_asc":
        sort_clause = "ORDER BY subject ASC"

    offset = max(0, (page - 1) * limit)
    params["limit"] = limit
    params["offset"] = offset

    with get_connection() as conn:
        cursor = conn.cursor()
        
        # Get total count matching criteria
        count_query = f"SELECT COUNT(*) FROM emails {where_clause}"
        cursor.execute(count_query, {k: v for k, v in params.items() if k in ["search", "filter_category"]})
        total_count = cursor.fetchone()[0]

        # Get records
        query = f"SELECT * FROM emails {where_clause} {sort_clause} LIMIT :limit OFFSET :offset"
        cursor.execute(query, params)
        rows = [dict(row) for row in cursor.fetchall()]

        total_pages = (total_count + limit - 1) // limit if total_count > 0 else 1

        return {
            "emails": rows,
            "total": total_count,
            "page": page,
            "limit": limit,
            "total_pages": total_pages
        }


def get_email_by_id(record_id):
    """Retrieves a single email record by primary key."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM emails WHERE id = ?", (record_id,))
        row = cursor.fetchone()
        return dict(row) if row else None


def delete_email(record_id):
    """Deletes an email record by primary key."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM emails WHERE id = ?", (record_id,))
        conn.commit()
        return cursor.rowcount > 0


def clear_all_emails():
    """Clears all email records."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM emails")
        conn.commit()


def get_stats():
    """
    Calculates actual statistics from stored records:
    - total_analyzed
    - spam_count
    - ham_count
    - spam_percentage
    - avg_spam_confidence
    - avg_ham_confidence
    """
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN category = 'SPAM' THEN 1 ELSE 0 END) as spam_count,
                SUM(CASE WHEN category = 'NOT SPAM' THEN 1 ELSE 0 END) as ham_count,
                AVG(CASE WHEN category = 'SPAM' THEN confidence ELSE NULL END) as avg_spam_conf,
                AVG(CASE WHEN category = 'NOT SPAM' THEN confidence ELSE NULL END) as avg_ham_conf
            FROM emails
        """)
        row = cursor.fetchone()
        
        total = row["total"] or 0
        spam_count = row["spam_count"] or 0
        ham_count = row["ham_count"] or 0
        spam_pct = round((spam_count / total * 100), 2) if total > 0 else 0.0
        avg_spam_conf = round(row["avg_spam_conf"] or 0.0, 2)
        avg_ham_conf = round(row["avg_ham_conf"] or 0.0, 2)

        return {
            "total": total,
            "spam_count": spam_count,
            "ham_count": ham_count,
            "spam_percentage": spam_pct,
            "avg_spam_confidence": avg_spam_conf,
            "avg_ham_confidence": avg_ham_conf
        }


def get_analytics():
    """
    Returns breakdown data for charts:
    - distribution (spam vs ham counts)
    - timeline (counts grouped by date)
    - recent_accuracy_sample
    """
    stats = get_stats()
    
    with get_connection() as conn:
        cursor = conn.cursor()
        
        # Timeline distribution: grouped by date of analyzed_at (last 14 days)
        cursor.execute("""
            SELECT 
                substr(analyzed_at, 1, 10) as date_label,
                SUM(CASE WHEN category = 'SPAM' THEN 1 ELSE 0 END) as spam_count,
                SUM(CASE WHEN category = 'NOT SPAM' THEN 1 ELSE 0 END) as ham_count,
                COUNT(*) as total
            FROM emails
            GROUP BY date_label
            ORDER BY date_label ASC
            LIMIT 14
        """)
        timeline_rows = [dict(r) for r in cursor.fetchall()]

    return {
        "stats": stats,
        "timeline": timeline_rows
    }


def log_event(level, message):
    """Appends an event to system_logs."""
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("INSERT INTO system_logs (level, message) VALUES (?, ?)", (level, message))
            conn.commit()
    except Exception:
        pass

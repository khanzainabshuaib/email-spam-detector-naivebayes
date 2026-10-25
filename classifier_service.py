"""
MailGuard AI - Classifier Service
Wraps the trained Multinomial Naive Bayes model and TF-IDF vectorizer.
Reuses the exact preprocessing, prediction, and probability estimation pipeline.
"""

import os
import re
import warnings
import joblib
from bs4 import BeautifulSoup

# Suppress sklearn unpickle minor version warnings
warnings.filterwarnings("ignore")
try:
    from sklearn.exceptions import InconsistentVersionWarning
    warnings.filterwarnings("ignore", category=InconsistentVersionWarning)
except ImportError:
    pass

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "model", "spam_model.pkl")
VECTORIZER_PATH = os.path.join(BASE_DIR, "model", "vectorizer.pkl")

_model = None
_vectorizer = None


def load_model():
    """Loads the model and vectorizer into memory if not already loaded."""
    global _model, _vectorizer
    if _model is None or _vectorizer is None:
        if not os.path.exists(MODEL_PATH):
            raise FileNotFoundError(f"Model file not found at {MODEL_PATH}")
        if not os.path.exists(VECTORIZER_PATH):
            raise FileNotFoundError(f"Vectorizer file not found at {VECTORIZER_PATH}")
        _model = joblib.load(MODEL_PATH)
        _vectorizer = joblib.load(VECTORIZER_PATH)
    return _model, _vectorizer


def clean_text(text):
    """
    Cleans raw email body or text.
    Preserves the exact preprocessing logic from gmail_reader.py.
    """
    if not text:
        return ""
    
    # Strip HTML tags
    text = BeautifulSoup(text, "html.parser").get_text(separator=" ")

    # Remove extra spaces/newlines/tabs
    text = re.sub(r"\s+", " ", text)

    # Remove invisible unicode characters
    text = text.replace("\u200c", "")
    text = text.replace("\u200b", "")
    text = text.replace("\ufeff", "")

    return text.strip()


def extract_key_indicators(vectorized_row, vectorizer, model, top_n=5):
    """
    Identifies words present in the email that have the highest differential
    log-likelihood towards Spam or Ham, providing explainability.
    """
    try:
        feature_names = vectorizer.get_feature_names_out()
        nonzero_indices = vectorized_row.indices

        if len(nonzero_indices) == 0:
            return []

        # Difference in log probability between Spam (class 1) and Ham (class 0)
        spam_log_prob = model.feature_log_prob_[1]
        ham_log_prob = model.feature_log_prob_[0]
        diff = spam_log_prob - ham_log_prob

        # Rank the tokens present in this email
        token_scores = []
        for idx in nonzero_indices:
            word = feature_names[idx]
            token_scores.append((word, float(diff[idx])))

        # Sort tokens by spam bias descending
        token_scores.sort(key=lambda x: abs(x[1]), reverse=True)
        return [{"word": word, "weight": round(weight, 3)} for word, weight in token_scores[:top_n]]
    except Exception:
        return []


def classify_email(subject, body):
    """
    Classifies an email given its subject and body.
    Follows the exact decision logic in gmail_reader.py:
    If body is empty, uses subject for classification.
    """
    model, vectorizer = load_model()

    subject_clean = clean_text(subject or "")
    body_clean = clean_text(body or "")

    # Primary text for classification
    text_to_classify = body_clean if body_clean else subject_clean

    if not text_to_classify:
        # Default fallback for completely empty email
        return {
            "category": "NOT SPAM",
            "prediction_code": 0,
            "confidence": 50.0,
            "spam_prob": 0.5,
            "ham_prob": 0.5,
            "cleaned_text": "",
            "preview": "Empty message",
            "key_indicators": []
        }

    # Vectorize
    X = vectorizer.transform([text_to_classify])

    # Prediction and probability
    pred = int(model.predict(X)[0])
    probabilities = model.predict_proba(X)[0]

    ham_prob = float(probabilities[0])
    spam_prob = float(probabilities[1])

    if pred == 1:
        category = "SPAM"
        confidence = spam_prob * 100.0
    else:
        category = "NOT SPAM"
        confidence = ham_prob * 100.0

    preview = text_to_classify[:300]
    if len(text_to_classify) > 300:
        preview += "..."

    key_indicators = extract_key_indicators(X, vectorizer, model)

    return {
        "category": category,
        "prediction_code": pred,
        "confidence": round(confidence, 2),
        "spam_prob": round(spam_prob, 4),
        "ham_prob": round(ham_prob, 4),
        "cleaned_text": text_to_classify,
        "preview": preview,
        "key_indicators": key_indicators
    }


def is_model_ready():
    """Checks if model files exist and can be loaded."""
    try:
        load_model()
        return True
    except Exception:
        return False

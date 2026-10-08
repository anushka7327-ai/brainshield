import re


SUSPICIOUS_KEYWORDS = [
    "support",
    "customer support",
    "customer care",
    "help",
    "official",
    "verification",
    "verify",
    "kyc",
    "reward",
    "rewards",
    "cashback",
    "refund",
    "security",
    "admin",
    "complaint",
]


def detect_suspicious_keywords(
    username: str = "",
    display_name: str = "",
    bio: str = ""
) -> dict:
    """
    Detect suspicious keywords in a social-media profile.

    Keywords alone do NOT mean that an account is malicious.
    They are only one risk signal.
    """

    # Combine profile information
    text = " ".join([
        username or "",
        display_name or "",
        bio or ""
    ]).lower()

    matched_keywords = []

    for keyword in SUSPICIOUS_KEYWORDS:
        if keyword.lower() in text:
            matched_keywords.append(keyword)

    # Remove duplicate keywords
    matched_keywords = list(dict.fromkeys(matched_keywords))

    if len(matched_keywords) == 0:
        risk = "LOW"
    elif len(matched_keywords) <= 2:
        risk = "MEDIUM"
    else:
        risk = "HIGH"

    reasons = []

    if matched_keywords:
        reasons.append(
            "Suspicious keywords detected: "
            + ", ".join(matched_keywords)
        )

    return {
        "matched_keywords": matched_keywords,
        "keyword_count": len(matched_keywords),
        "risk": risk,
        "reasons": reasons
    }
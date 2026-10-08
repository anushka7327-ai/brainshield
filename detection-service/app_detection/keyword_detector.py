SUSPICIOUS_KEYWORDS = [
    "official",
    "support",
    "wallet",
    "rewards",
    "secure",
    "customer care",
    "cashback"
]


def keyword_score(text):

    text = text.lower()

    found = []

    for keyword in SUSPICIOUS_KEYWORDS:

        if keyword in text:
            found.append(keyword)

    score = min(
        len(found) * 20,
        100
    )

    return {
        "score": score,
        "keywords": found
    }
def calculate_risk_score(
    name_similarity: float,
    keyword_count: int,
    homoglyph_detected: bool = False,
    official: bool = False
) -> dict:
    """
    Calculate final social-account risk score.

    Score:
        Name similarity  -> up to 60 points
        Keywords         -> up to 25 points
        Homoglyph         -> up to 15 points

    Official accounts are always SAFE with score 0.
    """

    # Official account must never be flagged
    if official:
        return {
            "risk_score": 0,
            "risk_level": "SAFE",
            "reasons": [
                "Account is registered as an official brand account."
            ]
        }

    score = 0
    reasons = []

    # --------------------------------------------------
    # 1. NAME SIMILARITY - maximum 60 points
    # --------------------------------------------------

    if name_similarity >= 90:
        score += 60
        reasons.append(
            "Very high similarity with the official brand name."
        )

    elif name_similarity >= 70:
        score += 45
        reasons.append(
            "High similarity with the official brand name."
        )

    elif name_similarity >= 50:
        score += 25
        reasons.append(
            "Moderate similarity with the official brand name."
        )

    # --------------------------------------------------
    # 2. SUSPICIOUS KEYWORDS - maximum 25 points
    # --------------------------------------------------

    keyword_points = min(keyword_count * 8, 25)

    if keyword_points > 0:
        score += keyword_points
        reasons.append(
            f"{keyword_count} suspicious keyword(s) detected."
        )

    # --------------------------------------------------
    # 3. HOMOGLYPH - maximum 15 points
    # --------------------------------------------------

    if homoglyph_detected:
        score += 15
        reasons.append(
            "Look-alike Unicode characters detected."
        )

    # Make sure score stays between 0 and 100
    score = min(score, 100)

    # --------------------------------------------------
    # 4. RISK LEVEL
    # --------------------------------------------------

    if score >= 70:
        risk_level = "HIGH"

    elif score >= 40:
        risk_level = "MEDIUM"

    else:
        risk_level = "LOW"

    return {
        "risk_score": score,
        "risk_level": risk_level,
        "reasons": reasons
    }
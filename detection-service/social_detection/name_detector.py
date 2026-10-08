from rapidfuzz import fuzz

from .normalizer import normalize_text, normalize_username


def calculate_name_similarity(brand_name: str, candidate_name: str) -> float:
    """
    Calculate similarity between official brand name
    and candidate social-media name.

    Returns a score from 0 to 100.
    """

    brand = normalize_text(brand_name)
    candidate = normalize_text(candidate_name)

    if not brand or not candidate:
        return 0.0

    # Main similarity score
    ratio_score = fuzz.ratio(brand, candidate)

    # Useful when candidate contains extra words
    partial_score = fuzz.partial_ratio(brand, candidate)

    # Take the stronger signal
    similarity = max(ratio_score, partial_score)

    return round(similarity, 2)


def detect_name_impersonation(
    brand_name: str,
    username: str,
    display_name: str = ""
) -> dict:
    """
    Detect whether a username/display name looks similar
    to the official brand name.
    """

    username_score = calculate_name_similarity(
        brand_name,
        normalize_username(username)
    )

    display_score = calculate_name_similarity(
        brand_name,
        display_name
    )

    # Use the strongest similarity
    final_score = max(username_score, display_score)

    suspicious = final_score >= 70

    if final_score >= 90:
        risk = "HIGH"
    elif final_score >= 70:
        risk = "MEDIUM"
    else:
        risk = "LOW"

    reasons = []

    if username_score >= 90:
        reasons.append(
            "Username is highly similar to the brand name."
        )
    elif username_score >= 70:
        reasons.append(
            "Username is similar to the brand name."
        )

    if display_score >= 90:
        reasons.append(
            "Display name is highly similar to the brand name."
        )
    elif display_score >= 70:
        reasons.append(
            "Display name is similar to the brand name."
        )

    return {
        "username_similarity": username_score,
        "display_name_similarity": display_score,
        "name_similarity": final_score,
        "suspicious": suspicious,
        "risk": risk,
        "reasons": reasons
    }
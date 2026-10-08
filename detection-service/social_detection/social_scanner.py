from .name_detector import detect_name_impersonation
from .keyword_detector import detect_suspicious_keywords
from .risk_engine import calculate_risk_score
from .homoglyph_detector import detect_homoglyphs


def is_official_account(brand: dict, candidate: dict) -> bool:
    """
    Check whether the candidate social account
    is already registered as an official brand account.
    """

    platform = (candidate.get("platform") or "").lower()
    username = (candidate.get("username") or "").lower().lstrip("@")

    official_accounts = brand.get("official_accounts", [])

    for account in official_accounts:
        official_platform = (
            account.get("platform") or ""
        ).lower()

        official_username = (
            account.get("username") or ""
        ).lower().lstrip("@")

        if (
            platform == official_platform
            and username == official_username
        ):
            return True

    return False


def analyze_social_account(brand: dict, candidate: dict) -> dict:
    """
    Analyze a social-media account for possible
    brand impersonation.

    Returns JSON-serializable detection results.
    """

    brand_name = brand.get("brand_name", "")

    platform = candidate.get("platform", "")
    username = candidate.get("username", "")
    display_name = candidate.get("display_name", "")
    bio = candidate.get("bio", "")

    # --------------------------------------------------
    # 1. Check official account FIRST
    # --------------------------------------------------

    official = is_official_account(brand, candidate)

    # --------------------------------------------------
    # 2. Name similarity detection
    # --------------------------------------------------

    name_result = detect_name_impersonation(
        brand_name=brand_name,
        username=username,
        display_name=display_name
    )

    # --------------------------------------------------
    # 3. Suspicious keyword detection
    # --------------------------------------------------

    keyword_result = detect_suspicious_keywords(
        username=username,
        display_name=display_name,
        bio=bio
    )

    # --------------------------------------------------
    # 4. Homoglyph detection (Latin mixed with look-alike Cyrillic/Greek)
    # --------------------------------------------------

    homoglyph_detected = detect_homoglyphs(username, display_name)

    # --------------------------------------------------
    # 5. Final risk calculation
    # --------------------------------------------------

    risk_result = calculate_risk_score(
        name_similarity=name_result["name_similarity"],
        keyword_count=keyword_result["keyword_count"],
        homoglyph_detected=homoglyph_detected,
        official=official
    )

    # --------------------------------------------------
    # 6. Combine all reasons
    # --------------------------------------------------

    reasons = []

    reasons.extend(name_result["reasons"])
    reasons.extend(keyword_result["reasons"])
    reasons.extend(risk_result["reasons"])

    # Remove duplicate reasons
    reasons = list(dict.fromkeys(reasons))

    # --------------------------------------------------
    # 7. Final JSON response
    # --------------------------------------------------

    return {
        "platform": platform,
        "username": username,
        "display_name": display_name,
        "official": official,

        "name_similarity": name_result["name_similarity"],

        "matched_keywords": keyword_result[
            "matched_keywords"
        ],

        "homoglyph_detected": homoglyph_detected,

        "risk_score": risk_result["risk_score"],
        "risk_level": risk_result["risk_level"],

        "reasons": reasons
    }
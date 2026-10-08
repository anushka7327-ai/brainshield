"""
app_similarity.py

Brand/App Name Similarity Detection

Uses RapidFuzz to compare official brand names
with candidate app names and return a similarity score.

Examples:
Paytm vs Paytm Rewards
Paytm vs P4ytm
Paytm vs PayTm
"""

from rapidfuzz import fuzz


def calculate_similarity(official_name: str, candidate_name: str) -> float:
    """
    Calculate similarity score between official app name
    and candidate app name.

    Returns:
        float: similarity percentage (0-100)
    """

    official_name = official_name.lower().strip()
    candidate_name = candidate_name.lower().strip()

    ratio_score = fuzz.ratio(
        official_name,
        candidate_name
    )

    partial_score = fuzz.partial_ratio(
        official_name,
        candidate_name
    )

    token_score = fuzz.token_sort_ratio(
        official_name,
        candidate_name
    )

    weighted_score = (
        ratio_score * 0.4 +
        partial_score * 0.4 +
        token_score * 0.2
    )

    return round(weighted_score, 2)


def get_risk_level(score: float) -> str:
    """
    Convert similarity score into risk level.
    """

    if score >= 85:
        return "HIGH"

    elif score >= 60:
        return "MEDIUM"

    return "LOW"


if __name__ == "__main__":

    official_app = "Paytm"

    test_apps = [
        "Paytm Rewards",
        "Paytm Wallet",
        "P4ytm",
        "PayTm",
        "Pay tm",
        "Amazon",
        "Google Pay"
    ]

    print("\nOFFICIAL APP:", official_app)
    print("-" * 60)

    print(
        f"{'Candidate App':<25}"
        f"{'Similarity':<15}"
        f"{'Risk'}"
    )

    print("-" * 60)

    for app in test_apps:

        score = calculate_similarity(
            official_app,
            app
        )

        risk = get_risk_level(score)

        print(
            f"{app:<25}"
            f"{str(score)+'%':<15}"
            f"{risk}"
        )
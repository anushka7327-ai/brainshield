from .app_monitor import search_apps
from .app_similarity import calculate_similarity
from .developer_checker import DeveloperChecker
from .risk_engine import calculate_risk_score
from .description_similarity import description_similarity
from .keyword_detector import keyword_score


def scan_apps(
    brand_name,
    official_developer="",
    official_description="",
    limit=10,
    country="us",
):
    apps = search_apps(brand_name, limit=limit, country=country)
    results = []

    for app in apps:
        similarity = calculate_similarity(brand_name, app["app_name"])

        # Without a known official developer we cannot verify anyone, so use a
        # neutral score instead of treating every publisher as a mismatch.
        if (official_developer or "").strip():
            developer = DeveloperChecker.developer_check(official_developer, app["developer"])
        else:
            developer = {
                "status": "UNKNOWN",
                "similarity_score": 50,
                "reason": "Official developer not provided.",
            }

        desc_score = description_similarity(official_description or "", app["description"])
        kw = keyword_score(app["app_name"] + " " + app["description"])

        # The brand's own app must never be flagged as a threat
        if developer["status"] == "MATCH":
            risk = {"risk_score": 0, "risk_level": "SAFE"}
        else:
            risk = calculate_risk_score(
                name_similarity=similarity,
                developer_similarity=developer["similarity_score"],
                description_similarity=desc_score,
                keyword_score=kw["score"],
            )

        reasons = []
        if developer["status"] == "MATCH":
            reasons.append("Published by the official developer.")
        else:
            if similarity >= 60:
                reasons.append(f"App name is {similarity:.0f}% similar to the brand name.")
            if developer["status"] == "MISMATCH":
                reasons.append("Developer does not match the official developer.")
            elif developer["status"] == "POSSIBLE_MATCH":
                reasons.append("Developer name is close to, but not the same as, the official developer.")
            elif developer["status"] == "UNKNOWN":
                reasons.append("Official developer is not set, so the publisher could not be verified.")
            if desc_score >= 70:
                reasons.append("Description closely matches the official description.")
            if kw["keywords"]:
                reasons.append("Suspicious keywords: " + ", ".join(kw["keywords"]) + ".")

        results.append({
            "app_name": app["app_name"],
            "app_id": app["app_id"],
            "url": app["url"],
            "icon": app["icon"],
            "developer": app["developer"],
            "name_similarity": similarity,
            "developer_status": developer["status"],
            "developer_similarity": developer["similarity_score"],
            "description_similarity": desc_score,
            "keywords_found": kw["keywords"],
            "risk_score": risk["risk_score"],
            "risk_level": risk["risk_level"],
            "reasons": reasons,
        })

    return results

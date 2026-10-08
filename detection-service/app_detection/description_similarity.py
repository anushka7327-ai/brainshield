from rapidfuzz import fuzz


def description_similarity(official_description, candidate_description):
    official = (official_description or "").lower().strip()
    candidate = (candidate_description or "").lower().strip()

    # Nothing to compare against
    if not official or not candidate:
        return 0.0

    return round(fuzz.token_set_ratio(official, candidate), 2)

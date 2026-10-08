def calculate_risk_score(
    name_similarity,
    developer_similarity,
    description_similarity=0,
    keyword_score=0
):

    developer_risk = 100 - developer_similarity

    risk_score = (
        name_similarity * 0.40 +
        developer_risk * 0.30 +
        description_similarity * 0.20 +
        keyword_score * 0.10
    )

    risk_score = round(risk_score, 2)

    if risk_score >= 80:
        level = "HIGH"
    elif risk_score >= 50:
        level = "MEDIUM"
    else:
        level = "LOW"

    return {
        "risk_score": risk_score,
        "risk_level": level
    }


if __name__ == "__main__":

    result = calculate_risk_score(
    name_similarity=95,
    developer_similarity=10,
    description_similarity=90,
    keyword_score=100
)

    print(result)
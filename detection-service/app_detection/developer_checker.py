"""
developer_checker.py

Developer Verification Engine

Purpose:
- Compare official developer/publisher with candidate developer.
- Detect impersonation attempts.
- Generate similarity score.
- Return match status and reasoning.
"""

import re
from difflib import SequenceMatcher


class DeveloperChecker:

    @staticmethod
    def normalize(text: str) -> str:
        """
        Normalize developer names for comparison.
        """

        if not text:
            return ""

        text = text.lower().strip()

        # Remove common company suffixes
        text = re.sub(
            r"\b(inc|inc\.|ltd|ltd\.|llc|corp|corporation|company|co)\b",
            "",
            text
        )

        # Remove special chars
        text = re.sub(r"[^a-z0-9\s]", "", text)

        # Remove extra spaces
        text = re.sub(r"\s+", " ", text).strip()

        return text

    @staticmethod
    def sequence_similarity(a: str, b: str) -> float:
        return SequenceMatcher(
            None,
            a,
            b
        ).ratio()

    @staticmethod
    def token_similarity(a: str, b: str) -> float:
        """
        Jaccard token similarity
        """

        tokens_a = set(a.split())
        tokens_b = set(b.split())

        if not tokens_a or not tokens_b:
            return 0

        intersection = len(tokens_a & tokens_b)
        union = len(tokens_a | tokens_b)

        return intersection / union

    @staticmethod
    def contains_similarity(a: str, b: str) -> float:

        # An empty string is "contained" in everything, which would inflate the score
        if not a or not b:
            return 0.0

        if a in b or b in a:
            return 1.0

        return 0.0

    @classmethod
    def developer_check(
        cls,
        official_developer: str,
        candidate_developer: str
    ):

        official = cls.normalize(
            official_developer
        )

        candidate = cls.normalize(
            candidate_developer
        )

        if official == candidate:
            return {
                "status": "MATCH",
                "similarity_score": 100,
                "reason": "Exact developer match."
            }

        seq_score = cls.sequence_similarity(
            official,
            candidate
        )

        token_score = cls.token_similarity(
            official,
            candidate
        )

        contains_score = cls.contains_similarity(
            official,
            candidate
        )

        final_score = (
            seq_score * 0.50 +
            token_score * 0.30 +
            contains_score * 0.20
        ) * 100

        final_score = round(
            final_score,
            2
        )

        if final_score >= 85:
            status = "MATCH"

        elif final_score >= 60:
            status = "POSSIBLE_MATCH"

        else:
            status = "MISMATCH"

        return {
            "status": status,
            "similarity_score": final_score,
            "reason": (
                f"Sequence={round(seq_score*100,2)}%, "
                f"Token={round(token_score*100,2)}%, "
                f"Contains={round(contains_score*100,2)}%"
            )
        }


if __name__ == "__main__":

    official = "One97 Communications Ltd."

    test_developers = [
        "One97 Communications",
        "One97 Communication",
        "One97 Technologies",
        "Paytm Inc",
        "XYZ Apps",
        "Google LLC"
    ]

    print("\nDeveloper Verification Results")
    print("=" * 70)

    for dev in test_developers:

        result = DeveloperChecker.developer_check(
            official,
            dev
        )

        print("\nOfficial :", official)
        print("Candidate:", dev)

        print(
            f"Status   : {result['status']}"
        )

        print(
            f"Score    : {result['similarity_score']}%"
        )

        print(
            f"Reason   : {result['reason']}"
        )

        print("-" * 70)
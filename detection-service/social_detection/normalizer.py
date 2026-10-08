import re
import unicodedata


def normalize_text(text: str) -> str:
    """
    Clean text so it can be compared with other brand/profile names.

    Examples:
        "Paytm Official" -> "paytmofficial"
        "Paytm_Support" -> "paytmsupport"
        "PAYTM" -> "paytm"
    """

    if not text:
        return ""

    # Convert to string and lowercase
    text = str(text).lower().strip()

    # Normalize Unicode characters
    text = unicodedata.normalize("NFKC", text)

    # Remove spaces, underscores, dots and hyphens
    text = re.sub(r"[\s_.\-]+", "", text)

    # Keep only English letters and numbers
    text = re.sub(r"[^a-z0-9]", "", text)

    return text


def normalize_username(username: str) -> str:
    """
    Normalize a social media username.

    Example:
        "@Paytm_Support" -> "paytmsupport"
    """

    if not username:
        return ""

    # Remove @ from the beginning
    username = username.strip().lstrip("@")

    return normalize_text(username)


def normalize_brand_name(brand_name: str) -> str:
    """
    Normalize an official brand name.

    Example:
        "PAYTM" -> "paytm"
    """

    return normalize_text(brand_name)
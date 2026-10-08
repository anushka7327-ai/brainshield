import unicodedata


def detect_homoglyphs(*texts: str) -> bool:
    """
    True if a Latin-looking name mixes in Cyrillic or Greek letters,
    e.g. a Cyrillic "а" inside "pаypal". Names written entirely in another
    script are not flagged.
    """
    for text in texts:
        if not text:
            continue

        has_latin = False
        has_lookalike_script = False

        for ch in text:
            if not ch.isalpha():
                continue
            name = unicodedata.name(ch, "")
            if name.startswith("LATIN"):
                has_latin = True
            elif name.startswith(("CYRILLIC", "GREEK")):
                has_lookalike_script = True

        if has_latin and has_lookalike_script:
            return True

    return False

from google_play_scraper import search


def search_apps(brand_name, limit=10, country="us", lang="en"):
    """Search Google Play for apps matching the brand name."""
    results = search(brand_name, lang=lang, country=country, n_hits=limit)

    app_list = []
    for app in results:
        app_id = app.get("appId")
        app_list.append({
            "app_name": app.get("title") or "N/A",
            "app_id": app_id,
            "developer": app.get("developer") or "N/A",
            # Search results can contain None for description
            "description": app.get("description") or "",
            "icon": app.get("icon"),
            "url": f"https://play.google.com/store/apps/details?id={app_id}" if app_id else None,
        })

    return app_list

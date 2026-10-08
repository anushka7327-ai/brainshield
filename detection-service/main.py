"""
SentinelDRP detection service.

Exposes the Play Store app scanner and the social-account detector over HTTP so the
Node server can call them. Run with:  python -m uvicorn main:app --port 8001
"""
from typing import List

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from app_detection.app_scanner import scan_apps
from social_detection.social_scanner import analyze_social_account

app = FastAPI(title="SentinelDRP detection service", version="1.0.0")


class AppScanRequest(BaseModel):
    brand_name: str = Field(..., min_length=1, max_length=80)
    official_developer: str = ""
    official_description: str = ""
    limit: int = Field(10, ge=1, le=30)
    country: str = Field("us", min_length=2, max_length=2)


class OfficialAccount(BaseModel):
    platform: str
    username: str


class SocialCandidate(BaseModel):
    platform: str
    username: str
    display_name: str = ""
    bio: str = ""


class SocialScanRequest(BaseModel):
    brand_name: str = Field(..., min_length=1, max_length=80)
    official_accounts: List[OfficialAccount] = []
    candidates: List[SocialCandidate] = Field(..., max_length=200)


@app.get("/health")
def health():
    return {"status": "ONLINE", "service": "detection-service"}


@app.post("/scan/apps")
def scan_google_play(req: AppScanRequest):
    try:
        results = scan_apps(
            brand_name=req.brand_name,
            official_developer=req.official_developer,
            official_description=req.official_description,
            limit=req.limit,
            country=req.country.lower(),
        )
    except Exception as exc:  # scraper/network failures
        raise HTTPException(status_code=502, detail=f"Google Play lookup failed: {exc}")
    return {"results": results}


@app.post("/scan/social")
def scan_social(req: SocialScanRequest):
    brand = {
        "brand_name": req.brand_name,
        "official_accounts": [a.model_dump() for a in req.official_accounts],
    }
    results = [analyze_social_account(brand, c.model_dump()) for c in req.candidates]
    return {"results": results}

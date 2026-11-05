"""
User Preferences & Personalization Router.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime

from backend.database import get_db
from backend.models import UserPreferences
from backend.schemas import UserPreferencesResponse, UserPreferencesUpdate

router = APIRouter(prefix="/api/preferences", tags=["Preferences"])


@router.get("", response_model=UserPreferencesResponse)
def get_preferences(db: Session = Depends(get_db)):
    """Fetch current user personalization preferences."""
    prefs = db.query(UserPreferences).first()
    if not prefs:
        prefs = UserPreferences()
        db.add(prefs)
        db.commit()
        db.refresh(prefs)
    return prefs


@router.put("", response_model=UserPreferencesResponse)
def update_preferences(updates: UserPreferencesUpdate, db: Session = Depends(get_db)):
    """Update personalization settings."""
    prefs = db.query(UserPreferences).first()
    if not prefs:
        prefs = UserPreferences()
        db.add(prefs)

    for field, val in updates.model_dump(exclude_unset=True).items():
        setattr(prefs, field, val)

    prefs.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(prefs)
    return prefs

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models import Farm, User, UserPreference

password = os.environ.get("DEMO_PASSWORD", "")
if len(password) < 10:
    raise SystemExit("Set DEMO_PASSWORD to a local-only password of at least 10 characters.")

with SessionLocal() as db:
    email = "demo@farmshield.local"
    user = db.scalar(select(User).where(User.email == email))
    if user is None:
        user = User(email=email, name="Demo Farmer", password_hash=hash_password(password))
        db.add(user)
        db.flush()
        db.add(UserPreference(user_id=user.id))
        db.add(Farm(owner_id=user.id, name="Demonstration Plot", location="Pune, Maharashtra"))
        db.commit()
        print("Created demo account and farm. No fabricated scan results were added.")
    else:
        print("Demo account already exists; no changes made.")

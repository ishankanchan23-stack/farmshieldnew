import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


def new_id() -> str:
    return str(uuid.uuid4())


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    email: Mapped[str] = mapped_column(String(254), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(100))
    password_hash: Mapped[str] = mapped_column(String(255))
    token_version: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    farms: Mapped[list["Farm"]] = relationship(back_populates="owner", cascade="all, delete-orphan")
    preferences: Mapped["UserPreference | None"] = relationship(back_populates="user", cascade="all, delete-orphan", uselist=False)


class Farm(Base):
    __tablename__ = "farms"
    __table_args__ = (Index("ix_farms_owner_name", "owner_id", "name"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(100))
    location: Mapped[str] = mapped_column(String(160), default="")
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    owner: Mapped[User] = relationship(back_populates="farms")
    crops: Mapped[list["Crop"]] = relationship(back_populates="farm", cascade="all, delete-orphan")
    scans: Mapped[list["Scan"]] = relationship(back_populates="farm")


class Crop(Base):
    __tablename__ = "crops"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    farm_id: Mapped[str] = mapped_column(ForeignKey("farms.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(80), default="Tomato")
    variety: Mapped[str] = mapped_column(String(100), default="")
    planted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    farm: Mapped[Farm] = relationship(back_populates="crops")


class Disease(Base):
    __tablename__ = "diseases"

    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    crop: Mapped[str] = mapped_column(String(80), index=True)
    name: Mapped[str] = mapped_column(String(140))
    scientific_name: Mapped[str] = mapped_column(String(160), default="")
    symptoms: Mapped[str] = mapped_column(Text)
    associated_conditions: Mapped[str] = mapped_column(Text)
    prevention: Mapped[str] = mapped_column(Text)
    next_steps: Mapped[str] = mapped_column(Text)
    source: Mapped[str] = mapped_column(String(300), default="UC IPM tomato pest management guidance")


class Scan(Base):
    __tablename__ = "scans"
    __table_args__ = (Index("ix_scans_user_created", "user_id", "created_at"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    farm_id: Mapped[str | None] = mapped_column(ForeignKey("farms.id", ondelete="SET NULL"), nullable=True, index=True)
    image_path: Mapped[str] = mapped_column(String(500))
    crop: Mapped[str] = mapped_column(String(80), default="Tomato")
    predicted_class: Mapped[str | None] = mapped_column(String(140), nullable=True)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="unavailable")
    model_name: Mapped[str] = mapped_column(String(120), default="unavailable")
    warning: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)
    farm: Mapped[Farm | None] = relationship(back_populates="scans")
    advisories: Mapped[list["Advisory"]] = relationship(back_populates="scan", cascade="all, delete-orphan")


class Advisory(Base):
    __tablename__ = "advisories"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    scan_id: Mapped[str] = mapped_column(ForeignKey("scans.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(160))
    body: Mapped[str] = mapped_column(Text)
    source: Mapped[str] = mapped_column(String(300), default="")
    scan: Mapped[Scan] = relationship(back_populates="advisories")


class WeatherRecord(Base):
    __tablename__ = "weather_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    farm_id: Mapped[str | None] = mapped_column(ForeignKey("farms.id", ondelete="SET NULL"), nullable=True, index=True)
    location: Mapped[str] = mapped_column(String(160))
    source: Mapped[str] = mapped_column(String(80))
    temperature_c: Mapped[float] = mapped_column(Float)
    humidity_pct: Mapped[int] = mapped_column(Integer)
    rainfall_mm: Mapped[float | None] = mapped_column(Float, nullable=True)
    wind_mps: Mapped[float] = mapped_column(Float)
    condition: Mapped[str] = mapped_column(String(100))
    observed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class RiskAlert(Base):
    __tablename__ = "risk_alerts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    farm_id: Mapped[str | None] = mapped_column(ForeignKey("farms.id", ondelete="SET NULL"), nullable=True)
    title: Mapped[str] = mapped_column(String(160))
    explanation: Mapped[str] = mapped_column(Text)
    source: Mapped[str] = mapped_column(String(300))
    observed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(160))
    body: Mapped[str] = mapped_column(Text)
    read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class UserPreference(Base):
    __tablename__ = "user_preferences"
    __table_args__ = (UniqueConstraint("user_id", name="uq_preferences_user"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    language: Mapped[str] = mapped_column(String(8), default="en")
    theme: Mapped[str] = mapped_column(String(12), default="light")
    units: Mapped[str] = mapped_column(String(12), default="metric")
    user: Mapped[User] = relationship(back_populates="preferences")

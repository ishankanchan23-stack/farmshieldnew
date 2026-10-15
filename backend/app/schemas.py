from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class RegisterIn(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=10, max_length=128)


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    email: EmailStr
    name: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class FarmIn(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    location: str = Field(default="", max_length=160)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)


class FarmPatch(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=100)
    location: str | None = Field(default=None, max_length=160)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)


class FarmOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    location: str
    latitude: float | None
    longitude: float | None


class CropIn(BaseModel):
    farm_id: str
    name: str = Field(min_length=2, max_length=80)
    variety: str = Field(default="", max_length=100)


class CropOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    farm_id: str
    name: str
    variety: str


class ScanOut(BaseModel):
    id: str
    farm_id: str | None
    crop: str
    predicted_class: str | None
    confidence: float | None
    status: str
    model_name: str
    warning: str
    image_url: str
    created_at: datetime
    disease: dict | None = None


class PreferencePatch(BaseModel):
    language: str | None = Field(default=None, pattern="^(en|hi|mr)$")
    theme: str | None = Field(default=None, pattern="^(light|dark)$")
    units: str | None = Field(default=None, pattern="^(metric|imperial)$")


class PreferenceOut(BaseModel):
    language: str
    theme: str
    units: str


class PageOut(BaseModel):
    items: list[dict]
    total: int
    page: int
    page_size: int

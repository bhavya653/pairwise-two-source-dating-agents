from pydantic import BaseModel, Field, HttpUrl, ConfigDict
from typing import Optional

class PersonCreate(BaseModel):
    display_name: str = Field(min_length=1, max_length=120)
    linkedin_url: HttpUrl
    instagram_url: HttpUrl
    linkedin_notes: str = Field(default="", max_length=12000)
    instagram_notes: str = Field(default="", max_length=12000)
    consent_confirmed: bool = False

class PersonOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    display_name: str
    linkedin_url: str
    instagram_url: str
    linkedin_notes: str
    instagram_notes: str
    consent_confirmed: bool

class ProfileOut(BaseModel):
    person_id: int
    display_name: str
    linkedin_url: str
    instagram_url: str
    interests: list[str]
    hobbies: list[str]
    stated_preferences: list[str]
    evidence: list[dict]
    limitations: list[str]

class RankingItem(BaseModel):
    person_id: int
    display_name: str
    score: int
    shared_interests: list[str]
    explanation: str

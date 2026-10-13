from sqlalchemy import Boolean, Integer, String, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .database import Base

class Person(Base):
    __tablename__ = "people"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    display_name: Mapped[str] = mapped_column(String(120), nullable=False)
    linkedin_url: Mapped[str] = mapped_column(String(500), nullable=False)
    instagram_url: Mapped[str] = mapped_column(String(500), nullable=False)
    linkedin_notes: Mapped[str] = mapped_column(Text, default="")
    instagram_notes: Mapped[str] = mapped_column(Text, default="")
    consent_confirmed: Mapped[bool] = mapped_column(Boolean, default=False)
    agent: Mapped["Agent"] = relationship(back_populates="person", uselist=False, cascade="all, delete-orphan")

class Agent(Base):
    __tablename__ = "agents"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    person_id: Mapped[int] = mapped_column(ForeignKey("people.id"), unique=True)
    profile_json: Mapped[str] = mapped_column(Text, default="{}")
    person: Mapped[Person] = relationship(back_populates="agent")

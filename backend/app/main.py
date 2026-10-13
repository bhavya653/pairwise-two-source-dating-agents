import json
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from .database import Base, engine, get_db
from .models import Person, Agent
from .schemas import PersonCreate, PersonOut, ProfileOut, RankingItem
from .analysis import extract_profile, make_rankings

Base.metadata.create_all(bind=engine)
app = FastAPI(title="Two-Source Dating Agents API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Demo deployment; restrict to your frontend URL before production.
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_profile_map(db: Session):
    out = {}
    for agent in db.query(Agent).all():
        try:
            out[agent.person_id] = json.loads(agent.profile_json or "{}")
        except json.JSONDecodeError:
            out[agent.person_id] = {}
    return out

@app.get("/api/health")
def health():
    return {"status": "ok", "source_policy": ["LinkedIn", "Instagram"]}

@app.get("/api/people", response_model=list[PersonOut])
def list_people(db: Session = Depends(get_db)):
    return db.query(Person).order_by(Person.id.desc()).all()

@app.post("/api/people", response_model=PersonOut, status_code=201)
def create_person(payload: PersonCreate, db: Session = Depends(get_db)):
    if not payload.consent_confirmed:
        raise HTTPException(400, "Confirm that this person has agreed to participate before adding them.")
    if payload.linkedin_url.host and "linkedin.com" not in payload.linkedin_url.host.lower():
        raise HTTPException(400, "LinkedIn URL must be on linkedin.com.")
    if payload.instagram_url.host and "instagram.com" not in payload.instagram_url.host.lower():
        raise HTTPException(400, "Instagram URL must be on instagram.com.")
    person = Person(
        display_name=payload.display_name.strip(),
        linkedin_url=str(payload.linkedin_url),
        instagram_url=str(payload.instagram_url),
        linkedin_notes=payload.linkedin_notes.strip(),
        instagram_notes=payload.instagram_notes.strip(),
        consent_confirmed=payload.consent_confirmed,
    )
    db.add(person)
    db.commit()
    db.refresh(person)
    db.add(Agent(person_id=person.id, profile_json="{}"))
    db.commit()
    return person

@app.delete("/api/people/{person_id}")
def delete_person(person_id: int, db: Session = Depends(get_db)):
    person = db.query(Person).filter(Person.id == person_id).first()
    if not person:
        raise HTTPException(404, "Person not found")
    db.delete(person)
    db.commit()
    return {"deleted": True, "person_id": person_id}

@app.post("/api/agents/{person_id}/analyze", response_model=ProfileOut)
def analyze_person(person_id: int, db: Session = Depends(get_db)):
    person = db.query(Person).filter(Person.id == person_id).first()
    if not person:
        raise HTTPException(404, "Person not found")
    if not person.consent_confirmed:
        raise HTTPException(400, "Participant consent is required.")
    profile = extract_profile(person)
    agent = db.query(Agent).filter(Agent.person_id == person_id).first()
    if not agent:
        agent = Agent(person_id=person_id)
        db.add(agent)
    agent.profile_json = json.dumps(profile)
    db.commit()
    return ProfileOut(
        person_id=person.id,
        display_name=person.display_name,
        linkedin_url=person.linkedin_url,
        instagram_url=person.instagram_url,
        **profile
    )

@app.get("/api/agents/{person_id}/profile", response_model=ProfileOut)
def get_profile(person_id: int, db: Session = Depends(get_db)):
    person = db.query(Person).filter(Person.id == person_id).first()
    if not person:
        raise HTTPException(404, "Person not found")
    agent = db.query(Agent).filter(Agent.person_id == person_id).first()
    profile = json.loads(agent.profile_json or "{}") if agent else {}
    if not profile:
        profile = extract_profile(person)
    return ProfileOut(
        person_id=person.id,
        display_name=person.display_name,
        linkedin_url=person.linkedin_url,
        instagram_url=person.instagram_url,
        **profile
    )

@app.get("/api/agents/{person_id}/rankings", response_model=list[RankingItem])
def rankings(person_id: int, db: Session = Depends(get_db)):
    people = db.query(Person).order_by(Person.id).all()
    target = next((p for p in people if p.id == person_id), None)
    if not target:
        raise HTTPException(404, "Person not found")
    if len(people) < 2:
        raise HTTPException(400, "Add at least two participants to create rankings.")
    profiles = get_profile_map(db)
    if person_id not in profiles or not profiles[person_id]:
        target_profile = extract_profile(target)
        profiles[person_id] = target_profile
        agent = db.query(Agent).filter(Agent.person_id == person_id).first()
        if agent:
            agent.profile_json = json.dumps(target_profile)
            db.commit()
    # Create baseline profiles for candidates that have not yet been analyzed.
    for p in people:
        if p.id not in profiles or not profiles[p.id]:
            profiles[p.id] = extract_profile(p)
    others = [p for p in people if p.id != person_id]
    return make_rankings(target, others, profiles)

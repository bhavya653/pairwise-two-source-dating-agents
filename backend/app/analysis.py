import re
from collections import Counter

# Deliberately simple baseline. These are keywords, not psychological conclusions.
KEYWORDS = {
    "technology": ["technology", "software", "coding", "programming", "ai", "artificial intelligence", "developer"],
    "travel": ["travel", "travelling", "traveling", "hiking", "trek", "explore"],
    "fitness": ["fitness", "gym", "workout", "running", "yoga", "sports"],
    "music": ["music", "guitar", "singing", "concert", "piano"],
    "food": ["cooking", "food", "baking", "restaurants", "cuisine"],
    "reading": ["reading", "books", "book club", "literature"],
    "art": ["art", "painting", "photography", "design", "drawing"],
    "entrepreneurship": ["startup", "entrepreneur", "founder", "business", "building a company"],
    "nature": ["nature", "camping", "outdoors", "wildlife", "gardening"],
    "movies": ["movies", "films", "cinema", "series", "film"],
    "volunteering": ["volunteer", "community service", "nonprofit", "social impact"],
    "gaming": ["gaming", "video games", "board games", "chess"],
}

HOBBY_TERMS = {
    "travel", "fitness", "music", "food", "reading", "art", "nature", "movies", "gaming", "volunteering"
}

def extract_profile(person):
    sources = [
        ("LinkedIn", person.linkedin_notes or "", person.linkedin_url),
        ("Instagram", person.instagram_notes or "", person.instagram_url),
    ]
    combined = " ".join(note.lower() for _, note, _ in sources)
    interests = sorted([
        key for key, terms in KEYWORDS.items()
        if any(term in combined for term in terms)
    ])
    hobbies = sorted([i for i in interests if i in HOBBY_TERMS])
    # Only extract preferences when the person explicitly labels them as preferences.
    stated_preferences = []
    for _, note, _ in sources:
        for line in note.splitlines():
            low = line.lower().strip()
            if low.startswith(("looking for:", "relationship preference:", "dating preference:", "ideal match:")):
                stated_preferences.append(line.split(":", 1)[1].strip())
    evidence = []
    for source_name, note, url in sources:
        for interest in interests:
            terms = KEYWORDS[interest]
            found = next((t for t in terms if t in note.lower()), None)
            if found:
                evidence.append({
                    "source": source_name,
                    "url": url,
                    "supports": interest,
                    "matched_text": found,
                    "note": "Keyword appears in the source notes supplied by the project operator."
                })
    return {
        "interests": interests,
        "hobbies": hobbies,
        "stated_preferences": stated_preferences,
        "evidence": evidence,
        "limitations": [
            "This is a keyword-based summary of notes supplied by the operator, not a complete reading of either profile.",
            "No romantic preference is inferred unless explicitly stated in the supplied source notes.",
            "Missing information means unknown, not lack of interest."
        ]
    }

def make_rankings(target, others, profiles):
    target_profile = profiles.get(target.id, {})
    target_interests = set(target_profile.get("interests", []))
    target_prefs = " ".join(target_profile.get("stated_preferences", [])).lower()
    results = []
    for candidate in others:
        candidate_profile = profiles.get(candidate.id, {})
        candidate_interests = set(candidate_profile.get("interests", []))
        shared = sorted(target_interests & candidate_interests)
        # Transparent baseline: shared tags only; do not guess demographics or attraction.
        score = min(100, round((len(shared) / max(1, len(target_interests | candidate_interests))) * 100))
        if not target_interests and not candidate_interests:
            score = 0
        if shared:
            explanation = "Shared publicly described interests: " + ", ".join(shared) + "."
        else:
            explanation = "No overlapping interests were identified in the supplied notes; this does not mean the people are incompatible."
        if not target_interests or not candidate_interests:
            explanation += " Evidence is limited because one or both profiles have few extracted interests."
        results.append({
            "person_id": candidate.id,
            "display_name": candidate.display_name,
            "score": score,
            "shared_interests": shared,
            "explanation": explanation
        })
    return sorted(results, key=lambda x: (-x["score"], x["display_name"].lower()))

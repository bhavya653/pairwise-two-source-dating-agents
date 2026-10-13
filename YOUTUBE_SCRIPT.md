# Ready-to-read YouTube demo script (about 2–3 minutes)

Hi everyone. This is Pairwise, a multi-agent dating and compatibility prototype built with React, FastAPI, Python, and SQLite.

The core idea is that each participant is represented by an agent. The project follows a strict two-source rule: each participant has a public LinkedIn profile and a public Instagram profile. In this prototype, the source information is entered as separate notes by the operator. The application does not scrape either platform or use other sources.

First, this is the participants dashboard. Each participant record contains their display name, LinkedIn URL, Instagram URL, and a dedicated agent record. The system requires confirmation that the participant has agreed to take part.

Next, I can open a participant and see their agent profile. The profile extracts interest and hobby keywords from the supplied source notes. Each extracted signal includes the source name and a link back to the corresponding profile, so the output is easier to audit.

The next part is compatibility ranking. Each agent ranks the other participants. The current prototype calculates a transparent score based on the overlap between extracted interest tags, and it provides a short explanation for each result. A low score does not mean two people are incompatible; it can simply mean the source notes contain limited overlapping information.

One important limitation is that this version uses a baseline keyword-based algorithm. It is not yet a fully autonomous large-language-model agent, and it does not infer private romantic preferences. The scores are only illustrative estimates and are not facts about attraction or consent.

The technology stack is React and Vite for the frontend, FastAPI for the backend, and SQLite for local data storage. The next steps would be to add a carefully constrained LLM analysis layer, improve evidence validation, add authentication and consent withdrawal, and move to persistent managed storage before a production deployment.

That is the overview of Pairwise. Thank you for watching.

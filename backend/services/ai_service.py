"""
services/ai_service.py — Groq AI Email Generation
Reads user's groq_api_key from their profile, falls back to GROQ_API_KEY from config.
"""
import json, hashlib, random
from groq import Groq
from config import GROQ_API_KEY

_cache: dict = {}


def _cache_key(company: str, name: str) -> str:
    return hashlib.md5(f"{company.lower()}|{name.lower()}".encode()).hexdigest()


def _client(user) -> Groq:
    key = user.groq_api_key or GROQ_API_KEY
    if not key:
        raise RuntimeError("No Groq API key. Add GROQ_API_KEY to .env or set it in your profile.")
    return Groq(api_key=key)


def generate_email_for_lead(lead, user) -> tuple[str, str]:
    company  = (lead.company or "").strip().rstrip(",")
    name     = lead.name or "Hiring Manager"
    industry = lead.industry or "Technology"
    ck       = _cache_key(company, name)
    if ck in _cache:
        return _cache[ck]["subject"], _cache[ck]["body"]

    prompt = f"""Write a cold outreach email in FIRST PERSON only.

SENDER:
Name: {user.sender_name}
Role: {user.sender_role or "Professional"}
Background: {user.sender_profile or "Software professional seeking opportunities"}

RECIPIENT: {name} at {company} ({industry})

STRICT 3-PARAGRAPH STRUCTURE:
Para 1 (1-2 sentences): Something specific and impressive about {company}. Start with the company name, not "I".
Para 2 (2-3 sentences): How MY specific skills match what {company} does. Use "I/my/me". No project names. Mention concrete tech or skills.
Para 3 (1 sentence): Confident CTA — invite a call, mention attached CV.

RULES:
- First person throughout
- 100-120 words total
- No buzzwords
- Do NOT start with "I hope this email finds you well"
- No "I am writing to..."

Signature block:
Best regards,
{user.sender_name}
{user.sender_email or ""}
{user.sender_phone or ""}
{user.sender_linkedin or ""}

Return ONLY valid JSON, nothing else:
{{"subject": "...", "body": "Dear {name},\\n\\n[para1]\\n\\n[para2]\\n\\n[para3]\\n\\nBest regards,\\n{user.sender_name}\\n{user.sender_email or ''}\\n{user.sender_phone or ''}\\n{user.sender_linkedin or ''}"}}"""

    try:
        resp   = _client(user).chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.85, max_tokens=600,
        )
        raw = resp.choices[0].message.content.strip()
        if "```" in raw:
            raw = raw.split("```")[1].lstrip("json").strip()
        parsed  = json.loads(raw)
        subject = parsed["subject"].strip()
        body    = parsed["body"].strip()
        _cache[ck] = {"subject": subject, "body": body}
        return subject, body
    except Exception as e:
        print(f"[AI] Error: {e}")
        return _fallback_email(lead, user)


def generate_followup_for_lead(lead, user) -> tuple[str, str]:
    company = (lead.company or "").strip().rstrip(",")
    name    = lead.name or "Hiring Manager"

    prompt = f"""Write a SHORT follow-up cold email (60-80 words). First person.
Sender is {user.sender_name}, sent initial email 5 days ago to {name} at {company}.
Reference previous email naturally. Not desperate. One soft CTA. Mention CV is still attached.

Return ONLY valid JSON:
{{"subject": "...", "body": "Dear {name},\\n\\n[body]\\n\\nBest regards,\\n{user.sender_name}\\n{user.sender_email or ''}"}}"""

    try:
        resp   = _client(user).chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.8, max_tokens=300,
        )
        raw = resp.choices[0].message.content.strip()
        if "```" in raw:
            raw = raw.split("```")[1].lstrip("json").strip()
        parsed = json.loads(raw)
        return parsed["subject"].strip(), parsed["body"].strip()
    except Exception as e:
        print(f"[AI Follow-up] Error: {e}")
        return _fallback_followup(lead, user)


def _fallback_email(lead, user) -> tuple[str, str]:
    company  = (lead.company or "").strip().rstrip(",")
    name     = lead.name or "Hiring Manager"
    industry = lead.industry or "Technology"
    body = (
        f"Dear {name},\n\n"
        f"{company}'s work in the {industry} space stood out to me.\n\n"
        f"My background in {user.sender_role or 'software development'} maps well to what {company} builds. "
        f"I bring a combination of technical depth and delivery experience that I believe would add real value to your team.\n\n"
        f"My CV is attached — I'd welcome a quick call to explore any potential fit.\n\n"
        f"Best regards,\n{user.sender_name}\n{user.sender_email or ''}\n{user.sender_phone or ''}\n{user.sender_linkedin or ''}"
    )
    subjects = [f"Exploring Roles at {company}", f"Interested in {company}"]
    return random.choice(subjects), body


def _fallback_followup(lead, user) -> tuple[str, str]:
    company = (lead.company or "").strip().rstrip(",")
    name    = lead.name or "Hiring Manager"
    body = (
        f"Dear {name},\n\n"
        f"Just following up on my email from last week about opportunities at {company}. "
        f"Happy to keep this brief — my CV is still attached if helpful. "
        f"Would a short call work this week?\n\n"
        f"Best regards,\n{user.sender_name}\n{user.sender_email or ''}"
    )
    return f"Following up — {company}", body

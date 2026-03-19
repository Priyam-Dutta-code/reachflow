"""
services/ai_service.py - Groq-powered cold email generation with career and business modes.
"""

import hashlib
import json
import random

from groq import Groq

from config import GROQ_API_KEY
from security import secret_manager

_cache: dict = {}

CAREER_SOURCES = {"linkedin_jobs", "naukri", "indeed"}
CAREER_HINTS = {"careers", "jobs", "hiring", "talent", "hr", "recruiting"}


def _cache_key(lead, user_id: str, mode: str) -> str:
    payload = "|".join(
        [
            user_id,
            mode,
            (lead.company or "").lower(),
            (lead.name or "").lower(),
            (lead.title or "").lower(),
            (lead.email or "").lower(),
            str(getattr(lead, "source", "")),
        ]
    )
    return hashlib.md5(payload.encode("utf-8")).hexdigest()


def _client(user) -> Groq:
    key = ""
    if user.groq_api_key:
        key = secret_manager.decrypt(user.groq_api_key)
    key = key or GROQ_API_KEY
    if not key:
        raise RuntimeError("No Groq API key. Add GROQ_API_KEY to the backend or set it in your profile.")
    return Groq(api_key=key)


def _sender_name(user) -> str:
    return user.sender_name or user.name or (user.email.split("@")[0] if user.email else "ReachFlow User")


def _sender_role(user) -> str:
    return user.sender_role or "Growth Operator"


def _sender_profile(user) -> str:
    return user.sender_profile or "A credible operator who values specific, respectful outreach and measurable business outcomes."


def _source_value(lead) -> str:
    source = getattr(lead, "source", "")
    return source.value if hasattr(source, "value") else str(source or "")


def _outreach_mode(lead) -> str:
    source = _source_value(lead)
    if source in CAREER_SOURCES:
        return "career"

    local = (lead.email or "").split("@", 1)[0].lower()
    if any(hint in local for hint in CAREER_HINTS):
        return "career"

    title = (lead.title or "").lower()
    if any(hint in title for hint in CAREER_HINTS):
        return "career"

    return "business"


def _subject_company(lead) -> str:
    return (getattr(lead, "company", "") or "your team").strip().rstrip(",")


def _contact_name(lead, mode: str) -> str:
    fallback = "Hiring Team" if mode == "career" else "Growth Team"
    return getattr(lead, "name", "") or fallback


def _signature(user) -> str:
    lines = ["Best regards,", _sender_name(user)]
    if user.sender_email:
        lines.append(user.sender_email)
    if user.sender_phone:
        lines.append(user.sender_phone)
    if user.sender_linkedin:
        lines.append(user.sender_linkedin)
    return "\\n".join(lines)


def _career_prompt(lead, user) -> str:
    company = _subject_company(lead)
    contact = _contact_name(lead, "career")
    role_focus = lead.title or lead.industry or "open roles"

    return f"""Write a polished cold outreach email for a candidate contacting a hiring team.

SENDER
Name: {_sender_name(user)}
Role / positioning: {_sender_role(user)}
Background: {_sender_profile(user)}

RECIPIENT
Contact: {contact}
Company: {company}
Role or hiring signal: {role_focus}

GOAL
- Sound credible, specific, and professional
- Show fit without sounding desperate
- Ask for a short next step

RULES
- Subject line must be 4 to 8 words, professional, no hype, no emojis
- Body must be 95 to 135 words
- Use 3 short paragraphs
- Mention one concrete reason the company or role is relevant
- Mention how the sender can contribute
- Close with a low-friction CTA
- Make the email feel written by a thoughtful professional, not a template
- Never use: \"I hope this email finds you well\", \"I am writing to\", or exclamation marks

Return ONLY valid JSON:
{{"subject":"...","body":"Dear {contact},\\n\\n...\\n\\n...\\n\\n...\\n\\n{_signature(user)}"}}"""


def _business_prompt(lead, user) -> str:
    company = _subject_company(lead)
    contact = _contact_name(lead, "business")
    context_bits = [
        getattr(lead, "title", "") or "",
        getattr(lead, "industry", "") or "",
        getattr(lead, "location", "") or "",
        getattr(lead, "website", "") or "",
    ]
    context = ", ".join(bit for bit in context_bits if bit)

    return f"""Write a concise, premium cold email for outbound business development.

SENDER
Name: {_sender_name(user)}
Role / offer: {_sender_role(user)}
Business context: {_sender_profile(user)}

RECIPIENT
Contact: {contact}
Company: {company}
Known context: {context or "No extra context"}

GOAL
- Start a relevant business conversation
- Show a believable reason for reaching out
- Make the value proposition clear without sounding templated

RULES
- Subject line must be 3 to 7 words, professional, calm, and specific
- Body must be 85 to 125 words
- Use 2 or 3 short paragraphs
- Lead with a relevant observation or reason for the outreach
- Make one clear value proposition
- End with one low-friction CTA
- Keep the wording commercially sharp, natural, and human
- Never use: \"I hope this email finds you well\", \"just checking in\", \"revolutionary\", or exclamation marks

Return ONLY valid JSON:
{{"subject":"...","body":"Dear {contact},\\n\\n...\\n\\n...\\n\\n...\\n\\n{_signature(user)}"}}"""


def generate_email_for_lead(lead, user) -> tuple[str, str]:
    mode = _outreach_mode(lead)
    ck = _cache_key(lead, user.id, mode)
    if ck in _cache:
        return _cache[ck]["subject"], _cache[ck]["body"]

    prompt = _career_prompt(lead, user) if mode == "career" else _business_prompt(lead, user)

    try:
        response = _client(user).chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.75,
            max_tokens=500,
        )
        raw = response.choices[0].message.content.strip()
        if "```" in raw:
            raw = raw.split("```")[1].lstrip("json").strip()
        parsed = json.loads(raw)
        subject = parsed["subject"].strip()
        body = parsed["body"].strip()
        _cache[ck] = {"subject": subject, "body": body}
        return subject, body
    except Exception as exc:
        print(f"[AI] Error: {exc}")
        return _fallback_email(lead, user, mode)


def generate_followup_for_lead(lead, user) -> tuple[str, str]:
    mode = _outreach_mode(lead)
    company = _subject_company(lead)
    contact = _contact_name(lead, mode)

    if mode == "career":
        prompt = f"""Write a professional follow-up email for a candidate who emailed {contact} at {company} a few days ago.

Rules:
- 60 to 85 words
- Calm, confident tone
- Mention the earlier note naturally
- One soft CTA
- No desperation, no exclamation marks

Return ONLY valid JSON:
{{"subject":"...","body":"Dear {contact},\\n\\n...\\n\\n{_signature(user)}"}}"""
    else:
        prompt = f"""Write a professional business-development follow-up email to {contact} at {company}.

Rules:
- 55 to 80 words
- Reference the previous note naturally
- Restate value in one line
- End with one low-friction CTA
- No hype, no exclamation marks

Return ONLY valid JSON:
{{"subject":"...","body":"Dear {contact},\\n\\n...\\n\\n{_signature(user)}"}}"""

    try:
        response = _client(user).chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=280,
        )
        raw = response.choices[0].message.content.strip()
        if "```" in raw:
            raw = raw.split("```")[1].lstrip("json").strip()
        parsed = json.loads(raw)
        return parsed["subject"].strip(), parsed["body"].strip()
    except Exception as exc:
        print(f"[AI Follow-up] Error: {exc}")
        return _fallback_followup(lead, user, mode)


def _fallback_email(lead, user, mode: str) -> tuple[str, str]:
    company = _subject_company(lead)
    contact = _contact_name(lead, mode)
    sender_name = _sender_name(user)
    sender_role = _sender_role(user)
    signature = _signature(user).replace("\\n", "\n")

    if mode == "career":
        subjects = [
            f"Interest in opportunities at {company}",
            f"Profile fit for {company}",
            f"Application note for {company}",
        ]
        body = (
            f"Dear {contact},\n\n"
            f"I reached out because {company} looks closely aligned with the kind of work I do best in {sender_role.lower()}. Rather than apply anonymously and hope for visibility, I wanted to introduce myself directly.\n\n"
            f"My background combines hands-on execution, clear ownership, and the ability to contribute quickly in fast-moving teams. If there is a relevant opening, I would be glad to share a concise profile or work sample.\n\n"
            f"Would you be open to pointing me to the right next step or the appropriate person on your team?\n\n"
            f"{signature}"
        )
        return random.choice(subjects), body

    subjects = [
        f"A thought for {company}",
        f"Idea for {company}",
        f"Brief note for {company}",
    ]
    body = (
        f"Dear {contact},\n\n"
        f"I came across {company} while reviewing teams in this space and thought there may be a relevant fit with the work I do in {sender_role.lower()}.\n\n"
        f"My focus is on practical execution rather than generic outreach, and I would be happy to send a short idea tailored to the current priorities at {company} if that would be useful.\n\n"
        f"Would it make sense for me to send a concise note with the angle I have in mind?\n\n"
        f"{signature}"
    )
    return random.choice(subjects), body


def _fallback_followup(lead, user, mode: str) -> tuple[str, str]:
    company = _subject_company(lead)
    contact = _contact_name(lead, mode)
    signature = _signature(user).replace("\\n", "\n")

    if mode == "career":
        body = (
            f"Dear {contact},\n\n"
            f"I wanted to follow up on my earlier note regarding opportunities at {company}. If there is a relevant opening or a better person to speak with, I would appreciate a quick pointer.\n\n"
            f"{signature}"
        )
        return f"Following up on {company}", body

    body = (
        f"Dear {contact},\n\n"
        f"Following up on my earlier note in case the timing is better now. If helpful, I can send a concise idea tailored to the current priorities at {company}.\n\n"
        f"{signature}"
    )
    return f"Following up with {company}", body

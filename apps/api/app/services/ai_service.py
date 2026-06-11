"""Vertical-aware cold-email drafting — PORTED from V1 with Phase 4 hardening.

Kept: per-user Groq key (decrypted) with global fallback, the five vertical
prompt families, deterministic fallback templates when the LLM fails.
New: bounded cache, model fallback (the 70B free tier is 1K req/day as of
June 2026 — fall back to 8B-instant on rate limits), subjects clamped <60 chars.

Note on signatures: prompts embed the signature with literal ``\\n`` escapes
because it sits inside a JSON example the model must reproduce; json.loads
turns them into real newlines. Fallback templates use real newlines directly.
"""
import hashlib
import json
import logging
import random
from collections import OrderedDict

from app.core.security import get_secret_manager
from app.core.settings import get_settings

logger = logging.getLogger("reachflow.ai")

PRIMARY_MODEL = "llama-3.3-70b-versatile"
FALLBACK_MODEL = "llama-3.1-8b-instant"
CACHE_MAX = 2000

_cache: OrderedDict[str, dict] = OrderedDict()

CAREER_SOURCES = {"linkedin_jobs", "naukri", "indeed"}
CAREER_HINTS = {"careers", "jobs", "hiring", "talent", "hr", "recruiting"}


def _cache_put(key: str, value: dict) -> None:
    _cache[key] = value
    _cache.move_to_end(key)
    while len(_cache) > CACHE_MAX:
        _cache.popitem(last=False)


def _user_vertical(user) -> str:
    return getattr(user, "vertical", "business_growth") or "business_growth"


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


def _client(user):
    from groq import Groq

    key = ""
    if user.groq_api_key:
        key = get_secret_manager().decrypt(user.groq_api_key)
    key = key or get_settings().groq_api_key
    if not key:
        raise RuntimeError("No Groq API key. Add GROQ_API_KEY to the backend or set it in your profile.")
    return Groq(api_key=key)


def _chat(client, prompt: str, temperature: float, max_tokens: int) -> str:
    """Primary model with automatic fallback on rate limiting."""
    for model in (PRIMARY_MODEL, FALLBACK_MODEL):
        try:
            response = client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                temperature=temperature,
                max_tokens=max_tokens,
            )
            return response.choices[0].message.content.strip()
        except Exception as exc:
            message = str(exc).lower()
            retriable = "rate limit" in message or "429" in message or "quota" in message
            if model == PRIMARY_MODEL and retriable:
                logger.info("primary model rate-limited; falling back to %s", FALLBACK_MODEL)
                continue
            raise
    raise RuntimeError("All models unavailable")


def _parse_draft(raw: str) -> tuple[str, str]:
    if "```" in raw:
        raw = raw.split("```")[1].lstrip("json").strip()
    parsed = json.loads(raw)
    subject = parsed["subject"].strip()[:59]  # subjects < 60 chars
    body = parsed["body"].strip()
    return subject, body


def _sender_name(user) -> str:
    return user.sender_name or user.name or (user.email.split("@")[0] if user.email else "ReachFlow User")


def _sender_role(user) -> str:
    return user.sender_role or "Operator"


def _sender_profile(user) -> str:
    return user.sender_profile or "A thoughtful operator who values specific, respectful outreach with clear outcomes."


def _source_value(lead) -> str:
    source = getattr(lead, "source", "")
    return source.value if hasattr(source, "value") else str(source or "")


def _outreach_mode(lead, user) -> str:
    vertical = _user_vertical(user)
    if vertical in {"job_seeker", "recruiter", "agency", "business_growth", "partnerships"}:
        return vertical

    source = _source_value(lead)
    if source in CAREER_SOURCES:
        return "job_seeker"

    local = (lead.email or "").split("@", 1)[0].lower()
    if any(hint in local for hint in CAREER_HINTS):
        return "job_seeker"

    title = (lead.title or "").lower()
    if any(hint in title for hint in CAREER_HINTS):
        return "job_seeker"

    return "business_growth"


def _subject_company(lead) -> str:
    return (getattr(lead, "company", "") or "your team").strip().rstrip(",")


def _contact_name(lead, mode: str) -> str:
    fallbacks = {
        "job_seeker": "Hiring Team",
        "recruiter": "Hiring Team",
        "agency": "Growth Team",
        "business_growth": "Growth Team",
        "partnerships": "Partnership Team",
    }
    return getattr(lead, "name", "") or fallbacks.get(mode, "Team")


def _signature(user) -> str:
    lines = ["Best regards,", _sender_name(user)]
    if user.sender_role:
        lines.append(user.sender_role)
    if user.sender_email:
        lines.append(user.sender_email)
    if user.sender_phone:
        lines.append(user.sender_phone)
    if user.sender_linkedin:
        lines.append(user.sender_linkedin)
    return "\\n".join(lines)  # \n escapes for the JSON example in prompts


def _context(lead) -> str:
    bits = [
        getattr(lead, "title", "") or "",
        getattr(lead, "industry", "") or "",
        getattr(lead, "location", "") or "",
        getattr(lead, "website", "") or "",
        getattr(lead, "notes", "") or "",
    ]
    return ", ".join(bit for bit in bits if bit)


def _job_seeker_prompt(lead, user) -> str:
    contact = _contact_name(lead, "job_seeker")
    company = _subject_company(lead)
    role_focus = lead.title or lead.industry or "open roles"
    return f"""Write a professional candidate outreach email for a job seeker contacting a hiring team.

SENDER
Name: {_sender_name(user)}
Role / profile: {_sender_role(user)}
Background: {_sender_profile(user)}

RECIPIENT
Contact: {contact}
Company: {company}
Hiring signal: {role_focus}
Context: {_context(lead) or "No extra context"}

GOAL
- Sound credible, capable, and calm
- Show a specific fit for the company or role
- Ask for the right next step without sounding desperate

RULES
- Subject must be 4 to 7 words, under 60 characters, professional, and specific
- Body must be 95 to 135 words of plain text
- Use 3 short paragraphs
- Reference one believable reason this company or role is relevant
- Highlight one or two useful strengths, not a full biography
- End with a low-friction CTA
- Never use: "I hope this email finds you well", "I am writing to", "urgent", "limited time", "act now", or exclamation marks

Return ONLY valid JSON:
{{"subject":"...","body":"Dear {contact},\\n\\n...\\n\\n...\\n\\n...\\n\\n{_signature(user)}"}}"""


def _recruiter_prompt(lead, user) -> str:
    contact = _contact_name(lead, "recruiter")
    company = _subject_company(lead)
    return f"""Write a polished recruiter outreach email to a hiring company.

SENDER
Name: {_sender_name(user)}
Role / offer: {_sender_role(user)}
Recruiting context: {_sender_profile(user)}

RECIPIENT
Contact: {contact}
Company: {company}
Context: {_context(lead) or "No extra context"}

GOAL
- Open a recruiting conversation with a hiring company
- Position the sender as useful, not pushy
- Make the next step easy

RULES
- Subject must be 3 to 6 words, under 60 characters, executive, and specific
- Body must be 85 to 120 words of plain text
- Use 2 or 3 short paragraphs
- Mention a credible hiring signal or market angle
- Present one concise value proposition tied to recruiting outcomes
- End with a low-friction CTA
- Never use hype, emojis, "free", "guarantee", or exclamation marks

Return ONLY valid JSON:
{{"subject":"...","body":"Dear {contact},\\n\\n...\\n\\n...\\n\\n...\\n\\n{_signature(user)}"}}"""


def _agency_prompt(lead, user) -> str:
    contact = _contact_name(lead, "agency")
    company = _subject_company(lead)
    return f"""Write a premium agency outbound email to a prospective client.

SENDER
Name: {_sender_name(user)}
Role / offer: {_sender_role(user)}
Agency context: {_sender_profile(user)}

RECIPIENT
Contact: {contact}
Company: {company}
Context: {_context(lead) or "No extra context"}

GOAL
- Start a believable client-acquisition conversation
- Show relevance without over-claiming
- Offer one practical next step

RULES
- Subject must be 3 to 6 words, under 60 characters, polished and commercial
- Body must be 85 to 120 words of plain text
- Use 2 or 3 short paragraphs
- Lead with a relevant observation about the company or market
- Present one clear service-led value proposition
- End with one soft CTA
- Never use buzzwords like "revolutionary", "synergy", "free", "guarantee", or exclamation marks

Return ONLY valid JSON:
{{"subject":"...","body":"Dear {contact},\\n\\n...\\n\\n...\\n\\n...\\n\\n{_signature(user)}"}}"""


def _growth_prompt(lead, user) -> str:
    contact = _contact_name(lead, "business_growth")
    company = _subject_company(lead)
    return f"""Write a commercially sharp cold email for growth or outbound sales.

SENDER
Name: {_sender_name(user)}
Role / offer: {_sender_role(user)}
Business context: {_sender_profile(user)}

RECIPIENT
Contact: {contact}
Company: {company}
Context: {_context(lead) or "No extra context"}

GOAL
- Start a relevant business conversation
- Show why the outreach is timely
- Make the value proposition clear and believable

RULES
- Subject must be 3 to 6 words, under 60 characters, specific and professional
- Body must be 80 to 115 words of plain text
- Use 2 or 3 short paragraphs
- Open with one concrete observation or angle
- State one clear business value proposition
- End with a low-friction CTA
- Never use "just checking in", "game-changing", "free", "guarantee", or exclamation marks

Return ONLY valid JSON:
{{"subject":"...","body":"Dear {contact},\\n\\n...\\n\\n...\\n\\n...\\n\\n{_signature(user)}"}}"""


def _partnership_prompt(lead, user) -> str:
    contact = _contact_name(lead, "partnerships")
    company = _subject_company(lead)
    return f"""Write a professional partnership outreach email.

SENDER
Name: {_sender_name(user)}
Role / offer: {_sender_role(user)}
Partnership context: {_sender_profile(user)}

RECIPIENT
Contact: {contact}
Company: {company}
Context: {_context(lead) or "No extra context"}

GOAL
- Open a strategic partnership or channel conversation
- Sound thoughtful and commercially aware
- Suggest a simple next step

RULES
- Subject must be 3 to 6 words, under 60 characters, polished and specific
- Body must be 85 to 120 words of plain text
- Use 2 or 3 short paragraphs
- Reference the strategic fit or audience overlap
- Keep the message relational, not salesy
- End with a low-friction CTA
- Never use hype, filler, or exclamation marks

Return ONLY valid JSON:
{{"subject":"...","body":"Dear {contact},\\n\\n...\\n\\n...\\n\\n...\\n\\n{_signature(user)}"}}"""


def _prompt_for_mode(lead, user, mode: str) -> str:
    if mode == "job_seeker":
        return _job_seeker_prompt(lead, user)
    if mode == "recruiter":
        return _recruiter_prompt(lead, user)
    if mode == "agency":
        return _agency_prompt(lead, user)
    if mode == "partnerships":
        return _partnership_prompt(lead, user)
    return _growth_prompt(lead, user)


def generate_email_for_lead(lead, user) -> tuple[str, str]:
    mode = _outreach_mode(lead, user)
    ck = _cache_key(lead, user.id, mode)
    if ck in _cache:
        return _cache[ck]["subject"], _cache[ck]["body"]

    prompt = _prompt_for_mode(lead, user, mode)

    try:
        raw = _chat(_client(user), prompt, temperature=0.72, max_tokens=500)
        subject, body = _parse_draft(raw)
        _cache_put(ck, {"subject": subject, "body": body})
        return subject, body
    except Exception as exc:
        logger.warning("draft generation failed (%s) — using fallback template", type(exc).__name__)
        return _fallback_email(lead, user, mode)


def generate_followup_for_lead(lead, user) -> tuple[str, str]:
    mode = _outreach_mode(lead, user)
    company = _subject_company(lead)
    contact = _contact_name(lead, mode)

    if mode == "job_seeker":
        prompt = f"""Write a professional follow-up email for a job seeker who previously contacted {contact} at {company}.

Rules:
- 60 to 85 words, plain text
- Subject under 60 characters
- Calm, capable, and respectful tone
- Reference the earlier note naturally
- One soft CTA
- No desperation or exclamation marks

Return ONLY valid JSON:
{{"subject":"...","body":"Dear {contact},\\n\\n...\\n\\n{_signature(user)}"}}"""
    elif mode == "recruiter":
        prompt = f"""Write a professional recruiter follow-up email to {contact} at {company}.

Rules:
- 55 to 80 words, plain text
- Subject under 60 characters
- Reference the earlier outreach naturally
- Restate the recruiting value in one line
- One low-friction CTA
- No hype or exclamation marks

Return ONLY valid JSON:
{{"subject":"...","body":"Dear {contact},\\n\\n...\\n\\n{_signature(user)}"}}"""
    elif mode == "partnerships":
        prompt = f"""Write a professional partnership follow-up email to {contact} at {company}.

Rules:
- 55 to 80 words, plain text
- Subject under 60 characters
- Reference the earlier outreach naturally
- Reiterate the strategic fit in one line
- One low-friction CTA
- No hype or exclamation marks

Return ONLY valid JSON:
{{"subject":"...","body":"Dear {contact},\\n\\n...\\n\\n{_signature(user)}"}}"""
    else:
        prompt = f"""Write a professional business-development follow-up email to {contact} at {company}.

Rules:
- 55 to 80 words, plain text
- Subject under 60 characters
- Reference the previous note naturally
- Restate the value in one line
- One low-friction CTA
- No hype or exclamation marks

Return ONLY valid JSON:
{{"subject":"...","body":"Dear {contact},\\n\\n...\\n\\n{_signature(user)}"}}"""

    try:
        raw = _chat(_client(user), prompt, temperature=0.68, max_tokens=260)
        return _parse_draft(raw)
    except Exception as exc:
        logger.warning("follow-up generation failed (%s) — using fallback template", type(exc).__name__)
        return _fallback_followup(lead, user, mode)


def _fallback_email(lead, user, mode: str) -> tuple[str, str]:
    company = _subject_company(lead)
    contact = _contact_name(lead, mode)
    sender_role = _sender_role(user)
    signature = _signature(user).replace("\\n", "\n")

    if mode == "job_seeker":
        subjects = [
            f"Interest in roles at {company}",
            f"Profile fit for {company}",
            f"Quick note for {company}",
        ]
        body = (
            f"Dear {contact},\n\n"
            f"I'm reaching out because {company} looks aligned with the kind of work I do best in {sender_role.lower()}. "
            f"Rather than rely only on a standard application flow, I wanted to introduce myself directly.\n\n"
            f"My background is strongest where clear ownership, execution quality, and fast ramp-up matter. "
            f"If there is a relevant opening, I would be glad to share a concise profile or work sample.\n\n"
            f"Would you be open to pointing me to the right next step?\n\n"
            f"{signature}"
        )
        return random.choice(subjects)[:59], body

    if mode == "recruiter":
        subjects = [
            f"Hiring support for {company}",
            f"Recruiting note for {company}",
            f"Talent help for {company}",
        ]
        body = (
            f"Dear {contact},\n\n"
            f"I came across hiring signals around {company} and thought there may be a relevant fit with the recruiting work I do in {sender_role.lower()}.\n\n"
            f"My focus is on helping teams move quickly on priority roles with a practical, well-managed search process. "
            f"If useful, I can send a short note on how I would approach this market.\n\n"
            f"Would a brief conversation make sense?\n\n"
            f"{signature}"
        )
        return random.choice(subjects)[:59], body

    if mode == "partnerships":
        subjects = [
            f"Partnership idea for {company}",
            f"Potential fit with {company}",
            f"Alliance note for {company}",
        ]
        body = (
            f"Dear {contact},\n\n"
            f"I'm reaching out because there appears to be a credible fit between {company} and the work I lead in {sender_role.lower()}.\n\n"
            f"I think there may be room for a practical partnership conversation around audience overlap, distribution, or mutual value creation. "
            f"If useful, I can send a concise outline of the opportunity I have in mind.\n\n"
            f"Would you be open to that?\n\n"
            f"{signature}"
        )
        return random.choice(subjects)[:59], body

    subjects = [
        f"A thought for {company}",
        f"Idea for {company}",
        f"Brief note for {company}",
    ]
    body = (
        f"Dear {contact},\n\n"
        f"I came across {company} while reviewing teams in this market and thought there may be a relevant fit with the work I do in {sender_role.lower()}.\n\n"
        f"My focus is on practical execution rather than generic outreach, and I would be happy to send a short idea tailored to the current priorities at {company} if that would be useful.\n\n"
        f"Would it make sense for me to send a concise note with the angle I have in mind?\n\n"
        f"{signature}"
    )
    return random.choice(subjects)[:59], body


def _fallback_followup(lead, user, mode: str) -> tuple[str, str]:
    company = _subject_company(lead)
    contact = _contact_name(lead, mode)
    signature = _signature(user).replace("\\n", "\n")

    if mode == "job_seeker":
        body = (
            f"Dear {contact},\n\n"
            f"I wanted to follow up on my earlier note regarding opportunities at {company}. "
            f"If there is a relevant opening or a better person to speak with, I would appreciate a quick pointer.\n\n"
            f"{signature}"
        )
        return f"Following up on {company}"[:59], body

    if mode == "partnerships":
        body = (
            f"Dear {contact},\n\n"
            f"Following up on my earlier note in case the timing is better now. "
            f"If helpful, I can send a concise outline of the partnership angle I had in mind for {company}.\n\n"
            f"{signature}"
        )
        return f"Following up with {company}"[:59], body

    body = (
        f"Dear {contact},\n\n"
        f"Following up on my earlier note in case the timing is better now. "
        f"If helpful, I can send a concise idea tailored to the current priorities at {company}.\n\n"
        f"{signature}"
    )
    return f"Following up with {company}"[:59], body

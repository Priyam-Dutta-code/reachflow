"""Auth + profile request schemas. Profile validators PORTED from V1."""

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.services.verticals import DEFAULT_VERTICAL, normalize_vertical


class RegisterRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=2, max_length=80)
    email: EmailStr
    password: str = Field(min_length=1, max_length=200)
    vertical: str = Field(default=DEFAULT_VERTICAL, max_length=80)

    @field_validator("vertical")
    @classmethod
    def _v_vertical(cls, value: str) -> str:
        return normalize_vertical(value)


class LoginRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    email: EmailStr
    password: str = Field(min_length=1, max_length=200)


class TokenPayload(BaseModel):
    token: str = Field(min_length=10, max_length=200)


class ForgotPasswordRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=10, max_length=200)
    new_password: str = Field(min_length=1, max_length=200)


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=200)
    new_password: str = Field(min_length=1, max_length=200)


# ── Profile (PORTED from V1 routers/auth.py) ─────────────────────────

class _ProfileBase(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str | None = Field(default=None, min_length=2, max_length=80)
    vertical: str | None = Field(default=None, max_length=80)
    sender_name: str | None = Field(default=None, min_length=2, max_length=80)
    sender_email: str | None = Field(default=None, min_length=5, max_length=255)
    sender_phone: str | None = Field(default=None, max_length=32)
    sender_linkedin: str | None = Field(default=None, max_length=255)
    sender_profile: str | None = Field(default=None, max_length=800)
    sender_role: str | None = Field(default=None, max_length=80)
    gmail_password: str | None = Field(default=None, max_length=255)
    groq_api_key: str | None = Field(default=None, max_length=255)

    @field_validator("sender_email")
    @classmethod
    def validate_email(cls, value: str | None) -> str | None:
        if value and "@" not in value:
            raise ValueError("Enter a valid sender email address")
        return value

    @field_validator("sender_linkedin")
    @classmethod
    def validate_linkedin(cls, value: str | None) -> str | None:
        if value and "linkedin.com" not in value:
            raise ValueError("Enter a valid LinkedIn URL")
        return value

    @field_validator("vertical")
    @classmethod
    def validate_vertical(cls, value: str | None) -> str | None:
        if value is None:
            return value
        return normalize_vertical(value)


class OnboardRequest(_ProfileBase):
    name: str = Field(min_length=2, max_length=80)
    vertical: str = Field(default=DEFAULT_VERTICAL, max_length=80)
    sender_name: str = Field(min_length=2, max_length=80)
    sender_email: str = Field(min_length=5, max_length=255)
    sender_phone: str = Field(default="")
    sender_linkedin: str = Field(default="")
    sender_profile: str = Field(default="")
    sender_role: str = Field(default="Professional", max_length=80)
    gmail_password: str = Field(default="")
    groq_api_key: str = Field(default="")


class ProfileUpdate(_ProfileBase):
    pass

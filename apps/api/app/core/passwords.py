"""Password hashing (argon2id) and policy checks."""
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerifyMismatchError

_hasher = PasswordHasher()  # argon2id defaults (RFC 9106 low-memory profile)

# Small high-frequency list — blocks the laziest choices without a dependency.
COMMON_PASSWORDS = frozenset({
    "password", "password1", "password123", "passw0rd", "12345678", "123456789",
    "1234567890", "qwerty123", "qwertyuiop", "11111111", "00000000", "iloveyou",
    "sunshine", "princess", "football", "baseball", "superman", "welcome1",
    "admin123", "letmein1", "monkey123", "dragon123", "trustno1", "whatever",
    "qwerty12", "abc12345", "password!", "p@ssw0rd", "asdfghjkl", "1q2w3e4r",
    "1qaz2wsx", "zaq12wsx", "qazwsxedc", "1234qwer", "q1w2e3r4", "india123",
    "computer", "internet", "starwars", "pokemon1", "michael1", "jessica1",
    "shadow123", "master123", "freedom1", "batman123", "soccer123", "killer123",
})


def validate_password_policy(password: str) -> str | None:
    """Return a human error message, or None when acceptable."""
    if len(password) < 8:
        return "Password must be at least 8 characters."
    if len(password) > 128:
        return "Password must be at most 128 characters."
    if password.strip().lower() in COMMON_PASSWORDS:
        return "That password is too common. Pick something less guessable."
    return None


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password_hash: str | None, password: str) -> bool:
    if not password_hash:
        return False
    try:
        return _hasher.verify(password_hash, password)
    except (VerifyMismatchError, InvalidHashError):
        return False


def needs_rehash(password_hash: str) -> bool:
    try:
        return _hasher.check_needs_rehash(password_hash)
    except Exception:
        return False

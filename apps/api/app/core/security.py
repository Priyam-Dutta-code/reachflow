"""Secret encryption — PORTED from V1 `security.py` with unchanged behavior.

The `enc:` storage format and SHA-256→Fernet key derivation are byte-compatible
with V1 so existing encrypted rows keep decrypting after migration.
"""
import base64
import hashlib

from cryptography.fernet import Fernet, InvalidToken

from app.core.settings import get_settings


class SecretManager:
    def __init__(self, key: str):
        self._fernet: Fernet | None = None
        if key:
            digest = hashlib.sha256(key.encode("utf-8")).digest()
            self._fernet = Fernet(base64.urlsafe_b64encode(digest))

    @property
    def enabled(self) -> bool:
        return self._fernet is not None

    def encrypt(self, value: str | None) -> str:
        plain = (value or "").strip()
        if not plain:
            return ""
        if plain.startswith("enc:"):
            return plain
        if not self._fernet:
            return plain
        token = self._fernet.encrypt(plain.encode("utf-8")).decode("utf-8")
        return f"enc:{token}"

    def decrypt(self, value: str | None) -> str:
        stored = (value or "").strip()
        if not stored:
            return ""
        if not stored.startswith("enc:"):
            return stored
        if not self._fernet:
            raise RuntimeError("APP_ENCRYPTION_KEY is required to decrypt stored secrets.")
        try:
            return self._fernet.decrypt(stored.removeprefix("enc:").encode("utf-8")).decode("utf-8")
        except InvalidToken as exc:
            raise RuntimeError("Stored secret could not be decrypted. Check APP_ENCRYPTION_KEY.") from exc

    def needs_migration(self, value: str | None) -> bool:
        stored = (value or "").strip()
        return bool(stored and self.enabled and not stored.startswith("enc:"))


_secret_manager: SecretManager | None = None


def get_secret_manager() -> SecretManager:
    global _secret_manager
    if _secret_manager is None:
        _secret_manager = SecretManager(get_settings().app_encryption_key)
    return _secret_manager

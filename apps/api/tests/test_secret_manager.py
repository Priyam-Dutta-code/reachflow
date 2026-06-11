"""SecretManager must stay byte-compatible with V1 (same key derivation,
same `enc:` format) so existing rows decrypt after migration."""
import base64
import hashlib

import pytest
from cryptography.fernet import Fernet

from app.core.security import SecretManager


def test_round_trip_and_prefix():
    sm = SecretManager("some-key")
    token = sm.encrypt("gmail-app-password")
    assert token.startswith("enc:")
    assert sm.decrypt(token) == "gmail-app-password"
    # idempotent: encrypting an encrypted value is a no-op
    assert sm.encrypt(token) == token


def test_v1_compatibility():
    """A value encrypted with V1's exact derivation decrypts with V2."""
    key = "shared-key"
    digest = hashlib.sha256(key.encode()).digest()
    v1_fernet = Fernet(base64.urlsafe_b64encode(digest))
    v1_stored = "enc:" + v1_fernet.encrypt(b"legacy-secret").decode()

    assert SecretManager(key).decrypt(v1_stored) == "legacy-secret"


def test_disabled_and_migration_flags():
    disabled = SecretManager("")
    assert not disabled.enabled
    assert disabled.encrypt("plain") == "plain"

    enabled = SecretManager("k")
    assert enabled.needs_migration("plaintext-stored")
    assert not enabled.needs_migration("enc:whatever")
    assert not enabled.needs_migration("")

    with pytest.raises(RuntimeError):
        disabled.decrypt("enc:abc")

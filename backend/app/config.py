from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urlparse


class ConfigurationError(RuntimeError):
    pass


def _required_secret(name: str) -> str:
    value = os.getenv(name, "").strip()
    if len(value) < 24:
        raise ConfigurationError(f"{name} debe contener al menos 24 caracteres.")
    return value


def _base_url(name: str, default: str) -> str:
    value = os.getenv(name, default).strip().rstrip("/")
    parsed = urlparse(value)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise ConfigurationError(f"{name} debe ser una URL http(s) válida.")
    if parsed.username or parsed.password or parsed.query or parsed.fragment:
        raise ConfigurationError(f"{name} no debe incluir credenciales ni parámetros.")
    return value


@dataclass(frozen=True, slots=True)
class Settings:
    database_path: Path
    api_token: str
    webhook_token: str
    ollama_url: str
    ollama_model: str
    host: str = "127.0.0.1"
    port: int = 8787
    imap_host: str = ""
    imap_port: int = 993
    imap_username: str = ""
    imap_password: str = ""

    @classmethod
    def from_env(cls) -> "Settings":
        database_path = Path(
            os.getenv("JARVIS_DATABASE_PATH", "backend/data/jarvis.db")
        ).expanduser()
        try:
            port = int(os.getenv("JARVIS_PORT", "8787"))
            imap_port = int(os.getenv("JARVIS_IMAP_PORT", "993"))
        except ValueError as error:
            raise ConfigurationError("JARVIS_PORT y JARVIS_IMAP_PORT deben ser enteros.") from error
        if not 1 <= port <= 65535 or not 1 <= imap_port <= 65535:
            raise ConfigurationError("Los puertos deben estar entre 1 y 65535.")
        return cls(
            database_path=database_path,
            api_token=_required_secret("JARVIS_API_TOKEN"),
            webhook_token=_required_secret("JARVIS_WEBHOOK_TOKEN"),
            ollama_url=_base_url("JARVIS_OLLAMA_URL", "http://127.0.0.1:11434"),
            ollama_model=os.getenv("JARVIS_OLLAMA_MODEL", "qwen3.5:4b").strip(),
            host=os.getenv("JARVIS_HOST", "127.0.0.1").strip(),
            port=port,
            imap_host=os.getenv("JARVIS_IMAP_HOST", "").strip(),
            imap_port=imap_port,
            imap_username=os.getenv("JARVIS_IMAP_USERNAME", "").strip(),
            imap_password=os.getenv("JARVIS_IMAP_PASSWORD", ""),
        )

    @property
    def email_configured(self) -> bool:
        return all((self.imap_host, self.imap_username, self.imap_password))

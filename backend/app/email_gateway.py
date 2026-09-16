from __future__ import annotations

import email
import imaplib
from dataclasses import dataclass
from datetime import UTC, datetime
from email.header import decode_header, make_header
from email.message import Message
from email.utils import parsedate_to_datetime

from .config import Settings


class EmailNotConfiguredError(RuntimeError):
    pass


def _header(message: Message, name: str) -> str:
    value = message.get(name, "")
    try:
        return str(make_header(decode_header(value))).strip()
    except (LookupError, UnicodeDecodeError):
        return value.strip()


def _body_text(message: Message) -> str:
    candidates: list[str] = []
    parts = message.walk() if message.is_multipart() else [message]
    for part in parts:
        if part.get_content_maintype() == "multipart" or part.get_content_disposition() == "attachment":
            continue
        if part.get_content_type() != "text/plain":
            continue
        payload = part.get_payload(decode=True) or b""
        charset = part.get_content_charset() or "utf-8"
        candidates.append(payload.decode(charset, errors="replace"))
    return "\n".join(candidates).strip()[:20_000]


@dataclass(slots=True)
class ImapEmailGateway:
    settings: Settings

    def fetch_unread(self, *, limit: int = 30) -> list[dict[str, object]]:
        if not self.settings.email_configured:
            raise EmailNotConfiguredError("Configura IMAP mediante variables de entorno antes de sincronizar correo.")
        with imaplib.IMAP4_SSL(self.settings.imap_host, self.settings.imap_port) as mailbox:
            mailbox.login(self.settings.imap_username, self.settings.imap_password)
            status, _ = mailbox.select("INBOX", readonly=True)
            if status != "OK":
                raise RuntimeError("No pude abrir la bandeja de entrada configurada.")
            status, data = mailbox.search(None, "UNSEEN")
            if status != "OK" or not data:
                raise RuntimeError("No pude consultar los mensajes no leídos.")
            identifiers = data[0].split()[-max(1, min(limit, 100)):]
            messages: list[dict[str, object]] = []
            for identifier in reversed(identifiers):
                status, fetched = mailbox.fetch(identifier, "(RFC822)")
                if status != "OK" or not fetched or not isinstance(fetched[0], tuple):
                    continue
                parsed = email.message_from_bytes(fetched[0][1])
                date_value = parsedate_to_datetime(parsed.get("Date")) if parsed.get("Date") else datetime.now(UTC)
                if date_value.tzinfo is None:
                    date_value = date_value.replace(tzinfo=UTC)
                sender = _header(parsed, "From")
                subject = _header(parsed, "Subject") or "(Sin asunto)"
                provider_id = _header(parsed, "Message-ID") or f"imap:{identifier.decode()}"
                messages.append({
                    "provider_id": provider_id,
                    "thread_id": _header(parsed, "References") or provider_id,
                    "sender": sender,
                    "recipients": _header(parsed, "To"),
                    "subject": subject,
                    "body_text": _body_text(parsed),
                    "received_at": date_value.astimezone(UTC).isoformat(),
                    "unread": True,
                    "priority": "urgent" if any(word in f"{sender} {subject}".lower() for word in ("decano", "urgente", "plazo")) else "normal",
                })
            return messages

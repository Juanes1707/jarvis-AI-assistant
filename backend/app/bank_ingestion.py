from __future__ import annotations

import hashlib
import re
from datetime import UTC, datetime, timedelta, timezone

from .database import Database
from .llm import ChatModel
from .models import BankWebhookRequest, BankWebhookResponse
from .repositories import JarvisRepository, utc_now


BOGOTA = timezone(timedelta(hours=-5), name="America/Bogota")


def _date_from_text(value: str) -> datetime | None:
    match = re.search(
        r"\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:\D{0,20}(\d{1,2}):(\d{2}))?\b",
        value,
    )
    if not match:
        return None
    day, month, year = (int(match.group(index)) for index in (1, 2, 3))
    hour, minute = int(match.group(4) or 12), int(match.group(5) or 0)
    try:
        return datetime(year, month, day, hour, minute, tzinfo=BOGOTA)
    except ValueError:
        return None


def _payment_method_from_text(value: str) -> str | None:
    match = re.search(r"\b(tarjeta|cuenta)[^\d]{0,30}(?:terminad[ao]\s+en\s+)?(\d{4})\b", value, re.IGNORECASE)
    return f"{match.group(1).capitalize()} terminada en {match.group(2)}" if match else None


class BankIngestionService:
    def __init__(self, database: Database, repository: JarvisRepository, model: ChatModel):
        self.database = database
        self.repository = repository
        self.model = model

    def ingest(self, request: BankWebhookRequest) -> BankWebhookResponse:
        raw_hash = hashlib.sha256(request.raw_text.encode("utf-8")).hexdigest()
        received_at = (request.received_at or datetime.now(UTC)).astimezone(UTC).isoformat()
        with self.database.transaction() as connection:
            existing = connection.execute(
                "SELECT id,status FROM bank_ingestion_events WHERE id=?", (request.event_id,)
            ).fetchone()
            if existing:
                if existing["status"] == "FAILED":
                    previous_hash = connection.execute(
                        "SELECT raw_text_hash FROM bank_ingestion_events WHERE id=?", (request.event_id,)
                    ).fetchone()["raw_text_hash"]
                    if previous_hash == raw_hash:
                        connection.execute(
                            "UPDATE bank_ingestion_events SET status='PROCESSING',error=NULL,received_at=? WHERE id=?",
                            (received_at, request.event_id),
                        )
                    else:
                        return BankWebhookResponse(
                            event_id=request.event_id, status="duplicate",
                            reason="El identificador ya fue usado con otro contenido.",
                        )
                else:
                    transaction = connection.execute(
                        "SELECT id FROM transactions WHERE ingestion_event_id=?", (request.event_id,)
                    ).fetchone()
                    return BankWebhookResponse(
                        event_id=request.event_id, status="duplicate",
                        transaction_id=transaction["id"] if transaction else None,
                        reason=f"Evento ya procesado con estado {existing['status']}.",
                    )
            else:
                connection.execute(
                    """
                    INSERT INTO bank_ingestion_events(id,source,raw_text_hash,raw_text,status,received_at,created_at)
                    VALUES (?,?,?,?, 'PROCESSING', ?, ?)
                    """,
                    # El texto bancario puede contener datos sensibles. Solo se conserva su hash;
                    # la extracción ocurre en memoria y el evento guarda el JSON mínimo resultante.
                    (request.event_id, request.source, raw_hash, "", received_at, utc_now()),
                )

        try:
            structured = self.model.extract_bank_transaction(request.raw_text)
            if not structured.is_transaction or structured.confidence < 0.65:
                with self.database.transaction() as connection:
                    connection.execute(
                        "UPDATE bank_ingestion_events SET status='IGNORED',structured_json=? WHERE id=?",
                        (structured.model_dump_json(), request.event_id),
                    )
                return BankWebhookResponse(
                    event_id=request.event_id, status="ignored",
                    reason="El evento no contiene una transacción con confianza suficiente.",
                )
            required = (structured.amount_minor, structured.currency, structured.merchant)
            if any(value is None for value in required):
                raise ValueError("La transacción estructurada no contiene todos los campos obligatorios.")
            occurred_at = structured.occurred_at or _date_from_text(request.raw_text) or request.received_at or datetime.now(UTC)
            if occurred_at.tzinfo is None:
                occurred_at = occurred_at.replace(tzinfo=BOGOTA)
            category = structured.category or "other"
            payment_method = structured.payment_method or _payment_method_from_text(request.raw_text)
            structured = structured.model_copy(update={
                "occurred_at": occurred_at,
                "category": category,
                "payment_method": payment_method,
            })
            with self.database.transaction() as connection:
                transaction = self.repository.create_transaction(
                    amount_minor=structured.amount_minor,
                    currency=structured.currency,
                    merchant=structured.merchant,
                    category=category,
                    occurred_at=occurred_at.astimezone(UTC).isoformat(),
                    payment_method=payment_method,
                    source="bank_webhook",
                    ingestion_event_id=request.event_id,
                    connection=connection,
                )
                connection.execute(
                    "UPDATE bank_ingestion_events SET status='CREATED',structured_json=? WHERE id=?",
                    (structured.model_dump_json(), request.event_id),
                )
            return BankWebhookResponse(
                event_id=request.event_id, status="created", transaction_id=transaction["id"]
            )
        except Exception as error:
            with self.database.transaction() as connection:
                connection.execute(
                    "UPDATE bank_ingestion_events SET status='FAILED',error=? WHERE id=?",
                    (str(error)[:500], request.event_id),
                )
            raise

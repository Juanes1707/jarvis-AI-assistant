from __future__ import annotations

import tempfile
import unittest
from datetime import UTC, datetime
from pathlib import Path

from httpx import ASGITransport, AsyncClient

from app.api import create_app
from app.config import Settings
from app.models import StructuredBankTransaction
from tests.fakes import FakeModel


class ApiTestCase(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.directory = tempfile.TemporaryDirectory()
        self.settings = Settings(
            database_path=Path(self.directory.name) / "api.db",
            api_token="api-token-with-at-least-24-characters",
            webhook_token="webhook-token-with-at-least-24-characters",
            ollama_url="http://127.0.0.1:11434",
            ollama_model="qwen3.5:4b",
        )
        self.app = create_app(self.settings)
        self.client = AsyncClient(transport=ASGITransport(app=self.app), base_url="http://testserver")

    async def asyncTearDown(self) -> None:
        await self.client.aclose()
        self.directory.cleanup()

    async def test_health_is_minimal_and_protected_routes_require_bearer(self) -> None:
        self.assertEqual((await self.client.get("/health")).json(), {"status": "ok"})
        response = await self.client.get("/v1/agents/status")
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json(), {"detail": "Credencial inválida."})

    async def test_webhook_requires_separate_secret_and_accepts_valid_event(self) -> None:
        payload = {"event_id": "api-event-1", "source": "tasker", "raw_text": "Compra por 10.000 COP"}
        self.assertEqual((await self.client.post("/v1/webhooks/bank-events", json=payload)).status_code, 401)
        self.app.state.services.bank_ingestion.model = FakeModel(bank=StructuredBankTransaction(
            is_transaction=True,
            amount_minor=1_000_000,
            currency="COP",
            merchant="Tienda",
            occurred_at=datetime(2026, 9, 15, tzinfo=UTC),
            payment_method="Débito 1234",
            category="other",
            confidence=0.95,
        ))
        response = await self.client.post(
            "/v1/webhooks/bank-events", json=payload,
            headers={"X-Jarvis-Webhook-Token": self.settings.webhook_token},
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["status"], "created")


if __name__ == "__main__":
    unittest.main()

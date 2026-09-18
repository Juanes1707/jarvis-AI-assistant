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

    async def test_profile_starts_empty_and_persists_explicit_user_data(self) -> None:
        headers = {"Authorization": f"Bearer {self.settings.api_token}"}

        initial = await self.client.get("/v1/profile", headers=headers)

        self.assertEqual(initial.status_code, 200, initial.text)
        self.assertEqual(initial.json()["user_id"], "owner")
        self.assertIsNone(initial.json()["display_name"])
        self.assertFalse(initial.json()["onboarding_completed"])

        updated = await self.client.patch(
            "/v1/profile",
            headers=headers,
            json={
                "display_name": "Juan Esteban",
                "preferred_name": "Juan",
                "timezone": "America/Bogota",
                "country": "Colombia",
                "city": "Bogotá",
                "onboarding_completed": True,
            },
        )

        self.assertEqual(updated.status_code, 200, updated.text)
        self.assertEqual(updated.json()["display_name"], "Juan Esteban")
        self.assertEqual(updated.json()["preferred_name"], "Juan")
        self.assertEqual(updated.json()["timezone"], "America/Bogota")
        self.assertEqual(updated.json()["country"], "Colombia")
        self.assertEqual(updated.json()["city"], "Bogotá")
        self.assertTrue(updated.json()["onboarding_completed"])

        persisted = await self.client.get("/v1/profile", headers=headers)
        self.assertEqual(persisted.json(), updated.json())

    async def test_profile_accepts_postgresql_short_timezone_offset(self) -> None:
        headers = {"Authorization": f"Bearer {self.settings.api_token}"}
        postgres_timestamp = "2026-09-16 12:21:44.028844-05"
        with self.app.state.services.database.transaction() as connection:
            connection.execute(
                "UPDATE user_profiles SET created_at=?,updated_at=? WHERE user_id='owner'",
                (postgres_timestamp, postgres_timestamp),
            )

        response = await self.client.get("/v1/profile", headers=headers)

        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["created_at"], "2026-09-16T12:21:44.028844-05:00")
        self.assertEqual(response.json()["updated_at"], "2026-09-16T12:21:44.028844-05:00")

    async def test_user_can_create_find_and_forget_confirmed_memory(self) -> None:
        headers = {"Authorization": f"Bearer {self.settings.api_token}"}

        empty = await self.client.get("/v1/memories", headers=headers)
        self.assertEqual(empty.status_code, 200, empty.text)
        self.assertEqual(empty.json(), {"memories": []})

        created = await self.client.post(
            "/v1/memories",
            headers=headers,
            json={
                "kind": "preference",
                "content": "Prefiero estudiar por las noches.",
                "importance": 4,
            },
        )
        self.assertEqual(created.status_code, 201, created.text)
        self.assertEqual(created.json()["source"], "manual")
        self.assertEqual(created.json()["status"], "active")
        self.assertIsNotNone(created.json()["confirmed_at"])

        found = await self.client.get("/v1/memories?query=noches", headers=headers)
        self.assertEqual([item["content"] for item in found.json()["memories"]], [
            "Prefiero estudiar por las noches."
        ])

        forgotten = await self.client.delete(
            f"/v1/memories/{created.json()['id']}", headers=headers
        )
        self.assertEqual(forgotten.status_code, 204, forgotten.text)
        self.assertEqual((await self.client.get("/v1/memories", headers=headers)).json(), {"memories": []})

    async def test_workspace_returns_confirmed_academic_and_financial_data(self) -> None:
        headers = {"Authorization": f"Bearer {self.settings.api_token}"}
        repository = self.app.state.services.repository
        subject = repository.create_subject(name="Bases de Datos", credits=3, professor="Ana")
        task = repository.create_task(
            title="Diseñar el modelo relacional",
            priority="HIGH",
            due_at="2026-09-20T18:00:00+00:00",
            subject_name="Bases de Datos",
        )
        event = repository.create_calendar_event(
            title="Clase de Bases de Datos",
            starts_at="2026-09-18T13:00:00+00:00",
            ends_at="2026-09-18T15:00:00+00:00",
            event_type="CLASS",
            subject_name="Bases de Datos",
            location="Salón B-201",
        )
        transaction = repository.create_transaction(
            amount_minor=3_250_000,
            currency="COP",
            merchant="Almuerzo",
            category="food",
            occurred_at="2026-09-16T17:00:00+00:00",
        )
        budget = repository.set_monthly_budget(
            month="2026-09", amount_minor=200_000_000, currency="COP"
        )

        response = await self.client.get("/v1/workspace?month=2026-09", headers=headers)

        self.assertEqual(response.status_code, 200, response.text)
        body = response.json()
        self.assertEqual(body["subjects"][0]["id"], subject["id"])
        self.assertEqual(body["tasks"][0]["id"], task["id"])
        self.assertEqual(body["tasks"][0]["subject_id"], subject["id"])
        self.assertEqual(body["events"][0]["id"], event["id"])
        self.assertEqual(body["transactions"][0]["id"], transaction["id"])
        self.assertEqual(body["budget"]["id"], budget["id"])


if __name__ == "__main__":
    unittest.main()

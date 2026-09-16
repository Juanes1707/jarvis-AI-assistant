from __future__ import annotations

import tempfile
import unittest
from datetime import UTC, datetime
from pathlib import Path

from app.agents import ToolRegistry
from app.bank_ingestion import BankIngestionService
from app.database import Database
from app.llm import ChatResult, ToolCall
from app.models import ActionProposal, AssistantRequest, BankWebhookRequest, StructuredBankTransaction, ToolResult
from app.orchestrator import Orchestrator
from app.repositories import JarvisRepository
from tests.fakes import FakeModel


class BackendTestCase(unittest.TestCase):
    def setUp(self) -> None:
        self.directory = tempfile.TemporaryDirectory()
        self.database = Database(Path(self.directory.name) / "jarvis.db")
        self.database.initialize()
        self.repository = JarvisRepository(self.database)

    def tearDown(self) -> None:
        self.directory.cleanup()

    def test_orchestrator_combines_secretary_and_financial_agents(self) -> None:
        model = FakeModel([
            ChatResult("", (
                ToolCall("secretary_list_unread_emails", {"sender_query": "decano", "limit": 5}),
                ToolCall("financial_get_summary", {"month": "2026-09"}),
            )),
            ChatResult("No hay correos del decano y tu resumen financiero está listo."),
        ])
        orchestrator = Orchestrator(model, ToolRegistry(self.repository), self.repository)

        response = orchestrator.handle(AssistantRequest(
            request_id="request-composite", text="Revisa al decano y dime cuánto puedo gastar", conversation_id="demo"
        ))

        self.assertEqual(response.route, "composite")
        self.assertEqual([item.name for item in response.tool_results], [
            "secretary_list_unread_emails", "financial_get_summary"
        ])
        tool_messages = [message for message in model.messages[-1] if message["role"] == "tool"]
        self.assertEqual(len(tool_messages), 2)

    def test_write_is_proposed_then_confirmed_exactly_once(self) -> None:
        model = FakeModel([
            ChatResult("", (ToolCall("secretary_create_task", {
                "title": "Entregar arquitectura", "priority": "HIGH", "due_at": None,
            }),)),
            ChatResult("Preparé la tarea para tu confirmación."),
        ])
        tools = ToolRegistry(self.repository)
        response = Orchestrator(model, tools, self.repository).handle(AssistantRequest(
            request_id="request-task-1", text="Crea la tarea", conversation_id="demo"
        ))

        self.assertEqual(self.repository.count("tasks"), 0)
        self.assertEqual(len(response.proposals), 1)
        proposal, first_result, replayed = tools.confirm(response.proposals[0].id)
        self.assertFalse(replayed)
        self.assertEqual(proposal.status, "confirmed")
        self.assertEqual(self.repository.count("tasks"), 1)
        _, second_result, replayed = tools.confirm(response.proposals[0].id)
        self.assertTrue(replayed)
        self.assertEqual(second_result, first_result)
        self.assertEqual(self.repository.count("tasks"), 1)

    def test_bank_webhook_uses_structured_output_and_is_idempotent(self) -> None:
        model = FakeModel(bank=StructuredBankTransaction(
            is_transaction=True,
            amount_minor=3250000,
            currency="cop",
            merchant="Restaurante Campus",
            occurred_at=datetime(2026, 9, 15, 17, 30, tzinfo=UTC),
            payment_method="Tarjeta terminada en 1234",
            category="food",
            confidence=0.98,
        ))
        service = BankIngestionService(self.database, self.repository, model)
        request = BankWebhookRequest(event_id="bank-event-1", source="tasker", raw_text="Compra aprobada por $32.500")

        first = service.ingest(request)
        duplicate = service.ingest(request)

        self.assertEqual(first.status, "created")
        self.assertEqual(duplicate.status, "duplicate")
        self.assertEqual(duplicate.transaction_id, first.transaction_id)
        self.assertEqual(self.repository.count("transactions"), 1)

    def test_database_enforces_references_and_amounts(self) -> None:
        with self.assertRaises(Exception):
            self.repository.create_transaction(
                amount_minor=0, currency="COP", merchant="Inválido", category="other",
                occurred_at=datetime.now(UTC).isoformat(), account_id="missing",
            )

    def test_unassigned_transactions_affect_available_cash(self) -> None:
        self.repository.create_transaction(
            amount_minor=250_000, currency="COP", merchant="Ingreso", category="income",
            occurred_at="2026-09-10T15:00:00+00:00", transaction_type="INCOME",
        )
        self.repository.create_transaction(
            amount_minor=100_000, currency="COP", merchant="Gasto", category="other",
            occurred_at="2026-09-11T15:00:00+00:00", transaction_type="EXPENSE",
        )
        summary = self.repository.financial_summary(month="2026-09")
        self.assertEqual(summary["available_minor"], 150_000)
        self.assertEqual(summary["discretionary_minor"], 150_000)

    def test_bank_ingestion_enriches_date_and_masks_raw_notification(self) -> None:
        model = FakeModel(bank=StructuredBankTransaction(
            is_transaction=True, amount_minor=3_250_000, currency="COP",
            merchant="Restaurante Campus", occurred_at=None, payment_method=None,
            category="food", confidence=0.95,
        ))
        service = BankIngestionService(self.database, self.repository, model)
        service.ingest(BankWebhookRequest(
            event_id="bank-enrichment", source="shortcut",
            raw_text="Compra por 32500 COP el 15/09/2026 a las 12:30 con tarjeta terminada en 1234.",
        ))
        with self.database.session() as connection:
            transaction = dict(connection.execute(
                "SELECT occurred_at,payment_method FROM transactions WHERE ingestion_event_id='bank-enrichment'"
            ).fetchone())
            event = dict(connection.execute(
                "SELECT raw_text,structured_json FROM bank_ingestion_events WHERE id='bank-enrichment'"
            ).fetchone())
        self.assertEqual(transaction["occurred_at"], "2026-09-15T17:30:00+00:00")
        self.assertEqual(transaction["payment_method"], "Tarjeta terminada en 1234")
        self.assertEqual(event["raw_text"], "")
        self.assertNotIn("Compra por", event["structured_json"])

    def test_secretary_reminders_and_unconfigured_email_are_explicit(self) -> None:
        tools = ToolRegistry(self.repository)
        sync = tools.execute(name="secretary_sync_unread_emails", arguments={}, request_id="mail-sync")
        self.assertIsInstance(sync, ToolResult)
        assert isinstance(sync, ToolResult)
        self.assertEqual(sync.data["status"], "not_configured")
        proposal = tools.execute(
            name="secretary_create_task",
            arguments={
                "title": "Entregar taller", "priority": "HIGH",
                "due_at": "2026-09-20T18:00:00-05:00",
                "remind_at": "2026-09-15T08:00:00-05:00",
            },
            request_id="task-with-reminder",
        )
        self.assertIsInstance(proposal, ActionProposal)
        assert isinstance(proposal, ActionProposal)
        tools.confirm(proposal.id)
        reminders = self.repository.list_due_reminders(at="2026-09-16T00:00:00+00:00")
        self.assertEqual(reminders[0]["title"], "Entregar taller")

    def test_financial_goals_and_credit_cards_are_confirmed(self) -> None:
        tools = ToolRegistry(self.repository)
        goal = tools.execute(
            name="financial_create_savings_goal",
            arguments={"name": "Fondo de emergencia", "target_minor": 5_000_000, "saved_minor": 500_000, "currency": "COP"},
            request_id="goal-1",
        )
        card = tools.execute(
            name="financial_create_liability",
            arguments={
                "name": "Tarjeta principal", "kind": "credit_card", "principal_minor": 4_000_000,
                "outstanding_minor": 1_000_000, "credit_limit_minor": 4_000_000, "statement_day": 12,
                "minimum_payment_minor": 100_000, "due_date": "2026-09-28", "annual_interest_bps": 2_500,
            },
            request_id="card-1",
        )
        assert isinstance(goal, ActionProposal) and isinstance(card, ActionProposal)
        tools.confirm(goal.id)
        tools.confirm(card.id)
        summary = self.repository.financial_summary(month="2026-09")
        liabilities = self.repository.list_liabilities()
        self.assertEqual(summary["savings_goals"][0]["name"], "Fondo de emergencia")
        self.assertEqual(summary["projected_obligations_minor"], 100_000)
        self.assertEqual(liabilities[0]["credit_limit_minor"], 4_000_000)
        self.assertEqual(liabilities[0]["statement_day"], 12)


if __name__ == "__main__":
    unittest.main()

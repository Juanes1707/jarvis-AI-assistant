from __future__ import annotations

import tempfile
import unittest
from datetime import UTC, datetime
from pathlib import Path

from app.agents import ToolRegistry
from app.bank_ingestion import BankIngestionService
from app.database import Database
from app.llm import ChatResult, LLMError, ToolCall
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

    def test_orchestrator_rejects_an_empty_model_answer_instead_of_fabricating_one(self) -> None:
        model = FakeModel([ChatResult("")])
        orchestrator = Orchestrator(model, ToolRegistry(self.repository), self.repository)

        with self.assertRaises(LLMError):
            orchestrator.handle(AssistantRequest(
                request_id="request-empty", text="Pregunta abierta", conversation_id="demo"
            ))

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

    def test_confirmed_memory_is_recalled_by_later_conversations(self) -> None:
        model = FakeModel([
            ChatResult("", (ToolCall("memory_remember", {
                "kind": "preference",
                "content": "Prefiero estudiar por las noches.",
                "importance": 4,
            }),)),
            ChatResult("Puedo recordarlo cuando confirmes la propuesta."),
        ])
        tools = ToolRegistry(self.repository)
        orchestrator = Orchestrator(model, tools, self.repository)

        response = orchestrator.handle(AssistantRequest(
            request_id="remember-study-time",
            text="Recuerda que prefiero estudiar por las noches",
            conversation_id="memory-chat",
        ))

        self.assertEqual(self.repository.count("memories"), 0)
        self.assertEqual(response.proposals[0].tool_name, "memory_remember")
        tools.confirm(response.proposals[0].id)
        self.assertEqual(self.repository.count("memories"), 1)

        recall_model = FakeModel([ChatResult("Prefieres estudiar por las noches.")])
        Orchestrator(recall_model, ToolRegistry(self.repository), self.repository).handle(AssistantRequest(
            request_id="recall-study-time",
            text="¿A qué hora prefiero estudiar?",
            conversation_id="memory-chat",
        ))

        system_context = recall_model.messages[0][0]["content"]
        self.assertIn("Prefiero estudiar por las noches.", system_context)

    def test_conversation_history_is_persisted_and_reused(self) -> None:
        first_model = FakeModel([ChatResult("Hola, ¿cómo puedo ayudarte?")])
        Orchestrator(first_model, ToolRegistry(self.repository), self.repository).handle(AssistantRequest(
            request_id="conversation-turn-1",
            text="Hola JARVIS",
            conversation_id="persistent-chat",
        ))

        second_model = FakeModel([ChatResult("Sí, recuerdo que me saludaste.")])
        Orchestrator(second_model, ToolRegistry(self.repository), self.repository).handle(AssistantRequest(
            request_id="conversation-turn-2",
            text="¿Recuerdas lo anterior?",
            conversation_id="persistent-chat",
        ))

        visible_history = [
            (message["role"], message["content"])
            for message in second_model.messages[0][1:]
        ]
        self.assertEqual(visible_history, [
            ("user", "Hola JARVIS"),
            ("assistant", "Hola, ¿cómo puedo ayudarte?"),
            ("user", "¿Recuerdas lo anterior?"),
        ])

    def test_profile_changes_from_conversation_require_confirmation(self) -> None:
        model = FakeModel([
            ChatResult("", (ToolCall("profile_update", {
                "occupation": "Estudiante",
                "study_program": "Ingeniería de Sistemas",
            }),)),
            ChatResult("Preparé la actualización de tu perfil."),
        ])
        tools = ToolRegistry(self.repository)

        response = Orchestrator(model, tools, self.repository).handle(AssistantRequest(
            request_id="profile-update-1",
            text="Actualiza mi perfil",
            conversation_id="profile-chat",
        ))

        self.assertIsNone(self.repository.get_profile()["occupation"])
        self.assertEqual(response.proposals[0].tool_name, "profile_update")
        tools.confirm(response.proposals[0].id)
        self.assertEqual(self.repository.get_profile()["occupation"], "Estudiante")
        self.assertEqual(self.repository.get_profile()["study_program"], "Ingeniería de Sistemas")

    def test_forgetting_memory_from_conversation_requires_confirmation(self) -> None:
        memory = self.repository.create_memory(
            kind="fact", content="Tengo una reunión de prueba.", importance=2
        )
        model = FakeModel([
            ChatResult("", (ToolCall("memory_forget", {"memory_id": memory["id"]}),)),
            ChatResult("Preparé el olvido para tu confirmación."),
        ])
        tools = ToolRegistry(self.repository)

        response = Orchestrator(model, tools, self.repository).handle(AssistantRequest(
            request_id="forget-memory-1",
            text="Olvida ese dato",
            conversation_id="memory-chat",
        ))

        self.assertIn("Tengo una reunión de prueba.", model.messages[0][0]["content"])
        self.assertEqual(len(self.repository.list_memories()), 1)
        tools.confirm(response.proposals[0].id)
        self.assertEqual(self.repository.list_memories(), [])


if __name__ == "__main__":
    unittest.main()

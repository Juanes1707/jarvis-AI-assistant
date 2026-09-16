from __future__ import annotations

import hashlib
import json
from datetime import UTC, date, datetime, timedelta, timezone
from typing import Any, Protocol

from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator, model_validator
from sqlalchemy.exc import IntegrityError

from .models import ActionProposal, AgentName, ToolResult
from .repositories import JarvisRepository


BOGOTA = timezone(timedelta(hours=-5), name="America/Bogota")


def _schema(model: type[BaseModel]) -> dict[str, Any]:
    return model.model_json_schema()


def _tool(name: str, description: str, model: type[BaseModel]) -> dict[str, Any]:
    return {"type": "function", "function": {"name": name, "description": description, "parameters": _schema(model)}}


class EmptyArgs(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ListEmailArgs(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    sender_query: str | None = Field(default=None, max_length=120)
    limit: int = Field(default=10, ge=1, le=30)


class ListTasksArgs(BaseModel):
    model_config = ConfigDict(extra="forbid")
    status: str | None = Field(default=None, pattern="^(PENDING|IN_PROGRESS|COMPLETED)$")
    limit: int = Field(default=20, ge=1, le=50)


class CreateTaskArgs(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    title: str = Field(min_length=1, max_length=240)
    priority: str = Field(default="MEDIUM", pattern="^(LOW|MEDIUM|HIGH)$")
    due_at: datetime | None = None
    remind_at: datetime | None = None

    @field_validator("due_at", "remind_at")
    @classmethod
    def assume_bogota_for_naive_time(cls, value: datetime | None) -> datetime | None:
        return value.replace(tzinfo=BOGOTA) if value is not None and value.tzinfo is None else value

    @model_validator(mode="after")
    def reminder_precedes_deadline(self) -> "CreateTaskArgs":
        if self.due_at and self.remind_at and self.remind_at > self.due_at:
            raise ValueError("El recordatorio no puede ocurrir después del vencimiento.")
        return self

class DraftEmailArgs(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    to_address: str = Field(min_length=3, max_length=320)
    subject: str = Field(min_length=1, max_length=240)
    body_text: str = Field(min_length=1, max_length=20_000)
    reply_to_message_id: str | None = Field(default=None, max_length=100)

    @field_validator("to_address")
    @classmethod
    def validate_address(cls, value: str) -> str:
        local, separator, domain = value.rpartition("@")
        if not separator or not local or "." not in domain or any(character.isspace() for character in value):
            raise ValueError("La dirección de correo no es válida.")
        return value


class FinancialSummaryArgs(BaseModel):
    model_config = ConfigDict(extra="forbid")
    month: str = Field(pattern=r"^\d{4}-(0[1-9]|1[0-2])$")


class RecordTransactionArgs(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    amount_minor: int = Field(gt=0, le=9_223_372_036_854_775_807)
    currency: str = Field(default="COP", pattern=r"^[A-Za-z]{3}$")
    merchant: str = Field(min_length=1, max_length=180)
    category: str = Field(default="other", max_length=80)
    occurred_at: datetime
    transaction_type: str = Field(default="EXPENSE", pattern="^(INCOME|EXPENSE)$")
    payment_method: str | None = Field(default=None, max_length=100)

    @field_validator("occurred_at")
    @classmethod
    def assume_bogota_for_naive_time(cls, value: datetime) -> datetime:
        return value.replace(tzinfo=BOGOTA) if value.tzinfo is None else value


class CreateSavingsGoalArgs(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    name: str = Field(min_length=1, max_length=180)
    target_minor: int = Field(gt=0, le=9_223_372_036_854_775_807)
    saved_minor: int = Field(default=0, ge=0, le=9_223_372_036_854_775_807)
    currency: str = Field(default="COP", pattern=r"^[A-Za-z]{3}$")
    target_date: date | None = None


class CreateLiabilityArgs(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    name: str = Field(min_length=1, max_length=180)
    kind: str = Field(pattern="^(credit_card|loan)$")
    principal_minor: int = Field(ge=0, le=9_223_372_036_854_775_807)
    outstanding_minor: int = Field(ge=0, le=9_223_372_036_854_775_807)
    credit_limit_minor: int | None = Field(default=None, gt=0, le=9_223_372_036_854_775_807)
    statement_day: int | None = Field(default=None, ge=1, le=31)
    minimum_payment_minor: int = Field(ge=0, le=9_223_372_036_854_775_807)
    due_date: date
    annual_interest_bps: int = Field(ge=0, le=1_000_000)
    account_id: str | None = Field(default=None, max_length=100)

    @model_validator(mode="after")
    def validate_credit_card(self) -> "CreateLiabilityArgs":
        if self.kind == "credit_card" and self.credit_limit_minor is None:
            raise ValueError("Una tarjeta necesita el cupo de crédito.")
        if self.credit_limit_minor is not None and self.outstanding_minor > self.credit_limit_minor:
            raise ValueError("El saldo utilizado no puede superar el cupo.")
        return self


class RememberMemoryArgs(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    kind: str = Field(pattern="^(preference|fact|goal|constraint)$")
    content: str = Field(min_length=1, max_length=2_000)
    importance: int = Field(default=3, ge=1, le=5)
    expires_at: datetime | None = None


class ForgetMemoryArgs(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    memory_id: str = Field(min_length=1, max_length=100)


class UpdateProfileArgs(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    display_name: str | None = Field(default=None, min_length=1, max_length=120)
    preferred_name: str | None = Field(default=None, min_length=1, max_length=80)
    timezone: str | None = Field(default=None, min_length=1, max_length=100)
    locale: str | None = Field(default=None, min_length=2, max_length=20)
    country: str | None = Field(default=None, min_length=1, max_length=120)
    city: str | None = Field(default=None, min_length=1, max_length=120)
    occupation: str | None = Field(default=None, min_length=1, max_length=160)
    study_program: str | None = Field(default=None, min_length=1, max_length=160)
    onboarding_completed: bool | None = None

    @model_validator(mode="after")
    def require_a_change(self) -> "UpdateProfileArgs":
        if not self.model_fields_set:
            raise ValueError("Debes indicar al menos un dato del perfil.")
        return self


class ToolExecutionError(RuntimeError):
    pass


class EmailGateway(Protocol):
    def fetch_unread(self, *, limit: int = 30) -> list[dict[str, object]]: ...


class ToolRegistry:
    def __init__(self, repository: JarvisRepository, email_gateway: EmailGateway | None = None):
        self.repository = repository
        self.email_gateway = email_gateway
        self._definitions = [
            _tool("secretary_sync_unread_emails", "Sincroniza y devuelve correos no leídos desde el proveedor configurado.", EmptyArgs),
            _tool("secretary_list_unread_emails", "Lista correos no leídos y permite filtrar por remitente.", ListEmailArgs),
            _tool("secretary_list_tasks", "Consulta tareas y pendientes estructurados.", ListTasksArgs),
            _tool("secretary_list_due_reminders", "Consulta recordatorios condicionales que ya deben mostrarse.", EmptyArgs),
            _tool("secretary_create_task", "Propone crear una tarea; requiere confirmación del usuario.", CreateTaskArgs),
            _tool("secretary_draft_email", "Propone guardar un borrador de correo; nunca envía automáticamente.", DraftEmailArgs),
            _tool("financial_get_summary", "Calcula saldo, flujo de caja, obligaciones y metas de ahorro del mes.", FinancialSummaryArgs),
            _tool("financial_list_liabilities", "Lista tarjetas, préstamos, vencimientos e intereses.", EmptyArgs),
            _tool("financial_record_transaction", "Propone registrar manualmente un ingreso o gasto; requiere confirmación.", RecordTransactionArgs),
            _tool("financial_create_savings_goal", "Propone crear una meta de ahorro; requiere confirmación.", CreateSavingsGoalArgs),
            _tool("financial_create_liability", "Propone registrar una tarjeta o préstamo con saldo, pago mínimo, fecha e interés; requiere confirmación.", CreateLiabilityArgs),
            _tool("memory_remember", "Propone recordar un dato explícito del usuario; requiere confirmación antes de persistirlo.", RememberMemoryArgs),
            _tool("memory_forget", "Propone olvidar un recuerdo confirmado usando su identificador; requiere confirmación.", ForgetMemoryArgs),
            _tool("profile_get", "Consulta únicamente los datos del perfil confirmados por el usuario.", EmptyArgs),
            _tool("profile_update", "Propone actualizar datos explícitos del perfil; requiere confirmación.", UpdateProfileArgs),
        ]

    @property
    def definitions(self) -> list[dict[str, Any]]:
        return self._definitions

    def execute(
        self, *, name: str, arguments: dict[str, Any], request_id: str
    ) -> ToolResult | ActionProposal:
        try:
            if name == "secretary_sync_unread_emails":
                EmptyArgs.model_validate(arguments)
                if self.email_gateway is None:
                    return ToolResult(
                        name=name, agent=AgentName.SECRETARY,
                        data={"status": "not_configured", "messages": []},
                    )
                messages = self.email_gateway.fetch_unread(limit=30)
                imported = sum(1 for message in messages if self.repository.upsert_email(message))
                return ToolResult(
                    name=name, agent=AgentName.SECRETARY,
                    data={"status": "synced", "imported": imported, "messages": self.repository.list_unread_emails(limit=10)},
                )
            if name == "secretary_list_unread_emails":
                args = ListEmailArgs.model_validate(arguments)
                data = {"messages": self.repository.list_unread_emails(**args.model_dump())}
                return ToolResult(name=name, agent=AgentName.SECRETARY, data=data)
            if name == "secretary_list_tasks":
                args = ListTasksArgs.model_validate(arguments)
                data = {"tasks": self.repository.list_tasks(**args.model_dump())}
                return ToolResult(name=name, agent=AgentName.SECRETARY, data=data)
            if name == "secretary_list_due_reminders":
                EmptyArgs.model_validate(arguments)
                return ToolResult(
                    name=name, agent=AgentName.SECRETARY,
                    data={"reminders": self.repository.list_due_reminders(at=datetime.now(UTC).isoformat())},
                )
            if name == "financial_get_summary":
                args = FinancialSummaryArgs.model_validate(arguments)
                return ToolResult(name=name, agent=AgentName.FINANCIAL, data=self.repository.financial_summary(month=args.month))
            if name == "financial_list_liabilities":
                EmptyArgs.model_validate(arguments)
                return ToolResult(name=name, agent=AgentName.FINANCIAL, data={"liabilities": self.repository.list_liabilities()})
            if name == "profile_get":
                EmptyArgs.model_validate(arguments)
                return ToolResult(name=name, agent=AgentName.ORCHESTRATOR, data={"profile": self.repository.get_profile()})
            if name == "secretary_create_task":
                args = CreateTaskArgs.model_validate(arguments)
                values = args.model_dump(mode="json")
                return self._proposal(
                    request_id, name, values, "Crear tarea",
                    f"{args.title} · prioridad {args.priority} · vence {args.due_at.isoformat() if args.due_at else 'sin fecha'}",
                )
            if name == "secretary_draft_email":
                args = DraftEmailArgs.model_validate(arguments)
                values = args.model_dump(mode="json")
                return self._proposal(request_id, name, values, "Guardar borrador", f"Para {args.to_address} · {args.subject}")
            if name == "financial_record_transaction":
                args = RecordTransactionArgs.model_validate(arguments)
                values = args.model_dump(mode="json")
                return self._proposal(
                    request_id, name, values, "Registrar movimiento",
                    f"{args.transaction_type} {args.amount_minor} {args.currency.upper()} · {args.merchant}",
                )
            if name == "financial_create_savings_goal":
                args = CreateSavingsGoalArgs.model_validate(arguments)
                values = args.model_dump(mode="json")
                return self._proposal(
                    request_id, name, values, "Crear meta de ahorro",
                    f"{args.name} · objetivo {args.target_minor} {args.currency.upper()}",
                )
            if name == "financial_create_liability":
                args = CreateLiabilityArgs.model_validate(arguments)
                values = args.model_dump(mode="json")
                return self._proposal(
                    request_id, name, values, "Registrar obligación",
                    f"{args.name} · saldo {args.outstanding_minor} · vence {args.due_date.isoformat()}",
                )
            if name == "memory_remember":
                args = RememberMemoryArgs.model_validate(arguments)
                values = args.model_dump(mode="json")
                return self._proposal(
                    request_id, name, values, "Guardar recuerdo", args.content,
                )
            if name == "memory_forget":
                args = ForgetMemoryArgs.model_validate(arguments)
                memory = self.repository.get_memory(args.memory_id)
                return self._proposal(
                    request_id, name, args.model_dump(), "Olvidar recuerdo", memory["content"],
                )
            if name == "profile_update":
                args = UpdateProfileArgs.model_validate(arguments)
                values = args.model_dump(mode="json", exclude_unset=True)
                return self._proposal(
                    request_id, name, values, "Actualizar perfil",
                    "Actualizar: " + ", ".join(sorted(values)),
                )
        except ValidationError as error:
            raise ToolExecutionError(f"Argumentos inválidos para {name}: {error.errors(include_url=False)}") from error
        raise ToolExecutionError(f"La herramienta {name!r} no está permitida.")

    def _proposal(
        self, request_id: str, tool_name: str, arguments: dict[str, Any], title: str, detail: str
    ) -> ActionProposal:
        encoded = json.dumps(arguments, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
        request_hash = hashlib.sha256(f"{request_id}\n{tool_name}\n{encoded}".encode()).hexdigest()
        row = self.repository.save_proposal(
            request_hash=request_hash, tool_name=tool_name, arguments=arguments, title=title, detail=detail
        )
        return ActionProposal.model_validate(row)

    def confirm(self, identifier: str) -> tuple[ActionProposal, dict[str, Any], bool]:
        try:
            with self.repository.database.transaction() as connection:
                row = self.repository.get_proposal(identifier, connection=connection)
                if row is None:
                    raise ToolExecutionError("No encontré la propuesta solicitada.")
                proposal = ActionProposal.model_validate(row)
                if row["status"] == "cancelled":
                    raise ToolExecutionError("La propuesta fue cancelada y no puede ejecutarse.")
                if row["status"] == "confirmed":
                    result = json.loads(row["result_json"] or "{}")
                    return proposal, result, True
                arguments = json.loads(row["arguments_json"])
                result = self._apply_confirmed(row["tool_name"], arguments, connection)
                now = datetime.now(UTC).isoformat()
                connection.execute(
                    "UPDATE proposed_actions SET status='confirmed',result_json=?,confirmed_at=? WHERE id=? AND status='pending'",
                    (json.dumps(result, ensure_ascii=False, sort_keys=True), now, identifier),
                )
                return proposal.model_copy(update={"status": "confirmed"}), result, False
        except IntegrityError as error:
            raise ToolExecutionError("No pude confirmar el cambio porque una referencia ya no es válida.") from error

    def _apply_confirmed(self, tool_name: str, arguments: dict[str, Any], connection: Any) -> dict[str, Any]:
        if tool_name == "secretary_create_task":
            args = CreateTaskArgs.model_validate(arguments)
            return self.repository.create_task(
                title=args.title, priority=args.priority,
                due_at=args.due_at.astimezone(UTC).isoformat() if args.due_at else None,
                remind_at=args.remind_at.astimezone(UTC).isoformat() if args.remind_at else None,
                connection=connection,
            )
        if tool_name == "secretary_draft_email":
            args = DraftEmailArgs.model_validate(arguments)
            return self.repository.create_email_draft(
                to_address=str(args.to_address), subject=args.subject, body_text=args.body_text,
                reply_to_message_id=args.reply_to_message_id, connection=connection,
            )
        if tool_name == "financial_record_transaction":
            args = RecordTransactionArgs.model_validate(arguments)
            return self.repository.create_transaction(
                amount_minor=args.amount_minor, currency=args.currency.upper(), merchant=args.merchant,
                category=args.category, occurred_at=args.occurred_at.astimezone(UTC).isoformat(),
                transaction_type=args.transaction_type, payment_method=args.payment_method,
                source="voice", connection=connection,
            )
        if tool_name == "financial_create_savings_goal":
            args = CreateSavingsGoalArgs.model_validate(arguments)
            if args.saved_minor > args.target_minor:
                raise ToolExecutionError("El ahorro inicial no puede superar el objetivo.")
            return self.repository.create_savings_goal(
                name=args.name, target_minor=args.target_minor, saved_minor=args.saved_minor,
                currency=args.currency.upper(), target_date=args.target_date.isoformat() if args.target_date else None,
                connection=connection,
            )
        if tool_name == "financial_create_liability":
            args = CreateLiabilityArgs.model_validate(arguments)
            if args.outstanding_minor > args.principal_minor and args.principal_minor > 0:
                raise ToolExecutionError("El saldo pendiente no puede superar el principal registrado.")
            return self.repository.create_liability(
                name=args.name, kind=args.kind, principal_minor=args.principal_minor,
                outstanding_minor=args.outstanding_minor,
                credit_limit_minor=args.credit_limit_minor, statement_day=args.statement_day,
                minimum_payment_minor=args.minimum_payment_minor,
                due_date=args.due_date.isoformat(), annual_interest_bps=args.annual_interest_bps,
                account_id=args.account_id, connection=connection,
            )
        if tool_name == "memory_remember":
            args = RememberMemoryArgs.model_validate(arguments)
            return self.repository.create_memory(
                kind=args.kind,
                content=args.content,
                importance=args.importance,
                expires_at=args.expires_at.astimezone(UTC).isoformat() if args.expires_at else None,
                source="conversation",
                connection=connection,
            )
        if tool_name == "memory_forget":
            args = ForgetMemoryArgs.model_validate(arguments)
            if not self.repository.forget_memory(args.memory_id, connection=connection):
                raise ToolExecutionError("El recuerdo ya no está activo o no existe.")
            return {"id": args.memory_id, "status": "forgotten"}
        if tool_name == "profile_update":
            args = UpdateProfileArgs.model_validate(arguments)
            return self.repository.update_profile(
                args.model_dump(mode="json", exclude_unset=True), connection=connection
            )
        raise ToolExecutionError("La propuesta usa una herramienta que ya no está disponible.")


def route_from_results(results: list[ToolResult], proposals: list[ActionProposal]) -> AgentName:
    agents = {result.agent for result in results}
    for proposal in proposals:
        if proposal.tool_name.startswith("secretary_"):
            agents.add(AgentName.SECRETARY)
        if proposal.tool_name.startswith("financial_"):
            agents.add(AgentName.FINANCIAL)
    if len(agents) > 1:
        return AgentName.COMPOSITE
    return next(iter(agents), AgentName.ORCHESTRATOR)

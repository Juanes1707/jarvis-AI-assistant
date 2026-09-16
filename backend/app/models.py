from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from typing import Any, Literal
import uuid

from pydantic import BaseModel, ConfigDict, Field, field_validator


class AgentName(StrEnum):
    ORCHESTRATOR = "orchestrator"
    SECRETARY = "secretary"
    FINANCIAL = "financial"
    COMPOSITE = "composite"


class AssistantRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    text: str = Field(min_length=1, max_length=4_000)
    conversation_id: str | None = Field(default=None, max_length=100)
    request_id: str = Field(default_factory=lambda: str(uuid.uuid4()), min_length=8, max_length=100)


class ToolResult(BaseModel):
    name: str
    agent: AgentName
    data: dict[str, Any]


class ActionProposal(BaseModel):
    id: str
    tool_name: str
    title: str
    detail: str
    status: Literal["pending", "confirmed", "cancelled"] = "pending"


class AssistantResponse(BaseModel):
    message: str
    route: AgentName
    tool_results: list[ToolResult] = Field(default_factory=list)
    proposals: list[ActionProposal] = Field(default_factory=list)


class ConfirmActionResponse(BaseModel):
    proposal: ActionProposal
    result: dict[str, Any]
    replayed: bool


class BankWebhookRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    event_id: str = Field(min_length=1, max_length=200)
    source: str = Field(min_length=1, max_length=80)
    raw_text: str = Field(min_length=1, max_length=20_000)
    received_at: datetime | None = None


class BankWebhookResponse(BaseModel):
    event_id: str
    status: Literal["created", "duplicate", "ignored"]
    transaction_id: str | None = None
    reason: str | None = None


class StructuredBankTransaction(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    is_transaction: bool
    amount_minor: int | None = Field(default=None, gt=0, le=9_223_372_036_854_775_807)
    currency: str | None = Field(default=None, min_length=3, max_length=3)
    merchant: str | None = Field(default=None, max_length=180)
    occurred_at: datetime | None = None
    payment_method: str | None = Field(default=None, max_length=100)
    category: Literal[
        "food", "transport", "services", "education", "leisure", "health", "housing", "other"
    ] | None = None
    confidence: float = Field(ge=0, le=1)

    @field_validator("currency")
    @classmethod
    def uppercase_currency(cls, value: str | None) -> str | None:
        return value.upper() if value else value


class EmailSyncResponse(BaseModel):
    imported: int
    provider: str


class AgentStatus(BaseModel):
    backend: Literal["available"] = "available"
    llm: Literal["available", "unavailable", "error"]
    email: Literal["configured", "not_configured"]
    database: Literal["available"] = "available"
    model: str
    detail: str | None = None

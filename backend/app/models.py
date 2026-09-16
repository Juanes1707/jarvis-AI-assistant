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


class UserProfile(BaseModel):
    user_id: str
    display_name: str | None = None
    preferred_name: str | None = None
    timezone: str | None = None
    locale: str | None = None
    country: str | None = None
    city: str | None = None
    occupation: str | None = None
    study_program: str | None = None
    onboarding_completed: bool = False
    created_at: datetime
    updated_at: datetime

    @field_validator("created_at", "updated_at", mode="before")
    @classmethod
    def parse_database_datetime(cls, value: object) -> object:
        if isinstance(value, str):
            return datetime.fromisoformat(value)
        return value


class UserProfileUpdate(BaseModel):
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


class MemoryCreate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    kind: Literal["preference", "fact", "goal", "constraint"]
    content: str = Field(min_length=1, max_length=2_000)
    importance: int = Field(default=3, ge=1, le=5)
    expires_at: datetime | None = None


class MemoryRecord(BaseModel):
    id: str
    user_id: str
    kind: Literal["preference", "fact", "goal", "constraint"]
    content: str
    source: Literal["manual", "conversation", "import"]
    importance: int
    status: Literal["active", "forgotten"]
    expires_at: datetime | None = None
    confirmed_at: datetime
    forgotten_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class MemoryListResponse(BaseModel):
    memories: list[MemoryRecord]

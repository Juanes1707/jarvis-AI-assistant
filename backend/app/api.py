from __future__ import annotations

import asyncio
import hmac
from dataclasses import dataclass
from fastapi import Depends, FastAPI, Header, HTTPException, Query, Response, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .agents import ToolExecutionError, ToolRegistry
from .bank_ingestion import BankIngestionService
from .config import Settings
from .database import Database
from .email_gateway import EmailNotConfiguredError, ImapEmailGateway
from .llm import LLMError, OllamaClient
from .models import (
    AgentStatus,
    AssistantRequest,
    AssistantResponse,
    BankWebhookRequest,
    BankWebhookResponse,
    ConfirmActionResponse,
    EmailSyncResponse,
    MemoryCreate,
    MemoryListResponse,
    MemoryRecord,
    UserProfile,
    UserProfileUpdate,
    WorkspaceSnapshot,
)
from .orchestrator import Orchestrator
from .repositories import JarvisRepository


@dataclass(slots=True)
class Services:
    settings: Settings
    database: Database
    repository: JarvisRepository
    model: OllamaClient
    tools: ToolRegistry
    orchestrator: Orchestrator
    bank_ingestion: BankIngestionService
    email: ImapEmailGateway


def build_services(settings: Settings) -> Services:
    database_target = settings.database_url or settings.database_path
    if database_target is None:
        raise ValueError("No se configuró la base de datos del backend.")
    database = Database(database_target)
    database.initialize()
    repository = JarvisRepository(database)
    model = OllamaClient(settings.ollama_url, settings.ollama_model)
    email = ImapEmailGateway(settings)
    tools = ToolRegistry(repository, email if settings.email_configured else None)
    return Services(
        settings=settings,
        database=database,
        repository=repository,
        model=model,
        tools=tools,
        orchestrator=Orchestrator(model, tools, repository),
        bank_ingestion=BankIngestionService(database, repository, model),
        email=email,
    )


def create_app(settings: Settings) -> FastAPI:
    services = build_services(settings)
    app = FastAPI(
        title="JARVIS local multi-agent backend",
        version="1.0.0",
        docs_url="/docs",
        redoc_url=None,
    )
    app.state.services = services
    bearer = HTTPBearer(auto_error=False)

    async def require_api_token(
        credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    ) -> None:
        supplied = credentials.credentials if credentials and credentials.scheme.lower() == "bearer" else ""
        if not hmac.compare_digest(supplied, settings.api_token):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credencial inválida.")

    async def require_webhook_token(
        x_jarvis_webhook_token: str | None = Header(default=None),
    ) -> None:
        if not hmac.compare_digest(x_jarvis_webhook_token or "", settings.webhook_token):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credencial de webhook inválida.")

    @app.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/v1/agents/status", response_model=AgentStatus, dependencies=[Depends(require_api_token)])
    async def agents_status() -> AgentStatus:
        available, detail = await asyncio.to_thread(services.model.check)
        return AgentStatus(
            llm="available" if available else ("error" if detail and "conectar" in detail else "unavailable"),
            email="configured" if settings.email_configured else "not_configured",
            model=settings.ollama_model,
            detail=detail,
        )

    @app.get("/v1/profile", response_model=UserProfile, dependencies=[Depends(require_api_token)])
    async def get_profile() -> UserProfile:
        return UserProfile.model_validate(await asyncio.to_thread(services.repository.get_profile))

    @app.get("/v1/workspace", response_model=WorkspaceSnapshot, dependencies=[Depends(require_api_token)])
    async def get_workspace(
        month: str = Query(pattern=r"^\d{4}-(0[1-9]|1[0-2])$"),
    ) -> WorkspaceSnapshot:
        snapshot = await asyncio.to_thread(services.repository.workspace_snapshot, month=month)
        return WorkspaceSnapshot.model_validate(snapshot)

    @app.patch("/v1/profile", response_model=UserProfile, dependencies=[Depends(require_api_token)])
    async def update_profile(update: UserProfileUpdate) -> UserProfile:
        values = update.model_dump(exclude_unset=True)
        profile = await asyncio.to_thread(services.repository.update_profile, values)
        return UserProfile.model_validate(profile)

    @app.get("/v1/memories", response_model=MemoryListResponse, dependencies=[Depends(require_api_token)])
    async def list_memories(
        query: str | None = Query(default=None, max_length=200),
        kind: str | None = Query(default=None, pattern="^(preference|fact|goal|constraint)$"),
        limit: int = Query(default=20, ge=1, le=50),
    ) -> MemoryListResponse:
        memories = await asyncio.to_thread(
            services.repository.list_memories, query=query, kind=kind, limit=limit
        )
        return MemoryListResponse(memories=[MemoryRecord.model_validate(item) for item in memories])

    @app.post(
        "/v1/memories", response_model=MemoryRecord, status_code=status.HTTP_201_CREATED,
        dependencies=[Depends(require_api_token)],
    )
    async def create_memory(memory: MemoryCreate) -> MemoryRecord:
        item = await asyncio.to_thread(
            services.repository.create_memory,
            kind=memory.kind,
            content=memory.content,
            importance=memory.importance,
            expires_at=memory.expires_at.isoformat() if memory.expires_at else None,
        )
        return MemoryRecord.model_validate(item)

    @app.delete(
        "/v1/memories/{memory_id}", status_code=status.HTTP_204_NO_CONTENT,
        dependencies=[Depends(require_api_token)],
    )
    async def forget_memory(memory_id: str) -> Response:
        forgotten = await asyncio.to_thread(services.repository.forget_memory, memory_id)
        if not forgotten:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No encontré el recuerdo solicitado.")
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    @app.post("/v1/assistant/messages", response_model=AssistantResponse, dependencies=[Depends(require_api_token)])
    async def assistant_message(request: AssistantRequest) -> AssistantResponse:
        try:
            return await asyncio.to_thread(services.orchestrator.handle, request)
        except (LLMError, ToolExecutionError) as error:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(error)) from error

    @app.post("/v1/actions/{action_id}/confirm", response_model=ConfirmActionResponse, dependencies=[Depends(require_api_token)])
    async def confirm_action(action_id: str) -> ConfirmActionResponse:
        try:
            proposal, result, replayed = await asyncio.to_thread(services.tools.confirm, action_id)
            return ConfirmActionResponse(proposal=proposal, result=result, replayed=replayed)
        except ToolExecutionError as error:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error)) from error

    @app.post("/v1/emails/sync", response_model=EmailSyncResponse, dependencies=[Depends(require_api_token)])
    async def sync_emails() -> EmailSyncResponse:
        try:
            messages = await asyncio.to_thread(services.email.fetch_unread)
            imported = 0
            for message in messages:
                if services.repository.upsert_email(message):
                    imported += 1
            return EmailSyncResponse(imported=imported, provider="imap")
        except EmailNotConfiguredError as error:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error)) from error
        except Exception as error:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="No pude sincronizar el correo configurado.") from error

    @app.post("/v1/webhooks/bank-events", response_model=BankWebhookResponse, dependencies=[Depends(require_webhook_token)])
    async def bank_event(request: BankWebhookRequest) -> BankWebhookResponse:
        try:
            return await asyncio.to_thread(services.bank_ingestion.ingest, request)
        except (LLMError, ValueError) as error:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(error)) from error

    return app

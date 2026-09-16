from __future__ import annotations

from contextlib import contextmanager
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Iterator, Sequence

from sqlalchemy import create_engine, event, text
from sqlalchemy.engine import Connection, CursorResult, Engine, RowMapping
from sqlalchemy.pool import NullPool


MIGRATIONS: tuple[str, ...] = (
    """
    CREATE TABLE tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL CHECK(length(title) BETWEEN 1 AND 240),
      status TEXT NOT NULL CHECK(status IN ('PENDING','IN_PROGRESS','COMPLETED')),
      priority TEXT NOT NULL CHECK(priority IN ('LOW','MEDIUM','HIGH')),
      due_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE reminders (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      trigger_at TEXT NOT NULL,
      condition TEXT NOT NULL DEFAULT 'task_pending',
      status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','DELIVERED','CANCELLED')),
      created_at TEXT NOT NULL
    );
    CREATE INDEX reminders_pending_idx ON reminders(status, trigger_at);

    CREATE TABLE email_messages (
      id TEXT PRIMARY KEY,
      provider_id TEXT NOT NULL UNIQUE,
      thread_id TEXT NOT NULL,
      sender TEXT NOT NULL,
      recipients TEXT NOT NULL,
      subject TEXT NOT NULL,
      body_text TEXT NOT NULL,
      received_at TEXT NOT NULL,
      unread INTEGER NOT NULL CHECK(unread IN (0,1)),
      priority TEXT NOT NULL CHECK(priority IN ('normal','urgent')),
      created_at TEXT NOT NULL
    );
    CREATE INDEX email_messages_unread_idx ON email_messages(unread, received_at DESC);

    CREATE TABLE email_drafts (
      id TEXT PRIMARY KEY,
      reply_to_message_id TEXT REFERENCES email_messages(id) ON DELETE SET NULL,
      to_address TEXT NOT NULL,
      subject TEXT NOT NULL,
      body_text TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('DRAFT','SENT')),
      created_at TEXT NOT NULL,
      sent_at TEXT
    );

    CREATE TABLE financial_accounts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      kind TEXT NOT NULL CHECK(kind IN ('cash','checking','savings','credit','loan')),
      currency TEXT NOT NULL CHECK(length(currency) = 3),
      opening_balance_minor BIGINT NOT NULL,
      credit_limit_minor BIGINT,
      statement_day INTEGER CHECK(statement_day BETWEEN 1 AND 31),
      payment_day INTEGER CHECK(payment_day BETWEEN 1 AND 31),
      annual_interest_bps INTEGER CHECK(annual_interest_bps >= 0),
      active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1))
    );

    CREATE TABLE bank_ingestion_events (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      raw_text_hash TEXT NOT NULL,
      raw_text TEXT NOT NULL,
      structured_json TEXT,
      status TEXT NOT NULL CHECK(status IN ('PROCESSING','CREATED','IGNORED','FAILED')),
      error TEXT,
      received_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE transactions (
      id TEXT PRIMARY KEY,
      account_id TEXT REFERENCES financial_accounts(id) ON DELETE RESTRICT,
      ingestion_event_id TEXT UNIQUE REFERENCES bank_ingestion_events(id) ON DELETE RESTRICT,
      type TEXT NOT NULL CHECK(type IN ('INCOME','EXPENSE')),
      amount_minor BIGINT NOT NULL CHECK(amount_minor > 0),
      currency TEXT NOT NULL CHECK(length(currency) = 3),
      merchant TEXT NOT NULL,
      category TEXT NOT NULL,
      payment_method TEXT,
      occurred_at TEXT NOT NULL,
      source TEXT NOT NULL CHECK(source IN ('manual','voice','bank_webhook')),
      created_at TEXT NOT NULL
    );
    CREATE INDEX transactions_occurred_idx ON transactions(occurred_at DESC);

    CREATE TABLE liabilities (
      id TEXT PRIMARY KEY,
      account_id TEXT REFERENCES financial_accounts(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      kind TEXT NOT NULL CHECK(kind IN ('credit_card','loan')),
      principal_minor BIGINT NOT NULL CHECK(principal_minor >= 0),
      outstanding_minor BIGINT NOT NULL CHECK(outstanding_minor >= 0),
      credit_limit_minor BIGINT CHECK(credit_limit_minor IS NULL OR credit_limit_minor > 0),
      statement_day INTEGER CHECK(statement_day IS NULL OR statement_day BETWEEN 1 AND 31),
      minimum_payment_minor BIGINT NOT NULL CHECK(minimum_payment_minor >= 0),
      due_date TEXT NOT NULL,
      annual_interest_bps INTEGER NOT NULL CHECK(annual_interest_bps >= 0)
    );

    CREATE TABLE savings_goals (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      target_minor BIGINT NOT NULL CHECK(target_minor > 0),
      saved_minor BIGINT NOT NULL CHECK(saved_minor >= 0),
      currency TEXT NOT NULL CHECK(length(currency) = 3),
      target_date TEXT,
      CHECK(saved_minor <= target_minor)
    );

    CREATE TABLE proposed_actions (
      id TEXT PRIMARY KEY,
      request_hash TEXT NOT NULL UNIQUE,
      tool_name TEXT NOT NULL,
      arguments_json TEXT NOT NULL,
      title TEXT NOT NULL,
      detail TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('pending','confirmed','cancelled')),
      result_json TEXT,
      created_at TEXT NOT NULL,
      confirmed_at TEXT
    );

    CREATE TABLE agent_runs (
      id TEXT PRIMARY KEY,
      conversation_id TEXT,
      request_text TEXT NOT NULL,
      route TEXT NOT NULL,
      tool_names_json TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('SUCCEEDED','FAILED')),
      created_at TEXT NOT NULL
    );
    """,
    """
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL
    );

    CREATE TABLE user_profiles (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      display_name TEXT CHECK(display_name IS NULL OR length(display_name) BETWEEN 1 AND 120),
      preferred_name TEXT CHECK(preferred_name IS NULL OR length(preferred_name) BETWEEN 1 AND 80),
      timezone TEXT CHECK(timezone IS NULL OR length(timezone) BETWEEN 1 AND 100),
      locale TEXT CHECK(locale IS NULL OR length(locale) BETWEEN 2 AND 20),
      city TEXT CHECK(city IS NULL OR length(city) BETWEEN 1 AND 120),
      occupation TEXT CHECK(occupation IS NULL OR length(occupation) BETWEEN 1 AND 160),
      study_program TEXT CHECK(study_program IS NULL OR length(study_program) BETWEEN 1 AND 160),
      onboarding_completed INTEGER NOT NULL DEFAULT 0 CHECK(onboarding_completed IN (0,1)),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    INSERT INTO users(id, created_at) VALUES ('owner', CAST(CURRENT_TIMESTAMP AS TEXT));
    INSERT INTO user_profiles(user_id, created_at, updated_at)
    VALUES ('owner', CAST(CURRENT_TIMESTAMP AS TEXT), CAST(CURRENT_TIMESTAMP AS TEXT));
    """,
    """
    CREATE TABLE memories (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      kind TEXT NOT NULL CHECK(kind IN ('preference','fact','goal','constraint')),
      content TEXT NOT NULL CHECK(length(content) BETWEEN 1 AND 2000),
      source TEXT NOT NULL CHECK(source IN ('manual','conversation','import')),
      importance INTEGER NOT NULL CHECK(importance BETWEEN 1 AND 5),
      status TEXT NOT NULL CHECK(status IN ('active','forgotten')),
      expires_at TEXT,
      confirmed_at TEXT NOT NULL,
      forgotten_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX memories_active_idx ON memories(user_id, status, importance DESC, updated_at DESC);
    """,
    """
    CREATE TABLE conversations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE conversation_messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      request_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user','assistant')),
      content TEXT NOT NULL CHECK(length(content) BETWEEN 1 AND 20000),
      created_at TEXT NOT NULL,
      UNIQUE(conversation_id, request_id, role)
    );
    CREATE INDEX conversation_messages_recent_idx
      ON conversation_messages(conversation_id, created_at DESC);
    """,
    """
    ALTER TABLE user_profiles ADD COLUMN country TEXT
      CHECK(country IS NULL OR length(country) BETWEEN 1 AND 120);
    """,
)


class ResultAdapter:
    def __init__(self, result: CursorResult[Any]):
        self._result = result

    @property
    def rowcount(self) -> int:
        return self._result.rowcount

    def fetchone(self) -> RowMapping | None:
        row = self._result.mappings().fetchone()
        return row

    def __iter__(self) -> Iterator[RowMapping]:
        return iter(self._result.mappings())


class ConnectionAdapter:
    def __init__(self, connection: Connection):
        self._connection = connection

    def execute(self, statement: str, parameters: Sequence[Any] = ()) -> ResultAdapter:
        parts = statement.split("?")
        placeholder_count = len(parts) - 1
        if placeholder_count != len(parameters):
            raise ValueError("La cantidad de parámetros SQL no coincide con la consulta.")
        if placeholder_count:
            chunks: list[str] = [parts[0]]
            bindings: dict[str, Any] = {}
            for index, value in enumerate(parameters):
                name = f"value_{index}"
                chunks.extend((f":{name}", parts[index + 1]))
                bindings[name] = value
            statement = "".join(chunks)
        else:
            bindings = {}
        return ResultAdapter(self._connection.execute(text(statement), bindings))

    def close(self) -> None:
        self._connection.close()


def _sqlite_url(path: Path) -> str:
    resolved = path.resolve()
    resolved.parent.mkdir(parents=True, exist_ok=True)
    return f"sqlite:///{resolved.as_posix()}"


def _migration_statements(script: str) -> Iterator[str]:
    for statement in script.split(";"):
        cleaned = statement.strip()
        if cleaned:
            yield cleaned


class Database:
    def __init__(self, target: Path | str):
        url = _sqlite_url(target) if isinstance(target, Path) else target
        if not url:
            raise ValueError("La configuración de base de datos está vacía.")
        options: dict[str, Any] = {"pool_pre_ping": True, "hide_parameters": True}
        if url.startswith("sqlite:"):
            options["connect_args"] = {"timeout": 10}
            options["poolclass"] = NullPool
        self.engine: Engine = create_engine(url, **options)
        self.dialect = self.engine.dialect.name
        if self.dialect == "sqlite":
            event.listen(self.engine, "connect", self._configure_sqlite)

    @staticmethod
    def _configure_sqlite(dbapi_connection: Any, _connection_record: Any) -> None:
        cursor = dbapi_connection.cursor()
        try:
            cursor.execute("PRAGMA foreign_keys = ON")
            cursor.execute("PRAGMA busy_timeout = 5000")
        finally:
            cursor.close()

    def connect(self) -> ConnectionAdapter:
        return ConnectionAdapter(self.engine.connect())

    def initialize(self) -> None:
        with self.engine.begin() as connection:
            connection.execute(text(
                "CREATE TABLE IF NOT EXISTS schema_migrations "
                "(version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)"
            ))
            applied = {
                row["version"]
                for row in connection.execute(text("SELECT version FROM schema_migrations")).mappings()
            }
            for version, script in enumerate(MIGRATIONS, start=1):
                if version in applied:
                    continue
                for statement in _migration_statements(script):
                    connection.execute(text(statement))
                connection.execute(
                    text(
                        "INSERT INTO schema_migrations(version, applied_at) "
                        "VALUES (:version, :applied_at)"
                    ),
                    {"version": version, "applied_at": datetime.now(UTC).isoformat()},
                )

    @contextmanager
    def session(self) -> Iterator[ConnectionAdapter]:
        connection = self.connect()
        try:
            yield connection
        finally:
            connection.close()

    @contextmanager
    def transaction(self) -> Iterator[ConnectionAdapter]:
        with self.engine.begin() as connection:
            yield ConnectionAdapter(connection)

    def dispose(self) -> None:
        self.engine.dispose()

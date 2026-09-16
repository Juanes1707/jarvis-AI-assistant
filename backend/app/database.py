from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator


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
      opening_balance_minor INTEGER NOT NULL,
      credit_limit_minor INTEGER,
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
      amount_minor INTEGER NOT NULL CHECK(amount_minor > 0),
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
      principal_minor INTEGER NOT NULL CHECK(principal_minor >= 0),
      outstanding_minor INTEGER NOT NULL CHECK(outstanding_minor >= 0),
      credit_limit_minor INTEGER CHECK(credit_limit_minor IS NULL OR credit_limit_minor > 0),
      statement_day INTEGER CHECK(statement_day IS NULL OR statement_day BETWEEN 1 AND 31),
      minimum_payment_minor INTEGER NOT NULL CHECK(minimum_payment_minor >= 0),
      due_date TEXT NOT NULL,
      annual_interest_bps INTEGER NOT NULL CHECK(annual_interest_bps >= 0)
    );

    CREATE TABLE savings_goals (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      target_minor INTEGER NOT NULL CHECK(target_minor > 0),
      saved_minor INTEGER NOT NULL CHECK(saved_minor >= 0),
      currency TEXT NOT NULL CHECK(length(currency) = 3),
      target_date TEXT,
      CHECK(saved_minor <= target_minor)
    );

    CREATE TABLE proposed_actions (
      id TEXT PRIMARY KEY,
      request_hash TEXT NOT NULL UNIQUE,
      tool_name TEXT NOT NULL,
      arguments_json TEXT NOT NULL CHECK(json_valid(arguments_json)),
      title TEXT NOT NULL,
      detail TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('pending','confirmed','cancelled')),
      result_json TEXT CHECK(result_json IS NULL OR json_valid(result_json)),
      created_at TEXT NOT NULL,
      confirmed_at TEXT
    );

    CREATE TABLE agent_runs (
      id TEXT PRIMARY KEY,
      conversation_id TEXT,
      request_text TEXT NOT NULL,
      route TEXT NOT NULL,
      tool_names_json TEXT NOT NULL CHECK(json_valid(tool_names_json)),
      status TEXT NOT NULL CHECK(status IN ('SUCCEEDED','FAILED')),
      created_at TEXT NOT NULL
    );
    """,
)


class Database:
    def __init__(self, path: Path):
        self.path = path

    def connect(self) -> sqlite3.Connection:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        connection = sqlite3.connect(self.path, timeout=10, isolation_level=None)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        connection.execute("PRAGMA journal_mode = WAL")
        connection.execute("PRAGMA busy_timeout = 5000")
        return connection

    def initialize(self) -> None:
        with self.session() as connection:
            connection.execute(
                "CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)"
            )
            applied = {
                row["version"]
                for row in connection.execute("SELECT version FROM schema_migrations")
            }
            for version, sql in enumerate(MIGRATIONS, start=1):
                if version in applied:
                    continue
                try:
                    connection.executescript(
                        f"BEGIN IMMEDIATE;\n{sql}\n"
                        f"INSERT INTO schema_migrations(version, applied_at) VALUES ({version}, datetime('now'));\n"
                        "COMMIT;"
                    )
                except Exception:
                    if connection.in_transaction:
                        connection.rollback()
                    raise

    @contextmanager
    def session(self) -> Iterator[sqlite3.Connection]:
        connection = self.connect()
        try:
            yield connection
        finally:
            connection.close()

    @contextmanager
    def transaction(self) -> Iterator[sqlite3.Connection]:
        connection = self.connect()
        try:
            connection.execute("BEGIN IMMEDIATE")
            yield connection
            connection.commit()
        except Exception:
            connection.rollback()
            raise
        finally:
            connection.close()

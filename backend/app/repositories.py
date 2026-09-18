from __future__ import annotations

import json
import re
import uuid
from datetime import UTC, datetime
from typing import Any

from .database import ConnectionAdapter, Database


def utc_now() -> str:
    return datetime.now(UTC).isoformat()


def row_dict(row: Any) -> dict[str, Any]:
    return dict(row)


class JarvisRepository:
    def __init__(self, database: Database):
        self.database = database

    def get_profile(
        self, *, user_id: str = "owner", connection: ConnectionAdapter | None = None,
    ) -> dict[str, Any]:
        owns_connection = connection is None
        connection = connection or self.database.connect()
        try:
            row = connection.execute(
                """
                SELECT user_id,display_name,preferred_name,timezone,locale,country,city,
                       occupation,study_program,onboarding_completed,created_at,updated_at
                FROM user_profiles WHERE user_id=?
                """,
                (user_id,),
            ).fetchone()
        finally:
            if owns_connection:
                connection.close()
        if row is None:
            raise LookupError("No encontré el perfil solicitado.")
        profile = row_dict(row)
        profile["onboarding_completed"] = bool(profile["onboarding_completed"])
        return profile

    def update_profile(
        self, values: dict[str, Any], *, user_id: str = "owner",
        connection: ConnectionAdapter | None = None,
    ) -> dict[str, Any]:
        allowed = {
            "display_name", "preferred_name", "timezone", "locale", "country", "city",
            "occupation", "study_program", "onboarding_completed",
        }
        updates = {key: value for key, value in values.items() if key in allowed}
        if not updates:
            return self.get_profile(user_id=user_id, connection=connection)
        if "onboarding_completed" in updates:
            updates["onboarding_completed"] = int(bool(updates["onboarding_completed"]))
        updates["updated_at"] = utc_now()
        assignments = ",".join(f"{column}=?" for column in updates)
        owns_connection = connection is None
        context = self.database.transaction() if owns_connection else None
        if context:
            connection = context.__enter__()
        assert connection is not None
        try:
            cursor = connection.execute(
                f"UPDATE user_profiles SET {assignments} WHERE user_id=?",
                (*updates.values(), user_id),
            )
            if cursor.rowcount != 1:
                raise LookupError("No encontré el perfil solicitado.")
            result = self.get_profile(user_id=user_id, connection=connection)
            if context:
                context.__exit__(None, None, None)
            return result
        except Exception as error:
            if context:
                context.__exit__(type(error), error, error.__traceback__)
            raise

    def create_memory(
        self, *, kind: str, content: str, importance: int = 3,
        expires_at: str | None = None, source: str = "manual", user_id: str = "owner",
        connection: ConnectionAdapter | None = None,
    ) -> dict[str, Any]:
        identifier = str(uuid.uuid4())
        now = utc_now()
        values = (
            identifier, user_id, kind, content, source, importance, "active",
            expires_at, now, now, now,
        )
        sql = """
            INSERT INTO memories(
              id,user_id,kind,content,source,importance,status,expires_at,
              confirmed_at,created_at,updated_at
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?)
        """
        if connection is not None:
            connection.execute(sql, values)
        else:
            with self.database.transaction() as transaction:
                transaction.execute(sql, values)
        return self.get_memory(identifier, user_id=user_id, connection=connection)

    def get_memory(
        self, identifier: str, *, user_id: str = "owner",
        connection: ConnectionAdapter | None = None,
    ) -> dict[str, Any]:
        owns_connection = connection is None
        connection = connection or self.database.connect()
        try:
            row = connection.execute(
                "SELECT * FROM memories WHERE id=? AND user_id=?",
                (identifier, user_id),
            ).fetchone()
            if row is None:
                raise LookupError("No encontré el recuerdo solicitado.")
            return row_dict(row)
        finally:
            if owns_connection:
                connection.close()

    def list_memories(
        self, *, query: str | None = None, kind: str | None = None,
        limit: int = 20, user_id: str = "owner",
    ) -> list[dict[str, Any]]:
        sql = """
            SELECT * FROM memories
            WHERE user_id=? AND status='active'
              AND (expires_at IS NULL OR expires_at>?)
        """
        params: list[Any] = [user_id, utc_now()]
        if kind:
            sql += " AND kind=?"
            params.append(kind)
        if query and query.strip():
            terms = list(dict.fromkeys(
                term for term in re.findall(r"[\wáéíóúüñ]+", query.lower()) if len(term) >= 4
            ))[:8]
            if terms:
                sql += " AND (" + " OR ".join("lower(content) LIKE ?" for _ in terms) + ")"
                params.extend(f"%{term}%" for term in terms)
        sql += " ORDER BY importance DESC,updated_at DESC LIMIT ?"
        params.append(min(max(limit, 1), 50))
        with self.database.session() as connection:
            return [row_dict(row) for row in connection.execute(sql, params)]

    def forget_memory(
        self, identifier: str, *, user_id: str = "owner",
        connection: ConnectionAdapter | None = None,
    ) -> bool:
        now = utc_now()
        owns_connection = connection is None
        context = self.database.transaction() if owns_connection else None
        if context:
            connection = context.__enter__()
        assert connection is not None
        try:
            cursor = connection.execute(
                """
                UPDATE memories SET status='forgotten',forgotten_at=?,updated_at=?
                WHERE id=? AND user_id=? AND status='active'
                """,
                (now, now, identifier, user_id),
            )
            result = cursor.rowcount == 1
            if context:
                context.__exit__(None, None, None)
            return result
        except Exception as error:
            if context:
                context.__exit__(type(error), error, error.__traceback__)
            raise

    def record_conversation_turn(
        self, *, conversation_id: str, request_id: str,
        user_text: str, assistant_text: str, user_id: str = "owner",
    ) -> None:
        now = utc_now()
        with self.database.transaction() as connection:
            connection.execute(
                """
                INSERT INTO conversations(id,user_id,created_at,updated_at) VALUES (?,?,?,?)
                ON CONFLICT(id) DO UPDATE SET updated_at=excluded.updated_at
                """,
                (conversation_id, user_id, now, now),
            )
            for role, content in (("user", user_text), ("assistant", assistant_text)):
                connection.execute(
                    """
                    INSERT INTO conversation_messages(
                      id,conversation_id,request_id,role,content,created_at
                    ) VALUES (?,?,?,?,?,?)
                    ON CONFLICT(conversation_id,request_id,role) DO NOTHING
                    """,
                    (str(uuid.uuid4()), conversation_id, request_id, role, content, now),
                )

    def list_conversation_messages(
        self, conversation_id: str, *, exclude_request_id: str | None = None, limit: int = 12,
    ) -> list[dict[str, Any]]:
        params: list[Any] = [conversation_id]
        exclusion = ""
        if exclude_request_id:
            exclusion = " AND request_id!=?"
            params.append(exclude_request_id)
        params.append(min(max(limit, 1), 30))
        with self.database.session() as connection:
            rows = connection.execute(
                f"""
                SELECT role,content,request_id,created_at FROM (
                  SELECT role,content,request_id,created_at
                  FROM conversation_messages
                  WHERE conversation_id=?{exclusion}
                  ORDER BY created_at DESC, CASE role WHEN 'assistant' THEN 0 ELSE 1 END
                  LIMIT ?
                ) recent
                ORDER BY created_at, CASE role WHEN 'user' THEN 0 ELSE 1 END
                """,
                params,
            )
            return [row_dict(row) for row in rows]

    def list_tasks(self, *, status: str | None = None, limit: int = 20) -> list[dict[str, Any]]:
        query = """
            SELECT t.id,t.title,t.status,t.priority,t.due_at,t.subject_id,s.name AS subject_name
            FROM tasks t LEFT JOIN academic_subjects s ON s.id=t.subject_id
        """
        params: list[Any] = []
        if status:
            query += " WHERE t.status = ?"
            params.append(status)
        query += " ORDER BY CASE t.priority WHEN 'HIGH' THEN 0 WHEN 'MEDIUM' THEN 1 ELSE 2 END, t.due_at IS NULL, t.due_at LIMIT ?"
        params.append(min(max(limit, 1), 50))
        with self.database.session() as connection:
            return [row_dict(row) for row in connection.execute(query, params)]

    def list_subjects(
        self, *, query: str | None = None, active_only: bool = True, user_id: str = "owner",
    ) -> list[dict[str, Any]]:
        sql = "SELECT id,name,professor,credits,active,created_at,updated_at FROM academic_subjects WHERE user_id=?"
        params: list[Any] = [user_id]
        if active_only:
            sql += " AND active=1"
        if query and query.strip():
            sql += " AND normalized_name LIKE ?"
            params.append(f"%{query.strip().casefold()}%")
        sql += " ORDER BY name"
        with self.database.session() as connection:
            rows = [row_dict(row) for row in connection.execute(sql, params)]
        for row in rows:
            row["active"] = bool(row["active"])
        return rows

    def create_subject(
        self, *, name: str, credits: int, professor: str | None = None,
        user_id: str = "owner", connection: ConnectionAdapter | None = None,
    ) -> dict[str, Any]:
        identifier = str(uuid.uuid4())
        now = utc_now()
        values = (identifier, user_id, name, name.casefold(), professor, credits, now, now)
        sql = """
            INSERT INTO academic_subjects(
              id,user_id,name,normalized_name,professor,credits,active,created_at,updated_at
            ) VALUES (?,?,?,?,?,?,1,?,?)
        """
        if connection is not None:
            connection.execute(sql, values)
        else:
            with self.database.transaction() as transaction:
                transaction.execute(sql, values)
        return {
            "id": identifier, "name": name, "professor": professor,
            "credits": credits, "active": True, "created_at": now, "updated_at": now,
        }

    def find_subject_by_name(
        self, name: str, *, user_id: str = "owner", connection: ConnectionAdapter | None = None,
    ) -> dict[str, Any]:
        owns = connection is None
        connection = connection or self.database.connect()
        try:
            row = connection.execute(
                "SELECT id,name,professor,credits FROM academic_subjects WHERE user_id=? AND normalized_name=? AND active=1",
                (user_id, name.strip().casefold()),
            ).fetchone()
            if row is None:
                raise LookupError(f"No encontré la materia {name!r}.")
            return row_dict(row)
        finally:
            if owns:
                connection.close()

    def find_task(
        self, *, task_id: str | None = None, task_title: str | None = None,
        connection: ConnectionAdapter | None = None,
    ) -> dict[str, Any]:
        owns = connection is None
        connection = connection or self.database.connect()
        try:
            if task_id:
                rows = list(connection.execute(
                    "SELECT id,title,status,priority,due_at,subject_id FROM tasks WHERE id=?", (task_id,)
                ))
            else:
                rows = list(connection.execute(
                    "SELECT id,title,status,priority,due_at,subject_id FROM tasks WHERE lower(title)=lower(?)",
                    (task_title or "",),
                ))
            if not rows:
                raise LookupError("No encontré la tarea solicitada.")
            if len(rows) > 1:
                raise LookupError("Encontré varias tareas con ese título; necesito una referencia más específica.")
            return row_dict(rows[0])
        finally:
            if owns:
                connection.close()

    def list_due_reminders(self, *, at: str) -> list[dict[str, Any]]:
        with self.database.session() as connection:
            return [row_dict(row) for row in connection.execute(
                """
                SELECT r.id,r.task_id,r.trigger_at,r.condition,t.title,t.priority,t.due_at
                FROM reminders r JOIN tasks t ON t.id=r.task_id
                WHERE r.status='PENDING' AND r.trigger_at<=? AND t.status!='COMPLETED'
                ORDER BY r.trigger_at LIMIT 50
                """,
                (at,),
            )]

    def create_task(
        self, *, title: str, priority: str, due_at: str | None,
        remind_at: str | None = None, subject_name: str | None = None,
        connection: ConnectionAdapter | None = None,
    ) -> dict[str, Any]:
        identifier = str(uuid.uuid4())
        now = utc_now()
        subject = self.find_subject_by_name(subject_name, connection=connection) if subject_name else None
        if connection is not None:
            connection.execute(
                "INSERT INTO tasks(id,title,status,priority,due_at,created_at,updated_at,subject_id) VALUES (?,?,?,?,?,?,?,?)",
                (identifier, title, "PENDING", priority, due_at, now, now, subject["id"] if subject else None),
            )
            if remind_at:
                connection.execute(
                    "INSERT INTO reminders(id,task_id,trigger_at,condition,status,created_at) VALUES (?,?,?,'task_pending','PENDING',?)",
                    (str(uuid.uuid4()), identifier, remind_at, now),
                )
        else:
            with self.database.transaction() as transaction:
                transaction.execute(
                    "INSERT INTO tasks(id,title,status,priority,due_at,created_at,updated_at,subject_id) VALUES (?,?,?,?,?,?,?,?)",
                    (identifier, title, "PENDING", priority, due_at, now, now, subject["id"] if subject else None),
                )
                if remind_at:
                    transaction.execute(
                        "INSERT INTO reminders(id,task_id,trigger_at,condition,status,created_at) VALUES (?,?,?,'task_pending','PENDING',?)",
                        (str(uuid.uuid4()), identifier, remind_at, now),
                    )
        return {
            "id": identifier, "title": title, "status": "PENDING", "priority": priority,
            "due_at": due_at, "remind_at": remind_at,
            "subject_id": subject["id"] if subject else None,
            "subject_name": subject["name"] if subject else None,
        }

    def update_task_status(
        self, *, status: str, task_id: str | None = None, task_title: str | None = None,
        connection: ConnectionAdapter | None = None,
    ) -> dict[str, Any]:
        owns = connection is None
        context = self.database.transaction() if owns else None
        if context:
            connection = context.__enter__()
        assert connection is not None
        try:
            task = self.find_task(task_id=task_id, task_title=task_title, connection=connection)
            connection.execute(
                "UPDATE tasks SET status=?,updated_at=? WHERE id=?",
                (status, utc_now(), task["id"]),
            )
            result = {**task, "status": status}
            if context:
                context.__exit__(None, None, None)
            return result
        except Exception as error:
            if context:
                context.__exit__(type(error), error, error.__traceback__)
            raise

    def list_calendar_events(
        self, *, starts_after: str | None = None, starts_before: str | None = None,
        limit: int = 50, user_id: str = "owner",
    ) -> list[dict[str, Any]]:
        sql = """
            SELECT e.id,e.title,e.starts_at,e.ends_at,e.event_type,e.location,e.confirmed,
                   e.subject_id,s.name AS subject_name
            FROM calendar_events e
            LEFT JOIN academic_subjects s ON s.id=e.subject_id
            WHERE e.user_id=?
        """
        params: list[Any] = [user_id]
        if starts_after:
            sql += " AND e.ends_at>?"
            params.append(starts_after)
        if starts_before:
            sql += " AND e.starts_at<?"
            params.append(starts_before)
        sql += " ORDER BY e.starts_at LIMIT ?"
        params.append(min(max(limit, 1), 100))
        with self.database.session() as connection:
            rows = [row_dict(row) for row in connection.execute(sql, params)]
        for row in rows:
            row["confirmed"] = bool(row["confirmed"])
        return rows

    def create_calendar_event(
        self, *, title: str, starts_at: str, ends_at: str, event_type: str,
        subject_name: str | None = None, location: str | None = None,
        user_id: str = "owner", connection: ConnectionAdapter | None = None,
    ) -> dict[str, Any]:
        identifier = str(uuid.uuid4())
        now = utc_now()
        subject = self.find_subject_by_name(subject_name, user_id=user_id, connection=connection) if subject_name else None
        values = (
            identifier, user_id, subject["id"] if subject else None, title,
            starts_at, ends_at, event_type, location, now, now,
        )
        sql = """
            INSERT INTO calendar_events(
              id,user_id,subject_id,title,starts_at,ends_at,event_type,location,confirmed,created_at,updated_at
            ) VALUES (?,?,?,?,?,?,?,?,1,?,?)
        """
        if connection is not None:
            connection.execute(sql, values)
        else:
            with self.database.transaction() as transaction:
                transaction.execute(sql, values)
        return {
            "id": identifier, "title": title, "starts_at": starts_at, "ends_at": ends_at,
            "event_type": event_type, "location": location, "confirmed": True,
            "subject_id": subject["id"] if subject else None,
            "subject_name": subject["name"] if subject else None,
        }

    def list_unread_emails(self, *, sender_query: str | None = None, limit: int = 10) -> list[dict[str, Any]]:
        query = "SELECT id,thread_id,sender,subject,substr(body_text,1,2000) AS body_text,received_at,priority FROM email_messages WHERE unread = 1"
        params: list[Any] = []
        if sender_query:
            query += " AND lower(sender) LIKE ?"
            params.append(f"%{sender_query.lower()}%")
        query += " ORDER BY CASE priority WHEN 'urgent' THEN 0 ELSE 1 END, received_at DESC LIMIT ?"
        params.append(min(max(limit, 1), 30))
        with self.database.session() as connection:
            return [row_dict(row) for row in connection.execute(query, params)]

    def upsert_email(self, message: dict[str, Any]) -> bool:
        with self.database.transaction() as connection:
            existed = connection.execute(
                "SELECT 1 FROM email_messages WHERE provider_id=?", (message["provider_id"],)
            ).fetchone() is not None
            connection.execute(
                """
                INSERT INTO email_messages(
                  id,provider_id,thread_id,sender,recipients,subject,body_text,received_at,unread,priority,created_at
                ) VALUES (?,?,?,?,?,?,?,?,?,?,?)
                ON CONFLICT(provider_id) DO UPDATE SET
                  sender=excluded.sender, recipients=excluded.recipients, subject=excluded.subject,
                  body_text=excluded.body_text, received_at=excluded.received_at,
                  unread=excluded.unread, priority=excluded.priority
                """,
                (
                    message.get("id") or str(uuid.uuid4()), message["provider_id"], message["thread_id"],
                    message["sender"], message["recipients"], message["subject"], message["body_text"],
                    message["received_at"], int(message.get("unread", True)), message.get("priority", "normal"), utc_now(),
                ),
            )
            return not existed

    def create_email_draft(
        self, *, to_address: str, subject: str, body_text: str, reply_to_message_id: str | None = None,
        connection: sqlite3.Connection | None = None,
    ) -> dict[str, Any]:
        identifier = str(uuid.uuid4())
        if connection is not None:
            connection.execute(
                "INSERT INTO email_drafts(id,reply_to_message_id,to_address,subject,body_text,status,created_at) VALUES (?,?,?,?,?,'DRAFT',?)",
                (identifier, reply_to_message_id, to_address, subject, body_text, utc_now()),
            )
        else:
            with self.database.transaction() as transaction:
                transaction.execute(
                    "INSERT INTO email_drafts(id,reply_to_message_id,to_address,subject,body_text,status,created_at) VALUES (?,?,?,?,?,'DRAFT',?)",
                    (identifier, reply_to_message_id, to_address, subject, body_text, utc_now()),
                )
        return {"id": identifier, "to": to_address, "subject": subject, "status": "DRAFT"}

    def financial_summary(self, *, month: str) -> dict[str, Any]:
        with self.database.session() as connection:
            balances = connection.execute(
                """
                SELECT COALESCE(SUM(a.opening_balance_minor + COALESCE(t.delta,0)),0) AS available_minor
                FROM financial_accounts a
                LEFT JOIN (
                  SELECT account_id, SUM(CASE type WHEN 'INCOME' THEN amount_minor ELSE -amount_minor END) AS delta
                  FROM transactions GROUP BY account_id
                ) t ON t.account_id = a.id
                WHERE a.active = 1 AND a.kind IN ('cash','checking','savings')
                """
            ).fetchone()
            unassigned = connection.execute(
                """
                SELECT COALESCE(SUM(CASE type WHEN 'INCOME' THEN amount_minor ELSE -amount_minor END),0) AS delta
                FROM transactions WHERE account_id IS NULL
                """
            ).fetchone()
            flow = connection.execute(
                """
                SELECT
                  COALESCE(SUM(CASE WHEN type='INCOME' THEN amount_minor ELSE 0 END),0) AS income_minor,
                  COALESCE(SUM(CASE WHEN type='EXPENSE' THEN amount_minor ELSE 0 END),0) AS expense_minor
                FROM transactions WHERE substr(occurred_at,1,7)=?
                """,
                (month,),
            ).fetchone()
            obligations = connection.execute(
                "SELECT COALESCE(SUM(minimum_payment_minor),0) AS obligations_minor FROM liabilities WHERE substr(due_date,1,7)=?",
                (month,),
            ).fetchone()
            goals = [row_dict(row) for row in connection.execute(
                "SELECT id,name,target_minor,saved_minor,currency,target_date FROM savings_goals ORDER BY target_date IS NULL,target_date"
            )]
            budget = connection.execute(
                "SELECT id,amount_minor,currency FROM monthly_budgets WHERE user_id='owner' AND month=?",
                (month,),
            ).fetchone()
        available = int(balances["available_minor"]) + int(unassigned["delta"])
        committed = int(obligations["obligations_minor"])
        expense = int(flow["expense_minor"])
        budget_minor = int(budget["amount_minor"]) if budget else None
        return {
            "month": month,
            "available_minor": available,
            "income_minor": int(flow["income_minor"]),
            "expense_minor": expense,
            "budget_minor": budget_minor,
            "remaining_budget_minor": budget_minor - expense if budget_minor is not None else None,
            "projected_obligations_minor": committed,
            "discretionary_minor": available - committed,
            "currency": "COP",
            "savings_goals": goals,
        }

    def set_monthly_budget(
        self, *, month: str, amount_minor: int, currency: str, user_id: str = "owner",
        connection: ConnectionAdapter | None = None,
    ) -> dict[str, Any]:
        identifier = str(uuid.uuid4())
        now = utc_now()
        sql = """
            INSERT INTO monthly_budgets(id,user_id,month,amount_minor,currency,created_at,updated_at)
            VALUES (?,?,?,?,?,?,?)
            ON CONFLICT(user_id,month) DO UPDATE SET
              amount_minor=excluded.amount_minor,currency=excluded.currency,updated_at=excluded.updated_at
        """
        values = (identifier, user_id, month, amount_minor, currency, now, now)
        if connection is not None:
            connection.execute(sql, values)
            row = connection.execute(
                "SELECT id,month,amount_minor,currency,created_at,updated_at FROM monthly_budgets WHERE user_id=? AND month=?",
                (user_id, month),
            ).fetchone()
        else:
            with self.database.transaction() as transaction:
                transaction.execute(sql, values)
                row = transaction.execute(
                    "SELECT id,month,amount_minor,currency,created_at,updated_at FROM monthly_budgets WHERE user_id=? AND month=?",
                    (user_id, month),
                ).fetchone()
        assert row is not None
        return row_dict(row)

    def get_monthly_budget(
        self, *, month: str, user_id: str = "owner",
    ) -> dict[str, Any] | None:
        with self.database.session() as connection:
            row = connection.execute(
                """
                SELECT id,month,amount_minor,currency,created_at,updated_at
                FROM monthly_budgets WHERE user_id=? AND month=?
                """,
                (user_id, month),
            ).fetchone()
        return row_dict(row) if row else None

    def list_transactions(
        self, *, month: str | None = None, limit: int = 500,
    ) -> list[dict[str, Any]]:
        sql = """
            SELECT id,type,amount_minor,currency,merchant,category,payment_method,
                   occurred_at,source,created_at
            FROM transactions
        """
        params: list[Any] = []
        if month:
            sql += " WHERE substr(occurred_at,1,7)=?"
            params.append(month)
        sql += " ORDER BY occurred_at DESC LIMIT ?"
        params.append(min(max(limit, 1), 1000))
        with self.database.session() as connection:
            return [row_dict(row) for row in connection.execute(sql, params)]

    def workspace_snapshot(self, *, month: str) -> dict[str, Any]:
        return {
            "subjects": self.list_subjects(),
            "tasks": self.list_tasks(limit=50),
            "events": self.list_calendar_events(limit=100),
            "transactions": self.list_transactions(month=month),
            "budget": self.get_monthly_budget(month=month),
        }

    def list_liabilities(self) -> list[dict[str, Any]]:
        with self.database.session() as connection:
            return [row_dict(row) for row in connection.execute(
                "SELECT id,name,kind,principal_minor,outstanding_minor,credit_limit_minor,statement_day,minimum_payment_minor,due_date,annual_interest_bps FROM liabilities ORDER BY due_date"
            )]

    def create_liability(
        self, *, name: str, kind: str, principal_minor: int, outstanding_minor: int,
        credit_limit_minor: int | None, statement_day: int | None,
        minimum_payment_minor: int, due_date: str, annual_interest_bps: int,
        account_id: str | None = None, connection: ConnectionAdapter | None = None,
    ) -> dict[str, Any]:
        identifier = str(uuid.uuid4())
        values = (
            identifier, account_id, name, kind, principal_minor, outstanding_minor,
            credit_limit_minor, statement_day, minimum_payment_minor, due_date, annual_interest_bps,
        )
        sql = "INSERT INTO liabilities(id,account_id,name,kind,principal_minor,outstanding_minor,credit_limit_minor,statement_day,minimum_payment_minor,due_date,annual_interest_bps) VALUES (?,?,?,?,?,?,?,?,?,?,?)"
        if connection is not None:
            connection.execute(sql, values)
        else:
            with self.database.transaction() as transaction:
                transaction.execute(sql, values)
        return {
            "id": identifier, "name": name, "kind": kind, "principal_minor": principal_minor,
            "outstanding_minor": outstanding_minor, "minimum_payment_minor": minimum_payment_minor,
            "credit_limit_minor": credit_limit_minor, "statement_day": statement_day,
            "due_date": due_date, "annual_interest_bps": annual_interest_bps,
        }

    def create_savings_goal(
        self, *, name: str, target_minor: int, saved_minor: int, currency: str,
        target_date: str | None, connection: ConnectionAdapter | None = None,
    ) -> dict[str, Any]:
        identifier = str(uuid.uuid4())
        values = (identifier, name, target_minor, saved_minor, currency, target_date)
        sql = "INSERT INTO savings_goals(id,name,target_minor,saved_minor,currency,target_date) VALUES (?,?,?,?,?,?)"
        if connection is not None:
            connection.execute(sql, values)
        else:
            with self.database.transaction() as transaction:
                transaction.execute(sql, values)
        return {
            "id": identifier, "name": name, "target_minor": target_minor,
            "saved_minor": saved_minor, "currency": currency, "target_date": target_date,
        }

    def create_transaction(
        self,
        *,
        amount_minor: int,
        currency: str,
        merchant: str,
        category: str,
        occurred_at: str,
        transaction_type: str = "EXPENSE",
        payment_method: str | None = None,
        source: str = "manual",
        account_id: str | None = None,
        ingestion_event_id: str | None = None,
        connection: ConnectionAdapter | None = None,
    ) -> dict[str, Any]:
        identifier = str(uuid.uuid4())
        owns_connection = connection is None
        context = self.database.transaction() if owns_connection else None
        if context:
            connection = context.__enter__()
        assert connection is not None
        try:
            connection.execute(
                """
                INSERT INTO transactions(
                  id,account_id,ingestion_event_id,type,amount_minor,currency,merchant,category,payment_method,occurred_at,source,created_at
                ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
                """,
                (
                    identifier, account_id, ingestion_event_id, transaction_type, amount_minor, currency,
                    merchant, category, payment_method, occurred_at, source, utc_now(),
                ),
            )
            if context:
                context.__exit__(None, None, None)
        except Exception as error:
            if context:
                context.__exit__(type(error), error, error.__traceback__)
            raise
        return {
            "id": identifier, "type": transaction_type, "amount_minor": amount_minor,
            "currency": currency, "merchant": merchant, "category": category,
            "occurred_at": occurred_at, "source": source,
        }

    def save_proposal(
        self, *, request_hash: str, tool_name: str, arguments: dict[str, Any], title: str, detail: str
    ) -> dict[str, Any]:
        identifier = str(uuid.uuid4())
        with self.database.transaction() as connection:
            connection.execute(
                """
                INSERT INTO proposed_actions(id,request_hash,tool_name,arguments_json,title,detail,status,created_at)
                VALUES (?,?,?,?,?,?,'pending',?) ON CONFLICT(request_hash) DO NOTHING
                """,
                (identifier, request_hash, tool_name, json.dumps(arguments, ensure_ascii=False, sort_keys=True), title, detail, utc_now()),
            )
            row = connection.execute(
                "SELECT id,tool_name,title,detail,status FROM proposed_actions WHERE request_hash=?", (request_hash,)
            ).fetchone()
        assert row is not None
        return row_dict(row)

    def get_proposal(self, identifier: str, *, connection: ConnectionAdapter | None = None) -> dict[str, Any] | None:
        owns = connection is None
        connection = connection or self.database.connect()
        try:
            row = connection.execute("SELECT * FROM proposed_actions WHERE id=?", (identifier,)).fetchone()
            return row_dict(row) if row else None
        finally:
            if owns:
                connection.close()

    def count(self, table: str) -> int:
        allowed = {"tasks", "transactions", "email_messages", "email_drafts", "bank_ingestion_events", "memories"}
        if table not in allowed:
            raise ValueError("Tabla no permitida")
        with self.database.session() as connection:
            return int(connection.execute(f"SELECT COUNT(*) AS count FROM {table}").fetchone()["count"])

    def log_agent_run(
        self, *, conversation_id: str | None, request_text: str, route: str, tool_names: list[str], status: str
    ) -> None:
        with self.database.transaction() as connection:
            connection.execute(
                "INSERT INTO agent_runs(id,conversation_id,request_text,route,tool_names_json,status,created_at) VALUES (?,?,?,?,?,?,?)",
                (str(uuid.uuid4()), conversation_id, request_text, route, json.dumps(tool_names), status, utc_now()),
            )

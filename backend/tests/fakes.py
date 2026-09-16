from __future__ import annotations

from collections import deque
from typing import Any

from app.llm import ChatResult
from app.models import StructuredBankTransaction


class FakeModel:
    def __init__(self, responses: list[ChatResult] | None = None, bank: StructuredBankTransaction | None = None):
        self.responses = deque(responses or [])
        self.bank = bank
        self.messages: list[list[dict[str, Any]]] = []

    def check(self) -> tuple[bool, str | None]:
        return True, None

    def chat(self, messages: list[dict[str, Any]], tools: list[dict[str, Any]]) -> ChatResult:
        self.messages.append(messages)
        return self.responses.popleft()

    def extract_bank_transaction(self, raw_text: str) -> StructuredBankTransaction:
        assert self.bank is not None
        return self.bank


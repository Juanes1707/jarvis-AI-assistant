from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any, Protocol
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from .models import StructuredBankTransaction


class LLMError(RuntimeError):
    pass


@dataclass(frozen=True, slots=True)
class ToolCall:
    name: str
    arguments: dict[str, Any]


@dataclass(frozen=True, slots=True)
class ChatResult:
    content: str
    tool_calls: tuple[ToolCall, ...] = ()


class ChatModel(Protocol):
    def check(self) -> tuple[bool, str | None]: ...

    def chat(self, messages: list[dict[str, Any]], tools: list[dict[str, Any]]) -> ChatResult: ...

    def extract_bank_transaction(self, raw_text: str) -> StructuredBankTransaction: ...


class OllamaClient:
    def __init__(self, base_url: str, model: str, *, timeout_seconds: int = 90):
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.timeout_seconds = timeout_seconds

    def _request(self, path: str, *, method: str = "GET", body: dict[str, Any] | None = None) -> dict[str, Any]:
        payload = None if body is None else json.dumps(body).encode("utf-8")
        request = Request(
            f"{self.base_url}{path}", data=payload, method=method,
            headers={"Content-Type": "application/json"} if payload else {},
        )
        try:
            with urlopen(request, timeout=self.timeout_seconds) as response:
                return json.loads(response.read().decode("utf-8"))
        except HTTPError as error:
            raise LLMError(f"Ollama respondió con HTTP {error.code}.") from error
        except (URLError, TimeoutError, OSError) as error:
            raise LLMError("No pude conectar con Ollama en el servidor local.") from error
        except (json.JSONDecodeError, UnicodeDecodeError) as error:
            raise LLMError("Ollama devolvió una respuesta inválida.") from error

    def check(self) -> tuple[bool, str | None]:
        try:
            body = self._request("/api/tags")
            installed = any(item.get("name") == self.model for item in body.get("models", []))
            return installed, None if installed else f"El modelo {self.model} no está instalado."
        except LLMError as error:
            return False, str(error)

    def chat(self, messages: list[dict[str, Any]], tools: list[dict[str, Any]]) -> ChatResult:
        body = self._request(
            "/api/chat",
            method="POST",
            body={
                "model": self.model,
                "stream": False,
                "think": False,
                "messages": messages,
                "tools": tools,
                "options": {"temperature": 0.2, "num_predict": 512},
            },
        )
        message = body.get("message") if isinstance(body, dict) else None
        if not isinstance(message, dict):
            raise LLMError("Ollama respondió sin un mensaje utilizable.")
        calls: list[ToolCall] = []
        for item in message.get("tool_calls", []) or []:
            function = item.get("function", {}) if isinstance(item, dict) else {}
            name = function.get("name")
            arguments = function.get("arguments", {})
            if isinstance(arguments, str):
                try:
                    arguments = json.loads(arguments)
                except json.JSONDecodeError as error:
                    raise LLMError("Ollama devolvió argumentos de herramienta inválidos.") from error
            if not isinstance(name, str) or not isinstance(arguments, dict):
                raise LLMError("Ollama devolvió una llamada de herramienta inválida.")
            calls.append(ToolCall(name=name, arguments=arguments))
        content = message.get("content", "")
        return ChatResult(content=content.strip() if isinstance(content, str) else "", tool_calls=tuple(calls))

    def extract_bank_transaction(self, raw_text: str) -> StructuredBankTransaction:
        schema = StructuredBankTransaction.model_json_schema()
        body = self._request(
            "/api/chat",
            method="POST",
            body={
                "model": self.model,
                "stream": False,
                "think": False,
                "format": schema,
                "messages": [
                    {
                        "role": "system",
                        "content": (
                            "Extrae una única transacción bancaria del texto. amount_minor son centavos exactos, no pesos: "
                            "32500 COP o $32.500 COP se convierten en amount_minor=3250000; 100000,50 COP se convierte "
                            "en 10000050. Usa moneda ISO de tres letras. Convierte fechas dd/mm/aaaa y horas locales "
                            "a ISO 8601 con zona -05:00. payment_method debe conservar solo el tipo y los últimos cuatro "
                            "dígitos, nunca el número completo. Si no es una compra o movimiento real, is_transaction=false. "
                            "No inventes datos ausentes y responde solo el JSON solicitado."
                        ),
                    },
                    {"role": "user", "content": raw_text[:20_000]},
                ],
                "options": {"temperature": 0},
            },
        )
        message = body.get("message", {})
        content = message.get("content", "") if isinstance(message, dict) else ""
        try:
            return StructuredBankTransaction.model_validate_json(content)
        except Exception as error:
            raise LLMError("El modelo no devolvió una transacción estructurada válida.") from error

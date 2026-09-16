from __future__ import annotations

import os
import unittest
from unittest.mock import patch

from app.config import ConfigurationError, Settings
from app.database import Database


class SettingsTestCase(unittest.TestCase):
    def _environment(self, **overrides: str) -> dict[str, str]:
        values = {
            "JARVIS_API_TOKEN": "api-token-with-at-least-24-characters",
            "JARVIS_WEBHOOK_TOKEN": "webhook-token-with-at-least-24-characters",
            "JARVIS_DATABASE_URL": "postgresql+psycopg://jarvis:secret@localhost:5432/jarvis",
        }
        values.update(overrides)
        return values

    def test_runtime_configuration_requires_postgresql(self) -> None:
        with patch.dict(os.environ, self._environment(JARVIS_DATABASE_URL=""), clear=True):
            with self.assertRaisesRegex(ConfigurationError, "JARVIS_DATABASE_URL"):
                Settings.from_env()

        with patch.dict(
            os.environ,
            self._environment(JARVIS_DATABASE_URL="sqlite:///backend/data/jarvis.db"),
            clear=True,
        ):
            with self.assertRaisesRegex(ConfigurationError, "PostgreSQL"):
                Settings.from_env()

        with patch.dict(os.environ, self._environment(), clear=True):
            settings = Settings.from_env()

        self.assertIsNone(settings.database_path)
        self.assertEqual(
            settings.database_url,
            "postgresql+psycopg://jarvis:secret@localhost:5432/jarvis",
        )
        database = Database(settings.database_url)
        try:
            self.assertEqual(database.dialect, "postgresql")
        finally:
            database.dispose()


if __name__ == "__main__":
    unittest.main()

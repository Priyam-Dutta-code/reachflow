"""Structured JSON logging with request correlation.

Every log line is one JSON object: timestamp, level, logger, message, plus
request_id/user_id/route/method/status/duration_ms when bound via contextvars.
No secrets or PII are ever logged by the helpers here.
"""
import json
import logging
import sys
import time
from contextvars import ContextVar
from datetime import datetime, timezone

request_id_var: ContextVar[str] = ContextVar("request_id", default="")
user_id_var: ContextVar[str] = ContextVar("user_id", default="")


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload: dict = {
            "ts": datetime.now(timezone.utc).isoformat(timespec="milliseconds"),
            "level": record.levelname,
            "logger": record.name,
            "msg": record.getMessage(),
        }
        rid = request_id_var.get()
        if rid:
            payload["request_id"] = rid
        uid = user_id_var.get()
        if uid:
            payload["user_id"] = uid
        for key in ("route", "method", "status", "duration_ms", "client_ip", "event"):
            value = getattr(record, key, None)
            if value is not None:
                payload[key] = value
        if record.exc_info and record.exc_info[0]:
            payload["exc_type"] = record.exc_info[0].__name__
            payload["exc"] = self.formatException(record.exc_info)[-2000:]
        return json.dumps(payload, ensure_ascii=False)


def setup_logging(level: int = logging.INFO) -> None:
    root = logging.getLogger()
    root.setLevel(level)
    # Replace any pre-existing handlers (uvicorn adds its own)
    for handler in list(root.handlers):
        root.removeHandler(handler)
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())
    root.addHandler(handler)
    # uvicorn access logs are redundant with our access middleware
    logging.getLogger("uvicorn.access").disabled = True


class Stopwatch:
    def __init__(self) -> None:
        self.start = time.perf_counter()

    def ms(self) -> int:
        return int((time.perf_counter() - self.start) * 1000)

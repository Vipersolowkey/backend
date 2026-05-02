from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

DEFAULT_SQLITE_URL = f"sqlite:///{(Path(__file__).resolve().parents[2] / 'test.db').as_posix()}"
ENV_PATH = Path(__file__).resolve().parents[2] / ".env"


class Settings(BaseSettings):
    database_url: str = DEFAULT_SQLITE_URL
    competitor_scrape_country: str = "vn"
    api_v1_prefix: str = "/api/v1"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    openai_api_key: str | None = None
    gemini_api_key: str | None = None
    groq_base_url: str = "https://api.groq.com/openai/v1"
    groq_api_key: str | None = None
    groq_model: str = "llama-3.3-70b-versatile"
    llm_provider: str = "auto"
    ollama_base_url: str = "http://127.0.0.1:11434"
    ollama_api_key: str | None = None
    ollama_model: str = "qwen3.5:cloud"
    ollama_timeout_seconds: int = 60
    app_name: str = "Hotel Management & Analytics API"

    # Owner automation (digest + scheduled threshold evaluation)
    automation_enabled: bool = False
    automation_timezone: str = "Asia/Ho_Chi_Minh"
    automation_digest_cron_hour: int = 7
    automation_digest_cron_minute: int = 0
    automation_eval_interval_minutes: int = 30
    automation_alert_cooldown_hours: int = 6
    automation_digest_scope: str = "combined"  # combined | each_property
    automation_dashboard_base_url: str = "http://localhost:5173"
    automation_trigger_secret: str | None = None  # X-Automation-Secret for manual run endpoints

    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_user: str | None = None
    smtp_password: str | None = None
    smtp_from: str | None = None
    smtp_use_tls: bool = True

    automation_digest_email_to: str | None = None  # comma-separated
    automation_telegram_bot_token: str | None = None
    automation_telegram_chat_ids: str | None = None  # comma-separated; digest + alerts
    automation_digest_slack_webhooks: str | None = None  # comma-separated incoming webhooks
    automation_alert_slack_webhooks: str | None = None  # optional; defaults to digest webhooks if unset

    automation_extra_alert_webhooks: str | None = None  # comma POST JSON on each deduped threshold breach

    model_config = SettingsConfigDict(
        env_file=ENV_PATH,
        env_file_encoding="utf-8",
        case_sensitive=False,
    )


settings = Settings()

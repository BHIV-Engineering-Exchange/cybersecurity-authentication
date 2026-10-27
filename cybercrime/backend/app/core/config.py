"""
Application configuration settings
"""

import json
import os
from pydantic_settings import BaseSettings, SettingsConfigDict, EnvSettingsSource
from pydantic import field_validator
from typing import List, Optional, Any


class CORSEnvSettingsSource(EnvSettingsSource):
    """Custom settings source that handles CORS_ORIGINS specially"""
    def __call__(self) -> dict[str, Any]:
        d: dict[str, Any] = {}
        
        # Read all environment variables manually to avoid super() parsing CORS_ORIGINS as JSON
        for field_name, field_info in self.settings_cls.model_fields.items():
            # Build environment variable name
            env_name = self.env_prefix + field_name if self.env_prefix else field_name
            
            if field_name == 'CORS_ORIGINS':
                # Handle CORS_ORIGINS specially
                cors_env = os.getenv(env_name)
                if cors_env:
                    cors_env = cors_env.strip()
                    if cors_env:
                        # Try parsing as JSON first
                        try:
                            parsed = json.loads(cors_env)
                            if isinstance(parsed, list):
                                d[field_name] = parsed
                            else:
                                # If not a list, treat as comma-separated
                                d[field_name] = [origin.strip() for origin in cors_env.split(',') if origin.strip()]
                        except (json.JSONDecodeError, ValueError, TypeError):
                            # If not JSON, treat as comma-separated string
                            origins = [origin.strip() for origin in cors_env.split(',') if origin.strip()]
                            if origins:
                                d[field_name] = origins
                # If not set, will use default value
            else:
                # Handle other fields normally
                env_val = os.getenv(env_name)
                if env_val is not None:
                    d[field_name] = env_val
        
        return d


class Settings(BaseSettings):
    """Application settings"""
    
    # API Configuration
    API_V1_PREFIX: str = "/api/v1"
    HOST: str = "0.0.0.0"
    PORT: int = 3000
    DEBUG: bool = False
    EXPOSE_API_DOCS: bool = False
    RBAC_POLICY_PATH: str = "rbac-permissions.json"
    
    @field_validator('DEBUG', mode='before')
    @classmethod
    def parse_debug(cls, v):
        """Handle DEBUG=WARN and other string values"""
        if isinstance(v, str):
            v_upper = v.upper()
            if v_upper in ("TRUE", "1", "YES", "ON"):
                return True
            elif v_upper in ("FALSE", "0", "NO", "OFF", "WARN"):
                return False
        return v
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
    ]
    
    # Security
    SECRET_KEY: Optional[str] = None
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    SUPERADMIN_EMAIL: Optional[str] = None
    SUPERADMIN_PASSWORD: Optional[str] = None
    SUPERADMIN_BOOTSTRAP_ENABLED: bool = False
    SUPERADMIN_BOOTSTRAP_FORCE_RESET: bool = False
    SUPERADMIN_BOOTSTRAP_TOKEN: Optional[str] = None
    
    # Database
    # Use a local SQLite file by default so it works without any external DB server.
    # Can be overridden via environment variable DATABASE_URL if you later install PostgreSQL.
    DATABASE_URL: str = "sqlite:///./investigation.db"
    
    # MongoDB
    MONGODB_URL: str = "mongodb://localhost:27017"
    MONGODB_DATABASE: str = "cybercrime_investigation"
    
    # File Storage
    EVIDENCE_STORAGE_PATH: str = "./evidence_storage"  # Directory to store evidence files
    
    # File Upload
    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB
    
    # TTS Configuration
    TTS_MODEL_NAME: str = "tts_models/multilingual/multi-dataset/xtts_v2"
    TTS_DEVICE: str = "cpu"  # or "cuda"
    TTS_OUTPUT_DIR: str = "./tts_output"
    
    # AI (OpenRouter)
    OPENROUTER_API_KEY: Optional[str] = None
    OPENROUTER_MODEL: str = "qwen/qwen-2.5-72b-instruct"  # Free model

    # External AI Orchestrator (e.g. Primary_Bucket_Owner)
    # If configured, certain AI flows can delegate to this orchestrator service.
    AI_ORCHESTRATOR_INCIDENT_URL: Optional[str] = None  # Full URL for incident-analysis basket endpoint
    AI_ORCHESTRATOR_API_KEY: Optional[str] = None       # Optional auth key/token for the orchestrator
    
    # Email Configuration (SMTP - Brevo)
    MAIL_SERVER: str = "smtp-relay.brevo.com"
    MAIL_PORT: int = 587
    MAIL_USERNAME: Optional[str] = None
    MAIL_PASSWORD: Optional[str] = None  # Legacy Brevo SMTP API key (used only if you enable SMTP)
    MAIL_FROM: Optional[str] = None
    MAIL_FROM_NAME: str = "Cybercrime Investigation System"
    MAIL_STARTTLS: bool = True
    MAIL_SSL_TLS: bool = False
    USE_CREDENTIALS: bool = True
    VALIDATE_CERTS: bool = True
    EMAIL_ENABLED: bool = False
    SMTP_ENABLED: bool = False
    # Default to Render frontend URL if not set
    FRONTEND_BASE_URL: Optional[str] = "https://cybercrime-frontend.onrender.com"

    # Brevo HTTP API (recommended for Render and environments that block SMTP)
    # Set BREVO_API_KEY to your "xkeysib-..." key from Brevo. When present,
    # the app will use the HTTPS API instead of SMTP to send emails.
    BREVO_API_KEY: Optional[str] = None

    # Sovereign integrations (BHIV Bucket/Core application contracts)
    BHIV_BUCKET_EVIDENCE_URL: Optional[str] = None
    BHIV_BUCKET_API_KEY: Optional[str] = None
    BHIV_CORE_EVENT_URL: Optional[str] = None
    BHIV_INTEGRATION_TIMEOUT_SECONDS: float = 10.0
    EVENT_RETRY_MAX_ATTEMPTS: int = 3
    EVENT_BUFFER_PATH: str = "./event_buffer/events.jsonl"
    KAFKA_BOOTSTRAP_SERVERS: Optional[str] = None
    KAFKA_EVENT_TOPIC: str = "cybercrime-governance-events"
    
    @field_validator("BREVO_API_KEY", mode="before")
    @classmethod
    def validate_brevo_api_key(cls, v):
        """Trim whitespace from BREVO_API_KEY if present"""
        if v and isinstance(v, str):
            return v.strip()
        return v

    @field_validator("SECRET_KEY", mode="before")
    @classmethod
    def validate_secret_key(cls, v):
        if not v or not str(v).strip():
            raise ValueError("SECRET_KEY must be set via environment variables.")
        return v
    
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore",
    )
    
    @classmethod
    def settings_customise_sources(
        cls,
        settings_cls,
        init_settings,
        env_settings,
        dotenv_settings,
        file_secret_settings,
    ):
        """Use custom env settings source for CORS_ORIGINS"""
        return (
            init_settings,
            CORSEnvSettingsSource(settings_cls=settings_cls),
            dotenv_settings,
            file_secret_settings,
        )
        


settings = Settings()

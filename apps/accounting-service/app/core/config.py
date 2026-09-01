"""
Cấu hình Python Accounting Service — đọc từ biến môi trường.
Xem Mục 3.6 spec: kiến trúc Hybrid NestJS Core + Python Accounting Service.
"""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_read_url: str = "postgresql://postgres:postgres@localhost:5432/platform369"
    database_report_write_url: str = "postgresql://postgres:postgres@localhost:5432/platform369"
    redis_url: str = "redis://localhost:6379"
    internal_api_key: str = "change-me-internal-api-key"

    class Config:
        env_file = ".env"


settings = Settings()

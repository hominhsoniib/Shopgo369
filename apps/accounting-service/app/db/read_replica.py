"""
Kết nối CHỈ ĐỌC tới PostgreSQL Read Replica (Mục 3.6.2, 3.6.6 spec).

Nguyên tắc bất biến: mọi query trong module này PHẢI là SELECT. Nếu cần ghi
dữ liệu, dùng report_writer.py (chỉ có quyền ghi 3-4 bảng report riêng) —
KHÔNG BAO GIỜ ghi vào bảng nguồn (orders, income_transactions,
expense_transactions...) từ phía Python. Bảng nguồn thuộc quyền sở hữu của
NestJS Core (Mục 3.6.1 spec).
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import pandas as pd
from app.core.config import settings

read_engine = create_engine(settings.database_read_url, pool_pre_ping=True, pool_size=5)
ReadSession = sessionmaker(bind=read_engine, autoflush=False, autocommit=False)


def query_df(sql: str, params: dict | None = None) -> pd.DataFrame:
    """Chạy 1 câu SELECT và trả về pandas DataFrame — dùng cho mọi phép
    tính báo cáo/dự báo trong pnl_calculator.py, forecast_engine.py."""
    return pd.read_sql(sql, read_engine, params=params or {})

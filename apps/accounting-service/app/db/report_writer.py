"""
Kết nối GHI GIỚI HẠN — CHỈ được phép INSERT/UPDATE trên 4 bảng:
accounting_reports, revenue_forecasts, tax_estimation_snapshots,
report_export_files (Mục 3.6.5 spec).

Production: user DB dùng ở đây PHẢI được GRANT quyền hạn chế thật sự ở cấp
PostgreSQL (không chỉ giới hạn bằng convention trong code) — vd:
  GRANT INSERT, UPDATE, SELECT ON accounting_reports, revenue_forecasts,
  tax_estimation_snapshots, report_export_files TO python_accounting_writer;
  -- KHÔNG GRANT bất kỳ quyền nào trên orders/income_transactions/...
"""
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

write_engine = create_engine(settings.database_report_write_url, pool_pre_ping=True, pool_size=3)
WriteSession = sessionmaker(bind=write_engine, autoflush=False, autocommit=False)

ALLOWED_TABLES = {
    "accounting_reports",
    "revenue_forecasts",
    "tax_estimation_snapshots",
    "report_export_files",
}


def upsert_report(table: str, values: dict) -> None:
    """Helper ghi kết quả tính toán — kiểm tra whitelist bảng ngay trong code
    (lớp bảo vệ ứng dụng, bổ sung cho GRANT ở tầng DB)."""
    if table not in ALLOWED_TABLES:
        raise ValueError(f"Bảng '{table}' không nằm trong danh sách được phép ghi từ Python service")

    columns = ", ".join(values.keys())
    placeholders = ", ".join(f":{k}" for k in values.keys())
    update_clause = ", ".join(f"{k} = EXCLUDED.{k}" for k in values.keys() if k != "id")

    sql = text(f"""
        INSERT INTO {table} ({columns})
        VALUES ({placeholders})
        ON CONFLICT (id) DO UPDATE SET {update_clause}
    """)

    with WriteSession() as session:
        session.execute(sql, values)
        session.commit()

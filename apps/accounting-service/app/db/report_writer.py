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

# finding #16/#18 (P1): bản cũ luôn ON CONFLICT (id) — nhưng "id" được sinh mới bằng uuid4()
# ở MỌI lần gọi, nên không bao giờ trùng "id" thật. Kết quả: lần chạy lại cho CÙNG kỳ/CÙNG store
# vi phạm unique constraint nghiệp vụ thật trong Prisma schema (@@unique([storeId, ...])) và
# NÉM LỖI IntegrityError thay vì cập nhật đè lên report cũ — job coi như thất bại âm thầm khi retry.
# Fix: ON CONFLICT phải target đúng cột unique nghiệp vụ của từng bảng, không phải "id".
BUSINESS_KEY_COLUMNS = {
    "accounting_reports": ["store_id", "period_type", "period_start"],
    "revenue_forecasts": ["store_id", "forecast_date"],
    "tax_estimation_snapshots": ["store_id", "period_label"],
    # report_export_files hiện chưa có @@unique trong schema — dùng id (insert-only, không upsert thật).
    "report_export_files": ["id"],
}


def upsert_report(table: str, values: dict) -> None:
    """Helper ghi kết quả tính toán — kiểm tra whitelist bảng ngay trong code
    (lớp bảo vệ ứng dụng, bổ sung cho GRANT ở tầng DB).

    ON CONFLICT dùng đúng khoá nghiệp vụ (BUSINESS_KEY_COLUMNS) của từng bảng — khớp với
    @@unique(...) thật trong Prisma schema — để lần chạy lại cho cùng kỳ/cùng store UPDATE
    đè lên report cũ thay vì tạo bản ghi trùng hoặc ném lỗi.
    """
    if table not in ALLOWED_TABLES:
        raise ValueError(f"Bảng '{table}' không nằm trong danh sách được phép ghi từ Python service")

    conflict_columns = BUSINESS_KEY_COLUMNS[table]

    columns = ", ".join(values.keys())
    placeholders = ", ".join(f":{k}" for k in values.keys())
    conflict_target = ", ".join(conflict_columns)
    update_clause = ", ".join(f"{k} = EXCLUDED.{k}" for k in values.keys() if k not in (*conflict_columns, "id"))

    sql = text(f"""
        INSERT INTO {table} ({columns})
        VALUES ({placeholders})
        ON CONFLICT ({conflict_target}) DO UPDATE SET {update_clause}
    """)

    with WriteSession() as session:
        session.execute(sql, values)
        session.commit()

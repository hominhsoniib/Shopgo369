"""
Đề xuất số liệu kê khai thuế khoán hộ kinh doanh — Mục 3.6.1 spec: "Đề xuất
số liệu kê khai thuế hộ KD". CHỈ LÀ SỐ LIỆU THAM KHẢO cho seller và kế toán
HTX xem trước — KHÔNG thay thế tư vấn thuế chuyên nghiệp hay tự động nộp thuế.

Thuế khoán hộ kinh doanh cá thể tại VN áp theo % trên DOANH THU (không phải
lợi nhuận), tỷ lệ khác nhau theo ngành nghề (hàng hoá ~1.5%, dịch vụ ~5%...).
Phase 4: dùng 1 tỷ lệ mặc định cấu hình được — production cần map theo đúng
ngành nghề đăng ký của từng business (Mục 1.1 spec bài học: không suy diễn
số liệu pháp lý khi thiếu dữ liệu — đây là điểm cần hoàn thiện thêm).
"""
from datetime import datetime
from uuid import uuid4
import logging
import os
from celery_app import celery_app
from app.services.pnl_calculator import query_df, get_all_active_store_ids
from app.db.report_writer import upsert_report

logger = logging.getLogger(__name__)

DEFAULT_TAX_RATE = float(os.environ.get("DEFAULT_PRESUMPTIVE_TAX_RATE", "0.015"))  # 1.5% mặc định


def _current_quarter_label(dt: datetime) -> str:
    quarter = (dt.month - 1) // 3 + 1
    return f"{dt.year}-Q{quarter}"


def _quarter_range(dt: datetime) -> tuple[datetime, datetime]:
    quarter = (dt.month - 1) // 3 + 1
    start_month = (quarter - 1) * 3 + 1
    end_month = start_month + 2
    start = datetime(dt.year, start_month, 1)
    end = (datetime(dt.year, end_month + 1, 1) if end_month < 12 else datetime(dt.year + 1, 1, 1))
    return start, end


@celery_app.task(name="app.tasks.tax_estimation.run_quarterly_tax_estimation")
def run_quarterly_tax_estimation():
    """Chạy đầu mỗi quý — ước tính thuế khoán dựa trên doanh thu quý trước, lưu vào tax_estimation_snapshots."""
    now = datetime.utcnow()
    period_start, period_end = _quarter_range(now)
    period_label = _current_quarter_label(now)

    store_ids = get_all_active_store_ids()
    success = 0

    for store_id in store_ids:
        df = query_df(
            """
            SELECT COALESCE(SUM(amount), 0) AS revenue FROM income_transactions
            WHERE store_id = %(store_id)s AND occurred_at >= %(start)s AND occurred_at < %(end)s
            """,
            {"store_id": store_id, "start": period_start, "end": period_end},
        )
        revenue = float(df["revenue"].iloc[0]) if not df.empty else 0.0
        estimated_tax = round(revenue * DEFAULT_TAX_RATE, 2)

        upsert_report(
            "tax_estimation_snapshots",
            {
                "id": str(uuid4()),
                "store_id": store_id,
                "period_label": period_label,
                "estimated_revenue": revenue,
                "estimated_tax_amount": estimated_tax,
                "tax_rate": DEFAULT_TAX_RATE,
                "generated_at": datetime.utcnow(),
            },
        )
        success += 1

    logger.info(f"Tax estimation hoàn tất cho {success} store, kỳ {period_label}")
    return {"success": success, "period": period_label}

"""Celery task tổng hợp báo cáo P&L THEO THÁNG — chạy ngày 1 hàng tháng (Mục 6 spec Phase 4)."""
from datetime import datetime
from calendar import monthrange
from uuid import uuid4
import logging
from celery_app import celery_app
from app.services.pnl_calculator import calculate_pnl, get_all_active_store_ids
from app.db.report_writer import upsert_report

logger = logging.getLogger(__name__)


@celery_app.task(name="app.tasks.monthly_pnl.run_monthly_report_for_all_stores")
def run_monthly_report_for_all_stores():
    """Tính báo cáo P&L của THÁNG TRƯỚC cho mọi store, lưu vào accounting_reports (periodType=MONTHLY)."""
    now = datetime.utcnow()
    prev_month = now.month - 1 or 12
    prev_year = now.year if now.month > 1 else now.year - 1

    period_start = datetime(prev_year, prev_month, 1)
    last_day = monthrange(prev_year, prev_month)[1]
    period_end = datetime(prev_year, prev_month, last_day, 23, 59, 59)

    store_ids = get_all_active_store_ids()
    success, failed = 0, 0

    for store_id in store_ids:
        try:
            result = calculate_pnl(store_id, period_start, period_end)
            upsert_report(
                "accounting_reports",
                {
                    "id": str(uuid4()),
                    "store_id": store_id,
                    "period_type": "MONTHLY",
                    "period_start": period_start,
                    "period_end": period_end,
                    "total_revenue": result["total_revenue"],
                    "total_expense": result["total_expense"],
                    "net_profit": result["net_profit"],
                    "generated_at": datetime.utcnow(),
                },
            )
            success += 1
        except Exception as exc:  # noqa: BLE001
            logger.error(f"Lỗi tính báo cáo tháng cho store {store_id}: {exc}")
            failed += 1

    logger.info(f"Monthly report hoàn tất: {success}/{len(store_ids)} store")
    return {"success": success, "failed": failed, "period": f"{prev_year}-{prev_month:02d}"}

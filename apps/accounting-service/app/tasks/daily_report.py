"""
Celery tasks chạy hàng ngày/hàng tuần — Mục 3.6.3 spec: "Job định kỳ...
Celery Beat tự chạy theo lịch, không cần NestJS gọi".
"""
from datetime import datetime, timedelta
import logging
from celery_app import celery_app
from app.services.pnl_calculator import calculate_and_save_daily_pnl, get_all_active_store_ids
from app.services.forecast_engine import forecast_and_save

logger = logging.getLogger(__name__)


@celery_app.task(name="app.tasks.daily_report.run_daily_report_for_all_stores")
def run_daily_report_for_all_stores():
    """Chạy 00:15 mỗi ngày — tổng hợp báo cáo P&L của NGÀY HÔM QUA cho mọi store."""
    yesterday = datetime.utcnow() - timedelta(days=1)
    store_ids = get_all_active_store_ids()

    success, failed = 0, 0
    for store_id in store_ids:
        try:
            calculate_and_save_daily_pnl(store_id, yesterday)
            success += 1
        except Exception as exc:  # noqa: BLE001 — job nền, ghi log và tiếp tục store khác
            logger.error(f"Lỗi tính báo cáo ngày cho store {store_id}: {exc}")
            failed += 1

    logger.info(f"Daily report hoàn tất: {success} thành công, {failed} thất bại / {len(store_ids)} store")
    return {"success": success, "failed": failed, "total": len(store_ids)}


@celery_app.task(name="app.tasks.daily_report.run_forecast_for_all_stores")
def run_forecast_for_all_stores():
    """Chạy thứ 2 hàng tuần — dự báo doanh thu 7 ngày tới cho mọi store."""
    store_ids = get_all_active_store_ids()
    success, failed = 0, 0
    for store_id in store_ids:
        try:
            forecast_and_save(store_id, days_ahead=7)
            success += 1
        except Exception as exc:  # noqa: BLE001
            logger.error(f"Lỗi dự báo doanh thu cho store {store_id}: {exc}")
            failed += 1
    logger.info(f"Forecast job hoàn tất: {success} thành công, {failed} thất bại")
    return {"success": success, "failed": failed}


@celery_app.task(name="app.tasks.daily_report.generate_report_on_demand")
def generate_report_on_demand(store_id: str, period_start_iso: str, period_end_iso: str):
    """Task chạy NGAY khi NestJS gọi POST /internal/reports/generate (Mục
    3.6.3 spec: "NestJS yêu cầu Python tính báo cáo tháng X ngay")."""
    period_start = datetime.fromisoformat(period_start_iso)
    period_end = datetime.fromisoformat(period_end_iso)
    return calculate_and_save_daily_pnl(store_id, period_start) if period_start.date() == period_end.date() \
        else {"error": "on-demand task Phase 4 chỉ hỗ trợ 1 ngày — dùng monthly_pnl cho kỳ dài hơn"}

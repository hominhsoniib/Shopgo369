"""
Celery app + Celery Beat schedule (Mục 3.6.3 spec: "Job định kỳ (VD: 00:00
mỗi ngày tổng hợp báo cáo hôm qua) → Celery Beat tự chạy theo lịch, không
cần NestJS gọi").
"""
from celery import Celery
from celery.schedules import crontab
from app.core.config import settings

celery_app = Celery("accounting_service", broker=settings.redis_url, backend=settings.redis_url)

celery_app.conf.beat_schedule = {
    "daily-pnl-report": {
        "task": "app.tasks.daily_report.run_daily_report_for_all_stores",
        "schedule": crontab(hour=0, minute=15),  # 00:15 mỗi ngày — tổng hợp báo cáo hôm qua
    },
    "monthly-pnl-report": {
        "task": "app.tasks.monthly_pnl.run_monthly_report_for_all_stores",
        "schedule": crontab(hour=1, minute=0, day_of_month=1),  # ngày 1 hàng tháng
    },
    "weekly-revenue-forecast": {
        "task": "app.tasks.daily_report.run_forecast_for_all_stores",
        "schedule": crontab(hour=2, minute=0, day_of_week=1),  # thứ 2 hàng tuần
    },
    "quarterly-tax-estimation": {
        "task": "app.tasks.tax_estimation.run_quarterly_tax_estimation",
        "schedule": crontab(hour=3, minute=0, day_of_month=1, month_of_year="1,4,7,10"),
    },
}
celery_app.conf.timezone = "Asia/Ho_Chi_Minh"

# Đăng ký các module task để Celery tìm thấy
celery_app.autodiscover_tasks(["app.tasks"])

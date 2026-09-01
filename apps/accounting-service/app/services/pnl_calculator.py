"""
Tính báo cáo Lãi/Lỗ (P&L) theo kỳ (ngày/tháng) — Mục 3.6.1 spec:
"Tính P&L, dự báo doanh thu (forecast)" là trách nhiệm của Python service.

Đọc từ income_transactions + expense_transactions (nguồn sự thật do NestJS
ghi — Mục 4.4 spec) qua Read Replica, dùng pandas để tổng hợp nhanh với
lượng dữ liệu lớn (Mục 7.1 spec: tối ưu performance cho query nặng).
"""
from datetime import datetime
from uuid import uuid4
import pandas as pd
from app.db.read_replica import query_df
from app.db.report_writer import upsert_report


def calculate_pnl(store_id: str, period_start: datetime, period_end: datetime) -> dict:
    income_df = query_df(
        """
        SELECT amount, occurred_at FROM income_transactions
        WHERE store_id = %(store_id)s AND occurred_at BETWEEN %(start)s AND %(end)s
        """,
        {"store_id": store_id, "start": period_start, "end": period_end},
    )
    expense_df = query_df(
        """
        SELECT amount, category, occurred_at FROM expense_transactions
        WHERE store_id = %(store_id)s AND occurred_at BETWEEN %(start)s AND %(end)s
        """,
        {"store_id": store_id, "start": period_start, "end": period_end},
    )

    total_revenue = float(income_df["amount"].sum()) if not income_df.empty else 0.0
    total_expense = float(expense_df["amount"].sum()) if not expense_df.empty else 0.0
    net_profit = total_revenue - total_expense

    # Phân tích chi phí theo hạng mục — hữu ích cho seller hiểu tiền đi đâu
    expense_by_category = (
        expense_df.groupby("category")["amount"].sum().to_dict() if not expense_df.empty else {}
    )

    return {
        "store_id": store_id,
        "period_start": period_start,
        "period_end": period_end,
        "total_revenue": total_revenue,
        "total_expense": total_expense,
        "net_profit": net_profit,
        "expense_by_category": {k: float(v) for k, v in expense_by_category.items()},
    }


def calculate_and_save_daily_pnl(store_id: str, day: datetime) -> dict:
    """Dùng bởi Celery task daily_report.py — tính P&L 1 ngày rồi lưu kết quả
    vào accounting_reports (Mục 3.6.5 spec)."""
    period_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
    period_end = day.replace(hour=23, minute=59, second=59, microsecond=999999)

    result = calculate_pnl(store_id, period_start, period_end)

    upsert_report(
        "accounting_reports",
        {
            "id": str(uuid4()),
            "store_id": store_id,
            "period_type": "DAILY",
            "period_start": period_start,
            "period_end": period_end,
            "total_revenue": result["total_revenue"],
            "total_expense": result["total_expense"],
            "net_profit": result["net_profit"],
            "generated_at": datetime.utcnow(),
        },
    )
    return result


def get_all_active_store_ids() -> list[str]:
    """Lấy danh sách store để chạy job hàng loạt (Celery Beat daily job)."""
    df = query_df("SELECT id FROM stores WHERE deleted_at IS NULL")
    return df["id"].tolist()

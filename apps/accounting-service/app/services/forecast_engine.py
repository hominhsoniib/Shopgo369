"""
Dự báo doanh thu đơn giản — Mục 3.6.1 spec: "Tính P&L, dự báo doanh thu".

Phase 4 dùng phương pháp Simple Moving Average + Linear Regression cơ bản
(đủ dùng khi dữ liệu lịch sử còn ít — vài tháng đầu). Khi có đủ dữ liệu dài
hạn (>12 tháng) hơn, nên nâng cấp lên statsmodels (ARIMA/Holt-Winters) hoặc
Prophet để bắt được yếu tố mùa vụ — để lại làm TODO rõ ràng, không over-engineer
ngay từ đầu (đúng tinh thần Mục 1.4 spec: tránh over-engineering sớm).
"""
from datetime import datetime, timedelta
from uuid import uuid4
import numpy as np
import pandas as pd
from app.db.read_replica import query_df
from app.db.report_writer import upsert_report


def forecast_revenue(store_id: str, days_ahead: int = 7, lookback_days: int = 30) -> pd.DataFrame:
    since = datetime.utcnow() - timedelta(days=lookback_days)
    df = query_df(
        """
        SELECT date_trunc('day', occurred_at) AS day, SUM(amount) AS revenue
        FROM income_transactions
        WHERE store_id = %(store_id)s AND occurred_at >= %(since)s
        GROUP BY day ORDER BY day ASC
        """,
        {"store_id": store_id, "since": since},
    )

    if len(df) < 3:
        # Không đủ dữ liệu lịch sử để dự báo có ý nghĩa — trả về rỗng thay vì
        # đoán bừa (Mục 7.2 spec tinh thần: không suy diễn khi thiếu dữ liệu).
        return pd.DataFrame(columns=["forecast_date", "predicted_revenue", "confidence_low", "confidence_high"])

    df["day_index"] = np.arange(len(df))
    x = df["day_index"].values
    y = df["revenue"].astype(float).values

    # Hồi quy tuyến tính đơn giản (least squares) — đủ tốt cho xu hướng ngắn hạn
    slope, intercept = np.polyfit(x, y, 1)
    residual_std = float(np.std(y - (slope * x + intercept))) if len(y) > 1 else 0.0

    last_index = df["day_index"].max()
    last_day = df["day"].max()

    forecasts = []
    for i in range(1, days_ahead + 1):
        idx = last_index + i
        predicted = max(0, slope * idx + intercept)  # doanh thu không thể âm
        forecasts.append(
            {
                "forecast_date": last_day + timedelta(days=i),
                "predicted_revenue": round(predicted, 2),
                "confidence_low": round(max(0, predicted - 1.96 * residual_std), 2),
                "confidence_high": round(predicted + 1.96 * residual_std, 2),
            }
        )

    return pd.DataFrame(forecasts)


def forecast_and_save(store_id: str, days_ahead: int = 7) -> pd.DataFrame:
    """Dùng bởi Celery task — tính dự báo rồi lưu từng ngày vào revenue_forecasts."""
    forecast_df = forecast_revenue(store_id, days_ahead)

    for _, row in forecast_df.iterrows():
        upsert_report(
            "revenue_forecasts",
            {
                "id": str(uuid4()),
                "store_id": store_id,
                "forecast_date": row["forecast_date"],
                "predicted_revenue": row["predicted_revenue"],
                "confidence_low": row["confidence_low"],
                "confidence_high": row["confidence_high"],
                "generated_at": datetime.utcnow(),
            },
        )

    return forecast_df

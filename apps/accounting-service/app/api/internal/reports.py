"""
API nội bộ — CHỈ được gọi từ NestJS Core (Mục 3.6.3 spec: "REST API nội bộ,
có API key, không public"). KHÔNG expose ra internet, không có CORS cho FE.
"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.services.pnl_calculator import calculate_and_save_daily_pnl, calculate_pnl
from app.api.internal.auth import verify_internal_api_key

router = APIRouter(prefix="/internal/reports", tags=["internal-reports"])


class GenerateReportRequest(BaseModel):
    store_id: str
    period_start: datetime
    period_end: datetime


@router.post("/generate", dependencies=[Depends(verify_internal_api_key)])
def generate_report(payload: GenerateReportRequest):
    """NestJS gọi khi seller bấm "Xem báo cáo" và cần số liệu tức thời
    (Mục 3.6.3 spec: kịch bản on-demand, đồng bộ)."""
    try:
        result = calculate_pnl(payload.store_id, payload.period_start, payload.period_end)
        return {"success": True, "data": result}
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/pnl", dependencies=[Depends(verify_internal_api_key)])
def get_daily_pnl(store_id: str, day: datetime):
    """Tính nhanh P&L 1 ngày theo yêu cầu — không lưu report (chỉ trả về ngay)."""
    try:
        return calculate_and_save_daily_pnl(store_id, day)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(exc)) from exc

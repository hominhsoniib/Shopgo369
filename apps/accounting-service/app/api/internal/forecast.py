from fastapi import APIRouter, Depends, HTTPException, Query
from app.services.forecast_engine import forecast_revenue
from app.api.internal.auth import verify_internal_api_key

router = APIRouter(prefix="/internal/forecast", tags=["internal-forecast"])


@router.get("/revenue", dependencies=[Depends(verify_internal_api_key)])
def get_revenue_forecast(store_id: str, days_ahead: int = Query(7, ge=1, le=30)):
    try:
        df = forecast_revenue(store_id, days_ahead=days_ahead)
        return {"success": True, "data": df.to_dict(orient="records")}
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(exc)) from exc

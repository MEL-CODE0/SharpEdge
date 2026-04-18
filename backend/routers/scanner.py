from fastapi import APIRouter, Depends, BackgroundTasks
from ..security import get_current_user, User
from ..odds_api.scheduler import get_status, run_once

router = APIRouter(prefix="/api/scanner", tags=["scanner"])


@router.get("/status")
async def scanner_status(current_user: User = Depends(get_current_user)):
    return get_status()


@router.post("/trigger")
async def trigger_scan(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
):
    """Manually kick off one scan cycle without waiting for next poll interval."""
    background_tasks.add_task(run_once)
    return {"message": "Scan triggered"}

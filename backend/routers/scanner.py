from fastapi import APIRouter, Depends, BackgroundTasks
from ..security import get_current_user, User
from ..odds_api.scheduler import get_status, run_once, pause_loop, resume_loop

router = APIRouter(prefix="/api/scanner", tags=["scanner"])


@router.get("/status")
async def scanner_status(current_user: User = Depends(get_current_user)):
    return get_status()


@router.post("/trigger")
async def trigger_scan(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
):
    background_tasks.add_task(run_once)
    return {"message": "Scan triggered"}


@router.post("/pause")
async def pause_scanner(current_user: User = Depends(get_current_user)):
    pause_loop()
    return {"message": "Scanner paused"}


@router.post("/resume")
async def resume_scanner(current_user: User = Depends(get_current_user)):
    resume_loop()
    return {"message": "Scanner resumed"}

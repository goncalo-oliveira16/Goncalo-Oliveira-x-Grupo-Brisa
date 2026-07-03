from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import secrets
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

# -------------------- Models --------------------

ProjectStatus = Literal["in_progress", "delivered", "re_editing", "final"]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class Project(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = ""
    client: Optional[str] = ""
    deadline: Optional[str] = None  # ISO date string
    status: ProjectStatus = "in_progress"
    created_at: str = Field(default_factory=now_iso)
    updated_at: str = Field(default_factory=now_iso)


class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    client: Optional[str] = ""
    deadline: Optional[str] = None
    status: ProjectStatus = "in_progress"


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    client: Optional[str] = None
    deadline: Optional[str] = None
    status: Optional[ProjectStatus] = None


class TimeEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    project_id: str
    date: str  # ISO date string (YYYY-MM-DD)
    hours: float
    description: Optional[str] = ""
    created_at: str = Field(default_factory=now_iso)


class TimeEntryCreate(BaseModel):
    date: str
    hours: float
    description: Optional[str] = ""


class TimeEntryUpdate(BaseModel):
    date: Optional[str] = None
    hours: Optional[float] = None
    description: Optional[str] = None


# -------------------- Helpers --------------------

def clean(doc: dict) -> dict:
    if doc and "_id" in doc:
        doc.pop("_id")
    return doc


async def compute_total_hours(project_id: str) -> float:
    cursor = db.time_entries.find({"project_id": project_id}, {"hours": 1, "_id": 0})
    total = 0.0
    async for e in cursor:
        total += float(e.get("hours", 0) or 0)
    return round(total, 2)


async def hours_by_project() -> dict:
    """Single-query aggregate: {project_id: total_hours} across ALL entries."""
    totals: dict = {}
    cursor = db.time_entries.find({}, {"project_id": 1, "hours": 1, "_id": 0})
    async for e in cursor:
        pid = e.get("project_id")
        if pid is None:
            continue
        totals[pid] = totals.get(pid, 0.0) + float(e.get("hours", 0) or 0)
    return {k: round(v, 2) for k, v in totals.items()}


async def entries_by_project() -> dict:
    """Single-query aggregate: {project_id: [entries...]} across ALL entries."""
    grouped: dict = {}
    cursor = db.time_entries.find({}, {"_id": 0})
    async for e in cursor:
        pid = e.get("project_id")
        if pid is None:
            continue
        grouped.setdefault(pid, []).append(e)
    return grouped


async def get_or_create_share_token() -> str:
    doc = await db.settings.find_one({"key": "share_token"})
    if doc and doc.get("value"):
        return doc["value"]
    token = secrets.token_urlsafe(16)
    await db.settings.update_one(
        {"key": "share_token"},
        {"$set": {"key": "share_token", "value": token, "created_at": now_iso()}},
        upsert=True,
    )
    return token


# -------------------- Project routes --------------------

@api_router.get("/projects")
async def list_projects():
    projects = await db.projects.find({}, {"_id": 0}).to_list(1000)
    totals = await hours_by_project()
    for p in projects:
        p["total_hours"] = totals.get(p["id"], 0.0)
    # Sort: active first (in_progress, re_editing), then delivered, then final; newest first within groups
    order = {"in_progress": 0, "re_editing": 1, "delivered": 2, "final": 3}
    projects.sort(key=lambda p: (order.get(p.get("status", "in_progress"), 9), p.get("created_at", "")), reverse=False)
    return projects


@api_router.post("/projects")
async def create_project(payload: ProjectCreate):
    project = Project(**payload.model_dump())
    await db.projects.insert_one(project.model_dump())
    result = project.model_dump()
    result["total_hours"] = 0.0
    return result


@api_router.get("/projects/{project_id}")
async def get_project(project_id: str):
    doc = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Project not found")
    doc["total_hours"] = await compute_total_hours(project_id)
    return doc


@api_router.put("/projects/{project_id}")
async def update_project(project_id: str, payload: ProjectUpdate):
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(status_code=400, detail="No fields to update")
    update["updated_at"] = now_iso()
    result = await db.projects.update_one({"id": project_id}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    doc = await db.projects.find_one({"id": project_id}, {"_id": 0})
    doc["total_hours"] = await compute_total_hours(project_id)
    return doc


@api_router.delete("/projects/{project_id}")
async def delete_project(project_id: str):
    result = await db.projects.delete_one({"id": project_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    await db.time_entries.delete_many({"project_id": project_id})
    return {"ok": True}


# -------------------- Time entry routes --------------------

@api_router.get("/projects/{project_id}/entries")
async def list_entries(project_id: str):
    entries = await db.time_entries.find({"project_id": project_id}, {"_id": 0}).to_list(2000)
    entries.sort(key=lambda e: (e.get("date", ""), e.get("created_at", "")), reverse=True)
    return entries


@api_router.post("/projects/{project_id}/entries")
async def create_entry(project_id: str, payload: TimeEntryCreate):
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    entry = TimeEntry(project_id=project_id, **payload.model_dump())
    await db.time_entries.insert_one(entry.model_dump())
    return entry.model_dump()


@api_router.put("/entries/{entry_id}")
async def update_entry(entry_id: str, payload: TimeEntryUpdate):
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = await db.time_entries.update_one({"id": entry_id}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Entry not found")
    doc = await db.time_entries.find_one({"id": entry_id}, {"_id": 0})
    return doc


@api_router.delete("/entries/{entry_id}")
async def delete_entry(entry_id: str):
    result = await db.time_entries.delete_one({"id": entry_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Entry not found")
    return {"ok": True}


# -------------------- Stats --------------------

@api_router.get("/stats")
async def get_stats():
    projects = await db.projects.find({}, {"_id": 0}).to_list(1000)
    total_hours = 0.0
    entries = await db.time_entries.find({}, {"_id": 0}).to_list(5000)
    for e in entries:
        total_hours += float(e.get("hours", 0) or 0)

    # Hours this week (last 7 days from today, ISO date compare)
    from datetime import date, timedelta
    today = date.today()
    week_ago = today - timedelta(days=6)
    hours_week = 0.0
    for e in entries:
        try:
            d = date.fromisoformat(e.get("date", ""))
            if week_ago <= d <= today:
                hours_week += float(e.get("hours", 0) or 0)
        except Exception:
            continue

    counts = {"in_progress": 0, "delivered": 0, "re_editing": 0, "final": 0}
    for p in projects:
        s = p.get("status", "in_progress")
        if s in counts:
            counts[s] += 1

    return {
        "total_projects": len(projects),
        "total_hours": round(total_hours, 2),
        "hours_this_week": round(hours_week, 2),
        "active": counts["in_progress"] + counts["re_editing"],
        "counts": counts,
    }


# -------------------- Share --------------------

@api_router.get("/share/token")
async def get_share_token():
    token = await get_or_create_share_token()
    return {"token": token}


@api_router.post("/share/rotate")
async def rotate_share_token():
    token = secrets.token_urlsafe(16)
    await db.settings.update_one(
        {"key": "share_token"},
        {"$set": {"key": "share_token", "value": token, "created_at": now_iso()}},
        upsert=True,
    )
    return {"token": token}


@api_router.get("/share/{token}")
async def get_shared_dashboard(token: str):
    doc = await db.settings.find_one({"key": "share_token"})
    if not doc or doc.get("value") != token:
        raise HTTPException(status_code=404, detail="Invalid share link")

    projects = await db.projects.find({}, {"_id": 0}).to_list(1000)
    totals = await hours_by_project()
    grouped = await entries_by_project()
    for p in projects:
        p["total_hours"] = totals.get(p["id"], 0.0)
        p["entries"] = sorted(
            grouped.get(p["id"], []),
            key=lambda e: e.get("date", ""),
            reverse=True,
        )

    order = {"in_progress": 0, "re_editing": 1, "delivered": 2, "final": 3}
    projects.sort(key=lambda p: (order.get(p.get("status", "in_progress"), 9), p.get("created_at", "")))

    total_hours = sum(p["total_hours"] for p in projects)

    return {
        "projects": projects,
        "total_hours": round(total_hours, 2),
        "generated_at": now_iso(),
    }


@api_router.get("/")
async def root():
    return {"service": "project-hours-tracker", "status": "ok"}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

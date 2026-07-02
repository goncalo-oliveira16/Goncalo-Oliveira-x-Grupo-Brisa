"""Backend API tests for the Hours/Ledger project tracker."""
import os
from datetime import date, timedelta

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://work-dashboard-52.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def created_ids():
    """Track created project ids for cleanup."""
    ids = {"projects": [], "entries": []}
    yield ids
    # Cleanup: best effort delete
    s = requests.Session()
    for eid in ids["entries"]:
        try:
            s.delete(f"{API}/entries/{eid}")
        except Exception:
            pass
    for pid in ids["projects"]:
        try:
            s.delete(f"{API}/projects/{pid}")
        except Exception:
            pass


# ---------------- Health ----------------

def test_root_health(session):
    r = session.get(f"{API}/")
    assert r.status_code == 200
    data = r.json()
    assert data.get("status") == "ok"


# ---------------- Projects CRUD ----------------

def test_list_projects_returns_list(session):
    r = session.get(f"{API}/projects")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_create_project_and_get(session, created_ids):
    payload = {
        "name": "TEST_Backend Project A",
        "client": "TEST_Client",
        "description": "TEST description",
        "deadline": "2026-12-31",
        "status": "in_progress",
    }
    r = session.post(f"{API}/projects", json=payload)
    assert r.status_code == 200, r.text
    p = r.json()
    assert p["name"] == payload["name"]
    assert p["client"] == payload["client"]
    assert p["status"] == "in_progress"
    assert "id" in p and isinstance(p["id"], str)
    assert p["total_hours"] == 0.0
    created_ids["projects"].append(p["id"])

    # GET
    g = session.get(f"{API}/projects/{p['id']}")
    assert g.status_code == 200
    got = g.json()
    assert got["id"] == p["id"]
    assert got["name"] == payload["name"]
    assert got["total_hours"] == 0.0


def test_get_project_not_found(session):
    r = session.get(f"{API}/projects/nonexistent-uuid-xxx")
    assert r.status_code == 404


def test_update_project_and_persist(session, created_ids):
    # Create
    r = session.post(f"{API}/projects", json={"name": "TEST_Update Project"})
    assert r.status_code == 200
    pid = r.json()["id"]
    created_ids["projects"].append(pid)

    # Update
    u = session.put(f"{API}/projects/{pid}", json={"name": "TEST_Updated Name", "status": "delivered"})
    assert u.status_code == 200
    data = u.json()
    assert data["name"] == "TEST_Updated Name"
    assert data["status"] == "delivered"

    # Verify persistence
    g = session.get(f"{API}/projects/{pid}")
    assert g.status_code == 200
    assert g.json()["name"] == "TEST_Updated Name"
    assert g.json()["status"] == "delivered"


def test_update_project_no_fields(session, created_ids):
    r = session.post(f"{API}/projects", json={"name": "TEST_NoFields Project"})
    assert r.status_code == 200
    pid = r.json()["id"]
    created_ids["projects"].append(pid)

    u = session.put(f"{API}/projects/{pid}", json={})
    assert u.status_code == 400


def test_update_project_not_found(session):
    r = session.put(f"{API}/projects/nonexistent-uuid-xxx", json={"name": "x"})
    assert r.status_code == 404


# ---------------- Time entries ----------------

def test_create_entry_and_total_hours(session, created_ids):
    # Setup project
    r = session.post(f"{API}/projects", json={"name": "TEST_Entries Project"})
    pid = r.json()["id"]
    created_ids["projects"].append(pid)

    today = date.today().isoformat()
    e = session.post(f"{API}/projects/{pid}/entries", json={"date": today, "hours": 2.5, "description": "TEST work"})
    assert e.status_code == 200, e.text
    entry = e.json()
    assert entry["hours"] == 2.5
    assert entry["project_id"] == pid
    assert "id" in entry
    created_ids["entries"].append(entry["id"])

    # Add another
    e2 = session.post(f"{API}/projects/{pid}/entries", json={"date": today, "hours": 1.0, "description": "TEST more"})
    assert e2.status_code == 200
    created_ids["entries"].append(e2.json()["id"])

    # Total hours reflected on project
    g = session.get(f"{API}/projects/{pid}")
    assert g.status_code == 200
    assert g.json()["total_hours"] == 3.5

    # List entries newest first (both today, sort by created_at desc)
    lst = session.get(f"{API}/projects/{pid}/entries")
    assert lst.status_code == 200
    entries = lst.json()
    assert len(entries) == 2


def test_create_entry_for_missing_project(session):
    r = session.post(f"{API}/projects/nope-nope/entries", json={"date": "2026-01-01", "hours": 1})
    assert r.status_code == 404


def test_update_entry_persists(session, created_ids):
    r = session.post(f"{API}/projects", json={"name": "TEST_EntryUpdate Project"})
    pid = r.json()["id"]
    created_ids["projects"].append(pid)
    e = session.post(f"{API}/projects/{pid}/entries", json={"date": "2026-01-01", "hours": 1.0, "description": "TEST"})
    eid = e.json()["id"]
    created_ids["entries"].append(eid)

    u = session.put(f"{API}/entries/{eid}", json={"hours": 4.25, "description": "TEST updated"})
    assert u.status_code == 200
    assert u.json()["hours"] == 4.25
    assert u.json()["description"] == "TEST updated"

    # Verify total_hours updated
    g = session.get(f"{API}/projects/{pid}")
    assert g.json()["total_hours"] == 4.25


def test_update_entry_not_found(session):
    r = session.put(f"{API}/entries/nonexistent", json={"hours": 1})
    assert r.status_code == 404


def test_delete_entry_and_verify(session, created_ids):
    r = session.post(f"{API}/projects", json={"name": "TEST_EntryDelete Project"})
    pid = r.json()["id"]
    created_ids["projects"].append(pid)
    e = session.post(f"{API}/projects/{pid}/entries", json={"date": "2026-01-01", "hours": 2.0})
    eid = e.json()["id"]

    d = session.delete(f"{API}/entries/{eid}")
    assert d.status_code == 200
    assert d.json().get("ok") is True

    # Not found next time
    d2 = session.delete(f"{API}/entries/{eid}")
    assert d2.status_code == 404


def test_delete_project_cascades_entries(session):
    r = session.post(f"{API}/projects", json={"name": "TEST_Cascade Project"})
    pid = r.json()["id"]
    e = session.post(f"{API}/projects/{pid}/entries", json={"date": "2026-01-01", "hours": 1.5})
    eid = e.json()["id"]

    d = session.delete(f"{API}/projects/{pid}")
    assert d.status_code == 200

    # Project gone
    g = session.get(f"{API}/projects/{pid}")
    assert g.status_code == 404

    # Entry gone - delete should return 404
    d2 = session.delete(f"{API}/entries/{eid}")
    assert d2.status_code == 404


def test_delete_project_not_found(session):
    r = session.delete(f"{API}/projects/nonexistent")
    assert r.status_code == 404


# ---------------- Stats ----------------

def test_stats_structure_and_this_week(session, created_ids):
    # Create a project + entries with today's date to guarantee non-zero week
    r = session.post(f"{API}/projects", json={"name": "TEST_Stats Project"})
    pid = r.json()["id"]
    created_ids["projects"].append(pid)
    today = date.today().isoformat()
    old = (date.today() - timedelta(days=30)).isoformat()

    e1 = session.post(f"{API}/projects/{pid}/entries", json={"date": today, "hours": 5.0})
    created_ids["entries"].append(e1.json()["id"])
    e2 = session.post(f"{API}/projects/{pid}/entries", json={"date": old, "hours": 10.0})
    created_ids["entries"].append(e2.json()["id"])

    s = session.get(f"{API}/stats")
    assert s.status_code == 200
    data = s.json()
    for k in ("total_projects", "total_hours", "hours_this_week", "active", "counts"):
        assert k in data, f"missing key {k}"
    assert isinstance(data["counts"], dict)
    for k in ("in_progress", "delivered", "re_editing", "final"):
        assert k in data["counts"]
    # hours_this_week should include the 5.0 from today entry but not the 10.0 from 30 days ago
    assert data["hours_this_week"] >= 5.0
    assert data["total_hours"] >= 15.0


# ---------------- Share ----------------

def test_share_token_get_and_stable(session):
    r1 = session.get(f"{API}/share/token")
    assert r1.status_code == 200
    t1 = r1.json()["token"]
    assert isinstance(t1, str) and len(t1) > 0

    r2 = session.get(f"{API}/share/token")
    assert r2.status_code == 200
    assert r2.json()["token"] == t1  # stable


def test_share_shared_view_returns_projects(session):
    tok = session.get(f"{API}/share/token").json()["token"]
    r = session.get(f"{API}/share/{tok}")
    assert r.status_code == 200
    data = r.json()
    assert "projects" in data
    assert "total_hours" in data
    assert "generated_at" in data
    assert isinstance(data["projects"], list)
    # Each project should carry entries
    for p in data["projects"]:
        assert "entries" in p
        assert "total_hours" in p


def test_share_invalid_token(session):
    r = session.get(f"{API}/share/BADTOKEN_INVALID_1234")
    assert r.status_code == 404


def test_share_rotate_invalidates_old(session):
    old = session.get(f"{API}/share/token").json()["token"]
    rot = session.post(f"{API}/share/rotate")
    assert rot.status_code == 200
    new = rot.json()["token"]
    assert new != old

    # Old token no longer works
    r = session.get(f"{API}/share/{old}")
    assert r.status_code == 404
    # New works
    r2 = session.get(f"{API}/share/{new}")
    assert r2.status_code == 200

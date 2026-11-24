from typing import Optional
from fastapi import APIRouter, Header

from backend.infra.db import list_scenarios_by_domain, upsert_scenario
from backend.models.schemas import ScenarioCreateRequest

router = APIRouter(prefix="/api", tags=["scenarios"])


@router.get("/scenarios")
def get_all_scenarios(domain: Optional[str] = None):
    items = list_scenarios_by_domain(domain)
    return {
        "status": "success",
        "total": len(items),
        "data": items,
    }


@router.post("/scenarios")
def create_or_update_scenario(payload: ScenarioCreateRequest):
    saved = upsert_scenario(payload.model_dump())
    return {
        "status": "success",
        "data": saved,
    }


@router.get("/match-scenarios")
def match_scenarios(
    domain: Optional[str] = None,
    wavelength: float = 790.0,
    department: str = "肝胆外科",
    x_session_id: Optional[str] = Header(default=None),
):
    import backend.main as main_mod
    sid = (x_session_id or "default").strip() or "default"
    active_domain = domain or main_mod.get_session_state(sid).domain

    candidates = list_scenarios_by_domain(active_domain)
    matched_results = []

    if active_domain == "devices":
        for robot in candidates:
            exc = robot.get("excitation_compatible") or [780.0, 810.0]
            min_w, max_w = float(exc[0]), float(exc[1])
            if min_w <= wavelength <= max_w:
                spectral_score = 95 - abs(wavelength - (min_w + max_w) / 2)
            elif wavelength < min_w:
                spectral_score = max(40, 90 - (min_w - wavelength) * 2)
            else:
                spectral_score = max(40, 90 - (wavelength - max_w) * 2)

            depts = robot.get("suitability_departments") or []
            dept_score = 90 if department in depts else 50
            compatibility_score = round((spectral_score * 0.6) + (dept_score * 0.4))

            matched_results.append({
                "id": robot["id"],
                "name": robot["name"],
                "manufacturer": robot["manufacturer"],
                "compatibility_score": compatibility_score,
                "national_installs": robot["national_installs"],
                "channels": robot["channels"],
                "description": robot["description"],
                "recommended_dept": department,
            })
    else:
        bonus_map = {"drugs": (2, 10), "ai": (4, 8), "surgical": (3, 9)}
        bonus, penalty = bonus_map.get(active_domain, (2, 8))
        for item in candidates:
            base = int(item.get("base_score", 90))
            depts = item.get("suitability_departments") or []
            if department in depts:
                score = min(100, base + bonus)
            else:
                score = max(50, base - penalty)
            matched_results.append({
                "id": item["id"],
                "name": item["name"],
                "manufacturer": item["manufacturer"],
                "compatibility_score": score,
                "national_installs": item["national_installs"],
                "channels": item["channels"],
                "description": item["description"],
                "recommended_dept": department,
            })

    matched_results = sorted(matched_results, key=lambda x: x["compatibility_score"], reverse=True)

    return {
        "status": "success",
        "query_wavelength": wavelength,
        "query_department": department,
        "query_domain": active_domain,
        "total_candidates": len(candidates),
        "matches": matched_results[:3],
    }

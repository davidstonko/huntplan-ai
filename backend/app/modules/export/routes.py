"""
HuntPlan AI — Export Routes

Endpoints for exporting hunt plans and tracks as GPX or KML files.
"""

from fastapi import APIRouter, Query
from fastapi.responses import Response
from pydantic import BaseModel
from typing import Optional

from app.modules.export.gpx import generate_gpx, generate_kml


router = APIRouter()


class ExportPlanRequest(BaseModel):
    """Export a hunt plan with its annotations."""
    name: str
    description: Optional[str] = ""
    waypoints: Optional[list[dict]] = []
    routes: Optional[list[dict]] = []
    areas: Optional[list[dict]] = []  # Areas exported as closed routes
    parking_point: Optional[dict] = None

class ExportTrackRequest(BaseModel):
    """Export a recorded GPS track."""
    name: str
    points: list[dict]  # [{lat, lng, timestamp, altitude, speed}]
    distance_meters: Optional[float] = None
    duration_seconds: Optional[int] = None


@router.post("/plan/gpx")
async def export_plan_gpx(request: ExportPlanRequest):
    """Export a hunt plan as GPX file."""
    # Convert parking point to waypoint
    waypoints = list(request.waypoints or [])
    if request.parking_point:
        waypoints.insert(0, {
            "lat": request.parking_point.get("lat"),
            "lng": request.parking_point.get("lng"),
            "label": "Parking",
            "icon": "parking",
            "notes": "Parking location",
        })

    # Convert areas to closed routes (polygon → route with first point repeated)
    routes = list(request.routes or [])
    for area in (request.areas or []):
        polygon = area.get("polygon", [])
        if polygon:
            # Close the polygon by repeating first point
            closed = list(polygon)
            if closed and closed[0] != closed[-1]:
                closed.append(closed[0])
            routes.append({
                "label": area.get("label", "Area"),
                "points": closed,
            })

    gpx_xml = generate_gpx(
        name=request.name,
        waypoints=waypoints,
        routes=routes,
        description=request.description,
    )

    filename = request.name.replace(" ", "_").lower()
    return Response(
        content=gpx_xml,
        media_type="application/gpx+xml",
        headers={"Content-Disposition": f'attachment; filename="{filename}.gpx"'},
    )


@router.post("/plan/kml")
async def export_plan_kml(request: ExportPlanRequest):
    """Export a hunt plan as KML file."""
    waypoints = list(request.waypoints or [])
    if request.parking_point:
        waypoints.insert(0, {
            "lat": request.parking_point.get("lat"),
            "lng": request.parking_point.get("lng"),
            "label": "Parking",
            "icon": "parking",
        })

    routes = list(request.routes or [])
    for area in (request.areas or []):
        polygon = area.get("polygon", [])
        if polygon:
            closed = list(polygon)
            if closed and closed[0] != closed[-1]:
                closed.append(closed[0])
            routes.append({
                "label": area.get("label", "Area"),
                "points": closed,
            })

    kml_xml = generate_kml(
        name=request.name,
        waypoints=waypoints,
        routes=routes,
        description=request.description,
    )

    filename = request.name.replace(" ", "_").lower()
    return Response(
        content=kml_xml,
        media_type="application/vnd.google-earth.kml+xml",
        headers={"Content-Disposition": f'attachment; filename="{filename}.kml"'},
    )


@router.post("/track/gpx")
async def export_track_gpx(request: ExportTrackRequest):
    """Export a recorded GPS track as GPX file."""
    desc = ""
    if request.distance_meters:
        miles = request.distance_meters * 0.000621371
        desc += f"Distance: {miles:.2f} mi. "
    if request.duration_seconds:
        hours = request.duration_seconds // 3600
        mins = (request.duration_seconds % 3600) // 60
        desc += f"Duration: {hours}h {mins}m."

    gpx_xml = generate_gpx(
        name=request.name,
        tracks=[{
            "name": request.name,
            "points": request.points,
        }],
        description=desc,
    )

    filename = request.name.replace(" ", "_").lower()
    return Response(
        content=gpx_xml,
        media_type="application/gpx+xml",
        headers={"Content-Disposition": f'attachment; filename="{filename}.gpx"'},
    )


@router.post("/track/kml")
async def export_track_kml(request: ExportTrackRequest):
    """Export a recorded GPS track as KML file."""
    kml_xml = generate_kml(
        name=request.name,
        tracks=[{
            "name": request.name,
            "points": request.points,
        }],
    )

    filename = request.name.replace(" ", "_").lower()
    return Response(
        content=kml_xml,
        media_type="application/vnd.google-earth.kml+xml",
        headers={"Content-Disposition": f'attachment; filename="{filename}.kml"'},
    )

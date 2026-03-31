"""
HuntPlan AI — GPX/KML Export

Generates GPX and KML files from hunt plans and recorded tracks.
Standard format compatible with Garmin, Avenza, Google Earth, etc.
"""

import xml.etree.ElementTree as ET
from datetime import datetime
from typing import Optional


def generate_gpx(
    name: str,
    waypoints: list[dict] = None,
    routes: list[dict] = None,
    tracks: list[dict] = None,
    description: str = "",
) -> str:
    """
    Generate a GPX 1.1 XML string from plan data.

    Args:
        name: Name of the GPX file / plan
        waypoints: List of {lat, lng, label, notes, icon}
        routes: List of {label, points: [[lng,lat],...]}
        tracks: List of {name, points: [{lat, lng, timestamp, altitude},...]}
        description: Optional description

    Returns:
        GPX XML as string
    """
    gpx = ET.Element("gpx", {
        "version": "1.1",
        "creator": "MDHuntFishOutdoors",
        "xmlns": "http://www.topografix.com/GPX/1/1",
        "xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
        "xsi:schemaLocation": (
            "http://www.topografix.com/GPX/1/1 "
            "http://www.topografix.com/GPX/1/1/gpx.xsd"
        ),
    })

    # Metadata
    metadata = ET.SubElement(gpx, "metadata")
    ET.SubElement(metadata, "name").text = name
    ET.SubElement(metadata, "desc").text = description or f"Hunt plan: {name}"
    ET.SubElement(metadata, "time").text = datetime.utcnow().isoformat() + "Z"

    author = ET.SubElement(metadata, "author")
    ET.SubElement(author, "name").text = "MDHuntFishOutdoors"

    # Waypoints
    for wp in (waypoints or []):
        wpt = ET.SubElement(gpx, "wpt", {
            "lat": str(wp.get("lat", 0)),
            "lon": str(wp.get("lng", 0)),
        })
        if wp.get("label"):
            ET.SubElement(wpt, "name").text = wp["label"]
        if wp.get("notes"):
            ET.SubElement(wpt, "desc").text = wp["notes"]
        if wp.get("icon"):
            ET.SubElement(wpt, "sym").text = wp["icon"]
        if wp.get("altitude"):
            ET.SubElement(wpt, "ele").text = str(wp["altitude"])

    # Routes (polylines from Scout plans)
    for rt in (routes or []):
        rte = ET.SubElement(gpx, "rte")
        ET.SubElement(rte, "name").text = rt.get("label", "Route")
        for point in rt.get("points", []):
            # points are [lng, lat] arrays
            if len(point) >= 2:
                rtept = ET.SubElement(rte, "rtept", {
                    "lat": str(point[1]),
                    "lon": str(point[0]),
                })

    # Tracks (recorded GPS tracks)
    for tk in (tracks or []):
        trk = ET.SubElement(gpx, "trk")
        ET.SubElement(trk, "name").text = tk.get("name", "Track")
        trkseg = ET.SubElement(trk, "trkseg")
        for pt in tk.get("points", []):
            trkpt = ET.SubElement(trkseg, "trkpt", {
                "lat": str(pt.get("lat", 0)),
                "lon": str(pt.get("lng", 0)),
            })
            if pt.get("altitude"):
                ET.SubElement(trkpt, "ele").text = str(pt["altitude"])
            if pt.get("timestamp"):
                ET.SubElement(trkpt, "time").text = pt["timestamp"]
            if pt.get("speed"):
                # Speed stored in extensions
                ext = ET.SubElement(trkpt, "extensions")
                ET.SubElement(ext, "speed").text = str(pt["speed"])

    return ET.tostring(gpx, encoding="unicode", xml_declaration=True)


def generate_kml(
    name: str,
    waypoints: list[dict] = None,
    routes: list[dict] = None,
    tracks: list[dict] = None,
    description: str = "",
) -> str:
    """
    Generate a KML 2.2 XML string from plan data.
    Compatible with Google Earth and Google Maps.
    """
    kml = ET.Element("kml", {"xmlns": "http://www.opengis.net/kml/2.2"})
    doc = ET.SubElement(kml, "Document")
    ET.SubElement(doc, "name").text = name
    ET.SubElement(doc, "description").text = description or f"Hunt plan: {name}"

    # Styles for different pin types
    _add_kml_style(doc, "waypoint", "http://maps.google.com/mapfiles/kml/paddle/red-stars.png")
    _add_kml_style(doc, "parking", "http://maps.google.com/mapfiles/kml/paddle/P.png")

    # Waypoints as Placemarks
    for wp in (waypoints or []):
        pm = ET.SubElement(doc, "Placemark")
        ET.SubElement(pm, "name").text = wp.get("label", "Waypoint")
        if wp.get("notes"):
            ET.SubElement(pm, "description").text = wp["notes"]
        ET.SubElement(pm, "styleUrl").text = (
            "#parking" if wp.get("icon") == "parking" else "#waypoint"
        )
        point = ET.SubElement(pm, "Point")
        ET.SubElement(point, "coordinates").text = (
            f"{wp.get('lng', 0)},{wp.get('lat', 0)},0"
        )

    # Routes as LineStrings
    for rt in (routes or []):
        pm = ET.SubElement(doc, "Placemark")
        ET.SubElement(pm, "name").text = rt.get("label", "Route")
        ls = ET.SubElement(pm, "LineString")
        ET.SubElement(ls, "tessellate").text = "1"
        coords = " ".join(
            f"{p[0]},{p[1]},0" for p in rt.get("points", []) if len(p) >= 2
        )
        ET.SubElement(ls, "coordinates").text = coords

    # Tracks as LineStrings
    for tk in (tracks or []):
        pm = ET.SubElement(doc, "Placemark")
        ET.SubElement(pm, "name").text = tk.get("name", "Track")
        ls = ET.SubElement(pm, "LineString")
        ET.SubElement(ls, "tessellate").text = "1"
        coords = " ".join(
            f"{pt.get('lng', 0)},{pt.get('lat', 0)},{pt.get('altitude', 0)}"
            for pt in tk.get("points", [])
        )
        ET.SubElement(ls, "coordinates").text = coords

    return ET.tostring(kml, encoding="unicode", xml_declaration=True)


def _add_kml_style(doc: ET.Element, style_id: str, icon_url: str):
    """Add a named icon style to a KML Document."""
    style = ET.SubElement(doc, "Style", {"id": style_id})
    icon_style = ET.SubElement(style, "IconStyle")
    icon = ET.SubElement(icon_style, "Icon")
    ET.SubElement(icon, "href").text = icon_url

#!/usr/bin/env python3
"""
Find local businesses without websites using OpenStreetMap (Overpass API + Nominatim).
Completely free — no API key required.
"""

import argparse
import json
import sys
import time
from datetime import datetime
from html import escape

import requests
from rich.console import Console
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.table import Table
from rich import box

console = Console()

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
OVERPASS_URL  = "https://overpass-api.de/api/interpreter"

# Map friendly category names → OSM amenity/shop/craft keys
CATEGORY_MAP = {
    "plumber":       [('craft', 'plumber'), ('shop', 'plumber')],
    "electrician":   [('craft', 'electrician')],
    "roofer":        [('craft', 'roofer')],
    "painter":       [('craft', 'painter')],
    "hvac":          [('craft', 'hvac'), ('shop', 'hvac')],
    "locksmith":     [('craft', 'locksmith'), ('shop', 'locksmith')],
    "carpenter":     [('craft', 'carpenter')],
    "landscaping":   [('leisure', 'garden_centre'), ('shop', 'garden_centre'), ('craft', 'landscaper')],
    "auto repair":   [('shop', 'car_repair')],
    "hair salon":    [('shop', 'hairdresser')],
    "nail salon":    [('shop', 'nail_salon')],
    "restaurant":    [('amenity', 'restaurant')],
    "cafe":          [('amenity', 'cafe')],
    "dentist":       [('amenity', 'dentist')],
    "lawyer":        [('office', 'lawyer')],
    "accountant":    [('office', 'accountant')],
    "photographer":  [('craft', 'photographer')],
    "tailor":        [('craft', 'tailor')],
    "cleaning":      [('craft', 'cleaning')],
    "pest control":  [('craft', 'pest_control')],
}


def geocode_city(city: str) -> tuple[float, float, float]:
    """Return (lat, lon, radius_km) for a city name using Nominatim."""
    params = {"q": city, "format": "json", "limit": 1}
    headers = {"User-Agent": "NoWebsiteFinder/1.0 (contact@relier.app)"}
    try:
        r = requests.get(NOMINATIM_URL, params=params, headers=headers, timeout=10)
        r.raise_for_status()
        data = r.json()
    except Exception as exc:
        console.print(f"[red]Geocoding failed: {exc}[/red]")
        sys.exit(1)

    if not data:
        console.print(f"[red]City not found: {city!r}[/red]")
        sys.exit(1)

    place = data[0]
    lat = float(place["lat"])
    lon = float(place["lon"])

    # Use bounding box diagonal to pick a sensible search radius
    bb = place.get("boundingbox", [])
    if len(bb) == 4:
        lat_span = abs(float(bb[1]) - float(bb[0]))
        lon_span = abs(float(bb[3]) - float(bb[2]))
        radius_km = min(max((lat_span + lon_span) / 2 * 55, 5), 25)
    else:
        radius_km = 10

    return lat, lon, radius_km


def build_overpass_query(lat: float, lon: float, radius_m: int, tags: list[tuple[str, str]]) -> str:
    """Build an Overpass QL query for nodes/ways with given tags in a radius."""
    parts = []
    for key, value in tags:
        parts.append(f'node["{key}"="{value}"](around:{radius_m},{lat},{lon});')
        parts.append(f'way["{key}"="{value}"](around:{radius_m},{lat},{lon});')
    inner = "\n  ".join(parts)
    return f"[out:json][timeout:30];\n(\n  {inner}\n);\nout center tags;"


def run_overpass(query: str) -> list[dict]:
    """Execute the Overpass query and return elements."""
    try:
        r = requests.post(OVERPASS_URL, data={"data": query}, timeout=45)
        r.raise_for_status()
        return r.json().get("elements", [])
    except Exception as exc:
        console.print(f"[red]Overpass API error: {exc}[/red]")
        sys.exit(1)


def extract_businesses(elements: list[dict]) -> list[dict]:
    """Turn raw OSM elements into a clean list of business dicts."""
    seen = set()
    businesses = []
    for el in elements:
        tags = el.get("tags", {})
        name = tags.get("name", "").strip()
        if not name or name in seen:
            continue
        seen.add(name)

        # Derive lat/lon (nodes have direct coords; ways have 'center')
        if el["type"] == "node":
            lat = el.get("lat")
            lon = el.get("lon")
        else:
            center = el.get("center", {})
            lat = center.get("lat")
            lon = center.get("lon")

        website = (
            tags.get("website") or
            tags.get("url") or
            tags.get("contact:website") or
            ""
        ).strip()

        phone = (
            tags.get("phone") or
            tags.get("contact:phone") or
            tags.get("mobile") or
            ""
        ).strip()

        businesses.append({
            "name":    name,
            "phone":   phone,
            "website": website,
            "address": _build_address(tags),
            "city":    tags.get("addr:city", ""),
            "state":   tags.get("addr:state", ""),
            "osm_id":  el.get("id"),
            "lat":     lat,
            "lon":     lon,
            "opening_hours": tags.get("opening_hours", ""),
        })

    return businesses


def _build_address(tags: dict) -> str:
    parts = [
        tags.get("addr:housenumber", ""),
        tags.get("addr:street", ""),
    ]
    return " ".join(p for p in parts if p).strip()


def display_table(businesses: list[dict], category: str, city: str) -> None:
    total   = len(businesses)
    no_site = [b for b in businesses if not b["website"]]
    has_site = [b for b in businesses if b["website"]]

    console.print()
    console.print(Panel(
        f"[bold cyan]{category.title()}[/bold cyan] businesses in [bold yellow]{city}[/bold yellow]\n"
        f"[green]{len(no_site)} without websites[/green]  ·  "
        f"[dim]{len(has_site)} with websites[/dim]  ·  "
        f"[dim]{total} total found[/dim]",
        title="[bold]No-Website Finder  ·  OpenStreetMap[/bold]",
        border_style="cyan",
    ))

    if not no_site:
        console.print("[yellow]No businesses without websites found in this area.[/yellow]")
        return

    table = Table(
        show_header=True,
        header_style="bold magenta",
        box=box.ROUNDED,
        expand=True,
    )
    table.add_column("#",          style="dim",        width=3,  no_wrap=True)
    table.add_column("Business Name",                  min_width=22)
    table.add_column("Phone",      style="cyan",       width=16, no_wrap=True)
    table.add_column("Address",    style="dim",        min_width=20)
    table.add_column("Hours",      style="dim",        min_width=14)
    table.add_column("OSM Link",   style="blue",       min_width=28)

    for i, b in enumerate(no_site, 1):
        osm_url = f"https://www.openstreetmap.org/node/{b['osm_id']}" if b["osm_id"] else ""
        table.add_row(
            str(i),
            b["name"],
            b["phone"] or "[dim]—[/dim]",
            b["address"] or "[dim]—[/dim]",
            b["opening_hours"] or "[dim]—[/dim]",
            osm_url or "[dim]—[/dim]",
        )

    console.print(table)


def save_html(businesses: list[dict], category: str, city: str, path: str) -> None:
    no_site = [b for b in businesses if not b["website"]]
    rows = ""
    for i, b in enumerate(no_site, 1):
        osm_url = f"https://www.openstreetmap.org/node/{b['osm_id']}" if b["osm_id"] else ""
        osm_link = f'<a href="{escape(osm_url)}" target="_blank">View on OSM</a>' if osm_url else "—"
        rows += f"""
        <tr>
          <td>{i}</td>
          <td>{escape(b['name'])}</td>
          <td>{escape(b['phone']) or '—'}</td>
          <td>{escape(b['address']) or '—'}</td>
          <td>{escape(b['opening_hours']) or '—'}</td>
          <td>{osm_link}</td>
        </tr>"""

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>{escape(category.title())} Without Websites — {escape(city)}</title>
  <style>
    *{{box-sizing:border-box;margin:0;padding:0}}
    body{{font-family:system-ui,sans-serif;background:#0f1117;color:#e2e8f0;padding:2rem}}
    h1{{color:#67e8f9;margin-bottom:.5rem}}
    p.sub{{color:#94a3b8;margin-bottom:1.5rem;font-size:.9rem}}
    table{{width:100%;border-collapse:collapse;font-size:.9rem}}
    th{{background:#1e293b;color:#67e8f9;padding:.6rem 1rem;text-align:left}}
    td{{padding:.55rem 1rem;border-bottom:1px solid #1e293b}}
    tr:hover td{{background:#1e2030}}
    a{{color:#38bdf8;text-decoration:none}}
    a:hover{{text-decoration:underline}}
    .badge{{display:inline-block;background:#164e63;color:#67e8f9;border-radius:9999px;
            padding:.2rem .7rem;font-size:.75rem;margin-right:.4rem}}
  </style>
</head>
<body>
  <h1>{escape(category.title())} Businesses Without Websites</h1>
  <p class="sub">
    City: <strong>{escape(city)}</strong> &nbsp;·&nbsp;
    Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')} &nbsp;·&nbsp;
    Source: OpenStreetMap / Overpass API
    <span class="badge">{len(no_site)} leads</span>
  </p>
  <table>
    <thead><tr>
      <th>#</th><th>Business Name</th><th>Phone</th>
      <th>Address</th><th>Hours</th><th>Map</th>
    </tr></thead>
    <tbody>{rows}</tbody>
  </table>
</body>
</html>"""

    with open(path, "w", encoding="utf-8") as f:
        f.write(html)
    console.print(f"[green]HTML report saved → {path}[/green]")


def save_json(businesses: list[dict], category: str, city: str, path: str) -> None:
    no_site  = [b for b in businesses if not b["website"]]
    has_site = [b for b in businesses if b["website"]]
    payload = {
        "generated_at": datetime.now().isoformat(),
        "city":         city,
        "category":     category,
        "source":       "OpenStreetMap / Overpass API",
        "summary": {
            "total":        len(businesses),
            "without_website": len(no_site),
            "with_website": len(has_site),
        },
        "without_website": no_site,
        "with_website":    [{"name": b["name"], "website": b["website"]} for b in has_site],
    }
    with open(path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)
    console.print(f"[green]JSON export saved → {path}[/green]")


def list_categories() -> None:
    console.print("\n[bold cyan]Available categories:[/bold cyan]")
    for cat in sorted(CATEGORY_MAP):
        console.print(f"  [green]•[/green] {cat}")
    console.print()


def parse_args():
    p = argparse.ArgumentParser(
        description="Find local businesses without websites (free, no API key)."
    )
    p.add_argument("--city",     "-c", help="City to search (e.g. 'Austin, TX')")
    p.add_argument("--category", "-t", help="Business type (run --list to see all)")
    p.add_argument("--radius",   "-r", type=int, default=0,
                   help="Search radius in km (default: auto from city size)")
    p.add_argument("--output",   "-o", help="Save HTML report to this path")
    p.add_argument("--json",     "-j", help="Save JSON export to this path")
    p.add_argument("--list",     "-l", action="store_true",
                   help="List available categories and exit")
    p.add_argument("--show-all", "-a", action="store_true",
                   help="Also show businesses that have websites")
    return p.parse_args()


def main():
    args = parse_args()

    if args.list:
        list_categories()
        return

    city     = args.city     or console.input("[bold cyan]Enter city (e.g. Austin, TX): [/bold cyan]").strip()
    category = (args.category or console.input("[bold cyan]Enter category (e.g. plumber): [/bold cyan]").strip()).lower()

    if category not in CATEGORY_MAP:
        console.print(f"[red]Unknown category: {category!r}[/red]")
        list_categories()
        sys.exit(1)

    tags = CATEGORY_MAP[category]

    with Progress(SpinnerColumn(), TextColumn("[progress.description]{task.description}"), console=console) as prog:
        t = prog.add_task(f"[cyan]Geocoding {city!r}...", total=None)
        lat, lon, auto_radius = geocode_city(city)
        radius_km = args.radius if args.radius > 0 else auto_radius
        prog.update(t, description=f"[cyan]Found city at ({lat:.3f}, {lon:.3f}) — radius {radius_km:.1f} km")
        time.sleep(0.3)

        prog.update(t, description=f"[cyan]Querying Overpass API for '{category}' businesses...")
        query = build_overpass_query(lat, lon, int(radius_km * 1000), tags)
        elements = run_overpass(query)
        prog.update(t, description=f"[cyan]Processing {len(elements)} results...")
        businesses = extract_businesses(elements)

    display_table(businesses, category, city)

    if args.show_all:
        has_site = [b for b in businesses if b["website"]]
        if has_site:
            console.print(f"\n[dim]— {len(has_site)} businesses WITH websites (excluded from main list):[/dim]")
            for b in has_site:
                console.print(f"  [dim]• {b['name']} → {b['website']}[/dim]")

    if args.output:
        save_html(businesses, category, city, args.output)
    if args.json:
        save_json(businesses, category, city, args.json)


if __name__ == "__main__":
    main()

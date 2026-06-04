#!/usr/bin/env python3
"""
Local Business Website Checker
Finds local businesses without websites using the Google Maps Places API.
"""

import argparse
import json
import os
import sys
import time
from datetime import datetime
from html import escape

import googlemaps
from rich.console import Console
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, TaskProgressColumn
from rich.table import Table
from rich import box

console = Console()

PRICE_LEVELS = {0: "Free", 1: "$", 2: "$$", 3: "$$$", 4: "$$$$"}
GENERIC_TYPES = {"point_of_interest", "establishment", "food", "store", "premise"}
DETAIL_FIELDS = [
    "name",
    "formatted_address",
    "formatted_phone_number",
    "international_phone_number",
    "website",
    "rating",
    "user_ratings_total",
    "reviews",
    "opening_hours",
    "types",
    "price_level",
    "business_status",
    "url",
    "photos",
    "vicinity",
]


def stars_display(rating: float | None) -> str:
    """Convert a numeric rating (0-5) to star symbols."""
    if rating is None:
        return "N/A"
    full = int(rating)
    half = 1 if (rating - full) >= 0.5 else 0
    empty = 5 - full - half
    return "★" * full + ("½" if half else "") + "☆" * empty


def get_api_key(args_key: str | None) -> str:
    """Resolve Google Maps API key from CLI arg, env var, or interactive prompt."""
    if args_key:
        return args_key
    env_key = os.environ.get("GOOGLE_MAPS_API_KEY", "")
    if env_key:
        return env_key
    console.print("[yellow]No API key found via --api-key or GOOGLE_MAPS_API_KEY env var.[/yellow]")
    key = console.input("[bold cyan]Enter your Google Maps API key: [/bold cyan]").strip()
    if not key:
        console.print("[red]No API key provided. Exiting.[/red]")
        sys.exit(1)
    return key


def search_places(gmaps: googlemaps.Client, query: str, max_results: int) -> list[dict]:
    """Search Google Maps Places and paginate up to 3 pages (max 60 results)."""
    results = []
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console,
    ) as progress:
        task = progress.add_task(f"[cyan]Searching for '{query}'...", total=None)
        try:
            response = gmaps.places(query=query)
        except googlemaps.exceptions.ApiError as exc:
            console.print(f"[red]Google Maps API error: {exc}[/red]")
            sys.exit(1)

        page = 0
        while response and page < 3:
            batch = response.get("results", [])
            results.extend(batch)
            progress.update(task, description=f"[cyan]Fetched page {page + 1} — {len(results)} businesses found...")

            if len(results) >= max_results:
                break

            next_page_token = response.get("next_page_token")
            if not next_page_token:
                break

            time.sleep(2)
            try:
                response = gmaps.places(query=query, page_token=next_page_token)
            except googlemaps.exceptions.ApiError as exc:
                console.print(f"[yellow]Warning: failed to fetch next page — {exc}[/yellow]")
                break
            page += 1

    return results[:max_results]


def fetch_place_details(gmaps: googlemaps.Client, places: list[dict]) -> tuple[list[dict], list[dict]]:
    """Fetch full details for each place; return (with_website, without_website)."""
    with_website: list[dict] = []
    without_website: list[dict] = []

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        BarColumn(),
        TaskProgressColumn(),
        console=console,
    ) as progress:
        task = progress.add_task("[cyan]Fetching place details...", total=len(places))

        for place in places:
            place_id = place.get("place_id")
            name = place.get("name", "Unknown")
            if not place_id:
                progress.advance(task)
                continue

            try:
                detail_response = gmaps.place(place_id=place_id, fields=DETAIL_FIELDS)
                detail = detail_response.get("result", {})
            except googlemaps.exceptions.ApiError as exc:
                console.print(f"[yellow]Warning: skipping '{name}' — {exc}[/yellow]")
                progress.advance(task)
                time.sleep(0.1)
                continue

            if detail.get("website"):
                with_website.append(detail)
            else:
                without_website.append(detail)

            progress.update(
                task,
                description=f"[cyan]Fetching details... ({len(with_website) + len(without_website)}/{len(places)})",
            )
            progress.advance(task)
            time.sleep(0.1)

    return with_website, without_website


def print_terminal_table(businesses: list[dict], title: str) -> None:
    """Print a rich table of businesses in the terminal."""
    table = Table(
        title=title,
        box=box.ROUNDED,
        highlight=True,
        show_lines=True,
        header_style="bold magenta",
    )
    table.add_column("Business Name", style="bold white", no_wrap=False, min_width=20)
    table.add_column("Phone", style="cyan", no_wrap=True)
    table.add_column("Rating", justify="center", style="yellow")
    table.add_column("Reviews", justify="right", style="green")
    table.add_column("Status", style="bold")
    table.add_column("Google Maps URL", style="blue", no_wrap=False, max_width=45)

    for biz in businesses:
        name = biz.get("name", "N/A")
        phone = biz.get("formatted_phone_number") or biz.get("international_phone_number") or "N/A"
        rating = biz.get("rating")
        rating_str = f"{stars_display(rating)} ({rating})" if rating else "N/A"
        reviews = str(biz.get("user_ratings_total", 0))
        status_raw = biz.get("business_status", "UNKNOWN")
        status_map = {
            "OPERATIONAL": "[green]Operational[/green]",
            "CLOSED_TEMPORARILY": "[yellow]Temp. Closed[/yellow]",
            "CLOSED_PERMANENTLY": "[red]Perm. Closed[/red]",
        }
        status = status_map.get(status_raw, status_raw)
        maps_url = biz.get("url", "N/A")
        table.add_row(name, phone, rating_str, reviews, status, maps_url)

    console.print(table)


def generate_html_report(
    businesses: list[dict],
    query: str,
    timestamp: str,
    output_path: str,
    total_checked: int,
) -> None:
    """Generate a self-contained HTML report for businesses without websites."""

    def _badge(text: str, color: str = "#e94560") -> str:
        return (
            f'<span style="background:{color};color:#fff;padding:3px 10px;'
            f'border-radius:12px;font-size:0.75rem;font-weight:700;">{escape(text)}</span>'
        )

    def _status_badge(status: str) -> str:
        colors = {
            "OPERATIONAL": "#27ae60",
            "CLOSED_TEMPORARILY": "#f39c12",
            "CLOSED_PERMANENTLY": "#e74c3c",
        }
        labels = {
            "OPERATIONAL": "Operational",
            "CLOSED_TEMPORARILY": "Temporarily Closed",
            "CLOSED_PERMANENTLY": "Permanently Closed",
        }
        color = colors.get(status, "#7f8c8d")
        label = labels.get(status, status)
        return _badge(label, color)

    def _stars_html(rating: float | None) -> str:
        if rating is None:
            return "<span style='color:#aaa;'>No rating</span>"
        full = int(rating)
        half = 1 if (rating - full) >= 0.5 else 0
        empty = 5 - full - half
        stars = (
            '<span style="color:#f1c40f;font-size:1.1rem;">'
            + "★" * full
            + ("½" if half else "")
            + '<span style="color:#555;">' + "☆" * empty + "</span>"
            + "</span>"
        )
        return stars

    def _type_badges(types: list[str]) -> str:
        filtered = [t for t in (types or []) if t not in GENERIC_TYPES]
        if not filtered:
            return ""
        return " ".join(
            f'<span style="background:#0f3460;color:#a8d8ea;padding:2px 8px;'
            f'border-radius:10px;font-size:0.7rem;text-transform:capitalize;">'
            f'{escape(t.replace("_", " "))}</span>'
            for t in filtered[:6]
        )

    def _hours_html(opening_hours: dict | None) -> str:
        if not opening_hours:
            return ""
        weekday_text = opening_hours.get("weekday_text", [])
        if not weekday_text:
            return ""
        rows = "".join(
            f'<li style="padding:2px 0;color:#ccc;font-size:0.82rem;">{escape(h)}</li>'
            for h in weekday_text
        )
        return (
            '<div style="margin-top:12px;">'
            '<div style="color:#a8d8ea;font-size:0.8rem;font-weight:700;margin-bottom:4px;'
            'text-transform:uppercase;letter-spacing:1px;">Hours</div>'
            f'<ul style="list-style:none;margin:0;padding:0;">{rows}</ul>'
            "</div>"
        )

    def _reviews_html(reviews: list[dict] | None) -> str:
        if not reviews:
            return ""
        html_parts = [
            '<div style="margin-top:16px;border-top:1px solid #2a3a5e;padding-top:12px;">'
            '<div style="color:#a8d8ea;font-size:0.8rem;font-weight:700;margin-bottom:8px;'
            'text-transform:uppercase;letter-spacing:1px;">Customer Reviews</div>'
        ]
        for review in reviews[:5]:
            author = escape(review.get("author_name", "Anonymous"))
            rev_rating = review.get("rating", 0)
            rel_time = escape(review.get("relative_time_description", ""))
            text = escape(review.get("text", ""))
            stars_str = "★" * rev_rating + "☆" * (5 - rev_rating)
            html_parts.append(
                f'<div style="background:#0a1628;border-radius:8px;padding:10px 14px;margin-bottom:8px;">'
                f'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">'
                f'<span style="font-weight:700;color:#fff;font-size:0.85rem;">{author}</span>'
                f'<span style="font-size:0.75rem;color:#888;">{rel_time}</span>'
                f"</div>"
                f'<div style="color:#f1c40f;font-size:0.9rem;margin-bottom:6px;">{stars_str}</div>'
                f'<p style="margin:0;color:#bbb;font-size:0.82rem;line-height:1.5;">{text}</p>'
                f"</div>"
            )
        html_parts.append("</div>")
        return "".join(html_parts)

    def _card_html(biz: dict) -> str:
        name = escape(biz.get("name", "Unknown Business"))
        address = escape(biz.get("formatted_address") or biz.get("vicinity") or "Address not available")
        phone = escape(
            biz.get("formatted_phone_number")
            or biz.get("international_phone_number")
            or "Phone not available"
        )
        rating = biz.get("rating")
        reviews_count = biz.get("user_ratings_total", 0)
        price_level = biz.get("price_level")
        price_str = PRICE_LEVELS.get(price_level, "") if price_level is not None else ""
        status = biz.get("business_status", "UNKNOWN")
        maps_url = biz.get("url", "#")
        photos_count = len(biz.get("photos", []))
        types = biz.get("types", [])
        opening_hours = biz.get("opening_hours")
        reviews = biz.get("reviews")

        rating_html = (
            f'<span style="margin-left:6px;font-weight:700;color:#f1c40f;">{rating}</span>'
            f'<span style="color:#888;font-size:0.82rem;margin-left:4px;">({reviews_count:,} reviews)</span>'
            if rating
            else '<span style="color:#888;font-size:0.82rem;">No rating yet</span>'
        )

        price_html = (
            f'<span style="background:#1a3a5e;color:#a8d8ea;padding:2px 8px;border-radius:8px;'
            f'font-size:0.8rem;font-weight:700;margin-left:8px;">{escape(price_str)}</span>'
            if price_str
            else ""
        )

        photos_html = (
            f'<span style="color:#888;font-size:0.8rem;">📷 {photos_count} photos</span>'
            if photos_count
            else ""
        )

        return f"""
        <div class="card">
          <div class="card-header">
            <div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:8px;">
              <h2 style="margin:0;font-size:1.2rem;color:#fff;font-weight:800;">{name}</h2>
              {_badge("No Website")}
              {_status_badge(status)}
              {price_html}
            </div>
            <div style="margin-bottom:6px;">{_type_badges(types)}</div>
          </div>
          <div class="card-body">
            <div style="margin-bottom:6px;color:#ccc;font-size:0.88rem;">
              <span style="color:#a8d8ea;">📍</span> {address}
            </div>
            <div style="margin-bottom:8px;color:#ccc;font-size:0.88rem;">
              <span style="color:#a8d8ea;">📞</span> {phone}
            </div>
            <div style="display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:8px;">
              {_stars_html(rating)}
              {rating_html}
              {photos_html}
            </div>
            {_hours_html(opening_hours)}
            {_reviews_html(reviews)}
            <div style="margin-top:16px;">
              <a href="{escape(maps_url)}" target="_blank" rel="noopener" class="maps-btn">
                View on Google Maps
              </a>
            </div>
          </div>
        </div>
        """

    cards_html = "\n".join(_card_html(b) for b in businesses)
    count_without = len(businesses)

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Local Business Website Checker — {escape(query)}</title>
  <style>
    *, *::before, *::after {{ box-sizing: border-box; margin: 0; padding: 0; }}

    body {{
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #0a0f1e;
      color: #e0e0e0;
      min-height: 100vh;
    }}

    .hero {{
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      padding: 60px 20px 50px;
      text-align: center;
      border-bottom: 3px solid #e94560;
      position: relative;
      overflow: hidden;
    }}

    .hero::before {{
      content: "";
      position: absolute;
      top: -60px; left: -60px;
      width: 300px; height: 300px;
      background: radial-gradient(circle, rgba(233,69,96,0.15) 0%, transparent 70%);
      pointer-events: none;
    }}

    .hero-badge {{
      display: inline-block;
      background: #e94560;
      color: #fff;
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 2px;
      text-transform: uppercase;
      padding: 6px 18px;
      border-radius: 20px;
      margin-bottom: 18px;
    }}

    .hero h1 {{
      font-size: clamp(1.8rem, 5vw, 3rem);
      font-weight: 900;
      color: #fff;
      margin-bottom: 10px;
      line-height: 1.2;
    }}

    .hero h1 span {{
      color: #e94560;
    }}

    .hero-sub {{
      font-size: 1rem;
      color: #a8d8ea;
      margin-bottom: 24px;
    }}

    .stats-row {{
      display: flex;
      justify-content: center;
      gap: 24px;
      flex-wrap: wrap;
      margin-top: 20px;
    }}

    .stat-box {{
      background: rgba(255,255,255,0.07);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 12px;
      padding: 14px 28px;
      text-align: center;
      backdrop-filter: blur(4px);
    }}

    .stat-box .num {{
      font-size: 2rem;
      font-weight: 900;
      color: #e94560;
      line-height: 1;
    }}

    .stat-box .lbl {{
      font-size: 0.75rem;
      color: #aaa;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-top: 4px;
    }}

    .container {{
      max-width: 1200px;
      margin: 0 auto;
      padding: 40px 20px 60px;
    }}

    .section-title {{
      font-size: 1.3rem;
      font-weight: 800;
      color: #fff;
      margin-bottom: 24px;
      display: flex;
      align-items: center;
      gap: 10px;
    }}

    .section-title::after {{
      content: "";
      flex: 1;
      height: 1px;
      background: linear-gradient(to right, #e94560, transparent);
    }}

    .grid {{
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 22px;
    }}

    .card {{
      background: linear-gradient(160deg, #16213e 0%, #1a1a2e 100%);
      border: 1px solid #2a3a5e;
      border-radius: 14px;
      overflow: hidden;
      transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
    }}

    .card:hover {{
      transform: translateY(-4px);
      box-shadow: 0 12px 40px rgba(233,69,96,0.18), 0 4px 16px rgba(0,0,0,0.4);
      border-color: #e94560;
    }}

    .card-header {{
      background: linear-gradient(135deg, #0f3460 0%, #16213e 100%);
      padding: 16px 18px 12px;
      border-bottom: 1px solid #2a3a5e;
    }}

    .card-body {{
      padding: 16px 18px 20px;
    }}

    .maps-btn {{
      display: inline-block;
      background: linear-gradient(135deg, #e94560, #c0392b);
      color: #fff;
      text-decoration: none;
      padding: 9px 22px;
      border-radius: 8px;
      font-size: 0.85rem;
      font-weight: 700;
      letter-spacing: 0.5px;
      transition: opacity 0.15s ease, transform 0.15s ease;
    }}

    .maps-btn:hover {{
      opacity: 0.88;
      transform: scale(1.03);
    }}

    .empty-state {{
      text-align: center;
      padding: 60px 20px;
      color: #666;
    }}

    .empty-state h3 {{
      font-size: 1.4rem;
      color: #27ae60;
      margin-bottom: 10px;
    }}

    footer {{
      background: #0a0f1e;
      border-top: 1px solid #1e2d4e;
      padding: 22px 20px;
      text-align: center;
      color: #555;
      font-size: 0.8rem;
    }}

    footer a {{
      color: #a8d8ea;
      text-decoration: none;
    }}

    @media (max-width: 600px) {{
      .grid {{ grid-template-columns: 1fr; }}
      .stats-row {{ gap: 12px; }}
    }}
  </style>
</head>
<body>

<div class="hero">
  <div class="hero-badge">Sales Opportunity Report</div>
  <h1>Local Business <span>Website Checker</span></h1>
  <div class="hero-sub">Search query: <strong>{escape(query)}</strong></div>
  <div class="hero-sub" style="font-size:0.85rem;color:#888;">Generated {escape(timestamp)}</div>
  <div class="stats-row">
    <div class="stat-box">
      <div class="num">{total_checked}</div>
      <div class="lbl">Businesses Checked</div>
    </div>
    <div class="stat-box">
      <div class="num" style="color:#e94560;">{count_without}</div>
      <div class="lbl">No Website Found</div>
    </div>
    <div class="stat-box">
      <div class="num" style="color:#27ae60;">{total_checked - count_without}</div>
      <div class="lbl">Have a Website</div>
    </div>
  </div>
</div>

<div class="container">
  {"" if businesses else '<div class="empty-state"><h3>All businesses have websites!</h3><p>No opportunities found for this search. Try a different city or category.</p></div>'}
  {"" if not businesses else f'<div class="section-title">Businesses Without Websites ({count_without} opportunities)</div><div class="grid">' + cards_html + "</div>"}
</div>

<footer>
  <p>Generated by <strong>Local Business Website Checker</strong> &mdash; {escape(timestamp)}</p>
  <p style="margin-top:6px;">Data sourced from the Google Maps Places API.</p>
</footer>

</body>
</html>"""

    with open(output_path, "w", encoding="utf-8") as fh:
        fh.write(html)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        prog="checker",
        description="Find local businesses that don't have a website using the Google Maps Places API.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python checker.py --city "Austin, TX" --category "plumbers"
  python checker.py --city "Denver, CO" --category "hair salons" --max 30 --json results.json
  python checker.py  # interactive mode
        """,
    )
    parser.add_argument("--api-key", metavar="KEY", help="Google Maps API key")
    parser.add_argument("--city", metavar="CITY", help='City to search (e.g. "Austin, TX")')
    parser.add_argument(
        "--category",
        metavar="CATEGORY",
        default=None,
        help='Business type (e.g. "restaurants", "plumbers"). Defaults to "businesses".',
    )
    parser.add_argument(
        "--max",
        metavar="N",
        type=int,
        default=60,
        help="Maximum number of businesses to check (default: 60)",
    )
    parser.add_argument(
        "--output",
        metavar="FILE",
        default="report.html",
        help="Output HTML report filename (default: report.html)",
    )
    parser.add_argument("--json", metavar="FILE", help="Also save a JSON export to this file")
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    console.print(
        Panel.fit(
            "[bold white]Local Business Website Checker[/bold white]\n"
            "[dim]Find businesses without websites using the Google Maps Places API[/dim]",
            border_style="cyan",
        )
    )

    api_key = get_api_key(args.api_key)

    city = args.city
    if not city:
        city = console.input("[bold cyan]Enter city (e.g. Austin, TX): [/bold cyan]").strip()
        if not city:
            console.print("[red]City is required. Exiting.[/red]")
            sys.exit(1)

    category = args.category
    if not category:
        raw = console.input(
            "[bold cyan]Enter business category (e.g. plumbers, restaurants) [businesses]: [/bold cyan]"
        ).strip()
        category = raw if raw else "businesses"

    query = f"{category} in {city}"
    max_results = args.max

    console.print(f"\n[bold]Search:[/bold] [green]{query}[/green]  |  [bold]Max results:[/bold] {max_results}\n")

    try:
        gmaps = googlemaps.Client(key=api_key)
        # Validate key with a quick geocode call
        gmaps.geocode("test")
    except googlemaps.exceptions.ApiError as exc:
        console.print(f"[red]Invalid API key or API error: {exc}[/red]")
        sys.exit(1)
    except Exception as exc:
        console.print(f"[red]Could not initialize Google Maps client: {exc}[/red]")
        sys.exit(1)

    places = search_places(gmaps, query, max_results)

    if not places:
        console.print(
            Panel(
                f"[yellow]No results found for '[bold]{query}[/bold]'.\n\n"
                "Suggestions:\n"
                "  • Check your spelling\n"
                "  • Try a broader category (e.g. 'businesses' instead of 'vegan restaurants')\n"
                "  • Use a larger city name",
                title="[yellow]No Results[/yellow]",
                border_style="yellow",
            )
        )
        sys.exit(0)

    console.print(f"[green]Found {len(places)} businesses. Fetching details...[/green]\n")

    with_website, without_website = fetch_place_details(gmaps, places)

    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    total = len(with_website) + len(without_website)

    console.print()

    if without_website:
        print_terminal_table(
            without_website,
            title=f"[bold red]Businesses WITHOUT a Website[/bold red] — {len(without_website)} found",
        )
    else:
        console.print(Panel("[green]All businesses have websites! No opportunities found.[/green]", border_style="green"))

    console.print(
        Panel(
            f"[bold white]Summary for:[/bold white] [cyan]{query}[/cyan]\n\n"
            f"  Total businesses checked: [white]{total}[/white]\n"
            f"  [green]Have a website:[/green]    [bold green]{len(with_website)}[/bold green]\n"
            f"  [red]No website:[/red]         [bold red]{len(without_website)}[/bold red]\n\n"
            f"  [dim]HTML report saved to:[/dim] [bold]{args.output}[/bold]",
            title="[bold cyan]Results[/bold cyan]",
            border_style="cyan",
        )
    )

    generate_html_report(
        businesses=without_website,
        query=query,
        timestamp=timestamp,
        output_path=args.output,
        total_checked=total,
    )
    console.print(f"[green]HTML report saved to:[/green] [bold]{args.output}[/bold]")

    if args.json:
        export_data = {
            "query": query,
            "timestamp": timestamp,
            "total_checked": total,
            "with_website_count": len(with_website),
            "without_website_count": len(without_website),
            "businesses_without_website": without_website,
            "businesses_with_website": [
                {"name": b.get("name"), "website": b.get("website"), "url": b.get("url")}
                for b in with_website
            ],
        }
        with open(args.json, "w", encoding="utf-8") as jf:
            json.dump(export_data, jf, indent=2, ensure_ascii=False)
        console.print(f"[green]JSON export saved to:[/green] [bold]{args.json}[/bold]")


if __name__ == "__main__":
    main()

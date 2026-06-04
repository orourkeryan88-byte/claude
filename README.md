# Local Business Website Finder

Two tools to find local businesses without websites — great for web design outreach.

---

## Tools

### `find_no_website.py` — Free, No API Key Required

Uses **OpenStreetMap / Overpass API** (100% free) to find local businesses without websites.

```bash
pip install requests rich
python find_no_website.py --city "Austin, TX" --category plumber
python find_no_website.py --city "Chicago, IL" --category "auto repair" --output report.html
python find_no_website.py --list   # show all categories
```

**Options:**
| Flag | Description |
|------|-------------|
| `--city` / `-c` | City to search (e.g. `"Denver, CO"`) |
| `--category` / `-t` | Business type (see `--list`) |
| `--radius` / `-r` | Search radius in km (default: auto) |
| `--output` / `-o` | Save HTML report |
| `--json` / `-j` | Save JSON export |
| `--show-all` / `-a` | Also show businesses with websites |

**Categories:** plumber, electrician, roofer, painter, hvac, locksmith, carpenter, landscaping, auto repair, hair salon, nail salon, restaurant, cafe, dentist, lawyer, accountant, photographer, tailor, cleaning, pest control

---

### `checker.py` — Google Maps API

Uses the **Google Maps Places API** for richer results (ratings, reviews, hours, photos).

```bash
pip install googlemaps rich
export GOOGLE_MAPS_API_KEY="your-key-here"
python checker.py --city "Austin, TX" --category plumber
python checker.py --city "Denver, CO" --category "hair salons" --max 40 --output report.html
```

Requires a Google Maps API key. Get one at [console.cloud.google.com](https://console.cloud.google.com).

---

## Sample Results

See `no_website_results.json` for verified businesses found without websites across multiple categories and cities.

**Key stats:** ~42% of plumbers, ~43% of HVAC contractors, and ~28% of roofers operate with no dedicated website in 2026.

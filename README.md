# Local Business Website Checker

A Python CLI tool that finds local businesses without websites using the Google Maps Places API — helping you identify sales opportunities in any city and category.

## What It Does

1. Accepts a city and optional business category as input (interactive prompts or CLI args)
2. Searches for businesses using the Google Maps Places API
3. Checks each business for a website
4. Fetches full details (phone, hours, reviews, etc.) for businesses **without** a website
5. Outputs a rich terminal summary table, saves a beautiful HTML report, and optionally exports JSON

## Getting a Google Maps API Key

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select an existing one)
3. Navigate to **APIs & Services > Library**
4. Enable the following APIs:
   - **Places API**
   - **Geocoding API** (used for key validation)
5. Navigate to **APIs & Services > Credentials**
6. Click **Create Credentials > API Key**
7. Copy your API key (optionally restrict it to the APIs above for security)

## Installation

```bash
# Clone the repository
git clone https://github.com/your-org/relier-.git
cd relier-

# Install dependencies
pip install -r requirements.txt
```

## Usage

### Interactive Mode

Run without arguments and answer the prompts:

```bash
python checker.py
```

### CLI Mode

```bash
# Basic usage
python checker.py --city "Austin, TX" --category "plumbers"

# With all options
python checker.py \
  --city "Denver, CO" \
  --category "hair salons" \
  --max 30 \
  --output denver-salons.html \
  --json results.json

# Pass API key inline (not recommended for production)
python checker.py --api-key YOUR_KEY --city "Chicago, IL" --category "restaurants"
```

### Options

| Flag | Description | Default |
|------|-------------|---------|
| `--api-key KEY` | Google Maps API key | (env or prompt) |
| `--city CITY` | City to search, e.g. `"Austin, TX"` | (prompted) |
| `--category CATEGORY` | Business type, e.g. `"plumbers"` | `"businesses"` |
| `--max N` | Maximum businesses to check | `60` |
| `--output FILE` | Output HTML report filename | `report.html` |
| `--json FILE` | Also save a JSON export | (disabled) |

### API Key Priority

The tool resolves the API key in this order:

1. `--api-key` CLI argument
2. `GOOGLE_MAPS_API_KEY` environment variable
3. Interactive prompt at runtime

Setting the environment variable is recommended:

```bash
export GOOGLE_MAPS_API_KEY="your_key_here"
python checker.py --city "Seattle, WA" --category "electricians"
```

## Output

### Terminal

- Live progress spinners while searching and fetching details
- A summary table of businesses without websites (name, phone, rating, review count, status, Google Maps link)
- A final stats panel showing total checked, with/without website counts

### HTML Report (`report.html`)

A self-contained, responsive HTML file with:
- Dark-themed header with search query, timestamp, and opportunity count
- One card per business without a website, including:
  - Name, operational status, price level
  - Address and phone number
  - Star ratings and review count
  - Business hours
  - Business type badges
  - Up to 5 customer reviews
  - "View on Google Maps" button
- Hover effects and responsive grid layout

### JSON Export (`--json`)

A structured JSON file containing:
- Search metadata (query, timestamp, counts)
- Full details for all businesses without a website
- Summary info (name, website, Maps URL) for businesses that have a website

## Examples

```bash
# Find plumbers in Austin without websites
python checker.py --city "Austin, TX" --category "plumbers"

# Find hair salons in Denver, limit 30, export JSON
python checker.py --city "Denver, CO" --category "hair salons" --max 30 --json denver-salons.json

# Broad search for any business type
python checker.py --city "Portland, OR"

# Custom output filename
python checker.py --city "Miami, FL" --category "electricians" --output miami-electricians.html
```

## Requirements

- Python 3.10+
- `googlemaps>=4.10.0`
- `rich>=13.0.0`
- A valid Google Maps API key with Places API and Geocoding API enabled

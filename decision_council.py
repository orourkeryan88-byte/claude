#!/usr/bin/env python3
"""
Decision Council CLI
====================
Routes any proposal through 5 specialist advisors (concurrent) and a Chairman
who issues a final binding ruling.

Usage:
    python decision_council.py "Should I launch a freemium tier?"
    echo "Should we expand to Europe?" | python decision_council.py
    python decision_council.py --model claude-opus-4-8 "Hire 10 engineers now?"

Override model via env var:  DECISION_COUNCIL_MODEL=claude-haiku-4-5-20251001
"""

import asyncio
import json
import os
import re
import sys
import argparse
from typing import Optional

# ── External deps ──────────────────────────────────────────────────────────────
try:
    import anthropic
except ImportError:
    sys.exit("Error: 'anthropic' package not installed.  Run:  pip install anthropic")

try:
    from rich.console import Console
    from rich.panel import Panel
    from rich.text import Text
    from rich.progress import Progress, SpinnerColumn, TextColumn
    RICH = True
except ImportError:
    RICH = False


# ══════════════════════════════════════════════════════════════════════════════
#  COUNCIL MEMBER SYSTEM PROMPTS  (edit these freely to tune personalities)
# ══════════════════════════════════════════════════════════════════════════════

SKEPTIC_PROMPT = """\
You are The Skeptic — a ruthless devil's advocate on a five-member decision council.
Your ONLY job is to stress-test proposals by surfacing every risk, failure mode,
hidden cost, worst-case scenario, dependency, and reason NOT to proceed.
You assume things will go wrong. You are not here to be balanced — you exist to
poke holes. Be brutally specific; vague warnings are worthless. Quantify the
downside wherever possible.

Respond with ONLY valid JSON matching this exact schema (no prose outside JSON):
{
  "recommendation": "DO NOT PROCEED" | "PROCEED WITH CONDITIONS" | "PROCEED",
  "confidence": <integer 0–100>,
  "key_points": ["<specific point>", ...],
  "reasoning": "<one concise paragraph>"
}"""

ADVOCATE_PROMPT = """\
You are The Advocate — a passionate champion of good ideas on a five-member decision council.
Your ONLY job is to surface every positive, opportunity, upside, and best-case scenario.
You assume the idea CAN work and your mission is to articulate WHY it should be pursued,
compellingly and concretely. Vague optimism is worthless — be specific about the value created.

Respond with ONLY valid JSON matching this exact schema (no prose outside JSON):
{
  "recommendation": "DO NOT PROCEED" | "PROCEED WITH CONDITIONS" | "PROCEED",
  "confidence": <integer 0–100>,
  "key_points": ["<specific point>", ...],
  "reasoning": "<one concise paragraph>"
}"""

ANALYST_PROMPT = """\
You are The Analyst — a cold, evidence-driven evaluator on a five-member decision council.
You evaluate STRICTLY on numbers, logic, measurable outcomes, and quantifiable trade-offs.
Flag any claim that lacks evidence or rests on an assumption — label it explicitly.
Where hard data is unavailable, state your assumptions and reason from first principles.
No emotion. No gut feel. No narrative unless it maps to a measurable variable.

Respond with ONLY valid JSON matching this exact schema (no prose outside JSON):
{
  "recommendation": "DO NOT PROCEED" | "PROCEED WITH CONDITIONS" | "PROCEED",
  "confidence": <integer 0–100>,
  "key_points": ["<specific point>", ...],
  "reasoning": "<one concise paragraph>"
}"""

CLOSER_PROMPT = """\
You are The Closer — a commercial and sales-minded evaluator on a five-member decision council.
You evaluate proposals through the lens of revenue potential, market demand, customer appeal,
positioning, and real-world sellability. Ask: who pays for this, why would they pay,
does the market actually want it, and can it be sold at scale? You are results-focused,
not idealistic. If it can't be monetised or doesn't move a needle that matters, say so.

Respond with ONLY valid JSON matching this exact schema (no prose outside JSON):
{
  "recommendation": "DO NOT PROCEED" | "PROCEED WITH CONDITIONS" | "PROCEED",
  "confidence": <integer 0–100>,
  "key_points": ["<specific point>", ...],
  "reasoning": "<one concise paragraph>"
}"""

STRATEGIST_PROMPT = """\
You are The Strategist — a long-term, second-order thinker on a five-member decision council.
You evaluate how a decision plays out 1–5 years from now. You hunt for what doors it opens
or closes, opportunity costs, path dependencies, downstream consequences others miss,
and alignment with long-term goals. Most decisions fail not on day one but in what they
lock you into later — that is your focus. Challenge short-term thinking mercilessly.

Respond with ONLY valid JSON matching this exact schema (no prose outside JSON):
{
  "recommendation": "DO NOT PROCEED" | "PROCEED WITH CONDITIONS" | "PROCEED",
  "confidence": <integer 0–100>,
  "key_points": ["<specific point>", ...],
  "reasoning": "<one concise paragraph>"
}"""

CHAIRMAN_PROMPT = """\
You are The Chairman — the final decision-maker of a five-member decision council.
You receive structured verdicts from five specialist advisors and must synthesise them
into a single binding ruling. Note where members conflict and where they align.
Give extra weight to concrete risks raised by The Skeptic and long-term traps flagged
by The Strategist. The Analyst's quantified points override unsupported claims.

Steps:
1. Compute a weighted aggregate confidence score from the five verdicts.
2. Determine a FINAL decision: PROCEED / PROCEED WITH CONDITIONS / DO NOT PROCEED.
3. List the top conditions that must be met (if any) and the top risks to monitor.

Respond with ONLY valid JSON matching this exact schema (no prose outside JSON):
{
  "final_decision": "PROCEED" | "PROCEED WITH CONDITIONS" | "DO NOT PROCEED",
  "aggregate_confidence": <integer 0–100>,
  "conditions": ["<condition>", ...],
  "key_risks": ["<risk>", ...],
  "alignment_notes": "<one paragraph on where council agreed / disagreed>",
  "rationale": "<one concise paragraph — the binding ruling>"
}"""


# ══════════════════════════════════════════════════════════════════════════════
#  COUNCIL ROSTER  (name, prompt, rich colour — add/remove members here)
# ══════════════════════════════════════════════════════════════════════════════

COUNCIL = [
    {"name": "The Skeptic",    "prompt": SKEPTIC_PROMPT,    "color": "red"},
    {"name": "The Advocate",   "prompt": ADVOCATE_PROMPT,   "color": "green"},
    {"name": "The Analyst",    "prompt": ANALYST_PROMPT,    "color": "cyan"},
    {"name": "The Closer",     "prompt": CLOSER_PROMPT,     "color": "yellow"},
    {"name": "The Strategist", "prompt": STRATEGIST_PROMPT, "color": "magenta"},
]

DEFAULT_MODEL = os.environ.get("DECISION_COUNCIL_MODEL", "claude-opus-4-8")
MAX_TOKENS_MEMBER   = 1024
MAX_TOKENS_CHAIRMAN = 1536
MAX_RETRIES = 3


# ══════════════════════════════════════════════════════════════════════════════
#  API HELPERS
# ══════════════════════════════════════════════════════════════════════════════

def _strip_fences(text: str) -> str:
    """Remove markdown ```json … ``` fences that models sometimes add."""
    text = re.sub(r"^```(?:json)?\s*", "", text.strip())
    text = re.sub(r"\s*```$", "", text)
    return text.strip()


def _error_verdict(member: dict, message: str, raw: str = "") -> dict:
    return {
        "_member": member["name"],
        "_color":  member["color"],
        "_error":  message,
        "recommendation": "UNKNOWN",
        "confidence":     0,
        "key_points":     [],
        "reasoning":      raw or "(no response)",
    }


def _error_ruling(message: str, raw: str = "") -> dict:
    return {
        "_error":              message,
        "final_decision":      "UNKNOWN",
        "aggregate_confidence": 0,
        "conditions":          [],
        "key_risks":           [],
        "alignment_notes":     "",
        "rationale":           raw or "(no response)",
    }


async def _call_api(client: anthropic.AsyncAnthropic, system: str, user: str,
                    model: str, max_tokens: int) -> str:
    """Raw API call with exponential-backoff retry on transient errors."""
    for attempt in range(MAX_RETRIES):
        try:
            resp = await client.messages.create(
                model=model,
                max_tokens=max_tokens,
                system=system,
                messages=[{"role": "user", "content": user}],
            )
            return resp.content[0].text
        except (anthropic.RateLimitError, anthropic.InternalServerError) as exc:
            if attempt == MAX_RETRIES - 1:
                raise
            await asyncio.sleep(2 ** attempt)
    raise RuntimeError("Unreachable")


async def call_member(client: anthropic.AsyncAnthropic, member: dict,
                      proposal: str, model: str) -> dict:
    """Call one council member; returns a verdict dict."""
    user_msg = f"Evaluate this proposal:\n\n{proposal}"
    raw = ""
    for attempt in range(MAX_RETRIES):
        try:
            raw = await _call_api(client, member["prompt"], user_msg,
                                  model, MAX_TOKENS_MEMBER)
            parsed = json.loads(_strip_fences(raw))
            parsed["_member"] = member["name"]
            parsed["_color"]  = member["color"]
            return parsed
        except json.JSONDecodeError as exc:
            if attempt == MAX_RETRIES - 1:
                return _error_verdict(member, f"JSON parse failed: {exc}", raw)
            await asyncio.sleep(2 ** attempt)
        except Exception as exc:
            return _error_verdict(member, str(exc))
    return _error_verdict(member, "Max retries exceeded", raw)


async def call_chairman(client: anthropic.AsyncAnthropic, verdicts: list[dict],
                        proposal: str, model: str) -> dict:
    """Call the Chairman with all council verdicts; returns the ruling dict."""
    verdict_block = ""
    for v in verdicts:
        verdict_block += (
            f"\n--- {v['_member']} ---\n"
            f"Recommendation : {v.get('recommendation', 'N/A')}\n"
            f"Confidence     : {v.get('confidence', 0)}/100\n"
            f"Key Points     : {'; '.join(v.get('key_points', []))}\n"
            f"Reasoning      : {v.get('reasoning', '')}\n"
        )

    user_msg = (
        f"ORIGINAL PROPOSAL:\n{proposal}\n\n"
        f"COUNCIL VERDICTS:\n{verdict_block}\n"
        "Issue your final binding ruling."
    )

    raw = ""
    for attempt in range(MAX_RETRIES):
        try:
            raw = await _call_api(client, CHAIRMAN_PROMPT, user_msg,
                                  model, MAX_TOKENS_CHAIRMAN)
            ruling = json.loads(_strip_fences(raw))
            return ruling
        except json.JSONDecodeError as exc:
            if attempt == MAX_RETRIES - 1:
                return _error_ruling(f"JSON parse failed: {exc}", raw)
            await asyncio.sleep(2 ** attempt)
        except Exception as exc:
            return _error_ruling(str(exc))
    return _error_ruling("Max retries exceeded", raw)


# ══════════════════════════════════════════════════════════════════════════════
#  DISPLAY
# ══════════════════════════════════════════════════════════════════════════════

def _rec_style(rec: str) -> tuple[str, str]:
    """Return (plain label, rich markup) for a recommendation string."""
    rec = rec.upper()
    if "DO NOT" in rec:
        return rec, f"[red bold]{rec}[/red bold]"
    if "CONDITIONS" in rec:
        return rec, f"[yellow bold]{rec}[/yellow bold]"
    return rec, f"[green bold]{rec}[/green bold]"


def display_plain(proposal: str, verdicts: list[dict], ruling: dict) -> None:
    W = 60
    print("\n" + "=" * W)
    print("  DECISION COUNCIL — VERDICT REPORT")
    print("=" * W)
    print(f"\nProposal: {proposal[:200]}{'…' if len(proposal) > 200 else ''}\n")

    for v in verdicts:
        print("─" * W)
        print(f"  {v['_member']}")
        print("─" * W)
        if "_error" in v:
            print(f"  [ERROR] {v['_error']}")
        rec, _ = _rec_style(v.get("recommendation", "UNKNOWN"))
        print(f"  Recommendation : {rec}")
        print(f"  Confidence     : {v.get('confidence', 0)}/100")
        for pt in v.get("key_points", []):
            print(f"    • {pt}")
        if v.get("reasoning"):
            print(f"\n  {v['reasoning']}")
        print()

    print("=" * W)
    print("  CHAIRMAN'S FINAL RULING")
    print("=" * W)
    if "_error" in ruling:
        print(f"  [ERROR] {ruling['_error']}")
    decision, _ = _rec_style(ruling.get("final_decision", "UNKNOWN"))
    print(f"\n  DECISION        : {decision}")
    print(f"  Aggregate Score : {ruling.get('aggregate_confidence', 0)}/100")
    if ruling.get("alignment_notes"):
        print(f"\n  {ruling['alignment_notes']}")
    for c in ruling.get("conditions", []):
        print(f"    ✓  {c}")
    for r in ruling.get("key_risks", []):
        print(f"    ⚠  {r}")
    if ruling.get("rationale"):
        print(f"\n  {ruling['rationale']}")
    print("=" * W + "\n")


def display_rich(proposal: str, verdicts: list[dict], ruling: dict) -> None:
    console = Console()

    console.print()
    console.rule("[bold white]DECISION COUNCIL[/bold white]")
    console.print(
        f"[dim]Proposal: {proposal[:160]}{'…' if len(proposal) > 160 else ''}[/dim]"
    )
    console.print()

    for v in verdicts:
        color = v.get("_color", "white")
        _, rec_markup = _rec_style(v.get("recommendation", "UNKNOWN"))
        conf = v.get("confidence", 0)

        body = Text()
        body.append_text(Text.from_markup(f"Recommendation: {rec_markup}"))
        body.append(f"    Confidence: {conf}/100\n\n")

        points = v.get("key_points", [])
        if points:
            body.append("Key Points\n", style="bold")
            for pt in points:
                body.append(f"  • {pt}\n")

        if v.get("reasoning"):
            body.append("\nReasoning\n", style="bold")
            body.append(v["reasoning"])

        if "_error" in v:
            body.append(f"\n[red]ERROR: {v['_error']}[/red]")

        console.print(
            Panel(body,
                  title=f"[{color} bold]{v['_member']}[/{color} bold]",
                  border_style=color,
                  padding=(1, 2))
        )

    # Chairman panel
    console.print()
    console.rule("[bold white]CHAIRMAN'S FINAL RULING[/bold white]")
    console.print()

    decision = ruling.get("final_decision", "UNKNOWN").upper()
    if decision == "PROCEED":
        decision_markup = f"[green bold]✓  {decision}[/green bold]"
        border = "green"
    elif "CONDITIONS" in decision:
        decision_markup = f"[yellow bold]⚠  {decision}[/yellow bold]"
        border = "yellow"
    else:
        decision_markup = f"[red bold]✗  {decision}[/red bold]"
        border = "red"

    body = Text()
    body.append_text(Text.from_markup(decision_markup))
    body.append(f"\nAggregate Confidence: {ruling.get('aggregate_confidence', 0)}/100\n")

    if ruling.get("alignment_notes"):
        body.append("\nCouncil Alignment\n", style="bold")
        body.append(ruling["alignment_notes"] + "\n")

    conditions = ruling.get("conditions", [])
    if conditions:
        body.append("\nConditions to Meet\n", style="bold")
        for c in conditions:
            body.append(f"  ✓  {c}\n", style="green")

    risks = ruling.get("key_risks", [])
    if risks:
        body.append("\nKey Risks to Monitor\n", style="bold")
        for r in risks:
            body.append(f"  ⚠  {r}\n", style="red")

    if ruling.get("rationale"):
        body.append("\nRationale\n", style="bold")
        body.append(ruling["rationale"])

    if "_error" in ruling:
        body.append(f"\n[red]ERROR: {ruling['_error']}[/red]")

    console.print(
        Panel(body,
              title="[white bold]The Chairman[/white bold]",
              border_style=border,
              padding=(1, 2))
    )
    console.print()


# ══════════════════════════════════════════════════════════════════════════════
#  ORCHESTRATION
# ══════════════════════════════════════════════════════════════════════════════

async def run(proposal: str, model: str) -> None:
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        sys.exit("Error: ANTHROPIC_API_KEY environment variable is not set.")

    client = anthropic.AsyncAnthropic(api_key=api_key)

    if RICH:
        console = Console()
        console.print(
            f"\n[dim]Convening the Decision Council "
            f"([bold]{model}[/bold])…[/dim]"
        )

        # Kick off all 5 members concurrently and show a live spinner
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            transient=True,
            console=console,
        ) as progress:
            task = progress.add_task(
                "Dispatching 5 advisors concurrently…", total=None
            )
            verdicts = list(await asyncio.gather(
                *[call_member(client, m, proposal, model) for m in COUNCIL]
            ))
            progress.update(task, description="All advisors reported. Summoning the Chairman…")
            ruling = await call_chairman(client, verdicts, proposal, model)

        display_rich(proposal, verdicts, ruling)
    else:
        print(f"\nConvening the Decision Council ({model})…")
        print("Dispatching 5 advisors concurrently…")
        verdicts = list(await asyncio.gather(
            *[call_member(client, m, proposal, model) for m in COUNCIL]
        ))
        print("All advisors reported. Summoning the Chairman…\n")
        ruling = await call_chairman(client, verdicts, proposal, model)
        display_plain(proposal, verdicts, ruling)


# ══════════════════════════════════════════════════════════════════════════════
#  CLI ENTRY POINT
# ══════════════════════════════════════════════════════════════════════════════

def main() -> None:
    parser = argparse.ArgumentParser(
        prog="decision_council",
        description="Route any proposal through 5 specialist advisors and a Chairman.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""examples:
  python decision_council.py "Should I quit my job to start a SaaS company?"
  echo "Should we expand to Europe this year?" | python decision_council.py
  python decision_council.py --model claude-haiku-4-5-20251001 "Launch a freemium tier?"

env vars:
  ANTHROPIC_API_KEY          required — your Anthropic key
  DECISION_COUNCIL_MODEL     override model without using --model flag
""",
    )
    parser.add_argument(
        "proposal",
        nargs="?",
        help="The proposal or decision to evaluate (omit to read from stdin)",
    )
    parser.add_argument(
        "--model",
        default=DEFAULT_MODEL,
        help=f"Claude model to use (default: {DEFAULT_MODEL})",
    )
    args = parser.parse_args()

    if args.proposal:
        proposal = args.proposal.strip()
    elif not sys.stdin.isatty():
        proposal = sys.stdin.read().strip()
    else:
        print("Enter your proposal (press Ctrl+D when done):")
        try:
            proposal = sys.stdin.read().strip()
        except KeyboardInterrupt:
            print("\nAborted.")
            sys.exit(0)

    if not proposal:
        parser.error("No proposal provided.")

    asyncio.run(run(proposal, args.model))


if __name__ == "__main__":
    main()

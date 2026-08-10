"""Report generators orchestrating CSV, HTML and PDF output.

Each generator receives a serialized evaluation dictionary and writes a file
into the configured reports directory. All metrics are real execution results.
"""
from __future__ import annotations

import json
from pathlib import Path

from app.config.settings import get_settings


def _write_meta(dir: Path, name: str) -> tuple[Path, dict]:
    meta = {
        "model": name.get("model", ""),
        "dataset": name.get("dataset", ""),
        "attack": name.get("attack", "none"),
        "defense": name.get("defense", "none"),
    }
    return dir, meta


def _base_name(eval_dict: dict) -> str:
    ts = eval_dict.get("timestamp", "run").replace(":", "-").replace(" ", "_")
    return f"{eval_dict.get('model', 'model')}_{eval_dict.get('dataset', 'ds')}_{eval_dict.get('attack', 'none')}_{ts}"


def generate_csv(eval_dict: dict) -> str:
    settings = get_settings()
    name = _base_name(eval_dict)
    path = settings.reports_dir / f"{name}.csv"
    metrics = eval_dict.get("metrics", {})
    rows = [
        ["model", eval_dict.get("model", "")],
        ["dataset", eval_dict.get("dataset", "")],
        ["attack", eval_dict.get("attack", "none")],
        ["defense", eval_dict.get("defense", "none")],
        ["timestamp", eval_dict.get("timestamp", "")],
        [],
        ["metric", "value"],
        *[[k, v] for k, v in metrics.items()],
    ]
    with open(path, "w", encoding="utf-8", newline="") as f:
        import csv

        writer = csv.writer(f)
        writer.writerows(rows)
    return str(path)


def generate_html(eval_dict: dict) -> str:
    settings = get_settings()
    name = _base_name(eval_dict)
    path = settings.reports_dir / f"{name}.html"
    metrics = eval_dict.get("metrics", {})
    rows = "".join(
        f"<tr><td>{k}</td><td>{_fmt(v)}</td></tr>" for k, v in metrics.items()
    )
    html = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>ModelHunter Report</title>
<style>
body {{ font-family: sans-serif; background:#0F172A; color:#E2E8F0; padding:24px; }}
h1,h2,h3 {{ color:#00E5FF; }}
table {{ border-collapse: collapse; width:60%; }}
td,th {{ border:1px solid #334155; padding:8px 12px; text-align:left; }}
th {{ background:#1E293B; }}
.card {{ background:#1E293B; border-radius:8px; padding:16px; margin-bottom:16px; }}
</style></head><body>
<h1>ModelHunter Security Evaluation Report</h1>
<div class="card">
<h3>Run Summary</h3>
<p><b>Model:</b> {eval_dict.get('model','')} &nbsp; <b>Dataset:</b> {eval_dict.get('dataset','')}</p>
<p><b>Attack:</b> {eval_dict.get('attack','none')} &nbsp; <b>Defense:</b> {eval_dict.get('defense','none')}</p>
<p><b>Timestamp:</b> {eval_dict.get('timestamp','')}</p>
</div>
<div class="card"><h3>Metrics</h3>
<table><tr><th>Metric</th><th>Value</th></tr>{rows}</table>
</div>
</body></html>"""
    path.write_text(html, encoding="utf-8")
    return str(path)


def generate_pdf(eval_dict: dict) -> str:
    settings = get_settings()
    name = _base_name(eval_dict)
    path = settings.reports_dir / f"{name}.pdf"
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

    styles = getSampleStyleSheet()
    doc = SimpleDocTemplate(str(path), pagesize=A4)
    story = []
    story.append(Paragraph("ModelHunter Security Evaluation Report", styles["Title"]))
    story.append(Spacer(1, 12))
    story.append(Paragraph(f"<b>Model:</b> {eval_dict.get('model','')}", styles["Normal"]))
    story.append(Paragraph(f"<b>Dataset:</b> {eval_dict.get('dataset','')}", styles["Normal"]))
    story.append(Paragraph(f"<b>Attack:</b> {eval_dict.get('attack','none')}", styles["Normal"]))
    story.append(Paragraph(f"<b>Defense:</b> {eval_dict.get('defense','none')}", styles["Normal"]))
    story.append(Paragraph(f"<b>Timestamp:</b> {eval_dict.get('timestamp','')}", styles["Normal"]))
    story.append(Spacer(1, 16))
    metrics = eval_dict.get("metrics", {})
    data = [[Paragraph("<b>Metric</b>", styles["Normal"]), Paragraph("<b>Value</b>", styles["Normal"])]]
    for k, v in metrics.items():
        data.append([k, _fmt(v)])
    table = Table(data)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1E293B")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#334155")),
                ("FONTSIZE", (0, 0), (-1, -1), 10),
            ]
        )
    )
    story.append(table)
    doc.build(story)
    return str(path)


def _fmt(v) -> str:
    if isinstance(v, float):
        return f"{v:.2f}"
    if isinstance(v, dict):
        return json.dumps(v)
    return str(v)

from io import BytesIO

from reportlab.lib.pagesizes import letter
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas


def create_scan_pdf(scan, farm_name: str | None, image_path, disease: dict | None, weather: dict | None = None) -> bytes:
    output = BytesIO()
    pdf = canvas.Canvas(output, pagesize=letter)
    width, height = letter
    pdf.setTitle("FarmShield AI scan report")
    pdf.setFillColorRGB(0.08, 0.25, 0.17)
    pdf.setFont("Helvetica-Bold", 22)
    pdf.drawString(48, height - 55, "FarmShield AI")
    pdf.setFillColorRGB(0.25, 0.35, 0.30)
    pdf.setFont("Helvetica", 11)
    pdf.drawString(48, height - 75, "Crop health scan report")
    y = height - 115
    rows = [
        ("Farm", farm_name or "Not associated"),
        ("Crop", scan.crop),
        ("Scan date (UTC)", scan.created_at.isoformat()),
        ("Result", scan.predicted_class or "No classification available"),
        ("Status", scan.status),
        ("Confidence", f"{scan.confidence:.1%}" if scan.confidence is not None else "Not available"),
        ("Model", scan.model_name),
    ]
    for label, value in rows:
        pdf.setFont("Helvetica-Bold", 10)
        pdf.drawString(48, y, label)
        pdf.setFont("Helvetica", 10)
        pdf.drawString(160, y, value[:95])
        y -= 20
    if weather:
        pdf.setFont("Helvetica-Bold", 11)
        pdf.drawString(48, y, "Recent farm weather context")
        y -= 17
        pdf.setFont("Helvetica", 9)
        context = (
            f"{weather['condition']}, {weather['temperature_c']} C, humidity {weather['humidity_pct']}%, "
            f"rainfall {weather['rainfall_mm'] if weather['rainfall_mm'] is not None else 'not reported'} mm"
        )
        for line in _wrap(context, 100):
            pdf.drawString(48, y, line)
            y -= 13
        pdf.drawString(48, y, f"Source: {weather['source']} · observed {weather['observed_at'][:19]}")
        y -= 20
    if image_path and image_path.is_file():
        try:
            pdf.drawImage(ImageReader(str(image_path)), 48, y - 210, width=240, height=190, preserveAspectRatio=True, anchor="c")
            y -= 225
        except (OSError, ValueError):
            pass
    if disease:
        for title, content in (("Symptoms", disease["symptoms"]), ("Prevention", disease["prevention"]), ("Next steps", disease["next_steps"])):
            pdf.setFont("Helvetica-Bold", 11)
            pdf.drawString(48, y, title)
            y -= 15
            pdf.setFont("Helvetica", 9)
            for line in _wrap(content, 100):
                pdf.drawString(48, y, line)
                y -= 13
            y -= 8
            if y < 95:
                pdf.showPage()
                y = height - 55
    pdf.setFont("Helvetica-Oblique", 8)
    pdf.drawString(48, 44, "Educational decision support only. This report is not a confirmed diagnosis or pesticide recommendation.")
    pdf.save()
    return output.getvalue()


def _wrap(text: str, width: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if len(candidate) > width and current:
            lines.append(current)
            current = word
        else:
            current = candidate
    if current:
        lines.append(current)
    return lines

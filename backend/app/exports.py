from io import BytesIO, StringIO
import csv
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from .models import Event, Report, Reservation, User
from .services import ACTIVE_RESERVATIONS, api_role

def report_data(db: Session, user):
    events = list(db.scalars(select(Event)))
    if api_role(user.role) == "organizer":
        events = [event for event in events if event.organizer_id == user.id]
    if api_role(user.role) not in {"admin", "organizer"}:
        raise HTTPException(403, "No tienes permisos para generar reportes")
    event_ids = {event.id for event in events}
    reservations = [r for r in db.scalars(select(Reservation)) if r.event_id in event_ids]
    rows = [{"evento": event.title, "categoria": event.category.name, "fecha": event.date.isoformat(),
             "capacidad": event.capacity, "reservas_activas": sum(1 for r in event.reservations if r.state in ACTIVE_RESERVATIONS),
             "reservas_totales": sum(1 for r in reservations if r.event_id == event.id),
             "asistencias": sum(1 for r in reservations if r.event_id == event.id and r.attendance)} for event in events]
    return {"activeEvents": len(events), "reservations": len(reservations), "confirmedReservations": sum(1 for r in reservations if r.state == "confirmada"), "rows": rows}

def export_report(db: Session, user, output_format: str):
    output_format = output_format.upper()
    if output_format not in {"CSV", "EXCEL", "PDF"}: raise HTTPException(400, "Formato no válido")
    data = report_data(db, user)
    report = Report(kind="summary", data=data, format=output_format, generator_id=user.id)
    db.add(report); db.commit()
    headers = ["evento", "categoria", "fecha", "capacidad", "reservas_activas", "reservas_totales", "asistencias"]
    if output_format == "CSV":
        stream = StringIO(); writer = csv.DictWriter(stream, fieldnames=headers); writer.writeheader(); writer.writerows(data["rows"])
        return stream.getvalue().encode(), "text/csv", "reporte-siger.csv"
    if output_format == "EXCEL":
        from openpyxl import Workbook
        workbook = Workbook(); sheet = workbook.active; sheet.title = "Reporte"
        sheet.append(headers)
        for row in data["rows"]: sheet.append([row[key] for key in headers])
        stream = BytesIO(); workbook.save(stream)
        return stream.getvalue(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "reporte-siger.xlsx"
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import letter
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph
    from reportlab.lib.styles import getSampleStyleSheet
    stream = BytesIO(); doc = SimpleDocTemplate(stream, pagesize=letter); rows = [headers] + [[str(row[key]) for key in headers] for row in data["rows"]]
    table = Table(rows, repeatRows=1); table.setStyle(TableStyle([("BACKGROUND", (0,0), (-1,0), colors.HexColor("#6e1932")), ("TEXTCOLOR", (0,0), (-1,0), colors.white), ("GRID", (0,0), (-1,-1), 0.25, colors.grey), ("FONTSIZE", (0,0), (-1,-1), 7)]))
    doc.build([Paragraph("SIGER · Reporte de eventos", getSampleStyleSheet()["Title"]), table])
    return stream.getvalue(), "application/pdf", "reporte-siger.pdf"

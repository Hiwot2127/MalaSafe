"""
PDF Export Service
Generates PDF reports for predictions and analytics
"""
from datetime import datetime
from typing import Dict, Any, List
from io import BytesIO
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT


class PDFExportService:
    """Service for generating PDF reports"""
    
    @staticmethod
    def generate_district_prediction_report(
        district_data: Dict[str, Any],
        predictions: List[Dict[str, Any]]
    ) -> BytesIO:
        """Generate PDF report for district predictions"""
        
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=0.5*inch, bottomMargin=0.5*inch)
        
        # Container for the 'Flowable' objects
        elements = []
        
        # Define styles
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#1e40af'),
            spaceAfter=30,
            alignment=TA_CENTER
        )
        heading_style = ParagraphStyle(
            'CustomHeading',
            parent=styles['Heading2'],
            fontSize=16,
            textColor=colors.HexColor('#1e40af'),
            spaceAfter=12,
            spaceBefore=12
        )
        
        # Title
        title = Paragraph("MalaSafe - District Prediction Report", title_style)
        elements.append(title)
        elements.append(Spacer(1, 0.2*inch))
        
        # District Information
        district_info = [
            ["District Information", ""],
            ["District Name:", district_data.get("name", "N/A")],
            ["District Code:", district_data.get("code", "N/A")],
            ["Region:", district_data.get("region", "N/A")],
            ["Report Generated:", datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")],
        ]
        
        district_table = Table(district_info, colWidths=[2.5*inch, 4*inch])
        district_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 14),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('FONTNAME', (0, 1), (0, -1), 'Helvetica-Bold'),
        ]))
        elements.append(district_table)
        elements.append(Spacer(1, 0.3*inch))
        
        # Predictions Section
        if predictions:
            heading = Paragraph("Malaria Risk Predictions", heading_style)
            elements.append(heading)
            
            # Predictions table
            pred_data = [["Month", "Risk Level", "Predicted Cases", "Confidence", "Status"]]
            
            for pred in predictions[:12]:  # Show last 12 months
                risk_level = pred.get("risk_level", "N/A").upper()
                risk_color = {
                    "LOW": colors.green,
                    "MODERATE": colors.yellow,
                    "HIGH": colors.orange,
                    "VERY_HIGH": colors.red
                }.get(risk_level, colors.grey)
                
                pred_data.append([
                    pred.get("prediction_date", "N/A"),
                    risk_level,
                    f"{pred.get('prediction_score', 0):.0f}",
                    f"{pred.get('confidence_score', 0):.2f}",
                    "✓" if pred.get("is_warm", False) else "Cold Start"
                ])
            
            pred_table = Table(pred_data, colWidths=[1.5*inch, 1.5*inch, 1.5*inch, 1*inch, 1*inch])
            pred_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 12),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.white),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ]))
            elements.append(pred_table)
            elements.append(Spacer(1, 0.3*inch))
            
            # Latest Prediction Details
            if predictions:
                latest = predictions[0]
                heading = Paragraph("Latest Prediction Details", heading_style)
                elements.append(heading)
                
                explanation = latest.get("prediction_reason", "No explanation available")
                explanation_para = Paragraph(f"<b>Explanation:</b> {explanation}", styles['Normal'])
                elements.append(explanation_para)
                elements.append(Spacer(1, 0.2*inch))
                
                # Top Contributing Factors (if available)
                if latest.get("explanation") and latest["explanation"].get("top_factors"):
                    factors_heading = Paragraph("Top Contributing Factors", heading_style)
                    elements.append(factors_heading)
                    
                    factors_data = [["Factor", "Value", "Impact", "Direction"]]
                    for factor in latest["explanation"]["top_factors"][:5]:
                        factors_data.append([
                            factor.get("display_name", "N/A"),
                            f"{factor.get('value', 0):.1f}",
                            f"{factor.get('impact_percentage', 0):.1f}%",
                            factor.get("direction", "N/A").upper()
                        ])
                    
                    factors_table = Table(factors_data, colWidths=[2.5*inch, 1.5*inch, 1.5*inch, 1*inch])
                    factors_table.setStyle(TableStyle([
                        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
                        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                        ('FONTSIZE', (0, 0), (-1, 0), 11),
                        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
                        ('GRID', (0, 0), (-1, -1), 1, colors.black),
                    ]))
                    elements.append(factors_table)
        else:
            no_data = Paragraph("No predictions available for this district.", styles['Normal'])
            elements.append(no_data)
        
        # Footer
        elements.append(Spacer(1, 0.5*inch))
        footer_style = ParagraphStyle(
            'Footer',
            parent=styles['Normal'],
            fontSize=9,
            textColor=colors.grey,
            alignment=TA_CENTER
        )
        footer = Paragraph(
            "MalaSafe - AI-Powered Malaria Surveillance System | Ethiopian Ministry of Health",
            footer_style
        )
        elements.append(footer)
        
        # Build PDF
        doc.build(elements)
        buffer.seek(0)
        return buffer
    
    @staticmethod
    def generate_analytics_summary(
        summary_data: Dict[str, Any],
        trends_data: List[Dict[str, Any]],
        regional_data: List[Dict[str, Any]]
    ) -> BytesIO:
        """Generate PDF summary of analytics data"""
        
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=0.5*inch, bottomMargin=0.5*inch)
        
        elements = []
        styles = getSampleStyleSheet()
        
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#1e40af'),
            spaceAfter=30,
            alignment=TA_CENTER
        )
        heading_style = ParagraphStyle(
            'CustomHeading',
            parent=styles['Heading2'],
            fontSize=16,
            textColor=colors.HexColor('#1e40af'),
            spaceAfter=12,
            spaceBefore=12
        )
        
        # Title
        title = Paragraph("MalaSafe - Analytics Summary Report", title_style)
        elements.append(title)
        elements.append(Spacer(1, 0.2*inch))
        
        # Summary Statistics
        heading = Paragraph("Summary Statistics", heading_style)
        elements.append(heading)
        
        summary_table_data = [
            ["Metric", "Value"],
            ["Total Positive Cases", f"{summary_data.get('total_positive', 0):,}"],
            ["Active Alerts", f"{summary_data.get('active_alerts', 0)}"],
            ["High Risk Districts", f"{summary_data.get('high_risk_districts', 0)}"],
            ["Districts Monitored", f"{summary_data.get('total_districts', 0)}"],
            ["Report Period", summary_data.get('period', 'Last 30 days')],
            ["Generated", datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")],
        ]
        
        summary_table = Table(summary_table_data, colWidths=[3*inch, 3.5*inch])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 14),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('FONTNAME', (0, 1), (0, -1), 'Helvetica-Bold'),
        ]))
        elements.append(summary_table)
        elements.append(Spacer(1, 0.3*inch))
        
        # Regional Breakdown
        if regional_data:
            heading = Paragraph("Regional Breakdown", heading_style)
            elements.append(heading)
            
            regional_table_data = [["Region", "Total Cases", "Districts", "Avg Cases/District"]]
            for region in regional_data[:10]:  # Top 10 regions
                regional_table_data.append([
                    region.get("region", "N/A"),
                    f"{region.get('total_cases', 0):,}",
                    f"{region.get('district_count', 0)}",
                    f"{region.get('avg_cases', 0):.1f}"
                ])
            
            regional_table = Table(regional_table_data, colWidths=[2*inch, 1.5*inch, 1.5*inch, 1.5*inch])
            regional_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 12),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.white),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ]))
            elements.append(regional_table)
            elements.append(Spacer(1, 0.3*inch))
        
        # Trends
        if trends_data:
            heading = Paragraph("Recent Trends", heading_style)
            elements.append(heading)
            
            trends_table_data = [["Period", "Total Cases", "Change"]]
            for trend in trends_data[:12]:  # Last 12 periods
                change = trend.get("change_percentage", 0)
                change_str = f"+{change:.1f}%" if change > 0 else f"{change:.1f}%"
                trends_table_data.append([
                    trend.get("period", "N/A"),
                    f"{trend.get('total_cases', 0):,}",
                    change_str
                ])
            
            trends_table = Table(trends_table_data, colWidths=[2*inch, 2*inch, 2*inch])
            trends_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 12),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.white),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ]))
            elements.append(trends_table)
        
        # Footer
        elements.append(Spacer(1, 0.5*inch))
        footer_style = ParagraphStyle(
            'Footer',
            parent=styles['Normal'],
            fontSize=9,
            textColor=colors.grey,
            alignment=TA_CENTER
        )
        footer = Paragraph(
            "MalaSafe - AI-Powered Malaria Surveillance System | Ethiopian Ministry of Health",
            footer_style
        )
        elements.append(footer)
        
        # Build PDF
        doc.build(elements)
        buffer.seek(0)
        return buffer

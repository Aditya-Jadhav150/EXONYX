import os
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PDF_PATH = r"d:\EXONYX\EXONYX_Scientific_Validation_Report.pdf"
MD_PATH = r"C:\Users\Aditya Jadhav\.gemini\antigravity\brain\9716afda-a559-4f4e-8d1a-078dbb58bad6\validation_audit.md"

def generate_pdf():
    doc = SimpleDocTemplate(PDF_PATH, pagesize=letter)
    styles = getSampleStyleSheet()
    story = []

    with open(MD_PATH, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    for line in lines:
        text = line.strip()
        if not text:
            continue
        if text.startswith('# '):
            story.append(Paragraph(text[2:], styles['Title']))
        elif text.startswith('## '):
            story.append(Paragraph(text[3:], styles['Heading2']))
        elif text.startswith('---'):
            story.append(Spacer(1, 12))
        else:
            # Very basic markdown stripping
            text = text.replace('**', '').replace('*', '')
            story.append(Paragraph(text, styles['Normal']))
        story.append(Spacer(1, 6))

    doc.build(story)
    print(f"Generated PDF successfully at: {PDF_PATH}")

if __name__ == "__main__":
    generate_pdf()

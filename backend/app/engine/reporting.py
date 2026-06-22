import io
import datetime
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle, PageBreak
from reportlab.platypus.flowables import HRFlowable

def set_dark_theme():
    plt.style.use('dark_background')
    matplotlib.rcParams.update({
        'axes.facecolor': '#0f172a',
        'figure.facecolor': '#0f172a',
        'axes.edgecolor': '#334155',
        'grid.color': '#1e293b',
        'text.color': '#f8fafc',
        'axes.labelcolor': '#f8fafc',
        'xtick.color': '#94a3b8',
        'ytick.color': '#94a3b8'
    })

def plot_verdict_bars(tls_conf, cnn_conf, sig_qual, consistency, fp_rejection):
    set_dark_theme()
    fig, ax = plt.subplots(figsize=(6, 3), dpi=300)
    categories = ['TLS Detection', 'AstroNet Validation', 'Signal Quality', 'Transit Consistency', 'FP Rejection']
    scores = [
        min(100, max(0, tls_conf)) if tls_conf else 0,
        min(100, max(0, cnn_conf)) if cnn_conf else 0,
        min(100, max(0, sig_qual)) if sig_qual else 0,
        min(100, max(0, consistency)) if consistency else 0,
        min(100, max(0, fp_rejection)) if fp_rejection is not None else 0
    ]
    colors_list = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444']
    y_pos = np.arange(len(categories))[::-1]
    ax.barh(y_pos, [100]*5, color='#1e293b', height=0.5)
    ax.barh(y_pos, scores, color=colors_list, height=0.5)
    ax.set_yticks(y_pos)
    ax.set_yticklabels(categories, color='#f8fafc', fontweight='bold')
    ax.set_xlim(0, 100)
    ax.set_xticks([0, 25, 50, 75, 100])
    ax.set_xticklabels(['0%', '25%', '50%', '75%', '100%'])
    for spine in ax.spines.values(): spine.set_visible(False)
    for i, v in zip(y_pos, scores):
        ax.text(v + 2, i, f"{v:.1f}%", color='#f8fafc', va='center', fontweight='bold')
    plt.tight_layout()
    buf = io.BytesIO()
    plt.savefig(buf, format='png')
    buf.seek(0)
    plt.close('all')
    return buf

def plot_system_visualizer(a_au, teff, r_star, r_planet_earth):
    set_dark_theme()
    fig, ax = plt.subplots(figsize=(6, 4), dpi=300)
    
    if r_star and teff:
        l_star = (r_star**2) * ((teff/5778)**4)
        hz_inner = np.sqrt(l_star / 1.1)
        hz_outer = np.sqrt(l_star / 0.53)
    else:
        hz_inner, hz_outer = 0.95, 1.37
        
    a_au = a_au if a_au else 1.0
    r_planet_earth = r_planet_earth if r_planet_earth else 1.0
    
    max_dist = max(a_au * 1.5, hz_outer * 1.2)
    
    star = plt.Circle((0, 0), max_dist*0.05, color='#fbbf24', zorder=10)
    ax.add_artist(star)
    
    hz = plt.Circle((0, 0), hz_outer, color='#10b981', alpha=0.15, zorder=1)
    ax.add_artist(hz)
    hz_inner_mask = plt.Circle((0, 0), hz_inner, color='#0f172a', zorder=2)
    ax.add_artist(hz_inner_mask)
    
    orbit = plt.Circle((0, 0), a_au, color='#3b82f6', fill=False, linestyle='--', linewidth=1.5, alpha=0.7, zorder=3)
    ax.add_artist(orbit)
    
    planet_size = max_dist * 0.02 * (r_planet_earth**0.5)
    planet = plt.Circle((a_au, 0), planet_size, color='#ef4444', zorder=11)
    ax.add_artist(planet)
    
    ax.text(0, max_dist*0.08, "Host Star", color='#fbbf24', ha='center', fontsize=8)
    ax.text(a_au, planet_size*1.5, "Candidate", color='#ef4444', ha='center', fontsize=8)
    
    ax.plot([0, max_dist], [0, 0], color='#cbd5e1', linewidth=0.5, alpha=0.3, zorder=0)
    ax.text(hz_inner + (hz_outer-hz_inner)/2, -max_dist*0.05, "Habitable Zone", color='#10b981', ha='center', fontsize=8)
    
    ax.set_xlim(-max_dist, max_dist)
    ax.set_ylim(-max_dist, max_dist)
    ax.set_aspect('equal')
    ax.axis('off')
    
    plt.tight_layout()
    buf = io.BytesIO()
    plt.savefig(buf, format='png')
    buf.seek(0)
    plt.close('all')
    return buf

def plot_light_curve(time, flux, title, color='#94a3b8', is_scatter=True):
    set_dark_theme()
    fig, ax = plt.subplots(figsize=(7, 3), dpi=300)
    if is_scatter:
        ax.scatter(time, flux, s=2, color=color, alpha=0.5)
    else:
        ax.plot(time, flux, color=color, linewidth=1)
    ax.set_title(title, color='#f8fafc', pad=10)
    ax.set_xlabel("Time (days)")
    ax.set_ylabel("Normalized Flux")
    ax.grid(True, alpha=0.2)
    plt.tight_layout()
    buf = io.BytesIO()
    plt.savefig(buf, format='png')
    buf.seek(0)
    plt.close('all')
    return buf

def plot_tls_spectrum(periods, power, best_period):
    set_dark_theme()
    fig, ax = plt.subplots(figsize=(7, 4), dpi=300)
    ax.plot(periods, power, color='#3b82f6', linewidth=1)
    if best_period:
        ax.axvline(best_period, color='#ef4444', linestyle='--', alpha=0.7)
        ax.text(best_period, max(power)*0.95, f"  Best: {best_period:.4f}d", color='#ef4444')
    ax.set_title("TLS Power Spectrum", color='#f8fafc', pad=10)
    ax.set_xlabel("Period (days)")
    ax.set_ylabel("Signal Detection Efficiency (SDE)")
    ax.grid(True, alpha=0.2)
    plt.tight_layout()
    buf = io.BytesIO()
    plt.savefig(buf, format='png')
    buf.seek(0)
    plt.close('all')
    return buf

def plot_batman_fit(phase, flux, model_flux, residuals):
    set_dark_theme()
    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(7, 5), dpi=300, gridspec_kw={'height_ratios': [3, 1]})
    
    ax1.scatter(phase, flux, s=5, color='#94a3b8', alpha=0.5, label='Data')
    
    sort_idx = np.argsort(phase)
    phase_sorted = np.array(phase)[sort_idx]
    model_sorted = np.array(model_flux)[sort_idx]
    ax1.plot(phase_sorted, model_sorted, color='#ef4444', linewidth=2, label='Batman Model')
    
    ax1.set_title("Batman Transit Fit", color='#f8fafc', pad=10)
    ax1.set_ylabel("Normalized Flux")
    ax1.set_xlim(-0.1, 0.1)
    ax1.legend(loc='lower right')
    ax1.grid(True, alpha=0.2)
    
    ax2.scatter(phase, residuals, s=5, color='#3b82f6', alpha=0.5)
    ax2.axhline(0, color='#f8fafc', linestyle='--', alpha=0.3)
    ax2.set_xlabel("Phase")
    ax2.set_ylabel("Residuals")
    ax2.set_xlim(-0.1, 0.1)
    ax2.grid(True, alpha=0.2)
    
    plt.tight_layout()
    buf = io.BytesIO()
    plt.savefig(buf, format='png')
    buf.seek(0)
    plt.close('all')
    return buf

def generate_scientific_report(target_name: str, mission: str, analysis_data: dict) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter,
                            rightMargin=40, leftMargin=40,
                            topMargin=40, bottomMargin=60)
                            
    styles = getSampleStyleSheet()
    
    # Custom styles
    styles.add(ParagraphStyle(name='CoverTitle', parent=styles['Title'], fontName='Helvetica-Bold', fontSize=36, spaceAfter=20, textColor=colors.HexColor("#0f172a"), alignment=1))
    styles.add(ParagraphStyle(name='MissionBadge', parent=styles['Title'], fontName='Helvetica-Bold', fontSize=14, spaceAfter=20, textColor=colors.HexColor("#3b82f6"), alignment=1))
    styles.add(ParagraphStyle(name='SectionHeader', parent=styles['Heading1'], fontName='Helvetica-Bold', fontSize=18, spaceBefore=20, spaceAfter=15, textColor=colors.HexColor("#0f172a"), borderPadding=4))
    styles.add(ParagraphStyle(name='SubSection', parent=styles['Heading2'], fontName='Helvetica-Bold', fontSize=14, spaceBefore=10, spaceAfter=5, textColor=colors.HexColor("#1e293b")))
    styles.add(ParagraphStyle(name='CustomBodyText', parent=styles['Normal'], fontName='Helvetica', fontSize=10, spaceAfter=8, leading=14))
    styles.add(ParagraphStyle(name='VerdictText', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=22, alignment=1))
    styles.add(ParagraphStyle(name='SummaryText', parent=styles['Normal'], fontName='Helvetica', fontSize=11, leading=15, spaceBefore=10, spaceAfter=10, textColor=colors.HexColor("#334155")))

    elements = []
    
    pli_data = analysis_data.get('pli', {})
    pli_score = pli_data.get('score', 0)
    
    def fmt(val, dec=4):
        try: return f"{float(val):.{dec}f}"
        except (ValueError, TypeError): return str(val)

    verdict = "Rejected"
    verdict_color = colors.red
    if pli_score >= 85:
        verdict = "High-Priority Candidate"
        verdict_color = colors.HexColor("#10b981") # Emerald
    elif pli_score >= 70:
        verdict = "Strong Candidate"
        verdict_color = colors.HexColor("#3b82f6") # Blue
    elif pli_score >= 50:
        verdict = "Possible Candidate"
        verdict_color = colors.HexColor("#f59e0b") # Amber
    elif pli_score >= 30:
        verdict = "Review Required"
        verdict_color = colors.HexColor("#ef4444") # Red
        
    # PAGE 1: EXECUTIVE COVER
    elements.append(Spacer(1, 1.0*inch))
    elements.append(Paragraph("EXONYX", styles['CoverTitle']))
    elements.append(Paragraph("SCIENTIFIC DISCOVERY DOSSIER", styles['MissionBadge']))
    elements.append(Spacer(1, 0.5*inch))
    
    elements.append(HRFlowable(width="100%", thickness=3, color=colors.HexColor("#0f172a"), spaceBefore=10, spaceAfter=20))
    
    cover_data = [
        ["Target Identifier:", target_name],
        ["Mission Data Source:", mission],
        ["Analysis Timestamp:", analysis_data.get('analysis_date', datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"))],
        ["Planet Likelihood Index (PLI):", f"{pli_score:.1f} / 100"]
    ]
    t_cover = Table(cover_data, colWidths=[200, 250])
    t_cover.setStyle(TableStyle([
        ('FONTNAME', (0,0), (-1,-1), 'Helvetica'),
        ('FONTNAME', (0,0), (0,-1), 'Helvetica-Bold'),
        ('ALIGN', (0,0), (0,-1), 'RIGHT'),
        ('ALIGN', (1,0), (1,-1), 'LEFT'),
        ('TEXTCOLOR', (1,3), (1,3), verdict_color),
        ('FONTSIZE', (1,3), (1,3), 16),
        ('FONTNAME', (1,3), (1,3), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 10),
    ]))
    elements.append(t_cover)
    elements.append(Spacer(1, 0.5*inch))
    elements.append(Paragraph(f'<font color="{verdict_color.hexval()}">CLASSIFICATION: {verdict.upper()}</font>', styles['VerdictText']))
    elements.append(Spacer(1, 0.5*inch))
    elements.append(HRFlowable(width="100%", thickness=3, color=colors.HexColor("#0f172a"), spaceBefore=20, spaceAfter=20))
    
    elements.append(Paragraph("Verdict Transparency Breakdown", styles['SectionHeader']))
    elements.append(Paragraph("The Planet Likelihood Index (PLI) is determined by the following weighted pipeline contributions:", styles['SummaryText']))
    
    val_sum = analysis_data.get('validation_summary', {})
    fp_res = analysis_data.get('false_positive', {})
    meta = analysis_data.get('metadata', {})
    
    # Real pipeline values
    tls_conf = val_sum.get('power_spectrum', {}).get('sde', 5.0) * 10 if val_sum.get('power_spectrum') else 50
    if 'tls_confidence' in analysis_data.get('validation_summary', {}):
        tls_conf = val_sum['tls_confidence']
        
    cnn_conf = val_sum.get('cnn_confidence', 50)
    sig_qual = meta.get('signal_quality', 50)
    consistency = meta.get('consistency', 80) # Placeholder if absent
    fp_risk = fp_res.get('risk', 50)
    fp_rejection = max(0, 100 - fp_risk)
        
    bar_img = plot_verdict_bars(tls_conf, cnn_conf, sig_qual, consistency, fp_rejection)
    elements.append(Image(bar_img, width=6*inch, height=3*inch))
    elements.append(PageBreak())
    
    # PAGE 2: SYSTEM PROFILE & PLANETARY VISUALIZER
    elements.append(Paragraph("System Profile", styles['SectionHeader']))
    
    # Host Star Data
    elements.append(Paragraph("Host Star Information", styles['SubSection']))
    
    # Filter N/A
    def robust_get(d, k, precision=2):
        val = d.get(k)
        if val is None or val == 'N/A' or str(val) == 'nan':
            return "Unknown"
        return fmt(val, precision)
        
    star_data_raw = [
        ["Parameter", "Value", "Parameter", "Value"],
        ["Radius (R_Sun)", robust_get(meta, 'radius', 2), "Right Ascension", robust_get(meta, 'ra', 4)],
        ["Mass (M_Sun)", robust_get(meta, 'mass', 2), "Declination", robust_get(meta, 'dec', 4)],
        ["Eff. Temp (K)", robust_get(meta, 'teff', 0), "Obs. Span (d)", robust_get(meta, 'obs_span', 1)],
    ]
    t_star = Table(star_data_raw, colWidths=[120, 100, 120, 100])
    t_star.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#1e293b")),
        ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('GRID', (0,0), (-1,-1), 1, colors.HexColor("#cbd5e1")),
        ('BACKGROUND', (0,1), (0,-1), colors.HexColor("#f8fafc")),
        ('BACKGROUND', (2,1), (2,-1), colors.HexColor("#f8fafc")),
        ('FONTNAME', (0,1), (0,-1), 'Helvetica-Bold'),
        ('FONTNAME', (2,1), (2,-1), 'Helvetica-Bold'),
        ('PADDING', (0,0), (-1,-1), 6),
    ]))
    elements.append(t_star)
    elements.append(Spacer(1, 0.2*inch))
    
    # Planet Data
    char_res = analysis_data.get('characterization', {})
    hab_res = analysis_data.get('habitability', {})
    
    elements.append(Paragraph("Candidate Profile", styles['SubSection']))
    
    planet_data_raw = [
        ["Parameter", "Value"],
        ["Orbital Period (Days)", f"{robust_get(char_res, 'period_days', 5)} ± {robust_get(char_res, 'period_err', 5)}"],
        ["Planet Radius (R_Earth)", f"{robust_get(char_res, 'planet_radius_earth', 2)} ± {robust_get(char_res, 'planet_radius_err', 2)}"],
        ["Semi-Major Axis (AU)", f"{robust_get(char_res, 'semi_major_axis_au', 4)} ± {robust_get(char_res, 'semi_major_axis_err', 4)}"],
        ["Transit Duration (Hours)", robust_get(char_res, 'transit_duration_hours', 2)],
        ["Equilibrium Temp (K)", f"{robust_get(hab_res, 'equilibrium_temperature_k', 1)} ± {robust_get(hab_res, 'equilibrium_temperature_err', 1)}"],
        ["Earth Similarity Index", robust_get(hab_res, 'esi', 2)],
    ]
    
    # Filter out completely unknown rows
    filtered_planet_data = [planet_data_raw[0]]
    for row in planet_data_raw[1:]:
        if not ("Unknown ± Unknown" in row[1] or row[1] == "Unknown"):
            filtered_planet_data.append(row)
            
    if len(filtered_planet_data) > 1:
        t_planet = Table(filtered_planet_data, colWidths=[200, 240])
        t_planet.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#1e293b")),
            ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('GRID', (0,0), (-1,-1), 1, colors.HexColor("#cbd5e1")),
            ('BACKGROUND', (0,1), (0,-1), colors.HexColor("#f8fafc")),
            ('FONTNAME', (0,1), (0,-1), 'Helvetica-Bold'),
            ('PADDING', (0,0), (-1,-1), 6),
        ]))
        elements.append(t_planet)
    else:
        elements.append(Paragraph("<i>Candidate metrics are unavailable.</i>", styles['CustomBodyText']))
        
    elements.append(Spacer(1, 0.3*inch))
    
    # Vis
    elements.append(Paragraph("Planetary System Visualizer", styles['SubSection']))
    
    teff_val = meta.get('teff')
    teff_val = float(teff_val) if teff_val and teff_val != 'N/A' else None
    rad_val = meta.get('radius')
    rad_val = float(rad_val) if rad_val and rad_val != 'N/A' else None
    
    a_au_val = char_res.get('semi_major_axis_au')
    a_au_val = float(a_au_val) if a_au_val and a_au_val != 'N/A' else None
    pr_val = char_res.get('planet_radius_earth')
    pr_val = float(pr_val) if pr_val and pr_val != 'N/A' else None
    
    vis_img = plot_system_visualizer(a_au_val, teff_val, rad_val, pr_val)
    elements.append(Image(vis_img, width=5.5*inch, height=3.66*inch))
    elements.append(PageBreak())
    
    # ADAPTIVE RENDERING
    ts_data = analysis_data.get('data', {})
    time = ts_data.get('time', [])
    
    # PAGE 3: LIGHT CURVES (Conditionally Rendered)
    if time and len(time) > 0:
        elements.append(Paragraph("Light Curve Analysis", styles['SectionHeader']))
        raw_flux = ts_data.get('raw_flux', [])
        clean_flux = ts_data.get('clean_flux', [])
        
        raw_img = plot_light_curve(time, raw_flux, "Raw Photometric Data", color='#94a3b8')
        elements.append(Image(raw_img, width=6.5*inch, height=2.8*inch))
        elements.append(Spacer(1, 0.2*inch))
        
        clean_img = plot_light_curve(time, clean_flux, "Detrended Light Curve", color='#3b82f6', is_scatter=False)
        elements.append(Image(clean_img, width=6.5*inch, height=2.8*inch))
        elements.append(PageBreak())
    
    # PAGE 4: TLS EVIDENCE (Conditionally Rendered)
    power_spectrum = val_sum.get('power_spectrum', {})
    if power_spectrum and isinstance(power_spectrum, dict):
        periods = power_spectrum.get('periods', [])
        power = power_spectrum.get('power', [])
        best_period = val_sum.get('period', 0)
        
        if periods and power and len(periods) > 0:
            elements.append(Paragraph("TLS Detection Evidence", styles['SectionHeader']))
            tls_img = plot_tls_spectrum(periods, power, best_period)
            elements.append(Image(tls_img, width=6.5*inch, height=3.7*inch))
            
            elements.append(Spacer(1, 0.2*inch))
            elements.append(Paragraph("Detection Statistics", styles['SubSection']))
            det_data = [
                ["Metric", "Value"],
                ["Best Period", f"{fmt(best_period, 4)} d"],
                ["Peak Power", fmt(max(power), 2) if power else "N/A"],
                ["SDE Threshold (Est)", "7.00"],
                ["Detection Confidence", f"{fmt(tls_conf, 1)}%"]
            ]
            t_det = Table(det_data, colWidths=[200, 200])
            t_det.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#1e293b")),
                ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
                ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
                ('GRID', (0,0), (-1,-1), 1, colors.HexColor("#cbd5e1")),
                ('PADDING', (0,0), (-1,-1), 6),
            ]))
            elements.append(t_det)
            elements.append(PageBreak())
    
    # PAGE 5: BATMAN FIT (Conditionally Rendered)
    fit_data = analysis_data.get('fit')
    phase = ts_data.get('phase', [])
    clean_flux = ts_data.get('clean_flux', [])
    
    if fit_data and phase and len(phase) == len(clean_flux) and len(phase) > 0:
        elements.append(Paragraph("Transit Fit & Modeling", styles['SectionHeader']))
        model_flux = fit_data.get('model_flux', [])
        residuals = fit_data.get('residuals', [])
        
        batman_img = plot_batman_fit(phase, clean_flux, model_flux, residuals)
        elements.append(Image(batman_img, width=6.5*inch, height=4.6*inch))
        
        elements.append(Spacer(1, 0.2*inch))
        elements.append(Paragraph("Fit Quality Metrics", styles['SubSection']))
        fit_stats = [
            ["Metric", "Value"],
            ["Impact Parameter (b)", robust_get(fit_data, 'impact_parameter', 3)],
            ["Radius Ratio (Rp/Rs)", robust_get(fit_data, 'rp_rs', 4)],
            ["a/Rs", robust_get(fit_data, 'a_rs', 2)],
            ["Chi-Square", robust_get(fit_data, 'chi_square', 2)],
            ["Reduced Chi-Square", robust_get(fit_data, 'reduced_chi_square', 3)],
            ["RMS", robust_get(fit_data, 'rms', 6)]
        ]
        t_fit = Table(fit_stats, colWidths=[200, 200])
        t_fit.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#1e293b")),
            ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('GRID', (0,0), (-1,-1), 1, colors.HexColor("#cbd5e1")),
            ('PADDING', (0,0), (-1,-1), 6),
        ]))
        elements.append(t_fit)
        elements.append(PageBreak())
    
    # PAGE 6: APPENDICES & EXPANSION
    elements.append(Paragraph("Appendices", styles['SectionHeader']))
    elements.append(Paragraph("Appendix A: False Positive Analysis", styles['SubSection']))
    
    fp_table_data = [
        ["Risk Factor", "Score/Status"],
        ["Overall False Positive Risk", f"{fmt(fp_risk, 1)}%"],
        ["CNN Model Prediction", val_sum.get('cnn_message', 'Analysis not available')],
        ["Risk Assessment", fp_res.get('summary', 'Analysis not available')]
    ]
    t_fp = Table(fp_table_data, colWidths=[200, 300])
    t_fp.setStyle(TableStyle([
        ('GRID', (0,0), (-1,-1), 1, colors.HexColor("#cbd5e1")),
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#1e293b")),
        ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('PADDING', (0,0), (-1,-1), 6),
    ]))
    elements.append(t_fp)
    
    # Future Expansion Loop & MCMC Appendix
    appendix_counter = ord('B')
    
    # Render MCMC
    if 'mcmc' in analysis_data and analysis_data['mcmc']:
        mcmc = analysis_data['mcmc']
        elements.append(Spacer(1, 0.3*inch))
        elements.append(Paragraph(f"Appendix {chr(appendix_counter)}: MCMC Posterior Diagnostics", styles['SubSection']))
        
        mcmc_stats = [
            ["Metric", "Value"],
            ["Period (days)", f"{mcmc.get('period_mcmc', 0):.4f} +{mcmc.get('period_err_plus', 0):.4f} -{mcmc.get('period_err_minus', 0):.4f}"],
            ["Depth", f"{mcmc.get('depth_mcmc', 0):.4f} +{mcmc.get('depth_err_plus', 0):.4f} -{mcmc.get('depth_err_minus', 0):.4f}"],
            ["Impact Parameter", f"{mcmc.get('impact_parameter', 0):.3f} +{mcmc.get('b_err_plus', 0):.3f} -{mcmc.get('b_err_minus', 0):.3f}"]
        ]
        t_mcmc = Table(mcmc_stats, colWidths=[200, 300])
        t_mcmc.setStyle(TableStyle([
            ('GRID', (0,0), (-1,-1), 1, colors.HexColor("#cbd5e1")),
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#1e293b")),
            ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('PADDING', (0,0), (-1,-1), 6),
        ]))
        elements.append(t_mcmc)
        elements.append(Spacer(1, 0.2*inch))
        
        plot_path = mcmc.get('corner_plot_path')
        import os
        if plot_path and os.path.exists(plot_path):
            elements.append(Image(plot_path, width=6.5*inch, height=6.5*inch))
        
        appendix_counter += 1
        
    future_keys = [
        ('deep_recovery', 'Deep Recovery Pipeline'),
        ('follow_up', 'Follow-Up Observation Logs')
    ]
    
    for key, title in future_keys:
        if key in analysis_data and analysis_data[key]:
            elements.append(Spacer(1, 0.3*inch))
            elements.append(Paragraph(f"Appendix {chr(appendix_counter)}: {title}", styles['SubSection']))
            elements.append(Paragraph(str(analysis_data[key]), styles['CustomBodyText']))
            appendix_counter += 1
            
    # Add Footer Function
    def add_footer(canvas, doc):
        canvas.saveState()
        canvas.setFont('Helvetica', 9)
        canvas.setStrokeColor(colors.HexColor("#cbd5e1"))
        canvas.line(40, 40, letter[0]-40, 40)
        canvas.drawString(40, 25, "EXONYX Scientific Discovery Dossier")
        canvas.drawRightString(letter[0]-40, 25, f"Page {doc.page}")
        canvas.drawCentredString(letter[0]/2.0, 25, datetime.datetime.utcnow().strftime("%Y-%m-%d UTC"))
        canvas.restoreState()

    doc.build(elements, onFirstPage=add_footer, onLaterPages=add_footer)
    
    pdf_bytes = buffer.getvalue()
    buffer.close()
    
    return pdf_bytes

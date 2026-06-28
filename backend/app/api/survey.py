import asyncio
import json
import logging
import pandas as pd
import datetime
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.engine.data_hub import fetch_lightcurve, detrend_lightcurve
from app.engine.detection import run_tls
from app.engine.transit_fit import phase_fold, fit_transit_model
from app.engine.false_positive import run_false_positive_analysis
from app.engine.validation import validate_candidate
from app.engine.characterization import characterize_planet, run_mcmc_characterization
from app.engine.habitability import assess_habitability
from app.engine.scoring import calculate_pli
from app.engine.database import save_candidate, save_campaign, SessionLocal, Campaign
from app.engine.diagnostics import get_vram_usage

logger = logging.getLogger(__name__)
router = APIRouter()

async def _safe_send(ws: WebSocket, lock: asyncio.Lock, data: dict):
    """Thread-safe WebSocket send with lock."""
    async with lock:
        try:
            await ws.send_json(data)
        except Exception:
            pass

async def process_target(target, ws: WebSocket, sem: asyncio.Semaphore,
                         campaign_state: dict, state_lock: asyncio.Lock, ws_lock: asyncio.Lock):
    target_id = target.get("target_id")
    mission = target.get("mission", "Kepler")
    
    async with sem:
        try:
            await _safe_send(ws, ws_lock, {
                "type": "target_update", "target_id": target_id,
                "mission": mission, "status": "Processing"
            })
            
            def run_pipeline():
                raw_res = fetch_lightcurve(target_id, mission=mission)
                if raw_res["status"] == "error":
                    msg = raw_res["message"]
                    is_not_found = "No light curves found" in msg
                    return {
                        "status": "not_found" if is_not_found else "error",
                        "message": msg
                    }
                
                time_list = raw_res["time"]
                flux_list = raw_res["flux"]
                detrend_res = detrend_lightcurve(time_list, flux_list)
                clean_flux_list = detrend_res["clean_flux"] if detrend_res["status"] == "success" else flux_list
                
                df = pd.DataFrame({"time": time_list, "raw_flux": flux_list, "clean_flux": clean_flux_list})
                time_array = df["time"].values
                clean_flux = df["clean_flux"].values
                
                tls_result = run_tls(time_array, clean_flux)
                period = tls_result['period'] if tls_result['period'] else 0.0
                duration = tls_result['duration'] if tls_result['duration'] else 0.0
                depth = tls_result['depth'] if tls_result['depth'] else 0.0
                t0 = tls_result['transit_times'][0] if tls_result['transit_times'] else 0.0
                
                fp_res = run_false_positive_analysis(time_array, clean_flux, period, duration, t0, depth)
                fp_rej = fp_res['score']
                
                cnn_conf = None
                if tls_result['transit_detected'] and len(time_array) > 100 and period > 0:
                    val_phase = phase_fold(time_array, period, t0).tolist()
                    val_result = validate_candidate(val_phase, clean_flux)
                    cnn_conf = val_result['cnn_confidence']
                    
                period_err = period * 0.001
                depth_err = depth * 0.05
                char_res = characterize_planet(
                    period_days=period, period_err=period_err,
                    depth=depth, depth_err=depth_err,
                    duration_days=duration,
                    stellar_radius=raw_res["metadata"]["radius"],
                    stellar_mass=raw_res["metadata"]["mass"]
                )
                
                hab_result = assess_habitability(
                    planet_radius_earth=char_res["planet_radius_earth"],
                    r_err=char_res["planet_radius_err"],
                    semi_major_axis_au=char_res["semi_major_axis_au"],
                    a_err=char_res["semi_major_axis_err"],
                    teff_k=raw_res["metadata"]["teff"],
                    stellar_radius_sun=raw_res["metadata"]["radius"]
                )
                
                qual = raw_res["metadata"]["signal_quality"]
                pli_result = calculate_pli(tls_result['tls_confidence'], cnn_conf, qual, 80.0, fp_rej)
                
                if pli_result['score'] > 85.0:
                    try:
                        run_mcmc_characterization(target_id, period, depth)
                    except Exception as e:
                        logger.warning(f"MCMC skipped for {target_id}: {e}")
                
                fit_result = None
                if tls_result['transit_detected'] and period > 0:
                    fit_result = fit_transit_model(
                        time_array, clean_flux, 
                        period, t0, depth, duration, 
                        raw_res["metadata"]["radius"], raw_res["metadata"]["mass"]
                    )
                
                return {
                    "status": "success",
                    "pli": pli_result['score'],
                    "esi": hab_result['esi'],
                    "radius": char_res["planet_radius_earth"],
                    "period": period,
                    "fp_risk": fp_res['risk'],
                    "char_res": char_res,
                    "hab_result": hab_result,
                    "fit_result": fit_result,
                    "tls_result": tls_result,
                    "cnn_conf": cnn_conf,
                    "fp_res": fp_res
                }
                
            res = await asyncio.to_thread(run_pipeline)
            
            # Handle Target Not Found
            if res["status"] == "not_found":
                async with state_lock:
                    campaign_state["processed"] += 1
                await _safe_send(ws, ws_lock, {
                    "type": "target_result", "target_id": target_id, "mission": mission,
                    "result_status": "Target Not Found", "pli": 0, "message": res["message"]
                })
                return
            
            # Handle other fetch/processing errors
            if res["status"] == "error":
                async with state_lock:
                    campaign_state["processed"] += 1
                await _safe_send(ws, ws_lock, {
                    "type": "target_result", "target_id": target_id, "mission": mission,
                    "result_status": "Failed", "pli": 0,
                    "message": "Data retrieval failed. Please verify target ID and retry."
                })
                return

            pli = res["pli"]
            
            # Scientific classification
            final_status = "Rejected"
            rejection_message = None
            
            if pli >= 85: 
                final_status = "High Priority"
            elif pli >= 70: 
                final_status = "Candidate"
            elif pli >= 50: 
                final_status = "Review Required"
            else:
                if not res["tls_result"].get('transit_detected'):
                    rejection_message = "No statistically significant transit signal detected."
                elif res["tls_result"].get('tls_confidence', 0) < 7.0:
                    rejection_message = "Signal-to-noise ratio below threshold."
                elif res["fp_risk"] > 50.0:
                    rejection_message = "High false positive probability."
                else:
                    rejection_message = "Insufficient overall planet likelihood."

            async with state_lock:
                if pli >= 50:
                    campaign_state["candidates"] += 1
                    if pli >= 85:
                        campaign_state["high_priority"] += 1
                    
                    save_candidate({
                        "target_id": target_id,
                        "mission": mission,
                        "period": res["char_res"]["period_days"],
                        "period_err": res["char_res"]["period_err"],
                        "radius": res["char_res"]["planet_radius_earth"],
                        "radius_err": res["char_res"]["planet_radius_err"],
                        "transit_depth": res["char_res"]["transit_depth"],
                        "transit_depth_err": res["char_res"]["transit_depth_err"],
                        "transit_duration": res["char_res"]["transit_duration_hours"],
                        "semi_major_axis": res["char_res"]["semi_major_axis_au"],
                        "semi_major_axis_err": res["char_res"]["semi_major_axis_err"],
                        "equilibrium_temp": res["hab_result"]["equilibrium_temperature_k"],
                        "equilibrium_temp_err": res["hab_result"]["equilibrium_temperature_err"],
                        "chi_square": res["fit_result"]["chi_square"] if res["fit_result"] else 0.0,
                        "reduced_chi_square": res["fit_result"]["reduced_chi_square"] if res["fit_result"] else 0.0,
                        "sde_confidence": res["tls_result"]['tls_confidence'],
                        "cnn_confidence": res["cnn_conf"],
                        "status": "Review",
                        "pli_score": pli,
                        "esi_score": res["hab_result"]['esi'],
                        "esi_score_err": res["hab_result"]['esi_err'],
                        "hz_score": res["hab_result"]['hzScore'],
                        "fp_risk": res["fp_risk"],
                        "validation_summary": res["fp_res"]['summary'],
                        "validation_date": datetime.datetime.utcnow(),
                        "notes": "Autogenerated by Survey Campaign"
                    })
                
                campaign_state["processed"] += 1
                campaign_state["pli_sum"] += pli
            
            await _safe_send(ws, ws_lock, {
                "type": "target_result",
                "target_id": target_id,
                "mission": mission,
                "result_status": final_status,
                "pli": pli,
                "esi": res["esi"],
                "radius": res["radius"],
                "period": res["period"],
                "fp_risk": res["fp_risk"],
                "message": rejection_message
            })
            
        except Exception as e:
            logger.error(f"Pipeline failed for {target_id}: {e}", exc_info=True)
            async with state_lock:
                campaign_state["processed"] += 1
            await _safe_send(ws, ws_lock, {
                "type": "target_result", "target_id": target_id, "mission": mission,
                "result_status": "Failed", "pli": 0,
                "message": "Internal processing error. Please retry."
            })
        finally:
            # Update Peak VRAM
            current_vram = get_vram_usage()
            async with state_lock:
                if current_vram > campaign_state.get("peak_vram", 0):
                    campaign_state["peak_vram"] = current_vram
                    
            # Hard VRAM management for RTX 3050 4GB constraint
            try:
                import torch
                if torch.cuda.is_available():
                    torch.cuda.empty_cache()
            except ImportError:
                pass
                
            try:
                import cupy as cp
                cp.get_default_memory_pool().free_all_blocks()
                cp.get_default_pinned_memory_pool().free_all_blocks()
            except ImportError:
                pass

@router.websocket("/batch")
async def survey_campaign_batch(websocket: WebSocket):
    await websocket.accept()
    
    ws_lock = asyncio.Lock()
    state_lock = asyncio.Lock()
    
    try:
        data = await websocket.receive_text()
        payload = json.loads(data)
        targets = payload.get("targets", [])
        
        if not targets:
            await websocket.send_json({"type": "error", "message": "No targets provided."})
            await websocket.close()
            return
            
        if len(targets) > 50:
            await websocket.send_json({"type": "error", "message": "GPU Protection: Maximum 50 targets per campaign allowed."})
            await websocket.close()
            return
        
        # Deduplicate targets by target_id
        seen = set()
        unique_targets = []
        for t in targets:
            tid = t.get("target_id")
            if tid not in seen:
                seen.add(tid)
                unique_targets.append(t)
        targets = unique_targets
            
        # Create Campaign Audit Trail
        vram_start = get_vram_usage()
        logger.info(f"Campaign Start. VRAM Usage: {vram_start} MB")
        
        campaign_record = save_campaign({
            "start_time": datetime.datetime.utcnow(),
            "targets_processed": 0,
            "candidates_generated": 0,
            "high_priority_found": 0
        })
        
        campaign_state = {
            "processed": 0,
            "candidates": 0,
            "high_priority": 0,
            "pli_sum": 0.0,
            "peak_vram": vram_start
        }
        
        await websocket.send_json({
            "type": "campaign_started",
            "campaign_id": campaign_record.id,
            "total_targets": len(targets)
        })
        
        # Limit concurrency for RTX 3050 4GB VRAM safety
        sem = asyncio.Semaphore(2)
        
        tasks = [
            asyncio.create_task(
                process_target(t, websocket, sem, campaign_state, state_lock, ws_lock)
            )
            for t in targets
        ]
        
        await asyncio.gather(*tasks)
        
        vram_end = get_vram_usage()
        logger.info(f"Campaign Complete. Peak VRAM: {campaign_state['peak_vram']} MB. End VRAM: {vram_end} MB")
        
        # Update Campaign Audit Trail
        db = SessionLocal()
        try:
            camp = db.query(Campaign).filter(Campaign.id == campaign_record.id).first()
            if camp:
                camp.end_time = datetime.datetime.utcnow()
                camp.targets_processed = campaign_state["processed"]
                camp.candidates_generated = campaign_state["candidates"]
                camp.high_priority_found = campaign_state["high_priority"]
                db.commit()
        finally:
            db.close()
        
        avg_pli = campaign_state["pli_sum"] / max(1, campaign_state["processed"])
        await _safe_send(websocket, ws_lock, {
            "type": "campaign_finished",
            "processed": campaign_state["processed"],
            "candidates": campaign_state["candidates"],
            "high_priority": campaign_state["high_priority"],
            "avg_pli": avg_pli
        })
        
    except WebSocketDisconnect:
        logger.info("Survey Campaign: Client disconnected.")
    except Exception as e:
        logger.error(f"Survey Campaign error: {e}", exc_info=True)
        try:
            await websocket.send_json({"type": "error", "message": "Campaign encountered an unexpected error."})
        except:
            pass

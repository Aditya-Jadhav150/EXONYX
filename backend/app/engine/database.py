import os
import datetime
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Text
from sqlalchemy.orm import declarative_base, sessionmaker

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "exonyx_candidates.db")
DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class Candidate(Base):
    __tablename__ = "candidates"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    target_id = Column(String, index=True, nullable=False)
    mission = Column(String, nullable=False)
    
    # Physics & Uncertainties
    period = Column(Float)
    period_err = Column(Float)
    radius = Column(Float)
    radius_err = Column(Float)
    transit_depth = Column(Float)
    transit_depth_err = Column(Float)
    transit_duration = Column(Float)
    semi_major_axis = Column(Float)
    semi_major_axis_err = Column(Float)
    equilibrium_temp = Column(Float)
    equilibrium_temp_err = Column(Float)
    
    # Fit Quality
    chi_square = Column(Float)
    reduced_chi_square = Column(Float)
    
    # Validation & Scores
    sde_confidence = Column(Float)
    cnn_confidence = Column(Float, nullable=True)
    status = Column(String, default="Review")
    pli_score = Column(Float)
    esi_score = Column(Float)
    esi_score_err = Column(Float)
    hz_score = Column(Float)
    fp_risk = Column(Float) # False positive risk
    
    detection_date = Column(DateTime, default=datetime.datetime.utcnow)
    analysis_date = Column(DateTime, default=datetime.datetime.utcnow)
    validation_date = Column(DateTime, nullable=True)
    last_updated = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    validation_summary = Column(Text)
    
    # Research Notebook
    notes = Column(Text, default="")

class Campaign(Base):
    __tablename__ = "campaigns"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    start_time = Column(DateTime, default=datetime.datetime.utcnow)
    end_time = Column(DateTime, nullable=True)
    targets_processed = Column(Integer, default=0)
    candidates_generated = Column(Integer, default=0)
    high_priority_found = Column(Integer, default=0)

def init_db():
    Base.metadata.create_all(bind=engine)

def save_campaign(data_dict: dict):
    db = SessionLocal()
    try:
        campaign = Campaign(**data_dict)
        db.add(campaign)
        db.commit()
        db.refresh(campaign)
        return campaign
    finally:
        db.close()

def save_candidate(data_dict: dict):
    """Save or update a candidate in the database (upsert by target_id + mission)."""
    db = SessionLocal()
    try:
        existing = db.query(Candidate).filter(
            Candidate.target_id == data_dict.get("target_id"),
            Candidate.mission == data_dict.get("mission")
        ).first()
        
        if existing:
            for key, value in data_dict.items():
                if hasattr(existing, key):
                    setattr(existing, key, value)
            db.commit()
            db.refresh(existing)
            return existing
        else:
            candidate = Candidate(**data_dict)
            db.add(candidate)
            db.commit()
            db.refresh(candidate)
            return candidate
    finally:
        db.close()

def get_all_candidates():
    """Retrieve all candidates from the database."""
    db = SessionLocal()
    try:
        candidates = db.query(Candidate).order_by(Candidate.pli_score.desc()).all()
        return [
            {c.name: getattr(cand, c.name) for c in Candidate.__table__.columns}
            for cand in candidates
        ]
    finally:
        db.close()

def update_candidate_notes(candidate_id: int, notes: str):
    db = SessionLocal()
    try:
        candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
        if candidate:
            candidate.notes = notes
            db.commit()
            return True
        return False
    finally:
        db.close()

init_db()

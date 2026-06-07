import uuid
import datetime
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, JSON, Text, Float
from sqlalchemy.orm import relationship
from backend.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(String(50), primary_key=True, default=generate_uuid)
    email = Column(String(100), unique=True, index=True, nullable=False)
    plan = Column(String(30), default="free")  # free, starter, pro, enterprise
    rows_generated_this_month = Column(Integer, default=0)
    max_rows_limit = Column(Integer, default=5000)
    monthly_api_calls = Column(Integer, default=0)
    max_api_limit = Column(Integer, default=1000)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    datasets = relationship("Dataset", back_populates="user", cascade="all, delete-orphan")
    api_keys = relationship("APIKey", back_populates="user", cascade="all, delete-orphan")
    workspaces = relationship("Workspace", back_populates="owner", cascade="all, delete-orphan")
    prompts = relationship("PromptTemplate", back_populates="user", cascade="all, delete-orphan")
    purchases = relationship("MarketplacePurchase", back_populates="user", cascade="all, delete-orphan")


class Workspace(Base):
    __tablename__ = "workspaces"

    id = Column(String(50), primary_key=True, default=generate_uuid)
    name = Column(String(100), nullable=False)
    owner_id = Column(String(50), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    owner = relationship("User", back_populates="workspaces")
    datasets = relationship("Dataset", back_populates="workspace")


class Dataset(Base):
    __tablename__ = "datasets"

    id = Column(String(50), primary_key=True, default=generate_uuid)
    name = Column(String(100), nullable=False)
    # Stores schema: { "columns": [ { "name": "...", "type": "...", "null_pct": ... } ], "relations": [...] }
    schema_definition = Column(JSON, nullable=False)
    row_count = Column(Integer, nullable=False)
    file_format = Column(String(30), nullable=False)  # CSV, XLSX, JSON, SQL, Parquet, JSONL (for conversations)
    download_url = Column(String(500), nullable=True)
    user_id = Column(String(50), ForeignKey("users.id"), nullable=False)
    workspace_id = Column(String(50), ForeignKey("workspaces.id"), nullable=True)
    
    # Versioning
    is_template = Column(Boolean, default=False)
    parent_id = Column(String(50), nullable=True)  # for version tracking / cloning
    version = Column(Integer, default=1)
    
    # Quality Report Engine
    quality_score = Column(Integer, default=100)
    # Stores dict: { completeness: 100, referential_integrity: 100, duplicates: 0, missing: 0, realism: 100, logs: [...] }
    quality_report = Column(JSON, nullable=True)
    
    # Marketplace listing details
    is_public = Column(Boolean, default=False)
    price = Column(Float, default=0.0)
    downloads = Column(Integer, default=0)
    rating = Column(Float, default=5.0)

    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="datasets")
    workspace = relationship("Workspace", back_populates="datasets")
    purchases = relationship("MarketplacePurchase", back_populates="dataset", cascade="all, delete-orphan")


class Template(Base):
    __tablename__ = "templates"

    id = Column(String(50), primary_key=True, default=generate_uuid)
    name = Column(String(100), nullable=False)
    description = Column(String(255), nullable=True)
    industry = Column(String(50), nullable=False)  # Healthcare, Banking, Retail, etc.
    schema_definition = Column(JSON, nullable=False)
    is_system = Column(Boolean, default=False)  # True = built-in template, False = user template
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class PromptTemplate(Base):
    __tablename__ = "prompt_templates"

    id = Column(String(50), primary_key=True, default=generate_uuid)
    title = Column(String(100), nullable=False)
    prompt_text = Column(Text, nullable=False)
    is_favorite = Column(Boolean, default=False)
    user_id = Column(String(50), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="prompts")


class MarketplacePurchase(Base):
    __tablename__ = "marketplace_purchases"

    id = Column(String(50), primary_key=True, default=generate_uuid)
    user_id = Column(String(50), ForeignKey("users.id"), nullable=False)
    dataset_id = Column(String(50), ForeignKey("datasets.id"), nullable=False)
    amount_paid = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="purchases")
    dataset = relationship("Dataset", back_populates="purchases")


class APIKey(Base):
    __tablename__ = "api_keys"

    id = Column(String(50), primary_key=True, default=generate_uuid)
    name = Column(String(100), nullable=False)
    key_hash = Column(String(255), unique=True, index=True, nullable=False)
    masked_key = Column(String(50), nullable=False)  # e.g., sds_live_...abcd
    user_id = Column(String(50), ForeignKey("users.id"), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="api_keys")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(50), nullable=True)
    action = Column(String(100), nullable=False)  # GENERATE_DATASET, CLONE_DATASET, etc.
    details = Column(Text, nullable=True)
    ip_address = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class Payment(Base):
    """Tracks Razorpay payment orders and plan upgrades."""
    __tablename__ = "payments"

    id = Column(String(50), primary_key=True, default=generate_uuid)
    user_id = Column(String(50), ForeignKey("users.id"), nullable=False)
    razorpay_order_id = Column(String(100), unique=True, index=True, nullable=False)
    razorpay_payment_id = Column(String(100), nullable=True)  # filled after payment success
    razorpay_signature = Column(String(255), nullable=True)
    plan = Column(String(30), nullable=False)    # starter | pro | enterprise
    amount_paise = Column(Integer, nullable=False)  # amount in INR paise
    status = Column(String(30), default="created")  # created | paid | failed
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    paid_at = Column(DateTime, nullable=True)


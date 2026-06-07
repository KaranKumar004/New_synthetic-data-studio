from pydantic import BaseModel, Field, EmailStr
from typing import List, Dict, Any, Optional
from datetime import datetime

# Auth schemas
class UserAuth(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    email: str
    plan: str
    max_rows_limit: int

# AI Prompt schema (for natural language schema extraction)
class PromptRequest(BaseModel):
    prompt: str

# Dataset generator schemas
class ColumnConfig(BaseModel):
    min: Optional[Any] = None
    max: Optional[Any] = None
    distribution: Optional[str] = "uniform"
    mean: Optional[float] = None
    stddev: Optional[float] = None
    prefix: Optional[str] = None
    categories: Optional[List[str]] = None
    weights: Optional[List[float]] = None
    true_percentage: Optional[float] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    format: Optional[str] = None
    symbol: Optional[str] = None
    precision: Optional[int] = None
    foreign_key: Optional[str] = None  # Format: "parent_table.parent_column"
    sentences: Optional[int] = None

class TableColumn(BaseModel):
    name: str
    type: str
    null_pct: float = Field(0.0, ge=0.0, le=100.0)
    config: Optional[Dict[str, Any]] = None

class TableDefinition(BaseModel):
    name: str
    rows: int = Field(100, ge=1, le=100000)
    columns: List[TableColumn]

class DatasetGenerateRequest(BaseModel):
    name: str
    rows: int = Field(100, ge=1, le=100000)
    locale: str = "en_US"
    tables: List[TableDefinition]
    noise_level: str = "perfect"  # perfect, realistic, noisy
    global_null_pct: float = Field(0.0, ge=0.0, le=100.0)
    export_format: str = "CSV"  # CSV, XLSX, JSON, SQL, PARQUET, JSONL
    
    # Versioning / Parent updates
    parent_id: Optional[str] = None

# Response schema definitions
class DatasetResponse(BaseModel):
    id: str
    name: str
    row_count: int
    file_format: str
    download_url: Optional[str] = None
    version: int
    quality_score: int
    quality_report: Optional[Dict[str, Any]] = None
    is_public: bool
    price: float
    downloads: int
    rating: float
    created_at: datetime
    schema_definition: Dict[str, Any]

    class Config:
        from_attributes = True

class TemplateCreate(BaseModel):
    name: str
    description: Optional[str] = None
    industry: str
    schema_definition: Dict[str, Any]

class TemplateResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    industry: str
    schema_definition: Dict[str, Any]
    is_system: bool
    created_at: datetime

    class Config:
        from_attributes = True

class APIKeyRequest(BaseModel):
    name: str

class APIKeyResponse(BaseModel):
    id: str
    name: str
    masked_key: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class UserProfileResponse(BaseModel):
    id: str
    email: str
    plan: str
    rows_generated_this_month: int
    max_rows_limit: int
    monthly_api_calls: int
    max_api_limit: int
    created_at: datetime

    class Config:
        from_attributes = True

class UsageAnalytics(BaseModel):
    rows_generated: int
    rows_limit: int
    plan: str
    total_datasets: int
    recent_activity: List[DatasetResponse]
    generation_by_format: Dict[str, int]
    api_calls_made: int
    api_calls_limit: int

# --- NEW ADVANCED SCHEMAS ---

# Prompt Library
class SavedPromptCreate(BaseModel):
    title: str
    prompt_text: str

class SavedPromptResponse(BaseModel):
    id: str
    title: str
    prompt_text: str
    is_favorite: bool
    created_at: datetime

    class Config:
        from_attributes = True

# Marketplace
class MarketplacePublishRequest(BaseModel):
    dataset_id: str
    price: float = Field(0.0, ge=0.0)
    description: Optional[str] = None

class MarketplacePurchaseRequest(BaseModel):
    dataset_id: str

# Assistant Chat
class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    response: str

# Drift Simulator
class DriftSimulationRequest(BaseModel):
    months: int = Field(3, ge=2, le=12)
    dataset_id: str

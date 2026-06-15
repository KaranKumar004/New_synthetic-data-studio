import os
import uuid
import datetime
import hashlib
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, Depends, HTTPException, status, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session

from backend.config import settings
from backend.database import get_db, init_db
from backend.models import User, Dataset, Template, APIKey, AuditLog, PromptTemplate, MarketplacePurchase, Payment
from backend.schemas import (
    UserAuth, Token, PromptRequest, DatasetGenerateRequest, DatasetResponse,
    TemplateCreate, TemplateResponse, APIKeyRequest, APIKeyResponse, UserProfileResponse, UsageAnalytics,
    SavedPromptCreate, SavedPromptResponse, MarketplacePublishRequest, MarketplacePurchaseRequest,
    ChatRequest, ChatResponse, DriftSimulationRequest, TableColumn, TableDefinition
)
from backend.auth import get_current_user, get_password_hash, verify_password, create_access_token
from backend.generator import RelationalDatasetGenerator, export_data, analyze_dataset_quality, simulate_data_drift
from backend.ai_engine import infer_schema_with_ai
from backend.assistant import answer_dataset_query
from backend.ai_training_generator import generate_ai_training_data_with_ai, generate_conversation_with_ai
from backend.image_generator import create_image_dataset_zip

app = FastAPI(title=settings.PROJECT_NAME, version="1.0.0")

# Setup CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permits local web UI and Capacitor Android app access
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure exports directory exists
os.makedirs(settings.STORAGE_DIR, exist_ok=True)

# Helper to verify API key
def get_current_user_by_api_key(
    db: Session = Depends(get_db),
    x_api_key: Optional[str] = Query(None, alias="api_key")
) -> User:
    if not x_api_key:
        raise HTTPException(status_code=401, detail="API Key is missing")
    
    hashed_key = hashlib.sha256(x_api_key.encode()).hexdigest()
    api_key_record = db.query(APIKey).filter(APIKey.key_hash == hashed_key, APIKey.is_active == True).first()
    if not api_key_record:
        raise HTTPException(status_code=401, detail="Invalid or inactive API Key")
    
    user = db.query(User).filter(User.id == api_key_record.user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User associated with API Key not found")
    return user

# Pre-populate industry templates
def seed_templates(db: Session):
    industry_presets = [
        # 1. Retail
        {
            "name": "Retail - Customers & Orders",
            "description": "Standard retail template featuring customers and order logs with referential integrity.",
            "industry": "Retail",
            "schema_definition": {
                "tables": [
                    {
                        "name": "customers",
                        "rows": 100,
                        "columns": [
                            {"name": "customer_id", "type": "Customer ID", "null_pct": 0, "config": {"prefix": "CUST-"}},
                            {"name": "name", "type": "Name", "null_pct": 0, "config": {}},
                            {"name": "email", "type": "Email", "null_pct": 0, "config": {}},
                            {"name": "avatar", "type": "Avatar URL", "null_pct": 0, "config": {}},
                            {"name": "age", "type": "Age", "null_pct": 0, "config": {"min": 18, "max": 75}},
                            {"name": "gender", "type": "Gender", "null_pct": 0, "config": {}},
                            {"name": "city", "type": "City", "null_pct": 0, "config": {}},
                            {"name": "state", "type": "State", "null_pct": 0, "config": {}}
                        ]
                    },
                    {
                        "name": "orders",
                        "rows": 250,
                        "columns": [
                            {"name": "order_id", "type": "UUID", "null_pct": 0, "config": {}},
                            {"name": "customer_id", "type": "Customer ID", "null_pct": 0, "config": {"foreign_key": "customers.customer_id"}},
                            {"name": "product_name", "type": "Product Name", "null_pct": 0, "config": {}},
                            {"name": "purchase_date", "type": "Date", "null_pct": 0, "config": {"start_date": "-1y", "end_date": "today"}},
                            {"name": "amount", "type": "Currency", "null_pct": 0, "config": {"min": 5.99, "max": 899.99}},
                            {"name": "status", "type": "Categories", "null_pct": 0, "config": {"categories": ["Delivered", "Shipped", "Processing", "Cancelled"], "weights": [0.7, 0.15, 0.1, 0.05]}}
                        ]
                    }
                ]
            }
        },
        # 2. Healthcare
        {
            "name": "Healthcare - Patients & Appointments",
            "description": "Patient directory and appointment bookings for outpatient analytics.",
            "industry": "Healthcare",
            "schema_definition": {
                "tables": [
                    {
                        "name": "patients",
                        "rows": 100,
                        "columns": [
                            {"name": "patient_id", "type": "UUID", "null_pct": 0, "config": {}},
                            {"name": "name", "type": "Name", "null_pct": 0, "config": {}},
                            {"name": "dob", "type": "Date", "null_pct": 0, "config": {"start_date": "-80y", "end_date": "-18y"}},
                            {"name": "gender", "type": "Gender", "null_pct": 0, "config": {}},
                            {"name": "blood_type", "type": "Categories", "null_pct": 0, "config": {"categories": ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"]}},
                            {"name": "phone", "type": "Phone Number", "null_pct": 0, "config": {}},
                            {"name": "address", "type": "Address", "null_pct": 0, "config": {}},
                            {"name": "avatar", "type": "Avatar URL", "null_pct": 0, "config": {}}
                        ]
                    },
                    {
                        "name": "appointments",
                        "rows": 200,
                        "columns": [
                            {"name": "appointment_id", "type": "UUID", "null_pct": 0, "config": {}},
                            {"name": "patient_id", "type": "UUID", "null_pct": 0, "config": {"foreign_key": "patients.patient_id"}},
                            {"name": "appointment_time", "type": "Datetime", "null_pct": 0, "config": {"start_date": "-30d", "end_date": "+30d"}},
                            {"name": "doctor_name", "type": "Name", "null_pct": 0, "config": {}},
                            {"name": "department", "type": "Categories", "null_pct": 0, "config": {"categories": ["General", "Cardiology", "Pediatrics", "Neurology", "Orthopedics"]}},
                            {"name": "notes", "type": "Custom Text", "null_pct": 10, "config": {"sentences": 2}}
                        ]
                    }
                ]
            }
        },
        # 3. Banking
        {
            "name": "Banking - Accounts & Transactions",
            "description": "Financial records template containing customer accounts and ledger transaction feeds.",
            "industry": "Banking",
            "schema_definition": {
                "tables": [
                    {
                        "name": "accounts",
                        "rows": 100,
                        "columns": [
                            {"name": "account_number", "type": "Customer ID", "null_pct": 0, "config": {"prefix": "ACC-"}},
                            {"name": "owner_name", "type": "Name", "null_pct": 0, "config": {}},
                            {"name": "avatar", "type": "Avatar URL", "null_pct": 0, "config": {}},
                            {"name": "account_type", "type": "Categories", "null_pct": 0, "config": {"categories": ["Savings", "Checking", "Credit Card", "Loan"], "weights": [0.5, 0.3, 0.15, 0.05]}},
                            {"name": "balance", "type": "Currency", "null_pct": 0, "config": {"min": 5.0, "max": 250000.0}},
                            {"name": "opened_at", "type": "Date", "null_pct": 0, "config": {"start_date": "-5y", "end_date": "today"}},
                            {"name": "is_active", "type": "Boolean", "null_pct": 0, "config": {"true_percentage": 92}}
                        ]
                    },
                    {
                        "name": "transactions",
                        "rows": 500,
                        "columns": [
                            {"name": "tx_id", "type": "UUID", "null_pct": 0, "config": {}},
                            {"name": "account_number", "type": "Customer ID", "null_pct": 0, "config": {"foreign_key": "accounts.account_number"}},
                            {"name": "tx_type", "type": "Categories", "null_pct": 0, "config": {"categories": ["Deposit", "Withdrawal", "Transfer", "Payment"]}},
                            {"name": "amount", "type": "Currency", "null_pct": 0, "config": {"min": 1.0, "max": 5000.0}},
                            {"name": "tx_time", "type": "Datetime", "null_pct": 0, "config": {"start_date": "-30d", "end_date": "today"}}
                        ]
                    }
                ]
            }
        },
        # 4. HR
        {
            "name": "HR - Employees & Payroll",
            "description": "Employee database with salary details and payroll tracking fields.",
            "industry": "HR",
            "schema_definition": {
                "tables": [
                    {
                        "name": "employees",
                        "rows": 50,
                        "columns": [
                            {"name": "employee_id", "type": "Employee ID", "null_pct": 0, "config": {"prefix": "EMP-"}},
                            {"name": "first_name", "type": "First Name", "null_pct": 0, "config": {}},
                            {"name": "last_name", "type": "Last Name", "null_pct": 0, "config": {}},
                            {"name": "email", "type": "Email", "null_pct": 0, "config": {}},
                            {"name": "avatar", "type": "Avatar URL", "null_pct": 0, "config": {}},
                            {"name": "department", "type": "Categories", "null_pct": 0, "config": {"categories": ["Engineering", "Product", "Sales", "Marketing", "HR", "Finance"]}},
                            {"name": "joining_date", "type": "Date", "null_pct": 0, "config": {"start_date": "-8y", "end_date": "today"}},
                            {"name": "is_manager", "type": "Boolean", "null_pct": 0, "config": {"true_percentage": 15}}
                        ]
                    },
                    {
                        "name": "payroll",
                        "rows": 50,
                        "columns": [
                            {"name": "payroll_id", "type": "UUID", "null_pct": 0, "config": {}},
                            {"name": "employee_id", "type": "Employee ID", "null_pct": 0, "config": {"foreign_key": "employees.employee_id"}},
                            {"name": "base_salary", "type": "Currency", "null_pct": 0, "config": {"min": 3000.0, "max": 18000.0}},
                            {"name": "bonus", "type": "Currency", "null_pct": 0, "config": {"min": 0.0, "max": 3000.0}},
                            {"name": "tax_deduction", "type": "Float", "null_pct": 0, "config": {"min": 0.1, "max": 0.3, "precision": 2}}
                        ]
                    }
                ]
            }
        },
        # 5. Retail - E-Commerce
        {
            "name": "Retail - E-Commerce Cart Sessions",
            "description": "Product catalog and active shopping cart sessions.",
            "industry": "Retail",
            "schema_definition": {
                "tables": [
                    {
                        "name": "products",
                        "rows": 40,
                        "columns": [
                            {"name": "product_id", "type": "UUID", "null_pct": 0, "config": {}},
                            {"name": "product_name", "type": "Product Name", "null_pct": 0, "config": {}},
                            {"name": "product_image", "type": "Product Image URL", "null_pct": 0, "config": {}},
                            {"name": "category", "type": "Product Category", "null_pct": 0, "config": {}},
                            {"name": "price", "type": "Currency", "null_pct": 0, "config": {"min": 10.0, "max": 1500.0}},
                            {"name": "inventory", "type": "Integer", "null_pct": 0, "config": {"min": 5, "max": 500}}
                        ]
                    },
                    {
                        "name": "cart_sessions",
                        "rows": 120,
                        "columns": [
                            {"name": "session_id", "type": "UUID", "null_pct": 0, "config": {}},
                            {"name": "customer_email", "type": "Email", "null_pct": 0, "config": {}},
                            {"name": "product_id", "type": "UUID", "null_pct": 0, "config": {"foreign_key": "products.product_id"}},
                            {"name": "quantity", "type": "Integer", "null_pct": 0, "config": {"min": 1, "max": 5}},
                            {"name": "added_at", "type": "Datetime", "null_pct": 0, "config": {"start_date": "-30d", "end_date": "today"}}
                        ]
                    }
                ]
            }
        },
        # 6. Credit Risk
        {
            "name": "Finance - Credit Risk & Loan Applications",
            "description": "Applicant demographic data, credit scores, and loan evaluation requests.",
            "industry": "Finance",
            "schema_definition": {
                "tables": [
                    {
                        "name": "applicants",
                        "rows": 80,
                        "columns": [
                            {"name": "applicant_id", "type": "Customer ID", "null_pct": 0, "config": {"prefix": "APP-"}},
                            {"name": "name", "type": "Name", "null_pct": 0, "config": {}},
                            {"name": "email", "type": "Email", "null_pct": 0, "config": {}},
                            {"name": "avatar", "type": "Avatar URL", "null_pct": 0, "config": {}},
                            {"name": "age", "type": "Age", "null_pct": 0, "config": {"min": 21, "max": 68}},
                            {"name": "income", "type": "Currency", "null_pct": 0, "config": {"min": 24000.0, "max": 350000.0}},
                            {"name": "credit_score", "type": "Integer", "null_pct": 0, "config": {"min": 350, "max": 850}}
                        ]
                    },
                    {
                        "name": "loans",
                        "rows": 100,
                        "columns": [
                            {"name": "loan_id", "type": "UUID", "null_pct": 0, "config": {}},
                            {"name": "applicant_id", "type": "Customer ID", "null_pct": 0, "config": {"foreign_key": "applicants.applicant_id"}},
                            {"name": "loan_amount", "type": "Currency", "null_pct": 0, "config": {"min": 5000.0, "max": 120000.0}},
                            {"name": "term_months", "type": "Categories", "null_pct": 0, "config": {"categories": ["12", "24", "36", "48", "60"]}},
                            {"name": "interest_rate", "type": "Float", "null_pct": 0, "config": {"min": 0.04, "max": 0.22, "precision": 3}},
                            {"name": "status", "type": "Categories", "null_pct": 0, "config": {"categories": ["Approved", "Rejected", "Pending"], "weights": [0.65, 0.25, 0.1]}}
                        ]
                    }
                ]
            }
        },
        # 7. Logistics
        {
            "name": "Logistics - Warehouses & Shipments",
            "description": "Inventory hubs and distribution tracking feeds.",
            "industry": "Logistics",
            "schema_definition": {
                "tables": [
                    {
                        "name": "warehouses",
                        "rows": 15,
                        "columns": [
                            {"name": "warehouse_id", "type": "Customer ID", "null_pct": 0, "config": {"prefix": "WH-"}},
                            {"name": "city", "type": "City", "null_pct": 0, "config": {}},
                            {"name": "state", "type": "State", "null_pct": 0, "config": {}},
                            {"name": "capacity", "type": "Integer", "null_pct": 0, "config": {"min": 5000, "max": 45000}},
                            {"name": "warehouse_image", "type": "General Image URL", "null_pct": 0, "config": {}},
                            {"name": "manager_email", "type": "Email", "null_pct": 0, "config": {}}
                        ]
                    },
                    {
                        "name": "shipments",
                        "rows": 150,
                        "columns": [
                            {"name": "shipment_id", "type": "UUID", "null_pct": 0, "config": {}},
                            {"name": "origin_warehouse", "type": "Customer ID", "null_pct": 0, "config": {"foreign_key": "warehouses.warehouse_id"}},
                            {"name": "destination_city", "type": "City", "null_pct": 0, "config": {}},
                            {"name": "carrier", "type": "Categories", "null_pct": 0, "config": {"categories": ["FedEx", "UPS", "DHL", "USPS"]}},
                            {"name": "ship_date", "type": "Date", "null_pct": 0, "config": {"start_date": "-60d", "end_date": "today"}},
                            {"name": "delivery_days", "type": "Integer", "null_pct": 0, "config": {"min": 1, "max": 7}}
                        ]
                    }
                ]
            }
        },
        # 8. Technology
        {
            "name": "Technology - SaaS Organization Subscriptions",
            "description": "B2B client tenants and billing plans.",
            "industry": "Technology",
            "schema_definition": {
                "tables": [
                    {
                        "name": "organizations",
                        "rows": 40,
                        "columns": [
                            {"name": "org_id", "type": "Customer ID", "null_pct": 0, "config": {"prefix": "ORG-"}},
                            {"name": "org_name", "type": "Company Name", "null_pct": 0, "config": {}},
                            {"name": "logo", "type": "General Image URL", "null_pct": 0, "config": {}},
                            {"name": "billing_email", "type": "Email", "null_pct": 0, "config": {}},
                            {"name": "industry", "type": "Categories", "null_pct": 0, "config": {"categories": ["Healthcare", "Finance", "Education", "Retail", "Services"]}},
                            {"name": "created_at", "type": "Date", "null_pct": 0, "config": {"start_date": "-3y", "end_date": "-30d"}}
                        ]
                    },
                    {
                        "name": "subscriptions",
                        "rows": 40,
                        "columns": [
                            {"name": "sub_id", "type": "UUID", "null_pct": 0, "config": {}},
                            {"name": "org_id", "type": "Customer ID", "null_pct": 0, "config": {"foreign_key": "organizations.org_id"}},
                            {"name": "plan_name", "type": "Categories", "null_pct": 0, "config": {"categories": ["Free", "Growth", "Enterprise"]}},
                            {"name": "monthly_price", "type": "Currency", "null_pct": 0, "config": {"min": 0.0, "max": 999.0}},
                            {"name": "active", "type": "Boolean", "null_pct": 0, "config": {"true_percentage": 85}}
                        ]
                    }
                ]
            }
        },
        # 9. Education
        {
            "name": "Education - Student Enrollments & Grades",
            "description": "Academic records, enrolled courses, and grade distributions.",
            "industry": "Education",
            "schema_definition": {
                "tables": [
                    {
                        "name": "students",
                        "rows": 100,
                        "columns": [
                            {"name": "student_id", "type": "Employee ID", "null_pct": 0, "config": {"prefix": "STU-"}},
                            {"name": "first_name", "type": "First Name", "null_pct": 0, "config": {}},
                            {"name": "last_name", "type": "Last Name", "null_pct": 0, "config": {}},
                            {"name": "email", "type": "Email", "null_pct": 0, "config": {}},
                            {"name": "avatar", "type": "Avatar URL", "null_pct": 0, "config": {}},
                            {"name": "gpa", "type": "Float", "null_pct": 0, "config": {"min": 1.5, "max": 4.0, "precision": 2}}
                        ]
                    },
                    {
                        "name": "enrollments",
                        "rows": 250,
                        "columns": [
                            {"name": "enrollment_id", "type": "UUID", "null_pct": 0, "config": {}},
                            {"name": "student_id", "type": "Employee ID", "null_pct": 0, "config": {"foreign_key": "students.student_id"}},
                            {"name": "course_name", "type": "Course / Major", "null_pct": 0, "config": {}},
                            {"name": "semester", "type": "Categories", "null_pct": 0, "config": {"categories": ["Fall 2025", "Spring 2026", "Summer 2026"]}},
                            {"name": "grade", "type": "Categories", "null_pct": 0, "config": {"categories": ["A", "B", "C", "D", "F"], "weights": [0.35, 0.4, 0.17, 0.05, 0.03]}}
                        ]
                    }
                ]
            }
        },
        # 10. Environment (IoT)
        {
            "name": "Environment - IoT Sensor Telemetry",
            "description": "Climatology nodes, air quality metrics, and telemetry timestamp series.",
            "industry": "Environment",
            "schema_definition": {
                "tables": [
                    {
                        "name": "devices",
                        "rows": 20,
                        "columns": [
                            {"name": "device_id", "type": "Customer ID", "null_pct": 0, "config": {"prefix": "DEV-"}},
                            {"name": "location", "type": "City", "null_pct": 0, "config": {}},
                            {"name": "device_type", "type": "Categories", "null_pct": 0, "config": {"categories": ["Thermometer", "Hygrometer", "AirQualityMeter"]}},
                            {"name": "device_photo", "type": "General Image URL", "null_pct": 0, "config": {}},
                            {"name": "operator_email", "type": "Email", "null_pct": 0, "config": {}},
                            {"name": "installed_on", "type": "Date", "null_pct": 0, "config": {"start_date": "-2y", "end_date": "today"}}
                        ]
                    },
                    {
                        "name": "telemetry",
                        "rows": 400,
                        "columns": [
                            {"name": "reading_id", "type": "UUID", "null_pct": 0, "config": {}},
                            {"name": "device_id", "type": "Customer ID", "null_pct": 0, "config": {"foreign_key": "devices.device_id"}},
                            {"name": "temperature", "type": "Float", "null_pct": 0, "config": {"min": -15.0, "max": 48.0, "precision": 1}},
                            {"name": "humidity", "type": "Float", "null_pct": 0, "config": {"min": 5.0, "max": 99.0, "precision": 1}},
                            {"name": "aqi", "type": "Integer", "null_pct": 0, "config": {"min": 10, "max": 250}},
                            {"name": "recorded_at", "type": "Datetime", "null_pct": 0, "config": {"start_date": "-15d", "end_date": "today"}}
                        ]
                    }
                ]
            }
        },
        # 11. Social Media
        {
            "name": "Social Media - Content & Likes",
            "description": "User profile streams, posts, and post interaction metrics.",
            "industry": "Social Media",
            "schema_definition": {
                "tables": [
                    {
                        "name": "users",
                        "rows": 60,
                        "columns": [
                            {"name": "user_id", "type": "UUID", "null_pct": 0, "config": {}},
                            {"name": "username", "type": "Name", "null_pct": 0, "config": {}},
                            {"name": "email", "type": "Email", "null_pct": 0, "config": {}},
                            {"name": "avatar", "type": "Avatar URL", "null_pct": 0, "config": {}},
                            {"name": "joined_at", "type": "Date", "null_pct": 0, "config": {"start_date": "-4y", "end_date": "today"}},
                            {"name": "followers", "type": "Integer", "null_pct": 0, "config": {"min": 50, "max": 85000}}
                        ]
                    },
                    {
                        "name": "posts",
                        "rows": 180,
                        "columns": [
                            {"name": "post_id", "type": "UUID", "null_pct": 0, "config": {}},
                            {"name": "user_id", "type": "UUID", "null_pct": 0, "config": {"foreign_key": "users.user_id"}},
                            {"name": "content", "type": "Custom Text", "null_pct": 0, "config": {"sentences": 3}},
                            {"name": "post_image", "type": "General Image URL", "null_pct": 15, "config": {}},
                            {"name": "likes", "type": "Integer", "null_pct": 0, "config": {"min": 0, "max": 12000}},
                            {"name": "shares", "type": "Integer", "null_pct": 0, "config": {"min": 0, "max": 850}},
                            {"name": "created_at", "type": "Datetime", "null_pct": 0, "config": {"start_date": "-30d", "end_date": "today"}}
                        ]
                    }
                ]
            }
        },
        # 12. Real Estate
        {
            "name": "Real Estate - Property Listings",
            "description": "Property dimensions and catalog listings under agents.",
            "industry": "Real Estate",
            "schema_definition": {
                "tables": [
                    {
                        "name": "properties",
                        "rows": 40,
                        "columns": [
                            {"name": "property_id", "type": "UUID", "null_pct": 0, "config": {}},
                            {"name": "address", "type": "Address", "null_pct": 0, "config": {}},
                            {"name": "city", "type": "City", "null_pct": 0, "config": {}},
                            {"name": "state", "type": "State", "null_pct": 0, "config": {}},
                            {"name": "property_type", "type": "Categories", "null_pct": 0, "config": {"categories": ["Single Family", "Condo", "Townhouse", "Apartment"]}},
                            {"name": "beds", "type": "Integer", "null_pct": 0, "config": {"min": 1, "max": 5}},
                            {"name": "baths", "type": "Float", "null_pct": 0, "config": {"min": 1.0, "max": 4.0, "precision": 1}},
                            {"name": "property_image", "type": "Property Image URL", "null_pct": 0, "config": {}}
                        ]
                    },
                    {
                        "name": "listings",
                        "rows": 40,
                        "columns": [
                            {"name": "listing_id", "type": "UUID", "null_pct": 0, "config": {}},
                            {"name": "property_id", "type": "UUID", "null_pct": 0, "config": {"foreign_key": "properties.property_id"}},
                            {"name": "price", "type": "Currency", "null_pct": 0, "config": {"min": 120000.0, "max": 1800000.0}},
                            {"name": "agent_name", "type": "Name", "null_pct": 0, "config": {}},
                            {"name": "agent_email", "type": "Email", "null_pct": 0, "config": {}},
                            {"name": "status", "type": "Categories", "null_pct": 0, "config": {"categories": ["Active", "Pending", "Sold"]}},
                            {"name": "listed_date", "type": "Date", "null_pct": 0, "config": {"start_date": "-90d", "end_date": "today"}}
                        ]
                    }
                ]
            }
        },
        # 13. Food & Beverage
        {
            "name": "Food & Beverage - Restaurant Delivery",
            "description": "Establishment listings and client delivery order registers.",
            "industry": "Food & Beverage",
            "schema_definition": {
                "tables": [
                    {
                        "name": "restaurants",
                        "rows": 25,
                        "columns": [
                            {"name": "restaurant_id", "type": "Customer ID", "null_pct": 0, "config": {"prefix": "REST-"}},
                            {"name": "name", "type": "Company Name", "null_pct": 0, "config": {}},
                            {"name": "restaurant_image", "type": "Restaurant Image URL", "null_pct": 0, "config": {}},
                            {"name": "cuisine", "type": "Categories", "null_pct": 0, "config": {"categories": ["Italian", "Mexican", "Japanese", "American", "Indian", "Chinese"]}},
                            {"name": "city", "type": "City", "null_pct": 0, "config": {}},
                            {"name": "rating", "type": "Float", "null_pct": 0, "config": {"min": 3.0, "max": 5.0, "precision": 1}}
                        ]
                    },
                    {
                        "name": "orders",
                        "rows": 150,
                        "columns": [
                            {"name": "order_id", "type": "UUID", "null_pct": 0, "config": {}},
                            {"name": "restaurant_id", "type": "Customer ID", "null_pct": 0, "config": {"foreign_key": "restaurants.restaurant_id"}},
                            {"name": "customer_name", "type": "Name", "null_pct": 0, "config": {}},
                            {"name": "customer_email", "type": "Email", "null_pct": 0, "config": {}},
                            {"name": "order_value", "type": "Currency", "null_pct": 0, "config": {"min": 15.0, "max": 180.0}},
                            {"name": "delivery_fee", "type": "Currency", "null_pct": 0, "config": {"min": 0.0, "max": 12.0}},
                            {"name": "payment_method", "type": "Categories", "null_pct": 0, "config": {"categories": ["Credit Card", "Apple Pay", "Google Pay", "Cash"]}}
                        ]
                    }
                ]
            }
        },
        # 14. Legal
        {
            "name": "Legal - Attorney Caseloads",
            "description": "Attorney staffing profiles and client litigation cases.",
            "industry": "Legal",
            "schema_definition": {
                "tables": [
                    {
                        "name": "attorneys",
                        "rows": 20,
                        "columns": [
                            {"name": "attorney_id", "type": "Employee ID", "null_pct": 0, "config": {"prefix": "ATT-"}},
                            {"name": "name", "type": "Name", "null_pct": 0, "config": {}},
                            {"name": "email", "type": "Email", "null_pct": 0, "config": {}},
                            {"name": "avatar", "type": "Avatar URL", "null_pct": 0, "config": {}},
                            {"name": "specialty", "type": "Categories", "null_pct": 0, "config": {"categories": ["Corporate", "Criminal", "Family", "Intellectual Property", "Real Estate"]}},
                            {"name": "hourly_rate", "type": "Currency", "null_pct": 0, "config": {"min": 180.0, "max": 550.0}}
                        ]
                    },
                    {
                        "name": "cases",
                        "rows": 60,
                        "columns": [
                            {"name": "case_id", "type": "UUID", "null_pct": 0, "config": {}},
                            {"name": "attorney_id", "type": "Employee ID", "null_pct": 0, "config": {"foreign_key": "attorneys.attorney_id"}},
                            {"name": "case_type", "type": "Case Type", "null_pct": 0, "config": {}},
                            {"name": "status", "type": "Categories", "null_pct": 0, "config": {"categories": ["Open", "Closed", "On Hold"]}},
                            {"name": "filing_date", "type": "Date", "null_pct": 0, "config": {"start_date": "-3y", "end_date": "today"}}
                        ]
                    }
                ]
            }
        },
        # 15. Automotive
        {
            "name": "Automotive - Telematics Logs",
            "description": "Connected vehicle hardware specs and GPS/telematics sensor tracking series.",
            "industry": "Automotive",
            "schema_definition": {
                "tables": [
                    {
                        "name": "vehicles",
                        "rows": 30,
                        "columns": [
                            {"name": "vehicle_id", "type": "UUID", "null_pct": 0, "config": {}},
                            {"name": "vin", "type": "Customer ID", "null_pct": 0, "config": {"prefix": "1HG-"}},
                            {"name": "owner_email", "type": "Email", "null_pct": 0, "config": {}},
                            {"name": "vehicle_photo", "type": "General Image URL", "null_pct": 0, "config": {}},
                            {"name": "make", "type": "Categories", "null_pct": 0, "config": {"categories": ["Tesla", "Toyota", "Ford", "BMW", "Honda"]}},
                            {"name": "model", "type": "Categories", "null_pct": 0, "config": {"categories": ["Model 3", "Camry", "F-150", "3-Series", "Civic"]}},
                            {"name": "year", "type": "Integer", "null_pct": 0, "config": {"min": 2018, "max": 2026}}
                        ]
                    },
                    {
                        "name": "trip_logs",
                        "rows": 300,
                        "columns": [
                            {"name": "log_id", "type": "UUID", "null_pct": 0, "config": {}},
                            {"name": "vehicle_id", "type": "UUID", "null_pct": 0, "config": {"foreign_key": "vehicles.vehicle_id"}},
                            {"name": "speed_kmh", "type": "Integer", "null_pct": 0, "config": {"min": 0, "max": 140}},
                            {"name": "fuel_level_pct", "type": "Float", "null_pct": 0, "config": {"min": 0.0, "max": 100.0, "precision": 1}},
                            {"name": "duration_minutes", "type": "Integer", "null_pct": 0, "config": {"min": 5, "max": 300}},
                            {"name": "timestamp", "type": "Datetime", "null_pct": 0, "config": {"start_date": "-30d", "end_date": "today"}}
                        ]
                    }
                ]
            }
        }
    ]

    for p in industry_presets:
        existing = db.query(Template).filter(Template.name == p["name"], Template.is_system == True).first()
        if not existing:
            temp = Template(
                name=p["name"],
                description=p["description"],
                industry=p["industry"],
                schema_definition=p["schema_definition"],
                is_system=True
            )
            db.add(temp)
    db.commit()

@app.on_event("startup")
def startup_event():
    # Run migrations/table creation
    init_db()
    
    # Pre-populate database templates
    db = next(get_db())
    try:
        seed_templates(db)
    finally:
        db.close()

    # Seed Pro plan user for Karankumarsk14@gmail.com
    db = next(get_db())
    try:
        pro_email = "Karankumarsk14@gmail.com"
        user = db.query(User).filter(User.email == pro_email).first()
        if not user:
            user = User(
                id=str(uuid.uuid4()),
                email=pro_email,
                plan="pro",
                max_rows_limit=settings.PRO_LIMIT,
                max_api_limit=settings.PRO_API_LIMIT
            )
            db.add(user)
            db.commit()
            print(f"Startup Seed: Created Pro user {pro_email}")
        elif user.plan != "pro":
            user.plan = "pro"
            user.max_rows_limit = settings.PRO_LIMIT
            user.max_api_limit = settings.PRO_API_LIMIT
            db.commit()
            print(f"Startup Seed: Upgraded user {pro_email} to Pro")
    except Exception as e:
        print(f"Startup Seed Error: {str(e)}")
    finally:
        db.close()

# --- Auth Routes ---

@app.post("/api/auth/register", response_model=Token)
def register(user_auth: UserAuth, db: Session = Depends(get_db)):
    # Check if user email already exists
    existing = db.query(User).filter(User.email == user_auth.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email is already registered")

    user_id = str(uuid.uuid4())
    # Note: we store a simple hashed password locally if using the fallback.
    # In full Supabase integration, Supabase Auth holds the password, and we decode Supabase JWTs.
    # We use auth.py helpers to generate local tokens.
    hashed_pwd = get_password_hash(user_auth.password)
    
    # We create the user. Since this is local dev, we store the hash in metadata or custom field,
    # but since our models.py User doesn't have a hashed_password field, let's store it or just allow registration.
    # To be clean, let's create the user in local db.
    new_user = User(
        id=user_id,
        email=user_auth.email,
        plan="free",
        max_rows_limit=settings.FREE_LIMIT
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Issue access token
    token = create_access_token(data={"sub": new_user.id, "email": new_user.email})
    return Token(
        access_token=token,
        token_type="bearer",
        email=new_user.email,
        plan=new_user.plan,
        max_rows_limit=new_user.max_rows_limit
    )

@app.post("/api/auth/login", response_model=Token)
def login(user_auth: UserAuth, db: Session = Depends(get_db)):
    # Standard developer login mockup or queries user email
    user = db.query(User).filter(User.email == user_auth.email).first()
    if not user:
        # For ease of dev, if the user doesn't exist, we dynamically register them!
        # This makes the app instantly runnable without throwing annoying credential errors.
        user_id = str(uuid.uuid4())
        user = User(
            id=user_id,
            email=user_auth.email,
            plan="free",
            max_rows_limit=settings.FREE_LIMIT
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    # Issue token
    token = create_access_token(data={"sub": user.id, "email": user.email})
    return Token(
        access_token=token,
        token_type="bearer",
        email=user.email,
        plan=user.plan,
        max_rows_limit=user.max_rows_limit
    )

# --- User Routes ---

@app.get("/api/user/profile", response_model=UserProfileResponse)
def get_profile(current_user: User = Depends(get_current_user)):
    return current_user

@app.get("/api/user/usage", response_model=UsageAnalytics)
def get_usage(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    recent_db = db.query(Dataset).filter(Dataset.user_id == current_user.id).order_by(Dataset.created_at.desc()).limit(5).all()
    total_datasets = db.query(Dataset).filter(Dataset.user_id == current_user.id).count()

    # Formats count
    formats = {"CSV": 0, "XLSX": 0, "JSON": 0, "SQL": 0, "PARQUET": 0}
    for d in db.query(Dataset.file_format).filter(Dataset.user_id == current_user.id).all():
        fmt = d[0].upper()
        if fmt in formats:
            formats[fmt] += 1

    return UsageAnalytics(
        rows_generated=current_user.rows_generated_this_month,
        rows_limit=current_user.max_rows_limit,
        plan=current_user.plan,
        total_datasets=total_datasets,
        recent_activity=recent_db,
        generation_by_format=formats,
        api_calls_made=current_user.monthly_api_calls,
        api_calls_limit=current_user.max_api_limit
    )

# --- AI Schema Route ---

@app.post("/api/ai/schema")
def get_ai_schema(req: PromptRequest, current_user: User = Depends(get_current_user)):
    # Calls Gemini or offline parser fallback
    schema = infer_schema_with_ai(req.prompt)
    return schema

# --- Generation Route ---

@app.post("/api/generate")
def generate_dataset(
    req: DatasetGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Rate Limit & Quota Checks
    if current_user.monthly_api_calls >= current_user.max_api_limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"API Limit Exceeded. Your plan allows up to {current_user.max_api_limit} API queries monthly."
        )
        
    if current_user.rows_generated_this_month + req.rows > current_user.max_rows_limit:
        raise HTTPException(
            status_code=400,
            detail=f"Generation quota exceeded. You have {current_user.max_rows_limit - current_user.rows_generated_this_month} rows remaining, but requested {req.rows}."
        )

    # Increment API call counts
    current_user.monthly_api_calls += 1

    # 2. Version Tracking
    version = 1
    if req.parent_id:
        parent_dataset = db.query(Dataset).filter(Dataset.id == req.parent_id).first()
        if parent_dataset:
            version = parent_dataset.version + 1

    dataset_id = str(uuid.uuid4())

    # 3. Choose Background vs Sync Execution
    # If the request is for more than 10,000 rows, we run in background using Celery
    is_async_run = req.rows > 10000
    
    if is_async_run:
        try:
            # Dynamically import background task to prevent circular imports
            from backend.tasks import generate_dataset_background
            
            # Save empty dataset record to DB first
            db_dataset = Dataset(
                id=dataset_id,
                name=req.name,
                schema_definition=req.dict(),
                row_count=req.rows,
                file_format=req.export_format,
                download_url=None, # will be populated by worker
                user_id=current_user.id,
                version=version,
                parent_id=req.parent_id,
                quality_score=0, # loading indicator
                quality_report={"status": "generating", "message": "Dataset is generating in the background."}
            )
            current_user.rows_generated_this_month += req.rows
            db.add(db_dataset)
            db.commit()
            
            # Enqueue Celery task
            generate_dataset_background.delay(req.dict(), dataset_id, current_user.id)
            
            return {
                "dataset": {
                    "id": db_dataset.id,
                    "name": db_dataset.name,
                    "row_count": db_dataset.row_count,
                    "file_format": db_dataset.file_format,
                    "download_url": None,
                    "created_at": db_dataset.created_at,
                    "quality_score": 0,
                    "version": db_dataset.version,
                    "status": "processing"
                },
                "preview": {}
            }
        except Exception as e:
            # Celery/Redis down: Log warning and fallback to immediate synchronous execution!
            print(f"Async Celery enqueuing failed: {str(e)}. Falling back to sync runner.")
            db.rollback()

    # 4. Synchronous relational data generation
    try:
        generator = RelationalDatasetGenerator(locale=req.locale)
        # Parse schema from tables list
        tables_config = {
            "tables": [
                {
                    "name": t.name,
                    "rows": t.rows,
                    "columns": [c.dict() for c in t.columns]
                } for t in req.tables
            ]
        }
        
        # Generate raw tables
        dataset_data = generator.generate_relational_dataset(
            tables_config=tables_config,
            noise_level=req.noise_level,
            global_null_pct=req.global_null_pct
        )
        
        # Run quality report
        quality_report = analyze_dataset_quality(dataset_data, tables_config["tables"])
        
        # Export file
        primary_table_name = req.tables[0].name
        primary_data = dataset_data.get(primary_table_name, [])
        
        export_bytes = b""
        if len(req.tables) > 1 and req.export_format.upper() == "XLSX":
            import io
            import pandas as pd
            output = io.BytesIO()
            with pd.ExcelWriter(output, engine="openpyxl") as writer:
                for t_name, t_data in dataset_data.items():
                    pd.DataFrame(t_data).to_excel(writer, index=False, sheet_name=t_name)
            output.seek(0)
            export_bytes = output.getvalue()
        elif len(req.tables) > 1 and req.export_format.upper() == "SQL":
            lines = []
            for t_name, t_data in dataset_data.items():
                lines.append(export_data(t_data, "SQL", t_name).decode("utf-8"))
            export_bytes = "\n\n".join(lines).encode("utf-8")
        elif len(req.tables) > 1 and req.export_format.upper() == "JSON":
            import json
            export_bytes = json.dumps(dataset_data, indent=2).encode("utf-8")
        else:
            export_bytes = export_data(primary_data, req.export_format, primary_table_name)
        
        # Write to local file cache
        ext = req.export_format.lower()
        if ext == "excel":
            ext = "xlsx"
        filename = f"{dataset_id}.{ext}"
        filepath = os.path.join(settings.STORAGE_DIR, filename)
        
        with open(filepath, "wb") as f:
            f.write(export_bytes)
            
        # Save metadata to database
        db_dataset = Dataset(
            id=dataset_id,
            name=req.name,
            schema_definition=req.dict(),
            row_count=req.rows,
            file_format=req.export_format,
            download_url=f"/api/datasets/{dataset_id}/download",
            user_id=current_user.id,
            version=version,
            parent_id=req.parent_id,
            quality_score=quality_report["overall"],
            quality_report=quality_report
        )
        
        current_user.rows_generated_this_month += req.rows
        
        log = AuditLog(
            user_id=current_user.id,
            action="GENERATE_DATASET",
            details=f"Generated dataset {req.name} with {req.rows} rows. Score: {quality_report['overall']}."
        )
        
        db.add(db_dataset)
        db.add(log)
        db.commit()
        db.refresh(db_dataset)
        
        preview_data = {}
        for t_name, t_data in dataset_data.items():
            preview_data[t_name] = t_data[:15]

        return {
            "dataset": {
                "id": db_dataset.id,
                "name": db_dataset.name,
                "row_count": db_dataset.row_count,
                "file_format": db_dataset.file_format,
                "download_url": db_dataset.download_url,
                "quality_score": db_dataset.quality_score,
                "quality_report": db_dataset.quality_report,
                "version": db_dataset.version,
                "parent_id": db_dataset.parent_id,
                "created_at": db_dataset.created_at
            },
            "preview": preview_data
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")

# --- Dataset History Routes ---

@app.get("/api/datasets", response_model=List[DatasetResponse])
def get_datasets(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Dataset).filter(Dataset.user_id == current_user.id).order_by(Dataset.created_at.desc()).all()

@app.get("/api/datasets/{dataset_id}", response_model=DatasetResponse)
def get_dataset(dataset_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id, Dataset.user_id == current_user.id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return dataset

@app.delete("/api/datasets/{dataset_id}")
def delete_dataset(dataset_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id, Dataset.user_id == current_user.id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    # Remove file from exports
    ext = dataset.file_format.lower()
    if ext == "excel":
        ext = "xlsx"
    filename = f"{dataset.id}.{ext}"
    filepath = os.path.join(settings.STORAGE_DIR, filename)
    if os.path.exists(filepath):
        try:
            os.remove(filepath)
        except Exception:
            pass

    db.delete(dataset)
    db.commit()
    return {"detail": "Dataset deleted successfully"}

@app.get("/api/datasets/{dataset_id}/download")
def download_dataset(
    dataset_id: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Downloads file. Can authenticate either by standard Auth cookies/headers OR via API Key query param.
    """
    # 1. Try Bearer token from header
    user = None
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        from backend.auth import decode_token
        payload = decode_token(token)
        if payload:
            user_id = payload.get("sub")
            if user_id:
                user = db.query(User).filter(User.id == user_id).first()
                
    # 2. Try API Key query param if no Bearer token or validation failed
    if not user:
        api_key = request.query_params.get("api_key")
        if api_key:
            hashed_key = hashlib.sha256(api_key.encode()).hexdigest()
            api_key_record = db.query(APIKey).filter(APIKey.key_hash == hashed_key, APIKey.is_active == True).first()
            if api_key_record:
                user = db.query(User).filter(User.id == api_key_record.user_id).first()
            else:
                raise HTTPException(status_code=401, detail="Invalid or inactive API Key")
        else:
            raise HTTPException(status_code=401, detail="Authentication credentials (Bearer token or API Key) are missing")
            
    if not user:
        raise HTTPException(status_code=401, detail="User not found or credentials invalid")

    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    # Authorize: check if user is the owner OR if dataset is public
    if dataset.user_id != user.id and not dataset.is_public:
        raise HTTPException(status_code=403, detail="Not authorized to download this dataset")

    ext = dataset.file_format.lower()
    if ext == "excel":
        ext = "xlsx"
    filename = f"{dataset.id}.{ext}"
    filepath = os.path.join(settings.STORAGE_DIR, filename)
    
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Dataset file not found on disk")
        
    return FileResponse(
        path=filepath,
        filename=f"{dataset.name.replace(' ', '_')}.{ext}",
        media_type="application/octet-stream"
    )

# --- Templates Routes ---

@app.get("/api/templates", response_model=List[TemplateResponse])
def get_templates(db: Session = Depends(get_db)):
    return db.query(Template).order_by(Template.created_at.desc()).all()

@app.post("/api/templates", response_model=TemplateResponse)
def save_template(
    req: TemplateCreate,
    db: Session = Depends(get_db)
):
    temp = Template(
        name=req.name,
        description=req.description,
        industry=req.industry,
        schema_definition=req.schema_definition,
        is_system=False
    )
    db.add(temp)
    db.commit()
    db.refresh(temp)
    return temp

# --- API Keys Routes ---

@app.post("/api/api-keys", response_model=APIKeyResponse)
def create_api_key(
    req: APIKeyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    raw_key = f"sds_live_{uuid.uuid4().hex}"
    hashed_key = hashlib.sha256(raw_key.encode()).hexdigest()
    masked = f"sds_live_...{raw_key[-6:]}"

    db_key = APIKey(
        name=req.name,
        key_hash=hashed_key,
        masked_key=masked,
        user_id=current_user.id
    )
    db.add(db_key)
    db.commit()
    db.refresh(db_key)

    # Return key details, including the RAW key (user will only see this once)
    resp = APIKeyResponse.from_orm(db_key)
    # Inject raw key into response temporarily
    resp_dict = resp.dict()
    resp_dict["raw_key"] = raw_key
    return resp_dict

@app.get("/api/api-keys", response_model=List[APIKeyResponse])
def list_api_keys(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(APIKey).filter(APIKey.user_id == current_user.id).all()

@app.delete("/api/api-keys/{key_id}")
def revoke_api_key(key_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    key = db.query(APIKey).filter(APIKey.id == key_id, APIKey.user_id == current_user.id).first()
    if not key:
        raise HTTPException(status_code=404, detail="API Key not found")
    
    db.delete(key)
    db.commit()
    return {"detail": "API Key revoked"}

# --- Admin Panel Route ---

def is_admin_user(email: str) -> bool:
    email_clean = email.lower()
    return (
        email_clean == "demo@syntheticstudio.ai"
        or "admin" in email_clean
        or email_clean == "karankumarsk14@gmail.com"
        or email_clean == "karan.kumar@gmail.com"
    )

@app.get("/api/admin/stats")
def get_admin_stats(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not is_admin_user(current_user.email):
        raise HTTPException(status_code=403, detail="Not authorized as administrator")
        
    total_users = db.query(User).count()
    total_datasets = db.query(Dataset).count()
    total_rows = db.query(Dataset.row_count).all()
    sum_rows = sum([r[0] for r in total_rows])

    # Plans counts
    plans = {"free": 0, "starter": 0, "pro": 0, "enterprise": 0}
    for u in db.query(User.plan).all():
        if u[0] in plans:
            plans[u[0]] += 1

    return {
        "total_users": total_users,
        "total_datasets": total_datasets,
        "total_rows_generated": sum_rows,
        "plan_distribution": plans,
        "system_status": "healthy"
    }

@app.get("/api/admin/users")
def get_admin_users(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not is_admin_user(current_user.email):
        raise HTTPException(status_code=403, detail="Not authorized as administrator")
        
    users = db.query(User).order_by(User.created_at.desc()).all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "plan": u.plan,
            "rows_generated_this_month": u.rows_generated_this_month,
            "max_rows_limit": u.max_rows_limit,
            "monthly_api_calls": u.monthly_api_calls,
            "max_api_limit": u.max_api_limit,
            "created_at": u.created_at.isoformat() if u.created_at else None
        }
        for u in users
    ]

# --- Saved Prompts Library Routes ---

@app.get("/api/prompts", response_model=List[SavedPromptResponse])
def get_saved_prompts(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(PromptTemplate).filter(PromptTemplate.user_id == current_user.id).order_by(PromptTemplate.created_at.desc()).all()

@app.post("/api/prompts", response_model=SavedPromptResponse)
def save_prompt(req: SavedPromptCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_prompt = PromptTemplate(
        title=req.title,
        prompt_text=req.prompt_text,
        user_id=current_user.id
    )
    db.add(db_prompt)
    db.commit()
    db.refresh(db_prompt)
    return db_prompt

@app.delete("/api/prompts/{prompt_id}")
def delete_prompt(prompt_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    prompt = db.query(PromptTemplate).filter(PromptTemplate.id == prompt_id, PromptTemplate.user_id == current_user.id).first()
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")
    db.delete(prompt)
    db.commit()
    return {"detail": "Prompt deleted"}

@app.post("/api/prompts/{prompt_id}/favorite", response_model=SavedPromptResponse)
def toggle_favorite_prompt(prompt_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    prompt = db.query(PromptTemplate).filter(PromptTemplate.id == prompt_id, PromptTemplate.user_id == current_user.id).first()
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")
    prompt.is_favorite = not prompt.is_favorite
    db.commit()
    db.refresh(prompt)
    return prompt

@app.post("/api/prompts/{prompt_id}/duplicate", response_model=SavedPromptResponse)
def duplicate_prompt(prompt_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    prompt = db.query(PromptTemplate).filter(PromptTemplate.id == prompt_id, PromptTemplate.user_id == current_user.id).first()
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")
    
    dup = PromptTemplate(
        title=f"Copy of {prompt.title}",
        prompt_text=prompt.prompt_text,
        user_id=current_user.id
    )
    db.add(dup)
    db.commit()
    db.refresh(dup)
    return dup

# --- Dataset Marketplace Routes ---

@app.get("/api/marketplace", response_model=List[DatasetResponse])
def get_marketplace_datasets(db: Session = Depends(get_db)):
    return db.query(Dataset).filter(Dataset.is_public == True).order_by(Dataset.downloads.desc()).all()

@app.post("/api/marketplace/publish", response_model=DatasetResponse)
def publish_to_marketplace(req: MarketplacePublishRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    dataset = db.query(Dataset).filter(Dataset.id == req.dataset_id, Dataset.user_id == current_user.id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found or unauthorized")
    
    dataset.is_public = True
    dataset.price = req.price
    # Store description inside schema_definition dict as metadata for convenience
    schema_copy = dict(dataset.schema_definition)
    schema_copy["description"] = req.description or "Premium synthetic dataset."
    dataset.schema_definition = schema_copy
    
    db.commit()
    db.refresh(dataset)
    return dataset

@app.post("/api/marketplace/purchase")
def purchase_marketplace_dataset(req: MarketplacePurchaseRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    dataset = db.query(Dataset).filter(Dataset.id == req.dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    # Prevent buying self
    if dataset.user_id == current_user.id:
        return {"detail": "You already own this dataset"}
        
    # Check if already purchased
    existing = db.query(MarketplacePurchase).filter(
        MarketplacePurchase.user_id == current_user.id,
        MarketplacePurchase.dataset_id == req.dataset_id
    ).first()
    if existing:
        return {"detail": "Dataset already purchased"}

    # Mock purchase transaction log
    purchase = MarketplacePurchase(
        user_id=current_user.id,
        dataset_id=req.dataset_id,
        amount_paid=dataset.price
    )
    
    # Increment download counts
    dataset.downloads += 1
    
    db.add(purchase)
    db.commit()
    return {"detail": "Dataset purchased successfully", "download_url": dataset.download_url}

# --- Conversational AI Dataset Assistant Route ---

@app.post("/api/datasets/{dataset_id}/assistant", response_model=ChatResponse)
def query_dataset_assistant(
    dataset_id: str,
    req: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    # Read generated local file cache content to build summary
    ext = dataset.file_format.lower()
    if ext == "excel":
        ext = "xlsx"
    filename = f"{dataset.id}.{ext}"
    filepath = os.path.join(settings.STORAGE_DIR, filename)
    
    # Check if cache exists
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="File cached data not found. Regenerate to analyze.")

    # Read records depending on format
    try:
        if ext == "csv":
            df = pd.read_csv(filepath)
            data = df.to_dict(orient="records")
        elif ext == "json":
            with open(filepath, "r") as f:
                data = json.load(f)
                if isinstance(data, dict):
                    # Multi table dictionary
                    pass
                else:
                    data = {dataset.name: data}
        elif ext == "xlsx":
            df = pd.read_excel(filepath)
            data = df.to_dict(orient="records")
        elif ext == "parquet":
            df = pd.read_parquet(filepath)
            data = df.to_dict(orient="records")
        else:
            # SQL fallback, just parse schema
            data = {}

        # Wrap single tables
        if not isinstance(data, dict):
            data = {dataset.name: data}

        response_text = answer_dataset_query(data, dataset.schema_definition, req.message)
        return ChatResponse(response=response_text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Assistant query failed: {str(e)}")

# --- Data Drift Simulator Route ---

@app.post("/api/datasets/simulate-drift")
def simulate_drift_route(
    req: DriftSimulationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    dataset = db.query(Dataset).filter(Dataset.id == req.dataset_id, Dataset.user_id == current_user.id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    try:
        # Run drift simulator
        drift_data = simulate_data_drift(
            tables_config=dataset.schema_definition,
            locale=dataset.schema_definition.get("locale", "en_US"),
            months=req.months
        )
        
        # Cache generated files for each simulated month
        simulated_files = {}
        for month, dataset_m in drift_data["datasets"].items():
            primary_table = list(dataset_m.keys())[0]
            month_bytes = export_data(dataset_m[primary_table], dataset.file_format, primary_table)
            
            # Save month file
            m_id = str(uuid.uuid4())
            ext = dataset.file_format.lower()
            if ext == "excel":
                ext = "xlsx"
            filename = f"{m_id}.{ext}"
            filepath = os.path.join(settings.STORAGE_DIR, filename)
            
            with open(filepath, "wb") as f:
                f.write(month_bytes)
                
            simulated_files[month] = f"/api/datasets/{m_id}/download"
            
        return {
            "months": drift_data["months"],
            "drift_metrics": drift_data["drift_metrics"],
            "download_urls": simulated_files
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Drift simulation failed: {str(e)}")

# --- AI Training Data Generator Routes ---

@app.post("/api/ai/training-data")
def generate_ai_training_data(
    task_type: str = Query(...), # Instruction Tuning, Question Answering, RAG Datasets, Classification Datasets
    domain: str = Query(...), # Healthcare, Legal, Finance, Retail, Education, Logistics, Customer Support
    rows: int = Query(10),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Check rate limit
    if current_user.rows_generated_this_month + rows > current_user.max_rows_limit:
        raise HTTPException(status_code=400, detail="Row quota limit exceeded.")
        
    try:
        records = generate_ai_training_data_with_ai(task_type, domain, rows)
        
        # Save generated dataset metadata
        dataset_id = str(uuid.uuid4())
        export_bytes = json.dumps(records, indent=2).encode("utf-8")
        
        filename = f"{dataset_id}.json"
        filepath = os.path.join(settings.STORAGE_DIR, filename)
        with open(filepath, "wb") as f:
            f.write(export_bytes)
            
        db_dataset = Dataset(
            id=dataset_id,
            name=f"AI Training Data ({domain} - {task_type})",
            schema_definition={"task_type": task_type, "domain": domain, "rows": rows},
            row_count=rows,
            file_format="JSON",
            download_url=f"/api/datasets/{dataset_id}/download",
            user_id=current_user.id
        )
        current_user.rows_generated_this_month += rows
        db.add(db_dataset)
        db.commit()
        db.refresh(db_dataset)
        
        return {
            "dataset": db_dataset,
            "preview": records[:15]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ai/conversation")
def generate_conversations(
    industry: str = Query(...), # Healthcare, Sales, Teacher-Student, Customer Support, Bank Agent
    length: int = Query(6),
    tone: str = Query("Professional"), # Empathetic, Professional, Direct, Angry, Friendly
    language: str = Query("English"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        turns = generate_conversation_with_ai(industry, length, tone, language)
        
        dataset_id = str(uuid.uuid4())
        # Conversation outputs JSONL
        lines = []
        for turn in turns:
            lines.append(json.dumps(turn))
        export_bytes = "\n".join(lines).encode("utf-8")
        
        filename = f"{dataset_id}.jsonl"
        filepath = os.path.join(settings.STORAGE_DIR, filename)
        with open(filepath, "wb") as f:
            f.write(export_bytes)
            
        db_dataset = Dataset(
            id=dataset_id,
            name=f"Conversation ({industry} - {tone})",
            schema_definition={"industry": industry, "length": length, "tone": tone, "language": language},
            row_count=1, # single conversation unit
            file_format="JSONL",
            download_url=f"/api/datasets/{dataset_id}/download",
            user_id=current_user.id
        )
        current_user.rows_generated_this_month += 1
        db.add(db_dataset)
        db.commit()
        db.refresh(db_dataset)
        
        return {
            "dataset": db_dataset,
            "preview": turns
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- DUP EXTRA REST API ENDPOINTS FOR COMPLIANCE ---

@app.post("/api/generate-from-template")
def generate_from_template(
    template_id: str = Query(...),
    rows: int = Query(100),
    export_format: str = Query("CSV"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    template = db.query(Template).filter(Template.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
        
    tpl_schema = dict(template.schema_definition)
    if "tables" in tpl_schema and len(tpl_schema["tables"]) > 0:
        for t in tpl_schema["tables"]:
            t["rows"] = rows
            
    # Compose columns definitions Pydantic objects list
    tables_list = []
    for t in tpl_schema["tables"]:
        cols_list = []
        for c in t["columns"]:
            cols_list.append(TableColumn(
                name=c["name"],
                type=c["type"],
                null_pct=c.get("null_pct", 0.0),
                config=c.get("config", {})
            ))
        tables_list.append(TableDefinition(
            name=t["name"],
            rows=t["rows"],
            columns=cols_list
        ))

    req_payload = DatasetGenerateRequest(
        name=f"Template {template.name}",
        rows=rows,
        locale=tpl_schema.get("locale", "en_US"),
        tables=tables_list,
        noise_level="perfect",
        global_null_pct=0.0,
        export_format=export_format
    )
    return generate_dataset(req_payload, current_user, db)

@app.get("/api/download/{dataset_id}")
def download_dataset_alt(
    dataset_id: str,
    request: Request,
    db: Session = Depends(get_db)
):
    # Delegate directly to download_dataset
    return download_dataset(dataset_id, request, db)

@app.get("/api/usage", response_model=UsageAnalytics)
def get_usage_alt(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return get_usage(current_user, db)


# ─────────────────────────────────────────────────────────────
# BILLING / RAZORPAY ROUTES
# ─────────────────────────────────────────────────────────────

# Plan metadata returned to the frontend
PLAN_CATALOGUE = [
    {
        "id": "free",
        "name": "Free",
        "price_inr": 0,
        "price_paise": 0,
        "rows_per_month": 5_000,
        "api_calls": 100,
        "features": [
            "5,000 rows / month",
            "CSV export only",
            "AI schema inference",
            "Basic templates",
            "Community support",
        ],
        "color": "slate",
        "badge": "",
    },
    {
        "id": "starter",
        "name": "Starter",
        "price_inr": 499,
        "price_paise": 49_900,
        "rows_per_month": 100_000,
        "api_calls": 1_000,
        "features": [
            "1,00,000 rows / month",
            "All export formats (CSV, XLSX, JSON, SQL, Parquet)",
            "AI Prompt Generator",
            "Training data synthesizer",
            "Saved prompts library",
            "Email support",
        ],
        "color": "indigo",
        "badge": "Most Popular",
    },
    {
        "id": "pro",
        "name": "Pro",
        "price_inr": 1499,
        "price_paise": 149_900,
        "rows_per_month": 1_000_000,
        "api_calls": 10_000,
        "features": [
            "10,00,000 rows / month",
            "All Starter features",
            "Data drift simulator",
            "Relationship designer",
            "Dataset marketplace publish",
            "Priority support",
        ],
        "color": "violet",
        "badge": "Best Value",
    },
    {
        "id": "enterprise",
        "name": "Enterprise",
        "price_inr": 4999,
        "price_paise": 499_900,
        "rows_per_month": 99_999_999,
        "api_calls": 999_999,
        "features": [
            "Unlimited rows",
            "All Pro features",
            "Team workspaces",
            "Custom data types",
            "Dedicated account manager",
            "SLA & uptime guarantee",
        ],
        "color": "amber",
        "badge": "Enterprise",
    },
]


@app.get("/api/billing/plans")
def get_plans():
    """Return all available subscription plans with pricing."""
    return {"plans": PLAN_CATALOGUE}


@app.post("/api/billing/create-order")
def create_razorpay_order(
    plan_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a Razorpay order for the given plan upgrade."""
    try:
        import razorpay
    except ImportError:
        raise HTTPException(status_code=500, detail="Razorpay SDK not installed. Run: pip install razorpay")

    plan_id = plan_id.lower()
    if plan_id not in settings.PLAN_PRICES:
        raise HTTPException(status_code=400, detail=f"Invalid plan '{plan_id}'. Choose: starter, pro, enterprise")

    amount_paise = settings.PLAN_PRICES[plan_id]

    # Create Razorpay client
    client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))

    try:
        order = client.order.create({
            "amount": amount_paise,
            "currency": "INR",
            "payment_capture": 1,
            "notes": {
                "user_id": current_user.id,
                "user_email": current_user.email,
                "plan": plan_id,
            }
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Razorpay order creation failed: {str(e)}")

    # Persist the order in DB
    payment = Payment(
        user_id=current_user.id,
        razorpay_order_id=order["id"],
        plan=plan_id,
        amount_paise=amount_paise,
        status="created"
    )
    db.add(payment)
    db.commit()

    return {
        "order_id": order["id"],
        "amount": amount_paise,
        "currency": "INR",
        "key_id": settings.RAZORPAY_KEY_ID,
        "plan": plan_id,
        "user_email": current_user.email,
    }


@app.post("/api/billing/verify-payment")
def verify_razorpay_payment(
    payload: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Verify Razorpay payment signature and upgrade the user plan."""
    try:
        import razorpay
        import hmac, hashlib
    except ImportError:
        raise HTTPException(status_code=500, detail="Razorpay SDK not installed.")

    razorpay_order_id   = payload.get("razorpay_order_id")
    razorpay_payment_id = payload.get("razorpay_payment_id")
    razorpay_signature  = payload.get("razorpay_signature")

    if not all([razorpay_order_id, razorpay_payment_id, razorpay_signature]):
        raise HTTPException(status_code=400, detail="Missing payment verification fields.")

    # Verify HMAC-SHA256 signature
    body = f"{razorpay_order_id}|{razorpay_payment_id}"
    expected_signature = hmac.new(
        settings.RAZORPAY_KEY_SECRET.encode("utf-8"),
        body.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()

    if expected_signature != razorpay_signature:
        raise HTTPException(status_code=400, detail="Payment signature verification failed.")

    # Look up our payment record
    payment = db.query(Payment).filter(
        Payment.razorpay_order_id == razorpay_order_id,
        Payment.user_id == current_user.id
    ).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment order not found.")

    # Mark payment as paid
    payment.razorpay_payment_id = razorpay_payment_id
    payment.razorpay_signature  = razorpay_signature
    payment.status  = "paid"
    payment.paid_at = datetime.datetime.utcnow()

    # Upgrade user plan and limits
    plan = payment.plan
    current_user.plan = plan
    if plan == "starter":
        current_user.max_rows_limit = settings.STARTER_LIMIT
        current_user.max_api_limit  = settings.STARTER_API_LIMIT
    elif plan == "pro":
        current_user.max_rows_limit = settings.PRO_LIMIT
        current_user.max_api_limit  = settings.PRO_API_LIMIT
    elif plan == "enterprise":
        current_user.max_rows_limit = settings.ENTERPRISE_LIMIT
        current_user.max_api_limit  = settings.ENTERPRISE_API_LIMIT

    # Audit log
    log = AuditLog(
        user_id=current_user.id,
        action="PLAN_UPGRADE",
        details=f"User upgraded to '{plan}' plan via Razorpay. Payment ID: {razorpay_payment_id}"
    )
    db.add(log)
    db.commit()

    return {
        "success": True,
        "plan": plan,
        "max_rows_limit": current_user.max_rows_limit,
        "max_api_limit": current_user.max_api_limit,
        "message": f"Successfully upgraded to {plan.capitalize()} plan!",
    }


@app.get("/api/billing/history")
def get_payment_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Return all payment records for the current user."""
    payments = db.query(Payment).filter(
        Payment.user_id == current_user.id
    ).order_by(Payment.created_at.desc()).all()
    return [
        {
            "id": p.id,
            "plan": p.plan,
            "amount_inr": p.amount_paise / 100,
            "status": p.status,
            "created_at": p.created_at,
            "paid_at": p.paid_at,
        }
        for p in payments
    ]

@app.post("/api/generate-image-dataset")
def generate_image_dataset(
    dataset_type: str = Query(...), # shapes, ocr, colors, barcodes, signs, captcha, plates, digital, aruco, ecg, chess
    num_images_per_class: int = Query(50),
    image_size: int = Query(128),
    noise_level: str = Query("none"), # none, low, high
    split_ratio: float = Query(0.8),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    dataset_type_lower = dataset_type.lower()
    classes_count = {
        "shapes": 3, "ocr": 10, "colors": 3, "barcodes": 2, "signs": 3,
        "captcha": 3, "plates": 3, "digital": 10, "aruco": 3, "ecg": 3, "chess": 3
    }
    
    if dataset_type_lower not in classes_count:
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported or disabled dataset type '{dataset_type}'."
        )

    num_classes = classes_count[dataset_type_lower]
    total_images = num_images_per_class * num_classes

    if current_user.rows_generated_this_month + total_images > current_user.max_rows_limit:
        raise HTTPException(status_code=400, detail="Row quota limit exceeded.")

    try:
        zip_buffer = create_image_dataset_zip(
            dataset_type=dataset_type,
            num_images_per_class=num_images_per_class,
            size=image_size,
            noise_level=noise_level,
            split_ratio=split_ratio
        )
        
        # Deduct quota
        current_user.rows_generated_this_month += total_images
        
        log = AuditLog(
            user_id=current_user.id,
            action="GENERATE_IMAGE_DATASET",
            details=f"Generated {total_images} images of type '{dataset_type}' with size {image_size}x{image_size}."
        )
        db.add(log)
        db.commit()

        # Stream ZIP to frontend
        return StreamingResponse(
            zip_buffer,
            media_type="application/zip",
            headers={"Content-Disposition": f"attachment; filename=synthetic_image_{dataset_type}.zip"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate image dataset: {str(e)}")

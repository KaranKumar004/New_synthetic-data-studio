import random
import uuid
import datetime
import io
import json
import re
import pandas as pd
from typing import List, Dict, Any, Optional
from faker import Faker

# Dictionary of available Faker locales we can map from prompt tags
SUPPORTED_LOCALES = {
    "us": "en_US",
    "in": "en_IN",
    "india": "en_IN",
    "indian": "en_IN",
    "uk": "en_GB",
    "gb": "en_GB",
    "ca": "en_CA",
    "au": "en_AU",
    "de": "de_DE",
    "fr": "fr_FR",
    "es": "es_ES",
    "jp": "ja_JP",
    "cn": "zh_CN",
}

DOMAIN_PRESETS = {
    "healthcare": [
        {"disease": "Type 2 Diabetes", "symptoms": "Polyuria, Polydipsia, Fatigue", "cause": "Insulin resistance, Genetics, Obesity", "severity": "Moderate", "treatment": "Metformin, Dietary changes, Exercise"},
        {"disease": "Essential Hypertension", "symptoms": "Headaches, Dizziness, Chest pain", "cause": "High sodium, Obesity, Stress, Genetics", "severity": "Mild", "treatment": "Lisinopril, Amlodipine, Low-sodium diet"},
        {"disease": "Acute Influenza (Flu)", "symptoms": "Fever, Chills, Cough, Sore throat", "cause": "Influenza virus infection", "severity": "Moderate", "treatment": "Oseltamivir, Bed rest, Hydration"},
        {"disease": "Bronchial Asthma", "symptoms": "Wheezing, Cough, Shortness of breath", "cause": "Allergen exposure, Air pollution", "severity": "Moderate", "treatment": "Albuterol inhaler, Fluticasone"},
        {"disease": "COVID-19 Infection", "symptoms": "Fever, Dry cough, Loss of smell", "cause": "SARS-CoV-2 viral transmission", "severity": "Severe", "treatment": "Paxlovid, Rest, Symptomatic care"}
    ],
    "agriculture": [
        {"crop": "Rice", "soil": "Clayey", "water": "Rainfed / Irrigation", "fertilizer": "Urea / Nitrogen-rich", "yield": "High", "period_days": 120},
        {"crop": "Wheat", "soil": "Loamy", "water": "Canal / Tubewell", "fertilizer": "DAP / Phosphorus-rich", "yield": "Moderate", "period_days": 140},
        {"crop": "Cotton", "soil": "Black Sandy Loam", "water": "Drip Irrigation", "fertilizer": "Potassium-based", "yield": "High", "period_days": 180},
        {"crop": "Maize (Corn)", "soil": "Alluvial Loam", "water": "Sprinkler", "fertilizer": "NPK Balanced Mix", "yield": "High", "period_days": 110},
        {"crop": "Soybeans", "soil": "Sandy Clay", "water": "Rainfed", "fertilizer": "Phosphorus & Organic", "yield": "Low", "period_days": 100}
    ],
    "finance": [
        {"tx_type": "Online Purchase", "category": "Electronics", "amount": 45000.0, "card_type": "Credit Card", "risk": "Medium", "is_fraud": False},
        {"tx_type": "Atm Withdrawal", "category": "Cash", "amount": 5000.0, "card_type": "Debit Card", "risk": "Low", "is_fraud": False},
        {"tx_type": "International Transfer", "category": "Travel", "amount": 185000.0, "card_type": "Credit Card", "risk": "High", "is_fraud": True},
        {"tx_type": "Subscription Bill", "category": "Utilities", "amount": 999.0, "card_type": "Debit Card", "risk": "Low", "is_fraud": False},
        {"tx_type": "Grocery Store", "category": "Groceries", "amount": 2500.0, "card_type": "Debit Card", "risk": "Low", "is_fraud": False}
    ],
    "education": [
        {"course": "Computer Science", "hours": 42, "gpa": 3.8, "status": "Graduated", "career": "Software Engineer"},
        {"course": "Mechanical Engineering", "hours": 35, "gpa": 3.2, "status": "Graduated", "career": "Design Engineer"},
        {"course": "Business Administration", "hours": 20, "gpa": 3.0, "status": "Active", "career": "Management Intern"},
        {"course": "Chemical Engineering", "hours": 38, "gpa": 3.4, "status": "Graduated", "career": "Process Analyst"},
        {"course": "English Literature", "hours": 15, "gpa": 3.5, "status": "Active", "career": "Content Writer"}
    ],
    "legal": [
        {"case_type": "Breach of Contract", "verdict": "Settlement", "judge": "Justice Robert Vance", "damages": 1500000.0, "complexity": "High"},
        {"case_type": "Patent Infringement", "verdict": "Plaintiff Verdict", "judge": "Justice Sarah Jenkins", "damages": 8500000.0, "complexity": "Severe"},
        {"case_type": "Employment Dispute", "verdict": "Dismissed", "judge": "Justice Robert Vance", "damages": 0.0, "complexity": "Medium"},
        {"case_type": "Property Title Suit", "verdict": "Defendant Verdict", "judge": "Justice Alan Thorne", "damages": 250000.0, "complexity": "Medium"},
        {"case_type": "Trademark Infringement", "verdict": "Settlement", "judge": "Justice Sarah Jenkins", "damages": 500000.0, "complexity": "High"}
    ],
    "hr": [
        {"department": "Engineering", "role": "Senior Developer", "experience": 8, "rating": "Outstanding", "salary": 185000.0},
        {"department": "Sales", "role": "Account Executive", "experience": 3, "rating": "Meets Expectations", "salary": 65000.0},
        {"department": "Marketing", "role": "SEO Lead", "experience": 5, "rating": "Exceeds Expectations", "salary": 85000.0},
        {"department": "Finance", "role": "Financial Analyst", "experience": 4, "rating": "Meets Expectations", "salary": 90000.0},
        {"department": "HR", "role": "HR Manager", "experience": 7, "rating": "Outstanding", "salary": 110000.0}
    ],
    "retail": [
        {"category": "Electronics", "product": "Smart OLED TV", "price": 68000.0, "stock": "In Stock", "rating": 4.6},
        {"category": "Clothing", "product": "Slim Fit Denim Jeans", "price": 2400.0, "stock": "In Stock", "rating": 4.2},
        {"category": "Home & Kitchen", "product": "Air Fryer 5L", "price": 7500.0, "stock": "Low Stock", "rating": 4.5},
        {"category": "Sports", "product": "Yoga Mat Extra Thick", "price": 1200.0, "stock": "Out of Stock", "rating": 4.0},
        {"category": "Books", "product": "ML Algorithms Guide", "price": 1800.0, "stock": "In Stock", "rating": 4.8}
    ],
    "government": [
        {"service_type": "Passport Renewal", "dept": "Ministry of External Affairs", "status": "Approved", "resolution_days": 12, "rating": 4.4},
        {"service_type": "Business License", "dept": "Municipal Corporation", "status": "Pending", "resolution_days": 30, "rating": 3.2},
        {"service_type": "Income Tax Refund", "dept": "Revenue Department", "status": "Approved", "resolution_days": 45, "rating": 4.0},
        {"service_type": "Driving License", "dept": "Road Transport Office", "status": "Rejected", "resolution_days": 8, "rating": 2.5},
        {"service_type": "Land Registration", "dept": "Land Records Division", "status": "Approved", "resolution_days": 25, "rating": 3.8}
    ],
    "technology": [
        {"asset_type": "Database Server", "os": "RHEL 9.2 Enterprise", "status": "Online", "patch_level": "Fully Patched", "vulnerabilities": 0},
        {"asset_type": "Developer Workstation", "os": "Windows 11 Pro", "status": "Online", "patch_level": "Pending Updates", "vulnerabilities": 3},
        {"asset_type": "Corporate Laptop", "os": "macOS Sonoma 14.1", "status": "Offline", "patch_level": "Fully Patched", "vulnerabilities": 1},
        {"asset_type": "Network Firewall", "os": "Proprietary Firmware v8", "status": "Online", "patch_level": "Fully Patched", "vulnerabilities": 0},
        {"asset_type": "Legacy File Server", "os": "Windows Server 2012 R2", "status": "Online", "patch_level": "Out of Support", "vulnerabilities": 14}
    ],
    "environment": [
        {"location_type": "Desert Region", "temp": 42.5, "humidity": 12.0, "aqi": 140, "carbon_idx": 8.5},
        {"location_type": "National Forest", "temp": 18.2, "humidity": 85.0, "aqi": 22, "carbon_idx": 1.2},
        {"location_type": "Industrial District", "temp": 32.1, "humidity": 45.0, "aqi": 185, "carbon_idx": 12.8},
        {"location_type": "Coastal Metropolis", "temp": 28.6, "humidity": 78.0, "aqi": 95, "carbon_idx": 6.4},
        {"location_type": "Alpine Foothills", "temp": 12.4, "humidity": 60.0, "aqi": 35, "carbon_idx": 2.0}
    ],
    "marketing": [
        {"campaign_type": "Social Video Ads", "channel": "YouTube / Instagram", "budget": 150000.0, "roi": 225.0, "status": "Active"},
        {"campaign_type": "Search Ads", "channel": "Google Search", "budget": 80000.0, "roi": 180.0, "status": "Active"},
        {"campaign_type": "Newsletter Campaign", "channel": "Email Marketing", "budget": 12000.0, "roi": 450.0, "status": "Completed"},
        {"campaign_type": "Influencer Sponsor", "channel": "TikTok Ads", "budget": 250000.0, "roi": 95.0, "status": "Completed"},
        {"campaign_type": "Display Banners", "channel": "Google Display Network", "budget": 40000.0, "roi": 60.0, "status": "Paused"}
    ]
}

class SyntheticDataEngine:
    def __init__(self, locale: str = "en_US"):
        # Resolve locale
        faker_locale = SUPPORTED_LOCALES.get(locale.lower(), locale)
        try:
            self.fake = Faker(faker_locale)
        except Exception:
            self.fake = Faker("en_US")
        
        # Predefined categories for typical data types
        self.genders = ["Male", "Female", "Non-binary", "Prefer not to say"]
        self.product_names = [
            "Wireless Headphones", "Smartphone Screen Protector", "Ergonomic Office Chair",
            "Stainless Steel Water Bottle", "USB-C Hub", "Mechanical Keyboard",
            "Leather Wallet", "Yoga Mat", "Bluetooth Speaker", "Laptop Stand",
            "LED Desk Lamp", "Coffee Grinder", "Running Shoes", "Backpack",
            "Smart Watch", "Ceramic Mug", "Dumbbells Set", "Gaming Mouse",
            "Electric Toothbrush", "Scented Candle"
        ]
        self.categories_fallback = ["Electronics", "Clothing", "Home & Kitchen", "Books", "Sports", "Beauty", "Automotive", "Toys"]

    def generate_value(self, field_type: str, index: int, parent_keys: Optional[Dict[str, List[Any]]] = None, config: Optional[Dict[str, Any]] = None) -> Any:
        config = config or {}
        field_type_clean = field_type.lower().replace(" ", "_").replace("_", "")

        # 1. Custom and Relational keys
        if parent_keys and config.get("foreign_key"):
            parent_table_col = config.get("foreign_key")  # Format: "table_name.column_name"
            if parent_table_col in parent_keys and parent_keys[parent_table_col]:
                return random.choice(parent_keys[parent_table_col])
            # Fallback if parent keys not found
            return f"REF-{random.randint(1000, 9999)}"

        # 2. Supported Core Types mapping
        if field_type_clean == "name":
            return self.fake.name()
        elif field_type_clean == "firstname":
            return self.fake.first_name()
        elif field_type_clean == "lastname":
            return self.fake.last_name()
        elif field_type_clean == "age":
            min_age = int(config.get("min", 18))
            max_age = int(config.get("max", 80))
            return random.randint(min_age, max_age)
        elif field_type_clean == "gender":
            weights = config.get("weights")  # e.g., [0.48, 0.48, 0.02, 0.02]
            if weights and len(weights) == len(self.genders):
                return random.choices(self.genders, weights=weights, k=1)[0]
            return random.choice(self.genders)
        elif field_type_clean == "email":
            return self.fake.email()
        elif field_type_clean == "phonenumber" or field_type_clean == "phone":
            return self.fake.phone_number()
        elif field_type_clean == "address":
            return self.fake.address().replace("\n", ", ")
        elif field_type_clean == "city":
            return self.fake.city()
        elif field_type_clean == "state":
            return self.fake.state()
        elif field_type_clean == "country":
            return self.fake.country()
        elif field_type_clean == "postalcode" or field_type_clean == "zipcode":
            return self.fake.postcode()
        elif field_type_clean == "date":
            start_date = config.get("start_date", "-10y")
            end_date = config.get("end_date", "today")
            return self.fake.date_between(start_date=start_date, end_date=end_date).isoformat()
        elif field_type_clean == "datetime":
            start_date = config.get("start_date", "-10y")
            end_date = config.get("end_date", "today")
            return self.fake.date_time_between(start_date=start_date, end_date=end_date).isoformat()
        elif field_type_clean == "currency":
            min_val = float(config.get("min", 10))
            max_val = float(config.get("max", 1000))
            val = round(random.uniform(min_val, max_val), 2)
            if config.get("format") == "string":
                symbol = config.get("symbol", "$")
                return f"{symbol}{val:,.2f}"
            return val
        elif field_type_clean == "productname":
            return random.choice(self.product_names)
        elif field_type_clean == "companyname" or field_type_clean == "company":
            return self.fake.company()
        elif field_type_clean == "employeeid":
            prefix = config.get("prefix", "EMP-")
            return f"{prefix}{10000 + index}"
        elif field_type_clean == "customerid":
            prefix = config.get("prefix", "CUST-")
            return f"{prefix}{10000 + index}"
        elif field_type_clean == "uuid":
            return str(uuid.uuid4())
        elif field_type_clean == "boolean":
            true_pct = float(config.get("true_percentage", 50)) / 100.0
            return random.random() < true_pct
        elif field_type_clean == "integer" or field_type_clean == "int":
            min_val = int(config.get("min", 1))
            max_val = int(config.get("max", 100))
            # Support normal, uniform distributions
            dist = config.get("distribution", "uniform")
            if dist == "normal":
                mean = config.get("mean", (min_val + max_val) / 2)
                stddev = config.get("stddev", (max_val - min_val) / 6)
                val = int(random.normalvariate(mean, stddev))
                return max(min_val, min(max_val, val))
            return random.randint(min_val, max_val)
        elif field_type_clean == "float" or field_type_clean == "decimal":
            min_val = float(config.get("min", 0.0))
            max_val = float(config.get("max", 1.0))
            precision = int(config.get("precision", 2))
            val = random.uniform(min_val, max_val)
            return round(val, precision)
        elif field_type_clean == "categories" or field_type_clean == "category":
            cats = config.get("categories", self.categories_fallback)
            weights = config.get("weights")
            if weights and len(weights) == len(cats):
                return random.choices(cats, weights=weights, k=1)[0]
            return random.choice(cats)
        elif field_type_clean == "customtext" or field_type_clean == "text":
            sentences = int(config.get("sentences", 2))
            return self.fake.paragraph(nb_sentences=sentences)
        # Healthcare Custom Types
        elif field_type_clean in ["disease_/_diagnosis", "disease/diagnosis", "disease", "diagnosis", "diseasediagnosis"]:
            return random.choice(DOMAIN_PRESETS["healthcare"])["disease"]
        elif field_type_clean in ["medical_symptoms", "medicalsymptoms", "symptom", "symptoms"]:
            return random.choice(DOMAIN_PRESETS["healthcare"])["symptoms"]
        elif field_type_clean in ["medical_cause", "medicalcause", "cause", "causes"]:
            return random.choice(DOMAIN_PRESETS["healthcare"])["cause"]
        elif field_type_clean in ["medical_treatment", "medicaltreatment", "treatment", "medication"]:
            return random.choice(DOMAIN_PRESETS["healthcare"])["treatment"]
        elif field_type_clean in ["medical_severity", "medicalseverity", "severity"]:
            return random.choice(DOMAIN_PRESETS["healthcare"])["severity"]
        # Agriculture Custom Types
        elif field_type_clean in ["crop_type", "croptype", "crop"]:
            return random.choice(DOMAIN_PRESETS["agriculture"])["crop"]
        elif field_type_clean in ["soil_type", "soiltype", "soil"]:
            return random.choice(DOMAIN_PRESETS["agriculture"])["soil"]
        elif field_type_clean in ["water_source", "watersource", "water"]:
            return random.choice(DOMAIN_PRESETS["agriculture"])["water"]
        elif field_type_clean in ["fertilizer_used", "fertilizerused", "fertilizer"]:
            return random.choice(DOMAIN_PRESETS["agriculture"])["fertilizer"]
        elif field_type_clean in ["yield_level", "yieldlevel", "yield"]:
            return random.choice(DOMAIN_PRESETS["agriculture"])["yield"]
        # Finance Custom Types
        elif field_type_clean in ["transaction_type", "transactiontype", "tx_type", "txtype"]:
            return random.choice(DOMAIN_PRESETS["finance"])["tx_type"]
        elif field_type_clean in ["merchant_category", "merchantcategory", "category"]:
            return random.choice(DOMAIN_PRESETS["finance"])["category"]
        elif field_type_clean in ["card_type", "cardtype"]:
            return random.choice(DOMAIN_PRESETS["finance"])["card_type"]
        elif field_type_clean in ["risk_score", "riskscore", "risk"]:
            return random.choice(DOMAIN_PRESETS["finance"])["risk"]
        # Education Custom Types
        elif field_type_clean in ["course_major", "coursemajor", "course", "major"]:
            return random.choice(DOMAIN_PRESETS["education"])["course"]
        elif field_type_clean in ["graduation_status", "graduationstatus", "status"]:
            return random.choice(DOMAIN_PRESETS["education"])["status"]
        elif field_type_clean in ["career_path", "careerpath", "career"]:
            return random.choice(DOMAIN_PRESETS["education"])["career"]
        # Legal Custom Types
        elif field_type_clean in ["case_type", "casetype"]:
            return random.choice(DOMAIN_PRESETS["legal"])["case_type"]
        elif field_type_clean in ["verdict_outcome", "verdictoutcome", "verdict"]:
            return random.choice(DOMAIN_PRESETS["legal"])["verdict"]
        # HR Custom Types
        elif field_type_clean in ["department_name", "departmentname", "department"]:
            return random.choice(DOMAIN_PRESETS["hr"])["department"]
        elif field_type_clean in ["employee_role", "employeerole", "role"]:
            return random.choice(DOMAIN_PRESETS["hr"])["role"]
        elif field_type_clean in ["performance_rating", "performancerating", "rating"]:
            return random.choice(DOMAIN_PRESETS["hr"])["rating"]
        # Retail Custom Types
        elif field_type_clean in ["product_category", "productcategory"]:
            return random.choice(DOMAIN_PRESETS["retail"])["category"]
        elif field_type_clean in ["product_name", "productname", "product"]:
            return random.choice(DOMAIN_PRESETS["retail"])["product"]
        # Government Custom Types
        elif field_type_clean in ["service_type", "servicetype"]:
            return random.choice(DOMAIN_PRESETS["government"])["service_type"]
        # Technology Custom Types
        elif field_type_clean in ["asset_type", "assettype"]:
            return random.choice(DOMAIN_PRESETS["technology"])["asset_type"]
        elif field_type_clean in ["operating_system", "operatingsystem", "os"]:
            return random.choice(DOMAIN_PRESETS["technology"])["os"]
        # Environment Custom Types
        elif field_type_clean in ["location_type", "locationtype"]:
            return random.choice(DOMAIN_PRESETS["environment"])["location_type"]
        # Marketing Custom Types
        elif field_type_clean in ["campaign_type", "campaigntype"]:
            return random.choice(DOMAIN_PRESETS["marketing"])["campaign_type"]
        elif field_type_clean in ["marketing_channel", "marketingchannel", "channel"]:
            return random.choice(DOMAIN_PRESETS["marketing"])["channel"]
        
        # Image URL Types
        elif field_type_clean in ["avatarurl", "avatar", "profileimage"]:
            # Generate a consistent, unique avatar using Pravatar
            seed = config.get("seed", str(uuid.uuid4())[:8])
            return f"https://i.pravatar.cc/150?u={seed}"
        elif field_type_clean in ["productimageurl", "productimage", "productimg"]:
            product_images = [
                "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&auto=format&fit=crop&q=80",
                "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop&q=80",
                "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=500&auto=format&fit=crop&q=80",
                "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&auto=format&fit=crop&q=80",
                "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=500&auto=format&fit=crop&q=80",
                "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=500&auto=format&fit=crop&q=80",
                "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=500&auto=format&fit=crop&q=80"
            ]
            return product_images[index % len(product_images)]
        elif field_type_clean in ["propertyimageurl", "propertyimage", "houseimage"]:
            house_images = [
                "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=500&auto=format&fit=crop&q=80",
                "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=500&auto=format&fit=crop&q=80",
                "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=500&auto=format&fit=crop&q=80",
                "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=500&auto=format&fit=crop&q=80",
                "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=500&auto=format&fit=crop&q=80"
            ]
            return house_images[index % len(house_images)]
        elif field_type_clean in ["restaurantimageurl", "restaurantimage", "foodimage"]:
            food_images = [
                "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500&auto=format&fit=crop&q=80",
                "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=500&auto=format&fit=crop&q=80",
                "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=500&auto=format&fit=crop&q=80",
                "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=500&auto=format&fit=crop&q=80"
            ]
            return food_images[index % len(food_images)]
        elif field_type_clean in ["generalimageurl", "imageurl", "image", "img", "photo"]:
            width = int(config.get("width", 640))
            height = int(config.get("height", 480))
            return f"https://picsum.photos/{width}/{height}?random={index}"
        
        # Fallback to standard word/sentence
        return self.fake.word()

    def generate_table(
        self,
        columns: List[Dict[str, Any]],
        num_rows: int,
        parent_keys: Optional[Dict[str, List[Any]]] = None,
        noise_level: str = "perfect",
        global_null_pct: float = 0.0
    ) -> List[Dict[str, Any]]:
        rows = []
        for i in range(num_rows):
            row = {}
            
            # Auto-detect domain based on column names or types
            detected_domain = None
            for col in columns:
                name_l = col["name"].lower()
                type_l = col["type"].lower()
                
                # Check Healthcare
                if type_l in ["disease / diagnosis", "medical symptoms", "medical cause", "medical treatment", "medical severity"] or name_l in ["disease", "diagnosis", "symptom", "symptoms", "medical_condition"]:
                    detected_domain = "healthcare"
                    break
                # Check Agriculture
                elif type_l in ["crop type", "soil type", "water source", "fertilizer used", "yield level"] or name_l in ["crop", "soil", "soil_type", "crop_type", "fertilizer"]:
                    detected_domain = "agriculture"
                    break
                # Check Finance
                elif type_l in ["transaction type", "merchant category", "card type", "risk score"] or name_l in ["tx_type", "transaction_type", "card_type", "risk_score", "is_fraud"]:
                    detected_domain = "finance"
                    break
                # Check Education
                elif type_l in ["course / major", "graduation status", "career path"] or name_l in ["course", "major", "gpa", "study_hours"]:
                    detected_domain = "education"
                    break
                # Check Legal
                elif type_l in ["case type", "verdict / outcome"] or name_l in ["case_type", "verdict", "damages"]:
                    detected_domain = "legal"
                    break
                # Check HR
                elif type_l in ["department name", "employee role", "performance rating"] or name_l in ["department", "performance_rating", "experience_years"]:
                    detected_domain = "hr"
                    break
                # Check Retail
                elif type_l in ["product category", "product name"] or name_l in ["product", "product_name", "product_category"]:
                    detected_domain = "retail"
                    break
                # Check Government
                elif type_l in ["service type"] or name_l in ["service_type", "citizen_id"]:
                    detected_domain = "government"
                    break
                # Check Technology
                elif type_l in ["asset type", "operating system"] or name_l in ["asset_type", "operating_system", "patch_level"]:
                    detected_domain = "technology"
                    break
                # Check Environment
                elif type_l in ["location type"] or name_l in ["location_type", "aqi", "temperature_celsius"]:
                    detected_domain = "environment"
                    break
                # Check Marketing
                elif type_l in ["campaign type", "marketing channel"] or name_l in ["campaign_type", "campaign_name", "roi"]:
                    detected_domain = "marketing"
                    break

            # Pre-select case for this row if a domain was detected
            row_preset = None
            if detected_domain and detected_domain in DOMAIN_PRESETS:
                row_preset = random.choice(DOMAIN_PRESETS[detected_domain])

            for col in columns:
                col_name = col["name"]
                col_type = col["type"]
                col_config = col.get("config", {}) or {}
                null_pct = col.get("null_pct", 0.0)

                effective_null_pct = max(null_pct, global_null_pct)
                if noise_level == "noisy":
                    effective_null_pct = max(effective_null_pct, 10.0)

                if random.random() * 100 < effective_null_pct:
                    row[col_name] = None
                else:
                    name_l = col_name.lower()
                    type_l = col_type.lower()
                    
                    val = None
                    # If we have a preset and this column is a domain-specific column, map it!
                    if row_preset:
                        if detected_domain == "healthcare":
                            if col_type == "Disease / Diagnosis" or name_l in ["disease", "diagnosis", "medical_condition"]:
                                val = row_preset["disease"]
                            elif col_type == "Medical Symptoms" or name_l in ["symptom", "symptoms"]:
                                val = row_preset["symptoms"]
                            elif col_type == "Medical Cause" or name_l in ["cause", "causes", "etiology"]:
                                val = row_preset["cause"]
                            elif col_type == "Medical Treatment" or name_l in ["treatment", "medication", "treatments"]:
                                val = row_preset["treatment"]
                            elif col_type == "Medical Severity" or name_l == "severity":
                                val = row_preset["severity"]
                        elif detected_domain == "agriculture":
                            if col_type == "Crop Type" or name_l in ["crop", "crop_type"]:
                                val = row_preset["crop"]
                            elif col_type == "Soil Type" or name_l in ["soil", "soil_type"]:
                                val = row_preset["soil"]
                            elif col_type == "Water Source" or name_l in ["water", "water_source"]:
                                val = row_preset["water"]
                            elif col_type == "Fertilizer Used" or name_l in ["fertilizer", "fertilizer_used"]:
                                val = row_preset["fertilizer"]
                            elif col_type == "Yield Level" or name_l in ["yield", "yield_level"]:
                                val = row_preset["yield"]
                            elif name_l in ["period_days", "growth_period_days", "growth_period"]:
                                val = row_preset["period_days"]
                        elif detected_domain == "finance":
                            if col_type == "Transaction Type" or name_l in ["tx_type", "transaction_type"]:
                                val = row_preset["tx_type"]
                            elif col_type == "Merchant Category" or name_l in ["category", "merchant_category"]:
                                val = row_preset["category"]
                            elif col_type == "Card Type" or name_l in ["card", "card_type"]:
                                val = row_preset["card_type"]
                            elif col_type == "Risk Score" or name_l in ["risk", "risk_score"]:
                                val = row_preset["risk"]
                            elif name_l in ["is_fraud", "fraud"]:
                                val = row_preset["is_fraud"]
                            elif name_l == "amount":
                                val = round(row_preset["amount"] * random.uniform(0.9, 1.1), 2)
                        elif detected_domain == "education":
                            if col_type == "Course / Major" or name_l in ["course", "major"]:
                                val = row_preset["course"]
                            elif col_type == "Graduation Status" or name_l in ["status", "graduation_status"]:
                                val = row_preset["status"]
                            elif col_type == "Career Path" or name_l in ["career", "career_path"]:
                                val = row_preset["career"]
                            elif name_l in ["hours", "study_hours", "study_hours_weekly"]:
                                val = row_preset["hours"]
                            elif name_l == "gpa":
                                val = row_preset["gpa"]
                        elif detected_domain == "legal":
                            if col_type == "Case Type" or name_l in ["case", "case_type"]:
                                val = row_preset["case_type"]
                            elif col_type == "Verdict / Outcome" or name_l in ["verdict", "outcome"]:
                                val = row_preset["verdict"]
                            elif name_l == "judge":
                                val = row_preset["judge"]
                            elif name_l == "damages":
                                val = row_preset["damages"]
                            elif name_l == "complexity":
                                val = row_preset["complexity"]
                        elif detected_domain == "hr":
                            if col_type == "Department Name" or name_l in ["department", "department_name"]:
                                val = row_preset["department"]
                            elif col_type == "Employee Role" or name_l in ["role", "employee_role"]:
                                val = row_preset["role"]
                            elif col_type == "Performance Rating" or name_l in ["rating", "performance_rating"]:
                                val = row_preset["rating"]
                            elif name_l in ["experience", "experience_years"]:
                                val = row_preset["experience"]
                            elif name_l == "salary":
                                val = round(row_preset["salary"] * random.uniform(0.95, 1.05), 2)
                        elif detected_domain == "retail":
                            if col_type == "Product Category" or name_l in ["category", "product_category"]:
                                val = row_preset["category"]
                            elif col_type == "Product Name" or name_l in ["product", "product_name"]:
                                val = row_preset["product"]
                            elif name_l == "price":
                                val = round(row_preset["price"] * random.uniform(0.98, 1.02), 2)
                            elif name_l == "stock":
                                val = row_preset["stock"]
                            elif name_l == "rating":
                                val = row_preset["rating"]
                        elif detected_domain == "government":
                            if col_type == "Service Type" or name_l in ["service", "service_type"]:
                                val = row_preset["service_type"]
                            elif name_l == "dept":
                                val = row_preset["dept"]
                            elif name_l == "status":
                                val = row_preset["status"]
                            elif name_l == "resolution_days":
                                val = row_preset["resolution_days"]
                            elif name_l == "rating":
                                val = row_preset["rating"]
                        elif detected_domain == "technology":
                            if col_type == "Asset Type" or name_l in ["asset", "asset_type"]:
                                val = row_preset["asset_type"]
                            elif col_type == "Operating System" or name_l in ["os", "operating_system"]:
                                val = row_preset["os"]
                            elif name_l == "status":
                                val = row_preset["status"]
                            elif name_l == "patch_level":
                                val = row_preset["patch_level"]
                            elif name_l == "vulnerabilities":
                                val = row_preset["vulnerabilities"]
                        elif detected_domain == "environment":
                            if col_type == "Location Type" or name_l in ["location", "location_type"]:
                                val = row_preset["location_type"]
                            elif name_l == "temp":
                                val = round(row_preset["temp"] + random.uniform(-1.5, 1.5), 1)
                            elif name_l == "humidity":
                                val = round(row_preset["humidity"] + random.uniform(-5.0, 5.0), 1)
                                val = max(0, min(100, val))
                            elif name_l == "aqi":
                                val = int(row_preset["aqi"] + random.randint(-10, 10))
                                val = max(0, val)
                            elif name_l == "carbon_idx":
                                val = round(row_preset["carbon_idx"] + random.uniform(-0.5, 0.5), 1)
                                val = max(0, val)
                        elif detected_domain == "marketing":
                            if col_type == "Campaign Type" or name_l in ["campaign", "campaign_type"]:
                                val = row_preset["campaign_type"]
                            elif col_type == "Marketing Channel" or name_l in ["channel", "marketing_channel"]:
                                val = row_preset["channel"]
                            elif name_l == "budget":
                                val = round(row_preset["budget"] * random.uniform(0.9, 1.1), 2)
                            elif name_l == "roi":
                                val = round(row_preset["roi"] + random.uniform(-10.0, 10.0), 1)
                            elif name_l == "status":
                                val = row_preset["status"]

                    # If not resolved from preset, generate using standard engine
                    if val is None:
                        val = self.generate_value(col_type, i, parent_keys, col_config)

                    if noise_level == "noisy" and isinstance(val, str) and random.random() < 0.05:
                        if val:
                            if random.random() < 0.5:
                                val = val.lower()
                            else:
                                val = val + " (sic)"
                    row[col_name] = val
            rows.append(row)

        if noise_level in ["realistic", "noisy"] and num_rows > 10:
            dup_pct = 2.3 if noise_level == "realistic" else 8
            num_dups = int((dup_pct / 100) * num_rows)
            for _ in range(num_dups):
                src_idx = random.randint(0, num_rows - 1)
                dst_idx = random.randint(0, num_rows - 1)
                cloned_row = rows[src_idx].copy()
                for key in cloned_row:
                    if key.lower() == "id" or key.lower().endswith("_id"):
                        cloned_row[key] = self.generate_value("UUID", dst_idx)
                rows[dst_idx] = cloned_row

        return rows

class RelationalDatasetGenerator:
    def __init__(self, locale: str = "en_US"):
        self.engine = SyntheticDataEngine(locale=locale)

    def generate_relational_dataset(
        self,
        tables_config: Dict[str, Any],
        noise_level: str = "perfect",
        global_null_pct: float = 0.0
    ) -> Dict[str, List[Dict[str, Any]]]:
        tables = tables_config.get("tables", [])
        
        # 1. Topological Sort of tables
        table_dependencies = {}
        table_by_name = {t["name"]: t for t in tables}
        
        for t in tables:
            deps = set()
            for col in t.get("columns", []):
                fk = col.get("config", {}).get("foreign_key") if col.get("config") else None
                if fk and "." in fk:
                    parent_table = fk.split(".")[0]
                    if parent_table in table_by_name:
                        deps.add(parent_table)
            table_dependencies[t["name"]] = deps

        sorted_table_names = []
        visited = set()
        temp_visited = set()

        def visit(name):
            if name in temp_visited:
                return
            if name not in visited:
                temp_visited.add(name)
                for dep in table_dependencies.get(name, []):
                    visit(dep)
                temp_visited.remove(name)
                visited.add(name)
                sorted_table_names.append(name)

        for t_name in table_by_name:
            visit(t_name)

        # 2. Generate tables
        parent_keys = {}
        dataset = {}

        for t_name in sorted_table_names:
            table_conf = table_by_name[t_name]
            columns = table_conf.get("columns", [])
            num_rows = int(table_conf.get("rows", 10))

            rows = self.engine.generate_table(
                columns=columns,
                num_rows=num_rows,
                parent_keys=parent_keys,
                noise_level=noise_level,
                global_null_pct=global_null_pct
            )

            # Store primary keys
            for col in columns:
                col_name = col["name"]
                key_path = f"{t_name}.{col_name}"
                parent_keys[key_path] = [row[col_name] for row in rows if row[col_name] is not None]

            dataset[t_name] = rows

        return dataset

# --- DATASET QUALITY ENGINE ---
def analyze_dataset_quality(dataset_data: Dict[str, List[Dict[str, Any]]], tables_config: List[Dict[str, Any]]) -> Dict[str, Any]:
    logs = []
    total_cells = 0
    null_cells = 0
    
    total_rows = 0
    duplicate_rows_count = 0
    
    valid_refs = 0
    total_refs = 0
    
    valid_realism = 0
    total_realism = 0

    table_pkeys = {}

    # 1. Pre-collect keys for referential integrity checking
    for table_conf in tables_config:
        t_name = table_conf["name"]
        rows = dataset_data.get(t_name, [])
        for col in table_conf.get("columns", []):
            col_name = col["name"]
            key_path = f"{t_name}.{col_name}"
            table_pkeys[key_path] = [r[col_name] for r in rows if r.get(col_name) is not None]

    for table_conf in tables_config:
        t_name = table_conf["name"]
        rows = dataset_data.get(t_name, [])
        if not rows:
            continue
        
        num_rows = len(rows)
        total_rows += num_rows
        columns = table_conf.get("columns", [])
        
        # Calculate duplicates (ignoring ID columns)
        df_temp = pd.DataFrame(rows)
        non_id_cols = [c for c in df_temp.columns if not c.lower().endswith("id") and c.lower() != "id"]
        if non_id_cols:
            dups = df_temp.duplicated(subset=non_id_cols).sum()
            duplicate_rows_count += dups
            
        for r in rows:
            for col in columns:
                col_name = col["name"]
                col_type = col["type"]
                col_config = col.get("config", {}) or {}
                val = r.get(col_name)
                
                total_cells += 1
                if val is None:
                    null_cells += 1
                    continue
                
                # Check referential integrity
                fk = col_config.get("foreign_key")
                if fk:
                    total_refs += 1
                    if fk in table_pkeys and val in table_pkeys[fk]:
                        valid_refs += 1
                
                # Check data realism formatting
                total_realism += 1
                type_clean = col_type.lower()
                if "email" in type_clean:
                    if "@" in str(val) and "." in str(val):
                        valid_realism += 1
                elif "age" in type_clean:
                    try:
                        age_val = int(val)
                        if age_val >= 0:
                            valid_realism += 1
                    except ValueError:
                        pass
                elif "phone" in type_clean:
                    # check digits presence
                    if re.search(r"\d", str(val)):
                        valid_realism += 1
                elif "uuid" in type_clean:
                    if len(str(val)) == 36:
                        valid_realism += 1
                else:
                    valid_realism += 1

    # Scores math
    completeness_score = round((1 - null_cells / total_cells) * 100) if total_cells > 0 else 100
    missing_pct = round((null_cells / total_cells) * 100, 1) if total_cells > 0 else 0
    duplicate_pct = round((duplicate_rows_count / total_rows) * 100, 1) if total_rows > 0 else 0
    
    integrity_score = round((valid_refs / total_refs) * 100) if total_refs > 0 else 100
    realism_score = round((valid_realism / total_realism) * 100) if total_realism > 0 else 100

    # Build logs
    if completeness_score >= 95:
        logs.append({"status": "success", "message": "High Data Completeness Score"})
    else:
        logs.append({"status": "warning", "message": f"Contains {missing_pct}% Missing Values"})

    if total_refs > 0:
        if integrity_score == 100:
            logs.append({"status": "success", "message": "Referential Integrity Passed (100%)"})
        else:
            logs.append({"status": "warning", "message": f"Broken relations detected: {100 - integrity_score}% failed"})
    else:
        logs.append({"status": "success", "message": "No relational dependencies found"})

    if duplicate_pct < 5.0:
        logs.append({"status": "success", "message": f"Low Duplicate Ratio ({duplicate_pct}%)"})
    else:
        logs.append({"status": "warning", "message": f"High Duplicate Percentage: {duplicate_pct}%"})

    if realism_score >= 90:
        logs.append({"status": "success", "message": "Valid Field Formatting (Realism Passed)"})
    else:
        logs.append({"status": "warning", "message": "Format mismatches inside synthetic attributes"})

    # Weighted Overall Score
    overall_score = round(completeness_score * 0.25 + integrity_score * 0.35 + realism_score * 0.40 - (duplicate_pct * 0.5))
    overall_score = max(0, min(100, overall_score))

    return {
        "overall": overall_score,
        "completeness": completeness_score,
        "integrity": integrity_score,
        "realism": realism_score,
        "duplicate_pct": duplicate_pct,
        "missing_pct": missing_pct,
        "logs": logs
    }

# --- DATA DRIFT SIMULATOR ---
def simulate_data_drift(
    tables_config: Dict[str, Any],
    locale: str = "en_US",
    months: int = 3
) -> Dict[str, Any]:
    """
    Generates multi-month datasets introducing statistical drifts (category shifts, price inflation, churn trends).
    """
    generator = RelationalDatasetGenerator(locale=locale)
    
    month_names = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
    # Slice mapping size
    selected_months = month_names[:months]
    
    drift_output = {
        "months": selected_months,
        "drift_metrics": {
            "revenue_trend": [],
            "active_users": [],
            "churn_rate": [],
            "new_users": []
        },
        "datasets": {}
    }

    # Generate Month 1 (Base Line)
    base_data = generator.generate_relational_dataset(tables_config)
    drift_output["datasets"][selected_months[0]] = base_data
    
    # Pre-collect basic counts
    active_count = 100
    revenue_base = 50000.0
    
    drift_output["drift_metrics"]["revenue_trend"].append(round(revenue_base, 2))
    drift_output["drift_metrics"]["active_users"].append(active_count)
    drift_output["drift_metrics"]["churn_rate"].append(0.0)
    drift_output["drift_metrics"]["new_users"].append(0)

    # Generate subsequent months with drift
    current_data = base_data
    for m_idx in range(1, months):
        m_name = selected_months[m_idx]
        
        # Modify the original config to introduce drift
        modified_config = json.loads(json.dumps(tables_config))
        
        # 1. Modify numeric columns (e.g. increase min/max ranges for inflation/demand)
        # Apply 3% monthly increase in Currency / Currency ranges
        for t_conf in modified_config.get("tables", []):
            for col in t_conf.get("columns", []):
                if col["type"] == "Currency":
                    config = col.get("config", {}) or {}
                    if "min" in config:
                        config["min"] = float(config["min"]) * (1 + 0.03 * m_idx)
                    if "max" in config:
                        config["max"] = float(config["max"]) * (1 + 0.03 * m_idx)
                    col["config"] = config
        
        month_data = generator.generate_relational_dataset(modified_config)
        
        # 2. Simulate User Churn / Revenue trends
        churn = round(random.uniform(4.0, 10.0) + (m_idx * 1.5), 1)
        new_joins = int(active_count * random.uniform(0.05, 0.12))
        active_count = int(active_count * (1 - churn/100)) + new_joins
        
        # Apply drift multi-month multiplier to revenue metrics
        rev_trend = revenue_base * (1 + random.uniform(-0.05, 0.08)) * (1 + 0.02 * m_idx)
        
        drift_output["drift_metrics"]["revenue_trend"].append(round(rev_trend, 2))
        drift_output["drift_metrics"]["active_users"].append(active_count)
        drift_output["drift_metrics"]["churn_rate"].append(churn)
        drift_output["drift_metrics"]["new_users"].append(new_joins)
        
        drift_output["datasets"][m_name] = month_data

    return drift_output

# --- EXPORTS ROUTINE ---
def export_data(data: List[Dict[str, Any]], format_type: str, table_name: str = "dataset") -> bytes:
    format_clean = format_type.upper().strip()
    df = pd.DataFrame(data)

    if format_clean == "CSV":
        return df.to_csv(index=False).encode("utf-8")
        
    elif format_clean == "JSON":
        return df.to_json(orient="records", indent=2).encode("utf-8")
        
    elif format_clean == "JSONL":
        return "\n".join([json.dumps(row) for row in data]).encode("utf-8")

    elif format_clean == "EXCEL" or format_clean == "XLSX":
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine="openpyxl") as writer:
            df.to_excel(writer, index=False, sheet_name=table_name)
        output.seek(0)
        return output.getvalue()
        
    elif format_clean == "PARQUET":
        output = io.BytesIO()
        df.to_parquet(output, index=False)
        output.seek(0)
        return output.getvalue()
        
    elif format_clean == "SQL":
        lines = []
        lines.append(f"-- SQL INSERT script generated for table: {table_name}")
        lines.append(f"-- Total rows: {len(df)}")
        lines.append("")

        for _, row in df.iterrows():
            columns = []
            values = []
            for col, val in row.items():
                columns.append(f"`{col}`")
                if pd.isna(val) or val is None:
                    values.append("NULL")
                elif isinstance(val, (int, float, bool)):
                    if isinstance(val, bool):
                        values.append("TRUE" if val else "FALSE")
                    else:
                        values.append(str(val))
                else:
                    escaped_str = str(val).replace("'", "''")
                    values.append(f"'{escaped_str}'")
            
            columns_str = ", ".join(columns)
            values_str = ", ".join(values)
            lines.append(f"INSERT INTO `{table_name}` ({columns_str}) VALUES ({values_str});")

        return "\n".join(lines).encode("utf-8")

    else:
        raise ValueError(f"Unsupported export format: {format_type}")

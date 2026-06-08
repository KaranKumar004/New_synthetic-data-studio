import json
import re
from typing import Dict, Any
import google.generativeai as genai
from backend.config import settings

# Supported standard types list to guide the LLM
SUPPORTED_TYPES = [
    "Name", "First Name", "Last Name", "Age", "Gender", "Email", "Phone Number", 
    "Address", "City", "State", "Country", "Postal Code", "Date", "Datetime", 
    "Currency", "Product Name", "Company Name", "Employee ID", "Customer ID", 
    "UUID", "Boolean", "Integer", "Float", "Categories", "Custom Text",
    "Disease / Diagnosis", "Medical Symptoms", "Medical Cause", "Medical Treatment", "Medical Severity",
    "Crop Type", "Soil Type", "Water Source", "Fertilizer Used", "Yield Level",
    "Transaction Type", "Merchant Category", "Card Type", "Risk Score",
    "Course / Major", "Graduation Status", "Career Path",
    "Case Type", "Verdict / Outcome",
    "Department Name", "Employee Role", "Performance Rating",
    "Product Category", "Service Type", "Asset Type", "Operating System",
    "Location Type", "Campaign Type", "Marketing Channel"
]

SYSTEM_PROMPT = f"""
You are the AI Schema Generator for "Synthetic Data Studio".
Your job is to parse a natural language request from a user wanting synthetic data and output a structured JSON schema that our generator engine can process.

The supported data types are:
{json.dumps(SUPPORTED_TYPES)}

Format your output STRICTLY as a JSON object (no markdown tags, no backticks, just raw JSON). The JSON must match the following structure:
{{
  "name": "Dataset Name",
  "rows": 100,  // Extract the number of records requested (default to 100 if unspecified)
  "locale": "en_US", // Infer locale (e.g. "en_IN" for India/Indian, "en_US" for US, "en_GB" for UK)
  "tables": [
    {{
      "name": "table_name", // lowercase, snake_case
      "rows": 100,
      "columns": [
        {{
          "name": "column_name", // lowercase, snake_case
          "type": "One of the supported data types above",
          "null_pct": 0, // default 0, increase if user explicitly asks for missing/null values
          "config": {{
            // Optional configurations:
            // - For 'Integer' or 'Float' or 'Currency': {{"min": 1, "max": 100, "distribution": "uniform"}}
            // - For 'Employee ID' or 'Customer ID': {{"prefix": "EMP-"}}
            // - For 'Categories': {{"categories": ["Cat A", "Cat B"], "weights": [0.7, 0.3]}}
            // - For 'Boolean': {{"true_percentage": 50}}
            // - For relational fields (foreign keys): {{"foreign_key": "parent_table.parent_column"}}
          }}
        }}
      ]
    }}
  ]
}}

Example:
If user prompt is: "I need 10,000 customer records for an Indian e-commerce company with customer_id, name, age, gender, city, state, email, phone number, annual_income, purchase_count, and customer_segment."
Output JSON:
{{
  "name": "Indian E-Commerce Customers",
  "rows": 10000,
  "locale": "en_IN",
  "tables": [
    {{
      "name": "customers",
      "rows": 10000,
      "columns": [
        {{"name": "customer_id", "type": "Customer ID", "null_pct": 0, "config": {{"prefix": "CUST-"}}}},
        {{"name": "name", "type": "Name", "null_pct": 0, "config": {{}}}},
        {{"name": "age", "type": "Age", "null_pct": 0, "config": {{"min": 18, "max": 75}}}},
        {{"name": "gender", "type": "Gender", "null_pct": 0, "config": {{}}}},
        {{"name": "city", "type": "City", "null_pct": 0, "config": {{}}}},
        {{"name": "state", "type": "State", "null_pct": 0, "config": {{}}}},
        {{"name": "email", "type": "Email", "null_pct": 0, "config": {{}}}},
        {{"name": "phone_number", "type": "Phone Number", "null_pct": 0, "config": {{}}}},
        {{"name": "annual_income", "type": "Currency", "null_pct": 0, "config": {{"min": 150000, "max": 3000000}}}},
        {{"name": "purchase_count", "type": "Integer", "null_pct": 0, "config": {{"min": 0, "max": 100}}}},
        {{"name": "customer_segment", "type": "Categories", "null_pct": 0, "config": {{"categories": ["Bronze", "Silver", "Gold", "Platinum"]}}}}
      ]
    }}
  ]
}}
"""

def generate_offline_fallback(prompt: str) -> Dict[str, Any]:
    """
    Generates a schema locally if Gemini API is not available or fails.
    Uses regex and keyword matching.
    """
    # Try to extract row count
    rows = 100
    rows_match = re.search(r"(\d+[\d,]*)\s+(records|rows|customers|users|employees|students|patients|orders|items|record|row|customer|user|employee|student|patient|order|item|people|profile)s?", prompt, re.IGNORECASE)
    if rows_match:
        try:
            rows = int(rows_match.group(1).replace(",", ""))
        except ValueError:
            pass

    # Try to extract locale
    locale = "en_US"
    if any(k in prompt.lower() for k in ["india", "indian", "delhi", "mumbai"]):
        locale = "en_IN"
    elif any(k in prompt.lower() for k in ["uk", "british", "london"]):
        locale = "en_GB"

    # Default name
    dataset_name = "Custom Synthetic Dataset"
    if "ecommerce" in prompt.lower() or "customer" in prompt.lower():
        dataset_name = "E-Commerce Customers"
    elif "patient" in prompt.lower() or "hospital" in prompt.lower() or "medical" in prompt.lower():
        dataset_name = "Patient Database"
    elif "employee" in prompt.lower() or "hr" in prompt.lower():
        dataset_name = "Employee Registry"

    # Match fields in prompt
    columns = []
    
    # Check for IDs
    if "customer_id" in prompt.lower() or "customer id" in prompt.lower():
        columns.append({"name": "customer_id", "type": "Customer ID", "null_pct": 0, "config": {"prefix": "CUST-"}})
    elif "employee_id" in prompt.lower() or "employee id" in prompt.lower():
        columns.append({"name": "employee_id", "type": "Employee ID", "null_pct": 0, "config": {"prefix": "EMP-"}})
    elif "id" in prompt.lower():
        columns.append({"name": "id", "type": "UUID", "null_pct": 0, "config": {}})

    # Name fields
    if "first name" in prompt.lower() or "first_name" in prompt.lower():
        columns.append({"name": "first_name", "type": "First Name", "null_pct": 0, "config": {}})
        columns.append({"name": "last_name", "type": "Last Name", "null_pct": 0, "config": {}})
    elif "name" in prompt.lower():
        columns.append({"name": "name", "type": "Name", "null_pct": 0, "config": {}})

    # Standard fields
    if "age" in prompt.lower():
        columns.append({"name": "age", "type": "Age", "null_pct": 0, "config": {"min": 18, "max": 75}})
    if "gender" in prompt.lower():
        columns.append({"name": "gender", "type": "Gender", "null_pct": 0, "config": {}})
    if "email" in prompt.lower():
        columns.append({"name": "email", "type": "Email", "null_pct": 0, "config": {}})
    if "phone" in prompt.lower() or "mobile" in prompt.lower():
        columns.append({"name": "phone_number", "type": "Phone Number", "null_pct": 0, "config": {}})
    if "address" in prompt.lower():
        columns.append({"name": "address", "type": "Address", "null_pct": 0, "config": {}})
    if "city" in prompt.lower():
        columns.append({"name": "city", "type": "City", "null_pct": 0, "config": {}})
    if "state" in prompt.lower():
        columns.append({"name": "state", "type": "State", "null_pct": 0, "config": {}})
    if "country" in prompt.lower():
        columns.append({"name": "country", "type": "Country", "null_pct": 0, "config": {}})
    if "postal" in prompt.lower() or "zip" in prompt.lower() or "pincode" in prompt.lower():
        columns.append({"name": "postal_code", "type": "Postal Code", "null_pct": 0, "config": {}})
    if "date" in prompt.lower():
        columns.append({"name": "created_at", "type": "Datetime", "null_pct": 0, "config": {}})
    if "income" in prompt.lower() or "salary" in prompt.lower() or "revenue" in prompt.lower() or "price" in prompt.lower():
        col_name = "annual_income" if "income" in prompt.lower() else "salary"
        columns.append({"name": col_name, "type": "Currency", "null_pct": 0, "config": {"min": 1000, "max": 100000}})
    if "count" in prompt.lower() or "quantity" in prompt.lower() or "amount" in prompt.lower():
        col_name = "purchase_count" if "count" in prompt.lower() else "amount"
        columns.append({"name": col_name, "type": "Integer", "null_pct": 0, "config": {"min": 0, "max": 50}})
    if "segment" in prompt.lower() or "status" in prompt.lower() or "level" in prompt.lower():
        col_name = "segment" if "segment" in prompt.lower() else "status"
        columns.append({"name": col_name, "type": "Categories", "null_pct": 0, "config": {"categories": ["Low", "Medium", "High"]}})

    # Domain specific keywords detection
    # Healthcare
    if any(k in prompt.lower() for k in ["disease", "diagnosis", "condition"]):
        columns.append({"name": "diagnosis", "type": "Disease / Diagnosis", "null_pct": 0, "config": {}})
    if any(k in prompt.lower() for k in ["symptom", "symptoms"]):
        columns.append({"name": "symptoms", "type": "Medical Symptoms", "null_pct": 0, "config": {}})
    if any(k in prompt.lower() for k in ["cause", "causes", "etiology"]):
        columns.append({"name": "cause", "type": "Medical Cause", "null_pct": 0, "config": {}})
    if any(k in prompt.lower() for k in ["treatment", "medication"]):
        columns.append({"name": "treatment", "type": "Medical Treatment", "null_pct": 0, "config": {}})
    if "severity" in prompt.lower():
        columns.append({"name": "severity", "type": "Medical Severity", "null_pct": 0, "config": {}})
        
    # Agriculture
    if "crop" in prompt.lower():
        columns.append({"name": "crop_type", "type": "Crop Type", "null_pct": 0, "config": {}})
    if "soil" in prompt.lower():
        columns.append({"name": "soil_type", "type": "Soil Type", "null_pct": 0, "config": {}})
    if "fertilizer" in prompt.lower():
        columns.append({"name": "fertilizer_used", "type": "Fertilizer Used", "null_pct": 0, "config": {}})
    if "yield" in prompt.lower():
        columns.append({"name": "yield_level", "type": "Yield Level", "null_pct": 0, "config": {}})
        
    # Finance
    if "transaction" in prompt.lower() or "tx" in prompt.lower():
        columns.append({"name": "transaction_type", "type": "Transaction Type", "null_pct": 0, "config": {}})
    if "card" in prompt.lower():
        columns.append({"name": "card_type", "type": "Card Type", "null_pct": 0, "config": {}})
    if "risk" in prompt.lower():
        columns.append({"name": "risk_score", "type": "Risk Score", "null_pct": 0, "config": {}})
        
    # Education
    if "course" in prompt.lower() or "major" in prompt.lower():
        columns.append({"name": "course", "type": "Course / Major", "null_pct": 0, "config": {}})
    if "career" in prompt.lower() or "outcome" in prompt.lower():
        columns.append({"name": "career_path", "type": "Career Path", "null_pct": 0, "config": {}})
        
    # Legal
    if "case" in prompt.lower():
        columns.append({"name": "case_type", "type": "Case Type", "null_pct": 0, "config": {}})
    if "verdict" in prompt.lower() or "outcome" in prompt.lower():
        columns.append({"name": "verdict", "type": "Verdict / Outcome", "null_pct": 0, "config": {}})
        
    # HR
    if "department" in prompt.lower():
        columns.append({"name": "department", "type": "Department Name", "null_pct": 0, "config": {}})
    if "role" in prompt.lower() or "designation" in prompt.lower():
        columns.append({"name": "role", "type": "Employee Role", "null_pct": 0, "config": {}})
        
    # Technology
    if "asset" in prompt.lower():
        columns.append({"name": "asset_type", "type": "Asset Type", "null_pct": 0, "config": {}})
    if "os" in prompt.lower() or "operating system" in prompt.lower():
        columns.append({"name": "operating_system", "type": "Operating System", "null_pct": 0, "config": {}})
        
    # Environment
    if "location" in prompt.lower() or "habitat" in prompt.lower():
        columns.append({"name": "location_type", "type": "Location Type", "null_pct": 0, "config": {}})
    if "temperature" in prompt.lower() or "weather" in prompt.lower():
        columns.append({"name": "temp", "type": "Float", "null_pct": 0, "config": {"min": -10, "max": 45}})

    # If no fields detected, generate a simple default table
    if not columns:
        columns = [
            {"name": "id", "type": "UUID", "null_pct": 0, "config": {}},
            {"name": "name", "type": "Name", "null_pct": 0, "config": {}},
            {"name": "email", "type": "Email", "null_pct": 0, "config": {}},
            {"name": "age", "type": "Age", "null_pct": 0, "config": {"min": 18, "max": 65}},
            {"name": "city", "type": "City", "null_pct": 0, "config": {}}
        ]

    # Guess table name
    t_name = "customers"
    if "patient" in prompt.lower():
        t_name = "patients"
    elif "employee" in prompt.lower():
        t_name = "employees"
    elif "order" in prompt.lower():
        t_name = "orders"

    return {
        "name": dataset_name,
        "rows": rows,
        "locale": locale,
        "tables": [
            {
                "name": t_name,
                "rows": rows,
                "columns": columns
            }
        ]
    }

def infer_schema_with_ai(prompt: str) -> Dict[str, Any]:
    """
    Sends the prompt to Gemini for schema inference.
    Falls back to generate_offline_fallback if key is not configured or errors out.
    """
    api_key = settings.GEMINI_API_KEY
    if not api_key:
        return generate_offline_fallback(prompt)

    try:
        genai.configure(api_key=api_key)
        # We can use gemini-1.5-flash which is standard and fast
        model = genai.GenerativeModel("gemini-1.5-flash")
        
        response = model.generate_content(
            f"{SYSTEM_PROMPT}\n\nUser Prompt: {prompt}",
            generation_config={"response_mime_type": "application/json"}
        )
        
        result_text = response.text.strip()
        # Clean potential markdown block wrappers just in case
        if result_text.startswith("```json"):
            result_text = result_text.replace("```json", "", 1)
        if result_text.endswith("```"):
            result_text = result_text[:-3]
        
        result_text = result_text.strip()
        return json.loads(result_text)
    except Exception as e:
        # Log error in standard stderr print, fallback to offline generator
        print(f"Gemini API schema inference failed: {str(e)}. Falling back to offline engine.")
        return generate_offline_fallback(prompt)

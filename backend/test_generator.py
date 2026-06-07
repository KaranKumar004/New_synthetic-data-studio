import pytest
import pandas as pd
import json
import io
from backend.generator import SyntheticDataEngine, RelationalDatasetGenerator, export_data
from backend.ai_engine import generate_offline_fallback

def test_engine_single_values():
    engine = SyntheticDataEngine(locale="en_US")
    
    # Test multiple types
    name = engine.generate_value("Name", 0)
    assert isinstance(name, str)
    assert len(name) > 0

    age = engine.generate_value("Age", 0, config={"min": 20, "max": 40})
    assert isinstance(age, int)
    assert 20 <= age <= 40

    email = engine.generate_value("Email", 0)
    assert "@" in email

    uuid_val = engine.generate_value("UUID", 0)
    assert len(uuid_val) == 36 # UUID4 string length

    boolean = engine.generate_value("Boolean", 0, config={"true_percentage": 100})
    assert boolean is True

def test_engine_null_percentage():
    engine = SyntheticDataEngine(locale="en_US")
    columns = [
        {"name": "id", "type": "UUID", "null_pct": 0},
        {"name": "notes", "type": "Custom Text", "null_pct": 100} # always null
    ]
    
    rows = engine.generate_table(columns, num_rows=10)
    assert len(rows) == 10
    for r in rows:
        assert r["id"] is not None
        assert r["notes"] is None

def test_relational_referential_integrity():
    generator = RelationalDatasetGenerator(locale="en_US")
    
    # Define simple parent-child relational config
    tables_config = {
        "tables": [
            {
                "name": "departments",
                "rows": 5,
                "columns": [
                    {"name": "dept_id", "type": "Customer ID", "config": {"prefix": "DEPT-"}},
                    {"name": "name", "type": "Company Name"}
                ]
            },
            {
                "name": "employees",
                "rows": 20,
                "columns": [
                    {"name": "emp_id", "type": "Employee ID", "config": {"prefix": "EMP-"}},
                    {"name": "name", "type": "Name"},
                    {"name": "dept_id", "type": "Customer ID", "config": {"foreign_key": "departments.dept_id"}}
                ]
            }
        ]
    }

    dataset = generator.generate_relational_dataset(tables_config)
    
    assert "departments" in dataset
    assert "employees" in dataset
    assert len(dataset["departments"]) == 5
    assert len(dataset["employees"]) == 20

    # Collect department keys
    dept_ids = {d["dept_id"] for d in dataset["departments"]}
    
    # Assert every employee is linked to a valid department key
    for emp in dataset["employees"]:
        assert emp["dept_id"] in dept_ids

def test_offline_schema_parser():
    prompt = "I want 500 patient profiles for a clinic, with name, age, dob, phone, address, and medical_status categories."
    schema = generate_offline_fallback(prompt)
    
    assert schema["rows"] == 500
    assert len(schema["tables"]) == 1
    table = schema["tables"][0]
    assert table["name"] in ["patients", "customers", "employees"]
    
    column_names = {c["name"] for c in table["columns"]}
    assert "name" in column_names
    assert "age" in column_names
    assert "phone_number" in column_names

def test_export_formats():
    test_data = [
        {"id": 1, "name": "Alice", "score": 95.5},
        {"id": 2, "name": "Bob", "score": 88.0}
    ]

    # Test CSV
    csv_bytes = export_data(test_data, "CSV")
    assert b"Alice" in csv_bytes
    assert b"Bob" in csv_bytes

    # Test JSON
    json_bytes = export_data(test_data, "JSON")
    parsed_json = json.loads(json_bytes.decode())
    assert len(parsed_json) == 2
    assert parsed_json[0]["name"] == "Alice"

    # Test Excel
    xlsx_bytes = export_data(test_data, "XLSX")
    assert len(xlsx_bytes) > 0
    # verify read by pandas excel reader
    df = pd.read_excel(io.BytesIO(xlsx_bytes))
    assert len(df) == 2

    # Test Parquet
    parquet_bytes = export_data(test_data, "PARQUET")
    assert len(parquet_bytes) > 0
    df_pq = pd.read_parquet(io.BytesIO(parquet_bytes))
    assert len(df_pq) == 2

    # Test SQL script
    sql_bytes = export_data(test_data, "SQL", "users")
    sql_text = sql_bytes.decode()
    assert "INSERT INTO `users`" in sql_text
    assert "'Alice'" in sql_text


def test_quality_engine():
    from backend.generator import analyze_dataset_quality
    # Create simple mock relational data
    dataset_data = {
        "users": [
            {"id": "1", "name": "Alice", "email": "alice@gmail.com", "age": 25},
            {"id": "2", "name": "Bob", "email": "bob@gmail.com", "age": 30},
            {"id": "3", "name": None, "email": "invalid_email", "age": "bad_age"}
        ]
    }
    tables_config = [
        {
            "name": "users",
            "columns": [
                {"name": "id", "type": "UUID"},
                {"name": "name", "type": "Name"},
                {"name": "email", "type": "Email"},
                {"name": "age", "type": "Age"}
            ]
        }
    ]

    report = analyze_dataset_quality(dataset_data, tables_config)
    assert "overall" in report
    assert "completeness" in report
    assert "realism" in report
    assert report["overall"] >= 0 and report["overall"] <= 100
    assert len(report["logs"]) > 0


def test_data_drift_simulation():
    from backend.generator import simulate_data_drift
    tables_config = {
        "tables": [
            {
                "name": "sales",
                "rows": 10,
                "columns": [
                    {"name": "tx_id", "type": "UUID"},
                    {"name": "revenue", "type": "Currency", "config": {"min": 100, "max": 500}}
                ]
            }
        ]
    }

    drift = simulate_data_drift(tables_config, locale="en_US", months=3)
    assert len(drift["months"]) == 3
    assert "revenue_trend" in drift["drift_metrics"]
    assert len(drift["drift_metrics"]["revenue_trend"]) == 3
    assert len(drift["datasets"]) == 3


def test_bias_control():
    # Verify that applying category weights operates correctly inside SyntheticDataEngine
    engine = SyntheticDataEngine(locale="en_US")
    columns = [
        {
            "name": "gender",
            "type": "Categories",
            "config": {
                "categories": ["Female", "Male"],
                "weights": [0.90, 0.10]
            }
        }
    ]
    rows = engine.generate_table(columns, num_rows=100)
    female_count = sum(1 for r in rows if r["gender"] == "Female")
    # With 90% target, out of 100 trials, should be highly biased towards Female
    assert female_count > 60


def test_ai_training_presets():
    from backend.ai_training_generator import generate_ai_training_data_offline, generate_conversation_offline
    # Test QA Synthesizer offline fallback
    records = generate_ai_training_data_offline("Question Answering", "Healthcare", 5)
    assert len(records) == 5
    assert "question" in records[0]
    assert "answer" in records[0]

    # Test Instruction Tuning format
    instructions = generate_ai_training_data_offline("Instruction Tuning", "Legal", 3)
    assert len(instructions) == 3
    assert "instruction" in instructions[0]
    assert "output" in instructions[0]

    # Test dialogues
    dialogues = generate_conversation_offline("Healthcare", 6, "Empathetic", "English")
    assert len(dialogues) == 6
    assert "sender" in dialogues[0]
    assert "text" in dialogues[0]


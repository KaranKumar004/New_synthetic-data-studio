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

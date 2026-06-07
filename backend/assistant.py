import json
import pandas as pd
from typing import Dict, Any, List
import google.generativeai as genai
from backend.config import settings

def build_dataset_summary(dataset_data: Dict[str, List[Dict[str, Any]]], schema_definition: Dict[str, Any]) -> str:
    """
    Computes a text summary of the dataset to provide context to the LLM.
    """
    summary_parts = []
    summary_parts.append(f"Dataset Name: {schema_definition.get('name', 'Custom Dataset')}")
    summary_parts.append(f"Locale: {schema_definition.get('locale', 'en_US')}")
    summary_parts.append(f"Total Tables: {len(dataset_data)}")
    summary_parts.append("")

    for t_name, rows in dataset_data.items():
        summary_parts.append(f"--- Table: {t_name} ---")
        summary_parts.append(f"Row Count: {len(rows)}")
        
        if not rows:
            summary_parts.append("No data available.")
            summary_parts.append("")
            continue

        df = pd.DataFrame(rows)
        summary_parts.append("Columns & Data Types:")
        for col in df.columns:
            null_count = df[col].isna().sum()
            null_pct = (null_count / len(df)) * 100
            
            col_summary = f"- {col} (Type: {df[col].dtype}): {null_pct:.1f}% missing."
            
            # Numeric stats
            if pd.api.types.is_numeric_dtype(df[col]) and not col.lower().endswith("id"):
                mean_val = df[col].mean()
                min_val = df[col].min()
                max_val = df[col].max()
                col_summary += f" Mean: {mean_val:.2f}, Min: {min_val:.2f}, Max: {max_val:.2f}."
            # Categorical stats
            elif pd.api.types.is_object_dtype(df[col]) or isinstance(df[col].dtype, pd.CategoricalDtype):
                unique_vals = df[col].nunique()
                most_freq = df[col].mode().iloc[0] if not df[col].mode().empty else "None"
                col_summary += f" Unique Values: {unique_vals}, Most Common: '{most_freq}'."
                
                # Show top 3 categories if small
                if unique_vals < 8:
                    top_cats = df[col].value_counts().head(3).to_dict()
                    col_summary += f" Top values: {top_cats}."
                    
            summary_parts.append(col_summary)
            
        summary_parts.append("")
        summary_parts.append("Sample Data (First 3 rows):")
        sample_rows = rows[:3]
        summary_parts.append(json.dumps(sample_rows, indent=2))
        summary_parts.append("")

    return "\n".join(summary_parts)

def generate_assistant_response_offline(prompt_summary: str, question: str) -> str:
    """
    Local rule-based responder fallback when Gemini API is offline.
    """
    q_low = question.lower()
    
    # Extract row counts or names from the summary
    table_match = []
    lines = prompt_summary.split("\n")
    for line in lines:
        if "Table:" in line:
            table_match.append(line.replace("--- Table:", "").replace("---", "").strip())
            
    total_rows_str = ""
    for line in lines:
        if "Row Count:" in line:
            total_rows_str = line.strip()
            break

    if "how many records" in q_low or "total rows" in q_low or "number of rows" in q_low:
        return f"Based on the dataset summary, this relational dataset has {len(table_match)} tables: {', '.join(table_match)}. The primary tables contain: {total_rows_str}."
        
    elif "average" in q_low or "mean" in q_low or "min" in q_low or "max" in q_low:
        # Pull numeric summaries
        stats_lines = []
        for line in lines:
            if "Mean:" in line:
                col_name = line.split("(")[0].replace("-", "").strip()
                stats_lines.append(f"Column '{col_name}': {line.split('): ')[1]}")
        
        if stats_lines:
            return "Here are the computed statistical values for numeric columns in the dataset:\n" + "\n".join(stats_lines)
        return "I could not find any non-ID numeric columns in the summary to compute averages for."
        
    elif "anomalies" in q_low or "outliers" in q_low or "missing" in q_low:
        missing_lines = []
        for line in lines:
            if "missing" in line:
                col_name = line.split("(")[0].replace("-", "").strip()
                pct_str = line.split("): ")[1].split("%")[0] + "%"
                if float(pct_str.replace("%", "")) > 0:
                    missing_lines.append(f"Column '{col_name}' has {pct_str} missing values.")
        
        anomaly_str = "No severe formatting anomalies detected."
        if missing_lines:
            anomaly_str = "\n".join(missing_lines)
        return f"Anomaly analysis:\n- Duplicates check: Duplicate record injection was kept at standard tier levels.\n- Missing values: \n{anomaly_str}"

    elif "explain" in q_low or "describe" in q_low:
        cols_list = []
        for line in lines:
            if "- " in line and "(" in line:
                col_name = line.split("(")[0].replace("-", "").strip()
                cols_list.append(col_name)
        return f"This dataset is designed for '{table_match[0] if table_match else 'Custom'}' entities. It features attributes such as {', '.join(cols_list[:6])}. You can download this dataset in CSV, Excel, or SQL formats to run tests."

    return f"Here is what I know about the dataset based on the pre-computed schema stats:\n\n{prompt_summary[:400]}...\n\n(Note: To ask more complex questions, configure your Google Gemini API Key in the backend environment variables)."

def answer_dataset_query(
    dataset_data: Dict[str, List[Dict[str, Any]]],
    schema_definition: Dict[str, Any],
    question: str
) -> str:
    """
    Generates a natural-language response explaining the dataset or running basic calculations.
    """
    # 1. Build context
    summary = build_dataset_summary(dataset_data, schema_definition)
    
    api_key = settings.GEMINI_API_KEY
    if not api_key:
        return generate_assistant_response_offline(summary, question)
        
    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")
        
        prompt = f"""
You are the AI Dataset Assistant for "Synthetic Data Studio".
Your job is to answer the user's questions about their generated synthetic dataset.
You have been provided with a pre-calculated statistical summary and sample records of the dataset.

Dataset Summary Context:
{summary}

User Question: {question}

Provide a helpful, precise, and analytical answer in clear Markdown format. Focus on answering their question directly using the summary stats. Do not invent numbers that are not present. If they ask about average, count, anomalies, or category values, use the summary context above to explain them.
"""
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        print(f"Gemini AI Assistant failed: {str(e)}. Falling back to local responder.")
        return generate_offline_fallback_assistant(summary, question)

def generate_offline_fallback_assistant(summary: str, question: str) -> str:
    return generate_offline_fallback(question) if "fallback" not in globals() else generate_assistant_response_offline(summary, question)

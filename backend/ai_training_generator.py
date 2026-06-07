import json
import random
from typing import List, Dict, Any, Optional
import google.generativeai as genai
from backend.config import settings

# --- OFFLINE FALLBACK DICTIONARIES ---

OFFLINE_TRAINING_BANK = {
    "healthcare": {
        "instruction_tuning": [
            {"instruction": "Explain the side effects of Ibuprofen.", "input": "", "output": "Common side effects of Ibuprofen include stomach upset, nausea, headache, dizziness, and mild heartburn. Long-term use can lead to gastrointestinal bleeding or kidney problems."},
            {"instruction": "Identify symptoms of Type 2 Diabetes.", "input": "Patient reports fatigue and frequent urination.", "output": "Symptoms match classic signs of Type 2 Diabetes: fatigue, frequent urination (polyuria), increased thirst (polydipsia), and unexplained weight loss. Diagnostics should include HbA1c testing."}
        ],
        "qa": [
            {"question": "What is hypertension?", "answer": "Hypertension is a chronic medical condition where the blood pressure in the arteries is persistently elevated (typically 130/80 mmHg or higher)."},
            {"question": "How often should adults get cholesterol checked?", "answer": "Healthy adults should get their cholesterol levels checked every 4 to 6 years. Those with cardiovascular risk factors should be checked more frequently."}
        ],
        "rag": [
            {"context": "Patient John Doe is a 45-year-old male presenting with a persistent dry cough for 3 weeks. Vital signs: BP 120/80, Temp 98.6F, O2 Sat 98%. No history of smoking. Chest X-ray is clear.", "question": "What are the patient's symptoms and vital signs?", "answer": "The patient has a dry cough for 3 weeks. Vitals are normal: Blood Pressure 120/80 mmHg, Temperature 98.6°F, and Oxygen Saturation 98%."}
        ],
        "classification": [
            {"text": "Patient reports severe chest pain radiating to the left arm.", "label": "EMERGENCY"},
            {"text": "Refill request for standard daily multivitamin capsule.", "label": "ROUTINE"}
        ]
    },
    "finance": {
        "instruction_tuning": [
            {"instruction": "Calculate compound interest.", "input": "Principal: $10,000, Rate: 5%, Years: 3", "output": "Compound Interest = Principal * ((1 + Rate)^Years) - Principal = 10000 * ((1.05)^3) - 10000 = $1,576.25."},
            {"instruction": "Define a market bull run.", "input": "", "output": "A bull run is a financial market condition characterized by persistently rising stock prices, high investor confidence, and an expectation of strong economic performance."}
        ],
        "qa": [
            {"question": "What is a mutual fund?", "answer": "A mutual fund is an investment vehicle made up of a pool of funds collected from many investors for the purpose of investing in securities such as stocks, bonds, and money market instruments."},
            {"question": "What does ROI stand for?", "answer": "ROI stands for Return on Investment, a metric used to evaluate the efficiency or profitability of an investment."}
        ],
        "rag": [
            {"context": "Under the new company policy, quarterly dividends will be distributed on the 15th of the month following quarter-end. The dividend rate is set at $0.45 per share for common stock holders.", "question": "What is the dividend rate for common stock?", "answer": "The dividend rate is $0.45 per share."}
        ],
        "classification": [
            {"text": "Highly volatile tech stock with P/E ratio exceeding 120.", "label": "HIGH_RISK"},
            {"text": "US Treasury Bonds yielding guaranteed 4.2% annually.", "label": "LOW_RISK"}
        ]
    },
    "retail": {
        "instruction_tuning": [
            {"instruction": "Draft a customer support response for a delayed shipping complaint.", "input": "Order ID: 90210, Customer: Jane Smith", "output": "Dear Jane, we sincerely apologize for the delay in shipping your order #90210. Due to heavy seasonal volume, it is now scheduled to arrive this Friday. We have credited $10 to your account."}
        ],
        "qa": [
            {"question": "What is inventory turnover ratio?", "answer": "Inventory turnover is a ratio showing how many times a company has sold and replaced inventory during a given period."}
        ],
        "rag": [
            {"context": "Return Policy: Customers can return unopened products within 30 days of purchase for a full refund. Opened items are subject to a 15% restocking fee. Return shipping is free.", "question": "What is the return window for unopened products?", "answer": "The return window is 30 days from the purchase date."}
        ],
        "classification": [
            {"text": "I ordered this product 2 weeks ago and it still hasn't shipped!", "label": "COMPLAINT"},
            {"text": "Is this product compatible with Apple HomeKit devices?", "label": "INQUIRY"}
        ]
    }
}

# General fallback keys if domain is not directly mapped
OFFLINE_TRAINING_BANK["legal"] = OFFLINE_TRAINING_BANK["finance"]
OFFLINE_TRAINING_BANK["education"] = OFFLINE_TRAINING_BANK["healthcare"]
OFFLINE_TRAINING_BANK["logistics"] = OFFLINE_TRAINING_BANK["retail"]
OFFLINE_TRAINING_BANK["customer_support"] = OFFLINE_TRAINING_BANK["retail"]

# Conversations fallback templates
OFFLINE_CONVERSATIONS_TEMPLATES = {
    "customer_support": [
        {"sender": "Customer", "text": "Hello, I received my package yesterday, but the screen is cracked. Can I get a replacement?"},
        {"sender": "Support Agent", "text": "Hello! I am so sorry to hear that. Let me assist you with this immediately. Could you please provide your Order ID?"},
        {"sender": "Customer", "text": "Yes, my Order ID is #SDS-49204."},
        {"sender": "Support Agent", "text": "Thank you. I see the order. I have initiated a replacement order at no charge. You will receive a shipping confirmation email shortly."},
        {"sender": "Customer", "text": "That was very quick! Thank you so much for the help."},
        {"sender": "Support Agent", "text": "You are very welcome! Let me know if you need anything else. Have a wonderful day!"}
    ],
    "healthcare": [
        {"sender": "Patient", "text": "Doctor, I have been feeling dizzy and having slight headaches in the afternoons for the past week."},
        {"sender": "Doctor", "text": "Hello. Dizziness and headaches can stem from a few areas. Have you been drinking enough water, or changed your caffeine intake?"},
        {"sender": "Patient", "text": "Actually, I have been drinking a lot of coffee lately because of work deadlines, and probably neglecting water."},
        {"sender": "Doctor", "text": "Dehydration combined with a caffeine spike is a common trigger. Let's start by cutting back coffee to 1 cup, and increasing daily water to 2.5 liters. If symptoms persist, we will run blood pressure checks."},
        {"sender": "Patient", "text": "Alright, I will try that starting today. Thank you, doctor."},
        {"sender": "Doctor", "text": "You are welcome. Keep a daily log of the headaches. Check in if it worsens."}
    ],
    "finance": [
        {"sender": "Customer", "text": "Hi, I am looking to invest some savings. What are the current rates on a 12-month Certificate of Deposit (CD)?"},
        {"sender": "Bank Agent", "text": "Hello! Our current rate on a 12-month CD is 4.75% APY, with a minimum deposit of $1,000. Interest compounds monthly."},
        {"sender": "Customer", "text": "Is there a penalty if I need to withdraw the funds before the 12 months are up?"},
        {"sender": "Bank Agent", "text": "Yes, early withdrawal penalties apply, which equal 90 days of interest. If you need liquidity, we recommend our High-Yield Savings account yielding 4.25%."},
        {"sender": "Customer", "text": "Understood. The CD rate is better, so I will lock in the CD with $10,000. Let's set it up."},
        {"sender": "Bank Agent", "text": "Perfect, let me prepare the transfer paperwork. I will need to verify your account number."}
    ]
}

# Mappings for other industries
OFFLINE_CONVERSATIONS_TEMPLATES["sales"] = OFFLINE_CONVERSATIONS_TEMPLATES["finance"]
OFFLINE_CONVERSATIONS_TEMPLATES["education"] = OFFLINE_CONVERSATIONS_TEMPLATES["healthcare"]

# --- CORE IMPLEMENTATION ---

def generate_ai_training_data_offline(
    task_type: str,
    domain: str,
    num_records: int
) -> List[Dict[str, Any]]:
    """
    Generates synthetic training records locally using pre-coded arrays.
    Duplicates or slightly modifies records to match requested num_records.
    """
    domain_key = domain.lower().replace(" ", "_")
    task_key = task_type.lower().replace(" ", "_")
    
    # Get domain bank
    domain_bank = OFFLINE_TRAINING_BANK.get(domain_key, OFFLINE_TRAINING_BANK["retail"])
    # Get task list
    records = domain_bank.get(task_key, domain_bank["qa"])
    
    output = []
    for i in range(num_records):
        base_record = records[i % len(records)].copy()
        # Add slight modifications to make each row distinct
        if "instruction" in base_record:
            # Append variant ID
            base_record["output"] = base_record["output"] + f" [Ref-Batch {i+1}]"
        elif "question" in base_record:
            base_record["answer"] = base_record["answer"] + f" (Ref: {i+1})"
        elif "context" in base_record:
            base_record["question"] = base_record["question"] + f" [ID {i+1}]"
        elif "text" in base_record:
            base_record["text"] = base_record["text"] + f" (Code {100 + i})"
            
        output.append(base_record)
        
    return output

def generate_ai_training_data_with_ai(
    task_type: str,
    domain: str,
    num_records: int
) -> List[Dict[str, Any]]:
    """
    Queries Gemini to synthesize unique training data records in target formats.
    """
    api_key = settings.GEMINI_API_KEY
    if not api_key:
        return generate_ai_training_data_offline(task_type, domain, num_records)
        
    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")
        
        # Guide LLM on structure format
        format_guide = ""
        if task_type == "Instruction Tuning":
            format_guide = '{"instruction": "...", "input": "...", "output": "..."}'
        elif task_type == "Question Answering":
            format_guide = '{"question": "...", "answer": "..."}'
        elif task_type == "RAG Datasets":
            format_guide = '{"context": "...", "question": "...", "answer": "..."}'
        elif task_type == "Classification Datasets":
            format_guide = '{"text": "...", "label": "..."}'
        else:
            format_guide = '{"question": "...", "answer": "..."}'

        prompt = f"""
You are an AI data synthesis engine.
Generate exactly {num_records} unique, high-quality training records for {domain} domain.
The dataset type is {task_type}.
Each record must follow this JSON structure:
{format_guide}

Format your output strictly as a JSON array (no markdown tags, no backticks, just raw JSON). Do not include anything else in your response except the JSON array.
"""
        response = model.generate_content(prompt)
        text = response.text.strip()
        if text.startswith("```json"):
            text = text.replace("```json", "", 1)
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()
        
        records = json.loads(text)
        if isinstance(records, list):
            return records[:num_records]
        return generate_ai_training_data_offline(task_type, domain, num_records)
    except Exception as e:
        print(f"Gemini training data generation failed: {str(e)}. Falling back to offline bank.")
        return generate_ai_training_data_offline(task_type, domain, num_records)


# --- SYNTHETIC CONVERSATIONS GENERATION ---

def generate_conversation_offline(
    industry: str,
    length: int,
    tone: str,
    language: str
) -> List[Dict[str, Any]]:
    """
    Generates a single conversation dialogue script offline.
    """
    ind_key = industry.lower().replace(" ", "_")
    base_dialogue = OFFLINE_CONVERSATIONS_TEMPLATES.get(ind_key, OFFLINE_CONVERSATIONS_TEMPLATES["customer_support"])
    
    # Adjust conversation length
    turns = []
    roles = list(set([t["sender"] for t in base_dialogue]))
    if not roles:
        roles = ["User", "Agent"]
        
    for i in range(length):
        base_turn = base_dialogue[i % len(base_dialogue)]
        text = base_turn["text"]
        # Translate or tone adjust mock indicators
        if language.lower() in ["spanish", "es"]:
            text = "[ES] " + text
        elif language.lower() in ["hindi", "hi"]:
            text = "[HI] " + text
            
        turns.append({
            "sender": base_turn["sender"],
            "text": f"({tone}) {text}"
        })
        
    return turns

def generate_conversation_with_ai(
    industry: str,
    length: int,
    tone: str,
    language: str
) -> List[Dict[str, Any]]:
    """
    Queries Gemini to generate a realistic conversation dialogue between entities.
    """
    api_key = settings.GEMINI_API_KEY
    if not api_key:
        return generate_conversation_offline(industry, length, tone, language)
        
    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")
        
        # Map roles based on industry
        roles_guide = ""
        if industry.lower() == "healthcare":
            roles_guide = "Doctor and Patient"
        elif industry.lower() == "customer_support":
            roles_guide = "Customer and Support Agent"
        elif industry.lower() == "finance":
            roles_guide = "Bank Agent and Customer"
        elif industry.lower() == "sales":
            roles_guide = "Sales Representative and Lead"
        elif industry.lower() == "education":
            roles_guide = "Teacher and Student"
        else:
            roles_guide = "User and Agent"

        prompt = f"""
Generate a single highly realistic dialogue conversation script between {roles_guide}.
The conversation must have exactly {length} turns (alternating messages).
The industry domain is: {industry}.
The tone of the conversation must be: {tone}.
The language of the conversation must be: {language}.

Format the output strictly as a JSON array of messages, where each message has a 'sender' (e.g. 'Doctor', 'Patient') and 'text'.
JSON format:
[
  {{"sender": "...", "text": "..."}},
  ...
]

Do not include markdown headers, backticks, or any conversational responses. Just return the raw JSON array.
"""
        response = model.generate_content(prompt)
        text = response.text.strip()
        if text.startswith("```json"):
            text = text.replace("```json", "", 1)
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()
        
        messages = json.loads(text)
        if isinstance(messages, list):
            return messages[:length]
        return generate_conversation_offline(industry, length, tone, language)
    except Exception as e:
        print(f"Gemini conversation generation failed: {str(e)}. Falling back to offline generator.")
        return generate_conversation_offline(industry, length, tone, language)

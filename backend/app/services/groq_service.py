"""Groq-powered AI service for NLP transaction parsing and OCR enrichment."""
import json
import os
from groq import Groq

client = Groq(api_key=os.getenv("GROQ_API_KEY", ""))

SYSTEM_PROMPT = """You are a personal finance assistant for an Indian user. Parse natural language descriptions of financial transactions and extract structured data.

CATEGORY RULES (apply strictly in this order):
1. "protein" → if user mentions protein, whey, creatine, gym supplements, protein powder, mass gainer, or similar
2. "scooty" → if user mentions petrol, fuel, toll, scooter, scooty, bike maintenance, bike repair, tyre, or vehicle-related expenses
3. "dates" → if user mentions dates, date night, OR mentions girlfriend names "kshirin" or "kshir" in ANY form
4. "food" → any food, drink, restaurant, cafe, or meal expense that is NOT protein supplements
5. "salary" → income from job, employment, stipend, monthly pay
6. For everything else use: transport, utilities, entertainment, health, shopping, misc, freelance, investment

Given a text, extract:
- type: "income" or "expense"
- amount: numeric value (float)
- description: short 2-5 word summary
- party: the other party (person, store, company) or null
- category: one of [food, protein, scooty, transport, utilities, entertainment, health, shopping, dates, misc, salary, freelance, investment] or null
- notes: a single natural sentence summarizing what this expense/income was for (e.g. "Bought whey protein for gym sessions" or "Date night dinner with Kshirin")
- confidence: 0.0 to 1.0 confidence score

Respond ONLY with valid JSON, no commentary:
{
  "type": "expense",
  "amount": 450.0,
  "description": "Lunch at Zomato",
  "party": "Zomato",
  "category": "food",
  "notes": "Ordered lunch from Zomato for the afternoon",
  "confidence": 0.95
}"""

OCR_ENRICHMENT_PROMPT = """You are a receipt/bill parsing assistant. Given OCR text from a bill or receipt, extract:
- amount: total amount paid (float)
- party: merchant/store name
- category: one of [food, protein, scooty, transport, utilities, entertainment, health, shopping, dates, misc]
- description: short 2-5 word transaction description
- notes: a one-sentence human-readable summary of what this purchase was for
- date: date if visible (ISO format YYYY-MM-DD) or null
- confidence: 0.0 to 1.0 confidence score

Respond ONLY with valid JSON, no commentary."""


def parse_nlp_transaction(text: str) -> dict:
    """Parse a natural language transaction description using Groq."""
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": text},
        ],
        temperature=0.1,
        max_tokens=256,
    )
    raw = response.choices[0].message.content.strip()
    return json.loads(raw)


def enrich_ocr_text(ocr_text: str) -> dict:
    """Use Groq to extract structured data from raw OCR text of a bill/receipt."""
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": OCR_ENRICHMENT_PROMPT},
            {"role": "user", "content": f"Receipt OCR text:\n{ocr_text}"},
        ],
        temperature=0.1,
        max_tokens=256,
    )
    raw = response.choices[0].message.content.strip()
    return json.loads(raw)


def suggest_category(description: str, party: str | None) -> str:
    """Quick category suggestion for an existing transaction."""
    prompt = f"Transaction: {description}"
    if party:
        prompt += f" with {party}"
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "system",
                "content": (
                    "Respond with a single category word from: "
                    "food, protein, transport, utilities, entertainment, health, shopping, dates, misc, salary, freelance, investment"
                ),
            },
            {"role": "user", "content": prompt},
        ],
        temperature=0.0,
        max_tokens=10,
    )
    return response.choices[0].message.content.strip().lower()

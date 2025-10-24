#!/usr/bin/env python3

"""
Token Calculator for Raw Mode Benchmark Questions

This script calculates the estimated number of prompt tokens used by the raw mode
for each of the 5 benchmark questions in the Sting Sense bus analytics system.

Usage: python calculate_raw_mode_tokens.py
Requirements: Python 3.6+ with pandas (optional for CSV reading)
"""

import json
import csv
import math
import os
from datetime import datetime, timedelta
from typing import List, Dict, Any, Tuple

# Constants from the original system
TOKENS_PER_CHAR_ESTIMATE_LEGACY = 0.35  # Original estimate from splitFeaturesForRawMode  
TOKENS_PER_CHAR_ESTIMATE_MODERN = 4     # More accurate estimate from ContextModeEvaluator (text.length / 4)
RAW_SINGLE_REQUEST_CHAR_LIMIT = 11000
MAX_INPUT_TOKENS = 3000

# Benchmark questions from the system
BENCHMARK_QUESTIONS = [
    {
        "id": "aggressive-driving",
        "question": "Tell me about aggressive driving behaviors around campus",
        "groundTruth": "Should identify Klaus and Student Center as hotspots, mention hard braking or rapid acceleration"
    },
    {
        "id": "dwell-time", 
        "question": "Which parts of campus have the highest dwell time associated with them",
        "groundTruth": "Should mention long pauses near Student Center, CRC, or Klaus with durations over 2 minutes"
    },
    {
        "id": "moderate-behavior",
        "question": "How many instances of moderate driving behavior can be found on campus",
        "groundTruth": "Should provide a numeric count of 'Moderate' behavior events from the dataset"
    },
    {
        "id": "route-efficiency",
        "question": "How efficient was the bus route",
        "groundTruth": "Should mention efficiency ratio and compare traveled distance to straight-line distance"
    },
    {
        "id": "tech-square-patterns",
        "question": "What are the driving patterns like around Tech Square",
        "groundTruth": "Should reference Tech Square and describe behavior types (moderate, aggressive) found there"
    }
]

# Prompt templates from the system
PROMPT_TEMPLATES = {
    "raw": """You are a transportation analyst. You will receive the entire bus telemetry dataset as raw JSON without any preprocessing. Use it to answer the user's question directly, pointing to concrete observations. Respond in plain text only—do not use markdown formatting, bullet points, or special characters—and keep your reply under 200 words.

RAW DATASET (JSON):
{{data}}

USER QUESTION: {{userQuery}}""",

    "rawChunk": """You are a transportation analyst reviewing bus telemetry part {{chunkIndex}} of {{totalChunks}}. The data is raw JSON with no preprocessing. Extract concrete observations (locations, timestamps, behaviors) relevant to the user question. Write in plain text with no markdown, lists, or special characters, keep your response under 120 words, note any potential safety concerns, and focus only on this chunk.

RAW DATA CHUNK:
{{data}}

USER QUESTION: {{userQuery}}""",

    "rawFinal": """You previously reviewed {{chunkCount}} raw telemetry chunks. Combine the analyst notes below into one cohesive answer for the user. Reference the question directly, call out specific patterns or anomalies, and keep the response under 220 words. Produce plain text only—no markdown formatting, bullets, or special characters. {{truncatedNote}}

ANALYST NOTES:
{{data}}

USER QUESTION: {{userQuery}}"""
}


def build_prompt(template: str, query: str, data_summary: str, **extra_replacements) -> str:
    """Build prompt using template replacement"""
    replacements = {"data": data_summary, "userQuery": query, **extra_replacements}
    
    result = template
    for key, value in replacements.items():
        result = result.replace("{{" + key + "}}", str(value))
    
    return result


def estimate_tokens_modern(text: str) -> int:
    """Estimate tokens using the modern approach (text.length / 4)"""
    if not text:
        return 0
    return math.ceil(len(text) / 4)


def estimate_tokens_legacy(text: str) -> int:
    """Estimate tokens using the legacy approach (text.length * 0.35)"""
    if not text:
        return 0
    return math.ceil(len(text) * TOKENS_PER_CHAR_ESTIMATE_LEGACY)


def compress_dataset(data: List[Dict]) -> List[Dict]:
    """Compress dataset similar to the original compressDataset function"""
    return [
        {
            "b": record.get("behavior"),
            "t": record.get("timestamp"),
            "c": record.get("coordinates"),
            "i": record.get("id"),
            "cl": record.get("cluster"),
            "a": record.get("activity")
        }
        for record in data
    ]


def simulate_chunking(data: List[Dict]) -> Dict[str, Any]:
    """Simulate chunking logic from splitFeaturesForRawMode"""
    compressed = compress_dataset(data)
    full_data_string = json.dumps(compressed, indent=2)
    
    # If data fits in single request
    if len(full_data_string) <= RAW_SINGLE_REQUEST_CHAR_LIMIT:
        return {
            "chunks": [full_data_string],
            "isSingleRequest": True,
            "totalChars": len(full_data_string)
        }
    
    # Simulate chunking (simplified version)
    chunk_size = int(RAW_SINGLE_REQUEST_CHAR_LIMIT * 0.8)  # 80% of limit for safety
    chunks = []
    current_pos = 0
    
    while current_pos < len(full_data_string):
        chunk = full_data_string[current_pos:current_pos + chunk_size]
        chunks.append(chunk)
        current_pos += chunk_size
    
    return {
        "chunks": chunks,
        "isSingleRequest": False,
        "totalChars": len(full_data_string)
    }


def calculate_tokens_for_question(question: Dict[str, str], bus_data: List[Dict]) -> Dict[str, Any]:
    """Calculate tokens for a single question in raw mode"""
    results = {
        "questionId": question["id"],
        "question": question["question"],
        "tokenCalculations": []
    }
    
    # Simulate the chunking behavior
    chunking_result = simulate_chunking(bus_data)
    
    if chunking_result["isSingleRequest"]:
        # Single request mode
        prompt = build_prompt(
            PROMPT_TEMPLATES["raw"], 
            question["question"], 
            chunking_result["chunks"][0]
        )
        token_count = estimate_tokens_modern(prompt)
        token_count_legacy = estimate_tokens_legacy(prompt)
        
        results["tokenCalculations"].append({
            "type": "single-request",
            "promptText": prompt[:200] + "..." if len(prompt) > 200 else prompt,
            "promptLength": len(prompt),
            "estimatedTokens": token_count,
            "estimatedTokensLegacy": token_count_legacy,
            "dataSize": chunking_result["totalChars"]
        })
        
        results["totalTokens"] = token_count
        results["totalTokensLegacy"] = token_count_legacy
        
    else:
        # Multi-chunk mode
        total_tokens = 0
        total_tokens_legacy = 0
        
        # Calculate tokens for each chunk
        for index, chunk in enumerate(chunking_result["chunks"]):
            chunk_prompt = build_prompt(
                PROMPT_TEMPLATES["rawChunk"], 
                question["question"], 
                chunk,
                chunkIndex=index + 1,
                totalChunks=len(chunking_result["chunks"])
            )
            
            chunk_tokens = estimate_tokens_modern(chunk_prompt)
            chunk_tokens_legacy = estimate_tokens_legacy(chunk_prompt)
            
            results["tokenCalculations"].append({
                "type": f"chunk-{index + 1}",
                "promptText": chunk_prompt[:200] + "...",  # Truncate for display
                "promptLength": len(chunk_prompt),
                "estimatedTokens": chunk_tokens,
                "estimatedTokensLegacy": chunk_tokens_legacy,
                "dataSize": len(chunk)
            })
            
            total_tokens += chunk_tokens
            total_tokens_legacy += chunk_tokens_legacy
        
        # Add final synthesis prompt tokens
        mock_analyst_notes = "\n\n".join([
            f"Chunk {i + 1} analysis notes..." 
            for i in range(len(chunking_result["chunks"]))
        ])
        final_prompt = build_prompt(
            PROMPT_TEMPLATES["rawFinal"], 
            question["question"], 
            mock_analyst_notes,
            chunkCount=len(chunking_result["chunks"]),
            truncatedNote=""
        )
        
        final_tokens = estimate_tokens_modern(final_prompt)
        final_tokens_legacy = estimate_tokens_legacy(final_prompt)
        
        results["tokenCalculations"].append({
            "type": "final-synthesis",
            "promptText": final_prompt[:200] + "...",  # Truncate for display
            "promptLength": len(final_prompt),
            "estimatedTokens": final_tokens,
            "estimatedTokensLegacy": final_tokens_legacy,
            "dataSize": len(mock_analyst_notes)
        })
        
        total_tokens += final_tokens
        total_tokens_legacy += final_tokens_legacy
        
        results["totalTokens"] = total_tokens
        results["totalTokensLegacy"] = total_tokens_legacy
        results["chunkCount"] = len(chunking_result["chunks"])
    
    return results


def load_bus_data() -> List[Dict]:
    """Load bus data from CSV file"""
    csv_path = os.path.join(os.path.dirname(__file__), 'bus_data.csv')
    
    try:
        if not os.path.exists(csv_path):
            print('⚠️  bus_data.csv not found. Using simulated data.')
            return generate_simulated_data()
        
        data = []
        with open(csv_path, 'r', encoding='utf-8') as file:
            csv_reader = csv.DictReader(file)
            for index, row in enumerate(csv_reader):
                data.append({
                    "id": index,
                    "timestamp": row.get("timestamp", f"2024-10-24T{8 + index // 60:02d}:{index % 60:02d}:00Z"),
                    "behavior": row.get("behavior", ["Moderate", "Aggressive", "Calm"][index % 3]),
                    "coordinates": json.loads(row.get("coordinates", "[]")) if row.get("coordinates") else [33.775 + (index % 100) * 0.0001, -84.39 + (index % 100) * 0.0001],
                    "cluster": row.get("cluster", f"Cluster_{index % 5}"),
                    "activity": row.get("activity", ["Moving", "Stopped", "Turning"][index % 3])
                })
        
        print(f'✅ Loaded {len(data)} records from bus_data.csv')
        return data
        
    except Exception as error:
        print(f'⚠️  Error loading bus_data.csv: {error}. Using simulated data.')
        return generate_simulated_data()


def generate_simulated_data(record_count: int = 1000) -> List[Dict]:
    """Generate simulated bus data for demonstration"""
    print(f'📊 Generating {record_count} simulated bus telemetry records...')
    
    behaviors = ['Moderate', 'Aggressive', 'Calm']
    activities = ['Moving', 'Stopped', 'Turning', 'Accelerating', 'Braking']
    clusters = ['Klaus_Area', 'Student_Center', 'Tech_Square', 'CRC_Zone', 'Library_Quad']
    
    data = []
    base_time = datetime(2024, 10, 24, 8, 0, 0)
    
    for i in range(record_count):
        timestamp = base_time + timedelta(seconds=i * 30)  # 30 second intervals
        data.append({
            "id": i,
            "timestamp": timestamp.isoformat() + 'Z',
            "behavior": behaviors[i % len(behaviors)],
            "coordinates": [
                33.775 + (i % 100 - 50) * 0.0004,  # Latitude around GT campus
                -84.39 + (i % 100 - 50) * 0.0004    # Longitude around GT campus
            ],
            "cluster": clusters[i % len(clusters)],
            "activity": activities[i % len(activities)]
        })
    
    return data


def export_results(results: List[Dict]) -> str:
    """Export results to JSON file"""
    timestamp = datetime.now().strftime('%Y-%m-%d')
    filename = f'raw_mode_token_analysis_{timestamp}.json'
    
    total_tokens_modern = sum(r["totalTokens"] for r in results)
    total_tokens_legacy = sum(r["totalTokensLegacy"] for r in results)
    
    export_data = {
        "metadata": {
            "analysisDate": datetime.now().isoformat(),
            "questionsAnalyzed": len(results),
            "tokenEstimationMethod": "text.length / 4 (modern) and text.length * 0.35 (legacy)",
            "description": "Token usage analysis for raw mode benchmark questions"
        },
        "summary": {
            "totalTokensModern": total_tokens_modern,
            "totalTokensLegacy": total_tokens_legacy,
            "averageTokensPerQuestion": round(total_tokens_modern / len(results)),
            "questions": [
                {
                    "id": r["questionId"],
                    "question": r["question"],
                    "totalTokens": r["totalTokens"],
                    "totalTokensLegacy": r["totalTokensLegacy"],
                    "requestType": "multi-chunk" if r.get("chunkCount") else "single-request",
                    "chunkCount": r.get("chunkCount", 1)
                }
                for r in results
            ]
        },
        "detailedResults": results
    }
    
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(export_data, f, indent=2, ensure_ascii=False)
    
    print(f'\n📄 Detailed results exported to: {filename}')
    return filename


def main():
    """Main execution function"""
    print('🚀 Raw Mode Token Calculator for Sting Sense Bus Analytics')
    print('=' * 65)
    
    # Load bus data
    bus_data = load_bus_data()
    print(f'📊 Dataset size: {len(bus_data)} records')
    print(f'📊 Estimated dataset size: {len(json.dumps(bus_data))} characters\n')
    
    # Calculate tokens for each benchmark question
    results = []
    
    for index, question in enumerate(BENCHMARK_QUESTIONS):
        print(f'[{index + 1}/5] Analyzing: "{question["question"]}"')
        result = calculate_tokens_for_question(question, bus_data)
        results.append(result)
        
        print(f'   Token estimate (modern): {result["totalTokens"]:,}')
        print(f'   Token estimate (legacy): {result["totalTokensLegacy"]:,}')
        if result.get("chunkCount"):
            print(f'   Request type: Multi-chunk ({result["chunkCount"]} chunks + 1 synthesis)')
        else:
            print(f'   Request type: Single request')
        print()
    
    # Summary
    print('📊 SUMMARY STATISTICS')
    print('-' * 50)
    
    total_tokens_modern = sum(r["totalTokens"] for r in results)
    total_tokens_legacy = sum(r["totalTokensLegacy"] for r in results)
    avg_tokens_modern = round(total_tokens_modern / len(results))
    avg_tokens_legacy = round(total_tokens_legacy / len(results))
    
    print(f'Total tokens (modern method): {total_tokens_modern:,}')
    print(f'Total tokens (legacy method): {total_tokens_legacy:,}')
    print(f'Average per question (modern): {avg_tokens_modern:,}')
    print(f'Average per question (legacy): {avg_tokens_legacy:,}')
    
    if total_tokens_legacy > 0:
        difference_pct = ((total_tokens_modern - total_tokens_legacy) / total_tokens_legacy * 100)
        print(f'Token estimation difference: {difference_pct:.1f}%')
    
    # Cost estimation (using rates from the original system)
    cost_modern = (total_tokens_modern / 1_000_000) * 0.05  # $0.05 per 1M input tokens
    cost_legacy = (total_tokens_legacy / 1_000_000) * 0.05
    
    print(f'\n💰 COST ESTIMATION')
    print('-' * 50)
    print(f'Estimated cost (modern): ${cost_modern:.6f}')
    print(f'Estimated cost (legacy): ${cost_legacy:.6f}')
    
    # Export detailed results
    export_file = export_results(results)
    
    print(f'\n✅ Analysis complete! {len(results)} questions analyzed.')
    print(f'📁 Results saved to: {export_file}')


if __name__ == "__main__":
    main()
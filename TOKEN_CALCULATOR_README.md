# Raw Mode Token Calculator

This directory contains scripts to calculate the estimated number of prompt tokens used by the raw mode for each of the 5 benchmark questions in the Sting Sense bus analytics system.

## Files

- **`calculate_raw_mode_tokens.js`** - Node.js implementation 
- **`calculate_raw_mode_tokens.py`** - Python implementation
- **`run_token_calculator.sh`** - Shell script runner (auto-detects runtime)
- **`TOKEN_CALCULATOR_README.md`** - This documentation file

## Quick Start

### Automatic Runtime Detection
```bash
./run_token_calculator.sh
```

### Force Specific Runtime
```bash
# Node.js version
./run_token_calculator.sh node
node calculate_raw_mode_tokens.js

# Python version  
./run_token_calculator.sh python
python3 calculate_raw_mode_tokens.py
```

## Features

### Token Estimation Methods
- **Modern Method**: `text.length / 4` (used by ContextModeEvaluator in the main system)
- **Legacy Method**: `text.length * 0.35` (used by splitFeaturesForRawMode)

### Benchmark Questions Analyzed
1. **Aggressive Driving**: "Tell me about aggressive driving behaviors around campus"
2. **Dwell Time**: "Which parts of campus have the highest dwell time associated with them"  
3. **Moderate Behavior**: "How many instances of moderate driving behavior can be found on campus"
4. **Route Efficiency**: "How efficient was the bus route"
5. **Tech Square Patterns**: "What are the driving patterns like around Tech Square"

### Processing Modes
- **Single Request**: When dataset fits within 11,000 character limit
- **Multi-Chunk**: When dataset requires chunking (includes synthesis tokens)

## Output

### Console Output
```
🚀 Raw Mode Token Calculator for Sting Sense Bus Analytics
=================================================================
✅ Loaded 1000 records from bus_data.csv
📊 Dataset size: 1000 records
📊 Estimated dataset size: 123456 characters

[1/5] Analyzing: "Tell me about aggressive driving behaviors around campus"
   Token estimate (modern): 15,234
   Token estimate (legacy): 21,328
   Request type: Multi-chunk (3 chunks + 1 synthesis)

📊 SUMMARY STATISTICS
--------------------------------------------------
Total tokens (modern method): 76,170
Total tokens (legacy method): 106,640
Average per question (modern): 15,234
Average per question (legacy): 21,328
Token estimation difference: -28.5%

💰 COST ESTIMATION
--------------------------------------------------
Estimated cost (modern): $0.008379
Estimated cost (legacy): $0.011730
```

### JSON Export
Detailed results are exported to `raw_mode_token_analysis_YYYY-MM-DD.json`:

```json
{
  "metadata": {
    "analysisDate": "2024-10-24T10:30:00.000Z",
    "questionsAnalyzed": 5,
    "tokenEstimationMethod": "text.length / 4 (modern) and text.length * 0.35 (legacy)",
    "description": "Token usage analysis for raw mode benchmark questions"
  },
  "summary": {
    "totalTokensModern": 76170,
    "totalTokensLegacy": 106640,
    "averageTokensPerQuestion": 15234,
    "questions": [...]
  },
  "detailedResults": [...]
}
```

## Data Sources

### Bus Data Loading
1. **Primary**: Loads from `bus_data.csv` if available
2. **Fallback**: Generates simulated telemetry data (1000 records)

### Simulated Data Structure
```json
{
  "id": 0,
  "timestamp": "2024-10-24T08:00:00Z",
  "behavior": "Moderate",
  "coordinates": [33.775, -84.39],
  "cluster": "Klaus_Area", 
  "activity": "Moving"
}
```

## Technical Details

### Token Calculation Logic
1. **Data Compression**: Compresses field names (`behavior` → `b`, `timestamp` → `t`, etc.)
2. **Chunking Logic**: Splits data if it exceeds 11,000 characters
3. **Prompt Building**: Uses original system's prompt templates
4. **Synthesis Handling**: Accounts for final prompt that combines chunk analyses

### Prompt Templates Used
- **Single Request**: Full dataset template
- **Chunk Analysis**: Per-chunk analysis template  
- **Final Synthesis**: Combining multiple chunk analyses

### Cost Calculation
- Input tokens: $0.11 per 1M tokens (Groq LLaMA-3.1-8B-Instant rates)
- Output tokens: $0.34 per 1M tokens  
- Analysis focuses on input (prompt) tokens only

## Requirements

### Node.js Version
- Node.js 12+ 
- No additional dependencies required

### Python Version  
- Python 3.6+
- No additional dependencies required
- Optional: pandas for enhanced CSV reading

## Relationship to Main System

This tool replicates the token calculation logic from the main Sting Sense system:

- **`splitFeaturesForRawMode()`** - Data chunking logic
- **`processRawMode()`** - Raw mode processing flow
- **`ContextModeEvaluator.estimateTokens()`** - Token estimation
- **`buildPrompt()`** - Prompt template system

## Validation

Compare results with actual benchmark runs:
```javascript
// In browser console after loading main system
runBenchmark(1)  // Quick test
checkDataCoverage()  // Verify data processing
estimateRawModeCalls()  // Compare with this tool
```

## Troubleshooting

### Common Issues
- **No data**: Place `bus_data.csv` in same directory or rely on simulated data
- **Runtime not found**: Install Node.js or Python 3.6+
- **Permission denied**: Run `chmod +x run_token_calculator.sh`

### Debug Output
Both scripts provide verbose console output showing:
- Data loading status
- Per-question token calculations  
- Chunking decisions
- Cost estimations

---

*This tool provides offline analysis of prompt token usage for the Sting Sense raw mode processing pipeline, enabling cost estimation and optimization planning.*
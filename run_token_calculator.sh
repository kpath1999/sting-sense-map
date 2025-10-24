#!/bin/bash

# Raw Mode Token Calculator Runner
# Automatically detects and runs the appropriate version

echo "🚀 Raw Mode Token Calculator for Sting Sense Bus Analytics"
echo "=========================================================="

# Check if we're in the right directory
if [ ! -f "package.json" ] && [ ! -f "bus_data.csv" ]; then
    echo "⚠️  Warning: Expected files (package.json, bus_data.csv) not found in current directory."
    echo "   Make sure you're running this from the sting-sense-map directory."
    echo ""
fi

# Function to run Node.js version
run_node_version() {
    echo "🟢 Running Node.js version..."
    if command -v node >/dev/null 2>&1; then
        node calculate_raw_mode_tokens.js
    else
        echo "❌ Node.js not found. Please install Node.js or run the Python version."
        return 1
    fi
}

# Function to run Python version  
run_python_version() {
    echo "🐍 Running Python version..."
    if command -v python3 >/dev/null 2>&1; then
        python3 calculate_raw_mode_tokens.py
    elif command -v python >/dev/null 2>&1; then
        python calculate_raw_mode_tokens.py
    else
        echo "❌ Python not found. Please install Python or run the Node.js version."
        return 1
    fi
}

# Main logic
case "${1:-auto}" in
    "node"|"js"|"javascript")
        run_node_version
        ;;
    "python"|"py")
        run_python_version
        ;;
    "auto"|*)
        echo "🔍 Auto-detecting runtime..."
        
        # Prefer Node.js since this is primarily a Node.js project
        if command -v node >/dev/null 2>&1; then
            run_node_version
        elif command -v python3 >/dev/null 2>&1 || command -v python >/dev/null 2>&1; then
            run_python_version
        else
            echo "❌ Neither Node.js nor Python found."
            echo "   Please install either Node.js or Python 3.6+ to run this analysis."
            echo ""
            echo "📖 Usage:"
            echo "   ./run_token_calculator.sh        # Auto-detect runtime"
            echo "   ./run_token_calculator.sh node   # Force Node.js version"
            echo "   ./run_token_calculator.sh python # Force Python version"
            exit 1
        fi
        ;;
esac

echo ""
echo "✨ Analysis complete! Check the exported JSON file for detailed results."
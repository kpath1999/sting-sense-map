import pandas as pd

# --- Configuration ---
csv_file_path = 'bus_data.csv'
num_bins = 5 # The number of colors/categories you want

# --- Main Script ---
try:
    # Load the CSV data into a pandas DataFrame
    df = pd.read_csv(csv_file_path)

    print("--- Acceleration Data Summary ---")
    print(df['accel_mean'].describe())
    print("\n" + "="*35 + "\n")

    # Use qcut to create bins with roughly equal numbers of data points
    # `duplicates='drop'` handles cases where many data points have the same value
    bins = pd.qcut(df['accel_mean'], q=num_bins, duplicates='drop')
    
    # Get the value counts for each bin to see the distribution
    bin_counts = bins.value_counts().sort_index()

    # Define a color palette (from red to yellow to green)
    # You can find more palettes at sites like colorbrewer2.org
    color_palette = ['#d73027', '#fc8d59', '#fee08b', '#d9ef8b', '#91cf60']
    
    print("--- Recommended Thresholds for index.html ---")
    print("Copy the following logic into the getColor() function in your HTML file.\n")

    # Generate the JavaScript if/else logic and print the thresholds
    js_logic = ""
    for i, interval in enumerate(bin_counts.index):
        # The upper bound of the interval is the threshold
        threshold = interval.right
        color = color_palette[i]
        
        if i < len(bin_counts) - 1:
            print(f"Bin {i+1}: accel_mean <= {threshold:.4f}  ->  Color: {color}")
            js_logic += f"        return accel <= {threshold:.4f} ? '{color}' :\n"
        else:
            # The last bin catches everything else
            print(f"Bin {i+1}: accel_mean > {bin_counts.index[i-1].right:.4f}  ->  Color: {color}")
            js_logic += f"               '{color}'; // Default for highest values"

    print("\n--- JavaScript getColor() Function ---")
    print("function getColor(accel) {")
    print(js_logic)
    print("}")


except FileNotFoundError:
    print(f"Error: The file '{csv_file_path}' was not found.")
except Exception as e:
    print(f"An error occurred: {e}")


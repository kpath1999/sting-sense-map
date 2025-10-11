import csv
import json

# Input and output file names
csv_file_path = 'bus_data.csv'
geojson_file_path = 'bus_route.geojson'

# The main structure for our GeoJSON file
geojson = {
    "type": "FeatureCollection",
    "features": []
}

# Open the CSV file and read it
with open(csv_file_path, mode='r', encoding='utf-8') as csv_file:
    # Use DictReader to read rows as dictionaries
    csv_reader = csv.DictReader(csv_file)

    for row in csv_reader:
        # Skip rows with invalid coordinates
        try:
            longitude = float(row['longitude'])
            latitude = float(row['latitude'])
        except (ValueError, KeyError):
            print(f"Skipping row due to invalid coordinates: {row}")
            continue

        # *** MODIFIED AREA START ***
        # Dynamically build the properties dictionary from all columns
        properties = {}
        for key, value in row.items():
            # Exclude latitude and longitude as they are used for geometry
            if key.lower() in ['latitude', 'longitude']:
                continue
            
            # Try to convert numeric strings to actual numbers (float)
            # Otherwise, keep them as strings (e.g., for the timestamp)
            try:
                properties[key] = float(value)
            except (ValueError, TypeError):
                properties[key] = value
        # *** MODIFIED AREA END ***

        # Create a GeoJSON Feature for each row
        feature = {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [longitude, latitude] # GeoJSON format is [longitude, latitude]
            },
            # Assign the fully populated properties dictionary
            "properties": properties
        }
        geojson['features'].append(feature)

# Write the GeoJSON data to a file
with open(geojson_file_path, 'w') as geojson_file:
    json.dump(geojson, geojson_file, indent=2)

print(f"Successfully converted {csv_file_path} to {geojson_file_path} with all properties included.")

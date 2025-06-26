# Sting Sense - Gold Route Visualization

## Ride Quality
One of the key enhancements is using machine learning to detect and classify various events during bus rides. By applying clustering algorithms like K-Means or DBSCAN to existing bus data, different types of events such as "Smooth Ride," "Hard Braking," "Sharp Turn," or "Bumpy Road" can be identified and categorized. This approach goes beyond simple acceleration thresholds and uncovers hidden patterns in the data, offering a more intuitive and useful map. Instead of showing just "High Acceleration" zones, the map can display specific events based on data-driven clusters.

To implement this, the process begins by loading bus data into a Python script and selecting relevant features such as acceleration variance and percentiles. A clustering algorithm is then applied to group the data into meaningful categories. After training the model, each data point is assigned a label representing the event type, which is saved back to the dataset. Finally, the results can be visualized by coloring the points on the map based on the new event labels.

## Route Summary
Adding an AI-powered route summary feature can significantly enrich the user experience. With a simple "Summarize Route" button, users can obtain a human-readable, narrative summary of the bus trip, which can include key statistics like trip duration, average speed, and the number of specific events (e.g., bumpy roads). By integrating an LLM API such as OpenAI’s GPT or Anthropic's Claude, raw data can be transformed into a comprehensive summary.

For example, the LLM could generate a summary like: "This 25-minute bus trip was mostly smooth, but encountered three sections of significant vibration near campus, likely due to road construction. The bus performed one hard braking event near the Arts Center MARTA station." This storytelling layer makes the data much more accessible and engaging for users.

To implement this feature, a button must be added to the front-end interface. When clicked, the button triggers a request to a serverless backend, which securely calls the LLM API. The backend processes the relevant statistics and sends them to the LLM, which generates a summary. This summary is then returned to the frontend and displayed to the user.

## Anomaly Explanation
Another valuable feature is the ability to allow users to click on a point in the map and receive an AI-generated explanation for any anomalies. This feature is especially useful for high-variance points, such as those indicating hard braking or sharp turns. When a user clicks on an anomalous point, the system sends the specific data for that point to an LLM, which generates an explanation for why the event might have occurred.

For example, if a data point shows high variance and strong negative acceleration on the X-axis, the LLM might explain that this suggests a hard braking event. This turns the map into an interactive diagnostic tool, providing deeper insights into the data that aren't immediately obvious through simple visualization.

To implement this, the onClick functionality of the map can be modified. A "Get AI Insight" button is added to the popup that displays when a user clicks on a point. When triggered, the button sends the relevant data to a backend Lambda function, which forwards it to the LLM for analysis. The LLM’s response is then displayed in the popup, offering a detailed explanation of the anomaly.

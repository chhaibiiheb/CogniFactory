# Backend API Documentation

## Overview
This backend provides APIs for integrating with a frontend application. It includes functionalities for database operations, embedding generation, and AI-powered responses.

## Features
- RESTful API built with Flask.
- Integration with Mistral and LangChain for AI functionalities.
- SQLite database for data storage.
- CORS enabled for seamless frontend integration.

## Prerequisites
- Python 3.8 or higher
- SQLite
- Required Python packages (see `requirements.txt`)

## Setup Instructions
1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd backend
   ```

2. Create a virtual environment and activate it:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Set up environment variables:
   - Create a `.env` file in the `backend` directory.
   - Add the following variables:
     ```env
     MISTRAL_API_KEY=<your-mistral-api-key>
     ```

5. Run the application:
   ```bash
   python app.py
   ```

## API Endpoints

### 1. **GET /api/sensors**
   Retrieves a list of sensors from the database.

   **Response:**
   ```json
   [
       {
           "id": 1,
           "name": "Sensor A"
       },
       {
           "id": 2,
           "name": "Sensor B"
       }
   ]
   ```

### 2. **POST /api/sensors**
   Adds a new sensor to the database.

   **Request Body:**
   ```json
   {
       "name": "New Sensor"
   }
   ```

   **Response:**
   ```json
   {
       "id": 3,
       "name": "New Sensor"
   }
   ```

### 3. **PUT /api/sensors/:id**
   Updates the name of a sensor.

   **Request Body:**
   ```json
   {
       "name": "Updated Sensor"
   }
   ```

   **Response:**
   ```json
   {
       "id": 1,
       "name": "Updated Sensor"
   }
   ```

### 4. **DELETE /api/sensors/:id**
   Deletes a sensor from the database.

   **Response:**
   ```json
   {
       "message": "Sensor deleted successfully."
   }
   ```

## Database Connection

### Connecting to the Database
The backend uses an SQLite database (`iot_dashboard.db`) located in the `backend` directory. The database connection is managed automatically by the backend.

### Sensor Management Endpoints

#### 1. **GET /api/sensors**
   Retrieves all sensors from the database.

   **Response:**
   ```json
   [
       {
           "id": 1,
           "name": "Sensor A"
       },
       {
           "id": 2,
           "name": "Sensor B"
       }
   ]
   ```

#### 2. **POST /api/sensors**
   Adds a new sensor to the database.

   **Request Body:**
   ```json
   {
       "name": "New Sensor"
   }
   ```

   **Response:**
   ```json
   {
       "id": 3,
       "name": "New Sensor"
   }
   ```

#### 3. **PUT /api/sensors/:id**
   Updates the name of a sensor.

   **Request Body:**
   ```json
   {
       "name": "Updated Sensor"
   }
   ```

   **Response:**
   ```json
   {
       "id": 1,
       "name": "Updated Sensor"
   }
   ```

#### 4. **DELETE /api/sensors/:id**
   Deletes a sensor from the database.

   **Response:**
   ```json
   {
       "message": "Sensor deleted successfully."
   }
   ```

## LLM Endpoints

### 1. **POST /api/ask**
   Sends a query to the LLM and retrieves a response.

   **Request Body:**
   ```json
   {
       "question": "What is the status of Sensor A?"
   }
   ```

   **Response:**
   ```json
   {
       "response": "Sensor A is operational."
   }
   ```

### 2. **POST /api/generate_summary**
   Generates a summary using the LLM.

   **Request Body:**
   ```json
   {
       "context": "Sensor data and logs."
   }
   ```

   **Response:**
   ```json
   {
       "summary": "All sensors are functioning normally."
   }
   ```

### 3. **POST /api/diagnose_sensor**
   Diagnoses a sensor issue using the LLM.

   **Request Body:**
   ```json
   {
       "sensor_id": 1
   }
   ```

   **Response:**
   ```json
   {
       "diagnosis": "Sensor A requires recalibration."
   }
   ```

## Example Integration
Here is an example of how to fetch sensors using JavaScript:

```javascript
fetch('http://localhost:5000/api/sensors')
  .then(response => response.json())
  .then(data => console.log(data));
```

## Notes
- Ensure the `MISTRAL_API_KEY` is set for AI functionalities.
- The database file (`iot_dashboard.db`) is located in the `backend` directory.

## License
This project is licensed under the MIT License.
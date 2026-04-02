import sqlite3
import time
import traceback
from datetime import datetime
from threading import Thread
import random
import os
import json

import requests
from bs4 import BeautifulSoup
from flask import Flask, g, jsonify, request, Response, send_file
from flask_cors import CORS  # MODIFICATION: Imported CORS

# Imports for Ollama and LangChain
from langchain.chains import RetrievalQA
from langchain.prompts import PromptTemplate
from langchain_chroma import Chroma
from langchain_ollama import OllamaLLM
from langchain_core.messages import HumanMessage, AIMessage

# --- BACKUP: Original Mistral API imports (commented out) ---
# from langchain_mistralai import ChatMistralAI
# MODIFICATION: The get_embedding_function can cause errors if the file doesn't exist.
# We will wrap it to handle this case.
try:
    from get_embedding_function import get_embedding_function
except ImportError:
    print("WARNING: get_embedding_function not found. RAG will be disabled.")
    get_embedding_function = None


app = Flask(__name__, static_folder=os.path.join(os.path.dirname(__file__), '..', 'frontend', 'public'), static_url_path='')

# MODIFICATION: Enable CORS to allow requests from your React frontend
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Add a before_request handler to log all incoming requests
@app.before_request
def log_request():
    print(f"[REQUEST] {request.method} {request.path} from {request.remote_addr}")

DATABASE = "iot_dashboard.db"
EASA_NEWS_RSS_URL = 'https://www.easa.europa.eu/en/newsroom-and-events/news/feed.xml'

# --- Ollama Configuration ---
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.1:8b")

print(f"Initializing Ollama with model: {OLLAMA_MODEL} at {OLLAMA_BASE_URL}")

# --- BACKUP: Original Mistral API Configuration (commented out) ---
# MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY")
# if not MISTRAL_API_KEY:
#     print("CRITICAL ERROR: MISTRAL_API_KEY environment variable not set.")

RAG_PROMPT_TEMPLATE = """
Vous êtes Aerolyze, un assistant expert en conformité aéronautique.
Répondez à la question en vous basant uniquement sur le contexte suivant. Soyez concis, utile et répondez toujours en français.
Si vous ne trouvez pas la réponse dans le contexte, dites simplement "Je n'ai pas trouvé l'information dans les documents fournis."
Contexte: {context}
---
Question: {question}
"""
qa_chain = None
llm = None

# --- BACKUP: Original Mistral LLM initialization (commented out) ---
# # Initialize LLM first
# if MISTRAL_API_KEY:
#     try:
#         llm = ChatMistralAI(model="mistral-large-2512", mistral_api_key=MISTRAL_API_KEY, temperature=0.7)
#         print("✅ Mistral LLM initialized successfully.")
#     except Exception as e:
#         print(f"❌ CRITICAL ERROR: Failed to initialize Mistral LLM. Error: {e}")
#         llm = None
# else:
#     llm = None

# Initialize LLM with Ollama
try:
    llm = OllamaLLM(
        model=OLLAMA_MODEL,
        base_url=OLLAMA_BASE_URL,
        temperature=0.7
    )
    print("✅ Ollama LLM initialized successfully.")
except Exception as e:
    print(f"❌ CRITICAL ERROR: Failed to initialize Ollama LLM. Error: {e}")
    llm = None

# Initialize RAG chain
if llm and get_embedding_function:
    try:
        # --- BACKUP: Original Mistral RAG message (commented out) ---
        # print("Initializing RAG chain with Mistral...")
        print("Initializing RAG chain with Ollama...")
        CHROMA_PATH = "chroma"
        embedding_function = get_embedding_function()
        db_chroma = Chroma(persist_directory=CHROMA_PATH, embedding_function=embedding_function)
        retriever = db_chroma.as_retriever()
        prompt = PromptTemplate(template=RAG_PROMPT_TEMPLATE, input_variables=["context", "question"])
        qa_chain = RetrievalQA.from_chain_type(
            llm=llm, chain_type="stuff", retriever=retriever,
            return_source_documents=True, chain_type_kwargs={"prompt": prompt},
        )
        # --- BACKUP: Original Mistral RAG success message (commented out) ---
        # print("✅ RAG chain with Mistral initialized successfully.")
        print("✅ RAG chain with Ollama initialized successfully.")
    except Exception as e:
        qa_chain = None
        print(f"❌ WARNING: Failed to initialize RAG chatbot. RAG will be disabled. Error: {e}")
else:
    print("INFO: RAG chain initialization skipped due to missing LLM or embedding function.")


# --- Database Setup ---
def get_db():
    if 'db' not in g:
        g.db = sqlite3.connect(DATABASE, check_same_thread=False)
        g.db.row_factory = sqlite3.Row
    return g.db

@app.teardown_appcontext
def close_db(error):
    db = g.pop('db', None)
    if db is not None:
        db.close()


# MODIFICATION: Removed all render_template routes. React will handle the UI.
# The root path can now be a simple health check for the API.
@app.route('/')
def index():
    return "<h1>FactoryGuard Backend API</h1><p>Status: Running</p>"


# --- Chatbot API Endpoint ---
# MODIFICATION: Changed this endpoint to /api/ask to be consistent.
# It now returns a single JSON response instead of streaming to match the frontend.
@app.route("/api/ask", methods=["POST"])
def ask():
    # --- BACKUP: Original Mistral error check (commented out) ---
    # if not MISTRAL_API_KEY or not llm:
    #     return jsonify({"response": "Erreur: La clé API MISTRAL ou le LLM n'est pas configuré."}), 500
    if not llm:
        return jsonify({"response": "Erreur: Le LLM Ollama n'est pas configuré."}), 500
    
    request_data = request.json
    contents = request_data.get("contents")
    use_rag = request_data.get("use_rag", False)

    if not contents:
        return jsonify({"response": "Erreur: Aucun contenu fourni."}), 400
    
    if use_rag:
        if not qa_chain:
            return jsonify({"response": "Erreur: Le mode RAG n'est pas initialisé sur le serveur."}), 500
        last_q = contents[-1]['parts'][0]['text']
        try:
            result = qa_chain.invoke({"query": last_q})
            return jsonify({"response": result.get('result', "Pas de réponse.")})
        except Exception as e:
            return jsonify({"response": f"Erreur RAG: {e}"}), 500

    chat_history = [HumanMessage(content=m["parts"][0]["text"]) if m.get("role") == "user" else AIMessage(content=m["parts"][0]["text"]) for m in contents]
    
    try:
        result = llm.invoke(chat_history)
        response_text = result.content if hasattr(result, 'content') else str(result)
        return jsonify({"response": response_text})
    except Exception as e:
        print(f"Ollama API Error: {e}")
        return jsonify({"response": f"Erreur lors de la communication avec Ollama: {e}"}), 500


# --- API Routes for IoT Dashboard ---
@app.route('/api/sensors')
def get_sensors():
    db = get_db()
    query = """
    SELECT 
        s.id, s.name, s.type, s.status, s.lat, s.lon, s.battery_level, s.min_threshold, s.max_threshold,
        (SELECT sd.value FROM sensor_data sd WHERE sd.sensor_id = s.id ORDER BY sd.timestamp DESC LIMIT 1) as last_value,
        (SELECT sd.timestamp FROM sensor_data sd WHERE sd.sensor_id = s.id ORDER BY sd.timestamp DESC LIMIT 1) as last_update
    FROM sensors s;
    """
    sensors = db.execute(query).fetchall()
    return jsonify([dict(row) for row in sensors])

@app.route('/api/stats')
def get_stats():
    from datetime import datetime, timedelta
    
    db = get_db()
    type_data = db.execute('SELECT type, COUNT(*) as count FROM sensors GROUP BY type').fetchall()
    status_data = db.execute('SELECT status, COUNT(*) as count FROM sensors GROUP BY status').fetchall()
    
    # MODIFICATION: Added calculations for the KPI cards on the dashboard
    total_sensors = db.execute("SELECT COUNT(id) FROM sensors").fetchone()[0]
    alerts = db.execute("SELECT COUNT(id) FROM sensors WHERE status = 'Inactif' OR status = 'Maintenance'").fetchone()[0]
    active_sensors = total_sensors - alerts

    # Get sensor trends for historical data
    sensor_trends = []
    sensors = db.execute("SELECT id, name FROM sensors").fetchall()
    
    print(f"[DEBUG] Total sensors found: {len(sensors)}")
    
    for sensor in sensors:
        sensor_id = sensor['id']
        sensor_name = sensor['name']
        
        # Get last 30 data points for this sensor (more comprehensive)
        data_points = db.execute(
            "SELECT value, timestamp FROM sensor_data WHERE sensor_id = ? ORDER BY timestamp DESC LIMIT 30",
            (sensor_id,)
        ).fetchall()
        
        print(f"[DEBUG] Sensor '{sensor_name}' (ID: {sensor_id}): {len(data_points)} data points found")
        
        if data_points:
            # Format the data for the chart (reverse to show chronological order)
            formatted_data = []
            for idx, point in enumerate(reversed(data_points)):
                timestamp = point['timestamp']
                value = point['value']
                
                # Parse timestamp more robustly
                time_str = "N/A"
                try:
                    if isinstance(timestamp, str):
                        # Try to extract HH:MM from various formats
                        if ' ' in timestamp:
                            time_part = timestamp.split(' ')[-1]
                        else:
                            time_part = timestamp
                        time_str = time_part[:5]  # HH:MM
                    else:
                        time_str = str(timestamp)[:5]
                except Exception as e:
                    print(f"[DEBUG] Error parsing timestamp '{timestamp}': {e}")
                    time_str = f"T{idx}"
                
                try:
                    numeric_value = float(value) if value is not None else 0
                except (ValueError, TypeError):
                    numeric_value = 0
                
                formatted_data.append({
                    'time': time_str,
                    'value': numeric_value,
                    'timestamp': str(timestamp)  # Include full timestamp for debugging
                })
            
            latest_value = float(data_points[0]['value']) if data_points and data_points[0]['value'] is not None else None
            
            sensor_trend = {
                'name': sensor_name,
                'id': sensor_id,
                'data': formatted_data,
                'latest_value': latest_value,
                'data_points_count': len(formatted_data)
            }
            sensor_trends.append(sensor_trend)
            print(f"[DEBUG] Added trend for '{sensor_name}': {len(formatted_data)} points, latest: {latest_value}")

    print(f"[DEBUG] Total sensor trends to return: {len(sensor_trends)}")

    # MODIFICATION: Changed JSON keys to 'name' and 'value' to match what the frontend chart library (Recharts) expects.
    return jsonify({
        "by_type": [{"name": r["type"], "value": r["count"]} for r in type_data],
        "by_status": [{"name": r["status"] if r["status"] else 'Non défini', "value": r["count"]} for r in status_data],
        "total_sensors": total_sensors,
        "active_sensors": active_sensors,
        "alerts": alerts,
        "sensor_trends": sensor_trends
    })

# --- All other routes and background tasks from your code remain the same ---
# --- They are correctly designed and can be used for future features. ---

@app.route('/api/sensor-history/<int:sensor_id>')
def get_sensor_history(sensor_id):
    db = get_db()
    rows = db.execute("SELECT value, timestamp FROM sensor_data WHERE sensor_id = ? ORDER BY timestamp DESC LIMIT 50", (sensor_id,)).fetchall()
    return jsonify([dict(row) for row in reversed(rows)])

@app.route('/api/add-sensor', methods=['POST'])
def add_sensor():
    data = request.get_json()
    if not data or 'name' not in data:
        raise KeyError('name')
    db = get_db()
    cursor = db.cursor()
    cursor.execute('INSERT INTO sensors (name, type, status, lat, lon, min_threshold, max_threshold, battery_level) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                   (data['name'], data['type'], data['status'], data['lat'], data['lon'], data.get('min_threshold'), data.get('max_threshold'), random.randint(90, 100)))
    sensor_id = cursor.lastrowid
    db.execute("INSERT INTO changes_log (change_type, description, date) VALUES (?, ?, ?)",
               ('ajout', f"Nouveau capteur ajouté: {data['name']}", datetime.now()))
    db.commit()
    return jsonify({"status": "success", "id": sensor_id})

@app.route('/api/update-sensor/<int:sensor_id>', methods=['POST'])
def update_sensor(sensor_id):
    data = request.json
    db = get_db()
    db.execute('UPDATE sensors SET name=?, type=?, status=?, lat=?, lon=?, min_threshold=?, max_threshold=? WHERE id=?',
               (data['name'], data['type'], data['status'], data.get('lat'), data.get('lon'), data.get('min_threshold'), data.get('max_threshold'), sensor_id))
    db.execute("INSERT INTO changes_log (change_type, description, date) VALUES (?, ?, ?)",
               ('modification', f"Capteur modifié: {data['name']}", datetime.now()))
    db.commit()
    return jsonify({"status": "success"})

@app.route('/api/delete-sensor/<int:sensor_id>', methods=['POST'])
def delete_sensor(sensor_id):
    db = get_db()
    sensor = db.execute('SELECT name FROM sensors WHERE id=?', (sensor_id,)).fetchone()
    if sensor:
        db.execute("INSERT INTO changes_log (change_type, description, date) VALUES (?, ?, ?)",
                   ('suppression', f"Capteur supprimé: {sensor['name']}", datetime.now()))
        db.execute('DELETE FROM sensor_data WHERE sensor_id=?', (sensor_id,))
        db.execute('DELETE FROM sensors WHERE id=?', (sensor_id,))
        db.commit()
    return jsonify({"status": "deleted"})

@app.route('/api/activity-log')
def get_activity_log():
    db = get_db()
    rows = db.execute("SELECT description, date FROM changes_log WHERE change_type != 'actualité' ORDER BY date DESC LIMIT 10").fetchall()
    return jsonify([dict(row) for row in rows])

@app.route('/api/news')
def get_news():
    db = get_db()
    rows = db.execute("SELECT id, description, date, link, seen FROM changes_log WHERE change_type = 'actualité' ORDER BY seen ASC, date DESC LIMIT 15").fetchall()
    return jsonify([dict(row) for row in rows])

@app.route('/api/unread-count')
def get_unread_count():
    db = get_db()
    count = db.execute("SELECT COUNT(id) FROM changes_log WHERE seen = 0 AND change_type = 'actualité'").fetchone()[0]
    return jsonify({"count": count})

@app.route('/api/analyze-video-frame', methods=['POST'])
def analyze_video_frame():
    """Analyze a video frame using Mistral Vision Model"""
    if not MISTRAL_API_KEY:
        error_msg = "❌ MISTRAL_API_KEY environment variable not configured"
        print(f"[VIDEO_ANALYSIS] {error_msg}")
        return jsonify({"error": error_msg}), 500

    try:
        if 'frame' not in request.files:
            return jsonify({"error": "❌ Aucune image n'a été fournie."}), 400

        frame_file = request.files['frame']
        video_title = request.form.get('video_title', 'Vidéo inconnue')
        current_time = request.form.get('current_time', '0')

        if not frame_file or frame_file.filename == '':
            return jsonify({"error": "❌ Fichier vide."}), 400

        frame_data = frame_file.read()
        if not frame_data:
            return jsonify({"error": "❌ Fichier image vide."}), 400

        import base64
        frame_base64 = base64.b64encode(frame_data).decode('utf-8')

        print(f"[VIDEO_ANALYSIS] 📸 Frame captured: {len(frame_data)} bytes from {video_title} at {current_time}s")

        analysis_prompt = f"""
Vous êtes un expert en vision par ordinateur et en analyse d'images industrielles/de surveillance.
Analysez cette image provenant de: {video_title} (à {current_time}s)
"""

        try:
            print("[DEBUG] Importing mistralai...")
            import mistralai
            from mistralai import Mistral

            print("[DEBUG] mistralai version:", getattr(mistralai, "__version__", "UNKNOWN"))

            client = Mistral(api_key=MISTRAL_API_KEY)

            # 🔍 CRITICAL DEBUGS
            print("[DEBUG] Mistral client type:", type(client))
            print("[DEBUG] dir(client):")
            print(dir(client))

            print("[DEBUG] hasattr(client, 'chat'):", hasattr(client, "chat"))
            print("[DEBUG] hasattr(client, 'messages'):", hasattr(client, "messages"))

            if hasattr(client, "chat"):
                print("[DEBUG] dir(client.chat):")
                print(dir(client.chat))

            print("[VIDEO_ANALYSIS] 🚀 Calling Mistral API...")

            chat_response = client.chat.complete(
                model="mistral-small-latest",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": analysis_prompt
                            },
                            {
                                "type": "image_url",
                                "image_url": f"data:image/jpeg;base64,{frame_base64}"
                            }
                        ]
                    }
                ]
            )

            print("[DEBUG] Raw response object:", chat_response)

            analysis_result = chat_response.choices[0].message.content

            print(f"[VIDEO_ANALYSIS] ✅ Frame analyzed successfully from {video_title}")
            return jsonify({"analysis": analysis_result})

        except Exception as mistral_error:
            print("[VIDEO_ANALYSIS] ❌ Mistral API Error CAUGHT")
            print("[DEBUG] Exception type:", type(mistral_error))
            print("[DEBUG] Exception repr:", repr(mistral_error))
            print("[DEBUG] Full traceback:")
            traceback.print_exc()
            return jsonify({"error": str(mistral_error)}), 500

    except Exception as e:
        print("[VIDEO_ANALYSIS] ❌ Server Error")
        print("[DEBUG] Exception type:", type(e))
        print("[DEBUG] Exception repr:", repr(e))
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route('/api/generate-summary', methods=['POST'])
def generate_summary():
    """Generate a summary report of all sensors using the configured LLM"""
    if not llm:
        return jsonify({"error": "Erreur: Le LLM n'est pas configuré."}), 500
    
    data = request.json
    sensors = data.get('sensors', [])
    
    if not sensors:
        return jsonify({"error": "Erreur: Aucun capteur fourni."}), 400
    
    try:
        # Prepare summary data for Mistral
        db = get_db()
        sensor_analysis = []
        
        for sensor in sensors:
            sensor_id = sensor.get('id')
            
            # Get last 10 data points for each sensor
            sensor_data = db.execute(
                'SELECT value FROM sensor_data WHERE sensor_id = ? ORDER BY timestamp DESC LIMIT 10',
                (sensor_id,)
            ).fetchall()
            
            values = [row['value'] for row in reversed(sensor_data)] if sensor_data else []
            
            sensor_info = {
                'name': sensor.get('name'),
                'type': sensor.get('type'),
                'status': sensor.get('status'),
                'last_value': sensor.get('last_value'),
                'battery_level': sensor.get('battery_level'),
                'min_threshold': sensor.get('min_threshold'),
                'max_threshold': sensor.get('max_threshold'),
                'recent_values': values,
                'avg_value': sum(values) / len(values) if values else None
            }
            sensor_analysis.append(sensor_info)
        
        # Get global stats
        total_sensors = len(sensors)
        active_sensors = sum(1 for s in sensors if s.get('status') == 'Actif')
        inactive_sensors = sum(1 for s in sensors if s.get('status') == 'Inactif')
        maintenance_sensors = sum(1 for s in sensors if s.get('status') == 'Maintenance')
        
        # Build summary prompt
        summary_prompt = f"""
Vous êtes FactoryGuard AI, un assistant expert en supervision de capteurs IoT. Fournissez un rapport complet et structuré de la situation actuelle basé sur les données suivantes:

STATISTIQUES GLOBALES:
- Total capteurs: {total_sensors}
- Capteurs actifs: {active_sensors}
- Capteurs inactifs: {inactive_sensors}
- Capteurs en maintenance: {maintenance_sensors}

DÉTAILS DES CAPTEURS:
"""
        
        for sensor in sensor_analysis:
            last_value_str = f"{sensor['last_value']:.2f}" if sensor['last_value'] is not None else 'N/A'
            avg_value_str = f"{sensor['avg_value']:.2f}" if sensor['avg_value'] is not None else 'N/A'
            summary_prompt += f"""
  • {sensor['name']} ({sensor['type']})
    Status: {sensor['status']}
    Batterie: {sensor['battery_level']}%
    Dernière valeur: {last_value_str} (seuils: {sensor['min_threshold']}-{sensor['max_threshold']})
    Valeur moyenne: {avg_value_str}
"""
        
        summary_prompt += """

RAPPORT DEMANDÉ:
Veuillez générer un rapport détaillé incluant:
1. État général du système de capteurs
2. Capteurs à surveiller (anomalies, valeurs hors seuil)
3. État des batteries (alertes si nécessaire)
4. Recommandations prioritaires
5. Tendances observées et prévisions (si données suffisantes)

Soyez concis, clair et professionnel.
"""

        # Call Mistral
        result = llm.invoke([HumanMessage(content=summary_prompt)])
        summary_text = result.content if hasattr(result, 'content') else str(result)
        return jsonify({"summary": summary_text})
    
    except Exception as e:
        print(f"Erreur lors de la génération du rapport: {e}")
        traceback.print_exc()
        return jsonify({"error": f"Erreur lors de la génération du rapport: {str(e)}"}), 500

@app.route('/api/diagnose-sensor', methods=['POST'])
def diagnose_sensor():
    """Diagnose a sensor using the configured LLM"""
    if not llm:
        return jsonify({"error": "Erreur: Le LLM n'est pas configuré."}), 500
    
    data = request.json
    sensor_id = data.get('sensor_id')
    
    if not sensor_id:
        return jsonify({"error": "Erreur: sensor_id manquant."}), 400
    
    try:
        db = get_db()
        
        # Get sensor info
        sensor = db.execute('SELECT id, name, type, status, min_threshold, max_threshold, battery_level FROM sensors WHERE id = ?', (sensor_id,)).fetchone()
        if not sensor:
            return jsonify({"error": "Capteur non trouvé."}), 404
        
        # Get last 20 data points
        sensor_data = db.execute(
            'SELECT value, timestamp FROM sensor_data WHERE sensor_id = ? ORDER BY timestamp DESC LIMIT 20',
            (sensor_id,)
        ).fetchall()
        
        if not sensor_data:
            return jsonify({"error": "Aucune donnée disponible pour ce capteur."}), 400
        
        # Prepare data analysis
        values = [row['value'] for row in reversed(sensor_data)]
        timestamps = [row['timestamp'] for row in reversed(sensor_data)]
        
        # Calculate statistics
        avg_value = sum(values) / len(values)
        min_value = min(values)
        max_value = max(values)
        
        # Create diagnosis prompt
        diagnosis_prompt = f"""
Vous êtes un expert en diagnostic de capteurs IoT. Analysez le capteur suivant et fournissez un diagnostic détaillé:

Nom du capteur: {sensor['name']}
Type: {sensor['type']}
Statut: {sensor['status']}
Batterie: {sensor['battery_level']}%
Seuil Min: {sensor['min_threshold']}
Seuil Max: {sensor['max_threshold']}

Données récentes (20 dernières mesures):
Valeur moyenne: {avg_value:.2f}
Valeur min: {min_value:.2f}
Valeur max: {max_value:.2f}
Nombre de mesures: {len(values)}

Valeurs: {[f"{v:.2f}" for v in values]}

Veuillez fournir:
1. Un diagnostic de l'état du capteur
2. Les anomalies détectées (le cas échéant)
3. Les recommandations d'action
4. L'état de la batterie (critique, faible, normal)
"""
        
        # Call Mistral
        result = llm.invoke([HumanMessage(content=diagnosis_prompt)])
        diagnosis_text = result.content if hasattr(result, 'content') else str(result)
        return jsonify({"diagnosis": diagnosis_text})
    
    except Exception as e:
        print(f"Erreur lors du diagnostic: {e}")
        traceback.print_exc()
        return jsonify({"error": f"Erreur lors du diagnostic: {str(e)}"}), 500

@app.route('/api/mark-read', methods=['POST'])
def mark_read():
    ids = request.json.get("ids", [])
    if not ids: return jsonify({"status": "no_ids_provided"})
    db = get_db()
    query = "UPDATE changes_log SET seen = 1 WHERE id IN ({})".format(','.join('?' for _ in ids))
    db.execute(query, ids)
    db.commit()
    return jsonify({"status": "marked_as_read"})

@app.route('/api/videos', methods=['GET'])
def get_videos():
    """
    Récupère la liste de toutes les vidéos disponibles dans le dossier public/videos
    """
    try:
        videos_dir = os.path.join(os.path.dirname(__file__), '..', 'frontend', 'public', 'videos')
        
        # Log pour débogage
        print(f"[DEBUG] Recherche des vidéos dans: {videos_dir}")
        print(f"[DEBUG] Le dossier existe: {os.path.exists(videos_dir)}")
        
        videos_list = []
        
        if os.path.exists(videos_dir):
            files = os.listdir(videos_dir)
            print(f"[DEBUG] Fichiers trouvés: {files}")
            
            for filename in files:
                if filename.lower().endswith(('.mp4', '.webm', '.ogg', '.mov')):
                    filepath = os.path.join(videos_dir, filename)
                    filesize = os.path.getsize(filepath)
                    print(f"[DEBUG] Ajout de la vidéo: {filename} ({filesize} bytes)")
                    videos_list.append({
                        'name': filename,
                        'path': f'/videos/{filename}',
                        'size': filesize,
                        'type': os.path.splitext(filename)[1].lower()
                    })
        else:
            print(f"[DEBUG] Le dossier n'existe pas!")
        
        # Trier par nom
        videos_list.sort(key=lambda x: x['name'])
        
        print(f"[DEBUG] Total vidéos trouvées: {len(videos_list)}")
        
        return jsonify({
            'videos': videos_list,
            'count': len(videos_list)
        })
    except Exception as e:
        print(f"Error fetching videos: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/videos/<path:filename>', methods=['GET', 'OPTIONS'])
def serve_video(filename):
    """
    Serve video files from the frontend/public/videos directory with proper CORS headers
    Handles both exact and case-insensitive file matching
    """
    # Handle CORS preflight
    if request.method == 'OPTIONS':
        response = Response()
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS, HEAD'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Range'
        response.headers['Access-Control-Max-Age'] = '3600'
        return response
    
    try:
        videos_dir = os.path.join(os.path.dirname(__file__), '..', 'frontend', 'public', 'videos')
        videos_dir = os.path.abspath(videos_dir)
        
        print(f"\n[VIDEO_SERVE] ▶️ Request for video: {filename}")
        print(f"[VIDEO_SERVE] Base directory: {videos_dir}")
        
        # Try exact match first
        filepath = os.path.join(videos_dir, filename)
        filepath = os.path.abspath(filepath)
        
        # If exact match fails, try case-insensitive
        if not os.path.exists(filepath) and os.path.isdir(videos_dir):
            print(f"[VIDEO_SERVE] Exact match not found, trying case-insensitive...")
            try:
                files = os.listdir(videos_dir)
                print(f"[VIDEO_SERVE] Available files: {files}")
                
                for f in files:
                    if f.lower() == filename.lower():
                        filepath = os.path.join(videos_dir, f)
                        filepath = os.path.abspath(filepath)
                        print(f"[VIDEO_SERVE] ✅ Found case-insensitive match: {f}")
                        break
            except Exception as e:
                print(f"[VIDEO_SERVE] Error listing directory: {e}")
        
        # Security check
        if not filepath.startswith(videos_dir):
            print(f"[VIDEO_SERVE] ❌ Security blocked - path outside videos dir")
            return jsonify({'error': 'Access denied'}), 403
        
        # Check if file exists
        if not os.path.exists(filepath):
            print(f"[VIDEO_SERVE] ❌ File not found: {filepath}")
            return jsonify({'error': 'Video not found', 'requested': filename}), 404
        
        # Determine MIME type
        ext = os.path.splitext(filepath)[1].lower()
        mime_types = {
            '.mp4': 'video/mp4',
            '.webm': 'video/webm',
            '.ogg': 'video/ogg',
            '.mov': 'video/quicktime'
        }
        mime_type = mime_types.get(ext, 'application/octet-stream')
        
        file_size = os.path.getsize(filepath)
        print(f"[VIDEO_SERVE] ✅ Serving: {os.path.basename(filepath)}")
        print(f"[VIDEO_SERVE] Size: {file_size} bytes, MIME: {mime_type}")
        
        # Use send_file for proper streaming
        response = send_file(
            filepath,
            mimetype=mime_type,
            as_attachment=False
        )
        
        # Add CORS and caching headers
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Expose-Headers'] = 'Content-Length, Content-Range'
        response.headers['Accept-Ranges'] = 'bytes'
        response.headers['Cache-Control'] = 'public, max-age=86400'
        response.headers['Content-Type'] = mime_type
        
        return response
        
    except Exception as e:
        print(f"[VIDEO_SERVE] ❌ Exception: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e), 'type': type(e).__name__}), 500



# Mettez cette fonction à la place de l'ancienne fonction vide ou de la simulation de base
def simulate_sensor_data_logging():
    """
    Cette fonction s'exécute dans un thread séparé en arrière-plan.
    Elle simule l'arrivée de nouvelles données de capteurs toutes les 5 secondes.
    """
    print("✅ [Simulation] Démarrage du thread de simulation des capteurs...")
    
    # Define realistic ranges and variations for each sensor type
    SENSOR_CONFIGS = {
        'Température': {
            'min_safe': 20,     # Normal room temperature range
            'max_safe': 23,
            'variation': 0.1    # Small temperature changes
        },
        'Humidité': {
            'min_safe': 40,     # Comfortable humidity range
            'max_safe': 50,
            'variation': 0.2    # Gradual humidity changes
        },
        'Pression': {
            'min_safe': 1013,   # Normal atmospheric pressure
            'max_safe': 1015,
            'variation': 0.1    # Minimal pressure changes
        },
        'Qualité de l\'air': {
            'min_safe': 30,     # Good AQI range
            'max_safe': 50,
            'variation': 0.3    # Gradual air quality changes
        }
    }

    def get_initial_value(sensor_type, min_threshold, max_threshold):
        config = SENSOR_CONFIGS.get(sensor_type)
        if not config:
            return (min_threshold + max_threshold) / 2
            
        # Start with a value in the middle of the safe range
        base_value = (config['min_safe'] + config['max_safe']) / 2
        # Add small random variation
        variation = (config['max_safe'] - config['min_safe']) * 0.1
        return base_value + random.uniform(-variation, variation)

    while True:
        try:
            conn = sqlite3.connect(DATABASE, check_same_thread=False)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()

            active_sensors = cursor.execute(
                "SELECT id, name, type, min_threshold, max_threshold FROM sensors WHERE status = 'Actif'"
            ).fetchall()
            
            if not active_sensors:
                print("INFO [Simulation] Aucun capteur actif trouvé, en attente...")
            else:
                print(f"INFO [Simulation] Génération de données pour {len(active_sensors)} capteur(s) actif(s)...")

            for sensor in active_sensors:
                sensor_config = SENSOR_CONFIGS.get(sensor['type'])
                if not sensor_config:
                    continue

                last_data = cursor.execute(
                    "SELECT value FROM sensor_data WHERE sensor_id = ? ORDER BY timestamp DESC LIMIT 1",
                    (sensor['id'],)
                ).fetchone()

                if last_data:
                    last_value = last_data['value']
                    variation = sensor_config['variation']
                    # Tendency to return to safe range if outside
                    if last_value < sensor_config['min_safe']:
                        change = random.uniform(0, variation)
                    elif last_value > sensor_config['max_safe']:
                        change = random.uniform(-variation, 0)
                    else:
                        change = random.uniform(-variation, variation)
                    new_value = last_value + change
                else:
                    new_value = get_initial_value(sensor['type'], sensor['min_threshold'], sensor['max_threshold'])

                # Ensure value stays within absolute thresholds
                new_value = max(sensor['min_threshold'], min(sensor['max_threshold'], new_value))

                timestamp = datetime.now()
                cursor.execute(
                    "INSERT INTO sensor_data (sensor_id, value, timestamp) VALUES (?, ?, ?)",
                    (sensor['id'], new_value, timestamp)
                )

            conn.commit()
            cursor.close()
            conn.close()

        except sqlite3.OperationalError as e:
            print(f"❌ ERREUR [Simulation] Erreur de base de données : {e}")
        except Exception as e:
            print(f"❌ ERREUR [Simulation] Une erreur inattendue est survenue : {e}")
            traceback.print_exc()
        
        time.sleep(5)

# Update demo sensors with realistic thresholds
if __name__ == '__main__':
    if not os.path.exists(DATABASE):
        with app.app_context():
            db = get_db()
            db.execute('CREATE TABLE sensors (id INTEGER PRIMARY KEY, name TEXT, type TEXT, status TEXT, lat REAL, lon REAL, battery_level INTEGER, min_threshold REAL, max_threshold REAL);')
            db.execute('CREATE TABLE sensor_data (id INTEGER PRIMARY KEY, sensor_id INTEGER, value REAL, timestamp DATETIME, FOREIGN KEY(sensor_id) REFERENCES sensors(id));')
            db.execute('CREATE TABLE changes_log (id INTEGER PRIMARY KEY, change_type TEXT, description TEXT, date DATETIME, link TEXT, seen INTEGER DEFAULT 0);')
            demo_sensors = [
                ('Temperature_Sensor_A', 'Température', 'Actif', 48.8566, 2.3522, 98, 18, 25),    # Room temp
                ('Humidity_Sensor_A', 'Humidité', 'Actif', 45.7640, 4.8357, 95, 35, 65),         # Humidity
                ('Pression_Sensor_A', 'Pression', 'Inactif', 43.2965, 5.3698, 75, 1010, 1020),   # Pressure
                ('Air_Quality_Sensor_A', 'Qualité de l\'air', 'Actif', 50.6292, 3.0573, 88, 0, 100), # AQI
                ('Temperature_Sensor_B', 'Température', 'Maintenance', 43.7102, 7.2620, 23, 18, 25)   # Room temp
            ]
            for s in demo_sensors:
                db.execute('INSERT INTO sensors (name, type, status, lat, lon, battery_level, min_threshold, max_threshold) VALUES (?,?,?,?,?,?,?,?)', s)
            db.commit()
            print("Database created and populated with demo data.")

    # Démarrage du thread de simulation en arrière-plan
    sensor_sim_thread = Thread(target=simulate_sensor_data_logging, daemon=True)
    sensor_sim_thread.start()
    
    # Démarrage du serveur web Flask
    print("🚀 Démarrage du serveur Flask sur http://0.0.0.0:5000")
    app.run(host='0.0.0.0', port=5000, debug=True, use_reloader=False)
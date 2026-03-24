import sqlite3

# Connexion à la base SQLite
conn = sqlite3.connect("iot_dashboard.db")
cursor = conn.cursor()

# Récupérer tous les capteurs
cursor.execute("SELECT id, name FROM sensors ORDER BY id")
sensors = cursor.fetchall()

print(f"🔍 {len(sensors)} capteurs trouvés.\n")

# Boucle sur chaque capteur
for sensor_id, old_name in sensors:
    print(f"Capteur #{sensor_id} : {old_name}")
    
    # Demande à l'utilisateur une nouvelle valeur
    new_name = input("➡️ Nouveau nom (laisser vide pour garder le même) : ").strip()
    
    if new_name:
        cursor.execute("UPDATE sensors SET name = ? WHERE id = ?", (new_name, sensor_id))
        print(f"✅ Nom modifié : {old_name} → {new_name}\n")
    else:
        print("⏩ Aucun changement.\n")

# Sauvegarde et fermeture
conn.commit()
conn.close()

print("✅ Toutes les modifications terminées et enregistrées.")

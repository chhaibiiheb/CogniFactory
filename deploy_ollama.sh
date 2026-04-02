# Deployment script for updating backend to use Ollama
# Run this on your Azure VM after copying the updated files

echo "Updating backend to use Ollama..."

# Navigate to backend directory
cd /path/to/your/backend

# Install updated requirements
pip install -r requirements.txt

# Make sure Ollama is running
sudo systemctl status ollama

# Restart your Flask application
# (adjust this command based on how you're running Flask)
sudo systemctl restart your-flask-service

echo "Backend updated successfully! Now using Ollama with llama3.1:8b"
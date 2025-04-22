#!/bin/bash
echo "=== Installation de l'environnement TOCH OCR IA ==="
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
echo "=== Installation terminée ! ==="
echo "Lancez avec : streamlit run app.py"

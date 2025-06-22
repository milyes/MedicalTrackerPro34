# NetSecurePro IA - OCR Intelligent

Interface web futuriste et application mobile pour l'analyse OCR de documents PDF avec intelligence artificielle.

## 🚀 Fonctionnalités

- **OCR PDF précis** avec PyMuPDF et Tesseract
- **Interface web style terminal futuriste** avec effets cyberpunk
- **Application mobile Flutter** avec WebView offline
- **Export de texte** avec métadonnées complètes
- **QR Code intégré** pour téléchargement APK
- **Interface CLI** pour terminal/Termux
- **Support multilingue** (français + anglais)

## 👨‍💻 Auteur

**Zoubirou Mohammed Ilyes**
- ORCID: [https://orcid.org/0009-0007-7571-3178](https://orcid.org/0009-0007-7571-3178)
- Version: 1.0

## 🌐 Interface Web

L'interface web offre une expérience immersive avec :
- Terminal IA interactif
- Upload par glisser-déposer
- Effets visuels et sonores
- Design cyberpunk futuriste
- Commandes terminal avancées

### Commandes disponibles :
- `help` - Afficher l'aide
- `status` - État du système
- `show results` - Afficher les résultats OCR
- `export` - Exporter vers fichier texte
- `download` - Télécharger le dernier export
- `qr` - Générer QR Code pour APK
- `version` - Informations du système
- `clear` - Effacer les résultats

## 📱 Version Mobile

Téléchargez l'application Android :
- **APK**: [https://netsecurepro.github.io/NetSecureOCR.apk](https://netsecurepro.github.io/NetSecureOCR.apk)
- WebView intégré pour mode offline
- Interface optimisée mobile

## 💻 Interface CLI

Utilisation en ligne de commande :

```bash
# Mode interactif
python cli_ocr.py -i

# Traitement direct
python cli_ocr.py document.pdf -o resultat.txt

# Export JSON avec métadonnées
python cli_ocr.py document.pdf -o data.json --json

# Spécifier la langue
python cli_ocr.py document.pdf -l fra+eng -o output.txt
```

### Commandes CLI :
- `process <fichier.pdf>` - Traiter un PDF
- `version` - Version du système
- `info` - Informations détaillées
- `help` - Aide
- `quit` - Quitter

## 🛠️ Installation

### Prérequis
- Python 3.11+
- Tesseract OCR
- Flask
- PyMuPDF (fitz)
- PIL/Pillow

### Installation des dépendances
```bash
pip install flask pytesseract pymupdf pillow qrcode
```

### Lancement
```bash
# Interface web
python main.py

# CLI
python cli_ocr.py
```

## 🎨 Technologies

- **Backend**: Flask + Python
- **OCR**: PyMuPDF + Tesseract
- **Frontend**: TailwindCSS + JavaScript
- **Mobile**: Flutter + WebView
- **Design**: Interface cyberpunk futuriste

## 📊 API Endpoints

- `POST /ask` - Commandes terminal IA
- `POST /process-pdf` - Upload et traitement PDF
- `GET /export-text` - Export fichier texte
- `GET /generate-qr` - Génération QR Code APK
- `GET /api/info` - Informations API pour mobile

## 🔧 Configuration

L'application utilise les variables d'environnement :
- `SESSION_SECRET` - Clé secrète Flask
- `DATABASE_URL` - URL base de données (optionnel)

## 📝 Format d'Export

Les exports incluent :
- Métadonnées complètes (auteur, date, version)
- Texte OCR extrait
- Statistiques de traitement
- Informations de source

## 🚀 Déploiement

Compatible avec :
- Replit Deployments
- Heroku
- VPS Linux
- Termux (Android)

---

*Projet développé dans le cadre de l'écosystème NetSecurePro IA*
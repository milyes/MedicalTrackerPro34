# NetSecurePro IA - OCR Intelligent

## Overview

NetSecurePro IA is a futuristic OCR (Optical Character Recognition) system that extracts text from PDF documents using AI-powered analysis. The application features a cyberpunk-themed web interface with terminal-style interactions, a mobile Flutter app, and a command-line interface for versatility across different platforms.

## System Architecture

### Frontend Architecture
- **Web Interface**: HTML/CSS/JavaScript with TailwindCSS framework
- **Terminal-style UI**: Cyberpunk-themed interface with interactive command system
- **Responsive Design**: Mobile-optimized layouts with futuristic visual effects
- **Audio Integration**: Sound effects for user interactions and feedback

### Backend Architecture
- **Flask Framework**: Python-based web server handling HTTP requests
- **Session Management**: Flask sessions for storing OCR results and user data
- **File Processing**: PDF upload and processing pipeline
- **API Endpoints**: RESTful endpoints for terminal commands and file operations

### OCR Processing Engine
- **PyMuPDF (fitz)**: PDF document parsing and page extraction
- **Tesseract**: OCR text recognition engine
- **PIL/Pillow**: Image processing and manipulation
- **Multi-language Support**: French and English text recognition

## Key Components

### 1. Web Application (`app.py`)
- Flask-based server with session management
- OCR processing pipeline integration
- Terminal command processing system
- File upload and export functionality

### 2. CLI Tool (`cli_ocr.py`)
- Standalone command-line interface
- Batch processing capabilities
- JSON and text output formats
- Logging and error handling

### 3. Frontend Interface (`templates/index.html`)
- Cyberpunk-themed UI with glowing effects
- Interactive terminal simulation
- Drag-and-drop file upload
- Real-time command processing

### 4. Mobile Application
- Flutter-based Android app with WebView
- Offline functionality support
- APK distribution via GitHub Pages
- QR code integration for easy downloads

## Data Flow

1. **File Upload**: User uploads PDF via web interface or CLI
2. **PDF Processing**: PyMuPDF extracts pages as images
3. **OCR Analysis**: Tesseract processes images to extract text
4. **Session Storage**: Results stored in Flask sessions
5. **Response Generation**: Formatted text returned to user
6. **Export Options**: Text files with metadata generation

## External Dependencies

### Python Libraries
- `flask`: Web framework for HTTP server
- `pytesseract`: Python wrapper for Tesseract OCR
- `PyMuPDF`: PDF processing and image extraction
- `Pillow`: Image processing library
- `logging`: Application logging and debugging

### Frontend Libraries
- `TailwindCSS`: Utility-first CSS framework
- `Font Awesome`: Icon library for UI elements
- `Google Fonts`: Roboto Mono for terminal aesthetics

### System Dependencies
- `Tesseract OCR`: Core OCR engine
- `Python 3.x`: Runtime environment

## Deployment Strategy

### Web Application
- Flask development server on port 5000
- Session-based state management
- Static file serving for CSS/JS/assets
- Environment variable configuration

### Mobile Distribution
- APK hosted on GitHub Pages
- Direct download via generated URLs
- QR code integration for easy access

### CLI Distribution
- Standalone Python script
- Cross-platform compatibility
- Package requirements via pip

## User Preferences

Preferred communication style: Simple, everyday language.

## Changelog

Changelog:
- June 30, 2025. Initial setup
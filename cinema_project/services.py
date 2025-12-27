import os
import requests
import google.generativeai as genai
from dotenv import load_dotenv

# .env dosyasını yükle
load_dotenv()

# API Anahtarları
TMDB_API_KEY = os.getenv('TMDB_API_KEY')
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
TMDB_BASE_URL = "https://api.themoviedb.org/3"

# --- TMDB Servisi (Film Verisi) ---
def get_popular_movies_tmdb():
    """TMDB'den popüler filmleri çeker."""
    url = f"{TMDB_BASE_URL}/movie/now_playing?api_key={TMDB_API_KEY}&language=tr-TR&page=1"
    response = requests.get(url)
    if response.status_code == 200:
        return response.json().get('results', [])
    return []

def get_trailer_url_tmdb(movie_id):
    """Film ID'sine göre YouTube fragman linki oluşturur."""
    url = f"{TMDB_BASE_URL}/movie/{movie_id}/videos?api_key={TMDB_API_KEY}&language=en-US"
    response = requests.get(url)
    if response.status_code == 200:
        results = response.json().get('results', [])
        for video in results:
            if video['site'] == 'YouTube' and video['type'] == 'Trailer':
                return f"https://www.youtube.com/watch?v={video['key']}"
    return None

# --- Gemini Servisi (Chatbot) ---
def get_ai_response(user_message, context_text):
    """Gemini AI ile sohbet eder."""
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel('gemini-pro')
        
        prompt = (
            f"Sen bir sinema asistanısın. Şu an vizyondaki filmlerimiz: {context_text}. "
            f"Kullanıcı sorusu: {user_message}. "
            "Kısa, öz ve Türkçe cevap ver."
        )
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        return "Şu an bağlantıda sorun var, lütfen sonra tekrar dene."

let currentSessionTime = "13:00"; 
let selectedMoviePrice = 0;
let currentMovieId = null;

// Basit Kullanıcı (Sadece tür tercihi için)
const currentUser = { 
    favoriteGenre: "Sci-Fi" // Tenet Sci-Fi olduğu için ana sayfada görünecek
};

// Dolu Koltuklar (Şimdilik Sahte, sonra DB'den çekeceğiz)
const allBookings = [
    { movieId: 1, seatIndex: 10, time: "13:00" }, // Örnek dolu koltuk
];

// Kullanıcının aldığı biletleri tutan geçici dizi
//const userTickets = [];

// --- 2. DOM ELEMENTLERİ ---
const moviesGrid = document.getElementById('movies-grid');
const recommendedGrid = document.getElementById('recommended-grid');
const modal = document.getElementById('booking-modal');
const closeBtn = document.querySelector('.close-btn');
const seatsContainer = document.getElementById('seats-grid');
const countSpan = document.getElementById('count');
const totalSpan = document.getElementById('total');
const confirmBtn = document.getElementById('confirm-btn');
const homeSection = document.getElementById('home-section');
const profileSection = document.getElementById('profile-section');
const heroSection = document.querySelector('.hero');



// --- 3. TEMEL FONKSİYONLAR ---

// Filmleri Ekrana Bas (HTML'den gelen 'movies' değişkenini kullanır)
// FİLM LİSTELEME VE ÖNERİ MOTORU
function renderMovies() {
    if (!moviesGrid) return;
    moviesGrid.innerHTML = '';
    
    if (typeof movies !== 'undefined') {
        // 1. Tüm Filmleri Listele (Vizyondakiler)
        movies.forEach(movie => {
            moviesGrid.appendChild(createMovieCard(movie));
        });
        
        // 2. Önerilenleri Listele (Kişisel Geçmişe Göre)
        if (recommendedGrid) {
            recommendedGrid.innerHTML = '';
            let recs = [];

            // Eğer kullanıcının favori türü varsa (Backend'den geldiyse)
            if (userFavoriteGenre && userFavoriteGenre !== "") {
                console.log("Kullanıcının favori türü:", userFavoriteGenre);
                
                // Sadece o türe ait filmleri filtrele
                // (includes kullanıyoruz ki 'Action, Adventure' gibi çoklu türleri de yakalasın)
                recs = movies.filter(m => m.genre && m.genre.includes(userFavoriteGenre));
                
                // Başlığı Güncelle (Opsiyonel ama şık olur)
                const recTitle = document.querySelector('.recommendations h2');
                if(recTitle) recTitle.innerHTML = `<i class="fas fa-heart"></i> Çünkü "${userFavoriteGenre}" Seviyorsunuz`;

            } else {
                // Eğer bilet geçmişi yoksa varsayılan olarak "Sci-Fi" veya yüksek puanlıları öner
                recs = movies.filter(m => m.rating >= 4.0); // Örn: Puanı 4 ve üzeri olanlar
            }

            // Hiç film bulunamazsa (Örn: O türde film yoksa)
            if (recs.length === 0) {
                 recommendedGrid.innerHTML = '<p style="color:#aaa; padding:10px;">Şu an size özel önerimiz yok.</p>';
            } else {
                recs.forEach(movie => {
                    recommendedGrid.appendChild(createMovieCard(movie));
                });
            }
        }
    }
}

// Film Kartı HTML Oluşturucu
function createMovieCard(movie) {
    const div = document.createElement('div');
    div.classList.add('movie-card');
    div.innerHTML = `
        <img src="${movie.image}" alt="${movie.title}" class="movie-poster">
        <div class="movie-info">
            <h3>${movie.title}</h3>
            <div class="movie-meta">
                <span>${movie.genre}</span>
                <span class="rating"><i class="fas fa-star"></i> ${movie.rating}</span>
            </div>
        </div>
    `;
    div.addEventListener('click', () => openBooking(movie));
    return div;
}

// Modalı Aç
function openBooking(movie) {
    modal.style.display = 'flex';
    currentMovieId = movie.id;
    selectedMoviePrice = movie.price;

    document.getElementById('modal-title').innerText = movie.title;
    document.getElementById('modal-info').innerText = `${movie.director} | ${movie.genre}`;
    
    generateSeats();
    updateSelection();
}

// Koltukları Çiz (GÜNCELLENMİŞ)
function generateSeats() {
    seatsContainer.innerHTML = '';
    
    for (let i = 0; i < 48; i++) {
        const seat = document.createElement('div');
        seat.classList.add('seat');

        // Rezervasyon bilgisini bul
        const booking = dbBookings.find(b => 
            b.movieId === currentMovieId && 
            b.seatIndex === i && 
            b.time === currentSessionTime
        );

        if (booking) {
            seat.classList.add('occupied'); // Dolu
            
            // EĞER ARKADAŞIMSA ÖZEL STİL EKLE
            if (booking.isFriend) {
                seat.classList.add('friend'); 
                seat.setAttribute('data-name', `${booking.ownerName} Burada!`); // İsim balonu
                seat.innerText = "★"; // Yıldız ikonu
            }
        } else {
            // Boş koltuk tıklama olayı (eskisi gibi)
            seat.addEventListener('click', () => {
                if (!seat.classList.contains('occupied')) {
                    seat.classList.toggle('selected');
                    updateSelection();
                }
            });
        }
        seatsContainer.appendChild(seat);
    }
}

// Fiyat Hesapla
function updateSelection() {
    const selectedSeats = seatsContainer.querySelectorAll('.seat.selected');
    const count = selectedSeats.length;
    countSpan.innerText = count;
    totalSpan.innerText = count * selectedMoviePrice;
}

// --- 4. ETKİLEŞİM VE BUTONLAR ---

// Seans Değiştir
function selectSession(time, btnElement) {
    currentSessionTime = time;
    document.querySelectorAll('.time-btn').forEach(btn => btn.classList.remove('active'));
    btnElement.classList.add('active');
    generateSeats(); // Koltukları yeni saate göre yenile
    updateSelection();
}

// Bilet Al (Onayla)
// Bilet Al (Onayla)
// Bilet Al (Onayla)
confirmBtn.onclick = async () => {
    const selectedSeats = seatsContainer.querySelectorAll('.seat.selected');
    
    if (selectedSeats.length > 0) {
        for (let seat of selectedSeats) {
            const seatIndex = Array.from(seatsContainer.children).indexOf(seat);
            const bookingData = {
                movieId: currentMovieId,
                seatIndex: seatIndex, // userName göndermiyoruz, backend kendi buluyor
                sessionTime: currentSessionTime 
            };

            try {
                const response = await fetch('/api/book/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(bookingData)
                });
                
                const result = await response.json();
                
                // ÖZEL DURUM: Eğer giriş yapılmamışsa (401 Hatası)
                if (response.status === 401) {
                    alert(result.message); // "Lütfen giriş yapınız" mesajı
                    modal.style.display = 'none'; // Koltuk seçimini kapat
                    loginModal.style.display = 'flex'; // Giriş ekranını aç
                    return; // İşlemi durdur
                }

                if(result.status === 'error') {
                    alert("Hata: " + result.message);
                    return;
                }

            } catch (error) {
                console.error('Hata:', error);
                alert("Bağlantı hatası!");
                return;
            }
        }
        alert("Biletleriniz başarıyla alındı!");
        modal.style.display = 'none';
        location.reload(); 
    } else {
        alert("Lütfen koltuk seçiniz.");
    }
};

// --- 5. NAVİGASYON ---

function showSection(sectionName) {
    homeSection.style.display = 'none';
    profileSection.style.display = 'none';
    heroSection.style.display = 'none';

    if (sectionName === 'home') {
        homeSection.style.display = 'block';
        heroSection.style.display = 'flex';
    } else if (sectionName === 'profile') {
        profileSection.style.display = 'block';
        
    }
}


// --- 5. GİRİŞ VE PANEL YÖNETİMİ ---

const loginModal = document.getElementById('login-modal');
const registerModal = document.getElementById('register-modal');

// GÜVENLİ BUTONLAR
const loginBtn = document.getElementById('login-btn');
if (loginBtn) {
    loginBtn.onclick = () => { if (loginModal) loginModal.style.display = 'flex'; };
}

const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.onclick = async () => {
        await fetch('/api/logout/');
        location.reload(); 
    };
}

// KAPATMA BUTONLARI (X işaretleri)
document.querySelectorAll('.close-login').forEach(btn => {
    btn.onclick = () => { if (loginModal) loginModal.style.display = 'none'; };
});
document.querySelectorAll('.close-register').forEach(btn => {
    btn.onclick = () => { if (registerModal) registerModal.style.display = 'none'; };
});

// PENCERE GEÇİŞİ (Giriş <-> Kayıt)
function switchModal(target) {
    if (target === 'register') {
        loginModal.style.display = 'none';
        registerModal.style.display = 'flex';
    } else {
        registerModal.style.display = 'none';
        loginModal.style.display = 'flex';
    }
}

// 1. GİRİŞ YAP FONKSİYONU
async function login() {
    const userInp = document.getElementById('username').value;
    const passInp = document.getElementById('password').value;

    try {
        const response = await fetch('/api/login/', {
            method: 'POST',
            body: JSON.stringify({ username: userInp, password: passInp })
        });
        const result = await response.json();

        if (result.status === 'success') {
            alert("Hoşgeldin " + result.username);
            location.reload(); 
        } else {
            alert("Hata: " + result.message);
        }
    } catch (error) { console.error(error); }
}

// 2. KAYIT OL FONKSİYONU (YENİ)
async function register() {
    const userInp = document.getElementById('reg-username').value;
    const emailInp = document.getElementById('reg-email').value;
    const passInp = document.getElementById('reg-password').value;

    if (!userInp || !passInp) {
        alert("Lütfen tüm alanları doldurun.");
        return;
    }

    try {
        const response = await fetch('/api/register/', {
            method: 'POST',
            body: JSON.stringify({ username: userInp, email: emailInp, password: passInp })
        });
        const result = await response.json();

        if (result.status === 'success') {
            alert("Kayıt Başarılı! Otomatik giriş yapılıyor...");
            location.reload(); 
        } else {
            alert("Hata: " + result.message);
        }
    } catch (error) { console.error(error); }
}

// BİLET İPTAL FONKSİYONU
async function cancelTicket(bookingId) {
    if(!confirm("Bu bileti iptal etmek istediğinize emin misiniz?")) return;

    try {
        const response = await fetch('/api/cancel/', {
            method: 'POST',
            body: JSON.stringify({ booking_id: bookingId })
        });
        
        const result = await response.json();

        if (result.status === 'success') {
            alert("Bilet iptal edildi.");
            location.reload(); // Sayfayı yenile ki listeden silinsin ve koltuk boşalsın
        } else {
            alert("Hata: " + result.message);
        }
    } catch (error) {
        console.error("İptal hatası:", error);
    }
}

// --- 6. YORUM VE SEKME YÖNETİMİ ---

let currentRating = 0; // Seçilen yıldız puanı

// Sekme Değiştirme (Booking <-> Review)
function switchTab(tabName) {
    document.getElementById('tab-booking').style.display = (tabName === 'booking') ? 'block' : 'none';
    document.getElementById('tab-reviews').style.display = (tabName === 'reviews') ? 'block' : 'none';
    
    // Buton renklerini güncelle
    const btns = document.querySelectorAll('.tab-btn');
    if(tabName === 'booking') {
        btns[0].style.backgroundColor = '#e50914';
        btns[1].style.backgroundColor = '#333';
    } else {
        btns[0].style.backgroundColor = '#333';
        btns[1].style.backgroundColor = '#e50914';
        loadReviewsForMovie(); // Yorum sekmesi açılınca yorumları yükle
    }
}

// Yıldız Seçme İşlemi
function setRating(n) {
    currentRating = n;
    const stars = document.querySelectorAll('.star-rating span');
    document.getElementById('rating-text').innerText = `(${n}/5)`;
    
    // Seçilen yıldıza kadar hepsini sarı yap
    stars.forEach((star, index) => {
        if (index < 5) { // Sadece yıldız olan spanları etkile
            star.style.color = (index < n) ? '#f1c40f' : '#555';
        }
    });
}

// Yorumları Listele
function loadReviewsForMovie() {
    const list = document.getElementById('reviews-list');
    list.innerHTML = '';

    // Sadece bu filme ait yorumları filtrele
    const movieReviews = dbReviews.filter(r => r.movieId === currentMovieId);

    if (movieReviews.length === 0) {
        list.innerHTML = '<p style="color:#aaa;">Henüz yorum yok. İlk yorumu sen yap!</p>';
        return;
    }

    movieReviews.forEach(r => {
        const div = document.createElement('div');
        div.style.marginBottom = '15px';
        div.style.paddingBottom = '10px';
        div.style.borderBottom = '1px solid #444';
        
        // Yıldızları oluştur
        const stars = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
        
        // Onaylı İzleyici Rozeti
        const badge = r.verified ? '<span style="background:green; font-size:10px; padding:2px 5px; border-radius:3px; margin-left:5px;">✓ İzledi</span>' : '';

        div.innerHTML = `
            <div style="font-weight:bold; color:#e50914;">${r.user} <span style="color:#f1c40f;">${stars}</span> ${badge}</div>
            <div style="font-size:0.9rem; margin-top:5px;">${r.comment}</div>
        `;
        list.appendChild(div);
    });
}

// Yorumu Gönder
async function submitReview() {
    const comment = document.getElementById('review-comment').value;

    if (currentRating === 0) {
        alert("Lütfen puan veriniz.");
        return;
    }

    try {
        const response = await fetch('/api/add_review/', {
            method: 'POST',
            body: JSON.stringify({
                movieId: currentMovieId,
                rating: currentRating,
                comment: comment
            })
        });

        const result = await response.json();

        if (result.status === 'success') {
            alert("Yorumunuz eklendi!");
            location.reload(); // Sayfayı yenileyip yorumu göster
        } else if (response.status === 401) {
            alert("Yorum yapmak için giriş yapmalısınız.");
        } else {
            alert("Hata: " + result.message);
        }
    } catch (error) {
        console.error(error);
    }
}

// 1. İSTEK GÖNDER
async function sendFriendRequest() {
    const usernameInput = document.getElementById('friend-username');
    const username = usernameInput.value;
    if (!username) return alert("Kullanıcı adı girin.");

    try {
        const response = await fetch('/api/add_friend/', { // URL aynı kaldı ama backend değişti
            method: 'POST',
            body: JSON.stringify({ username: username })
        });
        const result = await response.json();
        alert(result.message);
        if(result.status === 'success') location.reload();
        
    } catch (e) {
        console.error(e);
    }
}

// 2. İSTEĞE CEVAP VER (Kabul/Red)
async function respondToRequest(reqId, action) {
    try {
        const response = await fetch('/api/handle_request/', {
            method: 'POST',
            body: JSON.stringify({ request_id: reqId, action: action })
        });
        const result = await response.json();
        alert(result.message);
        location.reload(); // Listeyi güncelle
    } catch (e) {
        console.error(e);
    }
}

// Modal Kapatma
closeBtn.onclick = () => modal.style.display = 'none';
window.onclick = (e) => { if (e.target == modal) modal.style.display = 'none'; }

// Uygulamayı Başlat
renderMovies();
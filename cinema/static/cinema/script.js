// --- 1. GLOBAL VERİLER VE DEĞİŞKENLER ---
let currentSessionTime = "13:00"; // Varsayılan saat

// SİSTEMDEKİ TÜM KULLANICILAR (Chatbot analizi için gerekli)
const usersDB = [
    { username: "ali", name: "Ali Veli", favGenre: "Action" },
    { username: "ayse", name: "Ayşe Y.", favGenre: "Drama" },
    { username: "mehmet", name: "Mehmet K.", favGenre: "Sci-Fi" },
    { username: "user", name: "Taha Öztürk", favGenre: "Sci-Fi" } // Bizim kullanıcımız
];

const currentUser = { 
    id: 101, 
    name: "Taha Öztürk", 
    favoriteGenre: "Sci-Fi",
    friends: ["Ali Veli", "Ayşe Y."] // Arkadaş Listesi
};

const allBookings = [
    // 13:00 Seansı için rezervasyonlar
    { movieId: 1, seatIndex: 10, user: "Ali Veli", time: "13:00" }, 
    { movieId: 1, seatIndex: 11, user: "Mehmet K.", time: "13:00" },
    
    // 17:00 Seansı için rezervasyonlar (Farklı koltuklar dolu olabilir!)
    { movieId: 1, seatIndex: 15, user: "Ayşe Y.", time: "17:00" }, // Aynı koltuk, farklı saat!
    { movieId: 1, seatIndex: 40, user: "Veli Can", time: "17:00" }
];

const reviews = [
    { movieId: 1, user: "Ali Veli", rating: 5, comment: "Nolan yine yapmış yapacağını! Harika." },
    { movieId: 1, user: "Ayşe Y.", rating: 4, comment: "Görsel şölen ama biraz uzun." },
    { movieId: 2, user: "Mehmet K.", rating: 5, comment: "Gelmiş geçmiş en iyi Joker." }
];

/// Kullanıcı Biletleri (Mock DB) - GÜNCELLENMİŞ HALİ
const userTickets = [
    { movie: "Inception", date: "20.12.2025", time: "20:00", seats: "A1, A2", total: 300 }
];

// Global Kontrol Değişkenleri
let selectedMoviePrice = 0;
let currentMovieId = null; 

// --- 2. DOM ELEMENTLERİ ---
const moviesGrid = document.getElementById('movies-grid');
const recommendedGrid = document.getElementById('recommended-grid');
const modal = document.getElementById('booking-modal');
const closeBtn = document.querySelector('.close-btn');
const seatsContainer = document.getElementById('seats-grid');
const countSpan = document.getElementById('count');
const totalSpan = document.getElementById('total');
const confirmBtn = document.getElementById('confirm-btn');

// --- 3. ANA FONKSİYONLAR ---

// Filmleri Ekrana Bas
function renderMovies() {
    moviesGrid.innerHTML = '';
    recommendedGrid.innerHTML = '';

    // Tüm Filmler
    movies.forEach(movie => {
        moviesGrid.appendChild(createMovieCard(movie));
    });

    // Önerilenler (Sci-Fi)
    const recommendations = movies.filter(m => m.genre === currentUser.favoriteGenre);
    recommendations.forEach(movie => {
        recommendedGrid.appendChild(createMovieCard(movie));
    });
}

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
    
    switchTab('booking');
    generateSeats();
    updateSelection();
    loadReviews(movie.id);
}

// Tab Değiştirme
function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.getElementById(`tab-${tabName}`).classList.add('active');

    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    if(tabName === 'booking') document.querySelector('.tab-btn:nth-child(1)').classList.add('active');
    else document.querySelector('.tab-btn:nth-child(2)').classList.add('active');
}


// Koltuk Oluşturma (GÜNCELLENMİŞ VERSİYON)
function generateSeats() {
    seatsContainer.innerHTML = '';
    
    for (let i = 0; i < 48; i++) {
        const seat = document.createElement('div');
        seat.classList.add('seat');

        // 1. Bu koltuk veritabanında dolu mu?
        const booking = allBookings.find(b => b.movieId === currentMovieId && b.seatIndex === i);

        if (booking) {
            // Koltuk Dolu
            seat.classList.add('occupied');
            
            // 2. Doluysa, oturan kişi arkadaşım mı?
            if (currentUser.friends.includes(booking.user)) {
                seat.classList.add('friend'); // Mavi renk sınıfı
                seat.setAttribute('data-name', `${booking.user} Burada!`); // İsim etiketi
                seat.innerText = "★"; // Yıldız ikonu
            }
        } else {
            // Koltuk Boşsa tıklama özelliği ekle
            seat.addEventListener('click', () => {
                seat.classList.toggle('selected');
                updateSelection();
            });
        }
        
        seatsContainer.appendChild(seat);
    }
}

// Fiyat Güncelle
function updateSelection() {
    const selectedSeats = seatsContainer.querySelectorAll('.seat.selected');
    const count = selectedSeats.length;
    countSpan.innerText = count;
    totalSpan.innerText = count * selectedMoviePrice;
}

// --- 4. BUTON İŞLEMLERİ ---

// Seans Saati Değiştirme Fonksiyonu
function selectSession(time, btnElement) {
    // 1. Global saati güncelle
    currentSessionTime = time;

    // 2. Görsel güncelleme (Active class'ı taşı)
    document.querySelectorAll('.time-btn').forEach(btn => btn.classList.remove('active'));
    btnElement.classList.add('active');

    // 3. Koltukları bu saate göre yeniden çiz
    generateSeats();
    updateSelection(); // Fiyatı sıfırla
}

// 2. Rezervasyon Onay Butonu (GÜNCELLENMİŞ)
confirmBtn.onclick = () => {
    const count = parseInt(countSpan.innerText);
    
    if (count > 0) {
        const movieTitle = document.getElementById('modal-title').innerText;
        const total = totalSpan.innerText;

        // Bileti Kaydet (Saat bilgisiyle beraber)
        userTickets.push({
            movie: movieTitle,
            date: new Date().toLocaleDateString(),
            time: currentSessionTime, // SEÇİLEN SAAT (13:00 veya 17:00)
            seats: count + " adet",
            total: total
        });

        alert(`Tebrikler! ${count} adet bilet başarıyla rezerve edildi.\nSeans: ${currentSessionTime}\nToplam: ${total} TL`);
        modal.style.display = 'none';

        // Profil açıksa tabloyu anlık güncelle
        if(document.getElementById('profile-section').style.display === 'block') {
            renderUserTickets();
        }
    } else {
        alert("Lütfen en az bir koltuk seçin.");
    }
};

// [BUTON 2] Yorum Gönder
function submitReview() {
    const userInfoEl = document.querySelector('.user-info');
    if (!userInfoEl) { alert("Sistem Hatası: Kullanıcı bilgisi bulunamadı."); return; }

    const userText = userInfoEl.innerText;
    if (userText.includes("Misafir")) {
        alert("Yorum yapmak için lütfen sağ üstten 'Giriş Yap' butonuna basınız.");
        return;
    }

    const commentText = document.getElementById('review-text').value;
    const selectedRating = document.querySelector('input[name="rate"]:checked');

    if (!selectedRating) { alert("Lütfen bir yıldız puanı seçin."); return; }
    if (commentText.trim() === "") { alert("Lütfen bir yorum yazın."); return; }

    // Aynı kullanıcı tekrar yorum yapamasın
    const userName = userText.trim();
    const alreadyReviewed = reviews.some(r => r.movieId === currentMovieId && r.user === userName);
    if(alreadyReviewed) {
        alert("Bu film için zaten yorum yaptınız!");
        return;
    }

    reviews.push({
        movieId: currentMovieId,
        user: userName,
        rating: parseInt(selectedRating.value),
        comment: commentText
    });

    document.getElementById('review-text').value = '';
    selectedRating.checked = false;
    loadReviews(currentMovieId);
    alert("Yorumunuz eklendi!");
}

// Yorumları Listele
function loadReviews(movieId) {
    const movieReviews = reviews.filter(r => r.movieId === movieId);
    const listContainer = document.getElementById('reviews-list');
    listContainer.innerHTML = '';

    let totalRating = 0;
    movieReviews.forEach(r => {
        totalRating += r.rating;
        const div = document.createElement('div');
        div.classList.add('review-item');
        const stars = "★".repeat(r.rating) + "☆".repeat(5 - r.rating);
        div.innerHTML = `<div class="review-user">${r.user} <span class="review-stars">${stars}</span></div><div class="review-text">${r.comment}</div>`;
        listContainer.appendChild(div);
    });

    const count = movieReviews.length;
    const average = count > 0 ? (totalRating / count).toFixed(1) : "0.0";
    document.getElementById('avg-rating-display').innerText = average;
    document.getElementById('review-count').innerText = count;
}

// --- 5. GİRİŞ VE PANEL YÖNETİMİ ---

const loginModal = document.getElementById('login-modal');
const homeSection = document.getElementById('home-section');
const adminSection = document.getElementById('admin-section');
const profileSection = document.getElementById('profile-section');
const heroSection = document.querySelector('.hero');

// Sayfa Değiştir
function showSection(sectionName) {
    homeSection.style.display = 'none';
    adminSection.style.display = 'none';
    profileSection.style.display = 'none';
    heroSection.style.display = 'none';

    if (sectionName === 'home') {
        homeSection.style.display = 'block';
        heroSection.style.display = 'flex';
        renderMovies();
    } else if (sectionName === 'admin') {
        adminSection.style.display = 'block';
        renderAdminTable();
    } else if (sectionName === 'profile') {
        profileSection.style.display = 'block';
        renderUserTickets();
    }
}

// Login İşlemleri
document.getElementById('login-btn').onclick = () => loginModal.style.display = 'flex';
document.querySelector('.close-login').onclick = () => loginModal.style.display = 'none';
document.getElementById('logout-btn').onclick = logout;

function login() {
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;

    if (user === 'admin' && pass === 'admin') {
        alert("Admin girişi başarılı.");
        document.getElementById('admin-link').style.display = 'block';
        setupAuthUI(true, "Admin");
        showSection('admin');
    } else if (user === 'user' && pass === 'user') {
        alert("Kullanıcı girişi başarılı.");
        document.getElementById('user-link').style.display = 'block';
        setupAuthUI(true, "Taha Öztürk");
        showSection('profile');
    } else {
        alert("Hatalı kullanıcı adı veya şifre!");
    }
    loginModal.style.display = 'none';
}

function logout() {
    setupAuthUI(false);
    showSection('home');
    document.getElementById('admin-link').style.display = 'none';
    document.getElementById('user-link').style.display = 'none';
}

function setupAuthUI(isLoggedIn, name = "") {
    const userInfoDiv = document.querySelector('.user-info');
    if (isLoggedIn) {
        document.getElementById('login-btn').style.display = 'none';
        document.getElementById('logout-btn').style.display = 'block';
        userInfoDiv.innerHTML = `<i class="fas fa-user-circle"></i> ${name}`;
    } else {
        document.getElementById('login-btn').style.display = 'block';
        document.getElementById('logout-btn').style.display = 'none';
        userInfoDiv.innerHTML = `<i class="fas fa-user-circle"></i> Misafir`;
    }
}

// --- 6. ADMIN & USER TABLOLARI ---

function renderUserTickets() {
    const tbody = document.getElementById('user-tickets-body');
    tbody.innerHTML = '';
    
    userTickets.forEach(ticket => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${ticket.movie}</td>
            <td>${ticket.date}</td>
            <td><span class="highlight">${ticket.time}</span></td> <td>${ticket.seats}</td>
            <td>${ticket.total} TL</td>
        `;
        tbody.appendChild(tr);
    });
}

function renderAdminTable() {
    const tbody = document.getElementById('admin-movies-body');
    tbody.innerHTML = '';
    movies.forEach((movie, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${movie.id}</td><td>${movie.title}</td><td>${movie.director}</td><td>${movie.genre}</td>
            <td><button class="delete-btn" onclick="deleteMovie(${index})">Sil</button></td>`;
        tbody.appendChild(tr);
    });
}

function addNewMovie() {
    const title = document.getElementById('new-title').value;
    const director = document.getElementById('new-director').value;
    const genre = document.getElementById('new-genre').value;
    if(title) {
        movies.push({ id: movies.length + 1, title, director, genre, rating: 0, price: 150, image: "https://via.placeholder.com/300x450" });
        renderAdminTable();
        alert("Film eklendi.");
    }
}

function deleteMovie(index) {
    if(confirm("Silmek istediğine emin misin?")) {
        movies.splice(index, 1);
        renderAdminTable();
    }
}

// --- 7. CHATBOT ---
const chatIcon = document.getElementById('chatbot-icon');
const chatBox = document.getElementById('chatbot-box');
const closeChat = document.getElementById('close-chat');
const sendBtn = document.getElementById('send-btn');
const userInput = document.getElementById('user-input');
const chatBody = document.getElementById('chat-body');

chatIcon.onclick = () => chatBox.style.display = 'flex';
closeChat.onclick = () => chatBox.style.display = 'none';
sendBtn.onclick = sendMessage;
userInput.addEventListener("keypress", (e) => { if (e.key === "Enter") sendMessage(); });

function sendMessage() {
    const text = userInput.value.trim().toLowerCase();
    if (text === "") return;
    addMessage(userInput.value, 'user-msg');
    userInput.value = '';

    setTimeout(() => {
        let botResponse = "Anlayamadım. Film önerisi veya seans sorabilirsin.";
        if (text.includes("öner") || text.includes("film")) {
             if(text.includes("aksiyon")) botResponse = "Aksiyon için The Dark Knight öneririm.";
             else if (text.includes("bilim")) botResponse = "Bilim kurgu için Inception harika.";
             else botResponse = "Hangi tür istersin?";
        } else if (text.includes("merhaba")) botResponse = "Merhaba, nasıl yardımcı olabilirim?";
        
        addMessage(botResponse, 'bot-msg');
        chatBody.scrollTop = chatBody.scrollHeight;
    }, 500);
}

function addMessage(text, cls) {
    const div = document.createElement('div');
    div.classList.add(cls);
    div.innerText = text;
    chatBody.appendChild(div);
}

// Modal Kapatma Eventleri
closeBtn.onclick = () => modal.style.display = 'none';
window.onclick = (e) => { if (e.target == modal) modal.style.display = 'none'; }

// Başlat
renderMovies();
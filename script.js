const firebaseConfig = {
  apiKey: "AIzaSyBYh8ffNvS1Chq9F_K2I49v1N_X429BxpM",
  authDomain: "lowest-price-stay.firebaseapp.com",
  projectId: "lowest-price-stay",
  storageBucket: "lowest-price-stay.firebasestorage.app",
  messagingSenderId: "674887550826",
  appId: "1:674887550826:web:8a44c2c27b30d3e9808713"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const isPGPage = window.location.pathname.includes('pg.html');

/**
 * THE ULTIMATE IMAGE FIX
 * Uses the lh3.googleusercontent.com CDN format which is the most stable for 2025.
 */
function processImageLink(url) {
    const fallback = 'https://images.unsplash.com/photo-1522770179533-24471fcdba45?q=80&w=600';
    if (!url || typeof url !== 'string' || url.trim() === "") return fallback;

    if (url.includes('drive.google.com')) {
        let fileId = "";
        try {
            // Regex to catch all possible Google Drive URL structures
            const match = url.match(/\/d\/(.+?)\/(?:view|edit|preview|copy)/) || 
                          url.match(/\/d\/(.+?)(?:\/|$)/) || 
                          url.match(/id=(.+?)(?:&|$)/);

            fileId = (match && match[1]) ? match[1] : "";

            if (fileId) {
                // This CDN format is highly resistant to CORS blocks
                return `https://lh3.googleusercontent.com/d/${fileId}`;
            }
        } catch (e) { 
            console.error("Link transformation failed", e); 
        }
    }
    return url; 
}

function loadStays() {
    const stayGrid = document.getElementById('stayGrid');
    if (!stayGrid) return;

    db.collection('listed_stays').onSnapshot(snapshot => {
        stayGrid.innerHTML = '';
        let delay = 0.1;

        snapshot.forEach(doc => {
            const stay = doc.data();

            // Routing properties to the correct page
            if (isPGPage && !stay.isPG) return; 
            if (!isPGPage && !stay.isShortStay) return; 

            const displayPrice = isPGPage ? (stay.pgPrice || stay.price) : (stay.shortPrice || stay.price);
            const priceLabel = isPGPage ? "month" : "night";

            // Check all common field names
            const rawUrl = stay.imageLink || stay.image || stay.stayImage || "";
            const imageUrl = processImageLink(rawUrl);

            const card = document.createElement('div');
            card.className = 'stay-card scale-in';
            card.style.animationDelay = `${delay}s`;
            card.setAttribute('data-location', stay.location.toLowerCase());

            card.innerHTML = `
                <div class="stay-img-container">
                    <img src="${imageUrl}" 
                         alt="${stay.location}" 
                         class="stay-img" 
                         referrerpolicy="no-referrer"
                         loading="lazy"
                         onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=600&q=80';">
                </div>
                <div class="stay-info">
                    <h3>${stay.location}</h3>
                    <p>Starting from Rs. ${displayPrice} / ${priceLabel}</p>
                    <button class="btn-book" onclick="openBookingModal('${stay.location}')">Book Now</button>
                </div>
            `;
            stayGrid.appendChild(card);
            delay += 0.1;
        });
    });
}

// Search Filter (No change)
function filterStays() {
    const input = document.getElementById('searchInput').value.toLowerCase().trim();
    const cards = document.getElementsByClassName('stay-card');

    for (let i = 0; i < cards.length; i++) {
        const loc = cards[i].getAttribute('data-location');
        if (input === "" || loc.includes(input)) {
            cards[i].style.display = "";
            cards[i].classList.add('scale-in');
        } else {
            cards[i].style.display = "none";
        }
    }
}

const searchInp = document.getElementById('searchInput');
if (searchInp) {
    searchInp.addEventListener('input', function() {
        if (this.value.trim() === "") filterStays();
    });
}

// Modal Functions (No change)
function openBookingModal(location) {
    document.getElementById('selectedLocation').value = location;
    const typeLabel = isPGPage ? "PG Stay" : "Short Stay";
    document.getElementById('modalTitle').innerText = `Booking ${typeLabel} for ${location}`;
    document.getElementById('bookingModal').style.display = 'block';
}

function closeModal() { document.getElementById('bookingModal').style.display = 'none'; }

// Form Handling
const bookingForm = document.getElementById('bookingForm');
if (bookingForm) {
    bookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const location = document.getElementById('selectedLocation').value;
        const name = document.getElementById('userName').value;
        const gender = document.getElementById('userGender').value;
        const fromDate = document.getElementById('dateFrom').value;

        const toDateField = document.getElementById('dateTo');
        const durationField = document.getElementById('stayDuration');
        const secondaryVal = toDateField ? toDateField.value : (durationField ? durationField.value : "Standard");

        try {
            await db.collection('bookings').add({
                name, gender, location, fromDate, 
                stayDetail: secondaryVal,
                type: isPGPage ? 'PG' : 'ShortStay',
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });

            const phone = "+919395346545";
            // FIXED: Added 'secondaryVal' to the message with appropriate label
            const detailLabel = isPGPage ? "Duration" : "To Date";
            const message = `*Inquiry: ${isPGPage ? "PG" : "Short Stay"}*%0ALocation: ${location}%0AName: ${name}%0AGender: ${gender}%0AFrom: ${fromDate}%0A${detailLabel}: ${secondaryVal}`;

            window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
            bookingForm.reset();
            closeModal();
        } catch (error) { alert("Error: " + error.message); }
    });
}

loadStays();

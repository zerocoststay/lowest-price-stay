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

// Process Google Drive links for direct image display
function processImageLink(url) {
    if (!url || url.trim() === "") return 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?q=80&w=600';
    if (url.includes('drive.google.com')) {
        let fileId = "";
        try {
            const match = url.match(/\/d\/(.+?)\//) || url.match(/id=(.+?)(&|$)/);
            fileId = match ? match[1] : "";
            if (fileId) return `https://lh3.googleusercontent.com/d/${fileId}`;
        } catch (e) { console.error("Link error", e); }
    }
    return url; 
}

// Load Stays
function loadStays() {
    const stayGrid = document.getElementById('stayGrid');
    if (!stayGrid) return;

    db.collection('listed_stays').onSnapshot(snapshot => {
        stayGrid.innerHTML = '';
        let delay = 0.1; // Animation delay for staggered entry

        snapshot.forEach(doc => {
            const stay = doc.data();
            const imageUrl = processImageLink(stay.imageLink);

            const card = document.createElement('div');
            card.className = 'stay-card scale-in';
            card.style.animationDelay = `${delay}s`;
            card.setAttribute('data-location', stay.location.toLowerCase());

            card.innerHTML = `
                <div class="stay-img-container">
                    <img src="${imageUrl}" alt="${stay.location}" class="stay-img" onerror="this.src='https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?q=80&w=600';">
                </div>
                <div class="stay-info">
                    <h3>${stay.location}</h3>
                    <p>Starting from Rs. ${stay.price} / night (Inc. 2 meals)</p>
                    <button class="btn-book" onclick="openBookingModal('${stay.location}')">Book Now</button>
                </div>
            `;
            stayGrid.appendChild(card);
            delay += 0.1;
        });
    });
}

// Logic to reset search when empty
document.getElementById('searchInput').addEventListener('input', function() {
    if (this.value.trim() === "") {
        filterStays(); // Triggers reset
    }
});

// Search Filter
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

function openBookingModal(location) {
    document.getElementById('selectedLocation').value = location;
    document.getElementById('modalTitle').innerText = `Booking for ${location}`;
    document.getElementById('bookingModal').style.display = 'block';
}

function closeModal() { document.getElementById('bookingModal').style.display = 'none'; }

const bookingForm = document.getElementById('bookingForm');
if (bookingForm) {
    bookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const location = document.getElementById('selectedLocation').value;
        const name = document.getElementById('userName').value;
        const gender = document.getElementById('userGender').value;
        const fromDate = document.getElementById('dateFrom').value;
        const toDate = document.getElementById('dateTo').value;

        try {
            await db.collection('bookings').add({
                name, gender, location, fromDate, toDate,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });

            const phone = "8011595012";
            const message = `I want a stay in ${location} from ${fromDate} to ${toDate}.%0AName - ${name}, Gender - ${gender}.`;
            window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
            bookingForm.reset();
            closeModal();
        } catch (error) { alert("Error: " + error.message); }
    });
}

loadStays();
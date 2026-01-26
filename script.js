// --- FIREBASE CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyBYh8ffNvS1Chq9F_K2I49v1N_X429BxpM",
  authDomain: "lowest-price-stay.firebaseapp.com",
  projectId: "lowest-price-stay",
  storageBucket: "lowest-price-stay.firebasestorage.app",
  messagingSenderId: "674887550826",
  appId: "1:674887550826:web:8a44c2c27b30d3e9808713"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

/**
 * Image Link Processor
 */
function processImageLink(url) {
    const fallback = 'https://images.unsplash.com/photo-1522770179533-24471fcdba45?q=80&w=600';
    if (!url || typeof url !== 'string' || url.trim() === "") return fallback;

    if (url.includes('drive.google.com')) {
        let fileId = "";
        try {
            const match = url.match(/\/d\/(.+?)\/(?:view|edit|preview|copy)/) || 
                          url.match(/\/d\/(.+?)(?:\/|$)/) || 
                          url.match(/id=(.+?)(?:&|$)/);
            fileId = (match && match[1]) ? match[1] : "";
            if (fileId) {
                return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
            }
        } catch (e) { console.error(e); }
    }
    return url; 
}

// --- LOAD STAYS ---
function loadStays() {
    const stayGrid = document.getElementById('stayGrid');
    if (!stayGrid) return;

    stayGrid.innerHTML = '<p style="text-align:center; width:100%; color:#888;">Loading verified listings...</p>';

    // 1. Detect Context (Page & State)
    const currentPath = window.location.pathname;
    const isPGPage = currentPath.includes('pg.html') || currentPath.includes('mizoram-pg.html');
    const isMizoramPage = currentPath.includes('mizoram');

    // 2. Fetch all listings
    db.collection('listed_stays').orderBy('createdAt', 'desc').onSnapshot(snapshot => {
        stayGrid.innerHTML = '';
        let count = 0;

        snapshot.forEach(doc => {
            const stay = doc.data();

            // --- FILTERING LOGIC ---
            
            // A. State Filter
            if (isMizoramPage) {
                // On Mizoram pages, ONLY show properties marked 'mizoram'
                if (stay.state !== 'mizoram') return; 
            } else {
                // On Assam/Main pages, show everything EXCEPT 'mizoram' (Shows 'assam' and undefined/old listings)
                if (stay.state === 'mizoram') return; 
            }

            // B. Category Filter
            if (isPGPage) {
                if (!stay.isPG) return; // If on PG page, skip non-PGs
            } else {
                if (!stay.isShortStay) return; // If on Short Stay page, skip non-Short Stays
            }

            count++;

            // --- DISPLAY LOGIC ---
            const displayPrice = isPGPage ? (stay.pgPrice || stay.price) : (stay.shortPrice || stay.price);
            const priceLabel = isPGPage ? "month" : "night";
            const imageUrl = processImageLink(stay.imageLink || stay.image || stay.stayImage || "");

            // C. FOOD BADGE LOGIC (SMART FIX)
            // Logic: Show badge if:
            // 1. It is NOT a PG page (Short stay only)
            // 2. AND (isFoodIncluded is TRUE OR isFoodIncluded is UNDEFINED/MISSING)
            // This ensures old listings (where the field is missing) default to showing the badge.
            let foodBadgeHTML = '';
            const showFoodBadge = !isPGPage && (stay.isFoodIncluded === true || typeof stay.isFoodIncluded === 'undefined');

            if (showFoodBadge) {
                foodBadgeHTML = `
                    <div style="
                        position: absolute;
                        top: 12px;
                        left: 12px;
                        background: #27ae60;
                        color: white;
                        padding: 5px 12px;
                        border-radius: 20px;
                        font-size: 0.75rem;
                        font-weight: 700;
                        box-shadow: 0 4px 10px rgba(0,0,0,0.2);
                        z-index: 10;
                        letter-spacing: 0.5px;
                        text-transform: uppercase;
                        pointer-events: none;">
                        Food Included
                    </div>`;
            }

            // D. Card Construction
            const card = document.createElement('div');
            card.className = 'stay-card scale-in';
            card.innerHTML = `
                <div class="stay-img-container" style="position: relative; overflow: hidden;">
                    ${foodBadgeHTML}
                    <img src="${imageUrl}" 
                         alt="${stay.location}" 
                         class="stay-img" 
                         loading="lazy"
                         onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=600&q=80';">
                </div>
                <div class="stay-info">
                    <h3>${stay.location || "Verified Stay"}</h3>
                    <div class="price-row">
                        <strong>Rs. ${displayPrice}</strong> <span>/ ${priceLabel}</span>
                    </div>
                    <button class="btn-book" onclick="openBookingModal('${stay.location || 'Stay'}')">Book Now</button>
                </div>
            `;
            stayGrid.appendChild(card);
        });

        if (count === 0) {
            stayGrid.innerHTML = `<p style="text-align:center; width:100%; color:#888; padding: 40px 0;">No listings found here yet.</p>`;
        }

        // --- URL FILTER SYNC (From Home Page Search) ---
        const urlParams = new URLSearchParams(window.location.search);
        const autoFilter = urlParams.get('filter');
        if (autoFilter) {
            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                searchInput.value = autoFilter;
                setTimeout(filterStays, 200);
            }
        }
    });
}

// --- LOCAL SEARCH FUNCTION ---
function filterStays() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    
    const filter = searchInput.value.toLowerCase().trim();
    const cards = document.getElementsByClassName('stay-card');

    for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        const textContent = card.textContent || card.innerText;

        if (textContent.toLowerCase().indexOf(filter) > -1) {
            card.style.display = "flex"; 
        } else {
            card.style.display = "none"; 
        }
    }
}

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    loadStays();
    const searchInp = document.getElementById('searchInput');
    if (searchInp) {
        searchInp.addEventListener('keyup', filterStays);
        searchInp.addEventListener('input', filterStays);
    }
});

// --- BOOKING MODAL LOGIC ---
function openBookingModal(location) {
    const modal = document.getElementById('bookingModal');
    const selectedLocInput = document.getElementById('selectedLocation');
    const modalTitle = document.getElementById('modalTitle');
    
    if (selectedLocInput) selectedLocInput.value = location;
    const isPG = window.location.pathname.includes('pg.html') || window.location.pathname.includes('mizoram-pg.html');
    
    if (modalTitle) modalTitle.innerText = `Booking ${isPG ? 'PG' : 'Short Stay'} for ${location}`;
    if (modal) modal.style.display = 'block';
}

function closeModal() { 
    const modal = document.getElementById('bookingModal');
    if (modal) modal.style.display = 'none'; 
}

window.onclick = function(event) {
    const modal = document.getElementById('bookingModal');
    if (event.target == modal) modal.style.display = "none";
}

// --- FORM SUBMISSION ---
const bookingForm = document.getElementById('bookingForm');
if (bookingForm) {
    bookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = bookingForm.querySelector('.btn-submit');
        btn.innerText = "Processing...";
        btn.disabled = true;

        const isPG = window.location.pathname.includes('pg.html') || window.location.pathname.includes('mizoram-pg.html');
        const location = document.getElementById('selectedLocation').value;
        const name = document.getElementById('userName').value;
        const gender = document.getElementById('userGender').value;
        const fromDate = document.getElementById('dateFrom').value;
        const toDateField = document.getElementById('dateTo');
        const secondaryVal = toDateField ? toDateField.value : "N/A";

        try {
            await db.collection('bookings').add({
                name, gender, location, fromDate, 
                stayDetail: secondaryVal,
                type: isPG ? 'PG' : 'ShortStay',
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });

            const phone = "919395346545";
            const detailLabel = isPG ? "Duration" : "To Date";
            const message = `*Inquiry: ${isPG ? "PG" : "Short Stay"}*%0ALocation: ${location}%0AName: ${name}%0AGender: ${gender}%0AFrom: ${fromDate}%0A${detailLabel}: ${secondaryVal}`;

            window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
            bookingForm.reset();
            closeModal();
        } catch (error) { 
            alert("Error: " + error.message); 
        } finally {
            btn.innerText = "Confirm via WhatsApp";
            btn.disabled = false;
        }
    });
}

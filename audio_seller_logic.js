// audio_seller_logic.js - የፋየርቤዝ ፈቃድ ችግርን (Permissions Issue) ከግምት ውስጥ ያስገባ

// የFirebase Config እና Importዎች
const firebaseConfig = {
    apiKey: "AIzaSyA-ywRuhanxoEJgR83jwp_-nOkPY4jLOH4",
    authDomain: "elanyas-info.firebaseapp.com",
    projectId: "elanyas-info",
    storageBucket: "elanyas-info.firebasestorage.app",
    messagingSenderId: "769306910360",
    appId: "1:769306910360:web:70988eed5b1da8ffa0faed",
    measurementId: "G-2XX2B3RSGP"
};

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    query, 
    where, 
    getDocs, 
    doc, 
    deleteDoc,
    serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app); 

// የ Cloudinary Config
const CLOUDINARY_CLOUD_NAME = "dddyppnhp"; 
const CLOUDINARY_UPLOAD_PRESET = "ds_audio_upload"; 
const CLOUDINARY_API_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/raw/upload`;

// ----------------------------------------------------------------------
// 1. መሠረታዊ ተለዋዋጮች
// ----------------------------------------------------------------------
const uploadAudioForm = document.getElementById('uploadAudioForm');
const audioMessage = document.getElementById('audioMessage');
const activeAudioGrid = document.getElementById('activeAudioGrid'); 
const noActiveAudio = document.getElementById('noActiveAudio');
const uploadNewAudioBtn = document.getElementById('uploadNewAudioBtn');
const viewActiveListingsBtn = document.getElementById('viewActiveListingsBtn');

// 💡 ጊዜያዊ የተጠቃሚ መታወቂያ (Temporary User ID) - ለ Admin/Seller
const currentUserId = "seller_unique_id_12345"; 
const currentUserEmail = "ELANYAS"; 

// ----------------------------------------------------------------------
// 2. የተጠቃሚ መረጃን ማሳየት (User Info)
// ----------------------------------------------------------------------
function loadUserInfo() {
    document.getElementById('userInfo').textContent = `አሁን በ ${currentUserEmail} ገብተዋል`;
}


// ----------------------------------------------------------------------
// 3. ኦዲዮ ወደ Cloudinary የሚሰቅል ተግባር (Audio Upload)
// ----------------------------------------------------------------------
async function uploadAudioToCloudinary(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    try {
        const response = await fetch(CLOUDINARY_API_URL, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`Cloudinary Upload Failed: ${response.statusText}`);
        }

        const data = await response.json();
        return data; 
    } catch (error) {
        console.error("Cloudinary ስቀላ ላይ ችግር:", error);
        throw new Error("የኦዲዮ ፋይል ወደ Cloudinary መስቀል አልተቻለም።");
    }
}

// ----------------------------------------------------------------------
// 4. አዲስ ኦዲዮን የሚያስመዘግብ ተግባር (Submit Handler)
// ----------------------------------------------------------------------
uploadAudioForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    audioMessage.style.display = 'none'; 

    const title = document.getElementById('audioTitle').value;
    const price = document.getElementById('audioPrice').value;
    const description = document.getElementById('audioDescription').value;
    const audioFile = document.getElementById('audioFile').files[0];
    
    const submitButton = uploadAudioForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> እየሰቀልን ነው...';

    try {
        // 1. ኦዲዮውን ወደ ክላውዲናሪ ይሰቅሉ
        const cloudinaryResponse = await uploadAudioToCloudinary(audioFile);
        const audioUrl = cloudinaryResponse.secure_url;
        const publicId = cloudinaryResponse.public_id;
        
        // 2. መረጃውን ወደ ፋየርቤዝ Firestore ያስቀምጡ
        await addDoc(collection(db, "audioListings"), {
            sellerId: currentUserId, 
            sellerEmail: currentUserEmail,
            title: title,
            price: parseFloat(price),
            description: description,
            audioUrl: audioUrl,
            cloudinaryPublicId: publicId,
            status: 'active',
            createdAt: serverTimestamp()
        });

        // 3. ስኬት ማሳየት
        audioMessage.textContent = '✅ ኦዲዮው በስኬት ተሰቅሎ ለሽያጭ ቀርቧል!';
        audioMessage.className = 'listing-message success';
        audioMessage.style.display = 'block';

        uploadAudioForm.reset();
        
    } catch (error) {
        // 4. ስህተት ማሳየት
        console.error("የሽያጭ ማቅረቢያ ላይ ችግር:", error);
        audioMessage.textContent = `❌ ስህተት ተፈጥሯል: ${error.message}`;
        audioMessage.className = 'listing-message error';
        audioMessage.style.display = 'block';
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = '<i class="fas fa-upload"></i> ኦዲዮውን ይሽጡ';
    }
});


// ----------------------------------------------------------------------
// 5. ንቁ ሽያጮችን ከፋየርቤዝ የሚጭን ተግባር
// ----------------------------------------------------------------------
async function renderActiveListings() {
    activeAudioGrid.innerHTML = ''; 
    noActiveAudio.style.display = 'none';

    try {
        // 💡 ይህ ክፍል እንዲሰራ የ Firebase Rules መስተካከል አለበት!
        const q = query(collection(db, "audioListings"), where("sellerId", "==", currentUserId));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            noActiveAudio.style.display = 'block';
            return;
        }

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const listingId = doc.id;

            const card = document.createElement('div');
            card.className = 'audio-card';
            card.innerHTML = `
                <h3>${data.title}</h3>
                <div class="card-details">
                    <p><strong>ዋጋ:</strong> ${data.price} ብር</p>
                    <p><strong>የተሰቀለበት ጊዜ:</strong> ${data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleDateString('am-ET') : 'ያልታወቀ'}</p>
                    <p><strong>የኦዲዮ ሊንክ:</strong> <a href="${data.audioUrl}" target="_blank" style="color: var(--color-accent-blue-light);">ለመስማት ይጫኑ</a></p>
                </div>
                <button class="action-button desc-btn" data-id="${listingId}" data-desc="${data.description}"><i class="fas fa-file-lines"></i> መግለጫ</button>
                <button class="action-button delete-btn" data-id="${listingId}"><i class="fas fa-trash"></i> ይሰርዝ</button>
            `;
            activeAudioGrid.appendChild(card);
        });
    } catch (error) {
        // የ Firebase ስህተት ከመጣ እዚህ ያሳያል
        console.error("ንቁ ሽያጮችን መጫን ላይ ችግር:", error);
        noActiveAudio.style.display = 'block';
        noActiveAudio.textContent = `❌ ስህተት ተፈጥሯል (የፈቃድ ችግር ሊሆን ይችላል): ${error.message}`;
        noActiveAudio.classList.add('error');
    }
}

// ----------------------------------------------------------------------
// 6. የዳሽቦርድ ኔቪጌሽን እና ድርጊቶች (Navigation and Actions)
// ----------------------------------------------------------------------
function setupNavigation() {
    const navButtons = document.querySelectorAll('.nav-button');
    const sections = {
        'uploadNewAudioBtn': document.getElementById('newAudioSection'),
        'viewActiveListingsBtn': document.getElementById('activeListingsSection')
    };

    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            navButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            const targetSection = sections[button.id];
            
            for (let key in sections) {
                sections[key].style.display = 'none';
            }
            
            if (targetSection) {
                targetSection.style.display = 'block';
                if (button.id === 'viewActiveListingsBtn') {
                    renderActiveListings(); 
                }
            }
        });
    });

    document.getElementById('activeListingsSection').style.display = 'none';
    document.getElementById('newAudioSection').style.display = 'block';
}

function setupListingActionListeners() {
    activeAudioGrid.addEventListener('click', (event) => {
        const button = event.target.closest('.action-button');
        if (!button) return; 

        const listingId = button.getAttribute('data-id');

        if (button.classList.contains('delete-btn')) {
            handleDeleteListing(listingId);
        } else if (button.classList.contains('desc-btn')) {
            const description = button.getAttribute('data-desc');
            alert(`የኦዲዮ መግለጫ:\n\n${description}`);
        }
    });
}

// የሽያጭ ዝርዝርን የሚሰርዝ ተግባር (Delete Listing)
async function handleDeleteListing(listingId) {
    if (!confirm("በእርግጥ ይህን ኦዲዮ መሰረዝ ይፈልጋሉ?")) {
        return;
    }

    try {
        await deleteDoc(doc(db, "audioListings", listingId));
        renderActiveListings(); 
        alert("✅ የኦዲዮ ሽያጩ በስኬት ተሰርዟል።");

    } catch (error) {
        console.error("ኦዲዮ መሰረዝ ላይ ችግር:", error);
        alert("❌ ኦዲዮውን መሰረዝ አልተቻለም። የፋየርቤዝ ፈቃዶች ትክክል መሆናቸውን ያረጋግጡ።");
    }
}


// ----------------------------------------------------------------------
// 7. ገጹ ሲጫን መጀመሪያ የሚሰሩ ተግባራት (Initial Load)
// ----------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    loadUserInfo(); 
    setupNavigation(); 
    setupListingActionListeners(); 
});


// ----------------------------------------------------------------------
// 8. የዳራ ቀለም ለውጥ ለ Dashboard
// ----------------------------------------------------------------------
document.addEventListener('scroll', () => {
    const container = document.querySelector('.dashboard-container');
    const scrollPosition = window.scrollY;

    // የቀለም ለውጥ የሚደረግበት ቦታ ላይ ሲደርስ
    if (scrollPosition > 100) { 
        document.body.style.backgroundColor = 'var(--color-bg-secondary)'; // ወደ Dark Violet
    } else {
        document.body.style.backgroundColor = 'var(--color-bg-primary)'; // ወደ Dark Blue/Black
    }
});
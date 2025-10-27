// audio_market_logic.js

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
    doc, 
    getDoc, 
    getDocs,
    updateDoc,
    where,
    query,
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app); 

// ----------------------------------------------------------------------
// 1. መሠረታዊ ተለዋዋጮች
// ----------------------------------------------------------------------
const USER_PHONE = localStorage.getItem('loggedInUserPhone'); 
if (!USER_PHONE) {
    alert("እባክዎ መጀመሪያ ይግቡ!");
    window.location.href = "login.html";
}

let USER_DATA = null;
const audioGrid = document.getElementById('audioGrid');
const noAudioMessage = document.getElementById('noAudioMessage');
const coinBalanceDisplay = document.getElementById('coinBalance');
const userNameDisplay = document.getElementById('userName');

// Player Elements
const playerDrawer = document.getElementById('audioPlayerDrawer');
const closePlayerBtn = document.getElementById('closePlayerBtn');
const hiddenAudioPlayer = document.getElementById('hiddenAudioPlayer');
const playPauseBtn = document.getElementById('playPauseBtn');
const muteBtn = document.getElementById('muteBtn');
const playerProgressDiv = document.getElementById('playerProgress');
const currentTimeDisplay = document.getElementById('currentTime');
const durationTimeDisplay = document.getElementById('durationTime');
const playerTitleDisplay = document.getElementById('playerTitle');
const cassetteTitleDisplay = document.getElementById('cassetteTitle');
const reelElements = document.querySelectorAll('.reel');


// ----------------------------------------------------------------------
// 2. የተጠቃሚ መረጃን መጫን (Load User Data)
// ----------------------------------------------------------------------
async function loadUserData() {
    try {
        const userDocRef = doc(db, "users", USER_PHONE);
        const userSnapshot = await getDoc(userDocRef);

        if (userSnapshot.exists()) {
            USER_DATA = userSnapshot.data();
            // ✅ መረጃን በሄደሩ ላይ ማስቀመጥ
            userNameDisplay.textContent = `${USER_DATA.full_name || 'ተጠቃሚ'}`;
            coinBalanceDisplay.textContent = USER_DATA.ds_coin_balance !== undefined ? USER_DATA.ds_coin_balance.toFixed(0) : 0;
        } else {
            alert("የተጠቃሚ መረጃ አልተገኘም።");
            window.location.href = "login.html";
        }
    } catch (error) {
        console.error("የተጠቃሚ መረጃ መጫን ላይ ችግር:", error);
        alert("የመረጃ ቋት ችግር ተፈጥሯል። እባክዎ እንደገና ይሞክሩ።");
    }
}

// ----------------------------------------------------------------------
// 3. የኦዲዮ ዝርዝሮችን መጫን (Load Audio Listings)
// ----------------------------------------------------------------------
async function loadAudioListings() {
    audioGrid.innerHTML = ''; 
    noAudioMessage.style.display = 'none';

    try {
        const q = query(collection(db, "audioListings"));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            noAudioMessage.style.display = 'block';
            return;
        }

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            renderAudioCard(doc.id, data);
        });
    } catch (error) {
        console.error("ኦዲዮዎችን መጫን ላይ ችግር:", error);
        noAudioMessage.style.display = 'block';
        noAudioMessage.textContent = `❌ የኦዲዮ ዝርዝር መጫን አልተቻለም: ${error.message}`;
    }
}

// ----------------------------------------------------------------------
// 4. ኦዲዮ ካርዶችን መፍጠር (Render Audio Card)
// ----------------------------------------------------------------------
function renderAudioCard(listingId, data) {
    const card = document.createElement('div');
    card.className = 'audio-card';
    card.innerHTML = `
        <h3>${data.title}</h3>
        
        <div class="audio-price">${data.price} DS coin</div>
        
        <div class="card-actions">
            <button class="action-button desc-btn" data-desc="${data.description}"><i class="fas fa-file-lines"></i></button>
            <button class="action-button buy-btn" data-id="${listingId}" data-price="${data.price}" data-url="${data.audioUrl}" data-title="${data.title}"><i class="fas fa-shopping-cart"></i></button>
            <button class="action-button open-btn" data-url="${data.audioUrl}" data-title="${data.title}"><i class="fas fa-play-circle"></i></button>
        </div>
        
        <div class="progress-bar" id="progress-${listingId}">
            <div class="progress-fill" id="progress-fill-${listingId}"></div>
        </div>
        <p class="progress-text" id="progress-text-${listingId}" style="display: none;"></p>
    `;
    audioGrid.appendChild(card);
}

// ----------------------------------------------------------------------
// 5. የዳውንሎድ እና ኮይን ሎጂክ (Download & Coin Logic)
// ----------------------------------------------------------------------

// የፋይል ማውረጃ
async function downloadAudio(audioUrl, fileName, listingId, price) {
    const progressBar = document.getElementById(`progress-${listingId}`);
    const progressFill = document.getElementById(`progress-fill-${listingId}`);
    const progressText = document.getElementById(`progress-text-${listingId}`);
    
    progressBar.style.display = 'block';
    progressText.style.display = 'block';
    progressText.textContent = '0%';
    progressFill.style.width = '0%';

    try {
        const response = await fetch(audioUrl);
        const reader = response.body.getReader();
        const contentLength = +response.headers.get('Content-Length');
        
        let receivedLength = 0;
        let chunks = [];

        while(true) {
            const {done, value} = await reader.read();
            if (done) {
                break;
            }

            chunks.push(value);
            receivedLength += value.length;
            
            // የፕሮግረስ ማሳያ
            const percent = Math.round((receivedLength / contentLength) * 100);
            progressFill.style.width = `${percent}%`;
            progressText.textContent = `${percent}% በመውረድ ላይ...`;
        }

        const blob = new Blob(chunks);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        
        progressText.textContent = `✅ በስኬት ወርዷል! የኮይን ቅነሳ በመከናወን ላይ...`;
        
        // 🚨 የኮይን ቅነሳ (Client-Side - ለአደጋ የተጋለጠ!)
        await deductCoin(price);
        
        progressText.textContent = `✅ ዳውንሎድ ተጠናቋል። ${price} ኮይን ቀንሷል!`;
        setTimeout(() => {
            progressBar.style.display = 'none';
            progressText.style.display = 'none';
        }, 5000);

    } catch (error) {
        console.error("ዳውንሎድ ላይ ችግር:", error);
        progressText.textContent = `❌ ዳውንሎድ አልተሳካም።`;
        progressText.style.color = 'var(--color-error)';
        setTimeout(() => {
            progressBar.style.display = 'none';
            progressText.style.display = 'none';
        }, 5000);
        // ኮይን እንዳይቀንስ ያረጋግጡ
        return; 
    }
}

// የኮይን ቅነሳ
async function deductCoin(price) {
    const userDocRef = doc(db, "users", USER_PHONE);
    const newBalance = (USER_DATA.ds_coin_balance || 0) - price;
    
    if (newBalance < 0) {
        // ይህ ክፍል ኮይን ከሌለ ዳውንሎዱን እንዲያቆም ቀድሞ መፈተሽ አለበት
        console.error("የኮይን መጠን ከኦዲዮው ዋጋ ያነሰ ነው!");
        return; 
    }
    
    await updateDoc(userDocRef, {
        ds_coin_balance: newBalance,
    });
    
    // የሎካል ዳታ እና UI ማዘመን
    USER_DATA.ds_coin_balance = newBalance;
    coinBalanceDisplay.textContent = newBalance.toFixed(0);
}

// ----------------------------------------------------------------------
// 6. የኦዲዮ መጫወቻ ሎጂክ (Audio Player Logic)
// ----------------------------------------------------------------------

function openPlayerDrawer(audioUrl, title) {
    playerTitleDisplay.textContent = title;
    cassetteTitleDisplay.textContent = title;
    hiddenAudioPlayer.src = audioUrl;
    playerDrawer.classList.add('open');
    // ኦዲዮውን መጫወት መጀመር
    hiddenAudioPlayer.play();
    playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
    reelElements.forEach(reel => reel.classList.add('play'));
}

function closePlayerDrawer() {
    hiddenAudioPlayer.pause();
    hiddenAudioPlayer.currentTime = 0;
    playerDrawer.classList.remove('open');
    playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
    reelElements.forEach(reel => reel.classList.remove('play'));
}

hiddenAudioPlayer.addEventListener('loadedmetadata', () => {
    durationTimeDisplay.textContent = formatTime(hiddenAudioPlayer.duration);
});

hiddenAudioPlayer.addEventListener('timeupdate', () => {
    const currentTime = hiddenAudioPlayer.currentTime;
    const duration = hiddenAudioPlayer.duration;
    
    currentTimeDisplay.textContent = formatTime(currentTime);
    playerProgressDiv.style.width = `${(currentTime / duration) * 100}%`;
});

hiddenAudioPlayer.addEventListener('ended', () => {
    playPauseBtn.innerHTML = '<i class="fas fa-redo"></i>'; 
    reelElements.forEach(reel => reel.classList.remove('play'));
});

// የጊዜ ቅርጸት (Utility Function)
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
}

// Player Control Listeners
playPauseBtn.addEventListener('click', () => {
    if (hiddenAudioPlayer.paused) {
        hiddenAudioPlayer.play();
        playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
        reelElements.forEach(reel => reel.classList.add('play'));
    } else {
        hiddenAudioPlayer.pause();
        playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        reelElements.forEach(reel => reel.classList.remove('play'));
    }
});

muteBtn.addEventListener('click', () => {
    hiddenAudioPlayer.muted = !hiddenAudioPlayer.muted;
    muteBtn.innerHTML = hiddenAudioPlayer.muted ? '<i class="fas fa-volume-mute"></i>' : '<i class="fas fa-volume-up"></i>';
});

document.getElementById('skipBackwardBtn').addEventListener('click', () => {
    hiddenAudioPlayer.currentTime -= 10;
});

document.getElementById('skipForwardBtn').addEventListener('click', () => {
    hiddenAudioPlayer.currentTime += 10;
});

closePlayerBtn.addEventListener('click', closePlayerDrawer);

// Seek functionality
document.getElementById('playerBar').addEventListener('click', (e) => {
    const bar = e.currentTarget;
    const percent = e.offsetX / bar.offsetWidth;
    hiddenAudioPlayer.currentTime = percent * hiddenAudioPlayer.duration;
});


// ----------------------------------------------------------------------
// 7. የክስተት አድማጮች (Event Listeners)
// ----------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    loadUserData();
    loadAudioListings();
    
    // የካርድ በተን ክሊክ አድማጮች
    audioGrid.addEventListener('click', async (e) => {
        const button = e.target.closest('.action-button');
        if (!button) return; 

        const listingId = button.getAttribute('data-id');
        const audioUrl = button.getAttribute('data-url');
        const audioTitle = button.getAttribute('data-title');
        const audioPrice = parseFloat(button.getAttribute('data-price'));

        if (button.classList.contains('desc-btn')) {
            alert(`የኦዲዮ መግለጫ:\n\n${button.getAttribute('data-desc')}`);
            
        } else if (button.classList.contains('open-btn')) {
            openPlayerDrawer(audioUrl, audioTitle);
            
        } else if (button.classList.contains('buy-btn')) {
            if (!USER_DATA) {
                alert("የተጠቃሚ መረጃ እየተጫነ ነው፣ እባክዎ እንደገና ይሞክሩ።");
                return;
            }
            
            if ((USER_DATA.ds_coin_balance || 0) < audioPrice) {
                 alert(`❌ ኮይን በቂ አይደለም። ኦዲዮውን ለመግዛት ${audioPrice} ኮይን ያስፈልግዎታል። አሁን ያለዎት ኮይን ${USER_DATA.ds_coin_balance.toFixed(0)} ነው።`);
                 return;
            }
            
            // ✅ የመግዣ አላርት እና ማረጋገጫ
            const confirmed = confirm(`"${audioTitle}" የተሰኘውን ኦዲዮ በ ${audioPrice} ኮይን መግዛት ይፈልጋሉ? ከገዙ በኋላ ኦዲዮው ወዲያውኑ ይወርዳል።`);
            
            if (confirmed) {
                // ዳውንሎድ ይጀምራል እና ኮይኑን ይቀንሳል
                button.disabled = true;
                button.innerHTML = '<i class="fas fa-hourglass-start fa-spin"></i>';
                await downloadAudio(audioUrl, `${audioTitle}.mp3`, listingId, audioPrice);
                button.disabled = false;
                button.innerHTML = '<i class="fas fa-shopping-cart"></i>';
            }
        }
    });
});
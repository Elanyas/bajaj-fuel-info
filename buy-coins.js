// 1. Firebase Configuration (Blaze Plan)
const firebaseConfig = {
    apiKey: "AIzaSyA-ywRuhanxoEJgR83jwp_-nOkPY4jLOH4",
    authDomain: "elanyas-info.firebaseapp.com",
    projectId: "elanyas-info",
    storageBucket: "elanyas-info.firebasestorage.app",
    messagingSenderId: "769306910360",
    appId: "1:769306910360:web:70988eed5b1da8ffa0faed"
};

// Firebase ማስጀመር
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
const storage = firebase.storage();

const prices = [15, 30, 50, 70, 100, 150, 200, 300, 400, 500, 600, 700, 800, 900, 1000];
const coinGrid = document.getElementById('coinGrid');
let selectedAmount = 0;
let selectedCoins = 0;

// 2. የተጠቃሚ መረጃ በቅጽበት ማምጣት (Real-time)
async function loadUserData() {
    const loggedInUserName = localStorage.getItem('loggedInUserName');
    const loggedInUserPhone = localStorage.getItem('loggedInUserPhone');

    if (loggedInUserName) {
        document.getElementById('userName').innerText = loggedInUserName;
    }

    if (loggedInUserPhone) {
        // onSnapshot መጠቀም መረጃው እንደተቀየረ ወዲያውኑ እንዲታይ ያደርጋል
        db.collection("HararGebeyaUsers").doc(loggedInUserPhone)
        .onSnapshot((doc) => {
            if (doc.exists) {
                const balance = doc.data().ds_coin_balance || 0;
                document.getElementById('currentCoins').innerText = balance.toFixed(2);
            }
        });

        // በመጠባበቅ ላይ ያለ ክፍያ ካለ ለማየት
        checkPendingRequests(loggedInUserPhone);
    }
}

// 3. የኮይን ካርዶችን መፍጠር
prices.forEach(price => {
    const bonusCoins = Math.floor(price * 1.3);
    const card = document.createElement('div');
    card.className = 'coin-card';
    card.innerHTML = `
        <span class="price-tag" style="font-size: 1.5rem; font-weight: bold; display: block;">${price} ETB</span>
        <span class="old-price" style="text-decoration: line-through; color: #888; display: block; margin: 5px 0;">${price} DS</span>
        <span class="new-coins" style="font-size: 1.1rem; color: #00bcd4; display: block;">${bonusCoins} DS</span>
    `;
    card.onclick = () => openPayment(price, bonusCoins);
    coinGrid.appendChild(card);
});

function openPayment(price, coins) {
    selectedAmount = price;
    selectedCoins = coins;
    document.getElementById('selectionPage').classList.add('hidden');
    document.getElementById('paymentPage').classList.remove('hidden');
    document.getElementById('selectedPrice').innerText = price;
    document.getElementById('expectedCoins').innerText = coins;
}

// 4. ክፍያውን እና ስክሪንሻቱን መላክ
document.getElementById('submitBtn').addEventListener('click', async () => {
    const fileInput = document.getElementById('screenshotInput');
    const phone = localStorage.getItem('loggedInUserPhone');
    const submitBtn = document.getElementById('submitBtn');

    if (!fileInput.files[0]) {
        alert("እባክዎ የክፍያ ስክሪንሻት (Screenshot) ይጫኑ!");
        return;
    }

    try {
        // ማጭበርበር መከላከያ፡ በተኑን መቆለፍ
        submitBtn.disabled = true;
        submitBtn.innerText = "በመላክ ላይ... (Wait)";

        const file = fileInput.files[0];
        // የፋይሉ ስም ልዩ እንዲሆን (ስልክ + ሰዓት)
        const fileName = `payments/${phone}_${Date.now()}_${file.name}`;
        const storageRef = storage.ref().child(fileName);

        // ሀ. ምስሉን መጫን
        const snapshot = await storageRef.put(file);
        const downloadURL = await snapshot.ref.getDownloadURL();

        // ለ. ጥያቄውን መመዝገብ
        await db.collection("CoinRequests").add({
            userPhone: phone,
            userName: localStorage.getItem('loggedInUserName') || "User",
            amountETB: selectedAmount,
            requestedCoins: selectedCoins,
            screenshotUrl: downloadURL,
            status: "pending",
            targetPhone: "0989750238",
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        alert("ጥያቄዎ ደርሶናል! አድሚኑ ምስሉን ሲያረጋግጥ ኮይኑ ይጨመርልዎታል።");
        goBack();

    } catch (error) {
        console.error("Error:", error);
        alert("ስህተት ተፈጥሯል! እባክዎ ኢንተርኔትዎን አረጋግጠው እንደገና ይሞክሩ።");
        submitBtn.disabled = false;
        submitBtn.innerText = "ላክ (Submit)";
    }
});

// በመጠባበቅ ላይ ያለ ጥያቄ ካለ ለተጠቃሚው ማሳያ
function checkPendingRequests(phone) {
    db.collection("CoinRequests")
      .where("userPhone", "==", phone)
      .where("status", "==", "pending")
      .onSnapshot(snap => {
          if (!snap.empty) {
              const msg = document.createElement('div');
              msg.style = "background: #f39c12; color: white; padding: 10px; text-align: center; margin-bottom: 10px; border-radius: 5px;";
              msg.innerText = "አንድ ክፍያዎ በመጣራት ላይ ነው... እባክዎ ይጠብቁ።";
              const container = document.querySelector('.container');
              if (container) container.prepend(msg);
          }
      });
}

function goBack() {
    document.getElementById('paymentPage').classList.add('hidden');
    document.getElementById('selectionPage').classList.remove('hidden');
    document.getElementById('submitBtn').disabled = false;
    document.getElementById('submitBtn').innerText = "ላክ (Submit)";
}

window.onload = loadUserData;
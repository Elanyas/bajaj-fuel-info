// Firebase configuration (Updated with your Web App config)
const firebaseConfig = {
  apiKey: "AIzaSyA-ywRuhanxoEJgR83jwp_-nOkPY4jLOH4",
  authDomain: "elanyas-info.firebaseapp.com",
  projectId: "elanyas-info",
  storageBucket: "elanyas-info.firebasestorage.app",
  messagingSenderId: "769306910360",
  appId: "1:769306910360:web:70988eed5b1da8ffa0faed",
  measurementId: "G-2XX2B3RSGP"
};

// Initialize Firebase using compat syntax
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Get User ID from URL parameters
const urlParams = new URLSearchParams(window.location.search);
const uid = urlParams.get('uid');

/**
 * የክፍያ ጥያቄውን ይመዘግባል እንዲሁም የeBirr መደወያውን ያስነሳል
 */
async function initiatePayment(packageId, amount) {
    const phoneInput = document.getElementById('phoneNumber');
    const phoneNumber = phoneInput ? phoneInput.value.trim() : "";

    if (!phoneNumber) {
        alert("እባክዎ መጀመሪያ ክፍያ የሚፈጽሙበትን ስልክ ቁጥር ያስገቡ።");
        if (phoneInput) phoneInput.focus();
        return;
    }

    if (!uid) {
        alert("ስህተት: የተጠቃሚ መለያ አልተገኘም። እባክዎ ከአፑ እንደገና ይክፈቱት።");
        return;
    }

    try {
        // 1. የክፍያ ጥያቄውን Firestore ውስጥ መመዝገብ
        await db.collection("payment_requests").add({
            userId: uid,
            phoneNumber: phoneNumber,
            packageId: packageId,
            amount: amount,
            status: "pending",
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // 2. የeBirr መደወያ ኮድ ማስነሳት
        // ፎርማት: *681*የተቀባይ_ቁጥር*ብር#
        const dialCode = `*681*0989750238*${amount}#`;

        // በአፕ ውስጥ ካለን (AppProxy ካለ) እሱን እንጠቀማለን፤ ካልሆነ (በብሮውዘር ከሆነ) መደበኛውን tel: እንጠቀማለን
        if (window.AppProxy && window.AppProxy.executeAction) {
            window.AppProxy.executeAction(dialCode);
        } else {
            window.location.href = `tel:${encodeURIComponent(dialCode)}`;
        }

    } catch (e) {
        console.error("Error:", e);
        alert("የኔትወርክ ችግር አጋጥሟል። እባክዎ ቆይተው ይሞክሩ።");
    }
}

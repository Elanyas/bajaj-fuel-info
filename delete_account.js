import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getFirestore, doc, getDocs, collection, query, where, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { getStorage, ref, deleteObject } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyA-ywRuhanxoEJgR83jwp_-nOkPY4jLOH4",
    authDomain: "elanyas-info.firebaseapp.com",
    projectId: "elanyas-info",
    storageBucket: "elanyas-info.firebasestorage.app",
    messagingSenderId: "769306910360",
    appId: "1:769306910360:web:70988eed5b1da8ffa0faed"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

const loggedInUserPhone = localStorage.getItem('loggedInUserPhone');
const executeDeleteBtn = document.getElementById('executeDeleteBtn');
const statusMsg = document.getElementById('statusMsg');

executeDeleteBtn.addEventListener('click', async () => {
    const inputPhone = document.getElementById('confirmPhone').value;

    if (inputPhone !== loggedInUserPhone) {
        statusMsg.style.color = 'red';
        statusMsg.textContent = "ስልክ ቁጥሩ አልተገጣጠመም!";
        return;
    }

    if (!confirm("በመጨረሻ እርግጠኛ ነዎት? ሁሉም መረጃ ይጠፋል!")) return;

    try {
        executeDeleteBtn.disabled = true;
        statusMsg.style.color = '#00bcd4';
        statusMsg.textContent = "ማስታወቂያዎች እየተሰረዙ ነው...";

        // 1. የዚህን ተጠቃሚ ማስታወቂያዎች በሙሉ መፈለግ
        const q = query(collection(db, "listings"), where("seller_id", "==", loggedInUserPhone));
        const querySnapshot = await getDocs(q);

        const deletePromises = [];
        querySnapshot.forEach((document) => {
            const data = document.data();
            // ምስሉን ከ Storage መሰረዝ
            if (data.image_url) {
                const imageRef = ref(storage, data.image_url);
                deletePromises.push(deleteObject(imageRef).catch(() => {}));
            }
            // ማስታወቂያውን ከ Firestore መሰረዝ
            deletePromises.push(deleteDoc(doc(db, "listings", document.id)));
        });

        await Promise.all(deletePromises);

        // 2. የተጠቃሚ ፕሮፋይል መሰረዝ
        await deleteDoc(doc(db, "users", loggedInUserPhone));
        await deleteDoc(doc(db, "HararGebeyaUsers", loggedInUserPhone));

        localStorage.clear();
        alert("አካውንትዎ በሙሉ በተሳካ ሁኔታ ተሰርዟል።");
        window.location.href = "login_gebeya.html";

    } catch (error) {
        console.error(error);
        statusMsg.style.color = 'red';
        statusMsg.textContent = "ስህተት አጋጥሟል: " + error.message;
        executeDeleteBtn.disabled = false;
    }
});
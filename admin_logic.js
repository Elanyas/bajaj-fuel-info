// ======================================================================
// 1. Firebase እና Cloudinary Configs
// ======================================================================

// የFirebase Config
const firebaseConfig = {
    apiKey: "AIzaSyA-ywRuhanxoEJgR83jwp_-nOkPY4jLOH4",
    authDomain: "elanyas-info.firebaseapp.com",
    projectId: "elanyas-info",
    storageBucket: "elanyas-info.firebasestorage.app",
    messagingSenderId: "769306910360",
    appId: "1:769306910360:web:70988eed5b1da8ffa0faed",
    measurementId: "G-2XX2B3RSGP"
};

// ለምስል መስቀያ የ Cloudinary Config (በእርስዎ seller.js ላይ ተመስርቶ)
const CLOUDINARY_CLOUD_NAME = "dddyppnhp"; 
const CLOUDINARY_UPLOAD_PRESET = "bajaj_upload_preset"; // እዚህ የእርስዎን ትክክለኛ Preset ያስገቡ

// ወሳኝ የFirebase ሞዱሎችን ማስመጣት
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    serverTimestamp,
    query,
    orderBy,
    getDocs,
    doc,
    updateDoc,
    deleteDoc,
    where
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

// Firebase App እና Firestore Database ማስጀመር
const app = initializeApp(firebaseConfig);
const db = getFirestore(app); 
const NEWS_COLLECTION = "news";
const NEWSPOSTER_COLLECTION = "newsposter";
const ADMIN_PASSWORD_KEY = 'adminPassword'; // የፓስወርድ ቁልፍ በ localStorage

// ======================================================================
// 2. DOM Elements ማግኘት
// ======================================================================
const authModal = document.getElementById('authModal');
const loginBtn = document.getElementById('loginBtn');
const adminPasswordInput = document.getElementById('adminPassword');
const authMessage = document.getElementById('authMessage');
const adminPanelContent = document.getElementById('adminPanelContent');

const newsForm = document.getElementById('newsForm');
const newsIdToEdit = document.getElementById('newsIdToEdit');
const newsTitle = document.getElementById('newsTitle');
const newsSummary = document.getElementById('newsSummary');
const newsContent = document.getElementById('newsContent');
const newsImageInput = document.getElementById('newsImage');
const imagePreview = document.getElementById('imagePreview');
const formTitle = document.getElementById('formTitle');
const submitNewsBtn = document.getElementById('submitNewsBtn');
const currentImageUrlDisplay = document.getElementById('currentImageUrl');
const formMessage = document.getElementById('formMessage');

const showPostFormBtn = document.getElementById('showPostFormBtn');
const showPostedNewsBtn = document.getElementById('showPostedNewsBtn');
const postNewsSection = document.getElementById('postNewsSection');
const postedNewsSection = document.getElementById('postedNewsSection');
const newsListings = document.getElementById('newsListings');


// ======================================================================
// 3. የመግቢያ (Authentication) ተግባራት
// ======================================================================

// የተሳካ መግቢያን የሚያከናውን ተግባር
function completeLogin() {
    authModal.style.display = 'none';
    adminPanelContent.style.display = 'block';
    fetchAndRenderPostedNews(); // ከተሳካ በኋላ ዜናዎችን ጫን
}

// የተጠቃሚ መረጃን እና የይለፍ ቃልን በመጠቀም ከፋየርቤዝ ጋር አረጋግጥ
async function verifyCredentials(password) { 
    // 1. መረጃውን ከ localStorage አምጣ
    const loggedInUserPhone = localStorage.getItem('loggedInUserPhone');
    const loggedInUserName = localStorage.getItem('loggedInUserName');

    if (!loggedInUserPhone || !loggedInUserName) {
        return "Local Storage መረጃ (ስልክ ቁጥር/ስም) ጠፍቷል።";
    }

    // 2. በ Firestore ውስጥ አጣራ
    const newsPosterRef = collection(db, NEWSPOSTER_COLLECTION);
    try {
        const q = query(
            newsPosterRef,
            where("phone", "==", loggedInUserPhone),
            where("name", "==", loggedInUserName),
            where("password", "==", password)
        );
        
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
            return "success";
        } else {
            return "የይለፍ ቃልዎ ወይም የተጠቃሚ መረጃዎ ትክክል አይደለም።";
        }
    } catch (error) {
        console.error("Error during admin login check:", error);
        return "ከፋየርቤዝ ጋር ሲገናኝ ስህተት ተፈጥሯል።";
    }
}

// በ localStorage ውስጥ የተቀመጠውን ፓስወርድ መፈተሽ
async function checkLocalStorageForLogin() {
    const storedPassword = localStorage.getItem(ADMIN_PASSWORD_KEY);
    if (storedPassword && storedPassword.length === 8) {
        // የይለፍ ቃል ካለ, ትክክለኛ መሆኑን ያረጋግጡ
        const result = await verifyCredentials(storedPassword);
        if (result === "success") {
            completeLogin();
            return true; // በተሳካ ሁኔታ ገብቷል
        } else {
            // ፓስወርዱ ልክ ካልሆነ ይሰረዝ (ለደህንነት ሲባል)
            localStorage.removeItem(ADMIN_PASSWORD_KEY);
        }
    }
    return false; // አልገባም
}


loginBtn.addEventListener('click', async () => {
    const password = adminPasswordInput.value.trim();
    if (password.length !== 8) {
        showAuthMessage("የይለፍ ቃሉ 8-digit መሆን አለበት።");
        return;
    }

    loginBtn.disabled = true;
    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> በመግባት ላይ...';

    const result = await verifyCredentials(password);

    if (result === "success") {
        // ፓስወርዱን በ localStorage ውስጥ አስቀምጥ
        localStorage.setItem(ADMIN_PASSWORD_KEY, password); 
        completeLogin();
    } else {
        showAuthMessage(result);
    }
    loginBtn.disabled = false;
    loginBtn.innerHTML = 'ይግቡ';
});

function showAuthMessage(message) {
    authMessage.textContent = message;
    authMessage.style.display = 'block';
    setTimeout(() => {
        authMessage.style.display = 'none';
    }, 5000);
}


// ======================================================================
// 4. የምስል ቅድመ እይታ እና መስቀል ተግባር
// ======================================================================
newsImageInput.addEventListener('change', function() {
    const file = this.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreview.src = e.target.result;
            imagePreview.style.display = 'block';
            currentImageUrlDisplay.style.display = 'none'; // አዲስ ምስል ሲመረጥ የድሮውን URL ደብቅ
        };
        reader.readAsDataURL(file);
    } else {
        // ፋይል ካልተመረጠ ቅድመ እይታውን ደብቅ
        imagePreview.style.display = 'none';
    }
});

async function uploadImage(file) {
    // እዚህ ላይ Cloudinary Config መሞላቱን ያረጋግጡ
    if (!CLOUDINARY_CLOUD_NAME || CLOUDINARY_UPLOAD_PRESET === "YOUR_UPLOAD_PRESET") {
        console.warn("Cloudinary Config አልተሞላም! Placeholder ምስል በመጠቀም ላይ።");
        return "https://via.placeholder.com/600x400.png?text=Placeholder+Image"; 
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    try {
        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
            {
                method: 'POST',
                body: formData,
            }
        );
        const data = await response.json();
        if (data.secure_url) {
            return data.secure_url;
        } else {
            throw new Error("Cloudinary Upload Failed");
        }
    } catch (error) {
        console.error("Error uploading to Cloudinary:", error);
        throw new Error("ምስሉን ለመስቀል አልተቻለም።");
    }
}


// ======================================================================
// 5. ዜና ማስገባት/ማዘመን (Form Submission)
// ======================================================================
newsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    formMessage.style.display = 'none';
    
    const isEditing = newsIdToEdit.value !== '';
    const originalImageUrl = currentImageUrlDisplay.dataset.url; // የአሁን ምስል URL (ለማዘመን ከሆነ)

    submitNewsBtn.disabled = true;
    submitNewsBtn.innerHTML = isEditing 
        ? '<i class="fas fa-spinner fa-spin"></i> በመዘመን ላይ...' 
        : '<i class="fas fa-spinner fa-spin"></i> በመለጠፍ ላይ...';

    const title = newsTitle.value.trim();
    const summary = newsSummary.value.trim();
    const content = newsContent.value.trim();
    const imageFile = newsImageInput.files[0];
    let imageUrl = '';

    if (!title || !summary || !content) {
        showMessage("እባክዎ ርዕስ፣ ማጠቃለያ እና ይዘት ይሙሉ።", 'error');
        resetSubmitBtnState(isEditing);
        return;
    }

    try {
        if (imageFile) {
            // አዲስ ምስል ከተመረጠ ስቀል
            imageUrl = await uploadImage(imageFile);
        } else if (isEditing && originalImageUrl) {
            // ምስል ካልተመረጠ ግን እየተዘመነ ከሆነ የድሮውን ተጠቀም
            imageUrl = originalImageUrl;
        } else {
            // አዲስ ዜና እየተለጠፈ ምስል ካልተመረጠ ወይም Edit ሲሆን የድሮም ከሌለ
             showMessage("እባክዎ ለዜናው ዋና ምስል ይምረጡ።", 'error');
             resetSubmitBtnState(isEditing);
             return;
        }

        const newsData = {
            title: title,
            summary: summary,
            content: content,
            imageUrl: imageUrl,
        };

        if (isEditing) {
            // ዜና ማዘመን (Update)
            const newsRef = doc(db, NEWS_COLLECTION, newsIdToEdit.value);
            await updateDoc(newsRef, newsData);
            showMessage("✅ ዜናው በተሳካ ሁኔታ ዘምኗል።", 'success');
        } else {
            // አዲስ ዜና ማስገባት (Add)
            await addDoc(collection(db, NEWS_COLLECTION), {
                ...newsData,
                timestamp: serverTimestamp(), 
                likes: 0,
                dislikes: 0
            });
            showMessage("✅ ዜናው በተሳካ ሁኔታ ተለጥፏል።", 'success');
        }

        // ቅጹን አጽዳ እና ወደ መጀመሪያው ሁኔታ መልስ
        resetForm();

    } catch (error) {
        console.error(`Error ${isEditing ? 'updating' : 'adding'} document: `, error);
        showMessage(`ዜናውን ${isEditing ? 'ለማዘመን' : 'ለመለጠፍ'} አልተቻለም: ${error.message}`, 'error');
    } finally {
        resetSubmitBtnState(isEditing);
        // ማዘመን/መለጠፍ ሲጠናቀቅ የተለጠፉ ዜናዎችን እንደገና ጫን (refresh)
        if (postedNewsSection.style.display === 'block') {
            fetchAndRenderPostedNews();
        }
    }
});

function resetSubmitBtnState(isEditing) {
    submitNewsBtn.disabled = false;
    submitNewsBtn.innerHTML = isEditing 
        ? '<i class="fas fa-save"></i> ዜናውን ያዘምኑ' 
        : '<i class="fas fa-upload"></i> ዜናውን ይለጥፉ';
}

function showMessage(message, type) {
    formMessage.textContent = message;
    formMessage.className = `message ${type}-message`;
    formMessage.style.display = 'block';
    setTimeout(() => {
        formMessage.style.display = 'none';
    }, 5000);
}

function resetForm() {
    newsForm.reset();
    newsIdToEdit.value = '';
    imagePreview.src = '';
    imagePreview.style.display = 'none';
    currentImageUrlDisplay.style.display = 'none';
    currentImageUrlDisplay.dataset.url = '';
    formTitle.textContent = "አዲስ ዜና መለጠፍ";
    submitNewsBtn.innerHTML = '<i class="fas fa-upload"></i> ዜናውን ይለጥፉ';
    // ምስሉ እንደገና እንዲያስፈልግ ለማድረግ
    newsImageInput.required = true; 
    
    // Textareas ን ወደ መጀመሪያው ቁመት ይመልሱ
    [newsSummary, newsContent].forEach(textarea => {
        textarea.style.height = 'auto';
        if (textarea.rows) {
            textarea.style.height = `${textarea.scrollHeight}px`; // ወይም የመጀመሪያው `rows` ቁመት
        }
    });
}


// ======================================================================
// 6. Navigation Logic (ትናንሾቹ Buttons)
// ======================================================================
showPostFormBtn.addEventListener('click', () => {
    postNewsSection.style.display = 'block';
    postedNewsSection.style.display = 'none';
    showPostFormBtn.classList.add('active');
    showPostedNewsBtn.classList.remove('active');
    resetForm(); // ወደ ዜና ማስገቢያ ሲመለስ ቅጹን አጽዳ
});

showPostedNewsBtn.addEventListener('click', () => {
    postNewsSection.style.display = 'none';
    postedNewsSection.style.display = 'block';
    showPostFormBtn.classList.remove('active');
    showPostedNewsBtn.classList.add('active');
    fetchAndRenderPostedNews(); // የተለጠፉ ዜናዎችን ጫን
});


// ======================================================================
// 7. የተለጠፉ ዜናዎችን መጫን፣ ማዘመን እና መሰረዝ (CRUD Operations)
// ======================================================================

// የዜና መረጃን ለጊዜው የሚይዝ Object (በተለይ ለማዘመን)
let newsCache = {}; 

function timeAgo(timestamp) {
    if (!timestamp || !timestamp.toDate) {
        return "በቅርቡ ተለጠፈ";
    }

    const now = new Date();
    const past = timestamp.toDate();
    const seconds = Math.floor((now - past) / 1000);

    // የጊዜ ስሌት
    let interval = seconds / 31536000;
    if (interval > 1) {
        return Math.floor(interval) + " ዓመት በፊት";
    }
    interval = seconds / 2592000;
    if (interval > 1) {
        return Math.floor(interval) + " ወር በፊት";
    }
    interval = seconds / 86400;
    if (interval > 1) {
        return Math.floor(interval) + " ቀን በፊት";
    }
    interval = seconds / 3600;
    if (interval > 1) {
        return Math.floor(interval) + " ሰዓት በፊት";
    }
    interval = seconds / 60;
    if (interval > 1) {
        return Math.floor(interval) + " ደቂቃ በፊት";
    }
    return "አሁን ተለጠፈ";
}


async function fetchAndRenderPostedNews() {
    newsListings.innerHTML = '<p style="text-align: center;"><i class="fas fa-spinner fa-spin"></i> ዜናዎችን በመጫን ላይ...</p>';
    newsCache = {}; // መሸጎጫውን አጽዳ
    
    try {
        const q = query(collection(db, NEWS_COLLECTION), orderBy("timestamp", "desc")); 
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            newsListings.innerHTML = '<p style="text-align: center;">ገና ምንም ዜና አልተለጠፈም።</p>';
            return;
        }

        let htmlContent = '';
        querySnapshot.forEach(doc => {
            const news = doc.data();
            const newsId = doc.id;
            const postedTime = timeAgo(news.timestamp);
            
            // የዜናውን ሙሉ መረጃ በ Cache ውስጥ አስቀምጥ
            newsCache[newsId] = {
                title: news.title,
                summary: news.summary,
                content: news.content,
                imageUrl: news.imageUrl
            };

            htmlContent += `
                <div class="news-article-card" data-id="${newsId}">
                    <img src="${news.imageUrl}" alt="${news.title}" class="article-image">
                    <div class="article-body">
                        <h3>${news.title}</h3>
                        <p class="posted-time" style="color: #bbb; font-size: 0.9em;"><i class="far fa-clock"></i> ${postedTime}</p>
                        <details>
                            <summary>
                                <p class="article-summary">${news.summary}</p>
                            </summary>
                            <div class="full-content">
                                <p>${news.content.replace(/\n/g, '<br>')}</p>
                            </div>
                        </details>
                        <div class="feedback-panel">
                            <button class="action-btn edit-btn" data-id="${newsId}">
                                <i class="fas fa-edit"></i> ማዘመኛ
                            </button>
                            <button class="action-btn delete-btn" data-id="${newsId}">
                                <i class="fas fa-trash"></i> መደለቻ
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
        
        newsListings.innerHTML = htmlContent;
        setupActionListeners();

    } catch (error) {
        console.error("Error fetching news: ", error);
        newsListings.innerHTML = '<p style="text-align: center; color: red;">ዜናዎችን ለመጫን አልተቻለም።</p>';
    }
}

function setupActionListeners() {
    // አሁን listener ን በወላጅ ኤለመንት ላይ ብቻ መጫን እንችላለን
    newsListings.removeEventListener('click', handleNewsActions); 
    newsListings.addEventListener('click', handleNewsActions);
}

function handleNewsActions(event) {
    const button = event.target.closest('.action-btn');
    if (!button) return; 

    const newsId = button.getAttribute('data-id');

    if (button.classList.contains('edit-btn')) {
        handleEditNews(newsId); // አሁን ID ን ብቻ ማስተላለፍ በቂ ነው
    } else if (button.classList.contains('delete-btn')) {
        handleDeleteNews(newsId);
    }
}

function handleEditNews(newsId) {
    // 1. መረጃውን ከ newsCache አምጣ
    const news = newsCache[newsId];

    if (!news) {
        showMessage("የዜና መረጃው አልተገኘም። ገጹን ያድሱ።", 'error');
        return;
    }

    // 2. ወደ ዜና ማስገቢያ ክፍል ሽጋገር
    showPostFormBtn.click(); 

    // 3. ቅጹን በተገኘው መረጃ በትክክል ሙላ
    newsIdToEdit.value = newsId;
    newsTitle.value = news.title; // ርዕስ
    newsSummary.value = news.summary; // ማጠቃለያ
    newsContent.value = news.content; // ዝርዝር ይዘት
    
    // ለምስል
    imagePreview.src = news.imageUrl;
    imagePreview.style.display = 'block';
    currentImageUrlDisplay.textContent = `የአሁን ምስል: ${news.imageUrl.substring(0, 30)}...`;
    currentImageUrlDisplay.dataset.url = news.imageUrl;
    currentImageUrlDisplay.style.display = 'block';
    
    // አዲስ ምስል ካልተመረጠ እንዳይጠይቅ
    newsImageInput.required = false; 

    // Textareas ን ከጽሑፉ መጠን ጋር እንዲያድጉ ማድረግ
    autoResizeTextarea(newsSummary);
    autoResizeTextarea(newsContent);

    // 4. የቅጹን ርዕስ እና በተን ለውጥ
    formTitle.textContent = "የነበረ ዜና ማዘመን";
    submitNewsBtn.innerHTML = '<i class="fas fa-save"></i> ዜናውን ያዘምኑ';
}

async function handleDeleteNews(newsId) {
    if (!confirm("ይህንን ዜና ለመሰረዝ እርግጠኛ ነዎት? ይህ ተግባር የማይመለስ ነው።")) {
        return;
    }

    try {
        await deleteDoc(doc(db, NEWS_COLLECTION, newsId));
        showMessage("🗑️ ዜናው በተሳካ ሁኔታ ተሰርዟል።", 'success');
        fetchAndRenderPostedNews(); // ዜናዎችን እንደገና ጫን

    } catch (error) {
        console.error("Error deleting document: ", error);
        showMessage("ዜናውን ለመሰረዝ አልተቻለም።", 'error');
    }
}

// ======================================================================
// 8. አውቶማቲክ የTextarea መጠን መቀየሪያ
// ======================================================================
function autoResizeTextarea(textarea) {
    // ቁመቱን ወደ መጀመሪያው ይመልሱ
    textarea.style.height = 'auto'; 
    // ከዚያም ይዘቱን ለማስተናገድ የሚያስፈልገውን ያህል ያሰፉ
    textarea.style.height = `${textarea.scrollHeight}px`;
}

// በጽሑፍ ግቤት ላይ የautoResize ተግባርን ማያያዝ
[newsSummary, newsContent].forEach(textarea => {
    textarea.addEventListener('input', () => autoResizeTextarea(textarea));
    textarea.addEventListener('focus', () => autoResizeTextarea(textarea)); 
});

// ======================================================================
// 9. ገጹ ሲጫን መጀመሪያ የሚሰሩ ተግባራት
// ======================================================================
document.addEventListener('DOMContentLoaded', async () => {
    // ገጹ ሲከፈት መጀመሪያ localStorage ውስጥ የተቀመጠ ፓስወርድ መኖሩን እና ትክክለኛ መሆኑን ያረጋግጡ
    const loggedIn = await checkLocalStorageForLogin();

    if (!loggedIn) {
        // ፓስወርድ ከሌለ ወይም ትክክል ካልሆነ የመግቢያ ሞዳሉን አሳይ
        authModal.style.display = 'flex';
    }
    // ለመጀመሪያ ጊዜ ከተለጠፈው ዜና ይልቅ ዜና ማስገቢያ ቅጹ እንዲታይ
    postNewsSection.style.display = 'block';
    postedNewsSection.style.display = 'none';
    
    // ገጹ ሲጫን የ textareas መጠናቸውን ከRow Number ጋር ያስተካክሉ
    [newsSummary, newsContent].forEach(autoResizeTextarea);
});
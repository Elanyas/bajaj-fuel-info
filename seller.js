// የFirebase Config ከሎጊን ገጽ የተወሰደ
const firebaseConfig = {
    apiKey: "AIzaSyA-ywRuhanxoEJgR83jwp_-nOkPY4jLOH4",
    authDomain: "elanyas-info.firebaseapp.com",
    projectId: "elanyas-info",
    storageBucket: "elanyas-info.firebasestorage.app",
    messagingSenderId: "769306910360",
    appId: "1:769306910360:web:70988eed5b1da8ffa0faed",
    measurementId: "G-2XX2B3RSGP"
};

// ወሳኝ የFirebase ሞዱሎችን ማስመጣት
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    query, 
    where, 
    getDocs, 
    doc, 
    updateDoc,
    deleteDoc, 
    serverTimestamp,
    getDoc 
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

// Firebase App እና Firestore Database ማስጀመር
const app = initializeApp(firebaseConfig);
const db = getFirestore(app); 

// አዲሱ የCloudinary Config 
const CLOUDINARY_CLOUD_NAME = "dddyppnhp"; 
const CLOUDINARY_UPLOAD_PRESET = "bajaj_upload_preset"; 
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
const MAX_IMAGE_SIZE_MB = 2; // ✅ አዲስ: ከፍተኛ የምስል መጠን በ MB

// DOM Elements
const coinBalanceDisplay = document.getElementById('coinBalanceDisplay');
const userNameDisplay = document.getElementById('userNameDisplay');
const userPhoneDisplay = document.getElementById('userPhoneDisplay');
const newListingForm = document.getElementById('newListingForm');
const mainCategorySelect = document.getElementById('mainCategory');
const subCategorySelect = document.getElementById('subCategory');
const daysDurationSelect = document.getElementById('daysDuration');
const coinCostDisplay = document.getElementById('coinCostDisplay');
const itemImageInput = document.getElementById('itemImage');
const imagePreview = document.getElementById('imagePreview');
const imagePlaceholder = document.getElementById('imagePlaceholder');
const listingMessage = document.getElementById('listingMessage');
const activeListingsGrid = document.getElementById('activeListingsGrid');
const noActiveListings = document.getElementById('noActiveListings');
const expiredListingsGrid = document.getElementById('expiredListingsGrid'); // ✅ አዲስ
const noExpiredListings = document.getElementById('noExpiredListings'); // ✅ አዲስ
const starRatingSelector = document.getElementById('starRatingSelector'); 
const starRatingInput = document.getElementById('starRating'); 

// ወሳኝ የLocal Storage Variables
let loggedInUserName;
let loggedInUserPhone;
let loggedInUserPassword;
let sellerDocumentId; 

// ----------------------------------------------------------------------
// 1. የደህንነት እና የሎጊን ማረጋገጫ (Security Check)
// ----------------------------------------------------------------------
function checkUserAuthentication() {
    loggedInUserName = localStorage.getItem('loggedInUserName');
    loggedInUserPhone = localStorage.getItem('loggedInUserPhone');
    loggedInUserPassword = localStorage.getItem('loggedInUserPassword'); 

    if (!loggedInUserName || !loggedInUserPhone) {
        localStorage.setItem('errorMessageOnLoad', "እባክዎ ዳሽቦርዱን ለመጠቀም ይግቡ!");
        window.location.href ="login_gebeya.html"; 
        return false;
    }
    
    sellerDocumentId = loggedInUserPhone;
    return true;
}

// ----------------------------------------------------------------------
// 2. የተጠቃሚ መረጃዎችን መጫን (Load User Info)
// ----------------------------------------------------------------------
async function loadUserInfo() {
    userNameDisplay.textContent = loggedInUserName;
    userPhoneDisplay.textContent = loggedInUserPhone;

    try {
        const userDocRef = doc(db, "users", sellerDocumentId);
        const userSnapshot = await getDoc(userDocRef); 

        if (userSnapshot.exists() && userSnapshot.data().ds_coin_balance !== undefined) {
            coinBalanceDisplay.textContent = userSnapshot.data().ds_coin_balance;
        } else {
            coinBalanceDisplay.textContent = '0';
            console.warn("DS Coin balance not found in user document. Defaulting to 0.");
        }
    } catch (error) {
        console.error("Error loading coin balance:", error);
        coinBalanceDisplay.textContent = '??';
    }
}

// ----------------------------------------------------------------------
// 3. የማስታወቂያ ምድቦችን መሙላት (Category Logic) - ✅ ማሻሻያ 5: የልብስ ምድብ መጨመር
// ----------------------------------------------------------------------
const categories = {
    vehicle: ["ባጃጅ", "ሞተር", "መኪና", "ሳይክል", "ሌሎች"],
    spare_part: ["ጎማ/ቲዩብ", "ምንጣፍ", "የሞተር ክፍሎች", "የኤሌትሪክ ክፍሎች", "ቦዲ ፓርትስ", "ሌሎች"],
    phone: ["አንድሮይድ", "አይፎን", "ቻርጅ", "ኤርፎን", "ሌሎች"],
    clothes: ["ሱሪ", "ቲሸርት", "ጃኬት", "ሹራብ", "ጫማ", "ሌላ"], // ✅ አዲስ ምድብ
    other: ["አገልግሎት (ጥገና, ቅባት)", "ሌላ እቃዎች", "ኪራይ/ሊዝ"]
};

function populateSubCategories() {
    subCategorySelect.innerHTML = '<option value="">ንዑስ ምድብ ይምረጡ</option>';
    const selectedCategory = mainCategorySelect.value;

    if (selectedCategory && categories[selectedCategory]) {
        categories[selectedCategory].forEach(sub => {
            const option = document.createElement('option');
            option.value = sub;
            option.textContent = sub;
            subCategorySelect.appendChild(option);
        });
        subCategorySelect.disabled = false;
    } else {
        subCategorySelect.disabled = true;
    }
    calculateCoinCost(); // ምድብ ሲቀየር የኮይን ዋጋ እንዲሰላ
}
mainCategorySelect.addEventListener('change', populateSubCategories);


// ----------------------------------------------------------------------
// የኮከብ መምረጫ UI ሎጂክ
// ----------------------------------------------------------------------
function setupStarRatingSelector() {
    const stars = starRatingSelector.querySelectorAll('.star');
    
    stars.forEach(star => {
        star.addEventListener('click', () => {
            const selectedRating = parseInt(star.getAttribute('data-rating'));
            let currentRating = parseInt(starRatingInput.value);
            
            // በተመሳሳይ ኮከብ ላይ እንደገና ከተጫነ ወደ ዜሮ ይመልስ
            const newRating = (selectedRating === currentRating) ? 0 : selectedRating;
            starRatingInput.value = newRating;
            
            // የኮከቦችን ቀለም ማስተካከል
            stars.forEach(s => {
                const rating = parseInt(s.getAttribute('data-rating'));
                if (rating <= newRating) {
                    s.classList.add('selected');
                } else {
                    s.classList.remove('selected');
                }
            });
            
            calculateCoinCost(); // የኮከብ ዋጋ ሲቀየር አዲስ ስሌት
        });
    });
}


// ----------------------------------------------------------------------
// 4. የኮይን ዋጋ ስሌት (Coin Cost Calculation) - ✅ ማሻሻያ 6: የቀን ስሌት ማስተካከል
// ----------------------------------------------------------------------
function calculateCoinCost() {
    const days = daysDurationSelect.value;
    const mainCategory = mainCategorySelect.value;
    const starRating = parseInt(starRatingInput.value) || 0; // የተመረጠውን ኮከብ ደረጃ ያግኙ
    let baseCost = 5; // ነባሪ ዋጋ ለ 7 ቀን (ለተሽከርካሪ ካልሆነ)
    let starCost = 0; // የኮከብ ዋጋ
    
    // 1. የማስታወቂያው መሠረታዊ ዋጋ (Base Listing Cost) ስሌት
    if (mainCategory === 'vehicle') {
        if (days === '7') {
            baseCost = 7;
        } else if (days === '14') {
            baseCost = 12; 
        } else if (days === '21') { // ✅ አዲስ የቀን ስሌት
            baseCost = 18;
        } else if (days === '30') {
            baseCost = 25;
        }
    } else { // spare_part, phone, clothes, other
        if (days === '7') {
            baseCost = 5;
        } else if (days === '14') {
            baseCost = 9; 
        } else if (days === '21') { // ✅ አዲስ የቀን ስሌት
            baseCost = 13;
        } else if (days === '30') {
            baseCost = 18;
        }
    }
    
    // 2. የኮከብ ዋጋ (Star Rating Cost) ስሌት
    // 1 ኮከብ: 2 ኮይን፣ 2 ኮከብ: 4 ኮይን፣ 3 ኮከብ: 6 ኮይን
    starCost = starRating * 2;
    
    // 3. ጠቅላላ ዋጋ
    const totalCost = baseCost + starCost;
    
    coinCostDisplay.textContent = totalCost;
}

daysDurationSelect.addEventListener('change', calculateCoinCost);
mainCategorySelect.addEventListener('change', calculateCoinCost); 

// የምስል ቅድመ እይታ
itemImageInput.addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreview.src = e.target.result;
            imagePreview.style.display = 'block';
            imagePlaceholder.style.display = 'none';
        };
        reader.readAsDataURL(file);
    } else {
        imagePreview.style.display = 'none';
        imagePlaceholder.style.display = 'block';
    }
});

// ----------------------------------------------------------------------
// 5. አዲስ ማስታወቂያ መለጠፍ (Post New Listing) - ✅ ማሻሻያ 4: የምስል መጠን ገደብ
// ----------------------------------------------------------------------
async function postNewListing(event) {
    event.preventDefault();
    listingMessage.style.color = '#2196f3';
    listingMessage.textContent = "ማስታወቂያው እየተለጠፈ ነው... እባክዎ ይጠብቁ።";

    const coinCost = parseInt(coinCostDisplay.textContent);
    const currentBalance = parseInt(coinBalanceDisplay.textContent);
    const mainCategory = mainCategorySelect.value;
    const subCategory = subCategorySelect.value;
    const itemTitle = document.getElementById('itemTitle').value;
    const itemPrice = parseFloat(document.getElementById('itemPrice').value);
    const itemDescription = document.getElementById('itemDescription').value;
    const starRating = parseInt(starRatingInput.value) || 0; 

    if (currentBalance < coinCost) {
        listingMessage.style.color = '#f44336';
        listingMessage.textContent = `ቂንትሮስ የ DS Coin ባላንስ የለዎትም። ${coinCost} ኮይን ያስፈልግዎታል። እባክዎ ይሙሉ።`;
        return;
    }

    if (!mainCategory || !subCategory) {
        listingMessage.style.color = '#f44336';
        listingMessage.textContent = "እባክዎ ዋና እና ንዑስ ምድቦችን ይምረጡ!";
        return;
    }

    const imageFile = itemImageInput.files[0];
    if (!imageFile) {
        listingMessage.style.color = '#f44336';
        listingMessage.textContent = "እባክዎ የእቃውን ምስል ይምረጡ!";
        return;
    }
    
    // ✅ የምስል መጠን ማረጋገጫ (ከ2MB በታች መሆኑን)
    if (imageFile.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
        listingMessage.style.color = '#f44336';
        listingMessage.textContent = `የምስሉ መጠን ከ ${MAX_IMAGE_SIZE_MB}MB በላይ መሆን የለበትም።`;
        return;
    }

    try {
        // 1. ምስሉን ወደ Cloudinary መስቀል (Upload Image)
        const formData = new FormData();
        formData.append('file', imageFile);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        formData.append('folder', 'bajaj_listings'); 

        const response = await fetch(CLOUDINARY_UPLOAD_URL, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error("Cloudinary upload failed: " + response.statusText);
        }

        const data = await response.json();
        const imageUrl = data.secure_url; 

        // 2. ማስታወቂያውን ወደ Firestore ማስቀመጥ
        // ✅ ማሻሻያ 1: የለጣፊው ስም ከሎካል ስቶሬጅ ተወስዶ ይሰቀል (አስቀድሞ ነበረ)
        const itemData = {
            seller_id: sellerDocumentId,
            seller_name: loggedInUserName, // ✅ ከሎካል ስቶሬጅ
            seller_phone: loggedInUserPhone,
            itemTitle: itemTitle,
            mainCategory: mainCategory,
            subCategory: subCategory,
            itemPrice: itemPrice,
            itemDescription: itemDescription,
            days_duration: parseInt(daysDurationSelect.value),
            coin_cost: coinCost,
            star_rating: starRating, 
            image_url: imageUrl, 
            posted_at: serverTimestamp(), 
            expires_at: new Date(Date.now() + parseInt(daysDurationSelect.value) * 24 * 60 * 60 * 1000), 
            is_active: true,
            is_featured: starRating > 0 
        };

        await addDoc(collection(db, "listings"), itemData); 

        // 3. የሻጩን የኮይን ባላንስ መቀነስ (Update)
        const userDocRef = doc(db, "users", sellerDocumentId); 
        const newBalance = currentBalance - coinCost;
        await updateDoc(userDocRef, {
            ds_coin_balance: newBalance
        });

        // ስኬታማ ከሆነ
        listingMessage.style.color = '#4caf50';
        listingMessage.textContent = "ማስታወቂያዎ በተሳካ ሁኔታ ተለጥፏል! የኮይን ሂሳብዎ ተቀንሷል።";
        newListingForm.reset(); 
        imagePreview.style.display = 'none';
        imagePlaceholder.style.display = 'block';
        starRatingInput.value = 0; // ኮከብ ሪሴት
        setupStarRatingSelector(); // ኮከብ UI ሪሴት
        loadUserInfo(); 
        renderActiveListings(); 
    } catch (error) {
        console.error("Error posting listing or updating balance:", error);
        listingMessage.style.color = '#f44336';
        listingMessage.textContent = "ማስታወቂያ በመለጠፍ ላይ ያልተጠበቀ ችግር ተፈጥሯል: " + error.message;
    }
}

newListingForm.addEventListener('submit', postNewListing);

// ----------------------------------------------------------------------
// 6.1. የካርድ ድርጊቶች ተግባራት (Card Action Functions) 
// ----------------------------------------------------------------------

// ማስታወቂያውን ለማዘመን የሚያስፈልገው ተግባር (Edit) - ✅ ማሻሻያ 2: አይጠራም
function handleEditListing(listingId) {
    // ይህ ተግባር እንዲወገድ ተጠይቋል (በካርዱ ላይ የለም)
    alert(`የማስታወቂያ መታወቂያ (ID): ${listingId} ለማዘመን (Edit) ተመርጧል!`);
    console.log("Edit request for listing ID:", listingId);
}

// የማስታወቂያ መግለጫን ማሳየት 
function handleViewDescription(description) {
    alert(`የእቃው ዝርዝር መግለጫ:\n\n${description}`);
}


// ማስታወቂያውን ለመክፈል/ለማደስ የሚያስፈልገው ተግባር (Pay/Renew)
async function handleRepostListing(listingId) {
    const renewDays = 7; // ለ 7 ቀን ማደስ
    // ለ 7 ቀን ማደስ የሚሆን ዋጋ ማስላት (በአሁኑ ምድብ ላይ በመመስረት - ኮከብ ሳይጨምር)
    let renewCost = 5; 
    
    // ማስታወቂያውን መጀመሪያ ማምጣት
    try {
        const listingDocRef = doc(db, "listings", listingId);
        const listingSnapshot = await getDoc(listingDocRef);

        if (!listingSnapshot.exists()) {
            alert("ማስታወቂያው አልተገኘም።");
            return;
        }

        const listingData = listingSnapshot.data();
        
        // መሰረታዊ የማደሻ ዋጋ (ለ 7 ቀን)
        if (listingData.mainCategory === 'vehicle') {
            renewCost = 7;
        } else {
             // clothes, spare_part, phone, other
            renewCost = 5;
        }

        // የኮከብ ዋጋ ካለ መጨመር
        const starCost = (listingData.star_rating || 0) * 2;
        const totalRenewCost = renewCost + starCost;

        // 1. የኮይን ባላንስን ማረጋገጥ
        const currentBalanceText = coinBalanceDisplay.textContent;
        const currentBalance = parseInt(currentBalanceText);

        if (isNaN(currentBalance)) {
            alert("የኮይን ባላንስ መጫን አልተቻለም። እባክዎ ገጹን ያድሱ።");
            return;
        }

        if (currentBalance < totalRenewCost) {
            alert(`ቂንትሮስ የ DS Coin ባላንስ የለዎትም (${currentBalance} ኮይን)። ማስታወቂያውን ለማደስ ${totalRenewCost} ኮይን ያስፈልግዎታል። እባክዎ ይሙሉ። (መሰረታዊ: ${renewCost} + ኮከብ: ${starCost})`);
            return;
        }
        
        if (!confirm(`የማስታወቂያ መታወቂያ: ${listingId} ለተጨማሪ ${renewDays} ቀናት ለማደስ ${totalRenewCost} ኮይን ይፈልጋል። ይቀጥሉ?`)) {
            return;
        }

        // 2. አዲሱን የማለቂያ ቀን ማስላት
        const currentExpiresAt = listingData.expires_at ? listingData.expires_at.toDate() : new Date();
        
        // ጊዜው ካለፈ፣ ከአሁኑ ጊዜ እንጀምራለን። ካላለፈ፣ ካለፈው የማለቂያ ጊዜ እንጀምራለን።
        const baseTime = currentExpiresAt.getTime() > Date.now() ? currentExpiresAt.getTime() : Date.now();
        const newExpiryDate = new Date(baseTime + renewDays * 24 * 60 * 60 * 1000);

        // 3. የማስታወቂያውን የማለቂያ ጊዜ ማራዘም
        await updateDoc(listingDocRef, {
            expires_at: newExpiryDate,
            is_active: true // ማስታወቂያውን ማግበር
        });
        
        // 4. የሻጩን ኮይን ባላንስ መቀነስ
        const userDocRef = doc(db, "users", sellerDocumentId);
        const newBalance = currentBalance - totalRenewCost;
        
        await updateDoc(userDocRef, {
            ds_coin_balance: newBalance
        });

        alert(`ማስታወቂያው በተሳካ ሁኔታ ታድሷል! የኮይን ሂሳብዎ ${totalRenewCost} ኮይን ተቀንሷል። አዲስ ባላንስ: ${newBalance}`);
        
        // UI እና ዝርዝሩን ማደስ
        loadUserInfo(); 
        renderActiveListings(); 
        renderExpiredListings(); // ያበቁት ውስጥ ካለ እንዲወገድ

    } catch (error) {
        console.error("Error renewing listing or updating balance:", error);
        alert("ማስታወቂያውን ማደስ ወይም ኮይን መቀነስ አልተቻለም: " + error.message);
    }
}

// ማስታወቂያውን ለመሰረዝ የሚያስፈልገው ተግባር (Delete)
async function handleDeleteListing(listingId) {
    if (!confirm("ይህንን ማስታወቂያ በእርግጥ መሰረዝ ይፈልጋሉ? ከ Firestore ላይ ሙሉ በሙሉ ይወገዳል!")) {
        return;
    }
    
    try {
        const listingDocRef = doc(db, "listings", listingId); 
        await deleteDoc(listingDocRef); 

        alert("ማስታወቂያው በተሳካ ሁኔታ ተሰርዟል! (ከ Firestore ተወግዷል)");
        renderActiveListings(); // ንቁ ዝርዝሩን ማደስ
        renderExpiredListings(); // ያበቁ ዝርዝሩን ማደስ
    } catch (error) {
        console.error("Error deleting listing:", error);
        alert("ማስታወቂያውን መሰረዝ አልተቻለም: " + error.message);
    }
}

// ----------------------------------------------------------------------
// 6. ንቁ ማስታወቂያዎችን ማሳየት (Render Active Listings)
// ----------------------------------------------------------------------
async function renderActiveListings() {
    activeListingsGrid.innerHTML = ''; 
    noActiveListings.style.display = 'none';

    try {
        const q = query(
            collection(db, "listings"), 
            where("seller_id", "==", sellerDocumentId)
            // ማስታወቂያው ንቁ መሆን አለበት (expires_at > new Date())
        );
        
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            noActiveListings.style.display = 'block';
            return;
        }
        
        let foundActive = false;
        querySnapshot.forEach((doc) => {
            const listing = doc.data();
            const expiresAt = listing.expires_at ? listing.expires_at.toDate() : new Date();
            
            // ንቁ ማስታወቂያዎች: ጊዜያቸው ያላለፈ
            if (expiresAt > new Date()) { 
                foundActive = true;
                const listingId = doc.id;
                
                // የማለቂያ ቀንን ማስላት
                const daysLeft = Math.ceil((expiresAt - new Date()) / (1000 * 60 * 60 * 24));
                const daysLeftText = daysLeft > 0 ? `${daysLeft} ቀን ቀርቷል` : "ጊዜው አብቅቷል";
                const daysLeftStyle = daysLeft <= 3 ? 'style="color: #f44336;"' : ''; 
                
                // የዋና ምድብ ስም ለማግኘት (ከእንግሊዝኛ ወደ አማርኛ)
                const mainCategoryMap = {
                    vehicle: 'ተሽከርካሪ',
                    spare_part: 'መለዋወጫ',
                    phone: 'ስልክ',
                    clothes: 'ልብስ', // ✅ አዲስ
                    other: 'ሌላ'
                };
                const displayMainCategory = mainCategoryMap[listing.mainCategory] || listing.mainCategory;

                // የኮከብ ማሳያ
                const starRating = listing.star_rating || 0;
                let starsHTML = '';
                for (let i = 0; i < starRating; i++) {
                    starsHTML += '<i class="fas fa-star"></i>';
                }
                if (starsHTML) {
                     starsHTML = `<div class="star-display">${starsHTML}</div>`;
                }

                const card = `
                    <div class="listing-card" data-id="${listingId}">
                        <div class="listing-image-container-v2">
                            <img src="${listing.image_url}" alt="${listing.itemTitle}">
                        </div>
                        <div class="listing-info">
                            <div>
                                <h3 class="card-title">${listing.itemTitle}</h3>
                                <p class="card-meta">ዋና ምድብ: ${displayMainCategory}</p>
                                <p class="card-meta">ንዑስ ምድብ: ${listing.subCategory}</p>
                                <p class="card-meta">ዋጋ: ${listing.itemPrice.toLocaleString()} ብር</p>
                                ${starsHTML} </div>
                            <div class="days-left-info" ${daysLeftStyle}>
                                <i class="fas fa-clock"></i> ${daysLeftText}
                            </div>
                            <div class="card-actions">
                                <button class="action-button desc-btn" data-id="${listingId}" data-desc="${listing.itemDescription.replace(/"/g, '&quot;')}" style="background-color: #ff9800;"><i class="fas fa-file-lines"></i> መግለጫ</button>
                                <button class="action-button repost-btn" data-id="${listingId}" style="background-color: #4caf50;"><i class="fas fa-redo"></i> ይክፈሉ/አድሱ</button>
                                <button class="action-button delete-btn" data-id="${listingId}" style="background-color: #f44336;"><i class="fas fa-trash-alt"></i> አስወግድ</button>
                            </div>
                        </div>
                    </div>
                `;
                activeListingsGrid.insertAdjacentHTML('beforeend', card);
            }
        });
        
        if (!foundActive) {
            noActiveListings.style.display = 'block';
        }

    } catch (error) {
        console.error("Error rendering active listings:", error);
        activeListingsGrid.innerHTML = `<p class="error-message">ማስታወቂያዎችዎን በመጫን ላይ ችግር ተፈጥሯል።</p>`;
    }
}

// ----------------------------------------------------------------------
// 7. ያበቁ ማስታወቂያዎችን ማሳየት (Render Expired Listings) - ✅ ማሻሻያ 3: ያበቁ ማስታወቂያዎች
// ----------------------------------------------------------------------
async function renderExpiredListings() {
    expiredListingsGrid.innerHTML = ''; 
    noExpiredListings.style.display = 'none';

    try {
        const q = query(
            collection(db, "listings"), 
            where("seller_id", "==", sellerDocumentId)
        );
        
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            noExpiredListings.style.display = 'block';
            return;
        }
        
        let foundExpired = false;
        querySnapshot.forEach((doc) => {
            const listing = doc.data();
            const expiresAt = listing.expires_at ? listing.expires_at.toDate() : new Date();
            
            // ያበቁ ማስታወቂያዎች: ጊዜያቸው ያለፈ (<= new Date())
            if (expiresAt <= new Date()) { 
                foundExpired = true;
                const listingId = doc.id;
                
                // የማለቂያ ቀንን ማስላት (ያለፈ ቀን)
                const daysLate = Math.ceil((new Date() - expiresAt) / (1000 * 60 * 60 * 24));
                const daysLateText = `${daysLate} ቀን አልፎታል`;
                
                // የዋና ምድብ ስም ለማግኘት (ከእንግሊዝኛ ወደ አማርኛ)
                const mainCategoryMap = {
                    vehicle: 'ተሽከርካሪ',
                    spare_part: 'መለዋወጫ',
                    phone: 'ስልክ',
                    clothes: 'ልብስ',
                    other: 'ሌላ'
                };
                const displayMainCategory = mainCategoryMap[listing.mainCategory] || listing.mainCategory;

                // የኮከብ ማሳያ
                const starRating = listing.star_rating || 0;
                let starsHTML = '';
                for (let i = 0; i < starRating; i++) {
                    starsHTML += '<i class="fas fa-star"></i>';
                }
                if (starsHTML) {
                     starsHTML = `<div class="star-display">${starsHTML}</div>`;
                }

                const card = `
                    <div class="listing-card expired-card" data-id="${listingId}">
                        <div class="listing-image-container-v2">
                            <img src="${listing.image_url}" alt="${listing.itemTitle}">
                        </div>
                        <div class="listing-info">
                            <div>
                                <h3 class="card-title">${listing.itemTitle}</h3>
                                <p class="card-meta">ዋና ምድብ: ${displayMainCategory}</p>
                                <p class="card-meta">ንዑስ ምድብ: ${listing.subCategory}</p>
                                <p class="card-meta">ዋጋ: ${listing.itemPrice.toLocaleString()} ብር</p>
                                ${starsHTML} </div>
                            <div class="days-left-info" style="color: #f44336; font-weight: bold;">
                                <i class="fas fa-exclamation-circle"></i> ${daysLateText}
                            </div>
                            <div class="card-actions">
                                <button class="action-button desc-btn" data-id="${listingId}" data-desc="${listing.itemDescription.replace(/"/g, '&quot;')}" style="background-color: #ff9800;"><i class="fas fa-file-lines"></i> መግለጫ</button>
                                <button class="action-button repost-btn" data-id="${listingId}" style="background-color: #4caf50;"><i class="fas fa-redo"></i> ይክፈሉ/አድሱ</button>
                                <button class="action-button delete-btn" data-id="${listingId}" style="background-color: #f44336;"><i class="fas fa-trash-alt"></i> አስወግድ</button>
                            </div>
                        </div>
                    </div>
                `;
                expiredListingsGrid.insertAdjacentHTML('beforeend', card);
            }
        });
        
        if (!foundExpired) {
            noExpiredListings.style.display = 'block';
        }
        
    } catch (error) {
        console.error("Error rendering expired listings:", error);
        expiredListingsGrid.innerHTML = `<p class="error-message">ያበቁ ማስታወቂያዎችዎን በመጫን ላይ ችግር ተፈጥሯል።</p>`;
    }
}


// ----------------------------------------------------------------------
// 8. የአሰሳ ተግባር (Navigation Logic) - ✅ ማሻሻያ 3: ያበቁ ማስታወቂያዎችን መጥራት
// ----------------------------------------------------------------------
function setupNavigation() {
    const sections = {
        'postNewListingBtn': document.getElementById('newListingSection'),
        'viewActiveListingsBtn': document.getElementById('activeListingsSection'),
        'viewExpiredListingsBtn': document.getElementById('expiredListingsSection')
    };

    const buttons = document.querySelectorAll('.main-nav-buttons-v2 button');

    buttons.forEach(button => {
        button.addEventListener('click', () => {
            const targetSection = sections[button.id];
            
            buttons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active'); 

            for (const key in sections) {
                sections[key].style.display = 'none';
            }
            
            if (targetSection) {
                targetSection.style.display = 'block';
                if (button.id === 'viewActiveListingsBtn') {
                    renderActiveListings(); 
                } else if (button.id === 'viewExpiredListingsBtn') {
                    renderExpiredListings(); // ✅ ያበቁ ማስታወቂያዎችን ይጭናል
                }
            }

            if (button.id === 'postNewListingBtn') {
                newListingForm.classList.add('active');
            } else {
                newListingForm.classList.remove('active');
            }
            // ምድቡ እና ቀኑ ሳይመረጥ የኮይን ዋጋ እንዲሰላ
            calculateCoinCost(); 
        });
    });

    document.getElementById('newListingSection').style.display = 'none';
    document.getElementById('expiredListingsSection').style.display = 'none';
    document.getElementById('activeListingsSection').style.display = 'block';
    document.getElementById('viewActiveListingsBtn').classList.add('active');
    newListingForm.classList.remove('active'); 
}


// ----------------------------------------------------------------------
// 9. የንቁ/ያለቁ ማስታወቂያ በተን ክሊኮችን ማስተናገድ (Handle Listing Button Clicks) - ✅ ማሻሻያ 2: Edit ተወግዷል
// ----------------------------------------------------------------------
function setupListingActionListeners() {
    // ንቁ ማስታወቂያዎች
    activeListingsGrid.addEventListener('click', handleListingActions);
    // ያበቁ ማስታወቂያዎች
    expiredListingsGrid.addEventListener('click', handleListingActions);
}

function handleListingActions(event) {
    const button = event.target.closest('.action-button');
    if (!button) return; 

    const listingId = button.getAttribute('data-id');

    // ✅ የEdit (edit-btn) ማጣሪያ ተወግዷል
    if (button.classList.contains('repost-btn')) {
        handleRepostListing(listingId);
    } else if (button.classList.contains('delete-btn')) {
        handleDeleteListing(listingId);
    } else if (button.classList.contains('desc-btn')) {
         // የመግለጫ ቁልፍ ክሊክ ማስተናገድ
        const description = button.getAttribute('data-desc');
        handleViewDescription(description);
    }
}


// ----------------------------------------------------------------------
// 10. ገጹ ሲጫን መጀመሪያ የሚሰሩ ተግባራት (Initial Load)
// ----------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    if (checkUserAuthentication()) {
        loadUserInfo(); 
        populateSubCategories();
        setupStarRatingSelector(); 
        calculateCoinCost();
        // በመጀመሪያ ንቁ ማስታወቂያዎችን ብቻ መጫን
        renderActiveListings(); 
        setupNavigation(); 
        setupListingActionListeners(); 
    }
});
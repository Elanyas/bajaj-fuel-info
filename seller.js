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

// 1. የFirebase ሞዱሎችን ማስመጣት (ሁሉንም በአንድ ላይ)
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

import { 
    getStorage, 
    ref, 
    uploadBytes, 
    getDownloadURL,
    deleteObject
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js";

// Firebase App እና Firestore Database ማስጀመር
const app = initializeApp(firebaseConfig);
const db = getFirestore(app); 
const storage = getStorage(app);

// አዲሱ የCloudinary Config  ተሰርዟል

const MAX_IMAGE_SIZE_MB = 4; // ✅ አዲስ: ከፍተኛ የምስል መጠን በ MB

// DOM Elements
const coinBalanceDisplay = document.getElementById('coinBalanceDisplay');
const userNameDisplay = document.getElementById('userNameDisplay');
const userPhoneDisplay = document.getElementById('userPhoneDisplay');
const newListingForm = document.getElementById('newListingForm');
const mainCategorySelect = document.getElementById('mainCategory');
const subCategorySelect = document.getElementById('subCategory');
const detailItemSelect = document.getElementById('detailItem'); // ✅ አዲስ
const daysDurationSelect = document.getElementById('daysDuration');
const coinCostDisplay = document.getElementById('coinCostDisplay');
const itemImageInput = document.getElementById('itemImage');
const imagePreview = document.getElementById('imagePreview');
const imagePlaceholder = document.getElementById('imagePlaceholder');
const listingMessage = document.getElementById('listingMessage');
const activeListingsGrid = document.getElementById('activeListingsGrid');
const noActiveListings = document.getElementById('noActiveListings');
const expiredListingsGrid = document.getElementById('expiredListingsGrid'); 
const noExpiredListings = document.getElementById('noExpiredListings'); 
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

    let totalCoinBalance = 0;
    // ሹፌሮች እና ማህበረሰብ የሚመዘገቡባቸው ኮሌክሽኖች
    const collectionsToCheck = ["users", "HararGebeyaUsers"]; 

    try {
        for (const collectionName of collectionsToCheck) {
            const userDocRef = doc(db, collectionName, sellerDocumentId);
            const userSnapshot = await getDoc(userDocRef); 

            if (userSnapshot.exists()) {
                const data = userSnapshot.data();
                // ds_coin_balance ካለ ወደ ጠቅላላ ባላንስ ይደመር
                const coinBalance = data.ds_coin_balance !== undefined ? parseInt(data.ds_coin_balance) : 0;
                totalCoinBalance += coinBalance;
                
                console.log(`Coin balance from ${collectionName}: ${coinBalance}`);
            }
        }
        
        coinBalanceDisplay.textContent = totalCoinBalance;
        
        if (totalCoinBalance === 0) {
            console.warn("DS Coin balance not found in either collection or is zero. Defaulting to 0.");
        }

    } catch (error) {
        console.error("Error loading coin balance from multiple collections:", error);
        coinBalanceDisplay.textContent = '??';
    }
}

// ----------------------------------------------------------------------
// 3. የማስታወቂያ ምድቦችን መሙላት (Category Logic) - ✅ ማሻሻያ: ሶስት ደረጃዎች
// ----------------------------------------------------------------------
// ዋና ዘርፎች (Main Categories)
const mainCategories = {
    vehicle_and_parts: "ተሽከርካሪዎች እና መለዋወጫ",
    phones_and_computers: "ስልኮች እና ኮምፒውተሮች",
    home_appliances: "የቤት እቃዎች",
    property_and_rent: "ቤት፣ ቦታ እና ኪራይ",
    books_and_education: "መፅሀፍት እና የትምህርት መርጃ",
    fashion_and_apparel: "ፋሽን እና አልባሳት",
    construction_and_repair: "የግንባታ እና የጥገና እቃዎች",
    services: "አገልግሎቶች",
    others_main: "ሌሎች" 
};

// ንዑስ ዘርፎች (Sub-Categories) እና የእቃ አይነቶች (Detail Items)
const categories = {
    vehicle_and_parts: {
        bajaj: {
            amharic: "ባለ 3-እግር (ባጃጅ/ቶክቶክ)",
            details: ["አዲስ ባለ 3-እግር", "ያገለገለ ባለ 3-እግር", "የባጃጅ ሞተር መለዋወጫ", "የባጃጅ አካል መለዋወጫ (Body Parts)", "ጎማዎች", "ሌሎች"] // ✅ የተጨመረ: ሌሎች
        },
        motorcycles: {
            amharic: "ሞተር ሳይክሎች",
            details: ["አዲስ ሞተር ሳይክል", "ያገለገለ ሞተር ሳይክል", "የሞተር ሳይክል መለዋወጫ", "የሞተር መከላከያ (Helmet/Safety)", "ሌሎች"] // ✅ የተጨመረ: ሌሎች
        },
        cars: {
            amharic: "መኪናዎች",
            details: ["ያገለገሉ መኪናዎች", "የጭነት መኪናዎች/ቫኖች", "የመኪና መለዋወጫዎች", "የመኪና ጎማ እና ባትሪ", "ሌሎች"] // ✅ የተጨመረ: ሌሎች
        },
        others_sub: { 
            amharic: "ሌሎች",
            details: ["ሌሎች ተሽከርካሪ እና መለዋወጫ", "ሌሎች"] // ✅ የተጨመረ: ሌሎች
        }
    },
    phones_and_computers: {
        mobile_phones: {
            amharic: "ሞባይል ስልኮች",
            details: ["ስማርት ስልክ (32GB እና በታች)", "ስማርት ስልክ (64GB)", "ስማርት ስልክ (128GB)", "ስማርት ስልክ (256GB እና በላይ)", "ባር/ቀላል ስልኮች", "ሌሎች"] // ✅ የተጨመረ: ሌሎች
        },
        laptops_and_computers: {
            amharic: "ላፕቶፕ እና ኮምፒውተር",
            details: ["ላፕቶፕ (4GB RAM)", "ላፕቶፕ (8GB RAM)", "ላፕቶፕ (16GB RAM እና በላይ)", "ዴስክቶፕ ኮምፒውተር", "ታብሌቶች", "ሌሎች"] // ✅ የተጨመረ: ሌሎች
        },
        accessories: {
            amharic: "አክሰሰሪዎች (Accessories)",
            details: ["ቻርጀር እና ገመድ", "ማስታወሻ ሜሞሪ/Flash Disk", "የጆሮ ማዳመጫ (Earphone/Headset)", "የስልክ እስክሪን እና ከቨር", "ሌሎች"] // ✅ የተጨመረ: ሌሎች
        },
        others_sub: { 
            amharic: "ሌሎች",
            details: ["ሌሎች ስልኮች እና ኮምፒውተሮች", "ሌሎች"] // ✅ የተጨመረ: ሌሎች
        }
    },
    home_appliances: {
        large_appliances: {
            amharic: "ትላልቅ መገልገያዎች",
            details: ["ፍሪጅ/ማቀዝቀዣ", "ማጠቢያ ማሽን", "ጋዝ እና ኤሌክትሪክ ምድጃ", "ቲቪ (ቴሌቪዥን)", "ሌሎች"] // ✅ የተጨመረ: ሌሎች
        },
        kitchen_items: {
            amharic: "የኩሽና እቃዎች",
            details: ["ድስቶች እና መጥበሻዎች", "ብልቃጥ እና የብርጭቆ እቃዎች", "ማይክሮዌቭ እና ኦቨን", "የቡና እና ጁስ ማሽኖች", "ሌሎች"] // ✅ የተጨመረ: ሌሎች
        },
        furniture: {
            amharic: "ፈርኒቸር",
            details: ["ሶፋ እና የሳሎን ወንበር", "አልጋ እና ፍራሽ", "ቁምሳጥን እና ሣጥን", "የመመገቢያ ጠረጴዛ", "ሌሎች"] // ✅ የተጨመረ: ሌሎች
        },
        others_sub: { 
            amharic: "ሌሎች",
            details: ["ሌሎች የቤት እቃዎች", "ሌሎች"] // ✅ የተጨመረ: ሌሎች
        }
    },
    property_and_rent: {
        rent: {
            amharic: "ኪራይ (Rent)",
            details: ["የመኖሪያ ቤት ለኪራይ", "ሱቅ እና መጋዘን ለኪራይ", "የጋራ መኖሪያ (ክፍል ለተማሪ/ለነጠላ)", "የእንግዳ ማረፊያ (Guest House)", "ሌሎች"] // ✅ የተጨመረ: ሌሎች
        },
        sale: {
            amharic: "ሽያጭ (Sale)",
            details: ["የመኖሪያ ቤት ሽያጭ", "የንግድ ቤት/ሕንፃ ሽያጭ", "ባዶ ቦታ (መሬት) ለሽያጭ", "ሌሎች"] // ✅ የተጨመረ: ሌሎች
        },
        others_sub: { 
            amharic: "ሌሎች",
            details: ["ሌሎች ንብረት እና ኪራይ", "ሌሎች"] // ✅ የተጨመረ: ሌሎች
        }
    },
    books_and_education: {
        books: {
            amharic: "መፅሀፍት",
            details: ["የትምህርት ቤት መማሪያ መፅሀፍት", "ልቦለድ እና ታሪክ", "ሃይማኖታዊ መፅሀፍት", "የህፃናት መፅሀፍት", "ሌሎች"] // ✅ የተጨመረ: ሌሎች
        },
        stationery: {
            amharic: "የጽህፈት መሳሪያ (Stationery)",
            details: ["ደብተር እና እስክሪብቶ", "ቦርሳዎች (የተማሪ/የላፕቶፕ)", "የቢሮ እቃዎች (ፋይል/ወረቀት)", "ሌሎች"] // ✅ የተጨመረ: ሌሎች
        },
        others_sub: { 
            amharic: "ሌሎች",
            details: ["ሌሎች መፅሀፍት እና ትምህርት", "ሌሎች"] // ✅ የተጨመረ: ሌሎች
        }
    },
    fashion_and_apparel: {
        clothes: {
            amharic: "ልብሶች",
            details: ["የወንዶች ልብስ", "የሴቶች ልብስ", "የህፃናት ልብስ", "የባህል ልብሶች", "ሌሎች"] // ✅ የተጨመረ: ሌሎች
        },
        shoes: {
            amharic: "ጫማዎች",
            details: ["የወንዶች ጫማ", "የሴቶች ጫማ", "የስፖርት ጫማዎች", "የህፃናት ጫማ", "ሌሎች"] // ✅ የተጨመረ: ሌሎች
        },
        personal_adornment: {
            amharic: "የግል ማስዋቢያ",
            details: ["ሰዓት እና መነፅር", "ጌጣጌጥ (ብር/ወርቅ/Imitation)", "ሽቶ እና ኮስሞቲክስ", "ሌሎች"] // ✅ የተጨመረ: ሌሎች
        },
        others_sub: { 
            amharic: "ሌሎች",
            details: ["ሌሎች ፋሽን እና አልባሳት", "ሌሎች"] // ✅ የተጨመረ: ሌሎች
        }
    },
    construction_and_repair: {
        building_input: {
            amharic: "የግንባታ ግብአት",
            details: ["ሲሚንቶ እና አሸዋ", "ብረት እና ቆርቆሮ", "ቀለም እና ፕላስቲክ", "የመታጠቢያ ቤት እቃዎች (Ceramics/Sinks)", "ሌሎች"] // ✅ የተጨመረ: ሌሎች
        },
        tools: {
            amharic: "የእጅ መሳሪያዎች (Tools)",
            details: ["የኤሌክትሪክ መሳሪያዎች (Drill, etc)", "መዶሻ/መፍቻ/ጉልበት", "የቧንቧ እቃዎች", "የኤሌክትሪክ ገመድ እና ሶኬት", "ሌሎች"] // ✅ የተጨመረ: ሌሎች
        },
        others_sub: { 
            amharic: "ሌሎች",
            details: ["ሌሎች ግንባታ እና ጥገና", "ሌሎች"] // ✅ የተጨመረ: ሌሎች
        }
    },
    services: {
        repair_professional: {
            amharic: "የጥገና ባለሙያ",
            details: ["የኤሌክትሪክ ባለሙያ", "የቧንቧ ባለሙያ", "የዲሽ እና ቲቪ ባለሙያ", "የሞባይል/ኮምፒውተር ጥገና", "ሌሎች"] // ✅ የተጨመረ: ሌሎች
        },
        other_services: {
            amharic: "ሌሎች አገልግሎቶች",
            details: ["የትምህርት ማስጠናቀቂያ (Tutor)", "የቤት ጽዳት እና ምግብ", "ትራንስፖርት እና እቃ ማጓጓዝ", "የህትመት እና ፎቶ ግራፊክስ", "ሌሎች"] // ✅ የተጨመረ: ሌሎች
        },
        others_sub: { 
            amharic: "ሌሎች",
            details: ["ሌሎች አገልግሎቶች", "ሌሎች"] // ✅ የተጨመረ: ሌሎች
        }
    },
    others_main: { 
        others_sub_main: {
            amharic: "ሌሎች",
            details: ["ሌሎች እቃዎች እና አገልግሎቶች", "ሌሎች"] // ✅ የተጨመረ: ሌሎች
        }
    }
};

// የንዑስ ምድቦችን መሙላት
function populateSubCategories() {
    // ንዑስ ምድብ ምርጫውን ባዶ ማድረግ
    subCategorySelect.innerHTML = '<option value="">ንዑስ ምድብ ይምረጡ</option>';
    // ዝርዝር እቃ ምርጫውን ባዶ ማድረግ
    detailItemSelect.innerHTML = '<option value="">መጀመሪያ ንዑስ ምድብ ይምረጡ</option>';
    detailItemSelect.disabled = true;

    const selectedCategoryKey = mainCategorySelect.value;
    
    if (selectedCategoryKey && categories[selectedCategoryKey]) {
        const subCategories = categories[selectedCategoryKey];

        // ንዑስ ምድቦችን መጨመር
        for (const subKey in subCategories) {
            const option = document.createElement('option');
            option.value = subKey; // ቁልፉን ማስቀመጥ (e.g., 'bajaj')
            option.textContent = subCategories[subKey].amharic; // የአማርኛ ስሙን ማሳየት
            subCategorySelect.appendChild(option);
        }
        
        subCategorySelect.disabled = false;
        
    } else {
        subCategorySelect.disabled = true;
    }
    
    // የንዑስ ምድብ ምርጫ ሲቀየር ዝርዝር እቃው ይሞላል
    populateDetailItems(); 
    // ዋና ምድብ ሲቀየር ዋጋው ይሰላል (ምንም እንኳን ንዑስ/ዝርዝር ባይመረጥም)
    calculateCoinCost(); 
}

// ✅ አዲስ ተግባር: ዝርዝር የእቃ አይነቶችን መሙላት
function populateDetailItems() {
    detailItemSelect.innerHTML = '<option value="">ዝርዝር እቃ ይምረጡ</option>';
    const mainCategoryKey = mainCategorySelect.value;
    const subCategoryKey = subCategorySelect.value;

    if (mainCategoryKey && subCategoryKey && categories[mainCategoryKey] && categories[mainCategoryKey][subCategoryKey]) {
        const detailItems = categories[mainCategoryKey][subCategoryKey].details;

        detailItems.forEach(item => {
            const option = document.createElement('option');
            option.value = item; // የአማርኛ ዝርዝር ስሙን እንደ Value መጠቀም
            option.textContent = item;
            detailItemSelect.appendChild(option);
        });

        detailItemSelect.disabled = false;
    } else {
        detailItemSelect.disabled = true;
    }
    
    // ዝርዝር እቃ ሲቀየር ዋጋው እንዲሰላ
    calculateCoinCost(); 
}

// የ Main Category ተቀባይ
mainCategorySelect.addEventListener('change', populateSubCategories);
// የ Sub Category ተቀባይ
subCategorySelect.addEventListener('change', populateDetailItems); // ✅ ወደ አዲሱ ተግባር ተቀይሯል
// የ Detail Item ተቀባይ
detailItemSelect.addEventListener('change', calculateCoinCost); // ✅ አዲስ ተጨምሯል

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
// 4. የኮይን ዋጋ ስሌት (Coin Cost Calculation) - ✅ ማሻሻያ: አዲሱን ምድብ ተከትሎ
// ----------------------------------------------------------------------
function calculateCoinCost() {
    const days = daysDurationSelect.value;
    const mainCategory = mainCategorySelect.value; // vehicle_and_parts, phones_and_computers, etc.
    const starRating = parseInt(starRatingInput.value) || 0; 
    let baseCost = 5; // ነባሪ ዋጋ ለ 7 ቀን (ለአብዛኞቹ)
    let starCost = 0; // የኮከብ ዋጋ
    
    // 1. የማስታወቂያው መሠረታዊ ዋጋ (Base Listing Cost) ስሌት
    
    // "ተሽከርካሪዎች እና መለዋወጫ" (Tier 1 - ከፍተኛ ዋጋ)
    if (mainCategory === 'vehicle_and_parts') {
        if (days === '7') {
            baseCost = 7;
        } else if (days === '14') {
            baseCost = 12; 
        } else if (days === '21') { 
            baseCost = 18;
        } else if (days === '30') {
            baseCost = 25;
        }
    } 
    // "ቤት፣ ቦታ እና ኪራይ" (Tier 2 - መካከለኛ ከፍተኛ ዋጋ)
    else if (mainCategory === 'property_and_rent') {
        if (days === '7') {
            baseCost = 6;
        } else if (days === '14') {
            baseCost = 10; 
        } else if (days === '21') { 
            baseCost = 15;
        } else if (days === '30') {
            baseCost = 21;
        }
    }
    // ሌሎች ሁሉም ምድቦች (Tier 3 - መደበኛ ዋጋ)
    else { 
        if (days === '7') {
            baseCost = 5;
        } else if (days === '14') {
            baseCost = 9; 
        } else if (days === '21') { 
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
// ✅ ደረጃ 1: ምስሉን ወደ Firebase Storage መጫኛ ረዳት ተግባር (ከ postNewListing ውጭ ቢሆን ይመረጣል)
async function uploadImageToFirebase(imageFile) {
    const phone = loggedInUserPhone;
    // የፋይል ስሙ ልዩ እንዲሆን (ስልክ + ሰዓት + ስም)
    const fileName = `listing_images/${phone}_${Date.now()}_${imageFile.name}`;
    const storageRef = ref(storage, fileName);

    // ምስሉን መጫን
    const snapshot = await uploadBytes(storageRef, imageFile);
    // የተጫነበትን ሊንክ (URL) ማምጣት
    return await getDownloadURL(snapshot.ref);
}

// ----------------------------------------------------------------------
// 5. አዲስ ማስታወቂያ መለጠፍ (Post New Listing) - የተስተካከለ
// ----------------------------------------------------------------------
async function postNewListing(event) {
    event.preventDefault();
    listingMessage.style.color = '#2196f3';
    listingMessage.textContent = "ማስታወቂያው እየተለጠፈ ነው... እባክዎ ይጠብቁ።";

    const coinCost = parseInt(coinCostDisplay.textContent);
    const currentBalance = parseInt(coinBalanceDisplay.textContent);
    const mainCategoryKey = mainCategorySelect.value;
    const subCategoryKey = subCategorySelect.value;
    const detailItemValue = detailItemSelect.value; 
    const itemTitle = document.getElementById('itemTitle').value;
    const itemPrice = parseFloat(document.getElementById('itemPrice').value);
    const itemDescription = document.getElementById('itemDescription').value;
    const starRating = parseInt(starRatingInput.value) || 0; 
    
    // የምድብ ስሞችን ከአማርኛ ቁልፎች ማግኘት
    const mainCategory = mainCategories[mainCategoryKey] || mainCategoryKey;
    const subCategory = (categories[mainCategoryKey] && categories[mainCategoryKey][subCategoryKey]) 
                        ? categories[mainCategoryKey][subCategoryKey].amharic 
                        : subCategoryKey;

    // ቼክ 1: የባላንስ ማረጋገጫ
    if (currentBalance < coinCost) {
        listingMessage.style.color = '#f44336';
        listingMessage.textContent = `ቂንትሮስ የ DS Coin ባላንስ የለዎትም። ${coinCost} ኮይን ያስፈልግዎታል። እባክዎ ይሙሉ።`;
        return;
    }

    // ቼክ 2: የምድቦች መመረጥ
    if (!mainCategoryKey || !subCategoryKey || !detailItemValue) {
        listingMessage.style.color = '#f44336';
        listingMessage.textContent = "እባክዎ ዋና፣ ንዑስ እና ዝርዝር ምድቦችን ይምረጡ!";
        return;
    }

    // ቼክ 3: ምስል መኖሩን
    const imageFile = itemImageInput.files[0];
    if (!imageFile) {
        listingMessage.style.color = '#f44336';
        listingMessage.textContent = "እባክዎ የእቃውን ምስል ይምረጡ!";
        return;
    }
    
    // ቼክ 4: የምስል መጠን
    if (imageFile.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
        listingMessage.style.color = '#f44336';
        listingMessage.textContent = `የምስሉ መጠን ከ ${MAX_IMAGE_SIZE_MB}MB በላይ መሆን የለበት።`;
        return;
    }

    try {
        // ✅ ሀ. ምስሉን ወደ Firebase Storage መጫን እና ሊንኩን መቀበል
        const imageUrl = await uploadImageToFirebase(imageFile);

        // ✅ ለ. ማስታወቂያውን ወደ Firestore ማስቀመጥ
        const itemData = {
            seller_id: sellerDocumentId,
            seller_name: loggedInUserName, 
            seller_phone: loggedInUserPhone,
            itemTitle: itemTitle,
            mainCategory: mainCategory,
            mainCategoryKey: mainCategoryKey,
            subCategory: subCategory,
            subCategoryKey: subCategoryKey,
            detailItem: detailItemValue,
            itemPrice: itemPrice,
            itemDescription: itemDescription,
            days_duration: parseInt(daysDurationSelect.value),
            coin_cost: coinCost,
            star_rating: starRating, 
            image_url: imageUrl, // አዲሱ የFirebase Storage ሊንክ እዚህ ገባ
            posted_at: serverTimestamp(), 
            expires_at: new Date(Date.now() + parseInt(daysDurationSelect.value) * 24 * 60 * 60 * 1000), 
            is_active: true,
            is_featured: starRating > 0 
        };

        const listingDocRef = await addDoc(collection(db, "listings"), itemData); 

        // ✅ ሐ. የሻጩን የኮይን ባላንስ መቀነስ
        const collectionsToUpdate = ["users", "HararGebeyaUsers"]; 
        let updated = false;

        for (const collectionName of collectionsToUpdate) {
            const userDocRef = doc(db, collectionName, sellerDocumentId);
            const userSnapshot = await getDoc(userDocRef); 

            if (userSnapshot.exists()) {
                 const data = userSnapshot.data();
                 const currentCoin = data.ds_coin_balance !== undefined ? parseInt(data.ds_coin_balance) : 0;
                 
                 if (currentCoin >= coinCost) {
                    const newBalance = currentCoin - coinCost;
                    await updateDoc(userDocRef, {
                        ds_coin_balance: newBalance
                    });
                    updated = true;
                    break; 
                 }
            }
        }
        
        if (!updated) {
             console.warn("ባላንስ አልተቀነሰም - ተጠቃሚው ዳታቤዝ ውስጥ አልተገኘም ወይም በቂ ባላንስ የለም።");
        }

        // ስኬታማ ከሆነ UI ማጽዳት
        listingMessage.style.color = '#4caf50';
        listingMessage.textContent = "ማስታወቂያዎ በተሳካ ሁኔታ ተለጥፏል! የኮይን ሂሳብዎ ተቀንሷል።";
        newListingForm.reset(); 
        imagePreview.style.display = 'none';
        imagePlaceholder.style.display = 'block';
        starRatingInput.value = 0; 
        setupStarRatingSelector(); 
        loadUserInfo(); 
        renderActiveListings(); 

    } catch (error) {
        console.error("Error:", error);
        listingMessage.style.color = '#f44336';
        listingMessage.textContent = "ችግር ተፈጥሯል: " + error.message;
    }
}

newListingForm.addEventListener('submit', postNewListing);

// ----------------------------------------------------------------------
// 6.1. የካርድ ድርጊቶች ተግባራት (Card Action Functions) 
// ----------------------------------------------------------------------

// ማስታወቂያውን ለመክፈል/ለማደስ የሚያስፈልገው ተግባር (Pay/Renew)
async function handleRepostListing(listingId) {
    const renewDays = 7; // ለ 7 ቀን ማደስ
    let renewCost = 5; // ነባሪ
    
    // ማስታወቂያውን መጀመሪያ ማምጣት
    try {
        const listingDocRef = doc(db, "listings", listingId);
        const listingSnapshot = await getDoc(listingDocRef);

        if (!listingSnapshot.exists()) {
            alert("ማስታወቂያው አልተገኘም።");
            return;
        }

        const listingData = listingSnapshot.data();
        
        // መሰረታዊ የማደሻ ዋጋ (ለ 7 ቀን) - ከአዲሱ የዋጋ ስሌት ጋር ይጣጣማል
        const mainCategoryKey = listingData.mainCategoryKey || mainCategorySelect.value;
        
        if (mainCategoryKey === 'vehicle_and_parts') {
            renewCost = 7;
        } else if (mainCategoryKey === 'property_and_rent') {
             renewCost = 6;
        } else {
             // ሌሎች
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
        
        // 4. የሻጩን ኮይን ባላንስ መቀነስ (በባለቤትነት ስሜት)
        const collectionsToUpdate = ["users", "HararGebeyaUsers"]; 
        let remainingCost = totalRenewCost;

        for (const collectionName of collectionsToUpdate) {
            const userDocRef = doc(db, collectionName, sellerDocumentId);
            const userSnapshot = await getDoc(userDocRef);

            if (userSnapshot.exists() && remainingCost > 0) {
                const data = userSnapshot.data();
                const currentCoin = data.ds_coin_balance !== undefined ? parseInt(data.ds_coin_balance) : 0;
                
                if (currentCoin > 0) {
                    // በዚህ ኮሌክሽን ውስጥ ያለውን ኮይን ተጠቅመው መክፈል
                    const deduction = Math.min(currentCoin, remainingCost);
                    const newBalance = currentCoin - deduction;
                    remainingCost -= deduction;
                    
                    await updateDoc(userDocRef, {
                        ds_coin_balance: newBalance
                    });
                }
            }
        }
        
        alert(`ማስታወቂያው በተሳካ ሁኔታ ታድሷል! የኮይን ሂሳብዎ ${totalRenewCost} ኮይን ተቀንሷል።`);
        
        // UI እና ዝርዝሩን ማደስ
        loadUserInfo(); 
        renderActiveListings(); 
        renderExpiredListings(); // ያበቁት ውስጥ ካለ እንዲወገድ

    } catch (error) {
        console.error("Error renewing listing or updating balance:", error);
        alert("ማስታወቂያውን ማደስ ወይም ኮይን መቀነስ አልተቻለም: " + error.message);
    }
}

// የማስታወቂያ መግለጫን ማሳየት 
function handleViewDescription(description) {
    alert(`የእቃው ዝርዝር መግለጫ:\n\n${description}`);
}

// ማስታወቂያውን ለመሰረዝ የሚያስፈልገው ተግባር (Delete)
async function handleDeleteListing(listingId) {
    if (!confirm("ይህንን ማስታወቂያ በእርግጥ መሰረዝ ይፈልጋሉ? ምስሉና መረጃው ሙሉ በሙሉ ይወገዳል!")) {
        return;
    }
    
    try {
        // 1. መጀመሪያ የማስታወቂያውን መረጃ እናመጣለን (የምስሉን ሊንክ ለማግኘት)
        const listingDocRef = doc(db, "listings", listingId); 
        const listingSnap = await getDoc(listingDocRef);

        if (listingSnap.exists()) {
            const data = listingSnap.data();
            const imageUrl = data.image_url;

            // 2. ምስሉ በ Storage ውስጥ ካለ እናጠፋዋለን
            if (imageUrl) {
                try {
                    const imageRef = ref(storage, imageUrl);
                    await deleteObject(imageRef);
                    console.log("ምስሉ ከ Storage ተሰርዟል");
                } catch (imgError) {
                    console.error("ምስሉን ከ Storage ሲሰርዙ ስህተት አጋጠመ (ምናልባት ቀድሞ ተሰርዞ ሊሆን ይችላል):", imgError);
                }
            }
        }

        // 3. በመጨረሻ የFirestore መረጃውን መሰረዝ
        await deleteDoc(listingDocRef); 

        alert("ማስታወቂያውና ምስሉ በተሳካ ሁኔታ ተሰርዘዋል!");
        renderActiveListings(); 
        renderExpiredListings(); 
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
                
                // የዋና ምድብ ስም ለማግኘት (ከእንግሊዝኛ ወደ አማርኛ - ከተቀየረው መረጃ)
                const displayMainCategory = listing.mainCategory;
                // ✅ አዲስ: የእቃ ዝርዝርን መጨመር
                const detailItemText = listing.detailItem ? `<p class="card-meta">ዝርዝር: ${listing.detailItem}</p>` : '';


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
                                ${detailItemText}
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
// 7. ያበቁ ማስታወቂያዎችን ማሳየት (Render Expired Listings)
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
                
                // የዋና ምድብ ስም ለማግኘት (ከተቀየረው መረጃ)
                const displayMainCategory = listing.mainCategory;
                // ✅ አዲስ: የእቃ ዝርዝርን መጨመር
                const detailItemText = listing.detailItem ? `<p class="card-meta">ዝርዝር: ${listing.detailItem}</p>` : '';


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
                                ${detailItemText}
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
// 8. የአሰሳ ተግባር (Navigation Logic) 
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
                // ለስሙዝ ሽግግር የ Fade ውጤት
                targetSection.style.opacity = '0';
                targetSection.style.display = 'block';
                setTimeout(() => {
                    targetSection.style.opacity = '1';
                }, 10); // ትንሽ መዘግየት

                if (button.id === 'viewActiveListingsBtn') {
                    renderActiveListings(); 
                } else if (button.id === 'viewExpiredListingsBtn') {
                    renderExpiredListings(); 
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

    // የመነሻ ጭነት
    document.getElementById('newListingSection').style.display = 'none';
    document.getElementById('expiredListingsSection').style.display = 'none';
    document.getElementById('activeListingsSection').style.display = 'block';
    document.getElementById('activeListingsSection').style.opacity = '1';
    document.getElementById('viewActiveListingsBtn').classList.add('active');
    newListingForm.classList.remove('active'); 
}


// ----------------------------------------------------------------------
// 9. የንቁ/ያለቁ ማስታወቂያ በተን ክሊኮችን ማስተናገድ (Handle Listing Button Clicks)
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
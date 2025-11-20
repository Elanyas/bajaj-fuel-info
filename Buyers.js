// የFirebase Config ከሌሎች ፋይሎች የተወሰደ
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
    query, 
    where, 
    getDocs,
    orderBy,
    limit, // ✅ አዲስ: ለ Pagination
    startAfter, // ✅ አዲስ: ለ Pagination
    Timestamp 
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

// ✅ Firebase አገልግሎቶችን ማስጀመር: app እና db
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// DOM Elements
const mainCategoryGrid = document.getElementById('mainCategoryGrid');
const subCategoryList = document.getElementById('subCategoryList');
const subCategoryArea = document.getElementById('subCategoryArea');
// ✅ አዲስ DOM Elements
const detailItemList = document.getElementById('detailItemList');
const detailItemArea = document.getElementById('detailItemArea');

const itemsGrid = document.getElementById('itemsGrid');
const searchInput = document.getElementById('searchInput');
const loadingMessage = document.getElementById('loadingMessage');
const noListingsFound = document.getElementById('noListingsFound');

// የአሁኑ ሁኔታ መረጃ
let currentFilter = {
    mainCategoryKey: null, // የእንግሊዝኛ ቁልፍ
    subCategoryKey: null, // የእንግሊዝኛ ቁልፍ
    detailItem: null, // የአማርኛ ስም
    searchTerm: null
};

// ✅ ለ Pagination አዲስ Variables
const LISTINGS_PER_PAGE = 10;
let lastVisible = null; // ለመጨረሻው የተጫነ ሰነድ (ለቀጣይ ገጽ)
let allListingsLoaded = false; // ሁሉም ማስታወቂያዎች ተጭነው እንደሆነ ለማወቅ
let isFetching = false; // አዲስ መረጃ እየተጫነ እንደሆነ ለመቆጣጠር

// ----------------------------------------------------------------------
// ✅ 1. የምድብ አወቃቀር ማመሳሰል (ከ seller.js የተወሰደ + 'ሌሎች' ተጨመሯል)
// ----------------------------------------------------------------------

// ዋና ዘርፎች (Main Categories) - 'ሌሎች_ዋና' የለም
const mainCategories = {
    vehicle_and_parts: "ተሽከርካሪዎች እና መለዋወጫ",
    phones_and_computers: "ስልኮች እና ኮምፒውተሮች",
    home_appliances: "የቤት እቃዎች",
    property_and_rent: "ቤት፣ ቦታ እና ኪራይ",
    books_and_education: "መፅሀፍት እና የትምህርት መርጃ",
    fashion_and_apparel: "ፋሽን እና አልባሳት",
    construction_and_repair: "የግንባታ እና የጥገና እቃዎች",
    services: "አገልግሎቶች"
    // 'others_main' የሚለውን አልጨምርም, ምክንያቱም ገዢዎች ማጣሪያ የሚያደርጉት ከተዘረዘሩት ምድቦች ብቻ ነው
};

// ንዑስ ዘርፎች (Sub-Categories) እና የእቃ አይነቶች (Detail Items) - ✅ 'ሌሎች' አማራጮች ተጨምረዋል
const categories = {
    vehicle_and_parts: {
        bajaj: {
            amharic: "ባለ 3-እግር (ባጃጅ/ቶክቶክ)",
            details: ["አዲስ ባለ 3-እግር", "ያገለገለ ባለ 3-እግር", "የባጃጅ ሞተር መለዋወጫ", "የባጃጅ አካል መለዋወጫ (Body Parts)", "ጎማዎች", "ሌሎች"] // ✅ የተጨመረ
        },
        motorcycles: {
            amharic: "ሞተር ሳይክሎች",
            details: ["አዲስ ሞተር ሳይክል", "ያገለገለ ሞተር ሳይክል", "የሞተር ሳይክል መለዋወጫ", "የሞተር መከላከያ (Helmet/Safety)", "ሌሎች"] // ✅ የተጨመረ
        },
        cars: {
            amharic: "መኪናዎች",
            details: ["ያገለገሉ መኪናዎች", "የጭነት መኪናዎች/ቫኖች", "የመኪና መለዋወጫዎች", "የመኪና ጎማ እና ባትሪ", "ሌሎች"] // ✅ የተጨመረ
        },
        others_sub: { 
            amharic: "ሌሎች",
            details: ["ሌሎች ተሽከርካሪ እና መለዋወጫ", "ሌሎች"] // ✅ የተጨመረ
        }
    },
    phones_and_computers: {
        mobile_phones: {
            amharic: "ሞባይል ስልኮች",
            details: ["ስማርት ስልክ (32GB እና በታች)", "ስማርት ስልክ (64GB)", "ስማርት ስልክ (128GB)", "ስማርት ስልክ (256GB እና በላይ)", "ባር/ቀላል ስልኮች", "ሌሎች"] // ✅ የተጨመረ
        },
        laptops_and_computers: {
            amharic: "ላፕቶፕ እና ኮምፒውተር",
            details: ["ላፕቶፕ (4GB RAM)", "ላፕቶፕ (8GB RAM)", "ላፕቶፕ (16GB RAM እና በላይ)", "ዴስክቶፕ ኮምፒውተር", "ታብሌቶች", "ሌሎች"] // ✅ የተጨመረ
        },
        accessories: {
            amharic: "አክሰሰሪዎች (Accessories)",
            details: ["ቻርጀር እና ገመድ", "ማስታወሻ ሜሞሪ/Flash Disk", "የጆሮ ማዳመጫ (Earphone/Headset)", "የስልክ እስክሪን እና ከቨር", "ሌሎች"] // ✅ የተጨመረ
        },
        others_sub: { 
            amharic: "ሌሎች",
            details: ["ሌሎች ስልኮች እና ኮምፒውተሮች", "ሌሎች"] // ✅ የተጨመረ
        }
    },
    home_appliances: {
        large_appliances: {
            amharic: "ትላልቅ መገልገያዎች",
            details: ["ፍሪጅ/ማቀዝቀዣ", "ማጠቢያ ማሽን", "ጋዝ እና ኤሌክትሪክ ምድጃ", "ቲቪ (ቴሌቪዥን)", "ሌሎች"] // ✅ የተጨመረ
        },
        kitchen_items: {
            amharic: "የኩሽና እቃዎች",
            details: ["ድስቶች እና መጥበሻዎች", "ብልቃጥ እና የብርጭቆ እቃዎች", "ማይክሮዌቭ እና ኦቨን", "የቡና እና ጁስ ማሽኖች", "ሌሎች"] // ✅ የተጨመረ
        },
        furniture: {
            amharic: "ፈርኒቸር",
            details: ["ሶፋ እና የሳሎን ወንበር", "አልጋ እና ፍራሽ", "ቁምሳጥን እና ሣጥን", "የመመገቢያ ጠረጴዛ", "ሌሎች"] // ✅ የተጨመረ
        },
        others_sub: { 
            amharic: "ሌሎች",
            details: ["ሌሎች የቤት እቃዎች", "ሌሎች"] // ✅ የተጨመረ
        }
    },
    property_and_rent: {
        rent: {
            amharic: "ኪራይ (Rent)",
            details: ["የመኖሪያ ቤት ለኪራይ", "ሱቅ እና መጋዘን ለኪራይ", "የጋራ መኖሪያ (ክፍል ለተማሪ/ለነጠላ)", "የእንግዳ ማረፊያ (Guest House)", "ሌሎች"] // ✅ የተጨመረ
        },
        sale: {
            amharic: "ሽያጭ (Sale)",
            details: ["የመኖሪያ ቤት ሽያጭ", "የንግድ ቤት/ሕንፃ ሽያጭ", "ባዶ ቦታ (መሬት) ለሽያጭ", "ሌሎች"] // ✅ የተጨመረ
        },
        others_sub: { 
            amharic: "ሌሎች",
            details: ["ሌሎች ንብረት እና ኪራይ", "ሌሎች"] // ✅ የተጨመረ
        }
    },
    books_and_education: {
        books: {
            amharic: "መፅሀፍት",
            details: ["የትምህርት ቤት መማሪያ መፅሀፍት", "ልቦለድ እና ታሪክ", "ሃይማኖታዊ መፅሀፍት", "የህፃናት መፅሀፍት", "ሌሎች"] // ✅ የተጨመረ
        },
        stationery: {
            amharic: "የጽህፈት መሳሪያ (Stationery)",
            details: ["ደብተር እና እስክሪብቶ", "ቦርሳዎች (የተማሪ/የላፕቶፕ)", "የቢሮ እቃዎች (ፋይል/ወረቀት)", "ሌሎች"] // ✅ የተጨመረ
        },
        others_sub: { 
            amharic: "ሌሎች",
            details: ["ሌሎች መፅሀፍት እና ትምህርት", "ሌሎች"] // ✅ የተጨመረ
        }
    },
    fashion_and_apparel: {
        clothes: {
            amharic: "ልብሶች",
            details: ["የወንዶች ልብስ", "የሴቶች ልብስ", "የህፃናት ልብስ", "የባህል ልብሶች", "ሌሎች"] // ✅ የተጨመረ
        },
        shoes: {
            amharic: "ጫማዎች",
            details: ["የወንዶች ጫማ", "የሴቶች ጫማ", "የስፖርት ጫማዎች", "የህፃናት ጫማ", "ሌሎች"] // ✅ የተጨመረ
        },
        personal_adornment: {
            amharic: "የግል ማስዋቢያ",
            details: ["ሰዓት እና መነፅር", "ጌጣጌጥ (ብር/ወርቅ/Imitation)", "ሽቶ እና ኮስሞቲክስ", "ሌሎች"] // ✅ የተጨመረ
        },
        others_sub: { 
            amharic: "ሌሎች",
            details: ["ሌሎች ፋሽን እና አልባሳት", "ሌሎች"] // ✅ የተጨመረ
        }
    },
    construction_and_repair: {
        building_input: {
            amharic: "የግንባታ ግብአት",
            details: ["ሲሚንቶ እና አሸዋ", "ብረት እና ቆርቆሮ", "ቀለም እና ፕላስቲክ", "የመታጠቢያ ቤት እቃዎች (Ceramics/Sinks)", "ሌሎች"] // ✅ የተጨመረ
        },
        tools: {
            amharic: "የእጅ መሳሪያዎች (Tools)",
            details: ["የኤሌክትሪክ መሳሪያዎች (Drill, etc)", "መዶሻ/መፍቻ/ጉልበት", "የቧንቧ እቃዎች", "የኤሌክትሪክ ገመድ እና ሶኬት", "ሌሎች"] // ✅ የተጨመረ
        },
        others_sub: { 
            amharic: "ሌሎች",
            details: ["ሌሎች ግንባታ እና ጥገና", "ሌሎች"] // ✅ የተጨመረ
        }
    },
    services: {
        repair_professional: {
            amharic: "የጥገና ባለሙያ",
            details: ["የኤሌክትሪክ ባለሙያ", "የቧንቧ ባለሙያ", "የዲሽ እና ቲቪ ባለሙያ", "የሞባይል/ኮምፒውተር ጥገና", "ሌሎች"] // ✅ የተጨመረ
        },
        other_services: {
            amharic: "ሌሎች አገልግሎቶች",
            details: ["የትምህርት ማስጠናቀቂያ (Tutor)", "የቤት ጽዳት እና ምግብ", "ትራንስፖርት እና እቃ ማጓጓዝ", "የህትመት እና ፎቶ ግራፊክስ", "ሌሎች"] // ✅ የተጨመረ
        },
        others_sub: { 
            amharic: "ሌሎች",
            details: ["ሌሎች አገልግሎቶች", "ሌሎች"] // ✅ የተጨመረ
        }
    }
};

// ----------------------------------------------------------------------
// 2. ምድቦችን ማሳየት (Render Categories)
// ----------------------------------------------------------------------
function renderMainCategories() {
    mainCategoryGrid.innerHTML = '';
    
    // የዋና ምድቦች ቁልፎችን መፍጠር
    Object.keys(mainCategories).forEach(catKey => {
        const categoryName = mainCategories[catKey];

        const button = document.createElement('button');
        button.className = 'category-btn';
        button.textContent = categoryName;
        button.setAttribute('data-category-key', catKey);
        button.onclick = () => selectMainCategory(catKey);
        mainCategoryGrid.appendChild(button);
    });
    
    // የመጀመሪያውን ምድብ በነባሪነት መምረጥ
    if (Object.keys(mainCategories).length > 0) {
         selectMainCategory(Object.keys(mainCategories)[0]);
    }
}

function selectMainCategory(mainCategoryKey) {
    
    // የActive class ማስተዳደር
    document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active'));
    if (mainCategoryKey) {
        const activeBtn = document.querySelector(`.category-btn[data-category-key="${mainCategoryKey}"]`);
        if (activeBtn) activeBtn.classList.add('active');
    }

    currentFilter.mainCategoryKey = mainCategoryKey;
    currentFilter.subCategoryKey = null; 
    currentFilter.detailItem = null; 
    
    renderSubCategories(mainCategoryKey);
    filterItems(true); // ✅ ማስተካከያ: አዲስ ማጣሪያ ሲሆን ገጹን ሪሴት አድርግ
}

function renderSubCategories(mainCategoryKey) {
    subCategoryList.innerHTML = ''; 
    detailItemList.innerHTML = '';
    detailItemArea.classList.add('collapsed');

    if (mainCategoryKey && categories[mainCategoryKey] && Object.keys(categories[mainCategoryKey]).length > 0) {
        const subCategories = categories[mainCategoryKey];
        let firstSubCategoryKey = null;
        
        // ንዑስ ምድቦችን መሙላት
        for (const subKey in subCategories) {
            if (!firstSubCategoryKey) firstSubCategoryKey = subKey;
            
            const subName = subCategories[subKey].amharic;
            const subBtn = document.createElement('button');
            subBtn.className = 'sub-category-btn';
            subBtn.textContent = subName;
            subBtn.setAttribute('data-subcategory-key', subKey);
            subBtn.onclick = () => selectSubCategory(subKey);
            subCategoryList.appendChild(subBtn);
        }
        
        subCategoryArea.classList.remove('collapsed');
        // የመጀመሪያውን ንዑስ ምድብ በነባሪነት መምረጥ
        if (firstSubCategoryKey) {
            selectSubCategory(firstSubCategoryKey);
        }
    } else {
        // ንዑስ ምድብ ከሌለ መዝጋት
        subCategoryArea.classList.add('collapsed');
    }
}

function selectSubCategory(subCategoryKey) {
    document.querySelectorAll('.sub-category-btn').forEach(btn => btn.classList.remove('active'));
    const activeSubBtn = document.querySelector(`.sub-category-btn[data-subcategory-key="${subCategoryKey}"]`);
    if(activeSubBtn) activeSubBtn.classList.add('active');

    currentFilter.subCategoryKey = subCategoryKey;
    currentFilter.detailItem = null;
    
    renderDetailItems(currentFilter.mainCategoryKey, subCategoryKey);
    filterItems(true); // ✅ ማስተካከያ: አዲስ ማጣሪያ ሲሆን ገጹን ሪሴት አድርግ
}

function renderDetailItems(mainCategoryKey, subCategoryKey) {
    detailItemList.innerHTML = ''; 

    if (mainCategoryKey && subCategoryKey && categories[mainCategoryKey] && categories[mainCategoryKey][subCategoryKey]) {
        const detailItems = categories[mainCategoryKey][subCategoryKey].details;
        let firstDetailItem = null;
        
        detailItems.forEach(item => {
            if (!firstDetailItem) firstDetailItem = item;
            
            const detailBtn = document.createElement('button');
            // ✅ ማስተካከያ: የ detail-item-btn ስታይል ከ sub-category-btn ጋር እንዲመሳሰል
            // በ buyers_style.css ውስጥ ያለው '.sub-categories-list .sub-category-btn' ስታይል እንዲሰራ 'sub-category-btn' የሚለውን ክላስ እንጠቀማለን።
            // 'detail-item-btn' የሚለውን ትቼዋለሁ ነገር ግን ከነባሩ ጋር እንዲመሳሰል sub-category-btn የሚለውን ክላስ እጨምራለሁ።
            detailBtn.className = 'sub-category-btn detail-item-btn'; // ✅ የስታይል ማመሳሰያ
            detailBtn.textContent = item;
            detailBtn.setAttribute('data-detail-item', item);
            detailBtn.onclick = () => selectDetailItem(item);
            detailItemList.appendChild(detailBtn);
        });

        detailItemArea.classList.remove('collapsed');
        if (firstDetailItem) {
            selectDetailItem(firstDetailItem);
        }
    } else {
        detailItemArea.classList.add('collapsed');
        currentFilter.detailItem = null;
    }
}

function selectDetailItem(detailItemName) {
    // ✅ ማስተካከያ: በ 'sub-category-btn' ክላስ ላይ ተመስርቶ Active class መስጠት
    document.querySelectorAll('.detail-item-btn').forEach(btn => btn.classList.remove('active'));
    const activeDetailBtn = document.querySelector(`.detail-item-btn[data-detail-item="${detailItemName}"]`);
    if(activeDetailBtn) activeDetailBtn.classList.add('active');

    currentFilter.detailItem = detailItemName;
    filterItems(true); // ✅ ማስተካከያ: አዲስ ማጣሪያ ሲሆን ገጹን ሪሴት አድርግ
}

// ----------------------------------------------------------------------
// 3. እቃዎችን ከፋየርቤዝ ማምጣት እና ማጣራት (Filter & Fetch)
// ----------------------------------------------------------------------

/**
 * ማስታወቂያዎችን ከ Firestore ያመጣል (በማጣሪያ እና በ Pagination).
 * @param {boolean} isNewFilter - አዲስ ማጣሪያ ከተመረጠ እውነት ነው (reset pagination).
 */
async function filterItems(isNewFilter = false) {
    if (isNewFilter) {
        itemsGrid.innerHTML = '';
        lastVisible = null;
        allListingsLoaded = false;
        noListingsFound.style.display = 'none';
    }
    
    // የፍለጋ ቃል ካለ ሪሴት አድርጎ እንዲጀምር
    currentFilter.searchTerm = searchInput.value.toLowerCase().trim();
    if (currentFilter.searchTerm) {
        if (!isNewFilter) {
            // በ pagination ውስጥ ያለን ከመሰለን ነገር ግን የፍለጋ ቃል ከተጨመረ ሪሴት እናደርጋለን
            itemsGrid.innerHTML = '';
            lastVisible = null;
            allListingsLoaded = false;
            noListingsFound.style.display = 'none';
        }
    }

    // ✅ የ Client-Side Ordering ሙሉ በሙሉ ማስወገድ (የነበረው የ sort ተግባር ተወግዷል)
    
    await fetchNextListings();
}

/**
 * ቀጣዩን የማስታወቂያ ክፍል ከ Firestore ያመጣል.
 */
async function fetchNextListings() {
    if (isFetching || allListingsLoaded) return;
    isFetching = true;
    loadingMessage.style.display = 'block';

    const mainCategoryName = mainCategories[currentFilter.mainCategoryKey];
    let subCategoryName = null;
    
    if (currentFilter.mainCategoryKey && currentFilter.subCategoryKey && categories[currentFilter.mainCategoryKey][currentFilter.subCategoryKey]) {
        subCategoryName = categories[currentFilter.mainCategoryKey][currentFilter.subCategoryKey].amharic;
    }
    
    let allListings = [];
    
    try {
        // የቅድመ ማጣሪያ Query (በዋና, ንዑስ እና ዝርዝር ምድብ)
        let baseQuery = collection(db, "listings");
        baseQuery = query(baseQuery, where("is_active", "==", true));
        baseQuery = query(baseQuery, where("expires_at", ">", new Date()));

        if (mainCategoryName) {
            baseQuery = query(baseQuery, where("mainCategory", "==", mainCategoryName));
        }
        if (subCategoryName) {
            baseQuery = query(baseQuery, where("subCategory", "==", subCategoryName));
        }
        if (currentFilter.detailItem) {
            baseQuery = query(baseQuery, where("detailItem", "==", currentFilter.detailItem));
        }

        // ✅ ውስብስብ ቅደም ተከተል ለማግኘት የተከፋፈለ Query:
        // 1. 3-Star: በኮከብ ደረጃ DESC, ከዚያም በExpires_at ASC (ሊያልቅ የተቃረበ)
        // 2. 2-Star: በኮከብ ደረጃ DESC, ከዚያም በExpires_at ASC (ሊያልቅ የተቃረበ)
        // 3. 1-Star: በኮከብ ደረጃ DESC, ከዚያም በPosted_at DESC (አዲስ)
        // 4. 0-Star: በPosted_at DESC (አዲስ)

        // ማስታወሻ: Firestore ለ StartAfter የሚያስፈልገው orderBy መጀመሪያ ላይ መሆን አለበት.
        // ውስብስብ ቅደም ተከተልን በ StartAfter ለመጠቀም አስቸጋሪ ስለሆነ፣
        // ያለፍለጋ ቃል ከሆነ ሁሉንም በ 4 ቅደም ተከተል እንጭናለን። በፍለጋ ቃል ከሆነ ሁሉንም መረጃ እናመጣለን።
        
        let queries = [];

        // ✅ ቅደም ተከተል 1: 3-ኮከብ (በExpires_at ASC)
        queries.push(query(baseQuery, 
            where("star_rating", "==", 3),
            orderBy("expires_at", "asc"),
            limit(LISTINGS_PER_PAGE) // ከሁሉም 3-star አውጣ
        ));

        // ✅ ቅደም ተከተል 2: 2-ኮከብ (በExpires_at ASC)
        queries.push(query(baseQuery, 
            where("star_rating", "==", 2),
            orderBy("expires_at", "asc"),
            limit(LISTINGS_PER_PAGE) // ከሁሉም 2-star አውጣ
        ));

        // ✅ ቅደም ተከተል 3: 1-ኮከብ (በPosted_at DESC)
        queries.push(query(baseQuery, 
            where("star_rating", "==", 1),
            orderBy("posted_at", "desc"),
            limit(LISTINGS_PER_PAGE) // ከሁሉም 1-star አውጣ
        ));
        
        // ✅ ቅደም ተከተል 4: 0-ኮከብ (በPosted_at DESC)
        // ማስታወሻ: Firestore '!=' ኦፕሬተርን ወይም NOT INን አይደግፍም, ስለዚህ '==' 0 እንጠቀማለን።
        queries.push(query(baseQuery, 
            where("star_rating", "==", 0),
            orderBy("posted_at", "desc"),
            limit(LISTINGS_PER_PAGE) // ከሁሉም 0-star አውጣ
        ));

        // የፍለጋ ቃል (Search Term) ካለ:
        if (currentFilter.searchTerm) {
            // ከላይ ባሉት 4 queries ላይ የፍለጋ ቃል ማጣሪያ ማከል አይቻልም።
            // ስለዚህ, ፍለጋ ካለ, ሁሉንም ንቁ እና የተጣሩ ማስታወቂያዎችን ያለ pagination እናመጣለን, ከዚያም በClient-Side በፍለጋ ቃል እናጣራለን.
            queries = [query(baseQuery)]; // ሁሉንም አምጣ
        }
        
        for (const q of queries) {
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach((doc) => {
                 allListings.push({...doc.data(), id: doc.id});
            });
            // በፍለጋ ቃል ጊዜ አንድ query ብቻ ስለሚኖር ከ 10 በላይ ውጤት ከመጣ መውጣት
            if (currentFilter.searchTerm && allListings.length > LISTINGS_PER_PAGE) break; 
        }

        // 1. የጽሁፍ ፍለጋ ማጣሪያ (በ Client Side) - ለፍለጋ ቃል ብቻ
        if (currentFilter.searchTerm) {
             let textFilteredList = allListings.filter(listing => {
                return listing.itemTitle.toLowerCase().includes(currentFilter.searchTerm) ||
                       listing.itemDescription.toLowerCase().includes(currentFilter.searchTerm);
            });
            
            // ✅ ለፍለጋ ቃል ጊዜ: በቅደም ተከተል (Star DESC, Posted_at DESC)
            const sortedList = textFilteredList.sort((a, b) => {
                const ratingA = a.star_rating || 0;
                const ratingB = b.star_rating || 0;
                
                if (ratingA !== ratingB) return ratingB - ratingA;
                
                const dateA = a.posted_at ? a.posted_at.toDate().getTime() : 0;
                const dateB = b.posted_at ? b.posted_at.toDate().getTime() : 0;
                return dateB - dateA;
            });
            
            allListings = sortedList;
            
            // የፍለጋ ቃል ካለ pagination አንጠቀምም (ሁሉንም እናሳያለን)
            allListingsLoaded = true;
            
        } else {
             // 2. ከብዙ Query ውጤቶችን ማዋሃድ እና ብዜቶችን ማስወገድ (በ Client Side)
            const uniqueListings = Array.from(new Set(allListings.map(l => l.id)))
                .map(id => allListings.find(l => l.id === id));
                
            // ✅ ውስብስብ የ Client-Side ቅደም ተከተል (በተከፋፈለው query ምክንያት ቅደም ተከተሉ ተጠብቋል)
            // የመጨረሻው የማሳያ ቅደም ተከተል (የተፈለገው): 3-star (Expires_at ASC), 2-star (Expires_at ASC), 1-star (Posted_at DESC), 0-star (Posted_at DESC)
            
            const finalSortedList = [];
            const listsByStar = {
                3: uniqueListings.filter(l => l.star_rating === 3).sort((a, b) => a.expires_at.toDate().getTime() - b.expires_at.toDate().getTime()),
                2: uniqueListings.filter(l => l.star_rating === 2).sort((a, b) => a.expires_at.toDate().getTime() - b.expires_at.toDate().getTime()),
                1: uniqueListings.filter(l => l.star_rating === 1).sort((a, b) => b.posted_at.toDate().getTime() - a.posted_at.toDate().getTime()),
                0: uniqueListings.filter(l => (l.star_rating || 0) === 0).sort((a, b) => b.posted_at.toDate().getTime() - a.posted_at.toDate().getTime()),
            };
            
            // በቅደም ተከተል ወደ መጨረሻው ዝርዝር መጨመር
            finalSortedList.push(...listsByStar[3], ...listsByStar[2], ...listsByStar[1], ...listsByStar[0]);
            
            allListings = finalSortedList;
            
            // 3. Pagination (ከዚህ በኋላ ያሉት)
            const currentListingsCount = itemsGrid.children.length;
            const nextListings = allListings.slice(currentListingsCount, currentListingsCount + LISTINGS_PER_PAGE);

            if (nextListings.length === 0) {
                allListingsLoaded = true;
            }
            
            allListings = nextListings;
        }

        loadingMessage.style.display = 'none';
        isFetching = false;
        
        if (itemsGrid.children.length === 0 && allListings.length === 0) {
            noListingsFound.style.display = 'block';
        } else {
            renderListings(allListings);
        }

    } catch (error) {
        console.error("Error fetching listings:", error);
        loadingMessage.style.display = 'none';
        isFetching = false;
        itemsGrid.innerHTML += `<p class="error-message">ማስታወቂያዎችን በመጫን ላይ ያልተጠበቀ ችግር ተፈጥሯል።</p>`;
    }
}

// ----------------------------------------------------------------------
// 4. እቃዎችን በገጹ ላይ ማሳየት (Render Listings)
// ----------------------------------------------------------------------
function renderListings(listings) {
    if (listings.length === 0 && itemsGrid.children.length === 0) {
        noListingsFound.style.display = 'block';
    }

    listings.forEach(listing => {
        const card = document.createElement('div');
        // ✅ ለችግር 2 ማስተካከያ: position:relative የሚለው style በ .item-card ላይ ተጨምሯል።
        card.className = 'item-card'; 

        const phone = listing.seller_phone || 'N/A';
        const sellerName = listing.seller_name || 'የማይገለጽ ሻጭ'; // ✅ የሻጭ ስም ያግኙ
        const description = listing.itemDescription ? listing.itemDescription.replace(/"/g, '""').replace(/'/g, "\\'") : 'መግለጫ የለውም።'; 

        // የኮከብ ምልክት ማሳያ (ከ0 እስከ 3 እንደተጠየቀው)
        const starRating = listing.star_rating || 0;
        let starsHTML = '';
        if (starRating > 0) {
            // ✅ ማሻሻያ 6: የኮከብ ባጅ (Star Badge)
            starsHTML = `<div class="star-badge">`;
            for (let i = 0; i < starRating; i++) {
                starsHTML += '<i class="fas fa-star"></i>';
            }
            starsHTML += '</div>';
        }
        
        // ✅ አዲስ: የዝርዝር እቃ መረጃ መጨመር
        const detailItemText = listing.detailItem ? ` / ${listing.detailItem}` : '';

        card.innerHTML = `
            ${starsHTML}
            <div class="item-image-container" onclick="openModal('${listing.image_url}')">
                <img src="${listing.image_url}" alt="${listing.itemTitle}" class="item-image" onerror="this.onerror=null;this.src='images/default_fallback.jpg';" />
            </div>
            <div class="item-info">
                <h3 class="item-title">${listing.itemTitle}</h3>
                <p class="item-price">ETB ${listing.itemPrice ? listing.itemPrice.toLocaleString('en-US') : 'ያልተገለጸ'}</p>
                <p class="item-meta seller-meta">ሻጭ: ${sellerName}</p> <p class="item-meta">
                    ምድብ: ${listing.mainCategory || 'አጠቃላይ'} / ${listing.subCategory || 'አጠቃላይ'} ${detailItemText}
                </p>
                <div class="contact-buttons-group">
                    <button class="contact-button desc-btn" onclick="viewDescription('${description}')">
                        <i class="fas fa-file-lines"></i> መግለጫ
                    </button>
                    <button class="contact-button call-btn" onclick="promptCall('${phone}')">
                        <i class="fas fa-phone"></i> ስልክ
                    </button>
                    <button class="contact-button telegram-btn" onclick="contactTelegram('${phone}')">
                        <i class="fab fa-telegram-plane"></i> ቴሌግራም
                    </button>
                </div>
            </div>
        `;
        itemsGrid.appendChild(card);
    });
    
    // ✅ ለ Pagination: የመጨረሻው ሰነድ
    if (listings.length > 0) {
        lastVisible = listings[listings.length - 1]; 
    }
}

// ----------------------------------------------------------------------
// 5. የተጠቃሚ በይነገጽ (UI) ተግባራት
// ----------------------------------------------------------------------
function toggleSection(sectionId) {
    const section = document.getElementById(sectionId);
    section.classList.toggle('collapsed');
}
window.toggleSection = toggleSection; 

// ✅ ማሻሻያ 2: ስልክ ቁጥርን በአለርት ማሳየት እና መደወል
function promptCall(phone) {
    if (phone && phone !== 'N/A') {
        if (confirm(`የሻጩ ስልክ ቁጥር: ${phone}\n\nአሁን መደወል ይፈልጋሉ?`)) {
            window.location.href = `tel:${phone}`;
        }
    } else {
        alert('የሻጭ ስልክ ቁጥር የለም።');
    }
}
window.promptCall = promptCall;

// ... ቀሪዎቹ ተግባራት ...
function viewDescription(description) {
    alert(`የእቃው ዝርዝር መግለጫ:\n\n${description}`);
}
window.viewDescription = viewDescription;

// ✅ ማሻሻያ 3: የቴሌግራም አገናኝን በቀጥታ መጠቀም
function contactTelegram(phone) {
    if (phone && phone !== 'N/A') {
        // የቴሌግራም አገናኝ ለመክፈት የስልክ ቁጥሩን ማጽዳት (ከ+251 ወይም 09)
        let cleanPhone = phone.replace(/\s+/g, '').replace(/^(0|251)/, '');
        if (cleanPhone.length === 9) { // 9xxxxxxxxx አይነት ከሆነ
            cleanPhone = '251' + cleanPhone; // 2519xxxxxxxxx ማድረግ
        }
        
        if (cleanPhone.length !== 12) { // 2519xxxxxxxx አይነት ከሆነ
            alert(`የስልክ ቁጥር (${phone}) ለቴሌግራም አገናኝ ተስማሚ አይደለም። እባክዎ በቴሌግራም መተግበሪያዎ ውስጥ ይፈልጉት።`);
            return;
        }

        const telegramUrl = `https://t.me/${cleanPhone}`;
        
        if (confirm(`ሻጩን በስልክ ቁጥሩ (${phone}) በቴሌግራም ማግኘት ይፈልጋሉ?\n\nቴሌግራም ይከፈት?`)) {
            window.open(telegramUrl, '_blank');
        }
    } else {
        alert('የሻጭ ስልክ ቁጥር የለም።');
    }
}
window.contactTelegram = contactTelegram;

function openModal(imageUrl) {
    const modal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    modalImage.src = imageUrl;
    // ✅ ለችግር 1 ማስተካከያ: ሞዳሉ display: flex ተብሎ ይታያል።
    modal.style.display = "flex"; 
}
window.openModal = openModal;

function closeModal() {
    // ✅ ለችግር 1 ማስተካከያ: ሞዳሉ display: none ተብሎ ይዘጋል።
    document.getElementById('imageModal').style.display = "none";
}
window.closeModal = closeModal;

// ----------------------------------------------------------------------
// 6. ገጹ ሲጫን መጀመሪያ የሚሰሩ ተግባራት
// ----------------------------------------------------------------------

// ✅ አዲስ: የ Scroll Event Listener ለ Pagination
function setupScrollListener() {
    window.addEventListener('scroll', () => {
        // ወደ ገጹ መጨረሻ መድረሱን ማረጋገጥ
        if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
            fetchNextListings();
        }
    });
}


document.addEventListener('DOMContentLoaded', () => {
    renderMainCategories();
    setupScrollListener(); // ✅ አዲስ: ስክሮል ማስተናገጃ
    
    // የፍለጋ አዝራርን ማስተናገድ (ሪሴት አድርጎ እንዲጀምር)
    document.querySelector('.search-bar button').addEventListener('click', () => filterItems(true));
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            filterItems(true);
        }
    });
});
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
            Timestamp 
        } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

        // ✅ Firebase አገልግሎቶችን ማስጀመር: app እና db
        const app = initializeApp(firebaseConfig);
        const db = getFirestore(app);

        // DOM Elements
        const mainCategoryGrid = document.getElementById('mainCategoryGrid');
        const subCategoryList = document.getElementById('subCategoryList');
        const subCategoryArea = document.getElementById('subCategoryArea');
        const itemsGrid = document.getElementById('itemsGrid');
        const searchInput = document.getElementById('searchInput');
        const loadingMessage = document.getElementById('loadingMessage');
        const noListingsFound = document.getElementById('noListingsFound');
        
        // የአሁኑ ሁኔታ መረጃ
        let currentFilter = {
            category: null,
            subcategory: null,
            searchTerm: null
        };
        
        // ✅ ማሻሻያ 4: ለ"ሌላ" ምድብ አዲስ ንኡሳን
        const categories = {
            vehicle: ["ባጃጅ", "ሞተር", "መኪና", "ሳይክል", "ሌሎች"],
            spare_part: ["ጎማ/ቲዩብ", "ምንጣፍ", "የሞተር ክፍሎች", "የኤሌትሪክ ክፍሎች", "ቦዲ ፓርትስ", "ሌሎች"],
            phone: ["አንድሮይድ", "አይፎን", "ቻርጅ", "ኤርፎን", "ሌሎች"],
            other: ["አገልግሎት (ጥገና)", "የቤት ኪራይ", "ሌላ እቃዎች"]
        };
        
        // የእንግሊዝኛውን key ወደ አማርኛ ስም የሚቀይር ካርታ
        const categoryDisplayNames = {
            vehicle: "ተሽከርካሪ",
            spare_part: "መለዋወጫ",
            phone: "ስልክ",
            other: "ሌላ"
        };


        // ----------------------------------------------------------------------
        // 1. ምድቦችን ማሳየት (Render Categories)
        // ----------------------------------------------------------------------
        function renderMainCategories() {
            mainCategoryGrid.innerHTML = '';
            
            // ✅ ማሻሻያ 1: የ"ሁሉም" አማራጭ መወገድ
            
            // የዋና ምድቦች ቁልፎችን መፍጠር
            Object.keys(categories).forEach(catKey => {
                const categoryName = categoryDisplayNames[catKey] || catKey.charAt(0).toUpperCase() + catKey.slice(1).replace('_', ' ');

                const button = document.createElement('button');
                button.className = 'category-btn';
                button.textContent = categoryName;
                button.setAttribute('data-category', catKey);
                button.onclick = () => selectMainCategory(catKey);
                mainCategoryGrid.appendChild(button);
            });
            
            // የመጀመሪያውን ምድብ በነባሪነት መምረጥ
            if (Object.keys(categories).length > 0) {
                 selectMainCategory(Object.keys(categories)[0]);
            }
        }

        function selectMainCategory(categoryKey) {
            
            subCategoryList.innerHTML = ''; 
            
            // የActive class ማስተዳደር
            document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active'));
            if (categoryKey) {
                const activeBtn = document.querySelector(`.category-btn[data-category="${categoryKey}"]`);
                if (activeBtn) activeBtn.classList.add('active');
            }

            currentFilter.category = categoryKey;
            currentFilter.subcategory = null; 

            // ✅ ማሻሻያ 5: ንዑስ ምድቦችን በትክክል መክፈትና መዝጋት
            if (categoryKey && categories[categoryKey] && categories[categoryKey].length > 0) {
                // ንዑስ ምድቦችን መሙላት
                categories[categoryKey].forEach(sub => {
                    const subBtn = document.createElement('button');
                    subBtn.className = 'sub-category-btn';
                    subBtn.textContent = sub;
                    subBtn.setAttribute('data-subcategory', sub);
                    subBtn.onclick = () => selectSubCategory(sub);
                    subCategoryList.appendChild(subBtn);
                });
                subCategoryArea.classList.remove('collapsed');
                // የመጀመሪያውን ንዑስ ምድብ በነባሪነት መምረጥ
                selectSubCategory(categories[categoryKey][0]);
            } else {
                // ንዑስ ምድብ ከሌለ መዝጋት እና ንዑስ ማጣሪያውን ማጽዳት
                subCategoryArea.classList.add('collapsed');
                currentFilter.subcategory = null;
                filterItems(); // ንዑስ ምድብ ሳይመረጥ ማጣራት
            }
        }

        function selectSubCategory(subCategoryName) {
            document.querySelectorAll('.sub-category-btn').forEach(btn => btn.classList.remove('active'));
            const activeSubBtn = document.querySelector(`.sub-category-btn[data-subcategory="${subCategoryName}"]`);
            if(activeSubBtn) activeSubBtn.classList.add('active');

            currentFilter.subcategory = subCategoryName;
            filterItems(); 
        }

        // ----------------------------------------------------------------------
        // 2. እቃዎችን ከፋየርቤዝ ማምጣት እና ማጣራት (Filter & Fetch)
        // ----------------------------------------------------------------------
        async function filterItems() {
            itemsGrid.innerHTML = ''; 
            loadingMessage.style.display = 'block';
            noListingsFound.style.display = 'none';

            currentFilter.searchTerm = searchInput.value.toLowerCase().trim();
            
            // የ Firestore Query መገንባት
            let listingsQuery = query(
                collection(db, "listings"),
                where("is_active", "==", true),
                where("expires_at", ">", new Date()),
            );
            
            // የዋና ምድብ ማጣሪያ መጨመር
            if (currentFilter.category) {
                listingsQuery = query(listingsQuery, where("mainCategory", "==", currentFilter.category));
            }
            // የንዑስ ምድብ ማጣሪያ መጨመር
            if (currentFilter.subcategory) {
                listingsQuery = query(listingsQuery, where("subCategory", "==", currentFilter.subcategory));
            }
            
            try {
                const querySnapshot = await getDocs(listingsQuery);
                let allListings = [];
                
                querySnapshot.forEach((doc) => {
                    allListings.push({...doc.data(), id: doc.id});
                });

                // የጽሁፍ ፍለጋ ማጣሪያ (በ Client Side)
                const textFilteredList = allListings.filter(listing => {
                    if (currentFilter.searchTerm) {
                        return listing.itemTitle.toLowerCase().includes(currentFilter.searchTerm) ||
                               listing.itemDescription.toLowerCase().includes(currentFilter.searchTerm);
                    }
                    return true;
                });
                
                // የማሳያ ቅደም ተከተል (Star/Priority Ordering)
                const finalFilteredList = textFilteredList.sort((a, b) => {
                    const ratingA = a.star_rating || 0;
                    const ratingB = b.star_rating || 0;
                    
                    if (ratingA !== ratingB) {
                        return ratingB - ratingA;
                    }
                    
                    const dateA = a.posted_at ? a.posted_at.toDate().getTime() : 0;
                    const dateB = b.posted_at ? b.posted_at.toDate().getTime() : 0;
                    
                    return dateB - dateA;
                });

                
                loadingMessage.style.display = 'none';
                
                if (finalFilteredList.length === 0) {
                    noListingsFound.style.display = 'block';
                } else {
                    renderListings(finalFilteredList);
                }

            } catch (error) {
                console.error("Error fetching listings:", error);
                loadingMessage.style.display = 'none';
                itemsGrid.innerHTML = `<p class="error-message">ማስታወቂያዎችን በመጫን ላይ ያልተጠበቀ ችግር ተፈጥሯል።</p>`;
            }
        }
        
        // ----------------------------------------------------------------------
        // 3. እቃዎችን በገጹ ላይ ማሳየት (Render Listings)
        // ----------------------------------------------------------------------
        function renderListings(listings) {
            itemsGrid.innerHTML = ''; 

            listings.forEach(listing => {
                const card = document.createElement('div');
                // ✅ ለችግር 2 ማስተካከያ: position:relative የሚለው style በ .item-card ላይ ተጨምሯል።
                card.className = 'item-card'; 

                const phone = listing.seller_phone || 'N/A';
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

                card.innerHTML = `
                    ${starsHTML}
                    <div class="item-image-container" onclick="openModal('${listing.image_url}')">
                        <img src="${listing.image_url}" alt="${listing.itemTitle}" class="item-image" onerror="this.onerror=null;this.src='images/default_fallback.jpg';" />
                    </div>
                    <div class="item-info">
                        <h3 class="item-title">${listing.itemTitle}</h3>
                        <p class="item-price">ETB ${listing.itemPrice ? listing.itemPrice.toLocaleString('en-US') : 'ያልተገለጸ'}</p>
                        <p class="item-meta">
                            ምድብ: ${categoryDisplayNames[listing.mainCategory] || listing.mainCategory} / ${listing.subCategory || 'አጠቃላይ'}
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
        }
        
        // ----------------------------------------------------------------------
        // 4. የተጠቃሚ በይነገጽ (UI) ተግባራት
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

        function contactTelegram(phone) {
            if (phone && phone !== 'N/A') {
                if (confirm(`ሻጩን በስልክ ቁጥሩ (${phone}) በቴሌግራም መፈለግ ይፈልጋሉ?`)) {
                    alert(`እባክዎ የቴሌግራም መተግበሪያዎን ይክፈቱ እና ስልክ ቁጥር: ${phone} በመጠቀም ሻጩን ይፈልጉ።`);
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
        // 5. ገጹ ሲጫን መጀመሪያ የሚሰሩ ተግባራት
        // ----------------------------------------------------------------------
        document.addEventListener('DOMContentLoaded', () => {
            renderMainCategories();
            // filterItems(); // በ renderMainCategories ውስጥ selectMainCategory ስለተጠራ filterItems እዛው ይደረጋል
            
            // የፍለጋ አዝራርን ማስተናገድ
            document.querySelector('.search-bar button').addEventListener('click', filterItems);
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    filterItems();
                }
            });
        });
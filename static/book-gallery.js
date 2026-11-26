// ========================================================
// IQRA DIGITAL LIBRARY / BOOK GALLERY SYSTEM
// ========================================================

// ================= BOOKS DATABASE =================
const BOOKS_DATABASE = [
  {
    title: "جاء الحق",
    category: "Aqaid",
    language: "Urdu",
    path: "Books/Aqaid/Urdu/ja_al_haq_urdu.pdf"
  },
  {
title: "بہار شریعت (جلد 1)",
    category: "Ilm-e-Fiqah",
    language: "Urdu",
    path: "Books/Ilm-e-Fiqah/Urdu/Bahar-e-shariat-jild-1.pdf"
  },
  {
title: "ھدایۃ النحو",
    category: "Ilm-e-Nahw",
    language: "Arabic",
    path: "Books/Ilm-e-Nahw/Arabic/ھدایۃ-النحو.pdf"
  },
  {
title: "ھدایة النحو (بشریٰ)",
    category: "Ilm-e-Nahw",
    language: "Arabic",
    path: "Books/Ilm-e-Nahw/Arabic/ھدایةالنحو-بشری.pdf"
  },
// Ilm-e-Mantiq
    {
      title: "مرقاۃ ",
      category: "Ilm-e-Mantiq",
      language: "Arabic",
      path: "Books/Ilm-e-Mantiq/Arabic/Mirqaat.pdf"
    },
    {
      title: "شرح تہذیب (البشریٰ)",
      category: "Ilm-e-Mantiq",
      language: "Arabic",
      path: "Books/Ilm-e-Mantiq/Arabic/Sharh-Tahzeeb-AlBushra.pdf"
    },
    {
      title: "نصاب المنطق ",
      category: "Ilm-e-Mantiq",
      language: "Urdu",
      path: "Books/Ilm-e-Mantiq/Urdu/Nisabul-Mantiq.pdf"
    },
  {
    title: "مدنی قاعدہ ",
    category: "Ilm-e-Tajweed",
    language: "Urdu",
    path: "Books/Ilm-e-Tajweed/Urdu/Madani-qaida.pdf"
  },
// --- AQAID ---
  {
    title: "شرح الفقہ الاکبر",
    category: "Aqaid",
    language: "Arabic",
    path: "Books/Aqaid/Arabic/شرح-الفقہ-الاکبر.pdf"
  },

  // --- FALSAFA ---
  {
    title: "اصلاح العقل في الفلسفة",
    category: "Falsafa",
    language: "Arabic",
    path: "Books/Falsafa/Arabic/اصلاح-العقل-في-الفلس.pdf"
  },
  {
    title: "مقاصد الفلاسفة",
    category: "Falsafa",
    language: "Arabic",
    path: "Books/Falsafa/Arabic/مقاصد-الفلاسفۃ.pdf"
  },

  // --- ILM-E-BALAGAT ---
  {
    title: "تلخيص المفتاح",
    category: "Ilm-e-Balagat",
    language: "Arabic",
    path: "Books/Ilm-e-Balagat/Arabic/تلخيص-المفتاح.pdf"
  },
  {
    title: "دروس البلاغة",
    category: "Ilm-e-Balagat",
    language: "Arabic",
    path: "Books/Ilm-e-Balagat/Arabic/دروس-البلاغة.pdf"
  },
  {
    title: "تفہیم البلاغہ شرح دروس البلاغہ",
    category: "Ilm-e-Balagat",
    language: "Urdu",
    path: "Books/Ilm-e-Balagat/Urdu/تفہیم-البلاغہ-شرح-دروس-البلاغہ.pdf"
  },

  // --- ILM-E-SARF ---
  {
    title: "مراح الارواح",
    category: "Ilm-e-Sarf",
    language: "Arabic",
    path: "Books/Ilm-e-Sarf/Arabic/مراح-الارواح.pdf"
  },
  {
    title: "جامع ابواب الصرف",
    category: "Ilm-e-Sarf",
    language: "Urdu",
    path: "Books/Ilm-e-Sarf/Urdu/جامع-ابواب-الصرف.pdf"
  },
  {
    title: "خاصیات ابواب الصرف",
    category: "Ilm-e-Sarf",
    language: "Urdu",
    path: "Books/Ilm-e-Sarf/Urdu/خاصیات-ابواب-الصرف.pdf"
  },
  {
    title: "نصاب الصرف",
    category: "Ilm-e-Sarf",
    language: "Urdu",
    path: "Books/Ilm-e-Sarf/Urdu/نصاب-الصرف.pdf"
  },

  // --- SEERAT ---
  {
    title: "سیرت مصطفیٰ (Seerat-e-Mustafa)",
    category: "Seerat",
    language: "Urdu",
    path: "Books/Seerat/Urdu/Seerat-e-mustafa.pdf"
  },
// --- ILM-E-QURAN ---
  {
    title: "معرفۃ القرآن جلد 1 (Marifatul Quran Vol 1)",
    category: "Ilm-e-Quran",
    language: "Urdu",
    path: "Books/Ilm-e-Quran/Marifatul-Quran-1.pdf"
  },
  {
    title: "معرفۃ القرآن جلد 2 (Marifatul Quran Vol 2)",
    category: "Ilm-e-Quran",
    language: "Urdu",
    path: "Books/Ilm-e-Quran/Marifatul-Quran-2.pdf"
  },
  {
    title: "معرفۃ القرآن جلد 3 (Marifatul Quran Vol 3)",
    category: "Ilm-e-Quran",
    language: "Urdu",
    path: "Books/Ilm-e-Quran/Marifatul-Quran-3.pdf"
  },
  {
    title: "معرفۃ القرآن جلد 4 (Marifatul Quran Vol 4)",
    category: "Ilm-e-Quran",
    language: "Urdu",
    path: "Books/Ilm-e-Quran/Marifatul-Quran-4.pdf"
  },
  {
    title: "معرفۃ القرآن جلد 5 (Marifatul Quran Vol 5)",
    category: "Ilm-e-Quran",
    language: "Urdu",
    path: "Books/Ilm-e-Quran/Marifatul-Quran-5.pdf"
  },
{
    title: "کنز الایمان (Kanz-ul-Iman Urdu Translation)",
    category: "Ilm-e-Quran",
    language: "Urdu",
    path: "Books/Ilm-e-Quran/Urdu-translation-kanz-ul-iman.pdf"
  },
  {
    title: "Kanz-ul-Iman (English Translation)",
    category: "Ilm-e-Quran",
    language: "English",
    path: "Books/Ilm-e-Quran/English-translation-kanz-ul-iman.pdf"
  },
  {
    title: "कन्ज़ुल ईमान (Kanz-ul-Iman Hindi Translation)",
    category: "Ilm-e-Quran",
    language: "Hindi",
    path: "Books/Ilm-e-Quran/Hindi-translation-kanz-ul-iman.pdf"
  },
  {
    title: "النبراس على شرح العقائد",
    category: "Aqaid",
    language: "Arabic",
    path: "Books/Aqaid/Arabic/النبراس-على-شرح-العقائد.pdf"
  },
  {
    title: "Bunyadi Aqaid Aur Mamolat-e-Ahlesunnat",
    category: "Aqaid",
    language: "Urdu",
    path: "Books/Aqaid/Urdu/Bunyadi-Aqaid-Aur-Mamolat-e-Ahlesunnat.pdf"
  },
  {
    title: "Hidaya Matan Part 1",
    category: "Ilm-e-Fiqah",
    language: "Arabic",
    path: "Books/Ilm-e-Fiqah/Arabic/Hidaya-Matan-Part-1.pdf"
  },
  {
    title: "Noorul Izaah (Darussirah)",
    category: "Ilm-e-Fiqah",
    language: "Arabic",
    path: "Books/Ilm-e-Fiqah/Arabic/Noorul-Izaah-Darussirah.pdf"
  },
  {
    title: "Noorul Izaah (Dawat-e-Islami)",
    category: "Ilm-e-Fiqah",
    language: "Arabic",
    path: "Books/Ilm-e-Fiqah/Arabic/Noorul-Izaah-Dawat-e-Islami.pdf"
  },
  {
    title: "Qudoori (Bairut)",
    category: "Ilm-e-Fiqah",
    language: "Arabic",
    path: "Books/Ilm-e-Fiqah/Arabic/Qudoori-Bairut.pdf"
  },
  {
    title: "Farz Uloom Sikhiye",
    category: "Ilm-e-Fiqah",
    language: "Urdu",
    path: "Books/Ilm-e-Fiqah/Urdu/Farz-uloom-sikhiye.pdf"
  },
  {
    title: "Riyaz-us-Saliheen",
    category: "Ilm-e-Hadees",
    language: "Arabic",
    path: "Books/Ilm-e-Hadees/Arabic/Riyazus-u-Saliheen.pdf"
  },
  {
    title: "Sharah Arbayeen Nawawiyyah",
    category: "Ilm-e-Hadees",
    language: "Arabic",
    path: "Books/Ilm-e-Hadees/Arabic/Sharah-Arbayeen-Nawawiyyah.pdf"
  },
  {
    title: "Nisab-ul-Nahw",
    category: "Ilm-e-Nahw",
    language: "Urdu",
    path: "Books/Ilm-e-Nahw/Urdu/Nisab-ul-Nahw.pdf"
  },
  {
    title: "Sharh-e-Miat-e-Amil",
    category: "Ilm-e-Nahw",
    language: "Arabic",
    path: "Books/Ilm-e-Nahw/Arabic/Sharh-e-Miat-e-Amil.pdf"
  },
  {
    title: "Usool-e-Shashi",
    category: "Ilme-Usool-e-Fiqh",
    language: "Arabic",
    path: "Books/Ilme-Usool-e-Fiqh/Arabic/Usool-e-Shashi.pdf"
  },
  {
    title: "Talkhees Usool-ul-Shashi",
    category: "Ilme-Usool-e-Fiqh",
    language: "Urdu",
    path: "Books/Ilme-Usool-e-Fiqh/Urdu/Talkhees-usool-ul-shashi.pdf"
  },
  {
    title: "Anwarul Haramin Part 1",
    category: "Ilm-e-Tafseer",
    language: "Arabic",
    path: "Books/Ilm-e-Tafseer/Arabic/Anwarul-Haramin-Part-1.pdf"
  },
  {
    title: "Anwarul Haramin Part 2",
    category: "Ilm-e-Tafseer",
    language: "Arabic",
    path: "Books/Ilm-e-Tafseer/Arabic/Anwarul-Haramin-Part-2.pdf"
  },
  {
    title: "Anwarul Haramin Part 3",
    category: "Ilm-e-Tafseer",
    language: "Arabic",
    path: "Books/Ilm-e-Tafseer/Arabic/Anwarul-Haramin-Part-3.pdf"
  },  
];

// ========================================================
// BOOK SEARCH STATE VARIABLE
// ========================================================
let bookSearchQuery = "";

// ========================================================
// BOOK SEARCH INPUT EVENT LISTENER
// ========================================================
const bookSearchInput = document.getElementById("bookSearchInput");
if (bookSearchInput) {
  bookSearchInput.addEventListener("input", (e) => {
    bookSearchQuery = e.target.value.trim();
    renderBooksGrid();
  });
}

// ========================================================
// RENDER BOOKS GRID (WITH DYNAMIC COUNT)
// ========================================================
function renderBooksGrid() {
  if (!galleryBooksGrid) return;

  const query = (typeof bookSearchQuery === "string") ? bookSearchQuery.toLowerCase() : "";

  const filteredBooks = BOOKS_DATABASE.filter(book => {
    const matchCat = (selectedCategory === "All" || book.category === selectedCategory);
    const matchLang = (selectedLanguage === "all" || book.language.toLowerCase() === selectedLanguage.toLowerCase());
    const matchSearch = !query || 
                        (book.title && book.title.toLowerCase().includes(query)) || 
                        (book.category && book.category.toLowerCase().includes(query));

    return matchCat && matchLang && matchSearch;
  });

  // Dynamic Count Update
  const bookCountText = document.getElementById("bookCountText");
  if (bookCountText) {
    bookCountText.textContent = `${filteredBooks.length} ${filteredBooks.length === 1 ? 'Book' : 'Books'}`;
  }

  if (filteredBooks.length === 0) {
    galleryBooksGrid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; color: #94a3b8; padding: 40px; font-size: 14px;">
        اس زمرے، زبان یا تلاش کے مطابق فی الحال کوئی کتاب موجود نہیں ہے۔
      </div>`;
    return;
  }

  galleryBooksGrid.innerHTML = filteredBooks.map(book => `
    <div class="book-card" data-path="${encodeURI(book.path)}" title="${book.title}">
      <div class="book-card-icon">📖</div>
      <div class="book-card-title">${book.title}</div>
      <div class="book-card-meta">${book.category} • ${book.language}</div>
    </div>
  `).join("");

  // Book Card Click Event
  galleryBooksGrid.querySelectorAll(".book-card").forEach(card => {
    card.addEventListener("click", () => {
      const bookPath = card.getAttribute("data-path");
      closeBookGallery();

      // Split view layout activate karein
      if (typeof setLayoutState === "function") {
        setLayoutState("split");
      }

      // App ke playlist aur PDF reader me load karein
      loadBookIntoViewer(bookPath);
    });
  });
}

// ================= VIEWER LOADER (FIXED PATH & ENCODING) =================
async function loadBookIntoViewer(rawPath) {
  try {
    // 1. Agar path me pehle se static/ hai aur URL bhi /static/ par chal raha hai toh path ko adjust karein
    let cleanPath = decodeURI(rawPath).trim().replace(/^\/+/, "");
    
    // Agar page ka URL static folder ke andar hi hai toh shuru ka 'static/' hata dein
    if (window.location.pathname.includes("/static/") && cleanPath.startsWith("static/")) {
      cleanPath = cleanPath.replace(/^static\//, "");
    }

    // 2. Filename nikal kar tab title banayein
    const fileName = cleanPath.split("/").pop();

    // 3. Purane loadDocument ya app ke original PDF open function ko call karein
    if (typeof loadDocument === "function") {
      await loadDocument(cleanPath, fileName);
    } else if (typeof openPdfFile === "function") {
      await openPdfFile(cleanPath, fileName);
    } else if (typeof handlePdfLoad === "function") {
      await handlePdfLoad(cleanPath, fileName);
    } else {
      console.warn("PDF reader loader function nahi mila. Direct fetch check ho raha hai:", cleanPath);
      window.open(cleanPath, "_blank");
    }
  } catch (error) {
    console.error("PDF Load Error:", error);
    alert("Kitab load karne mein masla aaya! File ka path check karein.");
  }
}
let selectedCategory = "All";
let selectedLanguage = "all";

// Elements Selection
const bookGalleryModal = document.getElementById("bookGalleryModal");
const galleryOverlay = document.getElementById("galleryOverlay");
const closeBookGalleryBtn = document.getElementById("closeBookGalleryBtn");
const galleryCategories = document.getElementById("galleryCategories");
const galleryLanguages = document.getElementById("galleryLanguages");
const galleryBooksGrid = document.getElementById("galleryBooksGrid");
const dockBtnBookGallery = document.getElementById("dockBtnBookGallery");

// Modal Open / Close
function openBookGallery() {
  if (!bookGalleryModal) return;
  bookGalleryModal.classList.remove("hidden");
  renderCategoryTabs();
  renderBooksGrid();
}

function closeBookGallery() {
  if (!bookGalleryModal) return;
  bookGalleryModal.classList.add("hidden");
}

if (dockBtnBookGallery) {
  dockBtnBookGallery.addEventListener("click", openBookGallery);
}
if (galleryOverlay) {
  galleryOverlay.addEventListener("click", closeBookGallery);
}
if (closeBookGalleryBtn) {
  closeBookGalleryBtn.addEventListener("click", closeBookGallery);
}

// Category Tabs Render
function renderCategoryTabs() {
  if (!galleryCategories) return;
  const categories = ["All", ...new Set(BOOKS_DATABASE.map(b => b.category))];

  galleryCategories.innerHTML = categories.map(cat => `
    <button type="button" class="category-tab ${cat === selectedCategory ? 'active' : ''}" data-cat="${cat}">
      ${cat}
    </button>
  `).join("");

  galleryCategories.querySelectorAll(".category-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      selectedCategory = tab.dataset.cat;
      renderCategoryTabs();
      renderBooksGrid();
    });
  });
}

// Language Filter Events
if (galleryLanguages) {
  galleryLanguages.querySelectorAll(".lang-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      galleryLanguages.querySelectorAll(".lang-tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      selectedLanguage = tab.dataset.lang;
      renderBooksGrid();
    });
  });
}

// Books Grid Render & PDF Loading Trigger (With Live Search & Dynamic Count)
function renderBooksGrid() {
  const gridContainer = document.getElementById("galleryBooksGrid");
  if (!gridContainer) return;

  const query = (typeof bookSearchQuery === "string") ? bookSearchQuery.toLowerCase() : "";

  const filteredBooks = (typeof BOOKS_DATABASE !== "undefined" ? BOOKS_DATABASE : []).filter(book => {
    const matchCat = (typeof selectedCategory === "undefined" || selectedCategory === "All" || selectedCategory === "all" || book.category === selectedCategory);
    const matchLang = (typeof selectedLanguage === "undefined" || selectedLanguage === "All" || selectedLanguage === "all" || (book.language && book.language.toLowerCase() === selectedLanguage.toLowerCase()));
    const matchSearch = !query || 
                        (book.title && book.title.toLowerCase().includes(query)) || 
                        (book.category && book.category.toLowerCase().includes(query));

    return matchCat && matchLang && matchSearch;
  });

  // Dynamic Count Update
  const bookCountText = document.getElementById("bookCountText");
  if (bookCountText) {
    bookCountText.textContent = `${filteredBooks.length} ${filteredBooks.length === 1 ? 'Book' : 'Books'}`;
  }

  if (filteredBooks.length === 0) {
    gridContainer.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; color: #94a3b8; padding: 40px; font-size: 14px;">
        اس زمرے، زبان یا تلاش کے مطابق فی الحال کوئی کتاب موجود نہیں ہے۔
      </div>`;
    return;
  }

  gridContainer.innerHTML = filteredBooks.map(book => `
    <div class="book-card" data-path="${encodeURI(book.path)}" title="${book.title}">
      <div class="book-card-icon">📖</div>
      <div class="book-card-title">${book.title}</div>
      <div class="book-card-meta">${book.category} • ${book.language}</div>
    </div>
  `).join("");

  // Book Card Click Event
  gridContainer.querySelectorAll(".book-card").forEach(card => {
    card.addEventListener("click", () => {
      const bookPath = card.getAttribute("data-path");
      if (typeof closeBookGallery === "function") {
        closeBookGallery();
      }

      if (typeof setLayoutState === "function") {
        setLayoutState("split");
      }

      if (typeof loadBookIntoViewer === "function") {
        loadBookIntoViewer(bookPath);
      }
    });
  });
}
// System PDF Viewer Bridge (Fetch file and pass to existing Playlist)
async function loadBookIntoViewer(pdfPath) {
  try {
    // 1. Server se PDF file fetch karein
    let response = await fetch(pdfPath);
    if (!response.ok) {
      // Fallback agar static prefix ki zaroorat ho
      response = await fetch("static/" + pdfPath.replace(/^\/+/, ''));
    }

    if (!response.ok) {
      throw new Error(`File load nahi ho saki, Status: ${response.status}`);
    }

    // 2. Blob ko asali File object mein convert karein
    const blob = await response.blob();
    const rawFileName = pdfPath.split("/").pop();
    const cleanFileName = decodeURIComponent(rawFileName);
    const fileObj = new File([blob], cleanFileName, { type: "application/pdf" });

    // 3. Aapke system ke addFilesToPlaylist function ko call karein
    if (typeof addFilesToPlaylist === "function") {
      addFilesToPlaylist([fileObj]);
    } else {
      console.error("addFilesToPlaylist function nahi mila!");
    }
  } catch (error) {
    console.error("Book loading error:", error);
    alert("Kitab load karne mein masla aaya! File ka path check karein.");
  }
}
// ==========================================================================
// ACADEMIC BOOK GALLERY MODULE (IQRA SMARTCLASS SUITE)
// ==========================================================================

// 1. ACADEMIC BOOKS DATABASE (Aapke Folders aur Exact Paths ke mutabiq)
// ==========================================================================
// ACADEMIC BOOKS COMPLETE DATABASE (All 9 Subjects Mapped Exactly)
// ==========================================================================
const ACADEMIC_BOOKS_DATABASE = [
  // ----------------- 1. ENGLISH -----------------
  { title: "English (Class 5)", category: "English", language: "English", path: "AcademicBooks/English/English-Class-5.pdf" },
  { title: "English (Class 6)", category: "English", language: "English", path: "AcademicBooks/English/English-Class-6.pdf" },
  { title: "English (Class 7)", category: "English", language: "English", path: "AcademicBooks/English/English-Class-7.pdf" },
  { title: "English (Class 8)", category: "English", language: "English", path: "AcademicBooks/English/English-Class-8.pdf" },
  { title: "English (Class 9)", category: "English", language: "English", path: "AcademicBooks/English/English-Class-9.pdf" },
  { title: "English (Class 10)", category: "English", language: "English", path: "AcademicBooks/English/English-Class-10.pdf" },

  // ------------- 2. GENERAL SCIENCE -------------
  { title: "General Science (Class 6)", category: "General-Science", language: "English", path: "AcademicBooks/General-Science/General-Science-Class-6.pdf" },
  { title: "General Science (Class 7)", category: "General-Science", language: "English", path: "AcademicBooks/General-Science/General-Science-Class-7.pdf" },
  { title: "General Science (Class 8)", category: "General-Science", language: "English", path: "AcademicBooks/General-Science/General-Science-Class-8.pdf" },

  // ---------------- 3. GEOGRAPHY ----------------
  { title: "Geography (Class 6)", category: "Geography", language: "English", path: "AcademicBooks/Geography/Geography-Class-6.pdf" },
  { title: "Geography (Class 7)", category: "Geography", language: "English", path: "AcademicBooks/Geography/Geography-Class-7.pdf" },
  { title: "Geography (Class 8)", category: "Geography", language: "English", path: "AcademicBooks/Geography/Geography-Class-8.pdf" },
  { title: "Geography (Class 9)", category: "Geography", language: "English", path: "AcademicBooks/Geography/Geography-Class-9.pdf" },
  { title: "Geography (Class 10)", category: "Geography", language: "English", path: "AcademicBooks/Geography/Geography-Class-10.pdf" },

  // ------------------ 4. HINDI ------------------
  { title: "Hindi (Class 5)", category: "Hindi", language: "Hindi", path: "AcademicBooks/Hindi/Hindi-Class-5.pdf" },
  { title: "Hindi (Class 6)", category: "Hindi", language: "Hindi", path: "AcademicBooks/Hindi/Hindi-Class-6.pdf" },
  { title: "Hindi (Class 7)", category: "Hindi", language: "Hindi", path: "AcademicBooks/Hindi/Hindi-Class-7.pdf" },
  { title: "Hindi (Class 8)", category: "Hindi", language: "Hindi", path: "AcademicBooks/Hindi/Hindi-Class-8.pdf" },
  { title: "Hindi (Class 9)", category: "Hindi", language: "Hindi", path: "AcademicBooks/Hindi/Hindi-Class-9.pdf" },
  { title: "Hindi (Class 10)", category: "Hindi", language: "Hindi", path: "AcademicBooks/Hindi/Hindi-Class-10.pdf" },

  // ----------------- 5. MARATHI -----------------
  { title: "Marathi (Class 5)", category: "Marathi", language: "Marathi", path: "AcademicBooks/Marathi/Marathi-Class-5.pdf" },
  { title: "Marathi (Class 6)", category: "Marathi", language: "Marathi", path: "AcademicBooks/Marathi/Marathi-Class-6.pdf" },
  { title: "Marathi (Class 7)", category: "Marathi", language: "Marathi", path: "AcademicBooks/Marathi/Marathi-Class-7.pdf" },
  { title: "Marathi (Class 8)", category: "Marathi", language: "Marathi", path: "AcademicBooks/Marathi/Marathi-Class-8.pdf" },
  { title: "Marathi (Class 9)", category: "Marathi", language: "Marathi", path: "AcademicBooks/Marathi/Marathi-Class-9.pdf" },
  { title: "Marathi (Class 10)", category: "Marathi", language: "Marathi", path: "AcademicBooks/Marathi/Marathi-Class-10.pdf" },

  // --------------- 6. MATHEMATICS ---------------
  { title: "Mathematics (Class 5)", category: "Mathematics", language: "English", path: "AcademicBooks/Mathematics/Mathematics-Class-5.pdf" },
  { title: "Mathematics (Class 6)", category: "Mathematics", language: "English", path: "AcademicBooks/Mathematics/Mathematics-Class-6.pdf" },
  { title: "Mathematics (Class 7)", category: "Mathematics", language: "English", path: "AcademicBooks/Mathematics/Mathematics-Class-7.pdf" },
  { title: "Mathematics (Class 8)", category: "Mathematics", language: "English", path: "AcademicBooks/Mathematics/Mathematics-Class-8.pdf" },
  { title: "Mathematics I (Class 9)", category: "Mathematics", language: "English", path: "AcademicBooks/Mathematics/Mathematics-I-Class-9.pdf" },
  { title: "Mathematics II (Class 9)", category: "Mathematics", language: "English", path: "AcademicBooks/Mathematics/Mathematics-II-Class-9.pdf" },
  { title: "Mathematics I (Class 10)", category: "Mathematics", language: "English", path: "AcademicBooks/Mathematics/Mathemetics-I-Class-10.pdf" },
  { title: "Mathematics II (Class 10)", category: "Mathematics", language: "English", path: "AcademicBooks/Mathematics/Mathemetics-II-Class-10.pdf" },

  // ---------- 7. SCIENCE AND TECHNOLOGY ----------
  { title: "Science & Technology (Class 9)", category: "Science-And-Technology", language: "English", path: "AcademicBooks/Science-And-Technology/Science-And-Technology-Class-9.pdf" },
  { title: "Science & Technology Part I (Class 10)", category: "Science-And-Technology", language: "English", path: "AcademicBooks/Science-And-Technology/Science-And-Technology-I-Class-10.pdf" },
  { title: "Science & Technology Part II (Class 10)", category: "Science-And-Technology", language: "English", path: "AcademicBooks/Science-And-Technology/Science-And-Technology-II-Class-10.pdf" },

  // -------------- 8. SOCIAL STUDIES --------------
  { title: "Defence Studies (Class 9)", category: "Social-Studies", language: "English", path: "AcademicBooks/Social-Studies/Defence-Studies-Class-9.pdf" },
  { title: "Defence Studies (Class 10)", category: "Social-Studies", language: "English", path: "AcademicBooks/Social-Studies/Defence-Studies-Class-10.pdf" },
  { title: "History & Civics (Class 6)", category: "Social-Studies", language: "English", path: "AcademicBooks/Social-Studies/History-And-Civics-Class-6.pdf" },
  { title: "History & Civics (Class 7)", category: "Social-Studies", language: "English", path: "AcademicBooks/Social-Studies/History-And-Civics-Class-7.pdf" },
  { title: "History & Civics (Class 8)", category: "Social-Studies", language: "English", path: "AcademicBooks/Social-Studies/History-And-Civics-Class-8.pdf" },
  { title: "History & Political Science (Class 9)", category: "Social-Studies", language: "English", path: "AcademicBooks/Social-Studies/History-And-Political-Science-Class-9.pdf" },
  { title: "History & Political Science (Class 10)", category: "Social-Studies", language: "English", path: "AcademicBooks/Social-Studies/History-And-Political-Science-Class-10.pdf" },
  { title: "Self Development (Class 10)", category: "Social-Studies", language: "English", path: "AcademicBooks/Social-Studies/Self-Development-Class-10.pdf" },
  { title: "Water Security (Class 9)", category: "Social-Studies", language: "English", path: "AcademicBooks/Social-Studies/Water-Security-Class-9.pdf" },
  { title: "Water Security (Class 10)", category: "Social-Studies", language: "English", path: "AcademicBooks/Social-Studies/Water-Security-Class-10.pdf" },

  // ------------- 9. URDU LITERATURE -------------
  { title: "Bage Urdu (Class 9)", category: "Urdu-Literature", language: "Urdu", path: "AcademicBooks/Urdu-Literature/Bage-Urdu-Class-9.pdf" },
  { title: "Bage Urdu (Class 10)", category: "Urdu-Literature", language: "Urdu", path: "AcademicBooks/Urdu-Literature/Bage-Urdu-Class-10.pdf" },
  { title: "Taarufe Urdu (Class 9)", category: "Urdu-Literature", language: "Urdu", path: "AcademicBooks/Urdu-Literature/Taarufe-Urdu-Class-9.pdf" },
  { title: "Taarufe Urdu (Class 10)", category: "Urdu-Literature", language: "Urdu", path: "AcademicBooks/Urdu-Literature/Taarufe-Urdu-Class-10.pdf" },
  { title: "Urdu (Class 5)", category: "Urdu-Literature", language: "Urdu", path: "AcademicBooks/Urdu-Literature/Urdu-Class-5.pdf" },
  { title: "Urdu (Class 6)", category: "Urdu-Literature", language: "Urdu", path: "AcademicBooks/Urdu-Literature/Urdu-Class-6.pdf" },
  { title: "Urdu (Class 7)", category: "Urdu-Literature", language: "Urdu", path: "AcademicBooks/Urdu-Literature/Urdu-Class-7.pdf" },
  { title: "Urdu (Class 8)", category: "Urdu-Literature", language: "Urdu", path: "AcademicBooks/Urdu-Literature/Urdu-Class-8.pdf" },

// ------------- 10. URDU BASIC -------------
  { title: "Muallim-e-Urdu", category: "Urdu-Basic", language: "Urdu", path: "AcademicBooks/Urdu-Basic/Muallime-Urdu.pdf" },
];

// 2. ACADEMIC STATE VARIABLES
let academicActiveCategory = "All";
let academicActiveSearch = "";

// 3. FORCE CLOSE FUNCTION (Taaki piche PDF viewer clear dikhe)
function forceCloseGalleryModal() {
  const modal = document.getElementById("bookGalleryModal");
  if (modal) {
    modal.classList.add("hidden");
    modal.style.display = "none";
  }
}

// 4. ACADEMIC CATEGORY TABS RENDER
function renderAcademicCategoryTabs() {
  const container = document.getElementById("galleryCategories");
  if (!container) return;

  const cats = ["All", ...new Set(ACADEMIC_BOOKS_DATABASE.map(b => b.category).filter(Boolean))];

  container.innerHTML = cats.map(cat => `
    <button type="button" class="category-tab ${cat === academicActiveCategory ? 'active' : ''}" data-cat="${cat}">
      ${cat}
    </button>
  `).join("");

  container.querySelectorAll(".category-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      academicActiveCategory = tab.dataset.cat;
      renderAcademicCategoryTabs();
      renderAcademicBooksGrid();
    });
  });
}

// 5. ACADEMIC BOOKS GRID RENDER
function renderAcademicBooksGrid() {
  const gridContainer = document.getElementById("galleryBooksGrid");
  if (!gridContainer) return;

  const query = academicActiveSearch.toLowerCase();

  const filtered = ACADEMIC_BOOKS_DATABASE.filter(book => {
    const matchCat = (academicActiveCategory === "All" || book.category === academicActiveCategory);
    const matchSearch = !query || 
                        (book.title && book.title.toLowerCase().includes(query)) || 
                        (book.category && book.category.toLowerCase().includes(query));
    return matchCat && matchSearch;
  });

  // Dynamic Count Update
  const countEl = document.getElementById("bookCountText");
  if (countEl) {
    countEl.textContent = `${filtered.length} ${filtered.length === 1 ? 'Book' : 'Books'}`;
  }

  if (filtered.length === 0) {
    gridContainer.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; color: #94a3b8; padding: 40px; font-size: 14px;">
        Filhal is subject ki koi kitab maujood nahi hai.
      </div>`;
    return;
  }

  gridContainer.innerHTML = filtered.map(book => `
    <div class="book-card" data-path="${encodeURI(book.path)}" title="${book.title}">
      <div class="book-card-icon">📚</div>
      <div class="book-card-title">${book.title}</div>
      <div class="book-card-meta">${book.category} • ${book.language}</div>
    </div>
  `).join("");



// Book Click: Close Modal & Load PDF
  gridContainer.querySelectorAll(".book-card").forEach(card => {
    card.addEventListener("click", () => {
      const bookPath = card.getAttribute("data-path");

      // Modal band karein
      forceCloseGalleryModal();

      // Split view layout enable karein
      if (typeof setLayoutState === "function") {
        setLayoutState("split");
      }

      // App ke PDF bridge ko pass karein
      if (typeof loadBookIntoViewer === "function") {
        loadBookIntoViewer(bookPath);
      }
    });
  });
}

// 6. ACADEMIC GALLERY OPEN CONTROLLER
function openAcademicGallery() {
  const modal = document.getElementById("bookGalleryModal");
  if (!modal) return;

  // 1. Header ka color badal kar khubsurat Indigo Purple karein
  const headerEl = modal.querySelector(".book-gallery-header, .library-header") || modal.firstElementChild?.firstElementChild;
  if (headerEl) {
    headerEl.style.background = "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)";
  }

  // 2. Header Title Badlein
  const titleEl = modal.querySelector(".library-title, .gallery-title h3, h3");
  if (titleEl) {
    titleEl.textContent = "🎓 Academic Books Gallery";
  }

  // 3. Filters Reset
  academicActiveCategory = "All";
  academicActiveSearch = "";
  const searchInput = document.getElementById("bookSearchInput");
  if (searchInput) {
    searchInput.value = "";
    // Naya input event listener sirf Academic ke liye
    searchInput.oninput = (e) => {
      academicActiveSearch = e.target.value.trim();
      renderAcademicBooksGrid();
    };
  }

  // 4. Language bar ko Academic ke liye chupa dein
  const langBar = document.getElementById("galleryLanguages");
  if (langBar) langBar.style.display = "none";

  // 5. Modal ko screen par show karein
  modal.style.display = "flex";
  modal.classList.remove("hidden");

  // 6. Tabs aur Grid render karein
  renderAcademicCategoryTabs();
  renderAcademicBooksGrid();
}

// 7. FAIL-SAFE GLOBAL EVENT LISTENERS (Buttons, Cross Button, Overlay)
document.addEventListener("click", function(e) {
  // Academic Books Button Click
  const academicBtn = e.target.closest("#dockBtnAcademicGallery, [title='Academic Book Gallery']");
  if (academicBtn) {
    e.preventDefault();
    e.stopPropagation();
    openAcademicGallery();
    return;
  }

  // Islamic Books Button Click (Purani Islamic gallery wapas kholne aur language bar restore karne ke liye)
  const islamicBtn = e.target.closest("#dockBtnBookGallery, [title='Islamic Book Gallery']");
  if (islamicBtn) {
    const langBar = document.getElementById("galleryLanguages");
    if (langBar) langBar.style.display = "flex";
    
    const titleEl = document.querySelector("#bookGalleryModal .library-title, #bookGalleryModal h3");
    if (titleEl) titleEl.textContent = "📖 Islamic Book Gallery";

    const modal = document.getElementById("bookGalleryModal");
    if (modal) {
      modal.style.display = "flex";
      modal.classList.remove("hidden");
    }

    if (typeof openBookGallery === "function") {
      openBookGallery();
    }
    return;
  }

  // Close Button (Cross X) Click
  const closeBtn = e.target.closest("#closeBookGalleryBtn, .close-gallery-btn, #bookGalleryModal .close");
  if (closeBtn) {
    forceCloseGalleryModal();
    return;
  }

  // Backdrop / Overlay Click
  if (e.target && (e.target.id === "galleryOverlay" || e.target.id === "bookGalleryModal")) {
    forceCloseGalleryModal();
  }
});
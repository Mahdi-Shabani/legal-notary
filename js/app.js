/**
 * ==========================================
 * دستیار دفاتر اسناد رسمی - منطق اصلی
 * ==========================================
 */

// ==========================================
// متغیرهای سراسری
// ==========================================
let currentExperienceId = null;
let experiencesPage = 1;
let isLoadingMore = false;

// ==========================================
// توابع عمومی
// ==========================================

/**
 * نمایش Toast
 */
function showToast(message, type = "info") {
    const toast = document.getElementById("toast");
    const toastMessage = document.getElementById("toastMessage");

    if (!toast || !toastMessage) return;

    // حذف کلاس‌های قبلی
    toast.classList.remove("success", "error", "warning");

    // اضافه کردن کلاس جدید
    if (type === "success") toast.classList.add("success");
    else if (type === "error") toast.classList.add("error");
    else if (type === "warning") toast.classList.add("warning");

    toastMessage.textContent = message;
    toast.classList.add("show");

    // مخفی کردن بعد از ۳ ثانیه
    setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}

/**
 * درخواست API
 */
async function apiRequest(endpoint, options = {}) {
    const url = HELPERS.apiUrl(endpoint);

    const defaultOptions = {
        headers: {
            "Content-Type": "application/json"
        }
    };

    // اگر FormData بود، هدر Content-Type رو حذف کن
    if (options.body instanceof FormData) {
        delete defaultOptions.headers["Content-Type"];
    }

    const finalOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    };

    try {
        const response = await fetch(url, finalOptions);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || CONFIG.MESSAGES.ERROR.GENERAL);
        }

        return { success: true, data };
    } catch (error) {
        console.error("API Error:", error);

        if (error.name === "TypeError" && error.message === "Failed to fetch") {
            return { success: false, error: CONFIG.MESSAGES.ERROR.NETWORK };
        }

        return { success: false, error: error.message || CONFIG.MESSAGES.ERROR.GENERAL };
    }
}

/**
 * دریافت شناسه کاربر
 */
function getUserId() {
    let userId = HELPERS.getFromStorage(CONFIG.STORAGE_KEYS.USER_ID);

    if (!userId) {
        userId = HELPERS.generateId();
        HELPERS.saveToStorage(CONFIG.STORAGE_KEYS.USER_ID, userId);
    }

    return userId;
}

// ==========================================
// منوی موبایل
// ==========================================

function initMobileMenu() {
    const menuBtn = document.getElementById("menuBtn");
    const mobileMenu = document.getElementById("mobileMenu");

    if (!menuBtn || !mobileMenu) return;

    menuBtn.addEventListener("click", () => {
        mobileMenu.classList.toggle("hidden");
        mobileMenu.classList.toggle("show");
    });

    // بستن منو با کلیک بیرون
    document.addEventListener("click", (e) => {
        if (!menuBtn.contains(e.target) && !mobileMenu.contains(e.target)) {
            mobileMenu.classList.add("hidden");
            mobileMenu.classList.remove("show");
        }
    });
}

// ==========================================
// صفحه پروفایل
// ==========================================

function initProfilePage() {
    const uploadForm = document.getElementById("uploadForm");
    const dropZone = document.getElementById("dropZone");
    const fileInput = document.getElementById("fileInput");
    const fileName = document.getElementById("fileName");

    if (!uploadForm) return;

    // لود مدارک
    loadUserDocuments();

    // کلیک روی DropZone
    dropZone.addEventListener("click", () => fileInput.click());

    // Drag & Drop
    dropZone.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropZone.classList.add("dragover");
    });

    dropZone.addEventListener("dragleave", () => {
        dropZone.classList.remove("dragover");
    });

    dropZone.addEventListener("drop", (e) => {
        e.preventDefault();
        dropZone.classList.remove("dragover");

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileSelect(files[0]);
        }
    });

    // انتخاب فایل
    fileInput.addEventListener("change", (e) => {
        if (e.target.files.length > 0) {
            handleFileSelect(e.target.files[0]);
        }
    });

    // ارسال فرم
    uploadForm.addEventListener("submit", handleUploadSubmit);
}

/**
 * انتخاب فایل
 */
function handleFileSelect(file) {
    const fileName = document.getElementById("fileName");
    const fileInput = document.getElementById("fileInput");

    // بررسی حجم
    if (file.size > CONFIG.UPLOAD.MAX_SIZE) {
        showToast(CONFIG.MESSAGES.ERROR.UPLOAD_SIZE, "error");
        return;
    }

    // بررسی نوع
    if (!CONFIG.UPLOAD.ALLOWED_TYPES.includes(file.type)) {
        showToast(CONFIG.MESSAGES.ERROR.UPLOAD_TYPE, "error");
        return;
    }

    // نمایش نام فایل
    fileName.textContent = `فایل انتخاب شده: ${file.name}`;
    fileName.classList.remove("hidden");

    // ذخیره فایل
    fileInput.files = createFileList(file);
}

/**
 * ایجاد FileList
 */
function createFileList(file) {
    const dt = new DataTransfer();
    dt.items.add(file);
    return dt.files;
}

/**
 * ارسال فرم آپلود
 */
async function handleUploadSubmit(e) {
    e.preventDefault();

    const docType = document.getElementById("docType").value;
    const fileInput = document.getElementById("fileInput");
    const description = document.getElementById("docDescription").value;

    if (!docType || !fileInput.files[0]) {
        showToast(CONFIG.MESSAGES.ERROR.REQUIRED_FIELDS, "error");
        return;
    }

    const formData = new FormData();
    formData.append("file", fileInput.files[0]);
    formData.append("type", docType);
    formData.append("description", description);
    formData.append("user_id", getUserId());

    const result = await apiRequest(CONFIG.ENDPOINTS.UPLOAD, {
        method: "POST",
        body: formData
    });

    if (result.success) {
        showToast(CONFIG.MESSAGES.SUCCESS.UPLOAD, "success");
        e.target.reset();
        document.getElementById("fileName").classList.add("hidden");
        loadUserDocuments();
    } else {
        showToast(result.error, "error");
    }
}

/**
 * لود مدارک کاربر
 */
async function loadUserDocuments() {
    const listContainer = document.getElementById("documentsList");
    const loading = document.getElementById("docsLoading");
    const empty = document.getElementById("docsEmpty");
    const docCount = document.getElementById("docCount");

    if (!listContainer) return;

    loading.classList.remove("hidden");
    empty.classList.add("hidden");

    const userId = getUserId();
    const result = await apiRequest(CONFIG.ENDPOINTS.UPLOAD_USER + userId);

    loading.classList.add("hidden");

    if (result.success && result.data.length > 0) {
        const docs = result.data;
        docCount.textContent = HELPERS.toPersianNumber(docs.length);

        // حذف محتوای قبلی (غیر از loading و empty)
        const existingCards = listContainer.querySelectorAll(".document-card");
        existingCards.forEach((card) => card.remove());

        docs.forEach((doc) => {
            const card = createDocumentCard(doc);
            listContainer.appendChild(card);
        });
    } else {
        empty.classList.remove("hidden");
        docCount.textContent = "۰";
    }
}

/**
 * ایجاد کارت مدرک
 */
function createDocumentCard(doc) {
    const card = document.createElement("div");
    card.className = "document-card flex items-center justify-between p-4 bg-gray-50 rounded-lg";
    card.dataset.id = doc.id;

    const typeName = CONFIG.DOCUMENT_TYPES[doc.type] || doc.type;

    card.innerHTML = `
        <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <svg class="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
            </div>
            <div>
                <p class="font-bold text-gray-800 text-sm">${typeName}</p>
                <p class="text-gray-500 text-xs">${HELPERS.formatDate(doc.created_at)}</p>
            </div>
        </div>
        <button class="delete-btn text-red-500 hover:text-red-700 p-2" onclick="deleteDocument('${doc.id}')">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
        </button>
    `;

    return card;
}

/**
 * حذف مدرک
 */
async function deleteDocument(docId) {
    if (!confirm(CONFIG.MESSAGES.WARNING.CONFIRM_DELETE)) return;

    const result = await apiRequest(CONFIG.ENDPOINTS.UPLOAD_DELETE + docId, {
        method: "DELETE"
    });

    if (result.success) {
        showToast(CONFIG.MESSAGES.SUCCESS.DELETE, "success");
        loadUserDocuments();
    } else {
        showToast(result.error, "error");
    }
}

// ==========================================
// صفحه رزرو نوبت
// ==========================================

function initAppointmentPage() {
    const form = document.getElementById("appointmentForm");
    const citySelect = document.getElementById("citySelect");
    const notarySelect = document.getElementById("notarySelect");

    if (!form) return;

    // لود شهرها
    loadCities();

    // لود نوبت‌ها
    loadUserAppointments();

    // تغییر شهر
    citySelect.addEventListener("change", async (e) => {
        const city = e.target.value;

        if (city) {
            notarySelect.disabled = false;
            await loadNotariesByCity(city);
        } else {
            notarySelect.disabled = true;
            notarySelect.innerHTML = '<option value="">ابتدا شهر را انتخاب کنید...</option>';
        }
    });

    // تاریخ حداقل
    const dateInput = document.getElementById("appointmentDate");
    const today = new Date().toISOString().split("T")[0];
    dateInput.min = today;

    // ارسال فرم
    form.addEventListener("submit", handleAppointmentSubmit);
}

/**
 * لود شهرها
 */
async function loadCities() {
    const citySelect = document.getElementById("citySelect");
    if (!citySelect) return;

    const result = await apiRequest(CONFIG.ENDPOINTS.NOTARY_CITIES);

    let cities = CONFIG.DEFAULT_CITIES;
    if (result.success && result.data.length > 0) {
        cities = result.data;
    }

    cities.forEach((city) => {
        const option = document.createElement("option");
        option.value = city;
        option.textContent = city;
        citySelect.appendChild(option);
    });
}

/**
 * لود دفترخانه‌ها بر اساس شهر
 */
async function loadNotariesByCity(city) {
    const notarySelect = document.getElementById("notarySelect");

    notarySelect.innerHTML = '<option value="">در حال بارگذاری...</option>';

    const result = await apiRequest(CONFIG.ENDPOINTS.NOTARY_LIST + `?city=${encodeURIComponent(city)}`);

    notarySelect.innerHTML = '<option value="">انتخاب دفترخانه...</option>';

    if (result.success && result.data.length > 0) {
        result.data.forEach((notary) => {
            const option = document.createElement("option");
            option.value = notary.id;
            option.textContent = `دفترخانه ${HELPERS.toPersianNumber(notary.office_number)} - ${notary.name}`;
            notarySelect.appendChild(option);
        });
    } else {
        notarySelect.innerHTML = '<option value="">دفترخانه‌ای یافت نشد</option>';
    }
}

/**
 * ارسال فرم نوبت
 */
async function handleAppointmentSubmit(e) {
    e.preventDefault();

    const notaryId = document.getElementById("notarySelect").value;
    const serviceType = document.getElementById("serviceType").value;
    const date = document.getElementById("appointmentDate").value;
    const time = document.getElementById("appointmentTime").value;
    const fullName = document.getElementById("fullName").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const nationalCode = document.getElementById("nationalCode").value.trim();
    const description = document.getElementById("description").value.trim();

    // اعتبارسنجی
    if (!notaryId || !serviceType || !date || !time || !fullName || !phone || !nationalCode) {
        showToast(CONFIG.MESSAGES.ERROR.REQUIRED_FIELDS, "error");
        return;
    }

    if (!HELPERS.isValidPhone(phone)) {
        showToast(CONFIG.MESSAGES.ERROR.INVALID_PHONE, "error");
        return;
    }

    if (!HELPERS.isValidNationalCode(nationalCode)) {
        showToast(CONFIG.MESSAGES.ERROR.INVALID_NATIONAL_CODE, "error");
        return;
    }

    const data = {
        notary_id: notaryId,
        service_type: serviceType,
        date: date,
        time: time,
        full_name: fullName,
        phone: HELPERS.toEnglishNumber(phone),
        national_code: HELPERS.toEnglishNumber(nationalCode),
        description: description,
        user_id: getUserId()
    };

    const result = await apiRequest(CONFIG.ENDPOINTS.APPOINTMENTS, {
        method: "POST",
        body: JSON.stringify(data)
    });

    if (result.success) {
        showToast(CONFIG.MESSAGES.SUCCESS.APPOINTMENT, "success");
        e.target.reset();
        document.getElementById("notarySelect").disabled = true;
        document.getElementById("notarySelect").innerHTML = '<option value="">ابتدا شهر را انتخاب کنید...</option>';
        loadUserAppointments();
    } else {
        showToast(result.error, "error");
    }
}

/**
 * لود نوبت‌های کاربر
 */
async function loadUserAppointments() {
    const listContainer = document.getElementById("appointmentsList");
    const loading = document.getElementById("appointmentsLoading");
    const empty = document.getElementById("appointmentsEmpty");
    const countBadge = document.getElementById("appointmentCount");

    if (!listContainer) return;

    loading.classList.remove("hidden");
    empty.classList.add("hidden");

    const userId = getUserId();
    const result = await apiRequest(CONFIG.ENDPOINTS.APPOINTMENTS + `?user_id=${userId}`);

    loading.classList.add("hidden");

    // حذف کارت‌های قبلی
    const existingCards = listContainer.querySelectorAll(".appointment-card");
    existingCards.forEach((card) => card.remove());

    if (result.success && result.data.length > 0) {
        const appointments = result.data;

        if (countBadge) {
            const activeCount = appointments.filter((a) => a.status !== "cancelled").length;
            countBadge.textContent = HELPERS.toPersianNumber(activeCount);
        }

        appointments.forEach((appointment) => {
            const card = createAppointmentCard(appointment);
            listContainer.appendChild(card);
        });
    } else {
        empty.classList.remove("hidden");
        if (countBadge) countBadge.textContent = "۰";
    }
}

/**
 * ایجاد کارت نوبت
 */
function createAppointmentCard(appointment) {
    const card = document.createElement("div");
    const statusInfo = CONFIG.APPOINTMENT_STATUS[appointment.status] || CONFIG.APPOINTMENT_STATUS.pending;

    card.className = `appointment-card bg-gray-50 rounded-lg p-4 mb-3 ${statusInfo.class}`;
    card.dataset.id = appointment.id;

    const serviceName = CONFIG.SERVICE_TYPES[appointment.service_type] || appointment.service_type;

    card.innerHTML = `
        <div class="flex justify-between items-start mb-2">
            <p class="font-bold text-gray-800 text-sm">${serviceName}</p>
            <span class="status-badge ${statusInfo.class}">${statusInfo.label}</span>
        </div>
        <div class="text-gray-500 text-xs space-y-1">
            <p>📅 ${HELPERS.formatDate(appointment.date)} - ساعت ${HELPERS.formatTime(appointment.time)}</p>
            <p>🏢 دفترخانه ${HELPERS.toPersianNumber(appointment.notary_office_number || "")}</p>
        </div>
        ${appointment.status === "pending" ? `
            <button class="mt-3 text-red-500 text-xs hover:text-red-700" onclick="cancelAppointment('${appointment.id}')">
                لغو نوبت
            </button>
        ` : ""}
    `;

    return card;
}

/**
 * لغو نوبت
 */
async function cancelAppointment(appointmentId) {
    if (!confirm(CONFIG.MESSAGES.WARNING.CONFIRM_CANCEL)) return;

    const result = await apiRequest(CONFIG.ENDPOINTS.APPOINTMENT_DETAIL + appointmentId, {
        method: "DELETE"
    });

    if (result.success) {
        showToast(CONFIG.MESSAGES.SUCCESS.APPOINTMENT_CANCEL, "success");
        loadUserAppointments();
    } else {
        showToast(result.error, "error");
    }
}

// ==========================================
// صفحه تجربیات
// ==========================================

function initExperiencesPage() {
    const addBtn = document.getElementById("addExperienceBtn");
    const modal = document.getElementById("experienceModal");
    const closeBtn = document.getElementById("closeModalBtn");
    const form = document.getElementById("experienceForm");
    const detailModal = document.getElementById("detailModal");
    const closeDetailBtn = document.getElementById("closeDetailBtn");
    const categoryFilter = document.getElementById("categoryFilter");
    const loadMoreBtn = document.getElementById("loadMoreBtn");

    if (!modal) return;

    // لود دسته‌بندی‌ها
    loadCategories();

    // لود تجربیات
    loadExperiences();

    // باز کردن مودال
    addBtn.addEventListener("click", () => {
        modal.classList.remove("hidden");
        modal.classList.add("show");
        document.body.style.overflow = "hidden";
    });

    // بستن مودال
    closeBtn.addEventListener("click", closeExperienceModal);
    modal.addEventListener("click", (e) => {
        if (e.target === modal) closeExperienceModal();
    });

    // بستن مودال جزئیات
    closeDetailBtn.addEventListener("click", closeDetailModal);
    detailModal.addEventListener("click", (e) => {
        if (e.target === detailModal) closeDetailModal();
    });

    // فیلتر دسته‌بندی
    categoryFilter.addEventListener("change", () => {
        experiencesPage = 1;
        loadExperiences(true);
    });

    // ارسال فرم
    form.addEventListener("submit", handleExperienceSubmit);

    // بارگذاری بیشتر
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener("click", () => {
            experiencesPage++;
            loadExperiences(false);
        });
    }
}

/**
 * بستن مودال تجربه
 */
function closeExperienceModal() {
    const modal = document.getElementById("experienceModal");
    modal.classList.add("hidden");
    modal.classList.remove("show");
    document.body.style.overflow = "";
}

/**
 * بستن مودال جزئیات
 */
function closeDetailModal() {
    const modal = document.getElementById("detailModal");
    modal.classList.add("hidden");
    modal.classList.remove("show");
    document.body.style.overflow = "";
    currentExperienceId = null;
}

/**
 * لود دسته‌بندی‌ها
 */
async function loadCategories() {
    const filterSelect = document.getElementById("categoryFilter");
    const formSelect = document.getElementById("expCategory");

    const result = await apiRequest(CONFIG.ENDPOINTS.EXPERIENCES_CATEGORIES);

    let categories = CONFIG.DEFAULT_CATEGORIES;
    if (result.success && result.data.length > 0) {
        categories = result.data;
    }

    categories.forEach((cat) => {
        // فیلتر
        if (filterSelect) {
            const option1 = document.createElement("option");
            option1.value = cat.id;
            option1.textContent = cat.name;
            filterSelect.appendChild(option1);
        }

        // فرم
        if (formSelect) {
            const option2 = document.createElement("option");
            option2.value = cat.id;
            option2.textContent = cat.name;
            formSelect.appendChild(option2);
        }
    });
}

/**
 * لود تجربیات
 */
async function loadExperiences(reset = true) {
    const grid = document.getElementById("experiencesGrid");
    const loading = document.getElementById("experiencesLoading");
    const empty = document.getElementById("experiencesEmpty");
    const loadMoreContainer = document.getElementById("loadMoreContainer");

    if (!grid) return;

    if (reset) {
        loading.classList.remove("hidden");
        empty.classList.add("hidden");

        // حذف کارت‌های قبلی
        const existingCards = grid.querySelectorAll(".experience-card");
        existingCards.forEach((card) => card.remove());
    }

    isLoadingMore = true;

    const categoryFilter = document.getElementById("categoryFilter");
    const category = categoryFilter ? categoryFilter.value : "";

    let url = CONFIG.ENDPOINTS.EXPERIENCES + `?page=${experiencesPage}`;
    if (category) url += `&category=${category}`;

    const result = await apiRequest(url);

    loading.classList.add("hidden");
    isLoadingMore = false;

    if (result.success && result.data.length > 0) {
        result.data.forEach((exp) => {
            const card = createExperienceCard(exp);
            grid.appendChild(card);
        });

        // نمایش دکمه بارگذاری بیشتر
        if (result.data.length >= 9 && loadMoreContainer) {
            loadMoreContainer.classList.remove("hidden");
        } else if (loadMoreContainer) {
            loadMoreContainer.classList.add("hidden");
        }
    } else if (reset) {
        empty.classList.remove("hidden");
    }
}

/**
 * ایجاد کارت تجربه
 */
function createExperienceCard(exp) {
    const card = document.createElement("div");
    card.className = "experience-card bg-white rounded-xl shadow-sm p-5 cursor-pointer fade-in";
    card.dataset.id = exp.id;

    const categoryName = exp.category_name || "عمومی";
    const excerpt = exp.content.length > 120 ? exp.content.substring(0, 120) + "..." : exp.content;

    card.innerHTML = `
        <span class="inline-block bg-blue-100 text-primary text-xs px-3 py-1 rounded-full mb-3">${categoryName}</span>
        <h4 class="font-bold text-gray-800 mb-2">${exp.title}</h4>
        <p class="text-gray-600 text-sm leading-relaxed mb-4">${excerpt}</p>
        <div class="flex items-center justify-between text-gray-400 text-xs">
            <span>${exp.author || "ناشناس"}</span>
            <div class="flex items-center gap-3">
                <span class="flex items-center gap-1">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                    </svg>
                    ${HELPERS.toPersianNumber(exp.likes || 0)}
                </span>
                <span>${HELPERS.formatDate(exp.created_at)}</span>
            </div>
        </div>
    `;

    card.addEventListener("click", () => openExperienceDetail(exp));

    return card;
}

/**
 * نمایش جزئیات تجربه
 */
function openExperienceDetail(exp) {
    const modal = document.getElementById("detailModal");
    const title = document.getElementById("detailTitle");
    const category = document.getElementById("detailCategory");
    const date = document.getElementById("detailDate");
    const content = document.getElementById("detailContent");
    const author = document.getElementById("detailAuthor");
    const likes = document.getElementById("detailLikes");
    const likeBtn = document.getElementById("detailLikeBtn");

    currentExperienceId = exp.id;

    title.textContent = exp.title;
    category.textContent = exp.category_name || "عمومی";
    date.textContent = HELPERS.formatDate(exp.created_at);
    content.textContent = exp.content;
    author.textContent = exp.author || "ناشناس";
    likes.textContent = HELPERS.toPersianNumber(exp.likes || 0);

    // لایک
    likeBtn.onclick = () => likeExperience(exp.id);

    modal.classList.remove("hidden");
    modal.classList.add("show");
    document.body.style.overflow = "hidden";
}

/**
 * لایک تجربه
 */
async function likeExperience(expId) {
    const result = await apiRequest(CONFIG.ENDPOINTS.EXPERIENCE_LIKE + expId + "/like", {
        method: "POST"
    });

    if (result.success) {
        const likesSpan = document.getElementById("detailLikes");
        const likeBtn = document.getElementById("detailLikeBtn");

        likesSpan.textContent = HELPERS.toPersianNumber(result.data.likes);
        likeBtn.classList.add("liked");

        showToast(CONFIG.MESSAGES.SUCCESS.LIKE, "success");
    } else {
        showToast(result.error, "error");
    }
}

/**
 * ارسال تجربه جدید
 */
async function handleExperienceSubmit(e) {
    e.preventDefault();

    const title = document.getElementById("expTitle").value.trim();
    const category = document.getElementById("expCategory").value;
    const content = document.getElementById("expContent").value.trim();
    const author = document.getElementById("expAuthor").value.trim();

    if (!title || !category || !content) {
        showToast(CONFIG.MESSAGES.ERROR.REQUIRED_FIELDS, "error");
        return;
    }

    const data = {
        title,
        category_id: category,
        content,
        author: author || "ناشناس",
        user_id: getUserId()
    };

    const result = await apiRequest(CONFIG.ENDPOINTS.EXPERIENCES, {
        method: "POST",
        body: JSON.stringify(data)
    });

    if (result.success) {
        showToast(CONFIG.MESSAGES.SUCCESS.EXPERIENCE, "success");
        e.target.reset();
        closeExperienceModal();
        experiencesPage = 1;
        loadExperiences(true);
    } else {
        showToast(result.error, "error");
    }
}

// ==========================================
// صفحه چت
// ==========================================

function initChatPage() {
    const form = document.getElementById("chatForm");
    const input = document.getElementById("chatInput");
    const messagesContainer = document.getElementById("chatMessages");
    const suggestions = document.querySelectorAll(".suggestion-btn");

    if (!form) return;

    // بررسی وضعیت AI
    checkChatHealth();

    // لود پیشنهادات از API
    loadChatSuggestions();

    // کلیک روی پیشنهادات
    suggestions.forEach((btn) => {
        btn.addEventListener("click", () => {
            input.value = btn.textContent;
            form.dispatchEvent(new Event("submit"));
        });
    });

    // ارسال پیام
    form.addEventListener("submit", handleChatSubmit);

    // اسکرول به پایین
    scrollToBottom();
}

/**
 * بررسی وضعیت AI
 */
async function checkChatHealth() {
    const statusDot = document.getElementById("statusDot");
    const statusText = document.getElementById("statusText");

    const result = await apiRequest(CONFIG.ENDPOINTS.CHAT_HEALTH);

    if (result.success) {
        statusDot.classList.remove("bg-red-500");
        statusDot.classList.add("bg-green-500");
        statusText.textContent = "آنلاین";
    } else {
        statusDot.classList.remove("bg-green-500");
        statusDot.classList.add("bg-red-500");
        statusText.textContent = "آفلاین";
    }
}

/**
 * لود پیشنهادات چت
 */
async function loadChatSuggestions() {
    const container = document.getElementById("suggestions");
    if (!container) return;

    const result = await apiRequest(CONFIG.ENDPOINTS.CHAT_SUGGESTIONS);

    if (result.success && result.data.length > 0) {
        container.innerHTML = "";
        result.data.forEach((suggestion) => {
            const btn = document.createElement("button");
            btn.className = "suggestion-btn bg-gray-100 text-gray-700 text-sm px-3 py-1.5 rounded-full hover:bg-primary hover:text-white transition";
            btn.textContent = suggestion;
            btn.addEventListener("click", () => {
                document.getElementById("chatInput").value = suggestion;
                document.getElementById("chatForm").dispatchEvent(new Event("submit"));
            });
            container.appendChild(btn);
        });
    }
}

/**
 * ارسال پیام چت
 */
async function handleChatSubmit(e) {
    e.preventDefault();

    const input = document.getElementById("chatInput");
    const sendBtn = document.getElementById("sendBtn");
    const suggestionsContainer = document.getElementById("suggestionsContainer");
    const message = input.value.trim();

    if (!message) return;

    // غیرفعال کردن ورودی
    input.disabled = true;
    sendBtn.disabled = true;

    // مخفی کردن پیشنهادات
    suggestionsContainer.classList.add("hidden");

    // اضافه کردن پیام کاربر
    addChatMessage(message, "user");
    input.value = "";

    // نمایش typing indicator
    showTypingIndicator();

    // ارسال به API
    const result = await apiRequest(CONFIG.ENDPOINTS.CHAT, {
        method: "POST",
        body: JSON.stringify({
            message,
            user_id: getUserId()
        })
    });

    // حذف typing indicator
    hideTypingIndicator();

    // فعال کردن ورودی
    input.disabled = false;
    sendBtn.disabled = false;
    input.focus();

    if (result.success) {
        addChatMessage(result.data.response, "bot");
    } else {
        addChatMessage(CONFIG.MESSAGES.ERROR.CHAT_OFFLINE, "bot");
    }
}

/**
 * اضافه کردن پیام به چت
 */
function addChatMessage(message, type) {
    const container = document.getElementById("chatMessages");

    const wrapper = document.createElement("div");
    wrapper.className = `flex gap-3 chat-message ${type}`;

    if (type === "user") {
        wrapper.innerHTML = `
            <div class="bg-primary text-white rounded-2xl rounded-tl-sm px-4 py-3 max-w-[80%] mr-auto">
                <p>${escapeHtml(message)}</p>
            </div>
            <div class="w-8 h-8 bg-gray-300 rounded-full flex-shrink-0 flex items-center justify-center">
                <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                </svg>
            </div>
        `;
    } else {
        wrapper.innerHTML = `
            <div class="w-8 h-8 bg-primary rounded-full flex-shrink-0 flex items-center justify-center">
                <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                </svg>
            </div>
            <div class="bg-gray-100 rounded-2xl rounded-tr-sm px-4 py-3 max-w-[80%]">
                <p class="text-gray-700">${escapeHtml(message)}</p>
            </div>
        `;
    }

    container.appendChild(wrapper);
    scrollToBottom();
}

/**
 * نمایش Typing Indicator
 */
function showTypingIndicator() {
    const container = document.getElementById("chatMessages");

    const wrapper = document.createElement("div");
    wrapper.className = "flex gap-3";
    wrapper.id = "typingIndicator";

    wrapper.innerHTML = `
        <div class="w-8 h-8 bg-primary rounded-full flex-shrink-0 flex items-center justify-center">
            <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
            </svg>
        </div>
        <div class="bg-gray-100 rounded-2xl rounded-tr-sm typing-indicator">
            <span></span>
            <span></span>
            <span></span>
        </div>
    `;

    container.appendChild(wrapper);
    scrollToBottom();
}

/**
 * مخفی کردن Typing Indicator
 */
function hideTypingIndicator() {
    const indicator = document.getElementById("typingIndicator");
    if (indicator) indicator.remove();
}

/**
 * اسکرول به پایین
 */
function scrollToBottom() {
    const container = document.getElementById("chatMessages");
    if (container) {
        container.scrollTop = container.scrollHeight;
    }
}

/**
 * Escape HTML
 */
function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

// ==========================================
// صفحه ثبت‌نام سردفتر
// ==========================================

function initNotaryRegisterPage() {
    const form = document.getElementById("notaryRegisterForm");
    const citySelect = document.getElementById("notaryCity");

    if (!form) return;

    // لود شهرها
    loadCitiesForNotary();

    // ارسال فرم
    form.addEventListener("submit", handleNotaryRegisterSubmit);
}

/**
 * لود شهرها برای ثبت‌نام سردفتر
 */
async function loadCitiesForNotary() {
    const citySelect = document.getElementById("notaryCity");
    if (!citySelect) return;

    const result = await apiRequest(CONFIG.ENDPOINTS.NOTARY_CITIES);

    let cities = CONFIG.DEFAULT_CITIES;
    if (result.success && result.data.length > 0) {
        cities = result.data;
    }

    cities.forEach((city) => {
        const option = document.createElement("option");
        option.value = city;
        option.textContent = city;
        citySelect.appendChild(option);
    });
}

/**
 * ارسال فرم ثبت‌نام سردفتر
 */
async function handleNotaryRegisterSubmit(e) {
    e.preventDefault();

    const name = document.getElementById("notaryName").value.trim();
    const nationalCode = document.getElementById("notaryNationalCode").value.trim();
    const phone = document.getElementById("notaryPhone").value.trim();
    const email = document.getElementById("notaryEmail").value.trim();
    const officeNumber = document.getElementById("officeNumber").value.trim();
    const licenseNumber = document.getElementById("licenseNumber").value.trim();
    const city = document.getElementById("notaryCity").value;
    const officePhone = document.getElementById("officePhone").value.trim();
    const address = document.getElementById("officeAddress").value.trim();
    const workStart = document.getElementById("workStart").value;
    const workEnd = document.getElementById("workEnd").value;
    const description = document.getElementById("notaryDescription").value.trim();
    const acceptTerms = document.getElementById("acceptTerms").checked;

    // خدمات انتخاب شده
    const services = [];
    document.querySelectorAll('input[name="services"]:checked').forEach((cb) => {
        services.push(cb.value);
    });

    // اعتبارسنجی
    if (!name || !nationalCode || !phone || !officeNumber || !licenseNumber || !city || !officePhone || !address) {
        showToast(CONFIG.MESSAGES.ERROR.REQUIRED_FIELDS, "error");
        return;
    }

    if (!acceptTerms) {
        showToast("لطفاً شرایط و قوانین را بپذیرید", "error");
        return;
    }

    if (!HELPERS.isValidPhone(phone)) {
        showToast(CONFIG.MESSAGES.ERROR.INVALID_PHONE, "error");
        return;
    }

    if (!HELPERS.isValidNationalCode(nationalCode)) {
        showToast(CONFIG.MESSAGES.ERROR.INVALID_NATIONAL_CODE, "error");
        return;
    }

    const data = {
        name,
        national_code: HELPERS.toEnglishNumber(nationalCode),
        phone: HELPERS.toEnglishNumber(phone),
        email,
        office_number: officeNumber,
        license_number: licenseNumber,
        city,
        office_phone: HELPERS.toEnglishNumber(officePhone),
        address,
        work_start: workStart,
        work_end: workEnd,
        services,
        description
    };

    const result = await apiRequest(CONFIG.ENDPOINTS.NOTARY_REGISTER, {
        method: "POST",
        body: JSON.stringify(data)
    });

    if (result.success) {
        showToast(CONFIG.MESSAGES.SUCCESS.NOTARY_REGISTER, "success");
        e.target.reset();

        // انتقال به صفحه اصلی بعد از ۲ ثانیه
        setTimeout(() => {
            window.location.href = "index.html";
        }, 2000);
    } else {
        showToast(result.error, "error");
    }
}

// ==========================================
// راه‌اندازی اولیه
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
    // منوی موبایل
    initMobileMenu();

    // تشخیص صفحه و راه‌اندازی
    const path = window.location.pathname;

    if (path.includes("profile.html")) {
        initProfilePage();
    } else if (path.includes("appointment.html")) {
        initAppointmentPage();
    } else if (path.includes("experiences.html")) {
        initExperiencesPage();
    } else if (path.includes("chat.html")) {
        initChatPage();
    } else if (path.includes("notary-register.html")) {
        initNotaryRegisterPage();
    }
});
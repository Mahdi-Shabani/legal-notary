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

    toast.classList.remove("success", "error", "warning");

    if (type === "success") toast.classList.add("success");
    else if (type === "error") toast.classList.add("error");
    else if (type === "warning") toast.classList.add("warning");

    toastMessage.textContent = message;
    toast.classList.add("show");

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

    if (!uploadForm) return;

    loadUserDocuments();

    if (dropZone) {
        dropZone.addEventListener("click", () => fileInput.click());

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
    }

    if (fileInput) {
        fileInput.addEventListener("change", (e) => {
            if (e.target.files.length > 0) {
                handleFileSelect(e.target.files[0]);
            }
        });
    }

    uploadForm.addEventListener("submit", handleUploadSubmit);
}

function handleFileSelect(file) {
    const fileName = document.getElementById("fileName");
    const fileInput = document.getElementById("fileInput");

    if (file.size > CONFIG.UPLOAD.MAX_SIZE) {
        showToast(CONFIG.MESSAGES.ERROR.UPLOAD_SIZE, "error");
        return;
    }

    if (!CONFIG.UPLOAD.ALLOWED_TYPES.includes(file.type)) {
        showToast(CONFIG.MESSAGES.ERROR.UPLOAD_TYPE, "error");
        return;
    }

    if (fileName) {
        fileName.textContent = `فایل انتخاب شده: ${file.name}`;
        fileName.classList.remove("hidden");
    }

    if (fileInput) {
        fileInput.files = createFileList(file);
    }
}

function createFileList(file) {
    const dt = new DataTransfer();
    dt.items.add(file);
    return dt.files;
}

async function handleUploadSubmit(e) {
    e.preventDefault();

    const docType = document.getElementById("docType");
    const fileInput = document.getElementById("fileInput");
    const description = document.getElementById("docDescription");

    if (!docType || !fileInput || !docType.value || !fileInput.files[0]) {
        showToast(CONFIG.MESSAGES.ERROR.REQUIRED_FIELDS, "error");
        return;
    }

    const formData = new FormData();
    formData.append("file", fileInput.files[0]);
    formData.append("type", docType.value);
    formData.append("description", description ? description.value : "");
    formData.append("user_id", getUserId());

    const result = await apiRequest(CONFIG.ENDPOINTS.UPLOAD, {
        method: "POST",
        body: formData
    });

    if (result.success) {
        showToast(CONFIG.MESSAGES.SUCCESS.UPLOAD, "success");
        e.target.reset();
        const fileName = document.getElementById("fileName");
        if (fileName) fileName.classList.add("hidden");
        loadUserDocuments();
    } else {
        showToast(result.error, "error");
    }
}

async function loadUserDocuments() {
    const listContainer = document.getElementById("documentsList");
    const loading = document.getElementById("docsLoading");
    const empty = document.getElementById("docsEmpty");
    const docCount = document.getElementById("docCount");

    if (!listContainer) return;

    if (loading) loading.classList.remove("hidden");
    if (empty) empty.classList.add("hidden");

    const userId = getUserId();
    const result = await apiRequest(CONFIG.ENDPOINTS.UPLOAD_USER + userId);

    if (loading) loading.classList.add("hidden");

    if (result.success && result.data.length > 0) {
        const docs = result.data;
        if (docCount) docCount.textContent = HELPERS.toPersianNumber(docs.length);

        const existingCards = listContainer.querySelectorAll(".document-card");
        existingCards.forEach((card) => card.remove());

        docs.forEach((doc) => {
            const card = createDocumentCard(doc);
            listContainer.appendChild(card);
        });
    } else {
        if (empty) empty.classList.remove("hidden");
        if (docCount) docCount.textContent = "۰";
    }
}

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

    loadCities();
    loadUserAppointments();

    if (citySelect) {
        citySelect.addEventListener("change", async (e) => {
            const city = e.target.value;

            if (city && notarySelect) {
                notarySelect.disabled = false;
                await loadNotariesByCity(city);
            } else if (notarySelect) {
                notarySelect.disabled = true;
                notarySelect.innerHTML = '<option value="">ابتدا شهر را انتخاب کنید...</option>';
            }
        });
    }

    const dateInput = document.getElementById("appointmentDate");
    if (dateInput) {
        const today = new Date().toISOString().split("T")[0];
        dateInput.min = today;
    }

    form.addEventListener("submit", handleAppointmentSubmit);
}

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

async function loadNotariesByCity(city) {
    const notarySelect = document.getElementById("notarySelect");
    if (!notarySelect) return;

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

async function handleAppointmentSubmit(e) {
    e.preventDefault();

    const notarySelect = document.getElementById("notarySelect");
    const serviceType = document.getElementById("serviceType");
    const appointmentDate = document.getElementById("appointmentDate");
    const appointmentTime = document.getElementById("appointmentTime");
    const fullName = document.getElementById("fullName");
    const phone = document.getElementById("phone");
    const nationalCode = document.getElementById("nationalCode");
    const description = document.getElementById("description");

    if (!notarySelect || !serviceType || !appointmentDate || !appointmentTime || !fullName || !phone || !nationalCode) {
        showToast(CONFIG.MESSAGES.ERROR.REQUIRED_FIELDS, "error");
        return;
    }

    const notaryId = notarySelect.value;
    const service = serviceType.value;
    const date = appointmentDate.value;
    const time = appointmentTime.value;
    const name = fullName.value.trim();
    const phoneVal = phone.value.trim();
    const nationalVal = nationalCode.value.trim();
    const desc = description ? description.value.trim() : "";

    if (!notaryId || !service || !date || !time || !name || !phoneVal || !nationalVal) {
        showToast(CONFIG.MESSAGES.ERROR.REQUIRED_FIELDS, "error");
        return;
    }

    if (!HELPERS.isValidPhone(phoneVal)) {
        showToast(CONFIG.MESSAGES.ERROR.INVALID_PHONE, "error");
        return;
    }

    if (!HELPERS.isValidNationalCode(nationalVal)) {
        showToast(CONFIG.MESSAGES.ERROR.INVALID_NATIONAL_CODE, "error");
        return;
    }

    const data = {
        notary_id: notaryId,
        service_type: service,
        date: date,
        time: time,
        full_name: name,
        phone: HELPERS.toEnglishNumber(phoneVal),
        national_code: HELPERS.toEnglishNumber(nationalVal),
        description: desc,
        user_id: getUserId()
    };

    const result = await apiRequest(CONFIG.ENDPOINTS.APPOINTMENTS, {
        method: "POST",
        body: JSON.stringify(data)
    });

    if (result.success) {
        showToast(CONFIG.MESSAGES.SUCCESS.APPOINTMENT, "success");
        e.target.reset();
        if (notarySelect) {
            notarySelect.disabled = true;
            notarySelect.innerHTML = '<option value="">ابتدا شهر را انتخاب کنید...</option>';
        }
        loadUserAppointments();
    } else {
        showToast(result.error, "error");
    }
}

async function loadUserAppointments() {
    const listContainer = document.getElementById("appointmentsList");
    const loading = document.getElementById("appointmentsLoading");
    const empty = document.getElementById("appointmentsEmpty");
    const countBadge = document.getElementById("appointmentCount");

    if (!listContainer) return;

    if (loading) loading.classList.remove("hidden");
    if (empty) empty.classList.add("hidden");

    const userId = getUserId();
    const result = await apiRequest(CONFIG.ENDPOINTS.APPOINTMENTS + `?user_id=${userId}`);

    if (loading) loading.classList.add("hidden");

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
        if (empty) empty.classList.remove("hidden");
        if (countBadge) countBadge.textContent = "۰";
    }
}

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

    loadCategories();
    loadExperiences();

    if (addBtn) {
        addBtn.addEventListener("click", () => {
            modal.classList.remove("hidden");
            modal.classList.add("show");
            document.body.style.overflow = "hidden";
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener("click", closeExperienceModal);
    }

    modal.addEventListener("click", (e) => {
        if (e.target === modal) closeExperienceModal();
    });

    if (closeDetailBtn && detailModal) {
        closeDetailBtn.addEventListener("click", closeDetailModal);
        detailModal.addEventListener("click", (e) => {
            if (e.target === detailModal) closeDetailModal();
        });
    }

    if (categoryFilter) {
        categoryFilter.addEventListener("change", () => {
            experiencesPage = 1;
            loadExperiences(true);
        });
    }

    if (form) {
        form.addEventListener("submit", handleExperienceSubmit);
    }

    if (loadMoreBtn) {
        loadMoreBtn.addEventListener("click", () => {
            experiencesPage++;
            loadExperiences(false);
        });
    }
}

function closeExperienceModal() {
    const modal = document.getElementById("experienceModal");
    if (modal) {
        modal.classList.add("hidden");
        modal.classList.remove("show");
        document.body.style.overflow = "";
    }
}

function closeDetailModal() {
    const modal = document.getElementById("detailModal");
    if (modal) {
        modal.classList.add("hidden");
        modal.classList.remove("show");
        document.body.style.overflow = "";
    }
    currentExperienceId = null;
}

async function loadCategories() {
    const filterSelect = document.getElementById("categoryFilter");
    const formSelect = document.getElementById("expCategory");

    const result = await apiRequest(CONFIG.ENDPOINTS.EXPERIENCES_CATEGORIES);

    let categories = CONFIG.DEFAULT_CATEGORIES;
    if (result.success && result.data.length > 0) {
        categories = result.data;
    }

    categories.forEach((cat) => {
        if (filterSelect) {
            const option1 = document.createElement("option");
            option1.value = cat.id;
            option1.textContent = cat.name;
            filterSelect.appendChild(option1);
        }

        if (formSelect) {
            const option2 = document.createElement("option");
            option2.value = cat.id;
            option2.textContent = cat.name;
            formSelect.appendChild(option2);
        }
    });
}

async function loadExperiences(reset = true) {
    const grid = document.getElementById("experiencesGrid");
    const loading = document.getElementById("experiencesLoading");
    const empty = document.getElementById("experiencesEmpty");
    const loadMoreContainer = document.getElementById("loadMoreContainer");

    if (!grid) return;

    if (reset) {
        if (loading) loading.classList.remove("hidden");
        if (empty) empty.classList.add("hidden");

        const existingCards = grid.querySelectorAll(".experience-card");
        existingCards.forEach((card) => card.remove());
    }

    isLoadingMore = true;

    const categoryFilter = document.getElementById("categoryFilter");
    const category = categoryFilter ? categoryFilter.value : "";

    let url = CONFIG.ENDPOINTS.EXPERIENCES + `?page=${experiencesPage}`;
    if (category) url += `&category=${category}`;

    const result = await apiRequest(url);

    if (loading) loading.classList.add("hidden");
    isLoadingMore = false;

    if (result.success && result.data.length > 0) {
        result.data.forEach((exp) => {
            const card = createExperienceCard(exp);
            grid.appendChild(card);
        });

        if (result.data.length >= 9 && loadMoreContainer) {
            loadMoreContainer.classList.remove("hidden");
        } else if (loadMoreContainer) {
            loadMoreContainer.classList.add("hidden");
        }
    } else if (reset) {
        if (empty) empty.classList.remove("hidden");
    }
}

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

function openExperienceDetail(exp) {
    const modal = document.getElementById("detailModal");
    const title = document.getElementById("detailTitle");
    const category = document.getElementById("detailCategory");
    const date = document.getElementById("detailDate");
    const content = document.getElementById("detailContent");
    const author = document.getElementById("detailAuthor");
    const likes = document.getElementById("detailLikes");
    const likeBtn = document.getElementById("detailLikeBtn");

    if (!modal) return;

    currentExperienceId = exp.id;

    if (title) title.textContent = exp.title;
    if (category) category.textContent = exp.category_name || "عمومی";
    if (date) date.textContent = HELPERS.formatDate(exp.created_at);
    if (content) content.textContent = exp.content;
    if (author) author.textContent = exp.author || "ناشناس";
    if (likes) likes.textContent = HELPERS.toPersianNumber(exp.likes || 0);
    if (likeBtn) likeBtn.onclick = () => likeExperience(exp.id);

    modal.classList.remove("hidden");
    modal.classList.add("show");
    document.body.style.overflow = "hidden";
}

async function likeExperience(expId) {
    const result = await apiRequest(CONFIG.ENDPOINTS.EXPERIENCE_LIKE + expId + "/like", {
        method: "POST"
    });

    if (result.success) {
        const likesSpan = document.getElementById("detailLikes");
        const likeBtn = document.getElementById("detailLikeBtn");

        if (likesSpan) likesSpan.textContent = HELPERS.toPersianNumber(result.data.likes);
        if (likeBtn) likeBtn.classList.add("liked");

        showToast(CONFIG.MESSAGES.SUCCESS.LIKE, "success");
    } else {
        showToast(result.error, "error");
    }
}

async function handleExperienceSubmit(e) {
    e.preventDefault();

    const titleEl = document.getElementById("expTitle");
    const categoryEl = document.getElementById("expCategory");
    const contentEl = document.getElementById("expContent");
    const authorEl = document.getElementById("expAuthor");

    if (!titleEl || !categoryEl || !contentEl) return;

    const title = titleEl.value.trim();
    const category = categoryEl.value;
    const content = contentEl.value.trim();
    const author = authorEl ? authorEl.value.trim() : "";

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
    const suggestions = document.querySelectorAll(".suggestion-btn");

    if (!form) return;

    checkChatHealth();
    loadChatSuggestions();

    suggestions.forEach((btn) => {
        btn.addEventListener("click", () => {
            if (input) input.value = btn.textContent;
            form.dispatchEvent(new Event("submit"));
        });
    });

    form.addEventListener("submit", (e) => handleChatSubmit(e));
    scrollToBottom();
}

async function checkChatHealth() {
    const statusDot = document.getElementById("statusDot");
    const statusText = document.getElementById("statusText");

    if (!statusDot || !statusText) return;

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
                const input = document.getElementById("chatInput");
                const form = document.getElementById("chatForm");
                if (input) input.value = suggestion;
                if (form) form.dispatchEvent(new Event("submit"));
            });
            container.appendChild(btn);
        });
    }
}

async function handleChatSubmit(e) {
    e.preventDefault();

    const input = document.getElementById("chatInput");
    const sendBtn = document.getElementById("sendBtn");
    const suggestionsContainer = document.getElementById("suggestionsContainer");

    if (!input) return;

    const message = input.value.trim();
    if (!message) return;

    if (input) input.disabled = true;
    if (sendBtn) sendBtn.disabled = true;
    if (suggestionsContainer) suggestionsContainer.classList.add("hidden");

    addChatMessage(message, "user");
    input.value = "";

    showTypingIndicator();

    // فقط message بفرست
    const result = await apiRequest(CONFIG.ENDPOINTS.CHAT, {
        method: "POST",
        body: JSON.stringify({ message })
    });

    hideTypingIndicator();

    if (input) input.disabled = false;
    if (sendBtn) sendBtn.disabled = false;
    if (input) input.focus();

    if (result.success) {
        addChatMessage(result.data.response, "bot");
    } else {
        addChatMessage(CONFIG.MESSAGES.ERROR.CHAT_OFFLINE, "bot");
    }
}

function addChatMessage(message, type) {
    const container = document.getElementById("chatMessages");
    if (!container) return;

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

function showTypingIndicator() {
    const container = document.getElementById("chatMessages");
    if (!container) return;

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

function hideTypingIndicator() {
    const indicator = document.getElementById("typingIndicator");
    if (indicator) indicator.remove();
}

function scrollToBottom() {
    const container = document.getElementById("chatMessages");
    if (container) {
        container.scrollTop = container.scrollHeight;
    }
}

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

    if (!form) return;

    loadCitiesForNotary();
    form.addEventListener("submit", handleNotaryRegisterSubmit);
}

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

async function handleNotaryRegisterSubmit(e) {
    e.preventDefault();

    const nameEl = document.getElementById("notaryName");
    const nationalCodeEl = document.getElementById("notaryNationalCode");
    const phoneEl = document.getElementById("notaryPhone");
    const emailEl = document.getElementById("notaryEmail");
    const officeNumberEl = document.getElementById("officeNumber");
    const licenseNumberEl = document.getElementById("licenseNumber");
    const cityEl = document.getElementById("notaryCity");
    const officePhoneEl = document.getElementById("officePhone");
    const addressEl = document.getElementById("officeAddress");
    const workStartEl = document.getElementById("workStart");
    const workEndEl = document.getElementById("workEnd");
    const descriptionEl = document.getElementById("notaryDescription");
    const acceptTermsEl = document.getElementById("acceptTerms");

    if (!nameEl || !nationalCodeEl || !phoneEl || !officeNumberEl || !licenseNumberEl || !cityEl || !officePhoneEl || !addressEl) {
        showToast(CONFIG.MESSAGES.ERROR.REQUIRED_FIELDS, "error");
        return;
    }

    const name = nameEl.value.trim();
    const nationalCode = nationalCodeEl.value.trim();
    const phone = phoneEl.value.trim();
    const email = emailEl ? emailEl.value.trim() : "";
    const officeNumber = officeNumberEl.value.trim();
    const licenseNumber = licenseNumberEl.value.trim();
    const city = cityEl.value;
    const officePhone = officePhoneEl.value.trim();
    const address = addressEl.value.trim();
    const workStart = workStartEl ? workStartEl.value : "";
    const workEnd = workEndEl ? workEndEl.value : "";
    const description = descriptionEl ? descriptionEl.value.trim() : "";
    const acceptTerms = acceptTermsEl ? acceptTermsEl.checked : false;

    const services = [];
    document.querySelectorAll('input[name="services"]:checked').forEach((cb) => {
        services.push(cb.value);
    });

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
    initMobileMenu();

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
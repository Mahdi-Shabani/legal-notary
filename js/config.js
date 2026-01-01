
const CONFIG = {
    // آدرس API بک‌اند
    API_BASE: "https://egal-notary-api.onrender.com",

    // Endpoints
    ENDPOINTS: {
        // آپلود مدارک
        UPLOAD: "/api/upload/",
        UPLOAD_USER: "/api/upload/user/", // + user_id
        UPLOAD_DELETE: "/api/upload/", // + document_id

        // نوبت‌ها
        APPOINTMENTS: "/api/appointments/",
        APPOINTMENT_DETAIL: "/api/appointments/", // + id

        // تجربیات
        EXPERIENCES: "/api/experiences/",
        EXPERIENCES_CATEGORIES: "/api/experiences/categories",
        EXPERIENCE_DETAIL: "/api/experiences/", // + id
        EXPERIENCE_LIKE: "/api/experiences/", // + id + /like

        // سردفتران
        NOTARY_REGISTER: "/api/notary/register",
        NOTARY_LIST: "/api/notary/",
        NOTARY_CITIES: "/api/notary/cities",
        NOTARY_DETAIL: "/api/notary/", // + id

        // چت
        CHAT: "/api/chat/",
        CHAT_HEALTH: "/api/chat/health",
        CHAT_SUGGESTIONS: "/api/chat/suggestions"
    },

    // تنظیمات آپلود
    UPLOAD: {
        MAX_SIZE: 5 * 1024 * 1024, // 5 مگابایت
        ALLOWED_TYPES: ["application/pdf", "image/jpeg", "image/jpg", "image/png"],
        ALLOWED_EXTENSIONS: [".pdf", ".jpg", ".jpeg", ".png"]
    },

    // تنظیمات کش محلی
    STORAGE_KEYS: {
        USER_ID: "notary_user_id",
        USER_NAME: "notary_user_name",
        USER_PHONE: "notary_user_phone",
        CHAT_HISTORY: "notary_chat_history"
    },

    // پیام‌های سیستم
    MESSAGES: {
        // موفقیت
        SUCCESS: {
            UPLOAD: "مدرک با موفقیت آپلود شد",
            DELETE: "مدرک با موفقیت حذف شد",
            APPOINTMENT: "نوبت با موفقیت ثبت شد",
            APPOINTMENT_CANCEL: "نوبت با موفقیت لغو شد",
            EXPERIENCE: "تجربه با موفقیت ثبت شد",
            LIKE: "لایک ثبت شد",
            NOTARY_REGISTER: "درخواست ثبت‌نام با موفقیت ارسال شد"
        },

        // خطاها
        ERROR: {
            NETWORK: "خطا در برقراری ارتباط با سرور",
            UPLOAD_SIZE: "حجم فایل بیش از ۵ مگابایت است",
            UPLOAD_TYPE: "فرمت فایل مجاز نیست",
            REQUIRED_FIELDS: "لطفاً تمام فیلدهای ضروری را پر کنید",
            INVALID_PHONE: "شماره تماس نامعتبر است",
            INVALID_NATIONAL_CODE: "کد ملی نامعتبر است",
            CHAT_OFFLINE: "دستیار هوشمند در دسترس نیست",
            GENERAL: "خطایی رخ داده است. لطفاً دوباره تلاش کنید"
        },

        // هشدارها
        WARNING: {
            CONFIRM_DELETE: "آیا از حذف این مورد اطمینان دارید؟",
            CONFIRM_CANCEL: "آیا از لغو این نوبت اطمینان دارید?",
            UNSAVED_CHANGES: "تغییرات ذخیره نشده از بین خواهد رفت"
        }
    },

    // انواع مدارک
    DOCUMENT_TYPES: {
        national_card: "کارت ملی",
        birth_certificate: "شناسنامه",
        deed: "سند ملکی",
        power_of_attorney: "وکالت‌نامه",
        marriage_certificate: "سند ازدواج",
        other: "سایر"
    },

    // انواع خدمات
    SERVICE_TYPES: {
        property_transfer: "انتقال سند ملکی",
        power_of_attorney: "تنظیم وکالت‌نامه",
        marriage: "ثبت ازدواج",
        divorce: "ثبت طلاق",
        contract: "تنظیم قرارداد",
        signature_verification: "تصدیق امضا",
        copy_verification: "تصدیق رونوشت",
        other: "سایر خدمات"
    },

    // وضعیت‌های نوبت
    APPOINTMENT_STATUS: {
        pending: { label: "در انتظار تأیید", class: "pending" },
        confirmed: { label: "تأیید شده", class: "confirmed" },
        cancelled: { label: "لغو شده", class: "cancelled" },
        completed: { label: "انجام شده", class: "confirmed" }
    },

    // شهرهای پیش‌فرض (در صورت عدم دسترسی به API)
    DEFAULT_CITIES: [
        "تهران",
        "مشهد",
        "اصفهان",
        "شیراز",
        "تبریز",
        "کرج",
        "قم",
        "اهواز",
        "کرمانشاه",
        "رشت"
    ],

    // دسته‌بندی‌های پیش‌فرض تجربیات
    DEFAULT_CATEGORIES: [
        { id: 1, name: "انتقال سند" },
        { id: 2, name: "وکالت‌نامه" },
        { id: 3, name: "ازدواج و طلاق" },
        { id: 4, name: "ارث و میراث" },
        { id: 5, name: "قراردادها" },
        { id: 6, name: "سایر" }
    ],

    // پیشنهادات چت پیش‌فرض
    DEFAULT_SUGGESTIONS: [
        "مدارک لازم برای انتقال سند",
        "هزینه تنظیم وکالت‌نامه",
        "شرایط ثبت ازدواج",
        "مراحل دریافت سند ملکی"
    ]
};

/**
 * توابع کمکی
 */
const HELPERS = {
    /**
     * ساخت URL کامل API
     */
    apiUrl(endpoint) {
        return CONFIG.API_BASE + endpoint;
    },

    /**
     * تبدیل اعداد به فارسی
     */
    toPersianNumber(num) {
        const persianDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
        return String(num).replace(/\d/g, (d) => persianDigits[parseInt(d)]);
    },

    /**
     * تبدیل اعداد فارسی به انگلیسی
     */
    toEnglishNumber(str) {
        const persianDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
        const arabicDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
        
        for (let i = 0; i < 10; i++) {
            str = str.replace(new RegExp(persianDigits[i], "g"), i);
            str = str.replace(new RegExp(arabicDigits[i], "g"), i);
        }
        return str;
    },

    /**
     * اعتبارسنجی شماره موبایل
     */
    isValidPhone(phone) {
        const cleaned = this.toEnglishNumber(phone).replace(/\D/g, "");
        return /^09\d{9}$/.test(cleaned);
    },

    /**
     * اعتبارسنجی کد ملی
     */
    isValidNationalCode(code) {
        const cleaned = this.toEnglishNumber(code).replace(/\D/g, "");
        
        if (cleaned.length !== 10) return false;
        if (/^(.)\1+$/.test(cleaned)) return false;
        
        let sum = 0;
        for (let i = 0; i < 9; i++) {
            sum += parseInt(cleaned[i]) * (10 - i);
        }
        
        const remainder = sum % 11;
        const checkDigit = parseInt(cleaned[9]);
        
        return (remainder < 2 && checkDigit === remainder) || 
               (remainder >= 2 && checkDigit === 11 - remainder);
    },

    /**
     * فرمت تاریخ
     */
    formatDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString("fa-IR");
    },

    /**
     * فرمت زمان
     */
    formatTime(timeStr) {
        return this.toPersianNumber(timeStr);
    },

    /**
     * فرمت حجم فایل
     */
    formatFileSize(bytes) {
        if (bytes < 1024) return this.toPersianNumber(bytes) + " بایت";
        if (bytes < 1024 * 1024) return this.toPersianNumber((bytes / 1024).toFixed(1)) + " کیلوبایت";
        return this.toPersianNumber((bytes / (1024 * 1024)).toFixed(1)) + " مگابایت";
    },

    /**
     * ایجاد شناسه یکتا
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    /**
     * ذخیره در localStorage
     */
    saveToStorage(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error("Storage error:", e);
            return false;
        }
    },

    /**
     * خواندن از localStorage
     */
    getFromStorage(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            console.error("Storage error:", e);
            return defaultValue;
        }
    },

    /**
     * حذف از localStorage
     */
    removeFromStorage(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            console.error("Storage error:", e);
            return false;
        }
    }
};

// Export for use in other files
if (typeof module !== "undefined" && module.exports) {
    module.exports = { CONFIG, HELPERS };
}
// js/api.js
class APIClient {
    constructor() {
        this.baseURL = API_BASE_URL;
    }

    getToken() { return localStorage.getItem("access_token"); }

    getUser() {
        const u = localStorage.getItem("user");
        return u ? JSON.parse(u) : null;
    }

    isAuthenticated() { return !!this.getToken(); }

    isAdmin() {
        const u = this.getUser();
        return u && u.role === "admin";
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const token = this.getToken();
        const config = {
            headers: {
                ...options.headers
            },
            ...options
        };
        if (token) config.headers["Authorization"] = `Bearer ${token}`;

        // ✅ FIX: Only set JSON content-type if not already set
        // Login endpoint uses form-urlencoded, others use JSON
        if (!config.headers["Content-Type"]) {
            config.headers["Content-Type"] = "application/json";
        }

        // ✅ FIX: Stringify body only if it's JSON (not form data)
        if (config.body && typeof config.body !== "string" && !(config.body instanceof FormData)) {
            config.body = JSON.stringify(config.body);
        }

        try {
            const res = await fetch(url, config);
            const data = await res.json();
            if (!res.ok) {
                if (res.status === 401) {
                    this.logout();
                    window.location.href = "login.html";
                }
                throw new Error(data.detail || data.message || "Request failed");
            }
            return data;
        } catch (err) {
            console.error("API Error:", err);
            throw err;
        }
    }

    get(endpoint, params = {}) {
        const qs = new URLSearchParams(params).toString();
        return this.request(qs ? `${endpoint}?${qs}` : endpoint, { method: "GET" });
    }

    post(endpoint, body) {
        return this.request(endpoint, { method: "POST", body });
    }

    put(endpoint, body) {
        return this.request(endpoint, { method: "PUT", body });
    }

    delete(endpoint) {
        return this.request(endpoint, { method: "DELETE" });
    }

    // ✅ NEW: Specialized method for OAuth2 form-urlencoded login
    async postForm(endpoint, body) {
        return this.request(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: new URLSearchParams(body).toString()
        });
    }

    async upload(endpoint, formData) {
        const token = this.getToken();
        const res = await fetch(`${this.baseURL}${endpoint}`, {
            method: "POST",
            headers: { Authorization: token ? `Bearer ${token}` : "" },
            body: formData
        });
        return res.json();
    }

    logout() {
        localStorage.removeItem("access_token");
        localStorage.removeItem("user");
    }
}

const api = new APIClient();

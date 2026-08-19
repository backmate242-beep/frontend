// js/auth.js
function showToast(message, type = "success") {
    let container = document.querySelector(".toast-container");
    if (!container) {
        container = document.createElement("div");
        container.className = "toast-container";
        document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => toast.classList.add("show"), 100);
    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

async function handleLogin(event) {
    event.preventDefault();
    const fd = new FormData(event.target);
    const email = (fd.get("email") || "").trim();
    const password = fd.get("password") || "";

    // ✅ Validate before sending
    if (!email || !password) {
        showToast("Please enter both email and password", "error");
        return;
    }

    try {
        // ✅ FIX: Use postForm() instead of post() for OAuth2-style login
        const data = await api.postForm("/auth/login", {
            username: email,    // FastAPI's OAuth2PasswordRequestForm uses "username"
            password: password
        });

        localStorage.setItem("access_token", data.access_token);
        localStorage.setItem("user", JSON.stringify({
            user_id: data.user_id,
            role: data.role
        }));

        showToast("Login successful! 🎉", "success");
        setTimeout(() => {
            window.location.href = data.role === "admin" ? "admin-dashboard.html" : "dashboard.html";
        }, 800);
    } catch (err) {
        showToast(err.message || "Login failed", "error");
    }
}

async function handleRegister(event) {
    event.preventDefault();
    const fd = new FormData(event.target);

    if (fd.get("password") !== fd.get("confirm_password")) {
        showToast("Passwords don't match!", "error");
        return;
    }

    try {
        await api.post("/auth/register", {
            full_name: fd.get("full_name"),
            email: fd.get("email"),
            password: fd.get("password"),
            role: "student"
        });
        showToast("Account created! Please login.", "success");
        setTimeout(() => window.location.href = "login.html", 1500);
    } catch (err) {
        showToast(err.message || "Registration failed", "error");
    }
}

function logout() {
    api.logout();
    showToast("Logged out", "info");
    setTimeout(() => window.location.href = "index.html", 500);
}

function requireAuth() {
    if (!api.isAuthenticated()) {
        window.location.href = "login.html";
        return false;
    }
    return true;
}

function requireAdmin() {
    if (!api.isAdmin()) {
        window.location.href = "dashboard.html";
        return false;
    }
    return true;
}

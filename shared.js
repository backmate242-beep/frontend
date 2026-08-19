// js/shared.js
function injectSidebar(activePage) {
    const user = api.getUser();
    const userName = user?.full_name || "User";
    const userInitial = userName.charAt(0).toUpperCase();

    const sidebarHTML = `
        <aside class="sidebar">
            <div class="sidebar-header">
                <div class="logo">
                    <div class="logo-icon">
                        <img src="photos/main-logo.png" alt="DataPath Navigator" class="logo-image" 
                             onerror="this.style.display='none'; this.parentElement.innerHTML='🧭';">
                    </div>
                    <div class="logo-text">
                        <span class="main">DataPath</span>
                        <span class="sub">NAVIGATOR</span>
                    </div>
                </div>
                <div class="sidebar-user">
                    <div class="sidebar-user-avatar">
                        <span>${userInitial}</span>
                    </div>
                    <div class="sidebar-user-info">
                        <span class="sidebar-user-name">${userName}</span>
                        <span class="sidebar-user-role">${user?.role === 'admin' ? '👑 Admin' : '🎓 Student'}</span>
                    </div>
                </div>
            </div>
            <ul class="sidebar-menu">
                <li>
                    <a href="dashboard.html" class="${activePage === 'dashboard' ? 'active' : ''}">
                        <span class="icon">📊</span> Dashboard
                    </a>
                </li>
                <li>
                    <a href="profile.html" class="${activePage === 'profile' ? 'active' : ''}">
                        <span class="icon">👤</span> Profile
                    </a>
                </li>
                <li>
                    <a href="javascript:void(0)" class="${activePage === 'assessments' ? 'active' : ''}">
                        <span class="icon">📋</span> Career Assessments
                    </a>
                    <ul class="submenu">
                        <li><a href="aptitude-test.html" class="${activePage === 'aptitude' ? 'active' : ''}">Aptitude Test</a></li>
                        <li><a href="mock-interview.html" class="${activePage === 'mock' ? 'active' : ''}">Mock Interview</a></li>
                    </ul>
                </li>
                <li>
                    <a href="ai-recommendations.html" class="${activePage === 'recs' ? 'active' : ''}">
                        <span class="icon">🎯</span> AI Recommendation
                    </a>
                </li>
                <li>
                    <a href="roadmap.html" class="${activePage === 'roadmap' ? 'active' : ''}">
                        <span class="icon">🗺️</span> Skill Up
                    </a>
                </li>
                <li>
                    <a href="skill-gap.html" class="${activePage === 'skillgap' ? 'active' : ''}">
                        <span class="icon">📈</span> Skill Gap Analysis
                    </a>
                </li>
                <li>
                    <a href="resource-center.html" class="${activePage === 'resources' ? 'active' : ''}">
                        <span class="icon">📚</span> Resource Center
                    </a>
                </li>
                <li>
                    <a href="ai-chat.html" class="${activePage === 'chat' ? 'active' : ''}">
                        <span class="icon">🤖</span> AI Chat
                    </a>
                </li>
                <li>
                    <a href="settings.html" class="${activePage === 'settings' ? 'active' : ''}">
                        <span class="icon">⚙️</span> Settings
                    </a>
                </li>
            </ul>
        </aside>
    `;
    document.body.insertAdjacentHTML("afterbegin", sidebarHTML);
}

function injectTopHeader() {
    const user = api.getUser();
    const userName = user?.full_name || "User";
    const userInitial = userName.charAt(0).toUpperCase();

    const headerHTML = `
        <header class="top-header">
            <button class="menu-toggle" onclick="document.querySelector('.sidebar').classList.toggle('open')">☰</button>
            <nav class="top-nav">
                <a href="index.html">Home</a>
                <a href="ai-recommendations.html">AI Recommendation</a>
                <a href="dashboard.html">Dashboard</a>
                <a href="aptitude-test.html">AI Career Assessment</a>
                <a href="skill-gap.html">Skill Gap Analysis</a>
                <a href="ai-chat.html">AI Chat</a>
            </nav>
            <div class="header-user" onclick="toggleUserMenu()">
                <div class="header-user-avatar">
                    <span>${userInitial}</span>
                </div>
                <span class="header-user-name">${userName}</span>
                <span class="header-user-arrow">▼</span>
                <div class="header-user-menu" id="headerUserMenu">
                    <div class="menu-header">
                        <strong>${userName}</strong>
                        <small>${user?.email || ''}</small>
                    </div>
                    <div class="menu-divider"></div>
                    <a href="profile.html" class="menu-item">👤 My Profile</a>
                    <a href="settings.html" class="menu-item">⚙️ Settings</a>
                    ${user?.role === 'admin' ? '<a href="admin-dashboard.html" class="menu-item">👑 Admin Panel</a>' : ''}
                    <div class="menu-divider"></div>
                    <a href="javascript:void(0)" class="menu-item danger" onclick="logout()">🚪 Logout</a>
                </div>
            </div>
        </header>
    `;
    const main = document.querySelector(".main-content");
    if (main) main.insertAdjacentHTML("afterbegin", headerHTML);
}

function toggleUserMenu() {
    const menu = document.getElementById("headerUserMenu");
    if (menu) menu.classList.toggle("show");
}

document.addEventListener("click", (e) => {
    const userEl = document.querySelector(".header-user");
    if (userEl && !userEl.contains(e.target)) {
        const menu = document.getElementById("headerUserMenu");
        if (menu) menu.classList.remove("show");
    }
});

document.addEventListener("DOMContentLoaded", () => {
    if (document.querySelector(".app-container")) {
        const page = document.body.dataset.page || "dashboard";
        injectSidebar(page);
        injectTopHeader();
    }
});

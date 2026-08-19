async function generateRecommendations() {
    if (!requireAuth()) return;

    const btn = document.getElementById("generateBtn");
    const container = document.getElementById("recommendationsContainer");

    btn.disabled = true;
    btn.innerHTML = '<span class="loader"></span> Generating...';

    try {
        const response = await api.post("/ai/recommendations?top_n=10&include_explanations=true");
        
        // Handle both wrapped and direct array responses
        const data = Array.isArray(response) ? response : (response.recommendations || []);

        if (!data || data.length === 0) {
            container.innerHTML = `<p class="text-muted text-center" style="grid-column: 1 / -1; padding: 3rem;">No recommendations. Add skills to your profile first!</p>`;
            return;
        }

        container.innerHTML = data.map((rec, i) => `
            <div class="career-card">
                <div class="match-circle" style="--pct: ${rec.match_percentage}%">
                    <span>${Math.round(rec.match_percentage)}%</span>
                </div>
                <span class="badge badge-yellow mb-2">#${i + 1} Match</span>
                <h3 style="margin-top: 0.5rem; margin-right: 90px;">${rec.career_name}</h3>
                <p class="text-muted mt-2">${rec.description || "No description"}</p>
                ${rec.average_salary ? `<p class="mt-2"><strong style="color: var(--accent-yellow);">💰 Avg Salary:</strong> ₹${Number(rec.average_salary).toLocaleString()}</p>` : ""}
                <p class="mt-2"><strong>📊 Skills Matched:</strong> ${rec.matched_skills_count || 'N/A'}/${rec.required_skills_count || 'N/A'}</p>
                <div class="progress mt-1">
                    <div class="progress-bar" style="width: ${rec.match_percentage}%"></div>
                </div>
                <details class="mt-3">
                    <summary style="cursor: pointer; color: var(--accent-yellow); font-weight: 600;">🤖 AI Explanation</summary>
                    <p class="mt-2" style="white-space: pre-wrap; padding: 1rem; background: var(--primary-bg); border-radius: 8px; font-size: 0.9rem;">${rec.ai_explanation || 'Great match for your profile!'}</p>
                </details>
                <div class="flex gap-1 mt-3">
                    <button class="btn btn-sm btn-outline-yellow" onclick="bookmark(${rec.career_id})">🔖 Save</button>
                    <button class="btn btn-sm btn-primary" onclick="analyzeSkillGap(${rec.career_id}, '${rec.career_name}')">📊 Skill Gap</button>
                    <button class="btn btn-sm btn-secondary" onclick="getRoadmap('${rec.career_name}')">🗺️ Roadmap</button>
                </div>
            </div>
        `).join("");

        showToast(`Generated ${data.length} recommendations! 🎉`, "success");
    } catch (err) {
        console.error("Recommendations error:", err);
        showToast(err.message || "Failed to generate", "error");
    } finally {
        btn.disabled = false;
        btn.innerHTML = "✨ Generate New";
    }
}

async function bookmark(careerId) {
    try {
        await api.post("/bookmarks/", { career_id: careerId });
        showToast("Bookmarked! 🔖", "success");
    } catch (err) {
        showToast(err.message || "Failed", "error");
    }
}

function analyzeSkillGap(id, name) {
    localStorage.setItem("selected_career", JSON.stringify({ id, name }));
    window.location.href = "skill-gap.html";
}

function getRoadmap(name) {
    localStorage.setItem("roadmap_career", name);
    window.location.href = "roadmap.html";
}

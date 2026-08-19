// js/skill-gap.js
(async function() {
    if (!requireAuth()) return;

    await loadCareers();

    const selected = localStorage.getItem("selected_career");
    if (selected) {
        const data = JSON.parse(selected);
        setTimeout(() => {
            document.getElementById("careerSelect").value = data.id;
            analyzeSkillGap();
            localStorage.removeItem("selected_career");
        }, 500);
    }
})();

async function loadCareers() {
    try {
        const data = await api.get("/careers/", { limit: 100 });
        const select = document.getElementById("careerSelect");
        select.innerHTML = '<option value="">-- Select a career --</option>' +
            data.map(c => `<option value="${c.career_id}">${c.career_name}</option>`).join("");
    } catch (err) {
        showToast("Failed to load careers", "error");
    }
}

async function analyzeSkillGap() {
    const careerId = document.getElementById("careerSelect").value;
    if (!careerId) {
        document.getElementById("gapAnalysis").style.display = "none";
        return;
    }

    try {
        const data = await api.post("/ai/skill-gap", { career_id: parseInt(careerId) });
        renderAnalysis(data);
        showToast("Analysis complete! 📊", "success");
    } catch (err) {
        console.error("Skill gap error:", err);
        showToast(err.message || "Failed to analyze", "error");
    }
}

function renderAnalysis(data) {
    const analysis = data.gap_analysis;
    const matchPct = analysis.match_percentage || 0;
    const matched = analysis.matched_skills ? analysis.matched_skills.length : 0;
    const missing = analysis.missing_skills ? analysis.missing_skills.length : 0;

    document.getElementById("gapAnalysis").style.display = "block";
    document.getElementById("matchScore").textContent = Math.round(matchPct);
    document.getElementById("matchedCount").textContent = matched;
    document.getElementById("missingCount").textContent = missing;
    document.getElementById("aiAdvice").textContent = data.ai_advice || "No advice available.";

    document.getElementById("strengthsList").innerHTML = renderSkillsList(analysis.matched_skills || [], "success");
    document.getElementById("criticalList").innerHTML = renderSkillsList(analysis.missing_skills || [], "danger");
    document.getElementById("developingList").innerHTML = '<p class="text-muted">See AI advice for details</p>';
    document.getElementById("niceList").innerHTML = '<p class="text-muted">See AI advice for details</p>';
}

function renderSkillsList(skills, type) {
    if (!skills || skills.length === 0) return '<p class="text-muted">None</p>';
    return skills.map(s => `
        <span class="skill-tag ${type}" style="display: inline-block; margin: 0.25rem; padding: 0.4rem 0.8rem; border-radius: 9999px; font-size: 0.85rem; background: ${type === 'success' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}; color: ${type === 'success' ? '#22c55e' : '#ef4444'};">
            ${typeof s === 'string' ? s : s.skill_name}
        </span>
    `).join("");
}

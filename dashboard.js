(async function() {
    if (!requireAuth()) return;

    try {
        const userInfo = await api.get("/users/me");
        document.getElementById("userName").textContent = userInfo.full_name;
        document.querySelector(".user-avatar").textContent = userInfo.full_name[0].toUpperCase();

        const data = await api.get("/dashboard/student");

        document.getElementById("statSkills").textContent = data.stats.total_skills;
        document.getElementById("statRecs").textContent = data.stats.total_recommendations;
        document.getElementById("statAssessments").textContent = data.stats.assessments_taken;
        document.getElementById("statTopMatch").textContent = data.top_career ? data.top_career.match + "%" : "-";

        document.getElementById("profileInfo").innerHTML = `
            <div style="display: grid; gap: 0.5rem;">
                <div><strong style="color: var(--text-secondary);">Degree:</strong> ${data.student.degree || "Not set"}</div>
                <div><strong style="color: var(--text-secondary);">Department:</strong> ${data.student.department || "Not set"}</div>
                <div><strong style="color: var(--text-secondary);">Year:</strong> ${data.student.year_of_study || "Not set"}</div>
                <div><strong style="color: var(--text-secondary);">CGPA:</strong> ${data.student.cgpa || "Not set"}</div>
            </div>
        `;

        if (data.top_career) {
            document.getElementById("topCareer").innerHTML = `
                <h2 style="color: var(--accent-yellow); margin-bottom: 0.5rem;">${data.top_career.name}</h2>
                <div class="progress">
                    <div class="progress-bar" style="width: ${data.top_career.match}%"></div>
                </div>
                <p style="color: var(--text-muted); margin-top: 0.5rem;">Match: <strong>${data.top_career.match}%</strong></p>
            `;
        }
    } catch (err) {
        console.error(err);
    }
})();

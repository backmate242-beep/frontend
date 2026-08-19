// js/roadmap.js
(async function() {
    if (!requireAuth()) return;

    const career = localStorage.getItem("roadmap_career");
    if (career) {
        document.getElementById("careerName").value = career;
        localStorage.removeItem("roadmap_career");
        // Auto-generate after a small delay
        setTimeout(() => generateRoadmap(), 300);
    }
})();

async function generateRoadmap() {
    const career = document.getElementById("careerName").value.trim();
    const hours = parseInt(document.getElementById("hoursPerDay").value);

    if (!career) {
        showToast("Please enter a career name", "warning");
        return;
    }

    const btn = document.getElementById("generateBtn");
    const result = document.getElementById("roadmapResult");
    const content = document.getElementById("roadmapContent");

    // Show loading state
    btn.disabled = true;
    btn.innerHTML = '<span class="loader"></span> Generating roadmap...';
    result.style.display = "block";
    content.innerHTML = `
        <div style="text-align: center; padding: 2rem;">
            <div class="loader"></div>
            <p class="text-muted mt-2">🤖 AI is crafting your personalized 6-month roadmap...</p>
        </div>
    `;

    try {
        // First, get user's current skills from their profile
        let userSkills = [];
        try {
            const skills = await api.get("/students/me/skills");
            // We need to get skill names - fetch all skills too
            const allSkills = await api.get("/skills/", { limit: 500 });
            const skillMap = {};
            allSkills.forEach(s => skillMap[s.skill_id] = s.skill_name);
            userSkills = skills.map(ss => skillMap[ss.skill_id]).filter(Boolean);
        } catch (e) {
            console.log("No skills found, continuing with empty list");
        }

        const data = await api.post("/ai/roadmap/generate", {
            career_name: career,
            current_skills: userSkills,
            education: "Bachelor's",
            hours_per_day: hours
        });

        document.getElementById("roadmapTitle").textContent = `🗺️ Roadmap for ${data.career}`;
        document.getElementById("poweredBy").innerHTML = data.powered_by === "OpenAI"
            ? "⚡ Powered by GPT"
            : "⚡ AI Engine";

        // ✅ THE FIX: Render markdown properly instead of plain text
        content.innerHTML = renderMarkdown(data.roadmap);

        // Scroll to result
        result.scrollIntoView({ behavior: "smooth", block: "start" });

        showToast("Roadmap generated! 🚀", "success");
    } catch (err) {
        content.innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <p style="color: var(--danger);">❌ Failed to generate roadmap</p>
                <p class="text-muted">${err.message || "Please try again"}</p>
                <button class="btn btn-primary mt-2" onclick="generateRoadmap()">🔄 Retry</button>
            </div>
        `;
        showToast(err.message || "Failed to generate", "error");
    } finally {
        btn.disabled = false;
        btn.innerHTML = "🚀 Generate Roadmap";
    }
}

/**
 * Simple Markdown to HTML converter
 * Handles: headings, bold, italic, lists, code, hr, paragraphs
 */
function renderMarkdown(md) {
    if (!md) return "<p>No content</p>";

    let html = md;

    // Escape HTML first (security)
    // Actually, we want to render HTML safely, so we'll parse line by line

    const lines = html.split('\n');
    let result = [];
    let inList = false;
    let listType = null;

    for (let line of lines) {
        line = line.trim();

        // Close any open list when we hit a non-list line
        if (inList && !line.match(/^[-*]\s/) && !line.match(/^\d+\.\s/)) {
            result.push(`</${listType}>`);
            inList = false;
            listType = null;
        }

        // Headers
        if (line.match(/^###\s+(.+)$/)) {
            result.push(`<h3>${formatInline(line.replace(/^###\s+/, ''))}</h3>`);
        }
        else if (line.match(/^##\s+(.+)$/)) {
            result.push(`<h2>${formatInline(line.replace(/^##\s+/, ''))}</h2>`);
        }
        else if (line.match(/^#\s+(.+)$/)) {
            result.push(`<h1>${formatInline(line.replace(/^#\s+/, ''))}</h1>`);
        }
        // Horizontal rule
        else if (line.match(/^---+$/) || line.match(/^\*\*\*+$/)) {
            result.push('<hr>');
        }
        // Unordered list
        else if (line.match(/^[-*]\s+(.+)$/)) {
            if (!inList || listType !== 'ul') {
                if (inList) result.push(`</${listType}>`);
                result.push('<ul>');
                inList = true;
                listType = 'ul';
            }
            result.push(`<li>${formatInline(line.replace(/^[-*]\s+/, ''))}</li>`);
        }
        // Ordered list
        else if (line.match(/^\d+\.\s+(.+)$/)) {
            if (!inList || listType !== 'ol') {
                if (inList) result.push(`</${listType}>`);
                result.push('<ol>');
                inList = true;
                listType = 'ol';
            }
            result.push(`<li>${formatInline(line.replace(/^\d+\.\s+/, ''))}</li>`);
        }
        // Empty line
        else if (line === '') {
            result.push('');
        }
        // Paragraph
        else {
            result.push(`<p>${formatInline(line)}</p>`);
        }
    }

    // Close any open list at end
    if (inList) result.push(`</${listType}>`);

    return result.join('\n');
}

/**
 * Format inline elements: bold, italic, code
 */
function formatInline(text) {
    if (!text) return '';

    return text
        // Code (process first to avoid conflict)
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        // Bold
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/__([^_]+)__/g, '<strong>$1</strong>')
        // Italic
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        .replace(/_([^_]+)_/g, '<em>$1</em>');
}

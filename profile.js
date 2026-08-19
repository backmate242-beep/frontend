// js/profile.js
let allSkills = [];
let mySkills = [];
let extractedSkillsFromResume = []; // ✅ NEW: Store extracted skills

(async function() {
    if (!requireAuth()) return;
    await Promise.all([
        loadUser(), 
        loadStudentProfile(), 
        loadSkills(), 
        loadMySkills(),
        initResumeUpload() // ✅ NEW: Initialize resume upload
    ]);
})();

async function loadUser() {
    try {
        const user = await api.get("/users/me");
        document.getElementById("fullName").value = user.full_name;
        document.getElementById("email").value = user.email;
    } catch (err) { console.error(err); }
}

async function loadStudentProfile() {
    try {
        const profile = await api.get("/students/me");
        document.getElementById("age").value = profile.age || "";
        document.getElementById("gender").value = profile.gender || "";
        document.getElementById("degree").value = profile.degree || "";
        document.getElementById("department").value = profile.department || "";
        document.getElementById("yearOfStudy").value = profile.year_of_study || "";
        document.getElementById("cgpa").value = profile.cgpa || "";
    } catch (err) {
        // Profile doesn't exist yet
    }
}

async function loadSkills() {
    try {
        allSkills = await api.get("/skills/", { limit: 500 });
        const select = document.getElementById("skillSelect");
        select.innerHTML = '<option value="">-- Select a skill --</option>' +
            allSkills.map(s => `<option value="${s.skill_id}">${s.skill_name}</option>`).join("");
    } catch (err) {
        showToast("Failed to load skills", "error");
    }
}

async function loadMySkills() {
    try {
        mySkills = await api.get("/students/me/skills");
        renderMySkills();
    } catch (err) {
        document.getElementById("mySkills").innerHTML = '<p class="text-muted">No skills yet</p>';
    }
}

function renderMySkills() {
    const container = document.getElementById("mySkills");
    if (mySkills.length === 0) {
        container.innerHTML = '<p class="text-muted">No skills added yet</p>';
        return;
    }

    container.innerHTML = mySkills.map(ss => {
        const skill = allSkills.find(s => s.skill_id === ss.skill_id);
        const profClass = ss.proficiency === "Advanced" ? "success" :
                          ss.proficiency === "Intermediate" ? "warning" : "info";
        return `
            <div class="flex-between" style="padding: 0.75rem 0; border-bottom: 1px solid var(--card-border);">
                <div>
                    <strong>${skill ? skill.skill_name : "Unknown"}</strong>
                    <span class="skill-tag ${profClass}" style="margin-left: 0.5rem;">${ss.proficiency}</span>
                </div>
                <button class="btn btn-sm btn-secondary" onclick="removeSkill(${ss.student_skill_id})">Remove</button>
            </div>
        `;
    }).join("");
}

async function updateProfile(event) {
    event.preventDefault();

    const data = {
        age: parseInt(document.getElementById("age").value) || null,
        gender: document.getElementById("gender").value || null,
        degree: document.getElementById("degree").value || null,
        department: document.getElementById("department").value || null,
        year_of_study: parseInt(document.getElementById("yearOfStudy").value) || null,
        cgpa: parseFloat(document.getElementById("cgpa").value) || null
    };

    try {
        const user = api.getUser();
        await api.post("/students/", { ...data, user_id: user.user_id });
        showToast("Profile saved! ✅", "success");
    } catch (err) {
        showToast(err.message || "Failed", "error");
    }
}

async function addSkill(event) {
    event.preventDefault();

    const skillId = document.getElementById("skillSelect").value;
    const proficiency = document.getElementById("proficiency").value;

    if (!skillId) {
        showToast("Please select a skill", "warning");
        return;
    }

    try {
        await api.post("/students/me/skills", {
            skill_id: parseInt(skillId),
            proficiency: proficiency
        });
        showToast("Skill added! ✅", "success");
        document.getElementById("skillSelect").value = "";
        await loadMySkills();
    } catch (err) {
        showToast(err.message || "Failed", "error");
    }
}

async function removeSkill(studentSkillId) {
    if (!confirm("Remove this skill?")) return;

    try {
        await api.delete(`/students/me/skills/${studentSkillId}`);
        showToast("Skill removed!", "success");
        await loadMySkills();
    } catch (err) {
        showToast("Failed to remove", "error");
    }
}

// ============================================================
// ✅ NEW: RESUME UPLOAD + AI SKILL EXTRACTION
// ============================================================

function initResumeUpload() {
    const uploadArea = document.getElementById("uploadArea");
    const fileInput = document.getElementById("resumeFile");

    // Click to browse
    uploadArea.addEventListener("click", () => fileInput.click());

    // File selected
    fileInput.addEventListener("change", (e) => {
        if (e.target.files.length > 0) {
            handleResumeUpload(e.target.files[0]);
        }
    });

    // Drag and drop
    uploadArea.addEventListener("dragover", (e) => {
        e.preventDefault();
        uploadArea.classList.add("dragover");
    });

    uploadArea.addEventListener("dragleave", () => {
        uploadArea.classList.remove("dragover");
    });

    uploadArea.addEventListener("drop", (e) => {
        e.preventDefault();
        uploadArea.classList.remove("dragover");
        if (e.dataTransfer.files.length > 0) {
            handleResumeUpload(e.dataTransfer.files[0]);
        }
    });
}

async function handleResumeUpload(file) {
    // Validate file
    const allowed = ['.pdf', '.docx', '.txt'];
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!allowed.includes(ext)) {
        showResumeStatus("error", "❌ Invalid file type. Please upload PDF, DOCX, or TXT.");
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        showResumeStatus("error", "❌ File too large. Maximum 5MB allowed.");
        return;
    }

    showResumeStatus("loading", `<span class="spinner-small"></span> Uploading and analyzing your resume with AI...`);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("target_career", "Software Engineer"); // Will be dynamic

    try {
        const response = await api.upload("/upload/resume", formData);
        
        showResumeStatus("success", 
            `✅ <strong>${response.filename}</strong> uploaded successfully! (${formatBytes(file.size)})`
        );

        // Extract skills from AI feedback using keyword matching
        const aiText = response.ai_feedback || "";
        const extractedSkills = extractSkillsFromText(aiText);
        
        // Also try to extract from the response if it has structured data
        if (response.extracted_skills) {
            extractedSkills.push(...response.extracted_skills);
        }

        // Deduplicate
        extractedSkillsFromResume = [...new Set(extractedSkills.map(s => s.toLowerCase()))];

        if (extractedSkillsFromResume.length > 0) {
            showExtractedSkills(extractedSkillsFromResume);
        }

        // Show AI analysis
        showAIAnalysis(aiText);

        showToast("Resume analyzed! 🎉", "success");

    } catch (err) {
        console.error("Upload error:", err);
        showResumeStatus("error", `❌ Upload failed: ${err.message || "Unknown error"}`);
        showToast("Resume upload failed", "error");
    }
}

function extractSkillsFromText(text) {
    // Common skills to look for
    const commonSkills = [
        "Python", "JavaScript", "Java", "C++", "C#", "Ruby", "PHP", "Go", "Rust", "Swift", "Kotlin",
        "React", "Angular", "Vue", "Node.js", "Django", "Flask", "Spring", "Express",
        "HTML", "CSS", "SQL", "MySQL", "PostgreSQL", "MongoDB", "Redis", "Elasticsearch",
        "AWS", "Azure", "GCP", "Docker", "Kubernetes", "Jenkins", "Git", "GitHub", "GitLab",
        "Machine Learning", "Deep Learning", "TensorFlow", "PyTorch", "Scikit-learn", "Pandas", "NumPy",
        "Data Analysis", "Data Science", "Statistics", "Excel", "Tableau", "Power BI",
        "Communication", "Leadership", "Teamwork", "Problem Solving", "Critical Thinking",
        "Project Management", "Agile", "Scrum", "Jira", "Confluence",
        "REST API", "GraphQL", "Microservices", "DevOps", "CI/CD", "Linux", "Bash"
    ];

    const found = [];
    const textLower = text.toLowerCase();

    for (const skill of commonSkills) {
        // Check if skill appears in text (case-insensitive)
        if (textLower.includes(skill.toLowerCase())) {
            found.push(skill);
        }
    }

    return found;
}

function showExtractedSkills(skills) {
    const container = document.getElementById("extractedSkills");
    const list = document.getElementById("skillsList");
    
    // Get my current skills for comparison
    const mySkillNames = mySkills.map(ss => {
        const skill = allSkills.find(s => s.skill_id === ss.skill_id);
        return skill ? skill.skill_name.toLowerCase() : "";
    });

    list.innerHTML = skills.map(skill => {
        const isNew = !mySkillNames.includes(skill.toLowerCase());
        return `<span class="skill-chip ${isNew ? 'new' : ''}">${skill}${isNew ? ' ✨' : ''}</span>`;
    }).join("");

    container.classList.add("show");
}

function showAIAnalysis(text) {
    const container = document.getElementById("aiAnalysis");
    const textEl = document.getElementById("aiAnalysisText");
    textEl.textContent = text;
    container.classList.add("show");
}

function showResumeStatus(type, message) {
    const status = document.getElementById("resumeStatus");
    const statusText = document.getElementById("resumeStatusText");
    
    status.className = `resume-status show ${type}`;
    statusText.innerHTML = message;
}

function formatBytes(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

async function addExtractedSkills() {
    if (extractedSkillsFromResume.length === 0) {
        showToast("No skills to add", "warning");
        return;
    }

    const mySkillNames = mySkills.map(ss => {
        const skill = allSkills.find(s => s.skill_id === ss.skill_id);
        return skill ? skill.skill_name.toLowerCase() : "";
    });

    const newSkills = extractedSkillsFromResume.filter(s => 
        !mySkillNames.includes(s.toLowerCase())
    );

    if (newSkills.length === 0) {
        showToast("All extracted skills already exist in your profile!", "info");
        return;
    }

    showToast(`Adding ${newSkills.length} skills...`, "info");

    let added = 0;
    let failed = 0;

    for (const skillName of newSkills) {
        // Find or create the skill
        let skill = allSkills.find(s => s.skill_name.toLowerCase() === skillName.toLowerCase());
        
        if (!skill) {
            // Try to create the skill (admin endpoint, might fail for students)
            try {
                skill = await api.post("/skills/", { skill_name: skillName });
                allSkills.push(skill);
            } catch (err) {
                // If can't create, skip
                failed++;
                continue;
            }
        }

        // Add to student skills
        try {
            await api.post("/students/me/skills", {
                skill_id: skill.skill_id,
                proficiency: "Intermediate"
            });
            added++;
        } catch (err) {
            failed++;
        }
    }

    await loadMySkills();
    
    if (added > 0) {
        showToast(`✅ Added ${added} skills to your profile!`, "success");
        // Hide the extracted skills section
        document.getElementById("extractedSkills").classList.remove("show");
    } else {
        showToast(`⚠️ Could not add skills. Try adding manually.`, "error");
    }
}

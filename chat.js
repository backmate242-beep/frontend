// js/chat.js
let conversationHistory = [];

async function sendMessage(event) {
    event.preventDefault();
    const input = document.getElementById("chatInput");
    const message = input.value.trim();
    if (!message) return;

    addMessage(message, "user");
    input.value = "";

    const typingId = showTyping();

    try {
        const response = await api.post("/ai/chat", {
            message: message,
            history: conversationHistory
        });

        removeTyping(typingId);
        addMessage(response.response, "bot");
        conversationHistory.push(
            { role: "user", content: message },
            { role: "assistant", content: response.response }
        );

        if (conversationHistory.length > 20) {
            conversationHistory = conversationHistory.slice(-20);
        }
    } catch (err) {
        removeTyping(typingId);
        addMessage("Sorry, I'm having trouble. Please try again.", "bot");
    }
}

function sendQuick(message) {
    document.getElementById("chatInput").value = message;
    document.getElementById("chatInput").form.dispatchEvent(new Event('submit'));
}

function addMessage(content, type) {
    const container = document.getElementById("chatMessages");
    const msg = document.createElement("div");
    msg.className = `message ${type}`;
    msg.innerHTML = `
        <div class="message-avatar">${type === "user" ? "👤" : "🤖"}</div>
        <div class="message-content">${content}</div>
    `;
    container.appendChild(msg);
    container.scrollTop = container.scrollHeight;
}

function showTyping() {
    const container = document.getElementById("chatMessages");
    const typing = document.createElement("div");
    const id = "typing-" + Date.now();
    typing.id = id;
    typing.className = "message bot";
    typing.innerHTML = `
        <div class="message-avatar">🤖</div>
        <div class="typing-indicator">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        </div>
    `;
    container.appendChild(typing);
    container.scrollTop = container.scrollHeight;
    return id;
}

function removeTyping(id) {
    const typing = document.getElementById(id);
    if (typing) typing.remove();
}

if (!requireAuth()) {
    // Will redirect
}

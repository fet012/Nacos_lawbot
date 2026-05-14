const express = require("express");
const Groq = require("groq-sdk");
const User = require("../models/User");
const { isLoggedIn } = require("../middleware/auth");
const { retrieveRelevantSections } = require("../utils/retrieve");

const router = express.Router();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Send a message
router.post("/chat", isLoggedIn, async (req, res) => {
  const { message, conversationId } = req.body;

  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "Message is required" });
  }

  try {
    const user = await User.findById(req.user._id);

    // Find or create conversation
    let conversation;
    if (conversationId) {
      conversation = user.conversations.id(conversationId);
    }
    if (!conversation) {
      user.conversations.push({ title: message.slice(0, 50), messages: [] });
      conversation = user.conversations[user.conversations.length - 1];
    }

    // Add user message to history
    conversation.messages.push({ role: "user", content: message });
    conversation.updatedAt = Date.now();

    // Build recent history for context (last 6 messages)
    const recentHistory = conversation.messages.slice(-6).map(m => ({
      role: m.role,
      content: m.content
    }));

    // Get relevant constitution sections
    const relevantContext = retrieveRelevantSections(message);

    const SYSTEM_PROMPT = `You are Law-Bot, an AI assistant that answers questions about the NACOS-LASU Constitution 2026. Always cite exact articles and sections. Only answer constitution-related questions. Be concise but thorough.

Relevant constitution sections:
${relevantContext}`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...recentHistory
      ],
      temperature: 0.3,
      max_tokens: 800
    });

    const reply = completion.choices[0].message.content;

    // Save bot reply to history
    conversation.messages.push({ role: "assistant", content: reply });
    await user.save();

    res.json({
      reply,
      conversationId: conversation._id
    });

  } catch (error) {
    console.error("Chat error:", error.message);
    res.status(500).json({ error: "AI service temporarily unavailable" });
  }
});

// Get all conversations for logged in user
router.get("/conversations", isLoggedIn, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const conversations = user.conversations.map(c => ({
      id: c._id,
      title: c.title,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      messageCount: c.messages.length
    }));
    res.json({ conversations });
  } catch (error) {
    res.status(500).json({ error: "Could not fetch conversations" });
  }
});

// Get a single conversation with full messages
router.get("/conversations/:id", isLoggedIn, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const conversation = user.conversations.id(req.params.id);
    if (!conversation) return res.status(404).json({ error: "Conversation not found" });
    res.json({ conversation });
  } catch (error) {
    res.status(500).json({ error: "Could not fetch conversation" });
  }
});

// Delete a conversation
router.delete("/conversations/:id", isLoggedIn, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.conversations.pull(req.params.id);
    await user.save();
    res.json({ message: "Conversation deleted" });
  } catch (error) {
    res.status(500).json({ error: "Could not delete conversation" });
  }
});

module.exports = router;
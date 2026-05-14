const express = require("express");
const Groq = require("groq-sdk");
const User = require("../models/User");
const { retrieveRelevantSections } = require("../utils/retrieve");

const router = express.Router();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Send a message
router.post("/chat", async (req, res) => {
  const { message, conversationId } = req.body;

  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "Message is required" });
  }

  try {
    const relevantContext = retrieveRelevantSections(message);

    const SYSTEM_PROMPT = `You are Law-Bot, an AI assistant that answers questions about the NACOS-LASU Constitution 2026. Always cite exact articles and sections. Only answer constitution-related questions. Be concise but thorough.

Relevant constitution sections:
${relevantContext}`;

    // Build messages array
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: message }
    ];

    // If user is logged in, load conversation history
    if (req.user && conversationId) {
      const user = await User.findById(req.user._id);
      const conversation = user?.conversations.id(conversationId);
      if (conversation) {
        const recentHistory = conversation.messages.slice(-6).map(m => ({
          role: m.role,
          content: m.content
        }));
        messages.splice(1, 0, ...recentHistory);
      }
    }

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages,
      temperature: 0.3,
      max_tokens: 800
    });

    const reply = completion.choices[0].message.content;

    // Save to DB only if user is logged in
    if (req.user) {
      const user = await User.findById(req.user._id);
      let conversation;

      if (conversationId) {
        conversation = user.conversations.id(conversationId);
      }
      if (!conversation) {
        user.conversations.push({ title: message.slice(0, 50), messages: [] });
        conversation = user.conversations[user.conversations.length - 1];
      }

      conversation.messages.push({ role: "user", content: message });
      conversation.messages.push({ role: "assistant", content: reply });
      conversation.updatedAt = Date.now();
      await user.save();

      return res.json({ reply, conversationId: conversation._id });
    }

    res.json({ reply });

  } catch (error) {
    console.error("Chat error:", error.message);
    res.status(500).json({ error: "AI service temporarily unavailable" });
  }
});

// Get all conversations
router.get("/conversations", async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Not logged in" });
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

// Get single conversation
router.get("/conversations/:id", async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Not logged in" });
  try {
    const user = await User.findById(req.user._id);
    const conversation = user.conversations.id(req.params.id);
    if (!conversation) return res.status(404).json({ error: "Conversation not found" });
    res.json({ conversation });
  } catch (error) {
    res.status(500).json({ error: "Could not fetch conversation" });
  }
});

// Delete conversation
router.delete("/conversations/:id", async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Not logged in" });
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
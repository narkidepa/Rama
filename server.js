const express = require('express');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const OPENCODE_API_KEY = "OPENCODE_API_KEY";
const OPENCODE_BASE_URL = 'https://opencode.ai/zen/v1';

const FREE_MODELS = [
  { id: 'big-pickle', name: 'Big Pickle', provider: 'OpenCode' },
  { id: 'minimax-m2.5-free', name: 'MiniMax M2.5 Free', provider: 'MiniMax' },
  { id: 'glm-5-free', name: 'GLM 5 Free', provider: 'Zhipu' },
  { id: 'kimi-k2.5-free', name: 'Kimi K2.5 Free', provider: 'Moonshot' },
  { id: 'gpt-5-nano', name: 'GPT 5 Nano', provider: 'OpenAI' }
];

app.get('/models', (req, res) => {
  res.json({ models: FREE_MODELS });
});

app.get('/api-key', (req, res) => {
  res.json({ configured: !!OPENCODE_API_KEY });
});

app.post('/chat', async (req, res) => {
  const { message, model = 'big-pickle', history = [] } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const modelInfo = FREE_MODELS.find(m => m.id === model);
  if (!modelInfo) {
    return res.status(400).json({
      error: 'Model not found',
      available_models: FREE_MODELS.map(m => m.id)
    });
  }

  if (!OPENCODE_API_KEY) {
    return res.status(401).json({
      error: 'API key not configured',
      instructions: 'Set OPENCODE_API_KEY environment variable'
    });
  }

  try {
    const messages = [
      ...history.map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: message }
    ];

    const response = await fetch(`${OPENCODE_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENCODE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        stream: false
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error?.message || 'API request failed',
        details: data
      });
    }

    res.json({
      model: data.model,
      message: data.choices[0].message.content,
      usage: data.usage
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OpenCode AI Chat</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0d1117;
      color: #c9d1d9;
      min-height: 100vh;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
      padding: 20px;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 15px 0;
      border-bottom: 1px solid #30363d;
      margin-bottom: 20px;
    }
    h1 { font-size: 1.5rem; color: #58a6ff; }
    .model-select {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .model-select label { color: #8b949e; }
    .model-select select {
      background: #161b22;
      border: 1px solid #30363d;
      color: #c9d1d9;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 14px;
      cursor: pointer;
    }
    .model-select select:hover { border-color: #58a6ff; }
    .chat-container {
      flex: 1;
      display: flex;
      flex-direction: column;
      background: #161b22;
      border-radius: 12px;
      border: 1px solid #30363d;
      overflow: hidden;
    }
    .messages {
      flex: 1;
      padding: 20px;
      overflow-y: auto;
      min-height: 400px;
      max-height: 60vh;
    }
    .message {
      margin-bottom: 20px;
      animation: fadeIn 0.3s ease;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .message.user { text-align: right; }
    .message-content {
      display: inline-block;
      max-width: 80%;
      padding: 12px 16px;
      border-radius: 12px;
      line-height: 1.5;
      white-space: pre-wrap;
      text-align: left;
    }
    .message.user .message-content {
      background: #238636;
      color: #fff;
      border-bottom-right-radius: 4px;
    }
    .message.assistant .message-content {
      background: #21262d;
      color: #c9d1d9;
      border-bottom-left-radius: 4px;
    }
    .message.typing .message-content {
      color: #8b949e;
      font-style: italic;
    }
    .input-container {
      display: flex;
      gap: 10px;
      padding: 15px;
      background: #0d1117;
      border-top: 1px solid #30363d;
    }
    .input-container input {
      flex: 1;
      background: #161b22;
      border: 1px solid #30363d;
      color: #c9d1d9;
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 14px;
      outline: none;
    }
    .input-container input:focus { border-color: #58a6ff; }
    .input-container input::placeholder { color: #6e7681; }
    .input-container button {
      background: #238636;
      color: #fff;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: background 0.2s;
    }
    .input-container button:hover { background: #2ea043; }
    .input-container button:disabled { background: #21262d; cursor: not-allowed; }
    .api-warning {
      background: #1f2328;
      border: 1px solid #f85149;
      color: #f85149;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 20px;
      text-align: center;
    }
    .api-warning a { color: #58a6ff; }
    .clear-btn {
      background: transparent;
      border: 1px solid #30363d;
      color: #8b949e;
      padding: 6px 12px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
      margin-left: 10px;
    }
    .clear-btn:hover { border-color: #f85149; color: #f85149; }
    .model-tag {
      font-size: 11px;
      padding: 2px 8px;
      background: #30363d;
      border-radius: 10px;
      margin-left: 8px;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>🤖 OpenCode AI Chat</h1>
      <div class="model-select">
        <label>Model:</label>
        <select id="modelSelect">
          ${FREE_MODELS.map(m => `<option value="${m.id}">${m.name}</option>`).join('')}
        </select>
      </div>
    </header>
    
    <div id="apiWarning" class="api-warning" style="display: none;">
      ⚠️ API Key নেই! environment variable সেট করুন: <code>OPENCODE_API_KEY</code><br>
      <a href="https://opencode.ai/auth" target="_blank">এখান থেকে Key নিন</a>
    </div>

    <div class="chat-container">
      <div class="messages" id="messages">
        <div class="message assistant">
          <div class="message-content">হ্যালো! আমি OpenCode AI। কোনো মডেল সিলেক্ট করে চ্যাট শুরু করুন। 🚀</div>
        </div>
      </div>
      <div class="input-container">
        <input type="text" id="messageInput" placeholder="আপনার মেসেজ লিখুন..." autocomplete="off">
        <button id="sendBtn">পাঠান</button>
        <button class="clear-btn" id="clearBtn">Clear</button>
      </div>
    </div>
  </div>

  <script>
    const messagesDiv = document.getElementById('messages');
    const messageInput = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');
    const clearBtn = document.getElementById('clearBtn');
    const modelSelect = document.getElementById('modelSelect');
    const apiWarning = document.getElementById('apiWarning');

    let chatHistory = [];

    async function checkApiKey() {
      const res = await fetch('/api-key');
      const data = await res.json();
      if (!data.configured) {
        apiWarning.style.display = 'block';
      }
    }
    checkApiKey();

    function addMessage(content, role) {
      const div = document.createElement('div');
      div.className = 'message ' + role;
      div.innerHTML = '<div class="message-content">' + content + '</div>';
      messagesDiv.appendChild(div);
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    function addTyping() {
      const div = document.createElement('div');
      div.className = 'message assistant typing';
      div.id = 'typing';
      div.innerHTML = '<div class="message-content">টাইপ করছি...</div>';
      messagesDiv.appendChild(div);
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    function removeTyping() {
      const typing = document.getElementById('typing');
      if (typing) typing.remove();
    }

    async function sendMessage() {
      const message = messageInput.value.trim();
      if (!message) return;

      const model = modelSelect.value;
      addMessage(message, 'user');
      messageInput.value = '';
      chatHistory.push({ role: 'user', content: message });

      addTyping();
      sendBtn.disabled = true;

      try {
        const res = await fetch('/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: message,
            model: model,
            history: chatHistory.slice(0, -1)
          })
        });

        const data = await res.json();
        removeTyping();

        if (!res.ok) {
          addMessage('Error: ' + (data.error || 'Something went wrong'), 'assistant');
          return;
        }

        addMessage(data.message, 'assistant');
        chatHistory.push({ role: 'assistant', content: data.message });

      } catch (error) {
        removeTyping();
        addMessage('Error: ' + error.message, 'assistant');
      }

      sendBtn.disabled = false;
      messageInput.focus();
    }

    sendBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') sendMessage();
    });

    clearBtn.addEventListener('click', () => {
      messagesDiv.innerHTML = '<div class="message assistant"><div class="message-content">হ্যালো! আমি OpenCode AI। কোনো মডেল সিলেক্ট করে চ্যাট শুরু করুন। 🚀</div></div>';
      chatHistory = [];
    });
  </script>
</body>
</html>
  `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 OpenCode AI Chat Server: http://localhost:${PORT}`);
  console.log(`Free models: ${FREE_MODELS.map(m => m.name).join(', ')}`);
  console.log(`\nTo get API key: https://opencode.ai/auth`);
  console.log(`Set API key: export OPENCODE_API_KEY=your_key_here`);
});

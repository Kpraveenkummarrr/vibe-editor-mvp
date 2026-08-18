/**
 * mockAI.js
 *
 * Simulates an AI coding assistant response.
 *
 * WHY THIS SHAPE:
 * `getAIResponse` is async and returns { reply, code } so that swapping in a
 * real OpenAI/Claude API later requires no changes to any component — only
 * this function's internals need to change (see README "Next Steps").
 *
 * @param {string} prompt - the user's chat message
 * @returns {Promise<{ reply: string, code: { html: string, css: string, js: string } | null }>}
 */

const SNIPPETS = {
  button: {
    reply: "Sure, I'll create a blue button.",
    code: {
      html: `<button id="my-button">Click me</button>`,
      css: `#my-button {
  padding: 10px 20px;
  background-color: #2563eb;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
}

#my-button:hover {
  background-color: #1d4ed8;
}`,
      js: `document.getElementById("my-button").addEventListener("click", () => {
  alert("Button clicked!");
});`,
    },
  },
  card: {
    reply: "Got it, here's a simple card component.",
    code: {
      html: `<div class="card">
  <h2>Card Title</h2>
  <p>This is a simple card generated from your prompt.</p>
</div>`,
      css: `.card {
  max-width: 320px;
  margin: 40px auto;
  padding: 20px;
  border-radius: 10px;
  background: #1e293b;
  color: #f1f5f9;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  font-family: system-ui, sans-serif;
}

.card h2 {
  margin-top: 0;
}`,
      js: `// No interactivity needed for a static card.`,
    },
  },
  form: {
    reply: "Here's a basic form with a submit handler.",
    code: {
      html: `<form id="demo-form">
  <input type="text" id="name-input" placeholder="Your name" />
  <button type="submit">Submit</button>
</form>
<p id="output"></p>`,
      css: `#demo-form {
  display: flex;
  gap: 8px;
  font-family: system-ui, sans-serif;
  margin: 40px;
}

#demo-form input {
  padding: 8px;
  border-radius: 6px;
  border: 1px solid #334155;
}

#demo-form button {
  padding: 8px 16px;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}`,
      js: `document.getElementById("demo-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = document.getElementById("name-input").value;
  document.getElementById("output").textContent = "Hello, " + name + "!";
});`,
    },
  },
  calculator: {
    reply:
      "Here's a simple calculator that adds two numbers when you click Calculate.",
    code: {
      html: `<div class="calculator">
  <h2>Simple Calculator</h2>
  <input type="number" id="num1" placeholder="First number" />
  <input type="number" id="num2" placeholder="Second number" />
  <button id="calc-btn">Calculate</button>
  <p id="calc-result"></p>
</div>`,
      css: `.calculator {
  max-width: 280px;
  margin: 40px auto;
  padding: 20px;
  border-radius: 10px;
  background: #1e293b;
  color: #f1f5f9;
  font-family: system-ui, sans-serif;
  text-align: center;
}

.calculator input {
  display: block;
  width: 100%;
  margin: 8px 0;
  padding: 8px;
  border-radius: 6px;
  border: 1px solid #334155;
  box-sizing: border-box;
}

.calculator button {
  margin-top: 8px;
  padding: 8px 16px;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.calculator #calc-result {
  margin-top: 12px;
  font-weight: 600;
}`,
      js: `document.getElementById("calc-btn").addEventListener("click", () => {
  const a = parseFloat(document.getElementById("num1").value) || 0;
  const b = parseFloat(document.getElementById("num2").value) || 0;
  document.getElementById("calc-result").textContent = "Result: " + (a + b);
});`,
    },
  },
  heading: {
    reply: "Here's a styled heading you can customize.",
    code: {
      html: `<h1 id="main-heading">Welcome to Vibe Editor</h1>`,
      css: `#main-heading {
  font-family: system-ui, sans-serif;
  text-align: center;
  margin-top: 60px;
  color: #2563eb;
  font-size: 2.5rem;
  letter-spacing: -0.02em;
}`,
      js: `// No interactivity needed for a static heading.`,
    },
  },
};

const DEFAULT_CODE = {
  html: `<div class="hello">
  <h1>Hello from Vibe Editor</h1>
  <p>Describe what you want in the chat, and the code will update here.</p>
</div>`,
  css: `.hello {
  font-family: system-ui, sans-serif;
  text-align: center;
  margin-top: 60px;
  color: #1e293b;
}`,
  js: `// Your generated JavaScript will appear here.`,
};

function matchSnippet(prompt) {
  const lower = prompt.toLowerCase();
  if (lower.includes("button")) return SNIPPETS.button;
  if (lower.includes("card")) return SNIPPETS.card;
  if (lower.includes("calculator")) return SNIPPETS.calculator;
  if (lower.includes("heading")) return SNIPPETS.heading;
  if (lower.includes("form")) return SNIPPETS.form;
  return null;
}

export async function getAIResponse(prompt) {
  // Simulated network delay so the UI's "thinking" state is visible.
  await new Promise((resolve) => setTimeout(resolve, 500));

  if (!prompt || !prompt.trim()) {
    return {
      reply: "Please enter a message describing what you'd like to build.",
      code: null,
    };
  }

  const match = matchSnippet(prompt);

  if (match) {
    return { reply: match.reply, code: match.code };
  }

  return {
    reply: `I've noted your request: "${prompt}". Here's a starting example you can edit — try asking for a "button", "card", "form", "calculator", or "heading" to see a tailored snippet.`,
    code: DEFAULT_CODE,
  };
}
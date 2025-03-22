/**
 * ChatManager class to handle chat functionality including WebSocket connection, message handling, and UI updates.
 * @class
 */
class ChatManager {
  /**
   * Creates a new ChatManager instance.
   * @param {Object} options - Configuration options
   * @param {string} options.target - WebSocket connection target URL
   */
  constructor({ target }) {
    this.messages = [];
    this.isConnected = false;
    this.isError = false;
    this.driver = null;
    this.isWaitingForResponse = false;
    this.markdownRenderer = new MarkdownRenderer();
    this.target = target;

    // DOM Elements
    this.messagesContainer = document.getElementById("messages-container");
    this.chatForm = document.getElementById("chat-form");
    this.messageInput = document.getElementById("message-input");
    this.submitButton = this.chatForm.querySelector('button[type="submit"]');

    this.initializeEventListeners();
  }

  /**
   * Initializes the chat manager and sets up WebSocket connection.
   * Also adds a cleanup event listener for when the window is closed.
   */
  async initialize() {
    const connector = await this.tryConnect();
    window.addEventListener("beforeunload", () => {
      connector?.close();
    });
  }

  /**
   * Attempts to establish a WebSocket connection.
   * @returns {Promise<TGrid.WebSocketConnector|null>} The WebSocket connector if successful, null otherwise
   */
  async tryConnect() {
    try {
      this.isError = false;
      const connector = new TGrid.WebSocketConnector(null, {
        describe: (message) => this.pushMessage(message),
        text: (message) => this.pushMessage(message),
      });
      await connector.connect(this.target);
      this.driver = connector.getDriver();
      this.isConnected = true;
      return connector;
    } catch (e) {
      console.error(e);
      this.isError = true;
    }
  }

  /**
   * Adds a system message to the chat.
   * @param {string} content - The content of the system message
   */
  addSystemMessage(content) {
    this.pushMessage({
      type: "text",
      role: "system",
      text: content,
    });
  }

  /**
   * Pushes a new message to the chat and updates the UI.
   * @param {Object} message - The message object to add
   * @param {string} message.type - The type of message
   * @param {string} message.role - The role of the sender (user/assistant/system)
   * @param {string} message.text - The content of the message
   */
  pushMessage(message) {
    this.messages.push(message);
    const messageElement = this.createMessageElement(message);
    this.messagesContainer.appendChild(messageElement);
    this.scrollToBottom();

    if (message.role === "assistant") {
      this.updateSubmitButton();
    }
  }

  /**
   * Creates a DOM element for a message.
   * @param {Object} message - The message object to create an element for
   * @returns {HTMLElement} The created message element
   */
  createMessageElement(message) {
    const isUser = message.role === "user";
    const div = document.createElement("div");
    div.className = `flex ${isUser ? "justify-end" : "justify-start"}`;

    const messageContent = document.createElement("div");
    messageContent.className = `max-w-[80%] rounded-2xl px-4 py-3 ${
      isUser ? "bg-white text-zinc-900" : "bg-zinc-700/50 text-gray-100"
    }`;

    if (isUser) {
      const p = document.createElement("p");
      p.className = "text-sm whitespace-pre-wrap";
      p.textContent = message.text;
      messageContent.appendChild(p);
    } else {
      const content = document.createElement("div");
      content.className = this.markdownRenderer.getStyles();
      content.innerHTML = this.markdownRenderer.render(message.text);
      messageContent.appendChild(content);
    }

    div.appendChild(messageContent);
    return div;
  }

  /**
   * Scrolls the messages container to the bottom.
   */
  scrollToBottom() {
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }

  /**
   * Updates the submit button's disabled state based on connection and input status.
   */
  updateSubmitButton() {
    const isDisabled =
      !this.isConnected ||
      this.isError ||
      this.isWaitingForResponse ||
      !this.messageInput.value.trim();
    this.submitButton.disabled = isDisabled;
  }

  /**
   * Handles form submission for sending messages.
   * @param {Event} e - The form submission event
   */
  async handleSubmit(e) {
    e.preventDefault();
    const message = this.messageInput.value.trim();
    if (
      !message ||
      !this.isConnected ||
      this.isError ||
      this.isWaitingForResponse
    )
      return;

    try {
      this.isWaitingForResponse = true;
      this.updateSubmitButton();
      this.messageInput.value = "";
      await this.driver.conversate(message);
      this.isWaitingForResponse = false;
      this.messageInput.focus();
      this.updateSubmitButton();
    } catch (e) {
      console.error(e);
      this.isError = true;
      this.isWaitingForResponse = false;
      this.updateSubmitButton();
      this.addSystemMessage("Failed to send message");
    }
  }

  /**
   * Handles keydown events for the message input.
   * @param {KeyboardEvent} e - The keydown event
   */
  handleKeydown(e) {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      this.chatForm.dispatchEvent(new Event("submit"));
    }
  }

  /**
   * Initializes event listeners for the chat form and message input.
   */
  initializeEventListeners() {
    this.chatForm.addEventListener("submit", (e) => this.handleSubmit(e));
    this.messageInput.addEventListener("keydown", (e) => this.handleKeydown(e));
    this.messageInput.addEventListener("input", () =>
      this.updateSubmitButton(),
    );
  }
}

/**
 * MarkdownRenderer class to handle markdown rendering with syntax highlighting.
 * @class
 */
class MarkdownRenderer {
  /**
   * Creates a new MarkdownRenderer instance and initializes the marked library.
   */
  constructor() {
    this.initializeMarked();
  }

  /**
   * Initializes the marked library with custom options for syntax highlighting.
   */
  initializeMarked() {
    marked.setOptions({
      highlight: (code, lang) => {
        if (lang && hljs.getLanguage(lang)) {
          try {
            return hljs.highlight(code, { language: lang }).value;
          } catch (__) {}
        }
        return hljs.highlightAuto(code).value;
      },
      langPrefix: "hljs language-",
      breaks: true,
      gfm: true,
    });
  }

  /**
   * Returns the CSS styles for markdown rendering.
   * @returns {string} The CSS styles as a string
   */
  getStyles() {
    return `
      prose prose-invert max-w-none
      [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-white [&_h1]:mb-4 [&_h1]:border-b [&_h1]:border-zinc-700 [&_h1]:pb-2
      [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-white [&_h2]:mb-3
      [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-white [&_h3]:mb-2
      [&_p]:text-sm [&_p]:text-gray-300 [&_p]:leading-relaxed [&_p]:mb-4 [&_p:last-child]:mb-0
      [&_strong]:font-semibold [&_strong]:text-white
      [&_em]:italic [&_em]:text-gray-300
      [&_a]:text-blue-400 [&_a:hover]:text-blue-300 [&_a]:transition-colors [&_a]:underline
      [&_code:not(pre_code)]:bg-zinc-800/70 [&_code:not(pre_code)]:px-1.5 [&_code:not(pre_code)]:py-0.5 [&_code:not(pre_code)]:rounded [&_code:not(pre_code)]:text-gray-200 [&_code:not(pre_code)]:text-sm [&_code:not(pre_code)]:border [&_code:not(pre_code)]:border-zinc-700/50
      [&_pre]:relative [&_pre]:group [&_pre]:rounded-lg [&_pre]:bg-zinc-800/50 [&_pre]:my-4 [&_pre]:border [&_pre]:border-zinc-700/50
      [&_pre::before]:absolute [&_pre::before]:top-0 [&_pre::before]:right-0 [&_pre::before]:px-4 [&_pre::before]:py-2 [&_pre::before]:text-xs [&_pre::before]:text-gray-400 [&_pre::before]:uppercase [&_pre::before]:bg-zinc-800/80 [&_pre::before]:rounded-bl-lg [&_pre::before]:border-l [&_pre::before]:border-b [&_pre::before]:border-zinc-700/50
      [&_pre_code]:block [&_pre_code]:overflow-x-auto [&_pre_code]:p-4 [&_pre_code]:text-sm [&_pre_code]:leading-relaxed
      [&_ul]:list-none [&_ul]:space-y-2 [&_ul]:my-4 [&_ul]:pl-4
      [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:my-4 [&_ol]:pl-8
      [&_li]:text-sm [&_li]:text-gray-300 [&_li]:leading-relaxed
      [&_ul_li]:relative [&_ul_li]:pl-6
      [&_ul_li::before]:absolute [&_ul_li::before]:left-1 [&_ul_li::before]:content-['-'] [&_ul_li::before]:text-blue-400 [&_ul_li::before]:text-xs [&_ul_li::before]:top-[0.4rem]
      [&_blockquote]:border-l-2 [&_blockquote]:border-blue-400 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-gray-300 [&_blockquote]:mb-4 [&_blockquote:last-child]:mb-0 [&_blockquote]:bg-zinc-800/30 [&_blockquote]:py-2 [&_blockquote]:rounded-r-lg
      [&_hr]:my-8 [&_hr]:border-zinc-700
      [&_table]:w-full [&_table]:my-4 [&_table]:border-collapse [&_table]:border [&_table]:border-zinc-700
      [&_th]:bg-zinc-800/50 [&_th]:text-left [&_th]:px-4 [&_th]:py-2 [&_th]:border [&_th]:border-zinc-700 [&_th]:text-sm [&_th]:font-medium [&_th]:text-white
      [&_td]:px-4 [&_td]:py-2 [&_td]:border [&_td]:border-zinc-700 [&_td]:text-sm [&_td]:text-gray-300
    `;
  }

  /**
   * Renders markdown text to HTML with syntax highlighting.
   * @param {string} text - The markdown text to render
   * @returns {string} The rendered HTML
   */
  render(text) {
    const html = marked.parse(text);
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    // Add language label to code blocks
    const preElements = doc.querySelectorAll("pre");
    preElements.forEach((pre) => {
      const code = pre.querySelector("code");
      if (code) {
        const className = code.className;
        const match = /language-(\w+)/.exec(className || "");
        const language = match ? match[1].toUpperCase() : "PLAINTEXT";

        const label = doc.createElement("div");
        label.className =
          "absolute top-0 right-0 px-4 py-2 text-xs text-gray-400 uppercase bg-zinc-800/80 rounded-bl-lg border-l border-b border-zinc-700/50";
        label.textContent = language;

        pre.insertBefore(label, pre.firstChild);
      }
    });

    return doc.body.innerHTML;
  }
}

// Initialize chat with WebSocket target
const chatManager = new ChatManager({ target: "/chat" });
chatManager.initialize();

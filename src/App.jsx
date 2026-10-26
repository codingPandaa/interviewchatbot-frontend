
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { isValidElement } from "react";
import "./App.css";
import { streamQuestion } from "./services/chatService";

function App() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([
    {
      type: "bot",
      text: "Hello! Ask me a Java Full Stack interview question."
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);

  const messagesEndRef = useRef(null);
  const copyTimeoutRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth"
    });
  }, [messages, loading]);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  const handleCopyCode = async (code, codeId) => {
    try {
      await navigator.clipboard.writeText(code);

      setCopiedCode(codeId);

      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }

      copyTimeoutRef.current = setTimeout(() => {
        setCopiedCode((current) =>
          current === codeId ? null : current
        );
      }, 2000);
    } catch (error) {
      console.error("Failed to copy code:", error);
    }
  };

  const markdownComponents = {
    pre({ children }) {
      const codeElement = Array.isArray(children)
        ? children.find(
            (child) =>
              isValidElement(child) && child.type === "code"
          )
        : children;

      if (!isValidElement(codeElement) || codeElement.type !== "code") {
        return <pre>{children}</pre>;
      }

      const code = String(
        codeElement.props.children ?? ""
      ).replace(/\n$/, "");

      const language =
        codeElement.props.className
          ?.split(" ")
          .find((className) => className.startsWith("language-"))
          ?.replace("language-", "") || "Code";

      const codeId = `${code.length}-${code.slice(0, 30)}`;

      return (
        <div className="code-block-wrapper">
          <div className="code-block-header">
            <span className="code-language">{language}</span>

            <button
              type="button"
              className="copy-code-button"
              onClick={() => handleCopyCode(code, codeId)}
              aria-label={
                copiedCode === codeId
                  ? "Code copied"
                  : "Copy code"
              }
              title="Copy code"
            >
              {copiedCode === codeId ? (
                <>
                  <span aria-hidden="true">✓</span>
                  Copied!
                </>
              ) : (
                <>
                  <span aria-hidden="true">▢</span>
                  Copy code
                </>
              )}
            </button>
          </div>

          <pre>{children}</pre>
        </div>
      );
    }
  };

  const handleSend = async () => {
    if (!question.trim() || loading) {
      return;
    }

    const userQuestion = question.trim();

    setQuestion("");
    setLoading(true);

    setMessages((previousMessages) => [
      ...previousMessages,
      { type: "user", text: userQuestion },
      { type: "bot", text: "" }
    ]);

    try {
      await streamQuestion(userQuestion, (chunk) => {
        setMessages((previousMessages) => {
          const updatedMessages = [...previousMessages];
          const lastMessageIndex = updatedMessages.length - 1;

          updatedMessages[lastMessageIndex] = {
            ...updatedMessages[lastMessageIndex],
            text:
              updatedMessages[lastMessageIndex].text + chunk
          };

          return updatedMessages;
        });
      });
    } catch (error) {
      console.error(error);

      setMessages((previousMessages) => {
        const updatedMessages = [...previousMessages];
        const lastMessageIndex = updatedMessages.length - 1;

        updatedMessages[lastMessageIndex] = {
          type: "bot",
          text:
            "Sorry, something went wrong while processing your question."
        };

        return updatedMessages;
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <div className="chat-container">
        <div className="chat-header">
          <div className="header-title">
            Java Full Stack Interview Assistant
          </div>

          <div className="header-subtitle">
            Java • Spring Boot • Microservices • React • Kafka • Redis
          </div>
        </div>

        <div className="chat-messages">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`message-row ${
                message.type === "user" ? "user-row" : "bot-row"
              }`}
            >
              <div
                className={`message ${
                  message.type === "user"
                    ? "user-message"
                    : "bot-message"
                }`}
              >
                {message.type === "bot" ? (
                  message.text ? (
                    <ReactMarkdown components={markdownComponents}>
                      {message.text}
                    </ReactMarkdown>
                  ) : (
                    loading && (
                      <div className="thinking">
                        <span>Thinking</span>

                        <span className="dots">
                          <span>.</span>
                          <span>.</span>
                          <span>.</span>
                        </span>
                      </div>
                    )
                  )
                ) : (
                  message.text
                )}
              </div>
            </div>
          ))}

          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input-container">
          <input
            type="text"
            value={question}
            placeholder="Ask an interview question..."
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                handleSend();
              }
            }}
            disabled={loading}
          />

          <button
            onClick={handleSend}
            disabled={loading || !question.trim()}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;

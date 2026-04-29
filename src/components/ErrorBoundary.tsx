import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}
interface State {
  error: Error | null;
  showDetails: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, showDetails: false };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: unknown) {
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary] caught:", error, info);
    // Best-effort уведомление учителя о падении клиента
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-copy-attempt`;
      fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? ""}`,
        },
        body: JSON.stringify({
          studentName: "(система)",
          grade: "?",
          subject: "informatics",
          event: `💥 Белый экран у ученика. ${error.name}: ${error.message}. UA=${navigator.userAgent.slice(0, 120)}`,
        }),
        keepalive: true,
      }).catch(() => {});
    } catch {
      /* ignore */
    }
  }

  reload = () => {
    try {
      window.location.reload();
    } catch {
      /* ignore */
    }
  };

  render() {
    if (!this.state.error) return this.props.children;
    const { error, showDetails } = this.state;
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
        background: "#f4f7f6",
        fontFamily: "system-ui, -apple-system, sans-serif",
        color: "#1a2e22",
      }}>
        <div style={{
          maxWidth: 480,
          width: "100%",
          background: "#fff",
          borderRadius: 12,
          padding: "2rem 1.5rem",
          boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
          textAlign: "center",
        }}>
          <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>⚠️</div>
          <h1 style={{ fontSize: "1.25rem", margin: "0 0 0.75rem", fontWeight: 700 }}>
            {this.props.fallbackTitle ?? "Что-то пошло не так"}
          </h1>
          <p style={{ color: "#5a6b62", marginBottom: "1.25rem", lineHeight: 1.5 }}>
            Страница не смогла загрузиться. Попробуйте обновить — обычно это помогает.
            Если не помогло, сообщите учителю.
          </p>
          <button
            onClick={this.reload}
            style={{
              background: "#16a34a",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "0.7rem 1.5rem",
              fontSize: "1rem",
              fontWeight: 600,
              cursor: "pointer",
              marginRight: 8,
            }}
          >
            🔄 Перезагрузить
          </button>
          <button
            onClick={() => this.setState({ showDetails: !showDetails })}
            style={{
              background: "transparent",
              color: "#5a6b62",
              border: "1px solid #d4d8d6",
              borderRadius: 8,
              padding: "0.7rem 1rem",
              fontSize: "0.9rem",
              cursor: "pointer",
            }}
          >
            {showDetails ? "Скрыть детали" : "Детали ошибки"}
          </button>
          {showDetails && (
            <pre style={{
              marginTop: "1rem",
              padding: "0.75rem",
              background: "#f4f7f6",
              borderRadius: 6,
              fontSize: "0.75rem",
              textAlign: "left",
              overflowX: "auto",
              color: "#7a4a4a",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}>
              {error.name}: {error.message}
              {error.stack ? `\n\n${error.stack.slice(0, 500)}` : ""}
            </pre>
          )}
        </div>
      </div>
    );
  }
}

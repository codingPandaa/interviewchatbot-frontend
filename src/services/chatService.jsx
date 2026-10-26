const API_URL = "http://localhost:8080/api/rag/chat";

export const streamQuestion = async (question, onChunk) => {

    const response = await fetch(
        `${API_URL}?question=${encodeURIComponent(question)}`
    );

    if (!response.ok) {
        throw new Error("Failed to get response from server");
    }

    if (!response.body) {
        throw new Error("Streaming is not supported by this browser");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");

    let buffer = "";

    while (true) {

        const { value, done } = await reader.read();

        if (done) {
            break;
        }

        buffer += decoder.decode(value, {
            stream: true
        });

        // SSE events are separated by a blank line
        const events = buffer.split(/\r?\n\r?\n/);

        // Keep incomplete event for next iteration
        buffer = events.pop() || "";

        for (const event of events) {

            const lines = event.split(/\r?\n/);

            const dataLines = lines
                .filter((line) => line.startsWith("data:"))
                .map((line) => line.substring(5));

            if (dataLines.length > 0) {

                // SSE specification:
                // multiple data lines belong to the same event
                const chunk = dataLines.join("\n");

                if (chunk) {
                    onChunk(chunk);
                }
            }
        }
    }

    // Process any remaining event
    if (buffer.trim() !== "") {

        const lines = buffer.split(/\r?\n/);

        const dataLines = lines
            .filter((line) => line.startsWith("data:"))
            .map((line) => line.substring(5));

        if (dataLines.length > 0) {

            const chunk = dataLines.join("\n");

            if (chunk) {
                onChunk(chunk);
            }
        }
    }
};
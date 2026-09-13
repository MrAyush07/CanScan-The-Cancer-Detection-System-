const API_BASE_URL =
    import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";

export async function analyzeImage(file) {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${API_BASE_URL}/api/analyze`, {
        method: "POST",
        body: formData
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Analysis failed");
    }

    return response.json();
}

export async function getRecords() {
    const response = await fetch(`${API_BASE_URL}/api/records`);

    if (!response.ok) {
        throw new Error("Failed to fetch records");
    }

    return response.json();
}

export async function verifyRecord(id, imageHash) {
    const response = await fetch(
        `${API_BASE_URL}/api/records/${id}/verify/${imageHash}`
    );

    if (!response.ok) {
        throw new Error("Verification failed");
    }

    return response.json();
}

export async function getBlockchainStatus() {
    const response = await fetch(`${API_BASE_URL}/api/blockchain/status`);

    if (!response.ok) {
        throw new Error("Failed to fetch blockchain status");
    }

    return response.json();
}
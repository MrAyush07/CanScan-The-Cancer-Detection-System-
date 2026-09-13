import { useEffect, useState } from "react";
import {
    analyzeImage,
    getBlockchainStatus,
    getRecords,
    verifyRecord
} from "./api";
import "./App.css";

function App() {
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState("");
    const [result, setResult] = useState(null);
    const [records, setRecords] = useState([]);
    const [blockchain, setBlockchain] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [verification, setVerification] = useState({});

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            const [recordsData, blockchainData] = await Promise.all([
                getRecords(),
                getBlockchainStatus()
            ]);

            setRecords(recordsData);
            setBlockchain(blockchainData);
        } catch (err) {
            setError("Unable to connect to backend.");
        }
    }

    function handleFileChange(event) {
        const selectedFile = event.target.files[0];

        if (!selectedFile) {
            return;
        }

        setFile(selectedFile);
        setPreview(URL.createObjectURL(selectedFile));
        setResult(null);
        setError("");
    }

    async function handleAnalyze() {
        if (!file) {
            setError("Please select an image first.");
            return;
        }

        setLoading(true);
        setError("");
        setResult(null);

        try {
            const data = await analyzeImage(file);
            setResult(data);
            await loadData();
        } catch (err) {
            setError(err.message || "Analysis failed.");
        } finally {
            setLoading(false);
        }
    }

    async function handleVerify(id, imageHash) {
        try {
            const data = await verifyRecord(id, imageHash);

            setVerification((previous) => ({
                ...previous,
                [id]: data.valid
            }));
        } catch (err) {
            setError("Verification failed.");
        }
    }

    return (
        <div className="app">
            <header className="header">
                <div>
                    <h1>CanScan</h1>
                    <p>Blockchain-Integrated Skin Cancer Detection</p>
                </div>

                <div className="status">
                    <span className="status-dot"></span>
                    System Online
                </div>
            </header>

            <main>
                <section className="hero">
                    <h2>AI-Powered Skin Lesion Analysis</h2>
                    <p>
                        Upload a skin lesion image to generate an AI prediction,
                        explainable Grad-CAM visualization, and blockchain-backed
                        diagnostic record.
                    </p>
                </section>

                {error && (
                    <div className="error">
                        {error}
                    </div>
                )}

                <section className="analysis-grid">
                    <div className="card upload-card">
                        <h3>Upload Image</h3>

                        <label className="upload-area">
                            {preview ? (
                                <img
                                    src={preview}
                                    alt="Selected lesion"
                                    className="preview"
                                />
                            ) : (
                                <>
                                    <div className="upload-icon">↑</div>
                                    <strong>Choose skin lesion image</strong>
                                    <span>JPG or PNG</span>
                                </>
                            )}

                            <input
                                type="file"
                                accept="image/png,image/jpeg"
                                onChange={handleFileChange}
                            />
                        </label>

                        {file && (
                            <p className="filename">
                                {file.name}
                            </p>
                        )}

                        <button
                            className="primary-button"
                            onClick={handleAnalyze}
                            disabled={!file || loading}
                        >
                            {loading ? "Analyzing..." : "Analyze Image"}
                        </button>
                    </div>

                    <div className="card result-card">
                        <h3>AI Analysis</h3>

                        {!result && !loading && (
                            <div className="empty-state">
                                Upload an image and click Analyze Image.
                            </div>
                        )}

                        {loading && (
                            <div className="empty-state">
                                Running DenseNet121 and generating Grad-CAM...
                            </div>
                        )}

                        {result && (
                            <>
                                <div
                                    className={`prediction ${
                                        result.prediction === "Benign"
                                            ? "benign"
                                            : "risk"
                                    }`}
                                >
                                    <span>Prediction</span>
                                    <strong>{result.prediction}</strong>
                                </div>

                                <div className="metrics">
                                    <div>
                                        <span>Confidence</span>
                                        <strong>{result.confidence}%</strong>
                                    </div>

                                    <div>
                                        <span>Malignant Probability</span>
                                        <strong>
                                            {result.malignant_probability}%
                                        </strong>
                                    </div>

                                    <div>
                                        <span>Decision Threshold</span>
                                        <strong>{result.threshold}</strong>
                                    </div>
                                </div>

                                <div className="heatmap">
                                    <h4>Grad-CAM Explanation</h4>

                                    <img
                                        src={result.heatmap_url}
                                        alt="Grad-CAM visualization"
                                    />
                                </div>
                            </>
                        )}
                    </div>
                </section>

                {result && (
                    <section className="card blockchain-card">
                        <h3>Blockchain Record</h3>

                        <div className="blockchain-grid">
                            <div>
                                <span>Image SHA-256</span>
                                <code>{result.imageHash}</code>
                            </div>

                            <div>
                                <span>IPFS CID</span>
                                <code>{result.ipfsCID}</code>
                            </div>

                            <div>
                                <span>Transaction Hash</span>
                                <code>{result.transactionHash}</code>
                            </div>
                        </div>

                        <div className="verified">
                            ✓ Record successfully stored on Ethereum Sepolia
                        </div>
                    </section>
                )}

                <section className="card">
                    <div className="section-header">
                        <div>
                            <h3>Blockchain Records</h3>
                            <p>Immutable diagnostic audit trail</p>
                        </div>

                        {blockchain && (
                            <div className="chain-info">
                                <span>Sepolia</span>
                                <span>
                                    Records: {blockchain.recordCount}
                                </span>
                            </div>
                        )}
                    </div>

                    {records.length === 0 ? (
                        <div className="empty-state">
                            No blockchain records yet.
                        </div>
                    ) : (
                        <div className="records">
                            {records.map((record) => (
                                <div className="record" key={record.id}>
                                    <div>
                                        <strong>
                                            Record #{record.id}
                                        </strong>

                                        <span>
                                            {record.prediction}
                                        </span>
                                    </div>

                                    <div>
                                        <small>Image Hash</small>
                                        <code>{record.imageHash}</code>
                                    </div>

                                    <button
                                        className="verify-button"
                                        onClick={() =>
                                            handleVerify(
                                                record.id,
                                                record.imageHash
                                            )
                                        }
                                    >
                                        Verify
                                    </button>

                                    {verification[record.id] !== undefined && (
                                        <div
                                            className={
                                                verification[record.id]
                                                    ? "valid"
                                                    : "invalid"
                                            }
                                        >
                                            {verification[record.id]
                                                ? "✓ VALID"
                                                : "✕ MODIFIED"}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </main>

            <footer>
                <strong>CanScan</strong>
                <span>
                    Prototype decision-support system. Not a substitute for
                    professional medical diagnosis.
                </span>
            </footer>
        </div>
    );
}

export default App;
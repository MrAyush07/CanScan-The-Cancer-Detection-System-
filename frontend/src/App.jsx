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
            setError("Unable to connect to CanScan backend.");
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
            setError("Please select a skin lesion image first.");
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
        } catch {
            setError("Blockchain verification failed.");
        }
    }

    return (
        <div className="app">
            <header className="header">
                <div className="brand">
                    <h1>CanScan</h1>
                    <span>AI for Healthier Tomorrows</span>
                </div>

                <nav className="navigation">
                    <a href="#home">Home</a>
                    <a href="#analysis">How It Works</a>
                    <a href="#analysis">AI Analysis</a>
                    <a href="#records">Reports</a>
                    <a href="#blockchain">Blockchain</a>
                </nav>

                <div className="header-actions">
                    <div className="status">
                        <span className="status-dot"></span>
                        System Online
                    </div>

                    <button
                        className="header-button"
                        onClick={() =>
                            document
                                .getElementById("analysis")
                                ?.scrollIntoView({ behavior: "smooth" })
                        }
                    >
                        Analyze Image
                    </button>
                </div>
            </header>

            <main>
                <section className="hero" id="home">
                    <div className="hero-content">
                        <div className="hero-label">
                            AI-POWERED SKIN CANCER DETECTION
                        </div>

                        <h2>
                            Early Detection.
                            <br />
                            <span>A Healthier Tomorrow.</span>
                        </h2>

                        <p>
                            Upload a skin lesion image to receive an AI-assisted
                            assessment, visual explanation with Grad-CAM, and a
                            blockchain-verified diagnostic record.
                        </p>

                        <div className="feature-list">
                            <div className="feature">
                                <strong>AI</strong>
                                <span>Detection</span>
                            </div>

                            <div className="feature">
                                <strong>◉</strong>
                                <span>Grad-CAM Explainability</span>
                            </div>

                            <div className="feature">
                                <strong>⌁</strong>
                                <span>Blockchain Security</span>
                            </div>

                            <div className="feature">
                                <strong>▣</strong>
                                <span>IPFS Storage</span>
                            </div>
                        </div>
                    </div>

                    <div className="hero-visual">
                        <div className="medical-orb"></div>

                        <div className="hero-panel">
                            <span>CANSCAN AI</span>
                            <strong>
                                Intelligent
                                <br />
                                Skin Analysis
                            </strong>

                            <div className="hero-panel-line">
                                <i></i>
                                Lesion Detection
                            </div>

                            <div className="hero-panel-line">
                                <i></i>
                                Risk Assessment
                            </div>

                            <div className="hero-panel-line">
                                <i></i>
                                Secure Record
                            </div>
                        </div>
                    </div>
                </section>

                {error && (
                    <div className="error">
                        {error}
                    </div>
                )}

                <section className="analysis-section" id="analysis">
                    <div className="section-heading">
                        <div>
                            <span>DIAGNOSTIC WORKSPACE</span>
                            <h3>Analyze a Skin Lesion</h3>
                        </div>

                        <p>
                            AI-assisted analysis with explainable visualization
                            and tamper-resistant record keeping.
                        </p>
                    </div>

                    <div className="analysis-grid">
                        <div className="upload-card">
                            <div className="card-title">
                                <div className="title-icon">↑</div>
                                <div>
                                    <span>STEP 01</span>
                                    <h3>Upload Skin Lesion Image</h3>
                                </div>
                            </div>

                            <label className="upload-area">
                                {preview ? (
                                    <img
                                        src={preview}
                                        alt="Selected skin lesion"
                                        className="preview"
                                    />
                                ) : (
                                    <>
                                        <div className="upload-icon">↑</div>
                                        <strong>
                                            Drag & drop your image here
                                        </strong>
                                        <span>
                                            or click to browse
                                        </span>
                                        <small>
                                            Supports JPG, PNG · Maximum 10MB
                                        </small>
                                    </>
                                )}

                                <input
                                    type="file"
                                    accept="image/png,image/jpeg"
                                    onChange={handleFileChange}
                                />
                            </label>

                            {file && (
                                <div className="selected-file">
                                    <span>Selected image</span>
                                    <strong>{file.name}</strong>
                                </div>
                            )}

                            <button
                                className="primary-button"
                                onClick={handleAnalyze}
                                disabled={!file || loading}
                            >
                                {loading
                                    ? "Analyzing Image..."
                                    : "Analyze Image"}
                            </button>
                        </div>

                        <div className="result-card">
                            <div className="card-title">
                                <div className="title-icon green">✓</div>
                                <div>
                                    <span>STEP 02</span>
                                    <h3>Analysis Result</h3>
                                </div>
                            </div>

                            {!result && !loading && (
                                <div className="result-empty">
                                    <div className="empty-symbol">✦</div>
                                    <strong>
                                        Your analysis will appear here
                                    </strong>
                                    <span>
                                        Upload a skin lesion image to begin.
                                    </span>
                                </div>
                            )}

                            {loading && (
                                <div className="result-empty">
                                    <div className="loading-ring"></div>
                                    <strong>
                                        Analyzing the lesion...
                                    </strong>
                                    <span>
                                        Running DenseNet121 and generating
                                        Grad-CAM explanation.
                                    </span>
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
                                        <div>
                                            <span>AI ASSESSMENT</span>
                                            <strong>
                                                {result.prediction}
                                            </strong>
                                        </div>

                                        <div className="confidence-ring">
                                            <div>
                                                <strong>
                                                    {result.confidence}%
                                                </strong>
                                                <span>Confidence</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="metrics">
                                        <div>
                                            <span>
                                                Malignant Probability
                                            </span>
                                            <strong>
                                                {
                                                    result.malignant_probability
                                                }
                                                %
                                            </strong>
                                        </div>

                                        <div>
                                            <span>Model</span>
                                            <strong>DenseNet121</strong>
                                        </div>

                                        <div>
                                            <span>Threshold</span>
                                            <strong>
                                                {result.threshold}
                                            </strong>
                                        </div>
                                    </div>

                                    <div className="heatmap">
                                        <div className="heatmap-heading">
                                            <span>EXPLAINABLE AI</span>
                                            <h4>Grad-CAM Visualization</h4>
                                        </div>

                                        <div className="heatmap-image">
                                            <img
                                                src={result.heatmap_url}
                                                alt="Grad-CAM explanation"
                                            />
                                        </div>

                                        <small>
                                            Highlighted regions represent
                                            areas that influenced the model's
                                            prediction.
                                        </small>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </section>

                {result && (
                    <section
                        className="blockchain-card"
                        id="blockchain"
                    >
                        <div className="blockchain-heading">
                            <div className="blockchain-icon">✓</div>

                            <div>
                                <span>STEP 03 · SECURE RECORD</span>
                                <h3>Blockchain Verified Record</h3>
                                <p>
                                    The diagnostic record is stored on IPFS
                                    and immutably recorded on Ethereum
                                    Sepolia.
                                </p>
                            </div>
                        </div>

                        <div className="blockchain-grid">
                            <div>
                                <span>SHA-256 HASH</span>
                                <code>{result.imageHash}</code>
                            </div>

                            <div>
                                <span>IPFS CID</span>
                                <code>{result.ipfsCID}</code>
                            </div>

                            <div>
                                <span>TRANSACTION HASH</span>
                                <code>{result.transactionHash}</code>
                            </div>

                            <div className="verified-badge">
                                <span>●</span>
                                Verified on Sepolia
                            </div>
                        </div>
                    </section>
                )}

                <section className="records-section" id="records">
                    <div className="section-heading">
                        <div>
                            <span>SECURE AUDIT TRAIL</span>
                            <h3>Recent Analyses</h3>
                        </div>

                        {blockchain && (
                            <div className="network-badge">
                                <span>●</span>
                                Ethereum Sepolia · {blockchain.recordCount}{" "}
                                records
                            </div>
                        )}
                    </div>

                    {records.length === 0 ? (
                        <div className="records-empty">
                            No blockchain records available yet.
                        </div>
                    ) : (
                        <div className="records-table">
                            <div className="table-header">
                                <span>RECORD</span>
                                <span>PREDICTION</span>
                                <span>CONFIDENCE</span>
                                <span>IMAGE HASH</span>
                                <span>STATUS</span>
                            </div>

                            {records.map((record) => (
                                <div className="record-row" key={record.id}>
                                    <strong>
                                        #{record.id}
                                    </strong>

                                    <span
                                        className={
                                            record.prediction === "Benign"
                                                ? "prediction-label benign-text"
                                                : "prediction-label risk-text"
                                        }
                                    >
                                        {record.prediction}
                                    </span>

                                    <span>
                                        {(Number(record.confidence) / 100).toFixed(
                                            2
                                        )}
                                        %
                                    </span>

                                    <code>{record.imageHash}</code>

                                    <div className="record-status">
                                        {verification[record.id] ===
                                        undefined ? (
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
                                        ) : verification[record.id] ? (
                                            <span className="valid">
                                                ✓ Verified
                                            </span>
                                        ) : (
                                            <span className="invalid">
                                                ✕ Modified
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </main>

            <footer>
                <div>
                    <strong>CanScan</strong>
                    <span>AI for Healthier Tomorrows</span>
                </div>

                <p>
                    Prototype decision-support system. Not a substitute for
                    professional medical diagnosis.
                </p>
            </footer>
        </div>
    );
}

export default App;
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { ethers } = require("ethers");
const path = require("path");
const multer = require("multer");
const axios = require("axios");
const FormData = require("form-data");
const crypto = require("crypto");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024
    }
});

const abiPath = path.join(
    __dirname,
    "abi",
    "CancerRecords.json"
);

const contractArtifact = require(abiPath);

const provider = new ethers.JsonRpcProvider(
    process.env.SEPOLIA_RPC_URL
);

const wallet = new ethers.Wallet(
    process.env.PRIVATE_KEY,
    provider
);

const contract = new ethers.Contract(
    process.env.CONTRACT_ADDRESS,
    contractArtifact.abi,
    wallet
);

async function uploadToIPFS(
    buffer,
    filename,
    mimetype
) {
    if (!process.env.PINATA_JWT) {
        throw new Error(
            "PINATA_JWT is not configured"
        );
    }

    const form = new FormData();

    form.append(
        "file",
        buffer,
        {
            filename,
            contentType: mimetype
        }
    );

    const response = await axios.post(
        "https://api.pinata.cloud/pinning/pinFileToIPFS",
        form,
        {
            headers: {
                ...form.getHeaders(),
                Authorization:
                    `Bearer ${process.env.PINATA_JWT}`
            },
            maxBodyLength: Infinity
        }
    );

    return response.data.IpfsHash;
}

app.get("/", (req, res) => {
    res.json({
        message:
            "CanScan Backend API is running"
    });
});

app.get("/api/health", (req, res) => {
    res.json({
        status: "healthy",
        service: "CanScan Backend"
    });
});

app.get(
    "/api/blockchain/status",
    async (req, res) => {
        try {
            const network =
                await provider.getNetwork();

            const balance =
                await provider.getBalance(
                    wallet.address
                );

            const count =
                await contract.getRecordCount();

            res.json({
                network: network.name,
                chainId:
                    network.chainId.toString(),
                walletAddress:
                    wallet.address,
                balance:
                    ethers.formatEther(balance),
                recordCount:
                    count.toString(),
                contractAddress:
                    process.env.CONTRACT_ADDRESS
            });
        } catch (error) {
            console.error(error);

            res.status(500).json({
                error:
                    "Blockchain connection failed"
            });
        }
    }
);

app.post(
    "/api/predict",
    upload.single("file"),
    async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({
                    error:
                        "No image file provided"
                });
            }

            const form = new FormData();

            form.append(
                "file",
                req.file.buffer,
                {
                    filename:
                        req.file.originalname,
                    contentType:
                        req.file.mimetype
                }
            );

            const response = await axios.post(
                `${process.env.ML_API_URL}/predict`,
                form,
                {
                    headers:
                        form.getHeaders(),
                    maxBodyLength: Infinity
                }
            );

            const prediction =
                response.data;

            if (prediction.heatmap_url) {
                prediction.heatmap_url =
                    `${process.env.ML_API_URL}${prediction.heatmap_url}`;
            }

            res.json(prediction);
        } catch (error) {
            console.error(
                error.response?.data ||
                error.message ||
                error
            );

            res.status(500).json({
                error:
                    "Prediction service failed"
            });
        }
    }
);

app.post(
    "/api/analyze",
    upload.single("file"),
    async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({
                    error:
                        "No image file provided"
                });
            }

            const form = new FormData();

            form.append(
                "file",
                req.file.buffer,
                {
                    filename:
                        req.file.originalname,
                    contentType:
                        req.file.mimetype
                }
            );

            const mlResponse =
                await axios.post(
                    `${process.env.ML_API_URL}/predict`,
                    form,
                    {
                        headers:
                            form.getHeaders(),
                        maxBodyLength:
                            Infinity
                    }
                );

            const prediction =
                mlResponse.data;

            const sha256 =
                crypto
                    .createHash("sha256")
                    .update(req.file.buffer)
                    .digest("hex");

            const imageHash =
                `0x${sha256}`;

            const ipfsCID =
                await uploadToIPFS(
                    req.file.buffer,
                    req.file.originalname,
                    req.file.mimetype
                );

            const confidence =
                Math.round(
                    prediction.confidence * 100
                );

            const transaction =
                await contract.addRecord(
                    imageHash,
                    prediction.prediction,
                    confidence,
                    ipfsCID
                );

            const receipt =
                await transaction.wait();

            const heatmapURL =
                prediction.heatmap_url
                    ? `${process.env.ML_API_URL}${prediction.heatmap_url}`
                    : null;

            res.json({
                success: true,
                prediction:
                    prediction.prediction,
                confidence:
                    prediction.confidence,
                malignant_probability:
                    prediction.malignant_probability,
                threshold:
                    prediction.threshold,
                heatmap_url:
                    heatmapURL,
                imageHash:
                    imageHash,
                ipfsCID:
                    ipfsCID,
                transactionHash:
                    receipt.hash
            });
        } catch (error) {
            console.error(
                "Analysis error:",
                error.response?.data ||
                error.message ||
                error
            );

            res.status(500).json({
                success: false,
                error:
                    "Analysis and blockchain recording failed",
                details:
                    error.response?.data ||
                    error.message
            });
        }
    }
);

app.get(
    "/api/records",
    async (req, res) => {
        try {
            const records =
                await contract.getRecords();

            const formattedRecords =
                records.map((record) => ({
                    id:
                        record.id.toString(),
                    imageHash:
                        record.imageHash,
                    prediction:
                        record.prediction,
                    confidence:
                        record.confidence.toString(),
                    ipfsCID:
                        record.ipfsCID,
                    timestamp:
                        record.timestamp.toString(),
                    submittedBy:
                        record.submittedBy
                }));

            res.json(formattedRecords);
        } catch (error) {
            console.error(error);

            res.status(500).json({
                error:
                    "Unable to fetch records"
            });
        }
    }
);

app.get(
    "/api/records/:id",
    async (req, res) => {
        try {
            const record =
                await contract.getRecord(
                    req.params.id
                );

            res.json({
                id:
                    record.id.toString(),
                imageHash:
                    record.imageHash,
                prediction:
                    record.prediction,
                confidence:
                    record.confidence.toString(),
                ipfsCID:
                    record.ipfsCID,
                timestamp:
                    record.timestamp.toString(),
                submittedBy:
                    record.submittedBy
            });
        } catch (error) {
            console.error(error);

            res.status(404).json({
                error:
                    "Record not found"
            });
        }
    }
);

app.get(
    "/api/records/:id/verify/:hash",
    async (req, res) => {
        try {
            const isValid =
                await contract.verifyRecord(
                    req.params.id,
                    req.params.hash
                );

            res.json({
                valid: isValid
            });
        } catch (error) {
            console.error(error);

            res.status(500).json({
                error:
                    "Verification failed"
            });
        }
    }
);

const PORT =
    process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(
        `CanScan backend running on http://localhost:${PORT}`
    );

    console.log(
        `Wallet: ${wallet.address}`
    );

    console.log(
        `Contract: ${process.env.CONTRACT_ADDRESS}`
    );

    console.log(
        `ML API: ${process.env.ML_API_URL}`
    );
});
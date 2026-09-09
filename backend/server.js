const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { ethers } = require("ethers");
const path = require("path");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const abiPath = path.join(__dirname, "abi", "CancerRecords.json");
const contractArtifact = require(abiPath);

const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const contract = new ethers.Contract(
    process.env.CONTRACT_ADDRESS,
    contractArtifact.abi,
    wallet
);

app.get("/", (req, res) => {
    res.json({
        message: "CanScan Backend API is running"
    });
});

app.get("/api/blockchain/status", async (req, res) => {
    try {
        const network = await provider.getNetwork();
        const balance = await provider.getBalance(wallet.address);
        const count = await contract.getRecordCount();

        res.json({
            network: network.name,
            chainId: network.chainId.toString(),
            walletAddress: wallet.address,
            balance: ethers.formatEther(balance),
            recordCount: count.toString(),
            contractAddress: process.env.CONTRACT_ADDRESS
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Blockchain connection failed"
        });
    }
});

app.get("/api/records", async (req, res) => {
    try {
        const records = await contract.getRecords();

        const formattedRecords = records.map((record) => ({
            id: record.id.toString(),
            imageHash: record.imageHash,
            prediction: record.prediction,
            confidence: record.confidence.toString(),
            ipfsCID: record.ipfsCID,
            timestamp: record.timestamp.toString(),
            submittedBy: record.submittedBy
        }));

        res.json(formattedRecords);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Unable to fetch records"
        });
    }
});

app.get("/api/records/:id", async (req, res) => {
    try {
        const record = await contract.getRecord(req.params.id);

        res.json({
            id: record.id.toString(),
            imageHash: record.imageHash,
            prediction: record.prediction,
            confidence: record.confidence.toString(),
            ipfsCID: record.ipfsCID,
            timestamp: record.timestamp.toString(),
            submittedBy: record.submittedBy
        });
    } catch (error) {
        console.error(error);
        res.status(404).json({
            error: "Record not found"
        });
    }
});

app.get("/api/records/:id/verify/:hash", async (req, res) => {
    try {
        const isValid = await contract.verifyRecord(
            req.params.id,
            req.params.hash
        );

        res.json({
            valid: isValid
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Verification failed"
        });
    }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`CanScan backend running on http://localhost:${PORT}`);
    console.log(`Wallet: ${wallet.address}`);
    console.log(`Contract: ${process.env.CONTRACT_ADDRESS}`);
});
const { expect } = require("chai");

describe("CancerRecords", function () {
    async function deployContract() {
        const [owner, user] = await ethers.getSigners();
        const CancerRecords = await ethers.getContractFactory("CancerRecords");
        const contract = await CancerRecords.deploy();
        await contract.waitForDeployment();
        return { contract, owner, user };
    }

    it("should add a cancer record", async function () {
        const { contract, owner } = await deployContract();

        const imageHash = ethers.keccak256(ethers.toUtf8Bytes("test-image"));
        const prediction = "Malignant/High-Risk";
        const confidence = 94;
        const ipfsCID = "QmTestCID123";

        await contract.addRecord(
            imageHash,
            prediction,
            confidence,
            ipfsCID
        );

        const record = await contract.getRecord(1);

        expect(record.id).to.equal(1n);
        expect(record.imageHash).to.equal(imageHash);
        expect(record.prediction).to.equal(prediction);
        expect(record.confidence).to.equal(94n);
        expect(record.ipfsCID).to.equal(ipfsCID);
        expect(record.submittedBy).to.equal(owner.address);
    });

    it("should verify an image hash", async function () {
        const { contract } = await deployContract();

        const imageHash = ethers.keccak256(ethers.toUtf8Bytes("test-image"));

        await contract.addRecord(
            imageHash,
            "Benign",
            87,
            "QmTestCID456"
        );

        expect(
            await contract.verifyRecord(1, imageHash)
        ).to.equal(true);

        const differentHash = ethers.keccak256(
            ethers.toUtf8Bytes("modified-image")
        );

        expect(
            await contract.verifyRecord(1, differentHash)
        ).to.equal(false);
    });

    it("should return all records", async function () {
        const { contract } = await deployContract();

        await contract.addRecord(
            ethers.keccak256(ethers.toUtf8Bytes("image-1")),
            "Benign",
            91,
            "QmCID1"
        );

        await contract.addRecord(
            ethers.keccak256(ethers.toUtf8Bytes("image-2")),
            "Malignant/High-Risk",
            96,
            "QmCID2"
        );

        const records = await contract.getRecords();

        expect(records.length).to.equal(2);
        expect(records[0].prediction).to.equal("Benign");
        expect(records[1].prediction).to.equal("Malignant/High-Risk");
    });
});
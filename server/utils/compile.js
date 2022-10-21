const { Algodv2 } = require("algosdk");
const fs = require("fs");
const path = require("path");

(async () => {
    const algoClient = new Algodv2('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'http://localhost', 4001);

    const approvalFilePath = path.resolve(__dirname, '../../global-contract/oracle.teal');
    const approvalBytes = fs.readFileSync(approvalFilePath);

    const programAddr = await algoClient.compile(Buffer.from(approvalBytes).toString()).do();
    console.log(programAddr);
})()
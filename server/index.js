const app = require("express")();
const { Algodv2, default: algosdk } = require("algosdk");
const json = require("./env.json");
const bodyParser = require('body-parser')
const algoClient = new Algodv2('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'http://localhost', 4001);

app.use(bodyParser.json())

app.listen(8080, () => {
    console.log("Server open in port 8080");
    setInterval(async () => {
        const params = await algoClient.getTransactionParams().do();
        console.log(params.firstRound);
    }, 5000)
})

app.post('/random', async (req, res) => {
    if (!req.body || !req.body.programAddress) {
        return res.status(400).json({
            error: true,
            message: "Program address required"
        });
    }

    const { sk } = algosdk.mnemonicToSecretKey(json.oraclePrivateKey);
    const params = await algoClient.getTransactionParams().do();

    const trustedValue = new Date().getMilliseconds();
    const encodedData = Buffer.from(params.lastRound + ":" + trustedValue).toString("base64");
    console.log("Round set ~> ", params.lastRound);
    const bytes_signature = algosdk.tealSign(sk, Buffer.from(encodedData, "base64"), req.body.programAddress);

    res.status(200).json({
        signature: Buffer.from(bytes_signature).toString("base64"),
        encodedData
    })
})
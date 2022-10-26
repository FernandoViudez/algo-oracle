const { Algodv2, makePaymentTxnWithSuggestedParamsFromObject, default: algosdk, makeApplicationCallTxnFromObject, makeApplicationNoOpTxnFromObject, Indexer } = require("algosdk");
let config = require("./config.json");
const fetchUrl = require("fetch").fetchUrl;

config = {
    ...config,
    myAccount: algosdk.mnemonicToSecretKey(config.mnemonic),
}

const algoClient = new Algodv2('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'http://localhost', 4001);
const indexerClient = new Indexer('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'http://localhost', 8980);

/* 0. payment
    - amount 101000
    - from my algorand address account
    - to program address
*/
async function createTxn0() {
    const txn0 = makePaymentTxnWithSuggestedParamsFromObject({
        from: config.myAccount.addr,
        amount: 101000,
        to: config.logicSignatureApp.addr,
        suggestedParams: await algoClient.getTransactionParams().do()
    })
    return txn0;
}

/* 1. payment
    - amount 0
    - from program address
    - to my algorand address account
    - close remainder to my account
    - sign using oracle program
    - append data into note of this txn
*/
async function createTxn1() {
    const decodedData = Buffer.from(config.encodedData, 'base64').toString()
    let [lastValid, data] = decodedData.split(":");
    // data = JSON.stringify({
    //     ok: true,
    //     hack: "hello world"
    // });
    const txn = makePaymentTxnWithSuggestedParamsFromObject({
        from: config.logicSignatureApp.addr,
        amount: 0,
        to: config.myAccount.addr,
        closeRemainderTo: config.myAccount.addr,
        note: new Uint8Array(Buffer.from(data)),
        suggestedParams: await algoClient.getTransactionParams().do(),
    })
    return txn;
}

/* 2. smart contract
    - noop app call
    - no args
    - see global state and check that MUST be random value from api
*/
async function createTxn2() {
    const txn = makeApplicationNoOpTxnFromObject({
        from: config.myAccount.addr,
        appIndex: 285,
        suggestedParams: await algoClient.getTransactionParams().do(),
    })
    return txn;
}

async function signTxns(txn0, txn1, txn2) {
    // sign txn 0
    const signedTxn0 = txn0.signTxn(config.myAccount.sk);

    // sign txn 1
    const program = new Uint8Array(Buffer.from(config.logicSignatureApp.programHash, "base64"));
    const decodedData = Buffer.from(config.encodedData, 'base64').toString()
    let [lastValid, data] = decodedData.split(":");
    // lastValid = lastValid + 5000;
    console.log("Until this block, this signature & data could be used ~> ", parseInt(lastValid));
    console.log("Current round of the txn ~> ", txn1.firstRound);
    const lsig = new algosdk.LogicSigAccount(program, [
        Buffer.from(lastValid),
        Buffer.from(config.encodedData, 'base64'),
        Buffer.from(config.signature, "base64")
    ]);
    const signedTxn1 = algosdk.signLogicSigTransactionObject(txn1, lsig).blob;

    // sign txn 2
    const signedTxn2 = txn2.signTxn(config.myAccount.sk);

    return [signedTxn0, signedTxn1, signedTxn2];
}

async function checkAppState(appId) {
    try {
        const response = await indexerClient.lookupApplications(appId).do();
        const application = response.application;
        application.params["global-state"].forEach(element => {
            console.log(Buffer.from(element["key"], "base64").toString());
            console.log(element["value"].bytes ? Buffer.from(element["value"].bytes, "base64").toString() : element["value"].uint + "\n");
        });
    } catch (error) {
        console.log(error);
    }
}

async function getDataAndSetSignature() {
    return new Promise((resolve, reject) => {
        fetchUrl("http://localhost:8080/profile/role", {
            method: 'POST',
            payload: JSON.stringify({
                programAddress: config.logicSignatureApp.addr
            }),
            headers: {
                "Content-Type": "application/json"
            }
        }, function (error, meta, body) {
            const res = JSON.parse(body.toString())
            config = {
                ...config,
                signature: res.signature,
                encodedData: res.encodedData,
            };
            resolve();
        });
    })
}

(async () => {
    try {
        await getDataAndSetSignature();

        const unsignedTxn0 = await createTxn0();
        const unsignedTxn1 = await createTxn1();
        const unsignedTxn2 = await createTxn2();

        // group unsigned txn's
        let txns = [unsignedTxn0, unsignedTxn1, unsignedTxn2];
        algosdk.assignGroupID(txns);

        txns = await signTxns(unsignedTxn0, unsignedTxn1, unsignedTxn2);

        let tx = (await algoClient.sendRawTransaction(txns).do());
        let confirmedTxn = await algosdk.waitForConfirmation(algoClient, tx.txId, 4);
        console.log("Transaction " + tx.txId + " confirmed in round " + confirmedTxn["confirmed-round"]);

        setTimeout(() => {
            checkAppState(285);
        }, 3000);
    } catch (error) {
        console.log(error);
    }
})()
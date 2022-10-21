const { Algodv2, makePaymentTxnWithSuggestedParamsFromObject, default: algosdk } = require("algosdk");
let config = require("./config.json");

config = {
    ...config,
    myAccount: algosdk.mnemonicToSecretKey(config.mnemonic),
}

const algoClient = new Algodv2('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'http://localhost', 4001);

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
async function signTxns(txn0, txn1) {
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

    return [signedTxn0, signedTxn1];
}

(async () => {
    try {
        const unsignedTxn0 = await createTxn0();
        const unsignedTxn1 = await createTxn1();

        // group unsigned txn's
        let txns = [unsignedTxn0, unsignedTxn1];
        algosdk.assignGroupID(txns);

        txns = await signTxns(unsignedTxn0, unsignedTxn1);

        let tx = (await algoClient.sendRawTransaction(txns).do());
        let confirmedTxn = await algosdk.waitForConfirmation(algoClient, tx.txId, 4);
        console.log("Transaction " + tx.txId + " confirmed in round " + confirmedTxn["confirmed-round"]);
    } catch (error) {
        console.log(error);
    }
})()
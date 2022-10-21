### Algorand oracle
Oracle approach using research of RandLabs
refs:
    - https://medium.com/randlabs/algorand-exchange-price-oracle-2a3591c9d2dd 
    - https://developer.algorand.org/articles/algorand-smart-contract-layer1-asc1-and-oracles/#oracles 
    - https://developer.algorand.org/articles/verify-signatures-and-signed-data-within-algorand-smart-contracts/

Visual diagram of this approach:
    - https://drive.google.com/file/d/1CMcZ2hqOZJy3C_lubeCJ8b-h1mfBFb6l/view?usp=sharing


### Steps to test this project:
1. cd server && npm i
2. node index.js
3. cd utils
4. node compile.js
5. copy addr and result from terminal
6. create POST req to http://localhost:8080/random sending "programAddress" field in the body req. Set "programAddress" as the addr from the previous step
7. update config.json file inside utils:
    - encodedData MUST be set from the api result
    - signature MUST be set from the api result
    - mnemonic MUST be a paraphrase from your algorand account (MUST be private/local network)
    - logicSignatureApp MUST be the response of the compile.js script
8. run atomic.js
9. That's all, see results.


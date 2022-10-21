#### Global Oracle program MUST validate:
    - group length is greater than 1
    
    - gtx 0 amount is gte than 101000
    - gtx 0 receiver is not necessary because if user do not send algos, txn will fail
    
    - that Txn amount is 0
    - that Txn receiver is sender of gtx 0
    - that Txn close_remainder is sender of gtx 0
    
    - ed25519 using note as data
    - data should contain last valid and last valid MUST be valid block value (greater than first valid of current txn)

#### contracts which use oracle off-chain data MUST validate:
    - gtx1 "from" field is the public oracle-addr
    - gtx1 is payment txn
    - other validations using off chain data from gtx 1 note


contracts MUST use gtx1 note as the off chain data (remind to separate data from lastValid)

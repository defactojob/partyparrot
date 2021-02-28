# Parrot - A Synthetic Debt Protocol


# Configure

Create an `.env` file:

```
SOLANA_NETWORK=local
DEPLOY_FILE=deploy.local.json
USER_FILE=user.local.json
# Gom4g3Md3xpFHcRGJxESrQzXyzT5DVeCXBgGggBAxreW
WALLET_MNEMONIC="isolate question afraid direct decide when jeans husband opera merge wet fix deal grit few immune power address kingdom gentle cup fresh zone school"
```

# SETUP

Compile the solana program:

```
yarn build:program
```

Setup a BTC:dUSD debt market:

```
yarn parrot setup
```

```
info:     deploy dUSD debt type
info:     deploy BTC-dUSDT vault type
```

A deploy file would be created in [deploy.local.json](./deploy.local.json.example), containing the tokens and various accounts created.

Once the debt market had been created, create a vault to stake (fake) BTC
collaterals and generate dUSD debt:

```
yarn parrot setup-vault
```

```
info:     airdrop BTC tokens for testing
info:     create dUSD debt token account
```

Like MAKER vaults, there can be may vault types taking different collaterals
(e.g. SOL-dUSD, SRM-dUSD). But like synthetic, there can also be different
synthetic debt types that could be generated using these collaterals (e.g.
SOL-dBTC, SRM-dBTC).

Conversion between different debt types has no slippage (e.g dBTC <-> dUSD).

# Stake & Borrow

Stake some of the (fake) BTC into the vault as collateral:

```
yarn parrot stake 1
```

```
info:     stake (fake) BTC {"amount":"1"}
```

Then try to borrow 1000 dUSD from the vault, minting dUSD stablecoins:

```
yarn parrot borrow 1000
```

```
info:     generate dUSD {"amount":"1000"}
```

Query the vault for information about the loan position:

```
yarn parrot info

collateral: 1 BTC
debt: 1000 dUSD
price: 45000 USD/BTC
--------------------------------------
collateral ratio: 4500%
```

NOTE: the price is a constant value for testing, pending integration with a
price oracle...

# TODO

This demo has the basic idea, but is still very very early. There are a lot of
todos...

* Interest accrual for debt
* Repay debt
* Unstake collateral
* Integrate price oracle
* Allow liquidators to settle loan positions without
* Loss-less trade between different synthetic debts (dUSD <-> dBTC <-> dETH)
* Web UI
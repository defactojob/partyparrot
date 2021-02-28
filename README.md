# Parrot - A Synthetic Debt Protocol

![PARTY OR DIE](brand.png)

A major problem with bridging assets from ETH DeFi onto Solana is that it creates an opportunity cost for users, losing potential yields on ETH. This is a chicken an egg problem for Solana DeFi, where yield is low because there is no TVL, and TVL is low because there is low yield.

We think that an opportunity to solve this problem is to use existing yield earning tokens on ETH L1 as the basic building blocks for Solana DeFi. Instead of forgoing yields & fees on ETH L1 to participate in Solana DeFi, our proposal is to make it possible for LP holders to use Sushi & Curve LP tokens as collaterals on Solana's lending product.

LP holders will be able to keep earning fees on ETH, and yet be able to use the bridged LP tokens as collaterals to borrow USDT, and lever up by buying more BTC on Serum.

The Parrot protocol proposes to allow the use of collaterals to generate synthetic assets as debts. Like MAKER, Parrot will accept many different types of asset as collaterals, but not only will it be able to generate a stablecoin pegged to USD value, it will be able to generate different kinds of synthetic assets, and enable no-loss conversion between the synthetics.

# THE DEMO

This REPO contains prototype code to demonstrate the basic operations of creating a debt type (USD), a vault type (BTC-USD), and generating debt by staking collaterals.

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
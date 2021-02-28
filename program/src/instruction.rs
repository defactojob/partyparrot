#![allow(dead_code)]

use borsh::{BorshDeserialize, BorshSchema, BorshSerialize};

use crate::state::PublicKey;
#[derive(Clone, Debug, BorshSerialize, BorshDeserialize, BorshSchema, PartialEq)]

pub enum Instruction {
    InitDebtType {
        debt_token: PublicKey,
        owner: PublicKey,
    },
    InitVaultType {
        debt_type: PublicKey,
        collateral_token: PublicKey,
        collateral_token_holder: PublicKey,
        price_oracle: PublicKey,
    },
    InitVault {
        vault_type: PublicKey,
        owner: PublicKey,
    },
    Stake {
        amount: u64,
        collateral_holder_nonce: u8,
    },
    Unstake {
        amount: u64,
    },
    Repay {
        amount: u64,
    },
    Borrow {
        amount: u64,
    },
}

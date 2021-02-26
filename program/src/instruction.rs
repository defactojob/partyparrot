#![allow(dead_code)]

use borsh::{BorshDeserialize, BorshSchema, BorshSerialize};

use crate::state::FaucetConfig;
#[derive(Clone, Debug, BorshSerialize, BorshDeserialize, BorshSchema, PartialEq)]

pub enum Instruction {
    InitFaucet {
        config: FaucetConfig,
    },
    Drip {
        faucet_token_minter_nonce: u8
    },
}
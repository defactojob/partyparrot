use borsh::{BorshDeserialize, BorshSchema, BorshSerialize};

use solana_program::{
  account_info::AccountInfo, entrypoint::ProgramResult, program_error::ProgramError,
  program_pack::IsInitialized,
};

use crate::borsh_state::{BorshState, InitBorshState};
#[derive(Clone, Debug, BorshSerialize, BorshDeserialize, BorshSchema, Default, PartialEq)]
pub struct PublicKey(pub [u8; 32]);

impl PublicKey {
    pub fn is_account(&self, info: &AccountInfo) -> bool {
        self.eq(&PublicKey(info.key.to_bytes()))
    }
}

impl<'a> From<&'a AccountInfo<'a>> for PublicKey {
    fn from(info: &'a AccountInfo<'a>) -> Self {
        PublicKey(info.key.to_bytes())
    }
}

#[derive(Clone, Debug, BorshSerialize, BorshDeserialize, BorshSchema, Default, PartialEq)]
pub struct FaucetConfig {
    /// amount to mint for each call
    pub amount: u64,
}

#[derive(Clone, Debug, BorshSerialize, BorshDeserialize, BorshSchema, Default, PartialEq)]
pub struct Faucet {
    pub is_initialized: bool,

    pub config: FaucetConfig,

    // Could also read the token for total supply, but also track in this struct
    // for convenience.
    pub amount_supplied: u64,

    // Can rate limit using slot
    pub updated_at: u64, // slot

    // The spl token to mint. By convention, the token minter is expected to be
    // a program account generated using the seed: [faucet.pubkey, "minter"]
    pub token: PublicKey,
}
impl IsInitialized for Faucet {
    fn is_initialized(&self) -> bool {
        self.is_initialized
    }
}
impl BorshState for Faucet {}
impl InitBorshState for Faucet {}


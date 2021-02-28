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
pub struct DebtType {
    pub is_initialized: bool,

    // program account should be minter for this token
    pub debt_token: PublicKey,
    pub owner: PublicKey,
}
impl IsInitialized for DebtType {
    fn is_initialized(&self) -> bool {
        self.is_initialized
    }
}
impl BorshState for DebtType {}
impl InitBorshState for DebtType {}

#[derive(Clone, Debug, BorshSerialize, BorshDeserialize, BorshSchema, Default, PartialEq)]
pub struct VaultType {
    pub is_initialized: bool,

    // belongs to this debt type
    pub debt_type: PublicKey,

    // type of spl-token to accept as collateral
    pub collateral_token: PublicKey,

    // token account to hold the collaterals. A program account owns this token account.
    pub collateral_token_holder: PublicKey,

    pub price_oracle: PublicKey,

    // config
    // max_collateral_ratio
    // debt_ceiling
    // current_debt_amount
    // interest_rate
}

impl IsInitialized for VaultType {
    fn is_initialized(&self) -> bool {
        self.is_initialized
    }
}
impl BorshState for VaultType {}
impl InitBorshState for VaultType {}

#[derive(Clone, Debug, BorshSerialize, BorshDeserialize, BorshSchema, Default, PartialEq)]
pub struct Vault {
    pub is_initialized: bool,

    // belongs_to VaultType
    pub vault_type: PublicKey,

    // only owner can borrow and unstake
    // anyone can repay and stake
    pub owner: PublicKey,

    pub debt_amount: u64,
    pub collateral_amount: u64,
}
impl IsInitialized for Vault {
    fn is_initialized(&self) -> bool {
        self.is_initialized
    }
}
impl BorshState for Vault {}
impl InitBorshState for Vault {}

mod tests {
    use crate::borsh_utils;

    use super::*;

    #[test]
    fn test_packed_len() {
        println!("DebtType len: {}", borsh_utils::get_packed_len::<DebtType>());
        println!("VaultType len: {}", borsh_utils::get_packed_len::<VaultType>());
        println!("Vault len: {}", borsh_utils::get_packed_len::<Vault>());
    }
}

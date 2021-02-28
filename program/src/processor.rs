use solana_program::{
    account_info::AccountInfo,
    clock::Clock,
    entrypoint::ProgramResult,
    msg,
    program::invoke_signed,
    program_error::ProgramError,
    pubkey::Pubkey,
    sysvar::{rent::Rent, Sysvar},
};

use crate::{
    borsh_state::{BorshState, InitBorshState},
    error::Error,
    instruction::Instruction,
    state::{DebtType, PublicKey, Vault, VaultType},
    utils::Accounts,
};
use borsh::BorshDeserialize;

struct InitDebtTypeContext<'a> {
    rent: Rent,
    debt_type: &'a AccountInfo<'a>, // writable
    debt_token: PublicKey,
    owner: PublicKey,
}

impl<'a> InitDebtTypeContext<'a> {
    fn process(&self) -> ProgramResult {
        let mut debt_type = DebtType::init_uninitialized(self.debt_type)?;

        debt_type.is_initialized = true;
        debt_type.debt_token = self.debt_token.clone();
        debt_type.owner = self.owner.clone();

        debt_type.save_exempt(self.debt_type, &self.rent)?;

        Ok(())
    }
}

struct InitVaultTypeContext<'a> {
    rent: Rent,
    vault_type: &'a AccountInfo<'a>, // writable

    debt_type: PublicKey,
    collateral_token: PublicKey,
    collateral_token_holder: PublicKey,
    price_oracle: PublicKey,
}

impl<'a> InitVaultTypeContext<'a> {
    fn process(&self) -> ProgramResult {
        let mut vtype = VaultType::init_uninitialized(self.vault_type)?;
        // TODO: check ownership over debt type

        vtype.is_initialized = true;
        vtype.debt_type = self.debt_type.clone();
        vtype.price_oracle = self.price_oracle.clone();
        vtype.collateral_token = self.collateral_token.clone();
        vtype.collateral_token_holder = self.collateral_token_holder.clone();

        vtype.save_exempt(self.vault_type, &self.rent)?;

        Ok(())
    }
}

struct InitVaultContext<'a> {
    rent: Rent,
    vault: &'a AccountInfo<'a>, // writable

    vault_type: PublicKey,
    owner: PublicKey,
}

impl<'a> InitVaultContext<'a> {
    fn process(&self) -> ProgramResult {
        let mut vault = Vault::init_uninitialized(self.vault)?;

        vault.is_initialized = true;
        vault.vault_type = self.vault_type.clone();
        vault.owner = self.owner.clone();
        vault.save_exempt(self.vault, &self.rent)?;

        Ok(())
    }
}

fn expected_program_account_pubkey(
    program_id: &Pubkey,
    seeds: &[&[u8]],
) -> Result<Pubkey, ProgramError> {
    // is it ok to trust the nonce passed by the client?, i think so.
    //
    // https://docs.rs/solana-sdk/1.5.10/solana_sdk/pubkey/struct.Pubkey.html#method.create_program_address
    Pubkey::create_program_address(seeds, program_id).map_err(|_err| ProgramError::InvalidSeeds)
}
struct StakeContext<'a> {
    program_id: &'a Pubkey,

    token_program: &'a AccountInfo<'a>,

    collateral_from: &'a AccountInfo<'a>,           // writable
    collateral_from_authority: &'a AccountInfo<'a>, // signed
    collateral_to: &'a AccountInfo<'a>,             // writable

    vault_type: &'a AccountInfo<'a>,
    vault: &'a AccountInfo<'a>, // writable

    amount: u64,
    collateral_holder_nonce: u8,
}

static COLLATERAL_HOLDER_ROLE: &str = "holder";
static MINTER_ROLE: &str = "minter";

impl<'a> StakeContext<'a> {
    fn process(&self) -> ProgramResult {
        let mut vault_type = VaultType::load_initialized(self.vault_type)?;
        let mut vault = Vault::load_initialized(self.vault)?;

        if vault.vault_type.ne(&self.vault_type.into()) {
            return Err(Error::VaultTypeMismatch)?;
        }

        if vault_type
            .collateral_token_holder
            .ne(&self.collateral_to.into())
        {
            return Err(Error::CollateralHolderAccountMismatch)?;
        }

        // transfer from user token account to collateral holding account
        self.stake_collateral()?;

        vault.collateral_amount = vault
            .collateral_amount
            .checked_add(self.amount)
            .ok_or(Error::Overflow)?;

        vault.save(self.vault)?;

        Ok(())
    }

    fn stake_collateral(&self) -> ProgramResult {
        let inx = spl_token::instruction::transfer(
            self.token_program.key,
            self.collateral_from.key,
            self.collateral_to.key,
            self.collateral_from_authority.key,
            &[],
            self.amount,
        )?;

        invoke_signed(
            &inx,
            &[
                self.token_program.clone(),
                self.collateral_from.clone(),
                self.collateral_to.clone(),
                self.collateral_from_authority.clone(),
            ],
            &[],
        )
    }
}

struct BorrowContext<'a> {
    program_id: &'a Pubkey,

    token_program: &'a AccountInfo<'a>,

    debt_token: &'a AccountInfo<'a>,    // writable
    debt_minter: &'a AccountInfo<'a>,   // Program pubkey, writable
    debt_receiver: &'a AccountInfo<'a>, // writable

    debt_type: &'a AccountInfo<'a>,
    vault_type: &'a AccountInfo<'a>,
    vault: &'a AccountInfo<'a>,       // writable
    vault_owner: &'a AccountInfo<'a>, // signed

    price_oracle: &'a AccountInfo<'a>,

    amount: u64,
    debt_minter_nonce: u8,
}

impl<'a> BorrowContext<'a> {
    fn process(&self) -> ProgramResult {
        let (_debt_type, _vault_type, mut vault) = self.load_state_checked()?;

        let debt_minter_seeds = &[
            &self.debt_type.key.to_bytes()[..],
            MINTER_ROLE.as_bytes(),
            &[self.debt_minter_nonce],
        ];

        // NOTE: probably not necessary to check the debt_minter. If the client
        // passes invalid nonce or debt_minter, it will fail to mint anyway.
        let debt_minter = self.program_pubkey(debt_minter_seeds)?;
        if debt_minter.ne(self.debt_minter.key) {
            return Err(Error::UnexpectedProgramAccount)?;
        }

        // TODO: check debt ceiling against the price feed

        self.mint_debt_to_receiver(debt_minter_seeds, self.amount)?;

        vault.debt_amount = vault
            .debt_amount
            .checked_add(self.amount)
            .ok_or(Error::Overflow)?;
        vault.save(self.vault)?;

        Ok(())
    }

    fn load_state_checked(&self) -> Result<(DebtType, VaultType, Vault), ProgramError> {
        let debt_type = DebtType::load_initialized(self.debt_type)?;
        let vault_type = VaultType::load_initialized(self.vault_type)?;
        let vault = Vault::load_initialized(self.vault)?;

        if debt_type.debt_token.ne(&self.debt_token.into()) {
            return Err(Error::InvalidDebtToken)?;
        }

        if vault_type.debt_type.ne(&self.debt_type.into()) {
            return Err(Error::DebtTypeMismatch)?;
        }

        if vault_type.price_oracle.ne(&self.price_oracle.into()) {
            return Err(Error::InvalidPriceOracle)?;
        }

        if vault.vault_type.ne(&self.vault_type.into()) {
            return Err(Error::VaultTypeMismatch)?;
        }

        if vault.owner.ne(&self.vault_owner.into()) {
            return Err(Error::OwnerMismatch)?;
        }

        Ok((debt_type, vault_type, vault))
    }

    fn mint_debt_to_receiver(&self, seeds: &[&[u8]], amount: u64) -> ProgramResult {
        let mint = spl_token::instruction::mint_to(
            self.token_program.key,
            self.debt_token.key,
            self.debt_receiver.key,
            self.debt_minter.key,
            &[],
            amount,
        )?;

        invoke_signed(
            &mint,
            &[
                self.debt_token.clone(),
                self.debt_receiver.clone(),
                self.debt_minter.clone(),
                self.token_program.clone(),
            ],
            &[seeds],
        )?;

        Ok(())
    }

    fn program_pubkey(&self, seeds: &[&[u8]]) -> Result<Pubkey, ProgramError> {
        // is it ok to trust the nonce passed by the client?, i think so.
        //
        // https://docs.rs/solana-sdk/1.5.10/solana_sdk/pubkey/struct.Pubkey.html#method.create_program_address
        Pubkey::create_program_address(seeds, self.program_id)
            .map_err(|_err| ProgramError::InvalidSeeds)
    }
}

pub struct Processor {}

impl Processor {
    pub fn process<'a>(
        program_id: &'a Pubkey,
        accounts: &'a [AccountInfo<'a>],
        input: &[u8],
    ) -> ProgramResult {
        let accounts = Accounts(accounts);
        let instruction =
            Instruction::try_from_slice(input).map_err(|_| ProgramError::InvalidInstructionData)?;

        // match branches would increase stack frame, and hit the hard 4096
        // frame limit. break the other branches into another function call, and
        // mark it as never inline.
        match instruction {
            Instruction::InitDebtType { debt_token, owner } => InitDebtTypeContext {
                rent: accounts.get_rent(0)?,
                debt_type: accounts.get(1)?,

                debt_token,
                owner,
            }
            .process(),
            Instruction::InitVaultType {
                debt_type,
                collateral_token,
                price_oracle,
                collateral_token_holder,
            } => InitVaultTypeContext {
                rent: accounts.get_rent(0)?,
                vault_type: accounts.get(1)?,

                debt_type,
                collateral_token,
                collateral_token_holder,
                price_oracle,
            }
            .process(),

            Instruction::InitVault { vault_type, owner } => InitVaultContext {
                rent: accounts.get_rent(0)?,
                vault: accounts.get(1)?,

                vault_type,
                owner,
            }
            .process(),

            Instruction::Stake {
                amount,
                collateral_holder_nonce,
            } => StakeContext {
                program_id,
                token_program: accounts.get(0)?,

                collateral_from: accounts.get(1)?,
                collateral_from_authority: accounts.get(2)?,
                collateral_to: accounts.get(3)?,

                vault_type: accounts.get(4)?,
                vault: accounts.get(5)?,

                amount,
                collateral_holder_nonce,
            }
            .process(),
            Instruction::Borrow {
                amount,
                debt_minter_nonce,
            } => BorrowContext {
                program_id,
                token_program: accounts.get(0)?,

                debt_token: accounts.get(1)?,
                debt_minter: accounts.get(2)?,
                debt_receiver: accounts.get(3)?,

                debt_type: accounts.get(4)?,
                vault_type: accounts.get(5)?,
                vault: accounts.get(6)?,
                vault_owner: accounts.get(7)?,

                price_oracle: accounts.get(8)?,

                amount,
                debt_minter_nonce,
            }
            .process(),

            _ => Err(ProgramError::InvalidInstructionData),
        }

        // Instruction::Unstake { amount } => {}
        // Instruction::Repay { amount } => {}
    }
}

mod tests {
    use crate::borsh_utils;

    use super::*;

    #[test]
    fn test_packed_len() {
        println!(
            "VaultType len: {}",
            borsh_utils::get_packed_len::<VaultType>()
        );
    }
}

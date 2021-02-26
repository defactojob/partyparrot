use solana_sdk::pubkey::Pubkey;

use solana_program::{
    account_info::AccountInfo,
    clock::Clock,
    entrypoint::ProgramResult,
    msg,
    program::invoke_signed,
    program_error::ProgramError,
    sysvar::{rent::Rent, Sysvar},
};

use crate::{
    borsh_state::{BorshState, InitBorshState},
    error::Error,
    instruction::Instruction,
    state::{Faucet, FaucetConfig},
    utils::Accounts,
};
use borsh::BorshDeserialize;

struct InitFaucetContext<'a> {
    rent: Rent,
    faucet: &'a AccountInfo<'a>,
    token: &'a AccountInfo<'a>,
    config: FaucetConfig,
}

impl<'a> InitFaucetContext<'a> {
    fn process(&self) -> ProgramResult {
        let mut faucet = Faucet::init_uninitialized(self.faucet)?;

        faucet.is_initialized = true;
        faucet.config = self.config.clone();
        faucet.token = self.token.into();

        // will check for rent exemption when initializing
        faucet.save_exempt(self.faucet, &self.rent)?;

        Ok(())
    }
}

static MINTER_ROLE: &str = "minter";
struct DripContext<'a> {
    program_id: &'a Pubkey,
    token_program: &'a AccountInfo<'a>, // spl token program

    clock: Clock,
    faucet: &'a AccountInfo<'a>,
    faucet_token: &'a AccountInfo<'a>,        // token
    faucet_token_minter: &'a AccountInfo<'a>, // program account
    receiver: &'a AccountInfo<'a>,            // spl token account

    faucet_token_minter_nonce: u8, // nonce that can be used to generate a valid program account key
}

impl<'a> DripContext<'a> {
    fn process(&self) -> ProgramResult {
        let mut faucet = Faucet::load_initialized(self.faucet)?;

        // seed: [faucet.key, "minter", nonce].
        //
        // NOTE: by including the faucet.key in the seeds and checking for it, we
        // can prevent malicious actor passing in the faucet token minter of another
        // faucet.
        let minter_seeds = &[
            &self.faucet.key.to_bytes()[..],
            MINTER_ROLE.as_bytes(),
            &[self.faucet_token_minter_nonce],
        ];

        // check if minter key is the expected one
        if self
            .expected_minter_pubkey(minter_seeds)?
            .ne(self.faucet_token_minter.key)
        {
            return Err(Error::UnexpectedProgramAccount)?;
        }

        self.mint_to_receiver(minter_seeds, faucet.config.amount)?;

        faucet.amount_supplied = faucet
            .amount_supplied
            .checked_add(faucet.config.amount)
            .ok_or(Error::FaucetOverflow)?;
        faucet.updated_at = self.clock.slot;
        faucet.save(self.faucet)?;

        Ok(())
    }

    fn mint_to_receiver(&self, seeds: &[&[u8]], amount: u64) -> ProgramResult {
        let mint = spl_token::instruction::mint_to(
            self.token_program.key,
            self.faucet_token.key,
            self.receiver.key,
            self.faucet_token_minter.key,
            &[],
            amount,
        )?;

        invoke_signed(
            &mint,
            &[self.faucet_token_minter.clone()],
            &[seeds],
        )?;

        Ok(())
    }

    fn expected_minter_pubkey(&self, seeds: &[&[u8]]) -> Result<Pubkey, ProgramError> {
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
            Instruction::InitFaucet { config } => InitFaucetContext {
                rent: accounts.get_rent(0)?,
                faucet: accounts.get(1)?,
                token: accounts.get(2)?,
                config,
            }
            .process(),

            Instruction::Drip {
                faucet_token_minter_nonce,
            } => DripContext {
                program_id,
                token_program: accounts.get(0)?,

                clock: accounts.get_clock(1)?,
                faucet: accounts.get(2)?,
                faucet_token: accounts.get(3)?,
                faucet_token_minter: accounts.get(4)?,
                receiver: accounts.get(5)?,

                faucet_token_minter_nonce,
            }
            .process(),

            // _ => Err(ProgramError::InvalidInstructionData),
        }
    }
}

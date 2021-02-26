use solana_program::{
  account_info::AccountInfo,
  clock::Clock,
  program_error::ProgramError,
  sysvar::{rent::Rent, Sysvar},
};

pub struct Accounts<'a>(pub &'a [AccountInfo<'a>]);

impl<'a> Accounts<'a> {
  pub fn get(&self, i: usize) -> Result<&'a AccountInfo<'a>, ProgramError> {
      // fn get(&self, i: usize) -> Result<&AccountInfo, ProgramError> {
      // &accounts[input.token.account as usize]
      self.0.get(i).ok_or(ProgramError::NotEnoughAccountKeys)
  }

  pub fn get_rent(&self, i: usize) -> Result<Rent, ProgramError> {
      Rent::from_account_info(self.get(i)?)
  }

  pub fn get_clock(&self, i: usize) -> Result<Clock, ProgramError> {
      Clock::from_account_info(self.get(i)?)
  }
}
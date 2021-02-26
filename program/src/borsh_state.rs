use borsh::{BorshDeserialize, BorshSerialize};

use solana_program::{
    account_info::AccountInfo, entrypoint::ProgramResult, program_error::ProgramError,
    program_pack::IsInitialized, sysvar::rent::Rent,
};

pub trait BorshState: BorshDeserialize + BorshSerialize {
    fn load(account: &AccountInfo) -> Result<Self, ProgramError> {
        let data = (*account.data).borrow();
        Self::try_from_slice(&data).map_err(|_| ProgramError::InvalidAccountData)
    }

    fn save(&self, account: &AccountInfo) -> ProgramResult {
        let data = self
            .try_to_vec()
            .map_err(|_| ProgramError::InvalidAccountData)?;

        // FIXME: looks like there is association precedence issue that prevents
        // RefMut from being automatically dereferenced.
        //
        // let dst = &mut account.data.borrow_mut();
        //
        // Why does it work in an SPL token program though?
        //
        // Account::pack(source_account, &mut source_account_info.data.borrow_mut())?;
        let mut dst = (*account.data).borrow_mut();
        if dst.len() != data.len() {
            return Err(ProgramError::InvalidAccountData);
        }
        dst.copy_from_slice(&data);

        Ok(())
    }

    fn save_exempt(&self, account: &AccountInfo, rent: &Rent) -> ProgramResult {
        let data = self
            .try_to_vec()
            .map_err(|_| ProgramError::InvalidAccountData)?;

        if !rent.is_exempt(account.lamports(), data.len()) {
            // FIXME: return a custom error
            return Err(ProgramError::InvalidAccountData);
        }

        let mut dst = (*account.data).borrow_mut();
        if dst.len() != data.len() {
            // FIXME: return a custom error
            return Err(ProgramError::InvalidAccountData);
        }
        dst.copy_from_slice(&data);

        Ok(())
    }
}

pub trait InitBorshState: BorshState + IsInitialized {
    // type Self = IsInitialized
    fn load_initialized(account: &AccountInfo) -> Result<Self, ProgramError> {
        let object = Self::load(account)?;
        if !object.is_initialized() {
            return Err(ProgramError::UninitializedAccount);
        }

        Ok(object)
    }

    fn init_uninitialized(account: &AccountInfo) -> Result<Self, ProgramError> {
        let object = Self::load(account)?;
        if object.is_initialized() {
            return Err(ProgramError::AccountAlreadyInitialized);
        }

        Ok(object)
    }
}

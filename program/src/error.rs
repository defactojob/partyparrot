//! Error types

use num_derive::FromPrimitive;
use solana_program::program_error::ProgramError;

use num_traits::FromPrimitive;
use thiserror::Error;

/// Errors that may be returned by the program.
#[derive(Clone, Debug, Eq, Error, FromPrimitive, PartialEq)]
pub enum Error {
    #[error("Owner mismatch")] // 0
    OwnerMismatch,

    #[error("Faucet overflow")] // 1
    FaucetOverflow,

    #[error("Unexpected program account")] // 2
    UnexpectedProgramAccount,

    // #[error("Insufficient withdrawable")] // 1
    // InsufficientWithdrawable,

    // #[error("Aggregator key not match")] // 2
    // AggregatorMismatch,

    // #[error("Invalid round id")] // 3
    // InvalidRoundID,

    // #[error("Cannot start new round until cooldown")] // 4
    // OracleNewRoundCooldown,

    // #[error("Max number of submissions reached for this round")] // 5
    // MaxSubmissionsReached,

    // #[error("Each oracle may only submit once per round")] // 6
    // OracleAlreadySubmitted,

    // #[error("Rewards overflow")] // 7
    // RewardsOverflow,

    // #[error("No resolve answer")]
    // NoResolvedAnswer,

    // #[error("No submitted value")]
    // NoSubmission,

    // #[error("Invalid faucet")]
    // InvalidFaucet,

    #[error("Unknown error")]
    UnknownError,
}

impl From<Error> for ProgramError {
    fn from(e: Error) -> Self {
        ProgramError::Custom(e as u32)
    }
}

impl From<ProgramError> for Error {
    fn from(err: ProgramError) -> Self {
        match err {
            ProgramError::Custom(code) => Error::from_u32(code).unwrap_or(Error::UnknownError),
            _ => Error::UnknownError,
        }
    }
}

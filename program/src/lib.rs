#![forbid(unsafe_code)]

pub mod borsh_state;
pub mod borsh_utils;
pub mod error;
pub mod instruction;
pub mod processor;
pub mod state;
mod utils;

use crate::error::Error;
use borsh_state::InitBorshState;
use solana_program::{
    account_info::AccountInfo, program_error::ProgramError, program_pack::IsInitialized,
};

#[cfg(not(feature = "no-entrypoint"))]
pub mod entrypoint;

// Export current sdk types for downstream users building with a different
pub use solana_program;

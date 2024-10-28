import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { AnchorMovieReviewProgram } from "../target/types/anchor_movie_review_program";
import { expect } from "chai";
import { getAssociatedTokenAddress, getAccount } from "@solana/spl-token"

describe("anchor-movie-review-program", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const deployer = provider.wallet.publicKey;
  const program = anchor.workspace.AnchorMovieReviewProgram as Program<AnchorMovieReviewProgram>;

  const movie = {
    title: "Just a test movie",
    description: "Wow what a good movie it was real great",
    rating: 5
  }

  const [moviePda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from(movie.title), deployer.toBuffer()],
    program.programId
  )

  const [mint] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("mint")],
    program.programId
  )

  it("Initializes the reward token", async() => {
    const tx = await program.methods.initializeTokenMint().rpc();
  })

  it("Movie review is added", async() => {
    const tokenAccount = await getAssociatedTokenAddress(
      mint,
      provider.wallet.publicKey
    )

    const tx = await program.methods
      .addMovieReview(
        movie.title,
        movie.description,
        movie.rating
      )
      .accounts({
        tokenAccount: tokenAccount
      })
      .rpc();

    const account = await program.account.movieAccountState.fetch(moviePda);
    expect(movie.title).is.equal(account.title);
    expect(movie.rating).is.equal(account.rating);
    expect(movie.description).is.equal(account.description);
    expect(account.reviewer).is.eql(provider.wallet.publicKey);

    const userAta = await getAccount(provider.connection, tokenAccount);
    expect(Number(userAta.amount)).to.equal((10*10)^6)
  });

  it("Movie review is updated", async() => {
    const newDescription = "Wow this is new";
    const newRating = 4;

    const tx = await program.methods
      .updateMovieReview(
        movie.title,
        movie.description,
        movie.rating
      )
      .rpc();

    const account = await program.account.movieAccountState.fetch(moviePda)
    expect(movie.title === account.title);
    expect(newRating === account.rating);
    expect(newDescription === account.description);
    expect(account.reviewer === provider.wallet.publicKey);
  
  });

  it("Deletes a movie review", async () => {
    const tx = await program.methods.deleteMovieReview(movie.title).rpc();
  });
});

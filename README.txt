
== Windows setup ==

You need to install the latest node.js, needs to run both npm and all the
tools needed for the frontend:

   * Download from:  https://github.com/coreybutler/nvm-windows
   * Run:            nvm install latest
   * In "command prompt", as administrator:   nvm use latest

When you are creating a new app (so not needed if you are just compiling
Alere):

   * Run:      npm create tauri-app

You then need to install rustup and git:

   * Download from:  https://git-scm.com/download/win

Optionally, you can install development tools like neovim, git,... If you are
using PowerShell, you can edit the configuration file with:

   * notepad $profile
   * or   nvim $profile

And then add

   * $env:PATH += ";C:\Users\briot\.cargo\bin"
   * $env:PATH += ";C:\Program Files\Git\bin"

My own usage is as follows:

   * Open a PowerShell terminal, and run:       npm run start
     This builds the Rust code, builds the front-end code, checks with
     typescript, runs the tests,...

   * Split the terminal and open a WSL2 terminal so that I have all the usual
     linux tools to edit/commit/...


See also  

- https://github.com/Aleph-Alpha/ts-rs
  to generate typescript from rust structs

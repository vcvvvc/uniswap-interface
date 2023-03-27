# Uniswap Wallet
[![codecov](https://codecov.io/gh/Uniswap/mobile/branch/main/graph/badge.svg?token=YVT2Y86O82)](https://codecov.io/gh/Uniswap/mobile)

[Uniswap Wallet](https://app.uniswap.org/) is the simplest, safest, and most powerful self-custodial crypto wallet. It is developed by the Uniswap Labs team, inventors of the Uniswap Protocol.

If you have suggestions on how we can improve the app, or would like to report a bug or a problem, check out the [Uniswap Help Center](https://support.uniswap.org/).

## Table of Contents
- [Getting Started](#getting-started)
    - [Requirements](#requirements)
    - [Packages and Software](#packages-and-software)
    - [Disabling Flipper](#disabling-flipper)
- [Development](#development)
    - [Running the App Locally](#running-the-app-locally)
        - [Clone the repo](#clone-the-repo)
        - [Environment Variables](#environment-variables)
        - [Compile contract ABI types](#compile-contract-abi-types)
        - [Run the app](#run-the-app)
    - [Important Libraries and Tools](#important-libraries-and-tools)
    - [Migrations](#migrations)
    - [Internationalisation (i18n)](#internationalisation-i18n)
    - [Testing](#testing)
- [Troubleshooting](#troubleshooting)
    - [Common issues](#common-issues)
    - [Common fixes](#common-fixes)
    - [.zprofile setup](#zprofile-setup)

---

# Getting Started
## Requirements
This guide assumes that:
- You are using a Mac (you will need a Mac computer in order to run the Xcode iOS Simulator)
- You are using an Apple Silicon Mac (if you’re not sure, go to  → About this Mac and check if the chip name starts with "Apple")

Note: if you are indeed using an Apple Silicon Mac, we recommend setting up your environment _without_ using Rosetta. Some instructions on how to do that can be found [here](https://medium.com/@davidjasonharding/developing-a-react-native-app-on-an-m1-mac-without-rosetta-29fcc7314d70).

## Packages and Software
### Xcode
You should start with downloading Xcode if you don't already have it installed, since the file is so large. You can find it here: [developer.apple.com/xcode](https://developer.apple.com/xcode/)

Note: The version shouldn’t matter too much for Xcode, but at the time of writing, the app is built using version 14.2.

### Homebrew
We’ll be using Homebrew to install many of the other required tools through the command line.
1. Open a terminal
2. Copy and paste the command from [brew.sh](https://brew.sh/) into your terminal and run it

### nvm
`nvm` is the Node Version Manager. While not required, it makes it easy to install Node and switch between different versions. A minimum Node version of 16 is required to use this repository.

Copy the curl command listed under _Install & Update Script_ on [this page](https://github.com/nvm-sh/nvm#install--update-script) and run it in your terminal.

To make sure nvm installed correctly, try running `nvm -v` (you may need to quit and re-open the terminal window). It should return a version number. If it returns something like `zsh: command not found: nvm`, it hasn’t been installed correctly.

### node
Now we want to use nvm to install a specific version of node.

Run the following command in your terminal:
`nvm install 16`

and then when it’s finished, run:
`nvm use 16`

Quit and re-open the terminal, and then run:
`node -v`

to make sure you get a version number that starts with `v16.`.

### yarn
We use yarn as our package manager and to run scripts.

Run the following command to install it:
`npm install --global yarn`
(npm comes with node, so it should work if the above step has been completed correctly)

Then run:
`yarn -v`
to see if it installed correctly.

### CocoaPods
Run `brew install cocoapods`

### Add Xcode Command Line Tools
Open Xcode and go to:

**Preferences → Locations → Command Line Tools**

And select the version that pops up.

## Disabling Flipper
We do not check Flipper into source. To prevent `pod install` from adding Flipper, set an environment variable in your `.bash_profile` or `.zshrc` or `.zprofile`:
```
# To enable flipper inclusion (optional)
export USE_FLIPPER=1
```
Note: To disable Flipper, the whole line should be commented out, as setting this value to 0 will not disable Flipper.

---

# Development

## Running the App Locally
Once all the steps above are completed, you're ready to try running the app locally!

### Clone the repo
Clone this repository locally to your machine if you haven't already.

### Environment variables
Note: The app will likely have limited functionality when running it locally with the default environment variables.

Use the environment variables defined in the `.env.development` file to run the app locally.

### Compile contract ABI types
Before the code will compile you need to generate types for the smart contracts the wallet interacts with. Run `yarn contracts:compile`. Re-run this if the ABIs are ever changed.

### Run the app
In the root directory, run `yarn` to install all the necessary npm packages.

Then run `yarn pod` to install all the necessary pods.

Finally, run `yarn ios` to boot up the iOS Simulator and run the app inside it. The JS bundler (metro) should automatically open in a new terminal window. If it does not, start it manually with `yarn start`.

Or you can use one command to run them all one after the other: `yarn && yarn pod && yarn ios`

You can also run the app from Xcode, which is necessary for any Swift related changes. Xcode will automatically start the metro bundler.

Hopefully you now (after a few minutes) see the Uniswap Wallet running in the iOS Simulator!

---

## Important Libraries and Tools
These are some tools you might want to familiarize yourself with to understand the codebase better and how different aspects of it work.

- [Redux](https://redux.js.org/) and [Redux Toolkit](https://redux-toolkit.js.org/): state management
- [redux-saga](https://redux-saga.js.org/) & [typed-redux-saga](https://github.com/agiledigital/typed-redux-saga): Redux side effect manager -- used for complex/stateful network calls
- [ethers](https://docs.ethers.io/v5/)
- [Shopify/restyle](https://github.com/Shopify/restyle): UI framework
- [React navigation](https://reactnavigation.org/): routing and navigation with animations and gestures
- [react-i18next](https://react.i18next.com/): i18n

---

## Migrations
We use `redux-persist` to persist Redux state between user sessions. When the Redux state schema is altered, a migration may be needed to transfer the existing persisted state to the new Redux schema. Failing to define a migration results in the app defaulting to the persisted schema, which will very likely cause `undefined` errors because the code has references to Redux state properties that were dropped in favor the the persisted schema.

#### When to define a migration

Anytime a required property is added or any property is renamed or deleted to/from Redux state. Migrations are not necessary when optional properties are added to an existing slice. Make sure to always add new required properties to the `schema.ts` file as well.

#### How to migrate

1. Increment the `version` of `persistConfig` defined within `store.ts`
2. Create a migration function within `migrations.ts`. The migration key should be the same as the `version` defined in the previous step
3. Write a test for your migration within `migrations.test.ts`
4. Create a new schema within `schema.ts` and ensure it is being exported by the `getSchema` function at the bottom of the file

---

# Internationalization (i18n)
Stubs for new i18n strings used throughout the app can be generated automatically. Use the string as you would normally (e.g. `t('id')`) and then run `yarn i18n:extract`.

If Typescript in VSCode is slow to see the change, you can restart the typescript server.

---

## Testing

## E2E tests
See [e2e/README.md](e2e/README.md)

---

# Troubleshooting

### Common issues
- `zsh: command not found: [package name]`
This means whichever package you're trying to run (`[package name]`) wasn’t correctly installed, or your Terminal can’t figure out how to run it. If you just installed it, try quitting terminal and re-opening it. Otherwise try reinstalling the package.

- `unable to open file (in target "OneSignalNotificationServiceExtension" in project "Uniswap")`.
Resolve this issue by navigating to the `ios/` directory and running `pod update`.

### Common fixes
If something isn’t working the way it should or you’re getting a weird error when trying to run the app, try the following:

1. Quit the terminal
2. Quit Metro terminal
3. Open Finder and navigate to the `mobile` directory
4. Delete the `node_modules` folder
5. Navigate into the `ios` folder
6. Delete the `Pods` folder
7. Open XCode
8. Go to Product → Clean Build Folder
9. Open your terminal again
10. Navigate to the `mobile` directory in the terminal
11. Run `yarn && yarn pod` again
12. Run `yarn ios`

### Shell profile setup
Your shell profile file is most likely one of: `.bash_profile`, `.zshrc`, or `.zprofile`, and will be located in `/Users/[username]/`. You can reveal hidden files in Finder by pressing `⌘` + `Shift` + `.`.

If issues with your terminal or shell seem to be the cause of some of your problems, here is an example of what that file may look like in order for your terminal to be able to run the app locally:

```zsh
eval "$(/opt/homebrew/bin/brew shellenv)"

export NVM_DIR="$HOME/.nvm"
[ -s "/opt/homebrew/opt/nvm/nvm.sh" ] && \. "/opt/homebrew/opt/nvm/nvm.sh"  # This loads nvm
[ -s "/opt/homebrew/opt/nvm/etc/bash_completion.d/nvm" ] && \. "/opt/homebrew/opt/nvm/etc/bash_completion.d/nvm"  # This loads nvm bash_completion

# To enable flipper inclusion (optional)
export USE_FLIPPER=1
export PATH="/opt/homebrew/opt/ruby/bin:$PATH"

# ruby things
export LDFLAGS="-L/opt/homebrew/opt/ruby/lib"
export CPPFLAGS="-I/opt/homebrew/opt/ruby/include"

export GEM_HOME="$(ruby -e 'puts Gem.user_dir')"
export PATH="$PATH:$GEM_HOME/bin"

export GEM_HOME=$HOME/.gem
export PATH=$GEM_HOME/bin:$PATH
gem install cocoapods --user-install
```

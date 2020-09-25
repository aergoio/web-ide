# Aergo IDE

A web interface to deploy smart contracts

This site uses a webservice to compile the Lua smart contract


## Generate bundle.js

```
npm run build
```

Run this command also after making changes to app.js


## Publishing

Copy these files to the web server:

* index.html
* bundle.js
* logo.png


## TODO

* Wait for transaction receipt and get the returned contract address
* Display the contract address to the user, with a link to aergoscan page
* Use a good-looking dialog when asking for contract address on redeploy
* If the contract has deploy arguments, display a dialog to get them

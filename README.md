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
* nyan-cat.gif


## TODO

* Wait for transaction receipt and get the returned contract address
* If the contract has deploy arguments, display a dialog to get them

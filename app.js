var $ = require('jquery');
var swal = require('sweetalert2');
var herajs = require('@herajs/client');
var chainId = '';
var aergo = null;
var showbox = false;

function install_extension_click() {
  var win = window.open('https://chrome.google.com/webstore/detail/aergo-connect/iopigoikekfcpcapjlkcdlokheickhpc', '_blank');
  win.focus();
  hide_box();
}

function hide_box() {
  showbox = false;
  $('#no-extension').remove();
}

function aergoConnectCall(action, responseType, data) {

  showbox = true;
  setTimeout(function() {
    if (!showbox) return;

    const box = '<div id="no-extension" class="no-extension swal2-container swal2-center">' +
    '<div class="swal2-content swal2-html-container" style="display: block;"><br>Nothing happened?</div>' +
    '<button id="install-extension" type="button" class="swal2-confirm swal2-styled" aria-label="" ' +
    'style="display: inline-block; background-color: rgb(229, 0, 125); border-left-color: rgb(229, 0, 125);' +
    'border-right-color: rgb(229, 0, 125);">Install Aergo Connect</button></div>';

    $('body').append(box);
    $("#install-extension").click(install_extension_click);

  }, 3000);

  return new Promise((resolve, reject) => {
    window.addEventListener(responseType, function(event) {
      hide_box();
      if ('error' in event.detail) {
        reject(event.detail.error);
      } else {
        resolve(event.detail);
      }
    }, { once: true });
    window.postMessage({
      type: 'AERGO_REQUEST',
      action: action,
      data: data,
    }, '*');
  });

}

async function getActiveAccount() {
  const result = await aergoConnectCall('ACTIVE_ACCOUNT', 'AERGO_ACTIVE_ACCOUNT', {});
  chainId = result.account.chainId;
  return result.account.address;
}

async function startTxSendRequest(txdata) {
  const result = await aergoConnectCall('SEND_TX', 'AERGO_SEND_TX_RESULT', txdata);
  console.log('AERGO_SEND_TX_RESULT', result);

  swal.fire({
    title: 'Transaction sent!',
    text: 'Waiting inclusion on blockchain...',
    allowEscapeKey: false,
    allowOutsideClick: false,
    onOpen: () => {
      swal.showLoading();
    }
  })

  // wait until the transaction is executed and included in a block, then get the receipt
  const receipt = await aergo.waitForTransactionReceipt(result.hash);
  console.log("receipt", receipt);

  if (receipt.status != "SUCCESS") {
    swal.fire({
      icon: 'error',
      title: 'Failed!',
      text: receipt.result
    })
    return false
  }

  var site = chainId.replace('aergo','aergoscan');
  if (site == 'aergoscan.io') site = 'mainnet.aergoscan.io';
  var url = 'https://' + site + '/transaction/' + result.hash;

  swal.fire({
    icon: 'success',
    title: 'Congratulations!',
    html: '<br>Your smart contract was deployed!<br>&nbsp;',
    confirmButtonText: 'View on Aergoscan',
    cancelButtonText: 'Close',
    showCancelButton: true,
    width: 600,
    padding: '3em',
    confirmButtonColor: '#e5007d',
    background: '#fff',
    backdrop: `
      rgba(0,0,123,0.4)
      url("nyan-cat.gif")
      left top
      no-repeat
    `,
    preConfirm: function() {
      var win = window.open(url, '_blank');
      win.focus();
    }
  })

}


function uint8ToBase64(buffer) {
  var binary = '';
  var len = buffer.byteLength;
  for (var i = 0; i < len; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return window.btoa( binary );
}

function encode_utf8(s) {
  return unescape(encodeURIComponent(s));
}

async function deploy_contract(contract_address, sourceCode, encodedByteCode) {

  // get the account information, including the chain to use
  const account_address = await getActiveAccount();

  // connect to the chain, if not done yet
  if (!aergo) {
    var url
    if (chainId == "aergo.io") {
      url = "mainnet-api-http.aergo.io"
    } else if (chainId == "testnet.aergo.io") {
      url = "testnet-api-http.aergo.io"
    } else if (chainId == "alpha.aergo.io") {
      url = "alpha-api-http.aergo.io"
    }
    url = 'http://' + url + ':7845'
    aergo = new herajs.AergoClient({}, new herajs.GrpcWebProvider({url: url}))
  }

  // retrieve the blockchain info from the node
  const info = await aergo.getChainInfo()
  console.log('hardfork version:', info.chainid.version);

  // check the current hardfork version
  if (info.chainid.version >= 4) {
    // deploy the source code
    const contract = herajs.Contract.fromSourceCode(sourceCode);
    const payload = contract_plain.asPayload([]);
  } else {
    // deploy the compiled byte code
    const contract = herajs.Contract.fromCode(encodedByteCode);
    const payload = uint8ToBase64(contract_build.asPayload([]));
  }

  var txdata = {
    type: (contract_address == null) ? 6 : 2,
    from: account_address,
    to: contract_address,
    amount: 0,
    payload: payload
  }
  console.log(txdata)

  startTxSendRequest(txdata);
}

function check_contract_code(contract_address){

  var sourceCode = editor.getValue();
  //sourceCode = btoa(encode_utf8(sourceCode));

  $.ajax({
    type: 'POST',
    url: 'https://luac.aergo.io/compile',
    crossDomain: true,
    data: btoa(encode_utf8(sourceCode)),
    dataType: 'text',
    success: async function(responseData, textStatus, jqXHR) {
        var value = responseData;
        if (value.substring(0,8) != 'result: '){
          swal.fire({
            icon: 'error',
            title: 'Compilation failed!',
            text: value
          })
          return;
        }
        const encodedByteCode = value.substring(8).trim();
        deploy_contract(contract_address, sourceCode, encodedByteCode)
    },
    error: function (responseData, textStatus, errorThrown) {
        swal.fire({
          icon: 'error',
          title: 'Compilation failed!',
          text: 'Failed to contact the compiler webservice: ' + textStatus
        })
    }
  });

}

function process_deploy(contract_address){
  check_contract_code(contract_address)
}

function deploy(){
  process_deploy(null);
  return false;
}

function redeploy() {

  swal.fire({
    title: 'Redeploy',
    html: '<br>Address of existing contract:',
    input: 'text',
    inputAttributes: {
      autocapitalize: 'off'
    },
    confirmButtonColor: '#e5007d',
    showCancelButton: true
  }).then((result) => {
    if (result.isConfirmed && result.value!='') {
      process_deploy(result.value);
    }
  })

  return false;
}


function fileopen() {

  $('<input type="file" accept=".lua">').on('change', function() {
    var file = this.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(e) {
      var contents = e.target.result;
      editor.setValue(contents,true);
    };
    reader.readAsText(file);
  }).click();

  return false;
}

function filesave() {
  var content = editor.getValue();
  var pom = document.createElement('a');
  pom.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(content));
  pom.setAttribute('download', 'smart-contract.lua');
  if (document.createEvent) {
    var event = document.createEvent('MouseEvents');
    event.initEvent('click', true, true);
    pom.dispatchEvent(event);
  } else {
    pom.click();
  }
  return false;
}

document.body.onload = function() {

  var content = localStorage.getItem('code')
  if (content) {
    editor.setValue(content,true);
  }

  setInterval(function(){
    localStorage.setItem('code', editor.getValue())
  }, 60000)

}

document.getElementById("deploy").onclick = deploy;
document.getElementById("redeploy").onclick = redeploy;
document.getElementById("fileopen").onclick = fileopen;
document.getElementById("filesave").onclick = filesave;

function hide_menu() {
  var menu = document.getElementById("menu")
  menu.style.display = "none";
  setTimeout(function() {
    menu.style.removeProperty("display");
  }, 30);
}

document.getElementById("find").onclick = function() {
  editor.execCommand("find");
  hide_menu();
  return false;
}
document.getElementById("replace").onclick = function() {
  editor.execCommand("replace");
  hide_menu();
  return false;
}
document.getElementById("settings").onclick = function() {
  editor.execCommand("showSettingsMenu");
  hide_menu();
  return false;
}

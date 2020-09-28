var $ = require('jquery');
var Swal = require('sweetalert2');
var herajs = require('@herajs/client');
//const aergo = new herajs.AergoClient({}, new herajs.GrpcWebProvider({url: 'http://localhost:12345'}));
var chainId = '';

function aergoConnectCall(action, responseType, data) {
  return new Promise((resolve, reject) => {
    window.addEventListener(responseType, function(event) {
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

  // TODO: wait for the txn receipt

  var site = chainId.replace('aergo','aergoscan');
  if (site == 'aergoscan.io') site = 'mainnet.aergoscan.io';
  var url = 'https://' + site + '/transaction/' + result.hash;

  Swal.fire({
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

function convertPayload(encoded) {
  /*
  var args = [];
  const text = encodeBuffer(decodeToBytes(encoded, 'base58'), 'ascii');
  const match = text.match(new RegExp(/({"name":"constructor","arguments":\[.*?\]})/));
  if (match) {
    args = JSON.parse(match[1]);
  }
  */
  const contract = herajs.Contract.fromCode(encoded);
  return uint8ToBase64(contract.asPayload([]));
}


function process_deploy(contract_address){

  var content = editor.getValue();

  $.ajax({
    type: 'POST',
    url: 'https://luac.aergo.io/compile',
    crossDomain: true,
    data: content,
    dataType: 'text',
    success: async function(responseData, textStatus, jqXHR) {
        var value = responseData;
        if (value.substring(0,8) != 'result: '){
          Swal.fire({
            icon: 'error',
            title: 'Compilation failed!',
            text: value
          })
          return;
        }
        var account_address = await getActiveAccount();
        var txdata = {
          type: (contract_address == null) ? 6 : 2,
          from: account_address,
          to: contract_address,
          amount: 0,
          payload: convertPayload(value.substring(8).trim())
        }
        startTxSendRequest(txdata);
    },
    error: function (responseData, textStatus, errorThrown) {
        Swal.fire({
          icon: 'error',
          title: 'Compilation failed!',
          text: 'Failed to contact the compiler webservice: ' + textStatus
        })
    }
  });

}

function deploy(){
  process_deploy(null);
}

function redeploy() {

  Swal.fire({
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

}

document.getElementById("deploy").onclick = deploy;
document.getElementById("redeploy").onclick = redeploy;

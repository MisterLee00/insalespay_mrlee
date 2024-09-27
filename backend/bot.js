const { api, inlineButtons, messageFromBot, msgBot } = require('./data/preferences');

const TelegramBot = require('node-telegram-bot-api');
module.exports.bot = new TelegramBot(api, { polling: true });


import botkit from 'botkit';
// this is es6 syntax for importing libraries
// in older js this would be: var botkit = require('botkit')

// example bot

console.log('starting bot');

// botkit controller
const controller = botkit.slackbot({
  debug: false,
});

// initialize slackbot
const slackbot = controller.spawn({
  token: process.env.SLACK_BOT_TOKEN,
  // this grabs the slack token we exported earlier
}).startRTM(err => {
  // start the real time message client
  if (err) { throw new Error(err); }
});

// prepare webhook
// for now we won't use this but feel free to look up slack webhooks
controller.setupWebserver(process.env.PORT || 3001, (err, webserver) => {
  controller.createWebhookEndpoints(webserver, slackbot, () => {
    if (err) { throw new Error(err); }
  });
});

// example hello response
controller.hears(['hello', 'hi', 'howdy'], ['direct_message', 'direct_mention', 'mention'], (bot, message) => {
  bot.api.users.info({ user: message.user }, (err, res) => {
    if (res) {
      bot.reply(message, `Hello, ${res.user.name}!`);
    } else {
      bot.reply(message, 'Hello there!');
    }
  });
});

controller.hears(['hungry', 'hunger', 'food'], ['direct_message', 'direct_mention', 'mention'], (bot, message) => {
  function askFlavor(response, convo) {
    convo.ask('Would you like food recomendations near you?', [
      {
        pattern: bot.utterances.no,
        callback: () => {
          convo.say('So what do do you want from me???');
          convo.next();
        },
      },
      {
        pattern: bot.utterances.yes,
        callback: () => {
          convo.say('Sweet!');
          // do something else...
          askType(response, convo);
          convo.next();
        },
      },
      {
        default: true,
        callback: () => {
          // just repeat the question
          convo.say('Be civilized. Answer the question.');
          convo.repeat();
          convo.next();
        },
      },
    ]);
  }
  function askType(response, convo) {
    convo.ask('What type of food would you like?', () => {
      convo.say('Ok.');
      askWhere(response, convo);
      convo.next();
    });
  }
  function askWhere(response, convo) {
    convo.ask('Where are you?', () => {
      convo.say('Ok! Let me google that for you:');
      convo.next();
    });
  }

  bot.startConversation(message, askFlavor);
});

// defualt
controller.hears([''], ['direct_message', 'direct_mention', 'mention'], (bot, message) => {
  bot.api.users.info({ user: message.user }, (err, res) => {
    // todo: say "I can be random too!", followed by random quote (use API)
    bot.reply(message, 'Vox clamantis in deserto.');
    bot.reply(message, '(I don\'t understand you)');
  });
});

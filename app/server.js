
import botkit from 'botkit';
const request = require('request');
// this is es6 syntax for importing libraries
// in older js this would be: var botkit = require('botkit')

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

// simple hello response
controller.hears(['hello', 'hi', 'howdy'], ['direct_message', 'direct_mention', 'mention'], (bot, message) => {
  bot.api.users.info({ user: message.user }, (err, res) => {
    if (res) {
      bot.reply(message, `Hello, ${res.user.real_name}!`);
    } else {
      bot.reply(message, 'Hello there!');
    }
  });
});

// food queries via yelp API
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
      askWhere(response, convo);
      convo.next();
    });
  }
  function askWhere(response, convo) {
    convo.ask('Where are you?', () => {
      convo.next();
    });
  }

  bot.startConversation(message, askFlavor);
});

// food queries via yelp API
controller.hears('weather', ['direct_message', 'direct_mention', 'mention'], (bot, message) => {
  function askWeather(response, convo) {
    convo.ask('Would you like to hear the forecast?', [
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
          askZip(convo);
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
  function askZip(convo) {
    convo.ask('Sweet! What\'s your zip code?',
      [
        {
          pattern: /^\d{5}(-\d{4})?$/,
          callback: (response) => {
            const zip = response.text;
            getWeather(zip, convo);
            convo.next();
          },
        },
        {
          default: true,
          callback: () => {
            // just repeat the question
            convo.say('That\'s not a valid zipcode.');
            convo.repeat();
            convo.next();
          },
        },
      ]);
  }

  function getWeather(response, convo) {
    const zip = response.text;
    const url = `http://api.openweathermap.org/data/2.5/weather?zip=${zip},us&units=imperial&appid=${process.env.WEATHER_API_TOKEN}`;
    request(url, (error, response, body) => {
      if (!error && response.statusCode === 200) {
        const weather = JSON.parse(body);
        const attachments = {
          attachments: [
            {
              fallback: 'To be useful, I need you to invite me in a channel.',
              title: 'Today\'s Forecast',
              text: `The current temperature in ${weather.name} is ${weather.main.temp}\n` +
              `The high is ${weather.main.temp_max}° and the low is ${weather.main.temp_min}°\n` +
              `You should also expect ${weather.weather[0].description}!`,
              color: '#7CD197',
              image_url: `http://openweathermap.org/img/w/${weather.weather[0].icon}.png`,
            },
          ],
        };

        convo.say(attachments);
      } else {
        convo.say('I can\'t seem to find the weather for that zip code.');
      }
    });
  }

  bot.startConversation(message, askWeather);
});

// Using attachments to display cat gif
controller.hears(['cat', 'kitten', 'kitty'], 'direct_message, direct_mention', (bot, message) => {
  const attachments = {
    username: 'My bot',
    text: 'I love cats!',
    attachments: [
      {
        fallback: 'To be useful, I need you to invite me in a channel.',
        color: '#7CD197',
        image_url: 'http://thecatapi.com/api/images/get?format=src&type=gif',
      },
    ],
  };

  bot.reply(message, attachments);
});

// defualt
controller.hears([''], ['direct_message', 'direct_mention', 'mention'], (bot, message) => {
  bot.api.users.info({ user: message.user }, (err, res) => {
    // todo: say "I can be random too!", followed by random quote (use API)
    bot.reply(message, 'Vox clamantis in deserto.');
    bot.reply(message, '(I don\'t understand you)');
  });
});

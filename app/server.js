
import botkit from 'botkit';
import request from 'request';
import Yelp from 'yelp';

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

// intialize yelp
const yelp = new Yelp({
  consumer_key: process.env.CONSUMER_KEY,
  consumer_secret: process.env.CONSUMER_SECRET,
  token: process.env.TOKEN,
  token_secret: process.env.TOKEN_SECRET,
});

// prepare webhook
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

// food queries via Yelp API
controller.hears(['hungry', 'hunger', 'food', 'restaurant'], ['direct_message', 'direct_mention', 'mention'], (bot, message) => {
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
          askType(convo);
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
  function askType(convo) {
    convo.ask('Sweet! What type of food would you like?', (response) => {
      askWhere(response, convo);
      convo.next();
    });
  }
  function askWhere(type, convo) {
    convo.ask('Where are you?', (response) => {
      convo.say(`Ok! Let me find you ${type.text} in ${response.text}`);

      yelp.search({ term: `${type.text}`, location: `${response.text}` }).then((data) => {
        if (data.businesses.length < 1) {
          convo.say(`Hmm... I can't seem to find ${type.text} in ${response.text}`);
        } else {
          const attachments = {
            text: `rating: ${data.businesses[0].rating}`,
            attachments: [
              {
                fallback: 'To be useful, I need you to invite me in a channel.',
                title: `${data.businesses[0].name}`,
                title_link: `${data.businesses[0].url}`,
                text: `${data.businesses[0].snippet_text}`,
                image_url: `${data.businesses[0].image_url}`,
                color: '#7CD197',
              },
            ],
          };
          convo.say(attachments);
          console.log(attachments);
          convo.next();
        }
      }).catch((err) => {
        convo.say(`Hm... I can't seem to find ${type.text} in ${response.text}`);
        console.error(err);
      });
    });
  }

  bot.startConversation(message, askFlavor);
});

// weather queries via Open Weather Map API
controller.hears(['weather', 'forecast', 'temperature'], ['direct_message', 'direct_mention', 'mention'], (bot, message) => {
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
            getWeather(response, convo);
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

  function getWeather(zipcode, convo) {
    const zip = zipcode.text;
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
        console.log(attachments);
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

// help
controller.hears('help', ['direct_message', 'direct_mention', 'mention'], (bot, message) => {
  bot.api.users.info({ user: message.user }, (err, res) => {
    bot.reply(message, 'Hi, I\'m emma_bot!\n' +
    'I can give you food suggestions and the current weather.\n' +
    'Talk to me about cats!');
  });
});

// default
controller.hears('', ['direct_message', 'direct_mention', 'mention'], (bot, message) => {
  bot.api.users.info({ user: message.user }, (err, res) => {
    // todo: say "I can be random too!", followed by random quote (use API)
    bot.reply(message, 'Vox clamantis in deserto.');
    bot.reply(message, '(I don\'t understand you)');
  });
});

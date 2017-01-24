var Botkit = require('botkit')
var _ = require('lodash')

var token = process.env.SLACK_TOKEN

var controller = Botkit.slackbot({
  // reconnect to Slack RTM when connection goes bad
  retry: Infinity,
  debug: false
})

console.log('Starting up...')
controller.spawn({
  token: token
}).startRTM(function (err, bot, payload) {
  if (err) {
    throw new Error(err)
  }

  console.log('Connected to Slack RTM')
})

var lastReplies = {
  message: [],
  emoji: [],
  shoutout: []
}
var choices = {
  message: [
    'Groovy! :griz-parrot:',
    'That track is :fire: :fire: :fire:',
    ':100: :100: :100:',
    'Love it! :tunez-parrot:',
    'So crunchy',
    'Holy shit my face just melted',
    'DJ turn it up!',
    'This shit slaps',
    ':pray: :pray: :pray:',
    'Oh YES daddy!',
    'Love this track so much',
    'Yessss this is so nice!',
    'Quality stuff',
    "Damn son, where'd you find this?",
    'Damn this is sick',
    'That second drop just killed me',
    'I just got chills...',
    'Unreal!',
    'Certified banger',
    'Dope track!',
    'Now this is what I call music!',
    'Jesus fuck',
    "It's lit fam!"
  ],
  emoji: [
    'fire',
    'griz-parrot',
    'party-parrot',
    'tunez-parrot',
    'fast-parrot',
    'stable-parrot',
    '+1',
    'upside_down_face',
    'dizzy_face',
    'grinning',
    'sunglasses',
    'pray',
    'raised_hands',
    'ok_hand',
    'saxophone',
    '100'
  ],
  shoutout: [
    'Right back at ya! :griz-parrot:',
    'You da real MVP!',
    'Aw, thanks! :blush:'
  ]
}

var randomReply = function (type) {
  var maxReplies = choices[type].length > 5 ? 5 : choices[type].length - 1
  var newReply = null
  while (!newReply || _.includes(lastReplies[type], newReply)) {
    newReply = choices[type][Math.floor(Math.random() * choices[type].length)]
  }
  lastReplies[type].push(newReply)
  if (lastReplies[type].length > maxReplies) {
    lastReplies[type].shift()
  }
  return newReply
}

controller.on('bot_channel_join', function (bot, message) {
  console.info('Joining new channel %s', message.channel)
  bot.reply(message, "Ears here, send me some tunes! :griz-parrot:")
})

controller.hears(['shoutout'], ['direct_mention', 'mention'], function (bot, message) {
  console.info('Replying to shoutout %s', message.ts)
  bot.reply(message, randomReply('shoutout'))
})

var songLinks = [
  'open.spotify.com/',
  'soundcloud.com/',
]

controller.hears(songLinks, ['ambient'], function (bot, message) {
  console.info('Reacting to song post %s', message.ts)
  var emoji = randomReply('emoji')
  bot.api.reactions.add({
    timestamp: message.ts,
    channel: message.channel,
    name: emoji,
  }, function(err, res) {
    if (err) {
      bot.botkit.log('Failed to add emoji reaction ' + emoji, err)
    }
  })
})

controller.on(['direct_mention', 'mention'], function (bot, message) {
  console.info('Replying to mention %s', message.ts)
  bot.reply(message, randomReply('message'))
})

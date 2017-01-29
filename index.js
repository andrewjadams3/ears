var Botkit = require('botkit')
var moment = require('moment')
var Promise = require('bluebird')
var rp = require('request-promise')
var _ = require('lodash')

var config = require('./config')

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
  reaction: [],
  emoji: [],
  shoutout: [],
  griz: []
}
var choices = {
  reaction: config.REACTIONS,
  emoji: config.EMOJIS,
  shoutout: config.SHOUTOUTS,
  griz: null
}

var randomReply = function (type) {
  var maxReplies = choices[type].length > 5 ? 5 : choices[type].length - 1
  var index = null
  while (index === null || _.includes(lastReplies[type], index)) {
    index = Math.floor(Math.random() * choices[type].length)
  }
  lastReplies[type].push(index)
  if (lastReplies[type].length > maxReplies) {
    lastReplies[type].shift()
  }
  return choices[type][index]
}

var lastGrizFetch = new Date()
var getGrizTracks = function () {
  return new Promise(function (resolve, reject) {
    var isCacheStale = moment(lastGrizFetch).isBefore(new Date(), 'day')
    if (!choices.griz || isCacheStale) {
      console.info('Fetching Griz tracks from Spotify API')
      var options = {
        uri: 'https://api.spotify.com/v1/artists/25oLRSUjJk4YHNUsQXk7Ut/top-tracks?country=US',
        json: true
      }
      rp(options)
        .then(function (response) {
          var tracks = _.map(response.tracks, 'external_urls.spotify')
          resolve(choices.griz = tracks)
        })
    } else {
      console.info('Fetching Griz tracks from cache')
      resolve(choices.griz)
    }
  })
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

controller.hears('griz me', ['direct_mention', 'mention'], function (bot, message) {
  console.info('Finding Griz tune %s', message.ts)
  bot.reply(message, 'Coming right up...')
  getGrizTracks().then(function() {
    bot.reply(message, randomReply('griz'))
  })
})

controller.on(['direct_mention', 'mention'], function (bot, message) {
  console.info('Replying to mention %s', message.ts)
  bot.reply(message, randomReply('reaction'))
})

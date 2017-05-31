'use strict'

const got = require('got')
const server = require('./lib/server')
const debug = require('./lib/debug')
const rtm = require('./bot')

server.listen(process.env.PORT || 5000, () => {
	rtm.start()

	// Avoid Idling
	setInterval(() => {
		got('https://delay-bot.herokuapp.com/')
			.then(response => {
				debug.log(response.body)
			})
			.catch(err => {
				debug.error(err.response.body)
			})
	}, 60 * 1000)
})

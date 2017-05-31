'use strict'

const fs = require('fs')
const {RtmClient, WebClient, MemoryDataStore, RTM_EVENTS, CLIENT_EVENTS} = require('@slack/client')
const promisify = require('lagden-promisify')
const got = require('got')
const debug = require('./lib/debug')
const {read} = require('./lib/helpers')
const server = require('./lib/server')

const config = require(`./config/token.${process.env.NODE_ENV || 'dev'}.json`)

const readFile = promisify(fs.readFile)
const unlink = promisify(fs.unlink)

const origem = 'G5L725YMC'
const destino = 'C23E7AD7F'
const WEB_TOKEN = process.env.SLACK_API_TOKEN || config.SLACK_API_TOKEN
const BOT_TOKEN = process.env.SLACK_BOT_TOKEN || config.SLACK_BOT_TOKEN
const DELAY = process.env.DELAY || config.DELAY || 10000        // in milliseconds
const INTERVAL = process.env.INTERVAL || config.INTERVAL || 10  // in seconds

debug.log(DELAY)
debug.log(INTERVAL)

let intervalID

const rtm = new RtmClient(BOT_TOKEN, {
	logLevel: 'error',
	dataStore: new MemoryDataStore()
})

const web = new WebClient(WEB_TOKEN)

function clear() {
	if (intervalID) {
		clearInterval(intervalID)
	}
}

async function triggerMsg(file) {
	const filepath = `./data/${file}`
	const data = await readFile(filepath)
	const msg = JSON.parse(data)
	if (msg && msg.text) {
		const user = rtm.dataStore.getUserById(msg.user)
		web.chat.postMessage(destino, msg.text, {
			parse: 'none',
			as_user: false,
			username: user.profile.real_name,
			icon_url: user.profile.image_48,
			pretty: 1
		})
	}
	await unlink(filepath)
	return filepath
}

function loop() {
	debug.log('RTM_CONNECTION_OPENED')
	intervalID = setInterval(() => {
		read(DELAY)
			.then(files => Promise.all(files.map(triggerMsg)))
			.then(r => {
				if (r.length > 0) {
					debug.log(r)
				}
			})
			.catch(err => {
				debug.error(err.message)
			})
	}, INTERVAL * 1000)
}

rtm.on(RTM_EVENTS.MESSAGE, message => {
	debug.log(message.channel, origem, message.type)
	if (message.channel === origem && message.type === 'message') {
		const ws = fs.createWriteStream(`./data/${Date.now()}.json`, {mode: 0o644})
		ws.on('error', err => {
			debug.error(err.message)
		})
		ws.write(JSON.stringify(message))
		ws.end()
	}
})

rtm.on(CLIENT_EVENTS.RTM.RTM_CONNECTION_OPENED, loop)
// rtm.on(CLIENT_EVENTS.RTM.ATTEMPTING_RECONNECT, clear)
rtm.on(CLIENT_EVENTS.RTM.DISCONNECT, clear)

rtm.start()
server.listen(process.env.PORT || 5000, () => {
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

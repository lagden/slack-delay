'use strict'

const fs = require('fs')
const {join} = require('path')
const {RtmClient, WebClient, MemoryDataStore, RTM_EVENTS, CLIENT_EVENTS} = require('@slack/client')
const promisify = require('lagden-promisify')
const mkdirp = require('mkdirp')
const debug = require('./lib/debug')
const {read} = require('./lib/helpers')

const config = require(`./config/token.${process.env.NODE_ENV || 'production'}.json`)

const readFile = promisify(fs.readFile)
const unlink = promisify(fs.unlink)

const origem = 'C23E7AD7F'
const destino = 'G5L725YMC'
const WEB_TOKEN = process.env.SLACK_API_TOKEN || config.SLACK_API_TOKEN
const BOT_TOKEN = process.env.SLACK_BOT_TOKEN || config.SLACK_BOT_TOKEN
const DELAY = process.env.DELAY || config.DELAY || 10000        // in milliseconds
const INTERVAL = process.env.INTERVAL || config.INTERVAL || 10  // in seconds
const dataDir = join(__dirname, 'data')

mkdirp.sync(dataDir)

debug.log(DELAY)
debug.log(INTERVAL)

let intervalID

const rtm = new RtmClient(BOT_TOKEN, {
	logLevel: 'error',
	dataStore: new MemoryDataStore()
})

const web = new WebClient(WEB_TOKEN)

function clear() {
	clearInterval(intervalID)
}

async function triggerMsg(file) {
	const filepath = join(dataDir, `${file}`)
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
			.then(files => {
				return Promise.all(files.map(triggerMsg))
			})
			.then(r => {
				if (r.length > 0) {
					debug.log('disparados', r)
				}
			})
			.catch(err => {
				debug.error(err.message)
			})
	}, INTERVAL * 1000)
}

rtm.on(RTM_EVENTS.MESSAGE, message => {
	// debug.log(message.channel, origem, message.type)
	if (message.channel === origem && message.type === 'message' && /has\sjoined\sthe\schannel/.test(message.text) === false) {
		const file = join(dataDir, `${Date.now()}.json`)
		const ws = fs.createWriteStream(file)
		ws.on('error', err => {
			debug.error(err.message)
		})
		ws.on('finish', () => {
			debug.log('ws ---> All writes are now complete.', file)
		})
		ws.write(JSON.stringify(message))
		ws.end()
	}
})

rtm.on(CLIENT_EVENTS.RTM.RTM_CONNECTION_OPENED, loop)
rtm.on(CLIENT_EVENTS.RTM.ATTEMPTING_RECONNECT, clear)
rtm.on(CLIENT_EVENTS.RTM.DISCONNECT, clear)

module.exports = rtm

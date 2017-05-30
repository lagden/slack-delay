'use strict'

const http = require('http')

const server = http.createServer((request, response) => {
	response.writeHead(200, {'Content-Type': 'application/json'})
	response.write(JSON.stringify({app: 'slackbot-delay'}))
	response.end()
})

module.exports = server

'use strict'

const debug = require('debug')

const log = debug('delaybot:log')
const error = debug('delaybot:error')

log.log = console.log.bind(console)

exports.log = log
exports.error = error

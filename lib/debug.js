'use strict'

const debug = require('debug')

const log = debug('webhook:log')
const error = debug('webhook:error')

log.log = console.log.bind(console)

exports.log = log
exports.error = error

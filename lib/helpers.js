'use strict'

const fs = require('fs')
const {basename, join} = require('path')
const promisify = require('lagden-promisify')
// const debug = require('./debug')

const readdir = promisify(fs.readdir)
const data = join(__dirname, '..', 'data')

async function read(DELAY) {
	const trigger = []
	const files = await readdir(data)
	for (const file of files) {
		if (Date.now() - Number(basename(file, '.json')) >= DELAY) {
			trigger.push(file)
		}
	}
	return trigger
}

exports.read = read

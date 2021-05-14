import * as http from 'http'
import * as WebSocket from 'ws'
import { connectClient, socketServer } from './core/socket'
import { ConnectionDetails } from './core/socket/types'
import { publishToDb, subscribeToDb } from './db'
import logger from './logger'

const serverConnectionCallback = (ws: WebSocket, { id, db }: ConnectionDetails) => {
  const sendJSON = (message: any) => {
    ws.send(JSON.stringify(message))
  }

  logger.debug(`New client connected to db:${db} id: ${id}`)
  sendJSON({ type: 'HANDSHAKE_SUCCESS', id, db })

  subscribeToDb(id, db, function (message) {
    console.log('New message', message)
    ws.send(message)
  })

  ws.on('message', async function (message: any) {
    try {
      const data: DbData = JSON.parse(message)
      if (data.type === 'DB_SET') {
        publishToDb(db, data)
      }
    } catch (err) {
      console.log(`Error processing webhook message from ${id}`, err)
    }
  })
}

socketServer.on('connection', serverConnectionCallback)

const redisRealtime = (server: http.Server, db: string) => {
  server.on('upgrade', async function (...args) {
    logger.debug(`New connection intiating`)
    connectClient(args, db)
  })
}

export default redisRealtime

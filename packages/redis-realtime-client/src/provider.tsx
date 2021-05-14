import React, { useContext, useEffect, useReducer, useState } from 'react'
import { dbReducer, DB_KEY_STATUS } from './db'
import { useSocket } from './socket'

type Publish = (key: string) => { setDb: (data: any) => void }

interface RealtimeContextType {
  db: string
  publisher: Publish
  state: any
  subscribe: (key: string) => any
}

const RealtimeContext = React.createContext<RealtimeContextType>(
  {} as RealtimeContextType
)
export const useRealtime = () => useContext(RealtimeContext)

interface RealtimeProviderProps {
  children: React.ReactNode
  db: string
  baseUrl: string
  token?: string
  secure?: boolean
}

export const RealtimeProvider = ({
  children,
  baseUrl,
  db,
  token,
  secure = true,
}: RealtimeProviderProps) => {
  const [dbState, dispatch] = useReducer(dbReducer, { connectionId: undefined })
  const subscriptions: string[] = []

  const onNewData = (data: any) => {
    dispatch(data)
  }

  const { sendMessage } = useSocket(
    `${secure ? 'wss' : 'ws'}://${baseUrl}/${db}`,
    onNewData,
    token
  )

  useEffect(() => {
    const unintialisedKeys = subscriptions.filter((s) => {
      return !dbState[s]?.status
    })
    if (unintialisedKeys.length > 0 && dbState.connectionId) {
      dispatch({
        type: 'DB_INITIALISING',
        keys: unintialisedKeys,
      })
      sendMessage({
        type: 'DB_INITIALISE',
        keys: unintialisedKeys,
        id: dbState.connectionId,
      })
    }
  }, [dbState.connectionId, subscriptions])

  const publisher: Publish = (key: string) => ({
    setDb: (data: any) => {
      sendMessage({
        type: 'DB_SET',
        key,
        data,
        id: dbState.connectionId,
      })
      dispatch({
        type: 'DB_SET',
        key,
        data,
      })
    },
  })

  const subscribe = (key: string) => {
    if (!subscriptions.includes(key)) {
      subscriptions.push(key)
    }
    return {
      isLoading: dbState[key]?.status === DB_KEY_STATUS.isLoading,
      data: dbState[key]?.data,
    }
  }

  const contextValue = React.useMemo(
    () => ({
      db,
      publisher,
      state: dbState,
      subscribe,
    }),
    [sendMessage]
  )

  return (
    <RealtimeContext.Provider value={contextValue}>
      {children}
    </RealtimeContext.Provider>
  )
}

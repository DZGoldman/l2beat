import { Knex } from 'knex'

import { Config } from './Config'
import { getProductionConfig } from './config.production'
import { getEnv } from './getEnv'

export function getStagingConfig(): Config {
  const name = 'Backend/Staging'
  const productionConfig = getProductionConfig()

  return {
    ...productionConfig,

    name,
    databaseConnection: {
      ...(productionConfig.databaseConnection as Knex.PgConnectionConfig),
      application_name: name,
    },
    tvlReportSync: true,
    transactionCountSync: {
      starkexApiUrl: getEnv('STARKEX_API_URL'),
      starkexApiKey: getEnv('STARKEX_API_KEY'),
      arbitrumAlchemyApiKey: getEnv('ARBITRUM_ALCHEMY_API_KEY'),
      optimismAlchemyApiKey: getEnv('OPTIMISM_ALCHEMY_API_KEY'),
      ethereumAlchemyApiKey: getEnv('ALCHEMY_API_KEY'),
      rpcWorkQueueLimit: 200_000,
      rpcWorkQueueWorkers: 100,
      zkSyncWorkQueueWorkers: 100,
      starkexWorkQueueWorkers: 1,
      starkexCallsPerMinute: 400,
      loopringWorkQueueWorkers: 1,
      loopringCallsPerMinute: 400,
    },
  }
}
